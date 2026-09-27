import { useState, useEffect, useCallback, useRef } from "react";
import { parseLocal, ocrImagem, parseQuickAdd } from "./ocrHelpers";
import { consumirCompartilhamento } from "./shareQueue";
import surfista from "./surfista.mp4";
import fabVideo from "./fab.mp4";
import bgVideo from "./bg.mp4";
import spideyVideo from "./spidey.mp4";

const bankaiAvatar = "data:image/png;base64,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";

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
];

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

/** Um item (gasto/entrada) conta neste mês? Recorrente conta sempre; avulso só no mês em que foi lançado. */
function contaNesteMes(item, alvo) {
  return item.recorrente || (item.ano === alvo.ano && item.mes === alvo.mes);
}
function valorNoMes(item, alvo) {
  return contaNesteMes(item, alvo) ? Number(item.valor) || 0 : 0;
}

/** Parcelas de uma compra: primeira no mês da compra, última em início + (parcelas - 1). */
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
/** Todas as parcelas dessa compra já passaram (inclui compras à vista, 1x, no mês seguinte à compra). */
function compraQuitada(compra, alvo) {
  const atual = indice(alvo) - indice({ ano: compra.ano, mes: compra.mes }) + 1;
  const pagas = Math.min(compra.parcelas, Math.max(0, atual));
  return pagas >= compra.parcelas;
}
/** Gasto avulso (não recorrente) referente a um mês que já passou — considerado resolvido/pago. */
function gastoConcluido(gasto, alvo) {
  return !gasto.recorrente && indice({ ano: gasto.ano, mes: gasto.mes }) < indice(alvo);
}
function faturaDoMes(compras, alvo, cartaoId = null) {
  return compras.reduce((s, c) => {
    if (cartaoId && c.cartaoId !== cartaoId) return s;
    return parcelaNoMes(c, alvo) ? s + c.valorTotal / c.parcelas : s;
  }, 0);
}

/** Total por categoria no mês: gastos (fixos+variáveis) + parcelas de cartão que caem nesse mês. */
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

/** Campo de mês/ano ou recorrência, reutilizado em Gastos e Entradas. */
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

/* ---------------- tela: Início ---------------- */

