/* Service worker — Share Target (Nubank -> Meu Caixa) */
const DB_NAME = "meu-caixa-share-v2";
const STORE = "pending";
const CACHE = "meu-caixa-share-v2";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePending(entries) {
  // IndexedDB
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ entries, at: Date.now() }, "latest");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error("idb save", e);
  }
  // Cache API backup (primeiro arquivo)
  try {
    if (entries[0]) {
      const e0 = entries[0];
      const cache = await caches.open(CACHE);
      await cache.put(
        "/__shared_image__",
        new Response(e0.buffer, {
          headers: {
            "content-type": e0.type || "image/jpeg",
            "x-file-name": e0.name || "comprovante.jpg",
          },
        })
      );
    }
  } catch (e) {
    console.error("cache save", e);
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST") return;
  if (url.pathname !== "/share-target" && !url.pathname.endsWith("/share-target")) return;

  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const entries = [];
        for (const val of form.values()) {
          if (val instanceof Blob && val.size > 0) {
            const buffer = await val.arrayBuffer();
            entries.push({
              name: (val instanceof File && val.name) || "comprovante.jpg",
              type: val.type || "image/jpeg",
              buffer,
            });
          }
        }
        if (entries.length) {
          await savePending(entries);
          const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
          for (const c of all) {
            c.postMessage({ type: "SHARE_RECEIVED", count: entries.length });
          }
        }
      } catch (err) {
        console.error("share-target", err);
      }
      return Response.redirect(new URL("/?share=1", self.location.origin).href, 303);
    })()
  );
});
