/** Parser local + OCR — Nubank, BB e outros comprovantes */

function limparOcr(texto) {
  return String(texto || "")
    .replace(/\u0000/g, "")
    .replace(/[|]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extrairValoresMonetarios(texto) {
  const encontrados = [];
  const re = /r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|r\$\s*(\d+[.,]\d{2})|(\d{1,3}(?:\.\d{3})*,\d{2})|(\d+,\d{2})/gi;
  let m;
  while ((m = re.exec(texto)) !== null) {
    let raw = m[1] || m[2] || m[3] || m[4];
    if (!raw) continue;
    if (raw.includes(",") && raw.includes(".")) raw = raw.replace(/\./g, "").replace(",", ".");
    else if (raw.includes(",")) raw = raw.replace(",", ".");
    const v = parseFloat(raw);
    if (v > 0 && v < 100000) encontrados.push({ valor: v, index: m.index, raw: m[0] });
  }
  return encontrados;
}

function extrairData(texto) {
  const m = texto.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  let dia = parseInt(m[1], 10);
  let mes = parseInt(m[2], 10) - 1;
  let ano = parseInt(m[3], 10);
  if (ano < 100) ano += 2000;
  if (mes < 0 || mes > 11 || dia < 1 || dia > 31) return null;
  return { dia, mes, ano };
}

function extrairParcelas(texto) {
  const low = texto.toLowerCase();
  let m = low.match(/(\d{1,2})\s*de\s*(\d{1,2})/);
  if (m) return { atual: parseInt(m[1], 10), total: parseInt(m[2], 10) };
  m = low.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*(?:parc|x)?/);
  if (m && parseInt(m[2], 10) > 1 && parseInt(m[2], 10) <= 48) {
    return { atual: parseInt(m[1], 10), total: parseInt(m[2], 10) };
  }
  m = low.match(/(\d{1,2})\s*x\b/);
  if (m) return { atual: 1, total: parseInt(m[1], 10) };
  m = low.match(/em\s*(\d{1,2})\s*x/);
  if (m) return { atual: 1, total: parseInt(m[1], 10) };
  return null;
}

function extrairDescricao(texto, low) {
  if (/mercado\s*livre|mercadolivre|mp\s*\*?\s*mercado/i.test(texto)) return "Mercado Livre";
  if (/shein/i.test(texto)) return "Shein";
  if (/shopee/i.test(texto)) return "Shopee";
  if (/ifood/i.test(texto)) return "iFood";
  if (/\buber\b/i.test(texto)) return "Uber";
  if (/amazon/i.test(texto)) return "Amazon";
  if (/magazine|magalu/i.test(texto)) return "Magalu";

  const patterns = [
    /estabelecimento[:\s]*([A-Za-z0-9* .\-]{2,40})/i,
    /destino[:\s]*([A-Za-z0-9* .\-]{2,40})/i,
  ];
  for (const re of patterns) {
    const m = texto.match(re);
    if (m && m[1]) {
      const d = m[1].replace(/\*+/g, " ").replace(/\s+/g, " ").trim();
      if (d.length >= 2) return d.slice(0, 40);
    }
  }

  for (const linha of texto.split(/\n+/)) {
    const t = linha.trim();
    if (t.length < 3 || t.length > 50) continue;
    if (/detalhes|comprovante|pagamento|transfer|valor|cart[aã]o|nsu|autoriz|parcela|contest|antecip|virtual|final\s*\d/i.test(t)) continue;
    if (/^r\$/i.test(t) || /^\d+$/.test(t)) continue;
    if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(t) && t.length < 20) continue;
    return t.replace(/\*/g, "").replace(/\s+/g, " ").slice(0, 40);
  }
  return "Compra";
}

function categorizar(low, desc) {
  const t = (low + " " + desc).toLowerCase();
  if (/uber|99\b|transporte|gasolina|estacionamento|passagem/i.test(t)) return "Transporte";
  if (/ifood|rappi|lanche|bistek|aliment|fruteira|padaria|restaurante|supermercado|sacol/i.test(t) && !/mercado\s*livre|mercadolivre/i.test(t)) return "Alimentação";
  if (/farm|remedio|remédio|saude|saúde|drogaria/i.test(t)) return "Saúde";
  if (/cinema|netflix|spotify|lazer|academia|muay|jogo|steam/i.test(t)) return "Lazer";
  if (/shein|shopee|amazon|magazine|magalu|mercado\s*livre|mercadolivre|mp\s*\*?\s*mercado|compra|renner|americanas/i.test(t)) return "Compras";
  if (/casa|sakae|construcao|construção|material|aluguel|luz|agua|água|internet/i.test(t)) return "Casa";
  return "Outros";
}

function detectarBanco(low) {
  // BB / Facil primeiro (antes de qualquer "nu")
  if (/banco do brasil|fac[ií]l|\bbb\b/i.test(low)) return "BB";
  if (/nubank|nu\s*pagamentos/i.test(low)) return "NU";
  if (/\binter\b/i.test(low)) return "Inter";
  if (/\bc6\b/i.test(low)) return "C6";
  if (/ita[uú]/i.test(low)) return "Itau";
  if (/bradesco/i.test(low)) return "Bradesco";
  return null;
}

