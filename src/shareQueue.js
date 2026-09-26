/** Lê imagem compartilhada (Share Target / Android) */

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

export async function consumirCompartilhamento() {
  try {
    const db = await openDb();
    const data = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const getReq = store.get("latest");
      getReq.onsuccess = () => {
        const val = getReq.result;
        store.delete("latest");
        resolve(val || null);
      };
      getReq.onerror = () => reject(getReq.error);
    });
    if (!data || !data.files || !data.files.length) return null;
    return data.files[0];
  } catch (e) {
    console.warn("consumirCompartilhamento", e);
    return null;
  }
}

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW", e));
  });
}
