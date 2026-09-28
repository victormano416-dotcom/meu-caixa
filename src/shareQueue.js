/** Lê imagem/PDF/texto vindo do Android Share Target */

const CACHE = "mc-share-v5";
const KEY = "/__mc_shared__";

/**
 * @returns {Promise<null | { kind: 'file', file: File, textHint?: string } | { kind: 'text', text: string }>}
 */
async function lerCacheUmaVez() {
  try {
    const cache = await caches.open(CACHE);
    const res = await cache.match(KEY);
    if (!res) return null;

    const ctype = (res.headers.get("content-type") || "").toLowerCase();
    const kind = res.headers.get("x-share-kind") || "";

    // flag de erro / vazio
    if (kind === "empty" || (ctype.includes("text/plain") && !kind)) {
      const text = await res.text();
      await cache.delete(KEY);
      if (text === "NO_FILE") {
        window.__mcShareError = "no-file";
        try {
          window.__mcShareKeys = decodeURIComponent(res.headers.get("x-keys") || "");
        } catch {
          window.__mcShareKeys = "";
        }
      }
      return null;
    }

    // texto puro (banco compartilhou so o texto do comprovante)
    if (kind === "text" || (ctype.includes("text/plain") && kind === "text")) {
      const text = await res.text();
      await cache.delete(KEY);
      if (!text || text.trim().length < 3) return null;
      return { kind: "text", text: text.trim() };
    }

    // arquivo (imagem ou PDF)
    const buf = await res.arrayBuffer();
    let textHint = "";
    try {
      textHint = decodeURIComponent(res.headers.get("x-share-text") || "");
    } catch {}
    await cache.delete(KEY);

    if (!buf || buf.byteLength < 50) {
      if (textHint && textHint.length > 3) return { kind: "text", text: textHint };
      return null;
    }

    const type = ctype || "image/jpeg";
    let name = "comprovante.jpg";
    try {
      name = decodeURIComponent(res.headers.get("x-file-name") || name);
    } catch {}

    return {
      kind: "file",
      file: new File([buf], name, { type }),
      textHint: textHint || undefined,
    };
  } catch (e) {
    console.warn("lerCache", e);
    return null;
  }
}

export async function consumirCompartilhamento() {
  for (let i = 0; i < 25; i++) {
    const payload = await lerCacheUmaVez();
    if (payload) return payload;
    await new Promise((ok) => setTimeout(ok, 200));
  }
  if (window.location.search.includes("share=1") && !window.__mcDiagMostrado) {
    window.__mcDiagMostrado = true;
    if (window.__mcShareError === "no-file") {
      alert(
        "Diagnostico: o celular entregou o compartilhamento SEM imagem e SEM texto util. Recebido: " +
          (window.__mcShareKeys || "nada")
      );
    }
  }
  return null;
}

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const reg = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((r) => r.update().catch(() => {}))
      .catch((e) => console.warn("SW register", e));
  };

  if (document.readyState === "complete") reg();
  else window.addEventListener("load", reg);
}
