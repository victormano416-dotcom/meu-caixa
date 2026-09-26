/** Fallback local e helpers de OCR */

function limparOcr(texto) {
  return String(texto || "")
    .replace(/\u0000/g, "")
    .replace(/[|]/g, " ")
    .replace([^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extrairValor(str) {
  const patterns = [
    /r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i,
    /r\$\s*(\d+[.,]\d{2})/i,
    /(\d{1,3}(?:\.\d{3})*,\d{2})/,
    /(\d+[.,]\d{2})/,
    /(\d{2,6})(?!\d)/,
  ];
  for (const re of patterns) {
    const m = str.match(re);
    if (!m) continue;
    let raw = m[1];
    if (raw.includes(",") && raw.includes(".")) {
      raw = raw.replace(/\./g, "").replace(",", ".");
    } else if (raw.includes(",")) {
      raw = raw.replace(",", ".");
    }
    const v = parseFloat(raw);
    if (v > 0 && v < 1000000) return v;
  }
  return null;
}

export function parseLocal(texto) {
  const limpo = limparOcr(texto);
  let linhas = limpo.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 1);
  if (linhas.length <= 1) {
    linhas = limpo.split(/(?<=\d)\s+(?=[A-Za-zÀ-ú])|(?<=[a-zà-ú])\s+(?=\d)/i).map((l) => l.trim()).filter(Boolean);
  }
  if (linhas.length <= 1 && limpo.length > 20) {
    linhas = [limpo];
  }

  const out = [];
  const reValorGlobal = /r\$\s*\d[\d.,]*|\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2}/gi;

  for (const linha of linhas) {
    const valor = extrairValor(linha);
    if (!(valor > 0)) continue;

    const low = linha.toLowerCase();
    let tipo = "gasto";
    let tipoGasto = "Variável";
    let recorrente = false;
    let dia = null;
    let parcelas = 1;
    let banco = null;
    let categoria = "Outros";

    let descricao = linha
      .replace(/r\$\s*[\d.,]+/gi, "")
      .replace(/\d+[.,]\d{2}/g, "")
      .replace(/\b\d{1,3}(?:\.\d{3})*\b/g, "")
      .replace(/\s+/g, " ")
      .trim() || "Lancamento";
    descricao = descricao.slice(0, 40);

    if (/recebi|caiu|sal[aá]rio|freelance|renda|pix\s*recebido/i.test(low)) {
      tipo = "entrada";
      if (/sal[aá]rio|todo\s*m[eê]s/i.test(low)) recorrente = true;
      categoria = /sal[aá]rio/i.test(low) ? "Salário" : /freelance|freela/i.test(low) ? "Freelance" : "Renda extra";
    } else if (/\d+\s*x|parcel|cart[aã]o|nubank|\bnu\b|inter|\bc6\b|\bbb\b|ita[uú]|bradesco/i.test(low)) {
      tipo = "compraCartao";
      const px = low.match(/(\d+)\s*x/);
      if (px) parcelas = Math.max(1, parseInt(px[1], 10));
      if (/nubank|\bnu\b/i.test(low)) banco = "NU";
      else if (/\bbb\b|banco do brasil/i.test(low)) banco = "BB";
      else if (/inter/i.test(low)) banco = "Inter";
    } else if (/aluguel|internet|luz|água|agua|condom|netflix|spotify|todo\s*m[eê]s|todo\s*dia/i.test(low)) {
      tipoGasto = "Fixo";
      recorrente = true;
      const d = low.match(/dia\s*(\d{1,2})/);
      if (d) dia = parseInt(d[1], 10);
      categoria = "Casa";
    }

    if (tipo === "gasto" || tipo === "compraCartao") {
      if (/uber|99\b|transporte|gasolina|estacionamento|passagem/i.test(low)) categoria = "Transporte";
      else if (/mercado|ifood|rappi|lanche|bistek|aliment|fruteira|padaria|restaurante|supermercado|sacol[aã]o/i.test(low)) categoria = "Alimentação";
      else if (/farm[aá]cia|rem[eé]dio|sa[uú]de|drogaria/i.test(low)) categoria = "Saúde";
      else if (/cinema|netflix|spotify|lazer|academia|muay|jogo|steam/i.test(low)) categoria = "Lazer";
      else if (/shopee|shein|amazon|magazine|compra|ml\b|mercado\s*livre/i.test(low)) categoria = "Compras";
      else if (/casa|sakae|construção|construcao|material/i.test(low)) categoria = "Casa";
    }

    out.push({ tipo, descricao, valor, categoria, tipoGasto, recorrente, dia, parcelas, banco });
  }

  if (!out.length) {
    const matches = limpo.match(reValorGlobal) || [];
    for (const m of matches) {
      const valor = extrairValor(m);
      if (!(valor > 0)) continue;
      out.push({
        tipo: "gasto",
        descricao: "Lancamento OCR",
        valor,
        categoria: "Outros",
        tipoGasto: "Variável",
        recorrente: false,
        dia: null,
        parcelas: 1,
        banco: null,
      });
    }
  }

  return out;
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
