/** Parser local + OCR — comprovantes estruturados (BB, Nubank, etc.) */

function limparOcr(texto) {
  return String(texto || "")
    .replace(/\u0000/g, "")
    .replace(/[|]/g, " ")
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
  const low = String(texto || "").toLowerCase();
  let m = low.match(/(\d{1,2})\s*x\s*de\s*r\$?\s*([\d.,]+)/i);
  if (m) return { total: parseInt(m[1], 10), valorParcela: paraNumero(m[2]) };
  m = low.match(/(\d{1,2})\s*x\s*de\s*([\d.,]+)/i);
  if (m) return { total: parseInt(m[1], 10), valorParcela: paraNumero(m[2]) };
  m = low.match(/(\d{1,2})\s*de\s*(\d{1,2})/);
  if (m) return { atual: parseInt(m[1], 10), total: parseInt(m[2], 10), valorParcela: null };
  m = low.match(/parc\.?\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (m) return { atual: parseInt(m[1], 10), total: parseInt(m[2], 10), valorParcela: null };
  m = low.match(/(\d{1,2})\s*x\b/);
  if (m) return { total: parseInt(m[1], 10), valorParcela: null };
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

export function parseLocal(texto) {
  const limpo = limparOcr(texto);
  const low = limpo.toLowerCase();

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
    valorTotal = valorCampo;
    if (Math.abs(valorCampo - valorParcela * parcelas) > 1 && valorCampo < valorParcela * parcelas) {
      valorParcela = valorCampo;
      valorTotal = valorParcela * parcelas;
    }
  } else if (valorCampo && parcelas > 1 && !valorParcela) {
    valorTotal = valorCampo;
    valorParcela = valorTotal / parcelas;
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
