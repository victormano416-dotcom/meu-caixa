/** Lê imagem vinda do Android Share Target */

const CACHE = "mc-share-v3";
const KEY = "/__mc_shared__";

function b64ToFile(b64, name, type) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name || "comprovante.jpg", {
    type: type || "image/jpeg",
  });
}

async function lerCacheUmaVez() {
  try {
    const cache = await caches.open(CACHE);
    const res = await cache.match(KEY);
    if (!res) return { file: null, error: null, empty: true };
    const data = await res.json();
    await cache.delete(KEY);
    if (data.error) return { file: null, error: data.error, empty: false, keys: data.keys };
    if (data.b64) {
      return {
        file: b64ToFile(data.b64, data.name, data.type),
        error: null,
        empty: false,
      };
    }
    return { file: null, error: "invalid", empty: false };
  } catch (e) {
    console.warn("lerCache", e);
    return { file: null, error: String(e), empty: true };
  }
}

/** Polling — a gravação do SW pode chegar um pouco depois */
export async function consumirCompartilhamento() {
  const max = 20;
  for (let i = 0; i < max; i++) {
    const r = await lerCacheUmaVez();
    if (r.file && r.file.size > 0) return r.file;
    if (r.error && r.error !== "no-file") {
      // erro definitivo
      window.__mcShareError = r.error;
      return null;
    }
    if (r.error === "no-file") {
      window.__mcShareError = "no-file";
      // continua tentando um pouco — às vezes o form atrasa
    }
    await new Promise((ok) => setTimeout(ok, 300));
  }
  return null;
}

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const reg = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((r) => {
        r.update().catch(() => {});
      })
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