function Inicio({ entradas, gastos, setGastos, cartoes, compras, setCompras, irPara, notificar }) {
  const mesAtual = hoje();

  const totalEntradas = entradas.reduce((s, e) => s + valorNoMes(e, mesAtual), 0);
  const totalFixos = gastos.filter((g) => g.tipo === "Fixo").reduce((s, g) => s + valorNoMes(g, mesAtual), 0);
  const totalVariaveis = gastos.filter((g) => g.tipo === "Variável").reduce((s, g) => s + valorNoMes(g, mesAtual), 0);
  const faturaAtual = faturaDoMes(compras, mesAtual);
  const totalGastos = totalFixos + totalVariaveis + faturaAtual;
  const sobra = totalEntradas - totalGastos;

  const gastosConcluidos = gastos.filter((g) => gastoConcluido(g, mesAtual)).length;
  const comprasConcluidas = compras.filter((c) => compraQuitada(c, mesAtual)).length;
  const totalConcluidos = gastosConcluidos + comprasConcluidas;

  const limparConcluidos = () => {
    if (!confirm(`Remover ${totalConcluidos} lançamento(s) já encerrado(s) (parcelas quitadas e gastos de meses passados)? Isso não pode ser desfeito.`)) return;
    setGastos(gastos.filter((g) => !gastoConcluido(g, mesAtual)));
    setCompras(compras.filter((c) => !compraQuitada(c, mesAtual)));
    notificar(`${totalConcluidos} lançamento(s) removido(s).`);
  };

  const proximos = Array.from({ length: 6 }, (_, i) => {
    const m = somaMes(mesAtual, i);
    return { mes: m, total: faturaDoMes(compras, m) };
  });
  const maior = Math.max(1, ...proximos.map((p) => p.total));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white/80">Resumo</h2>
        <p className="text-sm text-neutral-500">{rotuloLongo(mesAtual)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">ENTRADAS</div>
          <div className="text-lg font-semibold text-white">{brl(totalEntradas)}</div>
        </div>
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">GASTOS FIXOS</div>
          <div className="text-lg font-semibold text-neutral-100">{brl(totalFixos)}</div>
        </div>
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">GASTOS VARIÁVEIS</div>
          <div className="text-lg font-semibold text-neutral-100">{brl(totalVariaveis)}</div>
        </div>
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">FATURA DO CARTÃO</div>
          <div className="text-lg font-semibold text-white">{brl(faturaAtual)}</div>
        </div>
      </div>

      <video src={surfista} autoPlay loop muted playsInline aria-hidden="true"
        className="h-20 w-auto max-w-[140px] object-contain mx-auto -mb-1 rounded-lg" />
      <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl px-4 py-3.5 flex items-center justify-between">
        <span className="text-sm text-neutral-300">Sobra do mês</span>
        <span className={`text-xl font-semibold ${sobra < 0 ? "text-red-400" : "text-white"}`}>{brl(sobra)}</span>
      </div>

      <button onClick={() => irPara("monitoramento")}
        className="w-full text-left bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl p-4 hover:border-neutral-700 transition-colors">
        <div className="text-sm text-neutral-300 mb-1">{"Ver onde está indo o dinheiro →"}</div>
        <div className="text-xs text-neutral-500">Gasto por categoria neste mês</div>
      </button>

      <div className="bg-neutral-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-4">
        <div className="text-sm text-neutral-300 mb-3">Fatura nos próximos meses</div>
        {(() => {
          const vals = proximos.map((p) => p.total);
          const maxV = Math.max(1, ...vals);
          const w = 100;
          const h = 56;
          const padY = 4;
          const pts = vals.map((v, i) => {
            const x = vals.length === 1 ? w / 2 : (i / (vals.length - 1)) * w;
            const y = h - padY - ((v / maxV) * (h - padY * 2));
            return [x, y];
          });
          const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
          const area = `${line} L ${w} ${h} L 0 ${h} Z`;
          return (
            <div>
              <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                  </linearGradient>
                </defs>
                <path d={area} fill="url(#fatGrad)" />
                <path d={line} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
              </svg>
              <div className="flex justify-between mt-1">
                {proximos.map((p) => (
                  <div key={rotulo(p.mes)} className="flex-1 text-center">
                    <div className="text-[10px] text-neutral-400">{p.total > 0 ? brl(p.total).replace("R$", "").trim() : "—"}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{rotulo(p.mes)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {cartoes.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-neutral-300">Fatura por cartão</div>
          <div className="space-y-3">
            {cartoes.map((card) => {
              const fat = faturaDoMes(compras, mesAtual, card.id);
              return (
                <div
                  key={card.id}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl px-4 py-4 min-h-[88px]"
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />
                  <div className="relative flex flex-col justify-between h-full gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                          {(card.nome || "?").trim().charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-neutral-100 truncate">{card.nome}</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 tracking-widest">••••</span>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase tracking-wide block">Fatura atual</span>
                        {card.vencimento ? (
                          <span className="text-[10px] text-neutral-500">Vence dia {card.vencimento}</span>
                        ) : null}
                      </div>
                      <span className="text-base font-semibold text-white">{brl(fat)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalConcluidos > 0 && (
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-neutral-300">{totalConcluidos} lançamento(s) já encerrado(s)</div>
            <div className="text-xs text-neutral-500">Parcelas quitadas e gastos de meses passados</div>
          </div>
          <button className={btnSec} onClick={limparConcluidos}>Fatura paga · limpar</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- tela: Monitoramento ---------------- */

function Monitoramento({ gastos, compras }) {
  const mesAtual = hoje();
  const mapa = totaisPorCategoria(gastos, compras, mesAtual);
  const linhas = CATEGORIAS.map((c) => ({ categoria: c, valor: mapa[c] || 0 })).filter((l) => l.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const total = linhas.reduce((s, l) => s + l.valor, 0);
  const maior = Math.max(1, ...linhas.map((l) => l.valor));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white/80">Monitoramento</h2>
        <p className="text-sm text-neutral-500">Onde seu dinheiro está indo · {rotuloLongo(mesAtual)}</p>
      </div>

      <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl px-4 py-3.5 flex items-center justify-between">
        <span className="text-sm text-neutral-300">Total gasto no mês</span>
        <span className="text-xl font-semibold text-neutral-100">{brl(total)}</span>
      </div>

      {!linhas.length ? (
        <Vazio texto="Nenhum gasto registrado ainda este mês." />
      ) : (
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl p-4 space-y-4">
          {linhas.map((l) => (
            <div key={l.categoria}>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="flex items-center gap-2 text-neutral-200">
                  <Ponto cor={COR_CATEGORIA[l.categoria]} />
                  {l.categoria}
                </span>
                <span className="text-neutral-400">{brl(l.valor)} · {((l.valor / total) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${COR_CATEGORIA[l.categoria]}`} style={{ width: `${(l.valor / maior) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-neutral-600">{"Inclui gastos fixos, variáveis e parcelas de cartão que caem neste mês. Só muda quando você lança algo — nada para ajustar aqui."}</p>
    </div>
  );
}

/* ---------------- tela: Cartões ---------------- */

function Cartoes({ cartoes, setCartoes, compras, setCompras }) {
  const [modalCartao, setModalCartao] = useState(null);
  const [modalCompra, setModalCompra] = useState(null);
  const [aberto, setAberto] = useState(null);
  const mesAtual = hoje();

  const excluirCartao = (id) => {
    if (!confirm("Excluir este cartão e todas as suas compras?")) return;
    setCartoes(cartoes.filter((c) => c.id !== id));
    setCompras(compras.filter((c) => c.cartaoId !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white/80">{"Cartões"}</h2>
          <p className="text-sm text-neutral-500">Compras parceladas e fatura mensal</p>
        </div>
        <div className="flex gap-2">
          <button className={btnSec} onClick={() => setModalCartao({})}>{"+ Cartão"}</button>
          <button className={btn} disabled={!cartoes.length} onClick={() => setModalCompra({})}>+ Compra</button>
        </div>
      </div>

      {!cartoes.length && <Vazio texto="Cadastre um cartão para começar." />}

      {cartoes.map((cartao) => {
        const doCartao = compras.filter((c) => c.cartaoId === cartao.id);
        const faturaMes = faturaDoMes(compras, mesAtual, cartao.id);
        const aindaDevo = doCartao.reduce((s, c) => {
          const paga = Math.max(0, indice(mesAtual) - indice({ ano: c.ano, mes: c.mes }) + 1);
          const restam = Math.max(0, c.parcelas - paga);
          return s + restam * (c.valorTotal / c.parcelas);
        }, 0);
        const expandido = aberto === cartao.id;

        return (
          <div key={cartao.id} className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-neutral-100">{cartao.nome}</div>
                  <div className="text-xs text-neutral-500">{doCartao.length} compra(s)</div>
                </div>
                <div className="flex gap-2 text-neutral-500">
                  <button onClick={() => setModalCartao(cartao)} className="hover:text-neutral-200">{"✏️"}</button>
                  <button onClick={() => excluirCartao(cartao.id)} className="hover:text-red-400">{"×"}</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-neutral-500">Fatura deste mês</div>
                  <div className="text-base font-semibold text-white">{brl(faturaMes)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Ainda a pagar</div>
                  <div className="text-base font-semibold text-neutral-200">{brl(aindaDevo)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Limite</div>
                  {cartao.limite > 0 ? (
                    <div className="text-base font-semibold text-neutral-200">{brl(cartao.limite)}</div>
                  ) : (
                    <button className="text-xs text-neutral-500 underline hover:text-neutral-300" onClick={() => setModalCartao(cartao)}>
                      Definir limite
                    </button>
                  )}
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Disponível</div>
                  <div className={`text-base font-semibold ${cartao.limite > 0 && cartao.limite - aindaDevo < 0 ? "text-red-400" : "text-neutral-200"}`}>
                    {cartao.limite > 0 ? brl(cartao.limite - aindaDevo) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Vencimento</div>
                  {cartao.vencimento ? (
                    <div className="text-base font-semibold text-neutral-200">Dia {cartao.vencimento}</div>
                  ) : (
                    <button className="text-xs text-neutral-500 underline hover:text-neutral-300" onClick={() => setModalCartao(cartao)}>
                      Definir dia
                    </button>
                  )}
                </div>
              </div>

              <button className="text-xs text-neutral-400 hover:text-neutral-200"
                onClick={() => setAberto(expandido ? null : cartao.id)}>
                {expandido ? "Ocultar compras" : "Ver compras"}
              </button>
            </div>

            {expandido && (
              <div className="border-t border-neutral-800 divide-y divide-neutral-800">
                {!doCartao.length && <div className="px-4 py-3 text-sm text-neutral-500">Nenhuma compra.</div>}
                {doCartao.map((c) => {
                  const { fim, valorParcela } = periodoCompra(c);
                  const atual = indice(mesAtual) - indice({ ano: c.ano, mes: c.mes }) + 1;
                  const pagas = Math.min(c.parcelas, Math.max(0, atual));
                  const quitada = compraQuitada(c, mesAtual);
                  return (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="min-w-0">
                          <div className="text-sm text-neutral-100 truncate">{c.descricao}</div>
                          <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                            <Ponto cor={COR_CATEGORIA[c.categoria]} />{c.categoria}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm text-neutral-100">{c.parcelas}x {brl(valorParcela)}</div>
                          <div className="text-xs text-neutral-500">total {brl(c.valorTotal)}</div>
                        </div>
                        <div className="flex gap-1.5 shrink-0 text-neutral-500">
                          <button onClick={() => setModalCompra(c)} className="hover:text-neutral-200">{"✏️"}</button>
                          <button onClick={() => setCompras(compras.filter((x) => x.id !== c.id))} className="hover:text-red-400">{"×"}</button>
                        </div>
                      </div>

                      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${quitada ? "bg-white" : "bg-neutral-600"}`}
                          style={{ width: `${Math.min(100, (pagas / c.parcelas) * 100)}%` }} />
                      </div>

                      <div className="text-xs text-neutral-500">
                        {quitada ? `Quitada em ${rotulo(fim)}` : `Parcela ${Math.max(1, atual)} de ${c.parcelas} · vai até ${rotulo(fim)}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {modalCartao && (
        <ModalCartao
          inicial={modalCartao}
          onFechar={() => setModalCartao(null)}
          onSalvar={(d) => {
            if (modalCartao.id) setCartoes(cartoes.map((c) => (c.id === modalCartao.id ? { ...c, ...d } : c)));
            else setCartoes([...cartoes, { ...d, id: uid() }]);
            setModalCartao(null);
          }}
        />
      )}

      {modalCompra && (
        <ModalCompra
          inicial={modalCompra}
          cartoes={cartoes}
          onFechar={() => setModalCompra(null)}
          onSalvar={(d) => {
            if (modalCompra.id) setCompras(compras.map((c) => (c.id === modalCompra.id ? { ...c, ...d } : c)));
            else setCompras([{ ...d, id: uid() }, ...compras]);
            setModalCompra(null);
          }}
        />
      )}
    </div>
  );
}

function ModalCartao({ inicial, onFechar, onSalvar }) {
  const [nome, setNome] = useState(inicial.nome || "");
  const [limite, setLimite] = useState(inicial.limite != null && inicial.limite !== "" ? String(inicial.limite) : "");
  const [vencimento, setVencimento] = useState(inicial.vencimento != null ? String(inicial.vencimento) : "");
  const valido = nome.trim();
  return (
    <Modal titulo={inicial.id ? "Editar cartão" : "Novo cartão"} onFechar={onFechar}>
      <Campo label="Nome do cartão">
        <input className={input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="" />
      </Campo>
      <Campo label="Limite do cartão">
        <input className={input} inputMode="decimal" value={limite}
          onChange={(e) => setLimite(e.target.value.replace(/[^0-9.,]/g, ""))} />
      </Campo>
      <Campo label="Dia do vencimento (1 a 31)">
        <input className={input} type="number" min={1} max={31} value={vencimento}
          onChange={(e) => setVencimento(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} />
      </Campo>
      <div className="flex justify-end gap-2 mt-4 pb-2">
        <button className={btnSec} onClick={onFechar}>Cancelar</button>
        <button className={btn} disabled={!valido}
          onClick={() => {
            const dia = Math.min(31, Math.max(1, parseInt(vencimento, 10) || 0));
            onSalvar({
              nome: nome.trim(),
              limite: parseFloat(String(limite).replace(",", ".")) || 0,
              vencimento: dia || null,
            });
          }}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}

function ModalCompra({ inicial, cartoes, onFechar, onSalvar }) {
  const agora = hoje();
  const [f, setF] = useState({
    cartaoId: inicial.cartaoId || cartoes[0]?.id || "",
    descricao: inicial.descricao || "",
    categoria: inicial.categoria || CATEGORIAS[0],
    valorTotal: inicial.valorTotal ?? "",
    parcelas: inicial.parcelas ?? "1",
    mes: inicial.mes ?? agora.mes,
    ano: inicial.ano ?? agora.ano,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const total = parseFloat(String(f.valorTotal).replace(",", ".")) || 0;
  const n = Math.max(1, parseInt(f.parcelas) || 1);
  const fim = somaMes({ ano: f.ano, mes: f.mes }, n - 1);
  const valido = f.descricao.trim() && total > 0 && f.cartaoId;

  return (
    <Modal titulo={inicial.id ? "Editar compra" : "Nova compra no cartão"} onFechar={onFechar}>
      <Campo label="Cartão">
        <select className={input} value={f.cartaoId} onChange={(e) => set("cartaoId", e.target.value)}>
          {cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Campo label="Descrição">
        <input className={input} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="" />
      </Campo>
      <Campo label="Categoria">
        <select className={input} value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Valor total">
          <input className={input} value={f.valorTotal} placeholder=""
            onChange={(e) => set("valorTotal", e.target.value.replace(/[^0-9.,]/g, ""))} />
        </Campo>
        <Campo label="Parcelas">
          <input className={input} type="number" min="1" value={f.parcelas} onChange={(e) => set("parcelas", e.target.value)} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Primeira parcela (mês)">
          <select className={input} value={f.mes} onChange={(e) => set("mes", Number(e.target.value))}>
            {MESES_LONGOS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
        </Campo>
        <Campo label="Ano">
          <input className={input} type="number" value={f.ano} onChange={(e) => set("ano", Number(e.target.value))} />
        </Campo>
      </div>
      {total > 0 && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-xs text-neutral-400 space-y-1">
          <div>{n}x de <span className="text-white font-medium">{brl(total / n)}</span></div>
          <div>De {rotulo({ ano: f.ano, mes: f.mes })} até <span className="text-neutral-200">{rotulo(fim)}</span></div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button className={btnSec} onClick={onFechar}>Cancelar</button>
        <button className={btn} disabled={!valido} onClick={() => onSalvar({ ...f, valorTotal: total, parcelas: n })}>Salvar</button>
      </div>
    </Modal>
  );
}

/* ---------------- tela: Gastos (fixos + variáveis) ---------------- */

function Gastos({ gastos, setGastos }) {
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const mesAtual = hoje();

  const lista = gastos.filter((g) => filtro === "todos" || (filtro === "fixo" ? g.tipo === "Fixo" : g.tipo === "Variável"));
  const totalMes = gastos.reduce((s, g) => s + valorNoMes(g, mesAtual), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white/80">Gastos</h2>
          <p className="text-sm text-neutral-500">Fora do cartão · {brl(totalMes)} este mês</p>
        </div>
        <button className={btn} onClick={() => setModal({})}>+ Gasto</button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        <button className={chip(filtro === "todos")} onClick={() => setFiltro("todos")}>Todos</button>
        <button className={chip(filtro === "fixo")} onClick={() => setFiltro("fixo")}>Fixos</button>
        <button className={chip(filtro === "variavel")} onClick={() => setFiltro("variavel")}>{"Variáveis"}</button>
      </div>

      {!lista.length ? <Vazio texto="Nada aqui ainda." /> : (
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl divide-y divide-neutral-800">
          {lista.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-100 truncate">{g.descricao}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                  <Ponto cor={COR_CATEGORIA[g.categoria]} />
                  {g.categoria} · {g.tipo}
                  {g.recorrente ? ` · todo dia ${g.dia}` : ` · ${rotulo({ ano: g.ano, mes: g.mes })}`}
                </div>
              </div>
              <div className="text-sm text-neutral-100">{brl(g.valor)}</div>
              <button onClick={() => setModal(g)} className="text-neutral-500 hover:text-neutral-200">{"✏️"}</button>
              <button onClick={() => setGastos(gastos.filter((x) => x.id !== g.id))} className="text-neutral-600 hover:text-red-400">{"×"}</button>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <ModalGasto
          inicial={modal}
          onFechar={() => setModal(null)}
          onSalvar={(d) => {
            if (modal.id) setGastos(gastos.map((g) => (g.id === modal.id ? { ...g, ...d } : g)));
            else setGastos([{ ...d, id: uid() }, ...gastos]);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ModalGasto({ inicial, onFechar, onSalvar }) {
  const agora = hoje();
  const [f, setF] = useState({
    descricao: inicial.descricao || "",
    valor: inicial.valor ?? "",
    categoria: inicial.categoria || CATEGORIAS[0],
    tipo: inicial.tipo || "Fixo",
    recorrente: inicial.recorrente ?? (inicial.tipo ? inicial.recorrente : true),
    dia: inicial.dia || 10,
    mes: inicial.mes ?? agora.mes,
    ano: inicial.ano ?? agora.ano,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const total = parseFloat(String(f.valor).replace(",", ".")) || 0;
  const valido = f.descricao.trim() && total > 0;

  return (
    <Modal titulo={inicial.id ? "Editar gasto" : "Novo gasto"} onFechar={onFechar}>
      <Campo label="Descrição">
        <input className={input} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="" />
      </Campo>
      <Campo label="Valor">
        <input className={input} value={f.valor} placeholder="" onChange={(e) => set("valor", e.target.value.replace(/[^0-9.,]/g, ""))} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Categoria">
          <select className={input} value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo label="Tipo">
          <select className={input} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
            <option value="Fixo">Fixo</option>
            <option value={"Variável"}>{"Variável"}</option>
          </select>
        </Campo>
      </div>
      <CampoQuando f={f} set={set} />
      <div className="flex justify-end gap-2 mt-4">
        <button className={btnSec} onClick={onFechar}>Cancelar</button>
        <button className={btn} disabled={!valido} onClick={() => onSalvar({ ...f, valor: total })}>Salvar</button>
      </div>
    </Modal>
  );
}

/* ---------------- tela: Entradas ---------------- */

function Entradas({ entradas, setEntradas }) {
  const mesAtual = hoje();
  const [modal, setModal] = useState(null);
  const totalMes = entradas.reduce((s, e) => s + valorNoMes(e, mesAtual), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-white/80">Entradas</h2>
          <p className="text-sm text-neutral-500">{brl(totalMes)} este mês</p>
        </div>
        <button className={btn} onClick={() => setModal({})}>+ Entrada</button>
      </div>

      {!entradas.length ? <Vazio texto="Nenhuma entrada cadastrada." /> : (
        <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800/60 rounded-xl divide-y divide-neutral-800">
          {entradas.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-100 truncate">{e.descricao}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {e.categoria}{e.recorrente ? ` · todo dia ${e.dia}` : ` · ${rotulo({ ano: e.ano, mes: e.mes })}`}
                </div>
              </div>
              <div className="text-sm font-medium text-white">{brl(e.valor)}</div>
              <button onClick={() => setModal(e)} className="text-neutral-500 hover:text-neutral-200">{"✏️"}</button>
              <button onClick={() => setEntradas(entradas.filter((x) => x.id !== e.id))} className="text-neutral-600 hover:text-red-400">{"×"}</button>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <ModalEntrada
          inicial={modal}
          onFechar={() => setModal(null)}
          onSalvar={(d) => {
            if (modal.id) setEntradas(entradas.map((e) => (e.id === modal.id ? { ...e, ...d } : e)));
            else setEntradas([{ ...d, id: uid() }, ...entradas]);
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ModalEntrada({ inicial, onFechar, onSalvar }) {
  const agora = hoje();
  const [f, setF] = useState({
    descricao: inicial.descricao || "",
    valor: inicial.valor ?? "",
    categoria: inicial.categoria || CAT_ENTRADA[0],
    recorrente: inicial.recorrente ?? true,
    dia: inicial.dia || 5,
    mes: inicial.mes ?? agora.mes,
    ano: inicial.ano ?? agora.ano,
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const total = parseFloat(String(f.valor).replace(",", ".")) || 0;
  const valido = f.descricao.trim() && total > 0;

  return (
    <Modal titulo={inicial.id ? "Editar entrada" : "Nova entrada"} onFechar={onFechar}>
      <Campo label="Descrição">
        <input className={input} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="" />
      </Campo>
      <Campo label="Valor">
        <input className={input} value={f.valor} placeholder="" onChange={(e) => set("valor", e.target.value.replace(/[^0-9.,]/g, ""))} />
      </Campo>
      <Campo label="Categoria">
        <select className={input} value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {CAT_ENTRADA.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>
      <CampoQuando f={f} set={set} />
      <div className="flex justify-end gap-2 mt-4">
        <button className={btnSec} onClick={onFechar}>Cancelar</button>
        <button className={btn} disabled={!valido} onClick={() => onSalvar({ ...f, valor: total })}>Salvar</button>
      </div>
    </Modal>
  );
}

/* ---------------- lançamento rápido (IA) ---------------- */

// parseQuickAdd importado de ./ocrHelpers (sem fetch)

function ModalRapido({ entradas, setEntradas, gastos, setGastos, cartoes, compras, setCompras, onFechar, notificar, arquivoInicial }) {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [ocrProgresso, setOcrProgresso] = useState(null);
  const [preview, setPreview] = useState(null);
  const [erro, setErro] = useState("");
  const [rascunho, setRascunho] = useState(null); // revisao antes de salvar
  const agora = hoje();

  const processarImagem = async (fileOrBlob) => {
    if (!fileOrBlob) return;
    setErro("");
    setOcrProgresso(0);
    setRascunho(null);
    try {
      setPreview(URL.createObjectURL(fileOrBlob));
      const extraido = await ocrImagem(fileOrBlob, setOcrProgresso);
      if (!extraido) {
        setErro("Nao consegui ler texto na imagem. Tente um print mais nitido.");
        setOcrProgresso(null);
        return;
      }
      setTexto(extraido);
      setOcrProgresso(null);
      await montarRascunho(extraido);
    } catch (e) {
      setErro(e.message || "Falha no OCR");
      setOcrProgresso(null);
    }
  };

  useEffect(() => {
    if (arquivoInicial) processarImagem(arquivoInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arquivoInicial]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (file) processarImagem(file);
    e.target.value = "";
  };

  const sugerirCartao = (banco, finalDigitos) => {
    if (!cartoes.length) return "";
    const b = String(banco || "").toLowerCase();
    const fin = String(finalDigitos || "").trim();
    const score = (card) => {
      const n = String(card.nome || "").toLowerCase();
      let s = 0;
      if (fin && n.includes(fin)) s += 15;
      if (b && n.includes(b)) s += 5;
      if ((b === "bb" || b === "brasil") && (n.includes("brasil") || n.includes("facil") || n.includes("banco"))) s += 10;
      if ((b === "nu" || b === "nubank") && (n.includes("nubank") || n === "nu")) s += 10;
      if (b && b !== "nu" && b !== "nubank" && (n.includes("nubank") || n === "nu")) s -= 5;
      return s;
    };
    let best = null, bestS = 0;
    for (const card of cartoes) {
      const sc = score(card);
      if (sc > bestS) { bestS = sc; best = card; }
    }
    if (best && bestS > 0) return best.id;
    if (cartoes.length === 1) return cartoes[0].id;
    if (b === "bb" || b === "brasil") {
      const c = cartoes.find((x) => /brasil|facil|banco/i.test(x.nome));
      if (c) return c.id;
    }
    return "";
  };

  const montarRascunho = async (txt) => {
    const lista = await parseQuickAdd(txt.trim());
    if (!lista.length) {
      setErro("Nao identifiquei valor. Ajuste o texto ou preencha manualmente.");
      setRascunho({
        descricao: "",
        valor: "",
        forma: "credito",
        cartaoId: cartoes[0]?.id || "",
        parcelas: 1,
        ano: agora.ano,
        mes: agora.mes,
        categoria: "Outros",
        tipoGasto: "Variavel",
      });
      return;
    }
    const p = lista[0];
    const parcelas = Math.max(1, parseInt(p.parcelas, 10) || 1);
    const valorParcela = Number(p.valor) || 0;
    let forma = "credito";
    if (p.tipo === "entrada") forma = "entrada";
    else if (p.tipo === "gasto") forma = "debito";
    else if (p.tipo === "compraCartao") forma = "credito";

    // dicas no texto
    const low = txt.toLowerCase();
    if (/\bpix\b/.test(low)) forma = "pix";
    if (/d[eé]bito/.test(low)) forma = "debito";
    if (/cr[eé]dito|parcela|\d+\s*x|cart[aã]o/.test(low) && p.tipo !== "entrada") forma = "credito";

    setRascunho({
      descricao: p.descricao || "",
      valor: valorParcela ? String(valorParcela).replace(".", ",") : "",
      forma,
      cartaoId: sugerirCartao(p.banco, p.cartaoFinal),
      parcelas,
      ano: p.ano != null ? p.ano : agora.ano,
      mes: p.mes != null ? p.mes : agora.mes,
      categoria: CATEGORIAS.includes(p.categoria) ? p.categoria : (p.tipo === "entrada" ? "Outros" : "Outros"),
      categoriaEntrada: CAT_ENTRADA.includes(p.categoria) ? p.categoria : "Outros",
      tipoGasto: p.tipoGasto === "Fixo" ? "Fixo" : "Variavel",
    });
    setErro("");
  };

  const analisar = async () => {
    if (!texto.trim() || carregando) return;
    setCarregando(true);
    setErro("");
    try {
      await montarRascunho(texto);
    } catch (e) {
      setErro(e.message || "Falha ao analisar");
    } finally {
      setCarregando(false);
    }
  };

  const parseValor = (s) => {
    let raw = String(s || "").trim().replace(/r\$/i, "").trim();
    if (raw.includes(",") && raw.includes(".")) raw = raw.replace(/\./g, "").replace(",", ".");
    else if (raw.includes(",")) raw = raw.replace(",", ".");
    return parseFloat(raw) || 0;
  };

  const confirmar = () => {
    if (!rascunho) return;
    const valor = parseValor(rascunho.valor);
    if (valor <= 0) {
      setErro("Informe um valor valido.");
      return;
    }
    const desc = (rascunho.descricao || "Lancamento").slice(0, 60);
    const ano = Number(rascunho.ano) || agora.ano;
    const mes = Number(rascunho.mes);
    const mesOk = mes >= 0 && mes <= 11 ? mes : agora.mes;

    if (rascunho.forma === "entrada") {
      setEntradas([...entradas, {
        id: uid(), descricao: desc, valor,
        categoria: CAT_ENTRADA.includes(rascunho.categoriaEntrada) ? rascunho.categoriaEntrada : "Outros",
        recorrente: false, dia: 5, ano, mes: mesOk,
      }]);
      notificar("Entrada adicionada.");
    } else if (rascunho.forma === "credito") {
      if (!cartoes.length) {
        setErro("Cadastre um cartao em Cartoes antes.");
        return;
      }
      if (!rascunho.cartaoId) {
        setErro("Escolha o cartao.");
        return;
      }
      const parcelas = Math.max(1, parseInt(rascunho.parcelas, 10) || 1);
      const valorTotal = parcelas > 1 ? valor * parcelas : valor;
      setCompras([...compras, {
        id: uid(),
        cartaoId: rascunho.cartaoId,
        descricao: desc,
        categoria: CATEGORIAS.includes(rascunho.categoria) ? rascunho.categoria : "Outros",
        valorTotal,
        parcelas,
        ano,
        mes: mesOk,
      }]);
      notificar(parcelas > 1 ? `Compra ${parcelas}x no cartao.` : "Compra no cartao adicionada.");
    } else {
      // debito, pix, dinheiro -> gasto variavel
      const sufixo = rascunho.forma === "pix" ? " (PIX)" : rascunho.forma === "debito" ? " (debito)" : rascunho.forma === "dinheiro" ? " (dinheiro)" : "";
      setGastos([...gastos, {
        id: uid(),
        descricao: desc + (desc.includes("(PIX)") || desc.includes("debito") ? "" : sufixo),
        valor,
        categoria: CATEGORIAS.includes(rascunho.categoria) ? rascunho.categoria : "Outros",
        tipo: "Variável",
        recorrente: false,
        dia: 10,
        ano,
        mes: mesOk,
      }]);
      notificar("Gasto adicionado.");
    }
    onFechar();
  };

  const setR = (campo, valor) => setRascunho((r) => r ? { ...r, [campo]: valor } : r);

  return (
    <Modal titulo="" onFechar={onFechar} hideHeader>
      {/* chip OCR */}
      {ocrProgresso != null && (
        <div className="flex justify-center mb-3">
          <span className="text-[11px] px-3 py-1 rounded-full bg-white/10 border border-white/15 text-neutral-300 backdrop-blur-md">
            OCR {ocrProgresso}%
          </span>
        </div>
      )}
      {ocrProgresso == null && preview && (
        <div className="flex justify-center mb-3">
          <span className="text-[11px] px-3 py-1 rounded-full bg-white/10 border border-white/15 text-neutral-300 backdrop-blur-md">
            OCR pronto
          </span>
        </div>
      )}

      {/* painel principal glass */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-neutral-300 font-medium">Lancamento rapido</span>
        </div>

        {/* comprovante */}
        <div className="border border-dashed border-white/15 rounded-2xl p-3 text-center bg-white/[0.03]">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="" className="max-h-24 mx-auto rounded-xl object-contain" />
              <button type="button" className="absolute top-0 right-0 text-neutral-400 hover:text-red-400 text-sm bg-black/50 rounded-full w-6 h-6" onClick={() => setPreview(null)}>×</button>
            </div>
          ) : (
            <div className="py-3 space-y-2">
              <div className="flex gap-2 justify-center">
                <label className={btnSec + " cursor-pointer text-xs"}>
                  Galeria
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} />
                </label>
                <label className={btnSec + " cursor-pointer text-xs"}>
                  Camera
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Texto bruto do OCR fica oculto apos reconhecer — so formulario limpo */}
        {!rascunho && (
          <>
            <Campo label="">
              <textarea
                className={input + " min-h-[56px] resize-none"}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder=""
              />
            </Campo>
            <button type="button" className={btn + " w-full"} disabled={carregando || !texto.trim()} onClick={analisar}>
              {carregando ? "Analisando..." : "Reconhecer"}
            </button>
          </>
        )}

        {rascunho && (
          <div className="space-y-4">
            <Campo label="Descricao">
              <input className={input} value={rascunho.descricao} onChange={(e) => setR("descricao", e.target.value)} placeholder="" />
            </Campo>

            <div>
              <div className="text-xs text-neutral-500 mb-1">Valor</div>
              <input
                className="w-full bg-transparent border-0 text-3xl font-semibold text-white outline-none tracking-tight"
                inputMode="decimal"
                value={rascunho.valor}
                onChange={(e) => setR("valor", e.target.value)}
                placeholder=""
              />
            </div>

            {rascunho.forma === "credito" && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-neutral-400">Parcelas</span>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-1 py-1">
                  <button type="button" className="w-8 h-8 rounded-full text-neutral-300 hover:bg-white/10"
                    onClick={() => setR("parcelas", Math.max(1, (parseInt(rascunho.parcelas, 10) || 1) - 1))}>−</button>
                  <span className="w-8 text-center text-sm text-white font-medium">{rascunho.parcelas}</span>
                  <button type="button" className="w-8 h-8 rounded-full text-neutral-300 hover:bg-white/10"
                    onClick={() => setR("parcelas", Math.min(48, (parseInt(rascunho.parcelas, 10) || 1) + 1))}>+</button>
                </div>
              </div>
            )}

            <div>
              <div className="text-xs text-neutral-500 mb-2">Forma de pagamento</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "credito", label: "Credito" },
                  { id: "debito", label: "Debito" },
                  { id: "pix", label: "PIX" },
                  { id: "dinheiro", label: "Dinheiro" },
                  { id: "entrada", label: "Entrada" },
                ].map((f) => (
                  <button key={f.id} type="button" className={chip(rascunho.forma === f.id)} onClick={() => setR("forma", f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {rascunho.forma === "credito" && (
              <Campo label="Cartao">
                {!cartoes.length ? (
                  <p className="text-xs text-red-400">Cadastre um cartao na aba Cartoes.</p>
                ) : (
                  <select className={input} value={rascunho.cartaoId} onChange={(e) => setR("cartaoId", e.target.value)}>
                    <option value=""></option>
                    {cartoes.map((card) => (
                      <option key={card.id} value={card.id}>{card.nome}</option>
                    ))}
                  </select>
                )}
              </Campo>
            )}

            {rascunho.forma === "entrada" ? (
              <Campo label="Categoria">
                <select className={input} value={rascunho.categoriaEntrada} onChange={(e) => setR("categoriaEntrada", e.target.value)}>
                  {CAT_ENTRADA.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Campo>
            ) : (
              <Campo label="Categoria">
                <select className={input} value={rascunho.categoria} onChange={(e) => setR("categoria", e.target.value)}>
                  {CATEGORIAS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </Campo>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Campo label="Mes">
                <select className={input} value={rascunho.mes} onChange={(e) => setR("mes", Number(e.target.value))}>
                  {MESES_LONGOS.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
                </select>
              </Campo>
              <Campo label="Ano">
                <input className={input} type="number" value={rascunho.ano} onChange={(e) => setR("ano", Number(e.target.value))} />
              </Campo>
            </div>

            <button type="button" className={btn + " w-full"} onClick={confirmar}>
              Confirmar lancamento
            </button>
            <button type="button" className={btnSec + " w-full"} onClick={() => setRascunho(null)}>
              Voltar
            </button>
          </div>
        )}

        {erro && <p className="text-xs text-red-400 mt-1">{erro}</p>}
      </div>
    </Modal>
  );
}



function SpideyHang({ src }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let raf;
    const BG = [244, 240, 226];
    const TOL = 46;

    const desenhar = () => {
      raf = requestAnimationFrame(desenhar);
      if (video.readyState < 2 || video.videoWidth === 0) return;
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = frame.data;
      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.abs(d[i] - BG[0]) + Math.abs(d[i + 1] - BG[1]) + Math.abs(d[i + 2] - BG[2]);
        if (dist < TOL) d[i + 3] = 0;
        else if (dist < TOL * 2) d[i + 3] = Math.round((d[i + 3] * (dist - TOL)) / TOL);
      }
      ctx.putImageData(frame, 0, 0);
    };
    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="w-24 h-16 relative">
      <video ref={videoRef} src={src} autoPlay loop muted playsInline className="hidden" />
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}


/** Botao flutuante arrastavel com video circular */
function FabBotao({ onClick, videoSrc }) {
  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem("mc_fab_pos");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const posRef = useRef(pos);
  const size = 58;
  posRef.current = pos;

  const style = pos
    ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
    : { right: 20, bottom: 88 }; // acima da barra de abas

  const onPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    moved.current = false;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    start.current = { x: e.clientX, y: e.clientY, left: rect.left, top: rect.top };
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
  };

  const onPointerMove = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved.current = true;
    const maxX = window.innerWidth - size - 8;
    const maxY = window.innerHeight - size - 8;
    const nx = Math.max(8, Math.min(maxX, start.current.left + dx));
    const ny = Math.max(8, Math.min(maxY, start.current.top + dy));
    const next = { x: nx, y: ny };
    posRef.current = next;
    setPos(next);
  };

  const onPointerUp = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    e.stopPropagation();
    dragging.current = false;
    const wasMoved = moved.current;
    if (wasMoved && posRef.current) {
      try { localStorage.setItem("mc_fab_pos", JSON.stringify(posRef.current)); } catch (err) {}
    }
    // delay evita o "ghost click" que fecha o modal na hora
    if (!wasMoved) {
      setTimeout(() => onClick?.(), 30);
    }
  };

  return (
    <button
      type="button"
      title="Lancamento rapido"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      className="fixed z-40 rounded-full overflow-hidden border border-white/20 shadow-lg shadow-black/40 touch-none select-none active:scale-95"
      style={{ width: size, height: size, ...style }}
    >
      <video
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover pointer-events-none"
      />
    </button>
  );
}

export default function App() {
  const [aba, setAba] = useState("inicio");
  const [entradas, setEntradas, p1] = useSalvo("mc_entradas", []);
  const [gastos, setGastos, p2] = useSalvo("mc_gastos", []);
  const [cartoes, setCartoes, p3] = useSalvo("mc_cartoes", []);
  const [compras, setCompras, p4] = useSalvo("mc_compras", []);
  const [rapido, setRapido] = useState(false);
  const [aviso, setAviso] = useState("");
  const [arquivoShare, setArquivoShare] = useState(null);
  const [perfil, setPerfil] = useSalvo("mc_perfil", { nome: "BANKAI", foto: "" });
  const [editPerfil, setEditPerfil] = useState(false);
  const fotoInputRef = useRef(null);

  // evita fechar modal por ghost-click logo apos abrir
  const rapidoLock = useRef(0);
  const abrirRapido = () => {
    rapidoLock.current = Date.now();
    setRapido(true);
  };
  const fecharRapido = () => {
    if (Date.now() - rapidoLock.current < 400) return;
    setRapido(false);
    setArquivoShare(null);
  };

  const notificar = (msg) => {
    setAviso(msg);
    setTimeout(() => setAviso(""), 2600);
  };

  useEffect(() => {
    let cancelled = false;

    const limparQuery = () => {
      if (!window.history.replaceState) return;
      const u = new URL(window.location.href);
      if (!u.searchParams.has("share")) return;
      u.searchParams.delete("share");
      window.history.replaceState({}, "", u.pathname + u.search);
    };

    const tentarShare = async () => {
      const file = await consumirCompartilhamento();
      if (cancelled || !file) return false;
      setArquivoShare(file);
      rapidoLock.current = Date.now();
      setRapido(true);
      limparQuery();
      return true;
    };

    (async () => {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("share") === "1") { rapidoLock.current = Date.now(); setRapido(true); }
      await tentarShare();
    })();

    const onMsg = () => { tentarShare(); };
    window.addEventListener("meu-caixa-share-received", onMsg);
    return () => {
      cancelled = true;
      window.removeEventListener("meu-caixa-share-received", onMsg);
    };
  }, []);

  useEffect(() => {
    document.title = (perfil?.nome || "BANKAI") + " · Caixa";
  }, [perfil?.nome]);

  if (!(p1 && p2 && p3 && p4)) return null;

  return (
    
      <style>{`.mc-modal-open .mc-tabs, .mc-modal-open [title="Lancamento rapido"] { display: none !important; }`}</style>

    <div className="min-h-screen text-neutral-100 relative"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <video src={bgVideo} autoPlay loop muted playsInline aria-hidden="true"
        className="fixed inset-0 w-full h-full object-cover z-0" />
      <div className="fixed inset-0 bg-black/55 z-0" />

      <div className="max-w-2xl mx-auto px-4 pb-28 pt-2 relative z-10">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditPerfil(true)}
            className="w-14 h-14 rounded-full overflow-hidden border border-white/20 bg-white/10 shrink-0 shadow-lg"
            title="Editar perfil"
          >
            {perfil.foto ? (
              <img src={perfil.foto} alt="" className="w-full h-full object-cover" />
            ) : (
              <img src={bankaiAvatar} alt="" className="w-full h-full object-cover" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-neutral-400">Ola,</div>
            <button type="button" onClick={() => setEditPerfil(true)} className="text-left">
              <div className="text-xl font-semibold text-white truncate tracking-wide">{perfil.nome || "BANKAI"}</div>
            </button>
          </div>
          <div className="shrink-0 opacity-90">
            <SpideyHang src={spideyVideo} />
          </div>
        </div>

        {/* abas no rodape */}


        {aba === "inicio" && (
          <Inicio entradas={entradas} gastos={gastos} setGastos={setGastos} cartoes={cartoes}
            compras={compras} setCompras={setCompras} irPara={setAba} notificar={notificar} />
        )}
        {aba === "entradas" && <Entradas entradas={entradas} setEntradas={setEntradas} />}
        {aba === "gastos" && <Gastos gastos={gastos} setGastos={setGastos} />}
        {aba === "cartoes" && <Cartoes cartoes={cartoes} setCartoes={setCartoes} compras={compras} setCompras={setCompras} />}
        {aba === "monitoramento" && <Monitoramento gastos={gastos} compras={compras} />}
      </div>

      <FabBotao videoSrc={fabVideo} onClick={abrirRapido} />

      {rapido && (
        <ModalRapido
          key={arquivoShare ? `share-${arquivoShare.size}-${arquivoShare.name || "img"}` : "manual"}
          entradas={entradas} setEntradas={setEntradas}
          gastos={gastos} setGastos={setGastos}
          cartoes={cartoes} compras={compras} setCompras={setCompras}
          onFechar={fecharRapido}
          notificar={notificar}
          arquivoInicial={arquivoShare}
        />
      )}

      {aviso && (
        <div className="fixed bottom-24 right-5 md:right-8 z-50 bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {aviso}
        </div>
      )}

      {editPerfil && (
        <Modal titulo="Perfil" onFechar={() => setEditPerfil(false)}>
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fotoInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden border border-white/20 bg-white/10 relative"
            >
              {perfil.foto ? (
                <img src={perfil.foto} alt="" className="w-full h-full object-cover" />
              ) : (
                <img src={bankaiAvatar} alt="" className="w-full h-full object-cover" />
              )}
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-black/60 px-2 py-0.5 rounded-full text-neutral-200">trocar</span>
            </button>
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setPerfil({ ...perfil, foto: String(reader.result || "") });
                };
                reader.readAsDataURL(f);
                e.target.value = "";
              }}
            />
            <Campo label="Nome">
              <input
                className={input}
                value={perfil.nome}
                onChange={(e) => setPerfil({ ...perfil, nome: e.target.value.slice(0, 24) })}
                placeholder=""
              />
            </Campo>
            <button type="button" className={btn + " w-full"} onClick={() => setEditPerfil(false)}>
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {/* barra de abas inferior */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-full bg-neutral-900/70 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/40 mc-tabs">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            onClick={() => setAba(a.chave)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              aba === a.chave
                ? "bg-white text-neutral-900"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            title={a.nome}
          >
            <IconeAba tipo={a.icone} ativo={aba === a.chave} />
          </button>
        ))}
      </nav>
    </div>
  );
}
