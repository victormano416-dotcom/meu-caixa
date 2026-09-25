/** Fallback local e helpers de OCR */
export function parseLocal(texto) {
  const linhas = texto.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const out = [];
  const reValor = /(?:r\$?\s*)?(\d+[.,]\d{2}|\d+)/i;
  for (const linha of linhas) {
    const m = linha.match(reValor);
    if (!m) continue;
    const valor = parseFloat(m[1].replace(",", "."));
    if (!(valor > 0)) continue;
    const low = linha.toLowerCase();
    let tipo = "gasto", tipoGasto = "Variável", recorrente = false, dia = null, parcelas = 1, banco = null, categoria = "Outros";
    let descricao = linha.replace(reValor, "").replace(/r\$?/gi, "").trim() || "Lançamento";
    descricao = descricao.slice(0, 40);
    if (/recebi|caiu|sal[aá]rio|freelance|renda/.test(low)) {
      tipo = "entrada";
      if (/sal[aá]rio|todo m[eê]s/.test(low)) recorrente = true;
      categoria = /sal[aá]rio/.test(low) ? "Salário" : /freelance|freela/.test(low) ? "Freelance" : "Renda extra";
    } else if (/\d+x|parcel|cart[aã]o|nubank|inter|c6|\bbb\b|ita[uú]|bradesco/.test(low)) {
      tipo = "compraCartao";
      const px = low.match(/(\d+)\s*x/);
      if (px) parcelas = parseInt(px[1]);
      if (/nubank|\bnu\b/.test(low)) banco = "NU";
      else if (/\bbb\b|banco do brasil/.test(low)) banco = "BB";
      else if (/inter/.test(low)) banco = "Inter";
    } else if (/aluguel|internet|luz|água|agua|condom[ií]nio|todo m[eê]s|todo dia/.test(low)) {
      tipoGasto = "Fixo";
      recorrente = true;
      const d = low.match(/dia\s*(\d{1,2})/);
      if (d) dia = parseInt(d[1]);
      categoria = "Casa";
    }
    if (tipo === "gasto" || tipo === "compraCartao") {
      if (/uber|99|transporte|gasolina/.test(low)) categoria = "Transporte";
      else if (/mercado|ifood|rappi|lanche|bistek|alimenta|fruteira|padaria/.test(low)) categoria = "Alimentação";
      else if (/farm[aá]cia|rem[eé]dio|sa[uú]de/.test(low)) categoria = "Saúde";
      else if (/cinema|netflix|spotify|lazer|academia|muay/.test(low)) categoria = "Lazer";
      else if (/shopee|shein|amazon|compra/.test(low)) categoria = "Compras";
      else if (/casa|mercado livre|sakae/.test(low)) categoria = "Casa";
    }
    out.push({ tipo, descricao, valor, categoria, tipoGasto, recorrente, dia, parcelas, banco });
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
  return (result?.data?.text || "").trim();
}
