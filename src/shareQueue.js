/** Lê imagem compartilhada (Share Target / Android) */

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

async function lerDoIdb() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const getReq = store.get("latest");
      getReq.onsuccess = () => {
        const val = getReq.result;
        if (val) store.delete("latest");
        resolve(val || null);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch {
    return null;
  }
}

async function lerDoCache() {
  try {
    const cache = await caches.open(CACHE);
    const res = await cache.match("/__shared_image__");
    if (!res) return null;
    await cache.delete("/__shared_image__");
    const buf = await res.arrayBuffer();
    if (!buf || !buf.byteLength) return null;
    const type = res.headers.get("content-type") || "image/jpeg";
    const name = res.headers.get("x-file-name") || "comprovante.jpg";
    return new File([buf], name, { type });
  } catch {
    return null;
  }
}

function entryParaFile(entry) {
  if (!entry || !entry.buffer) return null;
  return new File([entry.buffer], entry.name || "comprovante.jpg", {
    type: entry.type || "image/jpeg",
  });
}

/** Tenta várias vezes — o SW pode gravar um instante depois da abertura */
export async function consumirCompartilhamento() {
  const tentativas = 12;
  for (let i = 0; i < tentativas; i++) {
    const idb = await lerDoIdb();
    if (idb && idb.entries && idb.entries[0]) {
      const f = entryParaFile(idb.entries[0]);
      if (f && f.size > 0) return f;
    }
    // formato antigo (v1)
    if (idb && idb.files && idb.files[0]) {
      const f = idb.files[0];
      if (f instanceof Blob && f.size > 0) {
        return f instanceof File ? f : new File([f], "comprovante.jpg", { type: f.type || "image/jpeg" });
      }
    }
    const cached = await lerDoCache();
    if (cached && cached.size > 0) return cached;

    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  const reg = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((r) => r.update().catch(() => {}))
      .catch((e) => console.warn("SW", e));
  };
  if (document.readyState === "complete") reg();
  else window.addEventListener("load", reg);

  // Se o SW avisar que chegou share enquanto o app já está aberto
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SHARE_RECEIVED") {
      window.dispatchEvent(new CustomEvent("meu-caixa-share-received"));
    }
  });
}
