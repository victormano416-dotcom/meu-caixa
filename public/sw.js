/* Service worker — intercepta compartilhar (Share Target) */
const DB_NAME = "meu-caixa-share";
const STORE = "pending";

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

async function savePending(files) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ files, at: Date.now() }, "latest");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.pathname.endsWith("/share-target")) {
    event.respondWith(
      (async () => {
        try {
          const form = await event.request.formData();
          const files = [];
          for (const [key, val] of form.entries()) {
            if (val instanceof File && val.size > 0) files.push(val);
          }
          // também tenta o campo images
          const imgs = form.getAll("images");
          for (const v of imgs) {
            if (v instanceof File && v.size > 0 && !files.includes(v)) files.push(v);
          }
          if (files.length) await savePending(files);
        } catch (err) {
          console.error("share-target", err);
        }
        return Response.redirect("/?share=1", 303);
      })()
    );
  }
});
