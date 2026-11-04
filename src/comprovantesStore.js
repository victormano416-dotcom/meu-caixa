const DB_NAME = "meu-caixa";
const DB_VERSION = 1;
const STORE_NAME = "comprovantes";

function abrirBanco() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Este navegador não oferece armazenamento local para comprovantes."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Não foi possível abrir o armazenamento de comprovantes."));
    request.onblocked = () => reject(new Error("O armazenamento está ocupado por outra aba. Feche outras abas do Meu Caixa e tente novamente."));
  });
}

async function executar(transacao, operacao) {
  const db = await abrirBanco();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, transacao);
    const store = tx.objectStore(STORE_NAME);
    let resultado;
    try {
      resultado = operacao(store);
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
    tx.oncomplete = () => {
      db.close();
      resolve(resultado?.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("Falha ao acessar comprovantes."));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Operação de comprovantes cancelada."));
    };
  });
}

export async function adicionarComprovante(blob, nome = "comprovante") {
  if (!(blob instanceof Blob)) throw new TypeError("O arquivo do comprovante é inválido.");
  const item = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    nome: String(nome || "comprovante").slice(0, 180),
    tipo: blob.type || "application/octet-stream",
    blob,
    status: "pendente",
    textoIA: null,
    erroIA: null,
    criadoEm: new Date().toISOString(),
  };
  await executar("readwrite", (store) => store.add(item));
  return item;
}

export async function listarComprovantes() {
  const itens = await executar("readonly", (store) => store.getAll());
  return (itens || []).sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());
}

export async function atualizarComprovante(id, atualizacao) {
  const existente = await executar("readonly", (store) => store.get(id));
  if (!existente) return false;
  await executar("readwrite", (store) => store.put({ ...existente, ...atualizacao, id }));
  return true;
}

export async function removerComprovante(id) {
  await executar("readwrite", (store) => store.delete(id));
}

export async function removerLancados() {
  const itens = await listarComprovantes();
  const lancados = itens.filter((item) => item.status === "lancado");
  if (!lancados.length) return 0;
  await executar("readwrite", (store) => {
    lancados.forEach((item) => store.delete(item.id));
  });
  return lancados.length;
}
