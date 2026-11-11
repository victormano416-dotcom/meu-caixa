/** Lê imagem/PDF/texto vindo do Android Share Target */

const CACHES = ["mc-share-v6", "mc-share-v5"];
const KEY = "/__mc_shared__";

/**
 * @returns {Promise<null | { kind: 'file', file: File, textHint?: string } | { kind: 'text', text: string }>}
 */
async function lerCacheUmaVez() {
  for (const CACHE of CACHES) {
    try {
      const cache = await caches.open(CACHE);
      const res = await cache.match(KEY);
      if (!res) continue;

      const ctype = (res.headers.get("content-type") || "").toLowerCase();
      const kind = res.headers.get("x-share-kind") || "";

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
      console.warn("lerCache", CACHE, e);
    }
  }
  return null;
}

export async function consumirCompartilhamento() {
  // 40 * 200ms = 8s
  for (let i = 0; i < 40; i++) {
    const payload = await lerCacheUmaVez();
    if (payload) {
      try {
        sessionStorage.setItem("mc_share_ok", "1");
      } catch {}
      return payload;
    }
    await new Promise((ok) => setTimeout(ok, 200));
  }
  if (window.location.search.includes("share=1") && !window.__mcDiagMostrado) {
    window.__mcDiagMostrado = true;
    if (window.__mcShareError === "no-file") {
      alert(
        "O banco enviou o compartilhamento sem imagem.\\n" +
          "Campos: " +
          (window.__mcShareKeys || "nada") +
          "\\n\\nNo Nubank: use Compartilhar → Imagem/Print, ou salve o comprovante e escolha Galeria no Meu Caixa."
      );
    }
  }
  return null;
}

function avisarApp() {
  try {
    window.dispatchEvent(new Event("meu-caixa-share-received"));
  } catch {}
}

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.type === "SHARE_RECEIVED") {
      avisarApp();
      // se o app ainda não montou, marca pendência
      try {
        sessionStorage.setItem("mc_share_pending", data.saved ? "1" : "0");
      } catch {}
    }
  });

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
        // pede controle imediato
        if (r.active && navigator.serviceWorker.controller == null) {
          try {
            r.active.postMessage({ type: "CLAIM_CLIENTS" });
          } catch {}
        }
      })
      .catch((e) => console.warn("SW register", e));
  };

  if (document.readyState === "complete") reg();
  else window.addEventListener("load", reg);

  if (window.location.search.includes("share=1")) {
    window.addEventListener("load", () => {
      setTimeout(avisarApp, 200);
      setTimeout(avisarApp, 800);
      setTimeout(avisarApp, 1600);
    });
  }
}
