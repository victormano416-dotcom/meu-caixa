/** Share Target: captura ANTES do login e guarda até o App consumir de verdade. */

const CACHES = ["mc-share-v6", "mc-share-v5"];
const KEY = "/__mc_shared__";

let stickyPayload = null;
const waiters = new Set();

function setSticky(payload) {
  if (!payload) return;
  stickyPayload = payload;
  try {
    window.__MC_FROM_SHARE = true;
    window.__MC_SHARE_PAYLOAD = payload;
  } catch {}
  for (const cb of [...waiters]) {
    try {
      cb(payload);
    } catch (e) {
      console.warn("share waiter", e);
    }
  }
}

async function lerCacheUmaVez() {
  for (const CACHE of CACHES) {
    try {
      const cache = await caches.open(CACHE);
      const res = await cache.match(KEY);
      if (!res) continue;

      const ctype = (res.headers.get("content-type") || "").toLowerCase();
      const kind = res.headers.get("x-share-kind") || "";

      if (kind === "empty") {
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
        continue;
      }

      if (kind === "text" || (ctype.includes("text/plain") && kind === "text")) {
        const text = await res.text();
        await cache.delete(KEY);
        if (!text || text.trim().length < 3) continue;
        return { kind: "text", text: text.trim() };
      }

      const buf = await res.arrayBuffer();
      let textHint = "";
      try {
        textHint = decodeURIComponent(res.headers.get("x-share-text") || "");
      } catch {}
      await cache.delete(KEY);

      if (!buf || buf.byteLength < 50) {
        if (textHint && textHint.length > 3) return { kind: "text", text: textHint };
        continue;
      }

      const type = ctype && !ctype.includes("text/plain") ? ctype : "image/jpeg";
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
      console.warn("lerCache", CACHE, e);
    }
  }
  return null;
}

/** Devolve o payload sem descartar (pode ser lido várias vezes até confirmar). */
export async function consumirCompartilhamento() {
  if (stickyPayload) return stickyPayload;

  for (let i = 0; i < 50; i++) {
    const payload = await lerCacheUmaVez();
    if (payload) {
      setSticky(payload);
      return payload;
    }
    await new Promise((ok) => setTimeout(ok, 120));
  }
  return null;
}

export function confirmarCompartilhamentoConsumido() {
  stickyPayload = null;
  try {
    window.__MC_SHARE_PAYLOAD = null;
  } catch {}
}

export function onCompartilhamento(callback) {
  waiters.add(callback);
  if (stickyPayload) {
    try {
      callback(stickyPayload);
    } catch {}
  }
  return () => waiters.delete(callback);
}

function avisarApp() {
  try {
    window.dispatchEvent(new Event("meu-caixa-share-received"));
  } catch {}
  lerCacheUmaVez().then((payload) => {
    if (payload) setSticky(payload);
  });
}

export function iniciarCapturaCompartilhamento() {
  const qs = new URLSearchParams(window.location.search);
  const fromShare = qs.get("share") === "1" || qs.get("shareError") === "1";
  if (fromShare) {
    try {
      window.__MC_FROM_SHARE = true;
    } catch {}
  }

  const tick = async () => {
    if (stickyPayload) return;
    const payload = await lerCacheUmaVez();
    if (payload) setSticky(payload);
  };

  if (fromShare) {
    tick();
    const id = setInterval(tick, 200);
    setTimeout(() => clearInterval(id), 20000);
  }

  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SHARE_RECEIVED") {
        avisarApp();
        tick();
      }
    });
  }
}

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const reg = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (r) => {
        try {
          await r.update();
        } catch {}
        if (r.waiting) {
          try {
            r.waiting.postMessage({ type: "SKIP_WAITING" });
          } catch {}
        }
      })
      .catch((e) => console.warn("SW register", e));
  };

  if (document.readyState === "complete") reg();
  else window.addEventListener("load", reg);
}
