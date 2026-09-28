/* Share Target — grava comprovante (imagem/PDF) ou texto e redireciona */
const CACHE = "mc-share-v5";
const KEY = "/__mc_shared__";

self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST") return;
  if (url.pathname !== "/share-target" && !url.pathname.endsWith("/share-target")) return;

  event.respondWith(
    (async () => {
      let saved = false;
      try {
        const formData = await event.request.formData();
        let file = null;
        const textos = [];

        // 1) arquivos nomeados "images" (manifest share_target)
        for (const item of formData.getAll("images")) {
          if (item instanceof Blob && item.size > 0) {
            file = item;
            break;
          }
        }
        // 2) qualquer Blob no form
        if (!file) {
          for (const val of formData.values()) {
            if (val instanceof Blob && val.size > 0) {
              file = val;
              break;
            }
          }
        }
        // 3) textos (title, text, url e outros)
        for (const [k, v] of formData.entries()) {
          if (typeof v === "string" && v.trim()) {
            // evita guardar so URL vazia de tracking se ja tem texto melhor
            textos.push(v.trim());
          }
        }

        const textoJunto = [...new Set(textos)].join("\n").trim();
        const cache = await caches.open(CACHE);

        if (file) {
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
                // se o banco mandou texto junto, guarda pra fallback
                "x-share-text": encodeURIComponent(textoJunto.slice(0, 4000)),
              },
            })
          );
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
              k + ":" + (v instanceof Blob ? "arquivo(" + (v.type || "sem-tipo") + "," + v.size + "b)" : "texto")
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

        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: "SHARE_RECEIVED", saved });
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
