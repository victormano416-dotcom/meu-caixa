import { useState, useEffect, useCallback, useRef } from "react";
import { parseLocal, ocrImagem, parseQuickAdd } from "./ocrHelpers";
import { consumirCompartilhamento } from "./shareQueue";
import {
  adicionarComprovante,
  listarComprovantes,
  atualizarComprovante,
  removerComprovante,
  removerLancados,
} from "./comprovantesStore";
import bgVideo from "./bg.mp4";

const bankaiAvatar = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2230%22%20fill%3D%22%23111%22/%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2228%22%20fill%3D%22none%22%20stroke%3D%22%23eee%22%20stroke-width%3D%222%22/%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2228%22%20r%3D%2212%22%20fill%3D%22%23f5f5f5%22/%3E%3Ccircle%20cx%3D%2227%22%20cy%3D%2226%22%20r%3D%222.5%22%20fill%3D%22%23111%22/%3E%3Ccircle%20cx%3D%2237%22%20cy%3D%2226%22%20r%3D%222.5%22%20fill%3D%22%23111%22/%3E%3C/svg%3E";

/* ---------------- constantes ---------------- */

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CATEGORIAS = ["Casa", "Alimentação", "Transporte", "Estudos", "Lazer", "Compras", "Saúde", "Outros"];
const COR_CATEGORIA = {
  Casa: "bg-neutral-100",
  "Alimentação": "bg-neutral-300",
  Transporte: "bg-neutral-500",
  Estudos: "bg-neutral-200",
  Lazer: "bg-neutral-600",
  Compras: "bg-neutral-400",
  "Saúde": "bg-red-400",
  Outros: "bg-neutral-700",
};
const CAT_ENTRADA = ["Salário", "Renda extra", "Freelance", "Investimentos", "Outros"];

const ABAS = [
  { chave: "inicio", nome: "Inicio", icone: "home" },
  { chave: "entradas", nome: "Entradas", icone: "in" },
  { chave: "gastos", nome: "Gastos", icone: "out" },
  { chave: "cartoes", nome: "Cartoes", icone: "card" },
  { chave: "monitoramento", nome: "Monitor", icone: "chart" },
  { chave: "comprovantes", nome: "Comprovantes", icone: "inbox" },
];

function IconEdit({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconeAba({ tipo, ativo }) {
  const stroke = ativo ? "#171717" : "#a3a3a3";
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (tipo === "home") return (
    <svg {...common}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 10v10h14V10" /></svg>
  );
  if (tipo === "in") return (
    <svg {...common}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
  );
  if (tipo === "out") return (
    <svg {...common}><path d="M12 21V9" /><path d="m7 14 5-5 5 5" /><path d="M5 3h14" /></svg>
  );
  if (tipo === "card") return (
    <svg {...common}><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>
  );
  if (tipo === "inbox") return (
    <svg {...common}><path d="M3 12h4l2 3h6l2-3h4" /><path d="M5.5 5h13L21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6L5.5 5z" /></svg>
  );
  return (
    <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  );
}

/* ---------------- helpers de mês ---------------- */

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

/* ---------------- armazenamento ---------------- */

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

/* ---------------- UI base ---------------- */

const input = "w-full bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5 text-sm text-neutral-100 outline-none focus:border-white/30 placeholder:text-neutral-600 backdrop-blur-sm";
const btn = "bg-white text-neutral-900 font-medium text-sm px-4 py-3 rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-40";
const btnSec = "text-neutral-400 hover:text-neutral-100 text-sm px-4 py-2 rounded-full border border-white/10 bg-white/5 transition-colors";
const chip = (ativo) => `text-xs px-3.5 py-2 rounded-full border transition-colors whitespace-nowrap backdrop-blur-sm ${ativo ? "bg-white text-neutral-900 border-white" : "border-white/15 text-neutral-400 bg-white/5 hover:text-neutral-200"}`;
const glass = "bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/40";

function Campo({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-neutral-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({ titulo, onFechar, children, hideHeader }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    document.body.classList.add("mc-modal-open");
    return () => {
      window.removeEventListener("keydown", k);
      document.body.classList.remove("mc-modal-open");
    };
  }, [onFechar]);
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-6 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={`${glass} w-full max-w-md relative mb-2`}>
        {!hideHeader && (
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
            <h3 className="text-sm font-medium text-neutral-100 mt-2">{titulo}</h3>
            <button onClick={onFechar} className="text-neutral-500 hover:text-neutral-200 text-lg mt-2 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">{"×"}</button>
          </div>
        )}
        {hideHeader && (
          <button onClick={onFechar} className="absolute top-3 right-3 z-10 text-neutral-500 hover:text-neutral-200 text-lg w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">{"×"}</button>
        )}
        <div className="p-5 pt-3 pb-6">{children}</div>
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

function CampoQuando({ f, set, rotuloRecorrente = "Recorrente (todo mês)" }) {
  return (
    <>
      <Campo label={"Repetição"}>
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" checked={f.recorrente} onChange={(e) => set("recorrente", e.target.checked)} />
          {rotuloRecorrente}
        </label>
      </Campo>
      {f.recorrente ? (
        <Campo label={"Dia do mês (vencimento)"}>
          <input type="number" min="1" max="31" className={input} value={f.dia} onChange={(e) => set("dia", e.target.value)} />
        </Campo>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Campo label={"Mês"}>
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

/* RESTORE_MARKER_PART1_OF_APP - will be replaced */
export default function App() {
  return <div className="p-8 text-white">Restaurando Meu Caixa…</div>;
}
