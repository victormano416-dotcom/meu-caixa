/* Share Target — grava comprovante e redireciona */
const CACHE = "mc-share-v3";
const KEY = "/__mc_shared__";

function bufToB64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

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

        // campo oficial do manifest
        const listed = formData.getAll("images");
        for (const item of listed) {
          if (item instanceof Blob && item.size > 0) {
            file = item;
            break;
          }
        }
        // qualquer outro campo com arquivo
        if (!file) {
          for (const val of formData.values()) {
            if (val instanceof Blob && val.size > 0) {
              file = val;
              break;
            }
          }
        }

        if (file) {
          const buffer = await file.arrayBuffer();
          const payload = JSON.stringify({
            name: (file instanceof File && file.name) || "comprovante.jpg",
            type: file.type || "image/jpeg",
            b64: bufToB64(buffer),
            at: Date.now(),
          });
          const cache = await caches.open(CACHE);
          await cache.put(KEY, new Response(payload, {
            headers: { "content-type": "application/json" },
          }));
          saved = true;

          const clients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
          });
          for (const client of clients) {
            client.postMessage({ type: "SHARE_RECEIVED", saved: true });
          }
        } else {
          // grava flag de erro para o app mostrar mensagem
          const cache = await caches.open(CACHE);
          await cache.put(KEY, new Response(JSON.stringify({
            error: "no-file",
            keys: Array.from(formData.keys()),
            at: Date.now(),
          }), { headers: { "content-type": "application/json" } }));
        }
      } catch (err) {
        console.error("share-target error", err);
      }
      const dest = saved ? "/?share=1" : "/?share=1&shareError=1";
      return Response.redirect(new URL(dest, self.location.origin).href, 303);
    })()
  );
});