export function parseLocal(texto) {
  const limpo = limparOcr(texto);
  const low = limpo.toLowerCase();

  const isComprovante = /comprovante|estabelecimento|nsu|c[oó]digo de autoriz|tipo de transfer|detalhes da compra|parcela|cart[aã]o virtual|final\s*\d{4}/i.test(limpo);
  const valores = extrairValoresMonetarios(limpo);
  const data = extrairData(limpo);
  const parc = extrairParcelas(limpo);
  const banco = detectarBanco(low);
  const descricao = extrairDescricao(limpo, low);
  const categoria = categorizar(low, descricao);

  if ((isComprovante || banco || parc) && valores.length) {
    let escolhido = valores[0];
    const idxValor = low.search(/valor|r\$|parcela/);
    if (idxValor >= 0) {
      const perto = valores
        .map((v) => ({ ...v, dist: Math.abs(v.index - idxValor) }))
        .sort((a, b) => a.dist - b.dist);
      if (perto.length) escolhido = perto[0];
    } else {
      escolhido = [...valores].sort((a, b) => b.valor - a.valor)[0];
    }

    const parcelas = parc && parc.total > 1 ? parc.total : 1;
    const valorParcela = escolhido.valor;
    const valorTotal = parcelas > 1 ? valorParcela * parcelas : valorParcela;

    let ano = null;
    let mes = null;
    if (data) {
      ano = data.ano;
      mes = data.mes;
    }

    const isCartao = !!(banco || parc || /cart[aã]o|visa|master|cr[eé]dito|parcela/i.test(low));

    return [{
      tipo: isCartao ? "compraCartao" : "gasto",
      descricao,
      valor: valorParcela,
      valorTotal,
      categoria,
      tipoGasto: "Variavel",
      recorrente: false,
      dia: data ? data.dia : null,
      parcelas,
      banco,
      ano,
      mes,
    }];
  }

  let linhas = limpo.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 1);
  if (linhas.length <= 1 && limpo.length > 20) linhas = [limpo];

  const out = [];
  for (const linha of linhas) {
    const vals = extrairValoresMonetarios(linha);
    if (!vals.length) continue;
    const valor = vals[0].valor;
    const lowL = linha.toLowerCase();
    let tipo = "gasto";
    let tipoGasto = "Variavel";
    let recorrente = false;
    let dia = null;
    let parcelas = 1;
    let bancoL = null;
    let ano = null;
    let mes = null;

    const dLinha = extrairData(linha);
    if (dLinha) { ano = dLinha.ano; mes = dLinha.mes; dia = dLinha.dia; }

    let descricaoL = linha
      .replace(/r\$\s*[\d.,]+/gi, "")
      .replace(/\d{1,3}(?:\.\d{3})*,\d{2}/g, "")
      .replace(/\d+,\d{2}/g, "")
      .replace(/\s+/g, " ")
      .trim() || "Lancamento";
    descricaoL = descricaoL.slice(0, 40);

    if (/recebi|caiu|salario|salário|freelance|renda/i.test(lowL)) {
      out.push({
        tipo: "entrada",
        descricao: descricaoL,
        valor,
        categoria: /salario|salário/i.test(lowL) ? "Salário" : /freelance|freela/i.test(lowL) ? "Freelance" : "Renda extra",
        tipoGasto, recorrente: /todo\s*mes|todo\s*mês|salario|salário/i.test(lowL), dia, parcelas, banco: null, ano, mes,
      });
      continue;
    }

    const pLinha = extrairParcelas(linha);
    if (pLinha && pLinha.total > 1) parcelas = pLinha.total;
    if (/\d+\s*x|parcel|cartao|cartão|nubank|visa|master/i.test(lowL) || parcelas > 1) {
      tipo = "compraCartao";
      bancoL = detectarBanco(lowL);
    }

    out.push({
      tipo,
      descricao: descricaoL,
      valor,
      valorTotal: parcelas > 1 ? valor * parcelas : valor,
      categoria: categorizar(lowL, descricaoL),
      tipoGasto, recorrente, dia, parcelas,
      banco: bancoL,
      ano, mes,
    });
  }

  if (!out.length && valores.length) {
    const v = [...valores].sort((a, b) => b.valor - a.valor)[0];
    out.push({
      tipo: banco || /cart[aã]o|cr[eé]dito/i.test(low) ? "compraCartao" : "gasto",
      descricao,
      valor: v.valor,
      valorTotal: v.valor,
      categoria,
      tipoGasto: "Variavel",
      recorrente: false,
      dia: data ? data.dia : null,
      parcelas: 1,
      banco,
      ano: data ? data.ano : null,
      mes: data ? data.mes : null,
    });
  }

  return out;
}

export async function parseQuickAdd(texto) {
  const local = parseLocal(texto);
  if (local.length) return local;
  return parseLocal(limparOcr(texto));
}

export async function ocrImagem(fileOrBlob, onProgress) {
  const Tesseract = (await import("tesseract.js")).default;
  const result = await Tesseract.recognize(fileOrBlob, "por", {
    logger: (m) => {
      if (m.status === "recognizing text" && m.progress != null && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return limparOcr(result?.data?.text || "");
}
