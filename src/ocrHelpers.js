/** Parser local + OCR — otimizado para comprovantes (Nubank etc.) */

function limparOcr(texto) {
  return String(texto || "")
    .replace(/\u0000/g, "")
    .replace(/[|]/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Só aceita valores que parecem dinheiro de verdade (com centavos ou R$) */
function extrairValoresMonetarios(texto) {
  const encontrados = [];
  const re = /r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})|r\$\s*(\d+[.,]\d{2})|(\d{1,3}(?:\.\d{3})*,\d{2})|(\d+,\d{2})/gi;
  let m;
  while ((m = re.exec(texto)) !== null) {
    let raw = m[1] || m[2] || m[3] || m[4];
    if (!raw) continue;
    if (raw.includes(",") && raw.includes(".")) {
      raw = raw.replace(/\./g, "").replace(",", ".");
    } else if (raw.includes(",")) {
      raw = raw.replace(",", ".");
    }
    const v = parseFloat(raw);
    if (v > 0 && v < 50000) {
      encontrados.push({ valor: v, index: m.index, raw: m[0] });
    }
  }
  return encontrados;
}

function extrairDescricao(texto, low) {
  const patterns = [
    /estabelecimento[:\s]*([A-Za-z0-9* .\-]{2,40})/i,
    /destino[:\s]*([A-Za-z0-9* .\-]{2,40})/i,
    /shein|shopee|mercado\s*livre|ifood|uber|99|amazon|magazine|renner|americanas/i,
  ];
  for (const re of patterns) {
    const m = texto.match(re);
    if (m) {
      let d = (m[1] || m[0] || "").replace(/\*+/g, "").trim();
      if (/shein/i.test(d) || /shein/i.test(texto)) return "Shein";
      if (/shopee/i.test(d) || /shopee/i.test(texto)) return "Shopee";
      if (d.length >= 2 && d.length <= 40) return d.slice(0, 40);
    }
  }
  for (const linha of texto.split(/\n+/)) {
    const t = linha.trim();
    if (t.length < 3) continue;
    if (/comprovante|pagamento|transfer|valor|cart[aã]o|nsu|autoriz|cr[eé]dito|d[eé]bito|vista|tipo/i.test(t)) continue;
    if (/^\d+$/.test(t)) continue;
    if (/^r\$/i.test(t)) continue;
    return t.replace(/\s+/g, " ").slice(0, 40);
  }
  return "Compra";
}

function categorizar(low, desc) {
  const t = (low + " " + desc).toLowerCase();
  if (/uber|99\b|transporte|gasolina|estacionamento|passagem/i.test(t)) return "Transporte";
  if (/mercado|ifood|rappi|lanche|bistek|aliment|fruteira|padaria|restaurante|supermercado|sacol/i.test(t)) return "Alimentação";
  if (/farm|remedio|remédio|saude|saúde|drogaria/i.test(t)) return "Saúde";
  if (/cinema|netflix|spotify|lazer|academia|muay|jogo|steam/i.test(t)) return "Lazer";
  if (/shein|shopee|amazon|magazine|compra|mercado\s*livre|renner|americanas/i.test(t)) return "Compras";
  if (/casa|sakae|construcao|construção|material|aluguel|luz|agua|água|internet/i.test(t)) return "Casa";
  return "Outros";
}

export function parseLocal(texto) {
  const limpo = limparOcr(texto);
  const low = limpo.toLowerCase();

  const isComprovante = /comprovante|estabelecimento|nsu|c[oó]digo de autoriz|tipo de transfer/i.test(limpo);
  const valores = extrairValoresMonetarios(limpo);

  if (isComprovante && valores.length) {
    let escolhido = valores[0];
    const idxValor = low.search(/valor/);
    if (idxValor >= 0) {
      const perto = valores
        .map((v) => ({ ...v, dist: Math.abs(v.index - idxValor) }))
        .sort((a, b) => a.dist - b.dist);
      if (perto.length) escolhido = perto[0];
    } else {
      escolhido = [...valores].sort((a, b) => b.valor - a.valor)[0];
    }

    const descricao = extrairDescricao(limpo, low);
    const categoria = categorizar(low, descricao);
    let tipo = "gasto";
    let parcelas = 1;
    let banco = null;

    if (/cart[aã]o|cr[eé]dito|nubank|\bnu\b|parcel|sheincom/i.test(low)) {
      tipo = "compraCartao";
      banco = "NU";
      if (/\bbb\b|banco do brasil/i.test(low)) banco = "BB";
      const px = low.match(/(\d+)\s*x/);
      if (px) parcelas = Math.max(1, parseInt(px[1], 10));
    }

    return [{
      tipo,
      descricao,
      valor: escolhido.valor,
      categoria,
      tipoGasto: "Variavel",
      recorrente: false,
      dia: null,
      parcelas,
      banco,
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
    let banco = null;

    let descricao = linha
      .replace(/r\$\s*[\d.,]+/gi, "")
      .replace(/\d{1,3}(?:\.\d{3})*,\d{2}/g, "")
      .replace(/\d+,\d{2}/g, "")
      .replace(/\\u[0-9a-fA-F]{4}/g, "")
      .replace(/\s+/g, " ")
      .trim() || "Lancamento";
    descricao = descricao.slice(0, 40);

    if (/recebi|caiu|salario|salário|freelance|renda/i.test(lowL)) {
      tipo = "entrada";
      if (/salario|salário|todo\s*mes|todo\s*mês/i.test(lowL)) recorrente = true;
      out.push({
        tipo, descricao, valor,
        categoria: /salario|salário/i.test(lowL) ? "Salário" : /freelance|freela/i.test(lowL) ? "Freelance" : "Renda extra",
        tipoGasto, recorrente, dia, parcelas, banco,
      });
      continue;
    }
    if (/\d+\s*x|parcel|cartao|cartão|nubank|\bnu\b/i.test(lowL)) {
      tipo = "compraCartao";
      const px = lowL.match(/(\d+)\s*x/);
      if (px) parcelas = Math.max(1, parseInt(px[1], 10));
      if (/nubank|\bnu\b/i.test(lowL)) banco = "NU";
    }
    out.push({
      tipo, descricao, valor,
      categoria: categorizar(lowL, descricao),
      tipoGasto, recorrente, dia, parcelas, banco,
    });
  }

  if (!out.length && valores.length) {
    const v = [...valores].sort((a, b) => b.valor - a.valor)[0];
    out.push({
      tipo: /cart[aã]o|cr[eé]dito/i.test(low) ? "compraCartao" : "gasto",
      descricao: extrairDescricao(limpo, low),
      valor: v.valor,
      categoria: categorizar(low, ""),
      tipoGasto: "Variavel",
      recorrente: false,
      dia: null,
      parcelas: 1,
      banco: /nubank|\bnu\b|cart[aã]o/i.test(low) ? "NU" : null,
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
