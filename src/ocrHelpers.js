/** Parser local + OCR — comprovantes estruturados (BB, Nubank, etc.) */

function limparOcr(texto) {
  return String(texto || "")
    .replace(/\u0000/g, "")
    .replace(/[|]/g, " ")
    // OCR confunde O/I/l com 0/1 perto de numeros
    .replace(/(\d)[Oo](\d)/g, "$10$2")
    .replace(/(\d)[Oo]\b/g, "$10")
    .replace(/\b[Oo](\d)/g, "0$1")
    .replace(/(\d)[Il](\d)/g, "$11$2")
    // sinal de multiplicacao unicode
    .replace(/[×✕✖]/g, "x")
    .replace(/R\s*\$\s*/gi, "R$ ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function paraNumero(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  s = s.replace(/r\$\s*/i, "").trim();
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const v = parseFloat(s);
  return v > 0 && v < 1000000 ? v : null;
}

function campo(texto, nomes) {
  const lines = texto.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const low = line.toLowerCase();
    for (const nome of nomes) {
      const re = new RegExp("^" + nome.replace(/\s+/g, "\\s*") + "\\s*[:\\-]?\\s*(.*)$", "i");
      const m = line.match(re);
      if (m) {
        const rest = (m[1] || "").trim();
        if (rest) return rest;
        if (i + 1 < lines.length) return lines[i + 1];
      }
      if (low === nome.toLowerCase() || low === nome.toLowerCase() + ":") {
        if (i + 1 < lines.length) return lines[i + 1];
      }
    }
  }
  for (const nome of nomes) {
    const re = new RegExp(nome + "\\s*[:\\-]?\\s*([^\\n]+)", "i");
    const m = texto.match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

function extrairData(texto) {
  const m = String(texto || "").match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  let dia = parseInt(m[1], 10);
  let mes = parseInt(m[2], 10) - 1;
  let ano = parseInt(m[3], 10);
  if (ano < 100) ano += 2000;
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;
  return { dia, mes, ano };
}

function extrairParcelas(texto) {
  // normaliza quebras: "10 x de R$\n394,00" -> mesma linha
  const raw = String(texto || "");
  const one = raw.replace(/[\r\n]+/g, " ");
  const low = one.toLowerCase();

  // 1) Prioridade: "10 x de R$ 394,00" / "10x de 394,00"
  let m =
    low.match(/(\d{1,2})\s*x\s*de\s*r\$?\s*([\d.,]+)/i) ||
    low.match(/(\d{1,2})\s*x\s*de\s*([\d.,]+)/i);
  if (m) {
    const total = parseInt(m[1], 10);
    const valorParcela = paraNumero(m[2]);
    if (total >= 2 && total <= 48) return { total, valorParcela, fonte: "nx" };
  }

  // 2) "em 10x" / "parcelado em 10 x"
  m = low.match(/(?:em|parcelad[oa]s?\s+em)\s*(\d{1,2})\s*x\b/);
  if (m) {
    const total = parseInt(m[1], 10);
    if (total >= 2 && total <= 48) return { total, valorParcela: null, fonte: "nx" };
  }

  // 3) "Parcelas: 10" isolado (rotulo do comprovante)
  m = low.match(/\bparcelas?\s*[:\-]?\s*(\d{1,2})\b/);
  if (m) {
    const total = parseInt(m[1], 10);
    if (total >= 2 && total <= 48) return { total, valorParcela: null, fonte: "nx" };
  }

  // 4) "10 x" generico
  m = low.match(/\b(\d{1,2})\s*x\b/);
  if (m) {
    const total = parseInt(m[1], 10);
    if (total >= 2 && total <= 48) return { total, valorParcela: null, fonte: "nx" };
  }

  // 5) "Parc 01/10" — denominador e o total; valor do comprovante costuma ser a parcela
  m = low.match(/parc\.?\s*(\d{1,2})\s*[\/|]\s*(\d{1,2})/);
  if (m) {
    const atual = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (total >= 2 && total <= 48) return { atual, total, valorParcela: null, fonte: "fracao" };
  }

  // 6) "3 de 10"
  m = low.match(/\b(\d{1,2})\s*de\s*(\d{1,2})\b/);
  if (m) {
    const atual = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (total >= 2 && total <= 48 && atual <= total) return { atual, total, valorParcela: null, fonte: "fracao" };
  }

  return null;
}

function extrairDescricao(texto, estabelecimento) {
  if (estabelecimento) {
    let d = estabelecimento
      .replace(/parc\.?\s*\d+\s*\/\s*\d+/i, "")
      .replace(/\*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (/mercado\s*liv|mercadoliv/i.test(d)) return "Mercado Livre";
    if (/shein/i.test(d)) return "Shein";
    if (/shopee/i.test(d)) return "Shopee";
    if (d.length >= 2) return d.slice(0, 40);
  }
  if (/mercado\s*livre|mercadoliv|mp\s*\*?\s*mercado/i.test(texto)) return "Mercado Livre";
  if (/shein/i.test(texto)) return "Shein";
  if (/shopee/i.test(texto)) return "Shopee";
  if (/ifood/i.test(texto)) return "iFood";
  if (/\buber\b/i.test(texto)) return "Uber";
  return "Compra";
}

function categorizar(desc, low) {
  const t = (low + " " + desc).toLowerCase();
  if (/uber|99\b|transporte|gasolina/i.test(t)) return "Transporte";
  if (/ifood|rappi|lanche|restaurante|supermercado|aliment/i.test(t) && !/mercado\s*liv/i.test(t)) return "Alimentação";
  if (/farm|remedio|remédio|saude|saúde|drogaria/i.test(t)) return "Saúde";
  if (/cinema|netflix|spotify|lazer|academia/i.test(t)) return "Lazer";
  if (/shein|shopee|amazon|magazine|magalu|mercado\s*liv|mercadoliv|compra|renner/i.test(t)) return "Compras";
  if (/casa|aluguel|luz|agua|água|internet/i.test(t)) return "Casa";
  return "Outros";
}

function detectarBanco(low, cartaoTxt) {
  const c = (cartaoTxt || "") + " " + low;
  if (/banco do brasil|fac[ií]l|\bbb\b/i.test(c)) return "BB";
  if (/nubank|nu\s*pagamentos/i.test(c)) return "NU";
  if (/\binter\b/i.test(c)) return "Inter";
  if (/\bc6\b/i.test(c)) return "C6";
  if (/ita[uú]/i.test(c)) return "Itau";
  if (/bradesco/i.test(c)) return "Bradesco";
  return null;
}

function detectarForma(low, funcaoTxt) {
  const t = ((funcaoTxt || "") + " " + low).toLowerCase();
  if (/\bpix\b/.test(t)) return "pix";
  if (/d[eé]bito/.test(t)) return "debito";
  if (/cr[eé]dito|parcela|\d+\s*x/.test(t)) return "credito";
  if (/dinheiro|esp[eé]cie/.test(t)) return "dinheiro";
  return null;
}

function extrairValoresMonetarios(texto) {
  const encontrados = [];
  const re = /r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|r\$\s*(\d+[.,]\d{2})|(\d{1,3}(?:\.\d{3})*,\d{2})|(\d+,\d{2})/gi;
  let m;
  while ((m = re.exec(texto)) !== null) {
    const v = paraNumero(m[1] || m[2] || m[3] || m[4]);
    if (v) encontrados.push({ valor: v, index: m.index });
  }
  return encontrados;
}

function parseTextoLivre(limpo, low) {
  const valores = extrairValoresMonetarios(limpo);
  if (!valores.length) return [];
  const v = [...valores].sort((a, b) => b.valor - a.valor)[0];
  const parcInfo = extrairParcelas(limpo);
  const parcelas = parcInfo && parcInfo.total > 1 ? parcInfo.total : 1;
  const data = extrairData(limpo);
  const descricao = extrairDescricao(limpo, null);
  const banco = detectarBanco(low, null);
  const isCartao = !!(banco || (parcInfo && parcelas > 1) || /cart[aã]o|cr[eé]dito|\d+\s*x/i.test(low));
  return [{
    tipo: isCartao ? "compraCartao" : "gasto",
    forma: isCartao ? "credito" : (/pix/i.test(low) ? "pix" : "debito"),
    descricao,
    valor: parcelas > 1 && parcInfo && parcInfo.valorParcela ? parcInfo.valorParcela : v.valor,
    valorTotal: parcelas > 1
      ? (parcInfo && parcInfo.valorParcela ? parcInfo.valorParcela * parcelas : v.valor)
      : v.valor,
    categoria: categorizar(descricao, low),
    tipoGasto: "Variavel",
    recorrente: false,
    dia: data ? data.dia : null,
    parcelas: isCartao ? parcelas : 1,
    banco,
    cartaoFinal: null,
    ano: data ? data.ano : null,
    mes: data ? data.mes : null,
  }];
}



const MESES_ABREV = {
  jan: 0, janeiro: 0,
  fev: 1, fevereiro: 1,
  mar: 2, marco: 2, "março": 2,
  abr: 3, abril: 3,
  mai: 4, maio: 4,
  jun: 5, junho: 5,
  jul: 6, julho: 6,
  ago: 7, agosto: 7,
  set: 8, setembro: 8,
  out: 9, outubro: 9,
  nov: 10, novembro: 10,
  dez: 11, dezembro: 11,
};

/** Extrato/fatura: varias linhas "02 AGO Descricao R$ 12,34" (Nubank e similares) */
function parseExtratoLinhas(texto) {
  const limpo = limparOcr(texto);
  const lines = limpo.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const itens = [];

  let anoFatura = new Date().getFullYear();
  const mAno = limpo.match(/fatura\s+\d{1,2}\s+\w+\s+(20\d{2})/i) || limpo.match(/\b(20\d{2})\b/);
  if (mAno) anoFatura = parseInt(mAno[1], 10);

  const reMes = "jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro";

  for (let line of lines) {
    const low = line.toLowerCase();
    if (/^pagamentos?\b/i.test(low)) continue;
    if (/pagamento em\b/i.test(low)) continue;
    if (/total|saldo anterior|limite|vencimento|emiss[aã]o|resolu[cç]/i.test(low)) continue;
    if (/-\s*r\$|r\$\s*-/i.test(line)) continue;

    line = line.replace(/[·.•*]{2,}\s*\d{3,4}/g, " ").replace(/\s+/g, " ").trim();

    const re = new RegExp("^(\\d{1,2})\\s+(" + reMes + ")\\s+(.+?)\\s+r\\$\\s*([\\d.]+,\\d{2})\\s*$", "i");
    let m = line.match(re);
    if (!m) {
      const re2 = new RegExp("^(\\d{1,2})\\s+(" + reMes + ")\\s+(.+?)\\s+([\\d.]+,\\d{2})\\s*$", "i");
      m = line.match(re2);
    }
    if (!m) continue;

    const dia = parseInt(m[1], 10);
    const mesKey = m[2].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
    const mes = MESES_ABREV[mesKey.slice(0, 3)] ?? MESES_ABREV[mesKey];
    if (mes == null || dia < 1 || dia > 31) continue;

    let descRaw = (m[3] || "").trim().replace(/^nu\s+/i, "").replace(/\s+/g, " ").trim();
    if (!descRaw || descRaw.length < 2) continue;
    if (/^\d{3,4}$/.test(descRaw)) continue;

    const valor = paraNumero(m[4]);
    if (!valor || valor <= 0) continue;
    if (/victor|manoel|oliveira|barros/i.test(descRaw) && valor > 500) continue;

    let soParcelaFatura = false;
    let parcelasOriginais = 1;
    const mp = descRaw.match(/parcela\s*(\d{1,2})\s*\/\s*(\d{1,2})/i);
    if (mp) {
      parcelasOriginais = Math.max(1, parseInt(mp[2], 10) || 1);
      soParcelaFatura = parcelasOriginais > 1;
    }

    const desc = extrairDescricao(descRaw, descRaw);
    const cat = categorizar(desc, descRaw.toLowerCase());

    itens.push({
      tipo: "compraCartao",
      forma: "credito",
      descricao: desc.slice(0, 48),
      valor,
      valorTotal: valor,
      categoria: cat,
      tipoGasto: "Variavel",
      recorrente: false,
      dia,
      parcelas: 1,
      soParcelaFatura,
      parcelasOriginais,
      banco: /nupay|nubank|\bnu\b/i.test(descRaw + " " + limpo) ? "NU" : detectarBanco(limpo.toLowerCase(), ""),
      cartaoFinal: null,
      ano: anoFatura,
      mes,
    });
  }

  return itens;
}


export function parseLocal(texto) {
  const limpo = limparOcr(texto);
  const low = limpo.toLowerCase();

  // Extrato/fatura com varias compras (Nubank e similares)
  const extrato = parseExtratoLinhas(limpo);
  if (extrato.length >= 2) return extrato;

  const estabelecimento = campo(limpo, ["Estabelecimento", "estabelecimento", "Destino", "Loja"]);
  const valorTxt = campo(limpo, ["Valor", "valor"]);
  const parcelasTxt = campo(limpo, ["Parcelas", "parcelas", "Parcela"]);
  const dataTxt = campo(limpo, ["Data e Hora", "Data", "data e hora", "Data/Hora"]);
  const cartaoTxt = campo(limpo, ["Cartão", "Cartao", "cartão", "cartao"]);
  const funcaoTxt = campo(limpo, ["Função", "Funcao", "função", "funcao", "Tipo", "Pagamento"]);

  const data = extrairData(dataTxt || limpo);
  const parcInfo = extrairParcelas((parcelasTxt || "") + "\n" + limpo);
  const valorCampo = paraNumero(valorTxt);
  const valores = extrairValoresMonetarios(limpo);

  let valorParcela = null;
  let valorTotal = null;
  let parcelas = 1;

  if (parcInfo) {
    parcelas = parcInfo.total > 1 ? parcInfo.total : 1;
    if (parcInfo.valorParcela) valorParcela = parcInfo.valorParcela;
  }

  if (valorCampo && parcelas > 1 && valorParcela) {
    // Valor do comprovante costuma ser o TOTAL; parcela * N deve bater
    valorTotal = valorCampo;
    const prod = valorParcela * parcelas;
    if (Math.abs(valorCampo - prod) <= 1.5) {
      // ok: 3940 e 10x 394
    } else if (Math.abs(valorCampo - valorParcela) <= 1.5) {
      // campo "Valor" veio como parcela
      valorTotal = valorParcela * parcelas;
    } else if (valorCampo > prod * 0.5 && valorCampo < prod * 1.5) {
      // pequena divergencia de OCR: confia no total do campo e recalcula parcela
      valorTotal = valorCampo;
      valorParcela = valorTotal / parcelas;
    } else {
      // se 10x 394 e valor 3940 bate na outra ordem
      valorTotal = Math.max(valorCampo, prod);
      valorParcela = valorTotal / parcelas;
    }
  } else if (valorCampo && parcelas > 1 && !valorParcela) {
    if (parcInfo && parcInfo.fonte === "fracao") {
      // "Parc 3/10" + Valor 150 => 150 e a parcela
      valorParcela = valorCampo;
      valorTotal = valorParcela * parcelas;
    } else {
      // "10x" / "Parcelas 10" + Valor 3940 => total
      valorTotal = valorCampo;
      valorParcela = valorTotal / parcelas;
    }
  } else if (valorCampo) {
    valorParcela = valorCampo;
    valorTotal = valorCampo;
  } else if (valores.length) {
    const sorted = [...valores].sort((a, b) => b.valor - a.valor);
    if (parcelas > 1 && sorted.length >= 2) {
      valorTotal = sorted[0].valor;
      valorParcela =
        sorted.find((v) => Math.abs(v.valor * parcelas - valorTotal) < 1)?.valor ||
        valorTotal / parcelas;
    } else {
      valorParcela = sorted[0].valor;
      valorTotal = parcelas > 1 ? valorParcela * parcelas : valorParcela;
    }
  }

  if (!valorParcela && !valorTotal) return parseTextoLivre(limpo, low);

  const descricao = extrairDescricao(limpo, estabelecimento);
  const categoria = categorizar(descricao, low);
  const banco = detectarBanco(low, cartaoTxt);
  const forma = detectarForma(low, funcaoTxt);
  const isCartao =
    forma === "credito" ||
    !!(parcInfo && parcelas > 1) ||
    /cart[aã]o|visa|master|cr[eé]dito/i.test(low + " " + (funcaoTxt || ""));

  const tipo =
    forma === "pix" || forma === "debito" || forma === "dinheiro"
      ? "gasto"
      : isCartao
        ? "compraCartao"
        : "gasto";

  const finalMatch = (cartaoTxt || "").match(/final\s*(\d{4})/i);

  return [{
    tipo,
    forma: forma || (tipo === "compraCartao" ? "credito" : "debito"),
    descricao,
    valor: valorParcela || valorTotal,
    valorTotal: valorTotal || valorParcela,
    categoria,
    tipoGasto: "Variavel",
    recorrente: false,
    dia: data ? data.dia : null,
    parcelas: tipo === "compraCartao" ? parcelas : 1,
    banco,
    cartaoFinal: finalMatch ? finalMatch[1] : null,
    ano: data ? data.ano : null,
    mes: data ? data.mes : null,
  }];
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
