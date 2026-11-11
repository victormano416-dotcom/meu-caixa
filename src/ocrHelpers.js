/**
 * Parser universal de comprovantes brasileiros (PIX, TED, cartão, boleto).
 * Base: campos padronizados do PIX (BCB) + labels comuns dos apps
 * (Nubank, Inter, BB, Caixa, Itaú, Bradesco, Santander, C6, PicPay,
 * Mercado Pago, PagBank, Neon, Original, Next, Will, etc.).
 */

function limparOcr(texto) {
  return String(texto || "")
    .replace(/\u00a0/g, " ")
    .replace(/[|]/g, "I")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function paraNumero(raw) {
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  s = s.replace(/[^\d.,]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function campo(texto, nomes) {
  const lines = String(texto).split(/\n+/);
  for (const nome of nomes) {
    const reLinha = new RegExp(
      "^\\s*" + nome + "\\s*[:\\-–]?\\s*(.+)$",
      "i"
    );
    for (const line of lines) {
      const m = line.match(reLinha);
      if (m && m[1] && m[1].trim().length > 1) return m[1].trim();
    }
    const reInline = new RegExp(
      nome + "\\s*[:\\-–]\\s*([^\\n]+)",
      "i"
    );
    const m2 = String(texto).match(reInline);
    if (m2 && m2[1] && m2[1].trim().length > 1) return m2[1].trim();
  }
  return null;
}

function extrairData(texto) {
  const t = String(texto);
  let m = t.match(
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (m) {
    let dia = parseInt(m[1], 10);
    let mes = parseInt(m[2], 10) - 1;
    let ano = parseInt(m[3], 10);
    if (ano < 100) ano += 2000;
    if (dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
      return { dia, mes, ano };
    }
  }
  m = t.match(
    /(\d{1,2})\s+de\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\s+(?:de\s+)?(\d{4})/i
  );
  if (m) {
    const meses = {
      jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
      jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
    };
    const mes = meses[m[2].toLowerCase().slice(0, 3)];
    return { dia: parseInt(m[1], 10), mes, ano: parseInt(m[3], 10) };
  }
  return null;
}

function extrairParcelas(texto) {
  const low = String(texto).toLowerCase();
  let m = low.match(/\b(\d{1,2})\s*\/\s*(\d{1,2})\b/);
  if (m) {
    const atual = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (total >= 2 && total <= 48 && atual >= 1 && atual <= total) {
      return { atual, total, fonte: "fracao" };
    }
  }
  m = low.match(/(?:em|parcelad[oa]s?\s+em)\s*(\d{1,2})\s*x\b/);
  if (m) {
    const total = parseInt(m[1], 10);
    if (total >= 2 && total <= 48) return { atual: 1, total, fonte: "em_nx" };
  }
  m = low.match(/\b(\d{1,2})\s*x\b(?:\s+de\s+r\$)?/);
  if (m) {
    const total = parseInt(m[1], 10);
    if (total >= 2 && total <= 48) return { atual: 1, total, fonte: "nx" };
  }
  m = low.match(/\bparcelas?\s*[:\-]?\s*(\d{1,2})\b/);
  if (m) {
    const total = parseInt(m[1], 10);
    if (total >= 2 && total <= 48) return { atual: 1, total, fonte: "label" };
  }
  return null;
}

function extrairDescricao(texto, estabelecimento) {
  if (estabelecimento && estabelecimento.length > 2) return estabelecimento.slice(0, 80);
  const lines = String(texto)
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 60);
  const skip =
    /^(valor|data|hora|pix|comprovante|banco|ag[eê]ncia|conta|cpf|cnpj|id\b|e2e|autentica|total|pago|status)/i;
  for (const l of lines) {
    if (skip.test(l)) continue;
    if (/^r\$\s*\d/i.test(l)) continue;
    if (/^\d{1,2}[\/\-.]\d{1,2}/.test(l)) continue;
    return l.slice(0, 80);
  }
  return "Lançamento";
}

function categorizar(desc, low) {
  const t = (low + " " + desc).toLowerCase();
  if (/uber|99\b|transporte|gasolina|posto|shell|ipiranga|combust/i.test(t)) return "Transporte";
  if (/ifood|rappi|lanche|restaurante|supermercado|mercado|aliment|padaria|acai|açaí/i.test(t) && !/mercado\s*liv/i.test(t))
    return "Alimentação";
  if (/farm|rem[eé]dio|sa[uú]de|drogaria|hospital|dentista|m[eé]dic/i.test(t)) return "Saúde";
  if (/cinema|netflix|spotify|lazer|academia|steam|playstation|xbox/i.test(t)) return "Lazer";
  if (/shein|shopee|amazon|magazine|magalu|mercado\s*liv|mercadoliv|renner|zara|americanas|compra/i.test(t))
    return "Compras";
  if (/casa|aluguel|luz|energia|água|agua|internet|vivo|claro|tim|oi\b|condom/i.test(t)) return "Casa";
  if (/escola|faculdade|curso|udemy|estudo|livro/i.test(t)) return "Estudos";
  return "Outros";
}

/** Bancos e carteiras mais usados no Brasil (rótulos que aparecem no OCR). */
function detectarBanco(low, cartaoTxt) {
  const c = ((cartaoTxt || "") + " " + low).toLowerCase();
  const regras = [
    [/nubank|nu\s*pagamentos|\bnu\b.*roxo|roxinho/i, "NU"],
    [/banco do brasil|\bbb\b|fac[ií]l\s*bb|bb\s*digital/i, "BB"],
    [/\binter\b|banco inter/i, "Inter"],
    [/\bc6\b|c6\s*bank/i, "C6"],
    [/ita[uú]|itau\s*unibanco/i, "Itau"],
    [/bradesco/i, "Bradesco"],
    [/santander/i, "Santander"],
    [/caixa\s*econ[oô]mica|\bcef\b|caixa\s*tem/i, "Caixa"],
    [/mercado\s*pago|mercadopago/i, "MercadoPago"],
    [/picpay|pic\s*pay/i, "PicPay"],
    [/pag(bank|seguro)|pagseguro/i, "PagBank"],
    [/\bneon\b/i, "Neon"],
    [/original/i, "Original"],
    [/\bnext\b/i, "Next"],
    [/will\s*bank|\bwill\b/i, "Will"],
    [/btg|\bbank\b.*btg/i, "BTG"],
    [/safra/i, "Safra"],
    [/sicoob/i, "Sicoob"],
    [/sicredi/i, "Sicredi"],
    [/stone/i, "Stone"],
    [/asaas/i, "Asaas"],
  ];
  for (const [re, nome] of regras) {
    if (re.test(c)) return nome;
  }
  return null;
}

/**
 * Ordem importa: crédito/parcelas > débito > PIX > dinheiro.
 * Evita classificar compra no crédito como PIX por causa de texto residual.
 */
function detectarForma(low, funcaoTxt) {
  const t = ((funcaoTxt || "") + " " + low).toLowerCase();
  if (
    /cr[eé]dito|compra no cr[eé]dito|fun[cç][aã]o\s*cr[eé]dito|cart[aã]o de cr[eé]dito|modalidade\s*cr[eé]dito/.test(t) ||
    /\d{1,2}\s*x\b|parcelad|parcela\s*\d+\s*\/\s*\d+/.test(t)
  ) {
    return "credito";
  }
  if (/d[eé]bito|compra no d[eé]bito|fun[cç][aã]o\s*d[eé]bito|cart[aã]o de d[eé]bito/.test(t)) {
    return "debito";
  }
  if (/\bpix\b|transfer[eê]ncia\s*instant|pagamento\s*instant/.test(t)) return "pix";
  if (/\bted\b|\bdoc\b|transfer[eê]ncia\s*(banc[aá]ria|entre\s*contas)/.test(t)) return "ted";
  if (/boleto|linha\s*digit[aá]vel|c[oó]digo\s*de\s*barras/.test(t)) return "boleto";
  if (/dinheiro|esp[eé]cie/.test(t)) return "dinheiro";
  return null;
}

/** PIX/TED: recebido = entrada; enviado/pago = gasto */
function detectarDirecao(low) {
  const t = String(low || "").toLowerCase();
  if (
    /pix\s*recebid|recebido\s*via\s*pix|voc[eê]\s*recebeu|entrada\s*via\s*pix|recebimento|valor\s*recebido|transfer[eê]ncia\s*recebid|cr[eé]dito\s*em\s*conta|depositado\s*na\s*sua\s*conta/.test(
      t
    )
  ) {
    return "entrada";
  }
  if (
    /pix\s*enviad|enviado\s*via\s*pix|voc[eê]\s*enviou|pagamento\s*via\s*pix|pagou\s*com\s*pix|valor\s*enviado|transfer[eê]ncia\s*enviad|comprovante\s*de\s*pagamento|pagamento\s*realizado|pix\s*realizado/.test(
      t
    )
  ) {
    return "gasto";
  }
  // Labels clássicos: "Para" = destino (saída); "De" sozinho é ambíguo
  if (/\bpara\b/.test(t) && (/\bpix\b/.test(t) || /transfer/.test(t)) && !/recebid/.test(t)) {
    return "gasto";
  }
  return null;
}

function extrairValoresMonetarios(texto) {
  const encontrados = [];
  const re =
    /r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|r\$\s*(\d+[.,]\d{2})|(\d{1,3}(?:\.\d{3})*,\d{2})|(\d+,\d{2})/gi;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const v = paraNumero(m[1] || m[2] || m[3] || m[4]);
    if (v > 0) encontrados.push({ valor: v, index: m.index });
  }
  return encontrados;
}

function valorPreferencial(limpo, valores) {
  // Labels de valor total da operação (universal nos apps BR)
  const labels = [
    "Valor",
    "Valor da transferência",
    "Valor do pagamento",
    "Valor da compra",
    "Valor total",
    "Total",
    "Você pagou",
    "Você enviou",
    "Você recebeu",
    "Quantia",
  ];
  for (const lb of labels) {
    const raw = campo(limpo, [lb]);
    if (raw) {
      const v = paraNumero(raw);
      if (v > 0) return v;
    }
  }
  if (!valores.length) return 0;
  return [...valores].sort((a, b) => b.valor - a.valor)[0].valor;
}

function montarDescricao(limpo, forma, tipo, estabelecimento) {
  const para = campo(limpo, [
    "Para",
    "Destino",
    "Destinatário",
    "Destinatario",
    "Recebedor",
    "Nome do recebedor",
    "Favorecido",
  ]);
  const de = campo(limpo, [
    "De",
    "Origem",
    "Remetente",
    "Pagador",
    "Nome do pagador",
    "Quem enviou",
  ]);
  const estab =
    estabelecimento ||
    campo(limpo, ["Estabelecimento", "Loja", "Comércio", "Comercio", "Local"]);

  if (forma === "pix" || forma === "ted") {
    if (tipo === "entrada" && de) return ("PIX de " + de).slice(0, 80);
    if (tipo === "gasto" && para) return ("PIX para " + para).slice(0, 80);
    if (tipo === "entrada") return "PIX recebido";
    if (tipo === "gasto") return "PIX enviado";
  }
  if (forma === "credito" || forma === "debito") {
    if (estab) return estab.slice(0, 80);
  }
  if (forma === "boleto") {
    const ben = campo(limpo, ["Beneficiário", "Beneficiario", "Cedente"]);
    if (ben) return ("Boleto " + ben).slice(0, 80);
    return "Pagamento de boleto";
  }
  return extrairDescricao(limpo, estab);
}

function parseTextoLivre(limpo, low) {
  const valores = extrairValoresMonetarios(limpo);
  if (!valores.length) return [];
  const v = valorPreferencial(limpo, valores) || valores[0].valor;
  const parcInfo = extrairParcelas(limpo);
  const parcelas = parcInfo && parcInfo.total > 1 ? parcInfo.total : 1;
  const data = extrairData(limpo);
  const forma = detectarForma(low, null);
  const banco = detectarBanco(low, null);
  const isCartao =
    forma === "credito" ||
    !!(parcInfo && parcelas > 1) ||
    /cart[aã]o|cr[eé]dito|\d+\s*x/i.test(low);
  const dir = detectarDirecao(low);
  let tipo = "gasto";
  if (isCartao) tipo = "compraCartao";
  else if (dir === "entrada") tipo = "entrada";
  else if (forma === "pix" || forma === "ted" || forma === "boleto" || forma === "debito")
    tipo = "gasto";

  const descricao = montarDescricao(limpo, forma || (isCartao ? "credito" : "pix"), tipo, null);
  return [
    {
      tipo,
      forma: forma || (isCartao ? "credito" : /\bpix\b/i.test(low) ? "pix" : "debito"),
      descricao,
      valor: parcelas > 1 ? v : v,
      valorTotal: parcelas > 1 ? v * (parcInfo && parcInfo.fonte === "fracao" ? 1 : 1) : v,
      categoria: tipo === "entrada" ? "Outros" : categorizar(descricao, low),
      tipoGasto: "Variavel",
      recorrente: false,
      dia: data ? data.dia : null,
      parcelas: isCartao ? parcelas : 1,
      banco,
      cartaoFinal: null,
      ano: data ? data.ano : null,
      mes: data ? data.mes : null,
    },
  ];
}

export function parseLocal(texto) {
  const limpo = limparOcr(texto);
  const low = limpo.toLowerCase();
  if (limpo.length < 8) return [];

  const estabelecimento = campo(limpo, [
    "Estabelecimento",
    "Loja",
    "Comércio",
    "Comercio",
    "Local da compra",
    "Nome fantasia",
  ]);
  const cartaoTxt = campo(limpo, ["Cartão", "Cartao", "Final", "Cartão final"]);
  const funcaoTxt = campo(limpo, ["Função", "Funcao", "Tipo", "Modalidade", "Forma de pagamento"]);
  const valorCampoRaw = campo(limpo, [
    "Valor",
    "Valor da transferência",
    "Valor do pagamento",
    "Valor da compra",
    "Valor total",
    "Total",
    "Você pagou",
    "Você enviou",
    "Você recebeu",
  ]);
  const valorCampo = valorCampoRaw ? paraNumero(valorCampoRaw) : 0;
  const valores = extrairValoresMonetarios(limpo);
  const parcInfo = extrairParcelas(limpo);
  const data = extrairData(limpo);

  let parcelas = 1;
  let valorParcela = 0;
  let valorTotal = 0;

  if (parcInfo && parcInfo.total > 1) {
    parcelas = parcInfo.total;
  }

  if (valorCampo && parcelas > 1) {
    // Fracao 3/10 no texto: valor do comprovante costuma ser a parcela
    if (parcInfo && parcInfo.fonte === "fracao") {
      valorParcela = valorCampo;
      valorTotal = valorParcela * parcelas;
    } else {
      valorTotal = valorCampo;
      valorParcela = valorTotal / parcelas;
    }
  } else if (valorCampo) {
    valorParcela = valorCampo;
    valorTotal = valorCampo;
  } else if (valores.length) {
    const prefer = valorPreferencial(limpo, valores);
    if (parcelas > 1) {
      valorTotal = prefer;
      valorParcela = prefer / parcelas;
    } else {
      valorParcela = prefer;
      valorTotal = prefer;
    }
  }

  if (!valorParcela && !valorTotal) return parseTextoLivre(limpo, low);

  const forma = detectarForma(low, funcaoTxt);
  const banco = detectarBanco(low, cartaoTxt);
  const isCartao =
    forma === "credito" ||
    !!(parcInfo && parcelas > 1) ||
    /cart[aã]o|visa|master|elo|cr[eé]dito/i.test(low + " " + (funcaoTxt || ""));

  const dir = detectarDirecao(low);

  let tipo;
  if (isCartao || forma === "credito") tipo = "compraCartao";
  else if ((forma === "pix" || forma === "ted") && dir === "entrada") tipo = "entrada";
  else if (dir === "entrada") tipo = "entrada";
  else tipo = "gasto";

  const formaFinal =
    forma ||
    (tipo === "compraCartao" ? "credito" : tipo === "entrada" ? "pix" : /\bpix\b/i.test(low) ? "pix" : "debito");

  const descricao = montarDescricao(limpo, formaFinal, tipo, estabelecimento);
  const finalMatch = (cartaoTxt || limpo).match(/final\s*(\d{4})/i);

  return [
    {
      tipo,
      forma: formaFinal,
      descricao,
      valor: valorParcela || valorTotal,
      valorTotal: valorTotal || valorParcela,
      categoria: tipo === "entrada" ? "Outros" : categorizar(descricao, low),
      tipoGasto: "Variavel",
      recorrente: false,
      dia: data ? data.dia : null,
      parcelas: tipo === "compraCartao" ? Math.max(1, parcelas) : 1,
      banco,
      cartaoFinal: finalMatch ? finalMatch[1] : null,
      ano: data ? data.ano : null,
      mes: data ? data.mes : null,
    },
  ];
}

export async function parseQuickAdd(texto) {
  const local = parseLocal(texto);
  if (local.length) return local;
  return parseLocal(limparOcr(texto));
}

export async function ocrImagem(fileOrBlob, onProgress) {
  const Tesseract = (await import("tesseract.js")).default;
  let result;
  try {
    result = await Tesseract.recognize(fileOrBlob, "por", {
      logger: (m) => {
        if (m.status === "recognizing text" && m.progress != null && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
  } catch (e1) {
    try {
      result = await Tesseract.recognize(fileOrBlob, "por", {
        logger: (m) => {
          if (m.status === "recognizing text" && m.progress != null && onProgress) {
            onProgress(Math.round(m.progress * 100));
          }
        },
      });
    } catch (e2) {
      throw new Error("Falha no OCR. Verifique a internet e tente de novo.");
    }
  }
  const text = limparOcr(result?.data?.text || "");
  if (!text || text.length < 3) {
    throw new Error("Nao li texto na imagem. Use um print mais nitido da area do comprovante.");
  }
  return text;
}
