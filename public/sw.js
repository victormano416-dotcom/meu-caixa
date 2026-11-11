/* Share Target — recebe POST do Android, grava cache, redireciona */
const CACHE = "mc-share-v6";
const KEY = "/__mc_shared__";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data.type === "CLAIM_CLIENTS") event.waitUntil(self.clients.claim());
});

async function salvarArquivo(cache, file, textoJunto) {
  const buf = await file.arrayBuffer();
  const name = (file instanceof File && file.name) || "comprovante.jpg";
  const type = file.type || "application/octet-stream";
  await cache.put(
    KEY,
    new Response(buf, {
      headers: {
        "content-type": type,
        "x-file-name": encodeURIComponent(name),
        "x-file-size": String(buf.byteLength),
        "x-share-kind": "file",
        "x-share-text": encodeURIComponent((textoJunto || "").slice(0, 4000)),
      },
    })
  );
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST") return;
  if (url.pathname !== "/share-target" && !url.pathname.endsWith("/share-target")) return;

  event.respondWith(
    (async () => {
      let saved = false;
      try {
        const formData = await event.request.formData();
        const cache = await caches.open(CACHE);
        let file = null;
        const textos = [];

        const fileKeys = ["images", "file", "files", "media", "image", "screenshot", "comprovante"];
        for (const key of fileKeys) {
          for (const item of formData.getAll(key)) {
            if (item instanceof Blob && item.size > 40) {
              file = item;
              break;
            }
          }
          if (file) break;
        }
        if (!file) {
          for (const val of formData.values()) {
            if (val instanceof Blob && val.size > 40) {
              file = val;
              break;
            }
          }
        }
        for (const [, v] of formData.entries()) {
          if (typeof v === "string" && v.trim()) textos.push(v.trim());
        }
        const textoJunto = [...new Set(textos)].join("\n").trim();

        if (file) {
          await salvarArquivo(cache, file, textoJunto);
          saved = true;
        } else if (textoJunto.length > 3) {
          await cache.put(
            KEY,
            new Response(textoJunto, {
              headers: {
                "content-type": "text/plain;charset=utf-8",
                "x-share-kind": "text",
                "x-file-size": String(textoJunto.length),
              },
            })
          );
          saved = true;
        } else {
          const detalhes = Array.from(formData.entries())
            .map(([k, v]) =>
              k +
              ":" +
              (v instanceof Blob
                ? "arquivo(" + (v.type || "sem-tipo") + "," + v.size + "b)"
                : "texto(" + String(v).slice(0, 40) + ")")
            )
            .join(" | ");
          await cache.put(
            KEY,
            new Response("NO_FILE", {
              headers: {
                "content-type": "text/plain",
                "x-keys": encodeURIComponent(detalhes || "nada"),
                "x-share-kind": "empty",
              },
            })
          );
        }

        const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of list) {
          try {
            client.postMessage({ type: "SHARE_RECEIVED", saved });
          } catch {}
        }
      } catch (err) {
        console.error("share-target error", err);
      }
      return Response.redirect(
        new URL(saved ? "/?share=1" : "/?share=1&shareError=1", self.location.origin).href,
        303
      );
    })()
  );
});
