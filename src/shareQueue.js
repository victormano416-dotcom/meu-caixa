/** Lê imagem vinda do Android Share Target */

const CACHE = "mc-share-v4";
const KEY = "/__mc_shared__";

async function lerCacheUmaVez() {
  try {
    const cache = await caches.open(CACHE);
    const res = await cache.match(KEY);
    if (!res) return null;

    const ctype = res.headers.get("content-type") || "";
    // flag de erro
    if (ctype.includes("text/plain")) {
      const text = await res.text();
      await cache.delete(KEY);
      if (text === "NO_FILE") {
        window.__mcShareError = "no-file";
        window.__mcShareKeys = res.headers.get("x-keys") || "";
      }
      return null;
    }

    const buf = await res.arrayBuffer();
    const sizeHdr = res.headers.get("x-file-size");
    await cache.delete(KEY);

    if (!buf || buf.byteLength < 100) return null;

    const type = ctype || "image/jpeg";
    let name = "comprovante.jpg";
    try {
      name = decodeURIComponent(res.headers.get("x-file-name") || name);
    } catch {}

    return new File([buf], name, { type });
  } catch (e) {
    console.warn("lerCache", e);
    return null;
  }
}

export async function consumirCompartilhamento() {
  for (let i = 0; i < 25; i++) {
    const file = await lerCacheUmaVez();
    if (file && file.size > 100) return file;
    await new Promise((ok) => setTimeout(ok, 200));
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

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SHARE_RECEIVED") {
      window.dispatchEvent(new CustomEvent("meu-caixa-share-received"));
    }
  });
}
