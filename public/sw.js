/* Share Target — grava comprovante e redireciona */
const CACHE = "mc-share-v4";
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

        for (const item of formData.getAll("images")) {
          if (item instanceof Blob && item.size > 0) {
            file = item;
            break;
          }
        }
        if (!file) {
          for (const val of formData.values()) {
            if (val instanceof Blob && val.size > 0) {
              file = val;
              break;
            }
          }
        }

        const cache = await caches.open(CACHE);
        if (file) {
          const buf = await file.arrayBuffer();
          const name = (file instanceof File && file.name) || "comprovante.jpg";
          const type = file.type || "image/jpeg";
          await cache.put(
            KEY,
            new Response(buf, {
              headers: {
                "content-type": type,
                "x-file-name": encodeURIComponent(name),
                "x-file-size": String(buf.byteLength),
              },
            })
          );
          saved = true;
        } else {
          await cache.put(
            KEY,
            new Response("NO_FILE", {
              headers: {
                "content-type": "text/plain",
                "x-keys": Array.from(formData.keys()).join(","),
              },
            })
          );
        }

        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
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
