import { useState, useEffect, useCallback } from "react";
import { parseLocal, ocrImagem, parseQuickAdd } from "./ocrHelpers";
import { consumirCompartilhamento } from "./shareQueue";

/* ---------------- constantes ---------------- */

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = ["Janeiro", "Fevereiro", "Mar\u00e7o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CATEGORIAS = ["Casa", "Alimenta\u00e7\u00e3o", "Transporte", "Estudos", "Lazer", "Compras", "Sa\u00fade", "Outros"];
const COR_CATEGORIA = {
  Casa: "bg-sky-400",
  "Alimenta\u00e7\u00e3o": "bg-amber-400",
  Transporte: "bg-orange-400",
  Estudos: "bg-violet-400",
  Lazer: "bg-pink-400",
  Compras: "bg-emerald-400",
  "Sa\u00fade": "bg-red-400",
  Outros: "bg-neutral-400",
};
const CAT_ENTRADA = ["Sal\u00e1rio", "Renda extra", "Freelance", "Investimentos", "Outros"];

const ABAS = [
  { chave: "inicio", nome: "Inicio" },
  { chave: "entradas", nome: "Entradas" },
  { chave: "gastos", nome: "Gastos" },
  { chave: "cartoes", nome: "Cartoes" },
  { chave: "monitoramento", nome: "Monitoramento" },
];

/* ---------------- helpers de mes ---------------- */

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const brl = (v) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function hoje() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() };
}
function somaMes({ ano, mes }, n) {
  const total = ano * 12 + mes + n;
  return { ano: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}
function indice({ ano, mes }) { return ano * 12 + mes; }
function rotulo({ ano, mes }) { return `${MESES[mes]}/${String(ano).slice(2)}`; }
function rotuloLongo({ ano, mes }) { return `${MESES_LONGOS[mes]} de ${ano}`; }

function contaNesteMes(item, alvo) {
  return item.recorrente || (item.ano === alvo.ano && item.mes === alvo.mes);
}
function valorNoMes(item, alvo) {
  return contaNesteMes(item, alvo) ? Number(item.valor) || 0 : 0;
}

function periodoCompra(compra) {
  const inicio = { ano: compra.ano, mes: compra.mes };
  const fim = somaMes(inicio, compra.parcelas - 1);
  return { inicio, fim, valorParcela: compra.valorTotal / compra.parcelas };
}
function parcelaNoMes(compra, alvo) {
  const { inicio } = periodoCompra(compra);
  const n = indice(alvo) - indice(inicio) + 1;
  return n >= 1 && n <= compra.parcelas ? n : null;
}
function compraQuitada(compra, alvo) {
  const atual = indice(alvo) - indice({ ano: compra.ano, mes: compra.mes }) + 1;
  const pagas = Math.min(compra.parcelas, Math.max(0, atual));
  return pagas >= compra.parcelas;
}
function gastoConcluido(gasto, alvo) {
  return !gasto.recorrente && indice({ ano: gasto.ano, mes: gasto.mes }) < indice(alvo);
}
function faturaDoMes(compras, alvo, cartaoId = null) {
  return compras.reduce((s, c) => {
    if (cartaoId && c.cartaoId !== cartaoId) return s;
    return parcelaNoMes(c, alvo) ? s + c.valorTotal / c.parcelas : s;
  }, 0);
}

function totaisPorCategoria(gastos, compras, alvo) {
  const mapa = {};
  CATEGORIAS.forEach((c) => (mapa[c] = 0));
  gastos.forEach((g) => { mapa[g.categoria] = (mapa[g.categoria] || 0) + valorNoMes(g, alvo); });
  compras.forEach((c) => {
    const n = parcelaNoMes(c, alvo);
    if (n) mapa[c.categoria] = (mapa[c.categoria] || 0) + c.valorTotal / c.parcelas;
  });
  return mapa;
}

function useSalvo(chave, inicial) {
  const [dado, setDado] = useState(() => {
    try {
      const raw = localStorage.getItem(chave);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return inicial;
  });
  const [pronto] = useState(true);
  const salvar = useCallback((novo) => {
    setDado(novo);
    try { localStorage.setItem(chave, JSON.stringify(novo)); } catch (e) {}
  }, [chave]);
  return [dado, salvar, pronto];
}

const input = "w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-400";
const btn = "bg-amber-400 text-neutral-950 font-medium text-sm px-4 py-2 rounded-lg hover:bg-amber-300 transition-colors disabled:opacity-40";
const btnSec = "text-neutral-400 hover:text-neutral-100 text-sm px-4 py-2 rounded-lg border border-neutral-800 transition-colors";
const chip = (ativo) => `text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${ativo ? "bg-amber-400 text-neutral-950 border-amber-400" : "border-neutral-800 text-neutral-400 hover:text-neutral-200"}`;

function Campo({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({ titulo, onFechar, children }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFechar]);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 pt-16 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <h3 className="text-sm font-medium text-neutral-100">{titulo}</h3>
          <button onClick={onFechar} className="text-neutral-500 hover:text-neutral-200 text-lg">\u00d7</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Vazio({ texto }) {
  return <div className="text-center py-10 text-sm text-neutral-500">{texto}</div>;
}

function Ponto({ cor }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${cor} shrink-0`} />;
}

function CampoQuando({ f, set, rotuloRecorrente = "Recorrente (todo mes)" }) {
  return (
    <>
      <Campo label="Repeticao">
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" checked={f.recorrente} onChange={(e) => set("recorrente", e.target.checked)} />
          {rotuloRecorrente}
        </label>
      </Campo>
      {f.recorrente ? (
        <Campo label="Dia do mes (vencimento)">
          <input type="number" min="1" max="31" className={input} value={f.dia} onChange={(e) => set("dia", e.target.value)} />
        </Campo>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Mes">
            <select className={input} value={f.mes} onChange={(e) => set("mes", Number(e.target.value))}>
              {MESES_LONGOS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </Campo>
          <Campo label="Ano">
            <input className={input} type="number" value={f.ano} onChange={(e) => set("ano", Number(e.target.value))} />
          </Campo>
        </div>
      )}
    </>
  );
}
