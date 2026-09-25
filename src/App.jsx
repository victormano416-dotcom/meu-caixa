import { useState, useEffect, useCallback } from "react";
import { parseLocal, ocrImagem } from "./ocrHelpers";

/* ---------------- constantes ---------------- */

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = ["Janeiro", "Fevereiro", "MarÃ§o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CATEGORIAS = ["Casa", "AlimentaÃ§Ã£o", "Transporte", "Estudos", "Lazer", "Compras", "SaÃºde", "Outros"];
const COR_CATEGORIA = {
  Casa: "bg-sky-400",
  "AlimentaÃ§Ã£o": "bg-amber-400",
  Transporte: "bg-orange-400",
  Estudos: "bg-violet-400",
  Lazer: "bg-pink-400",
  Compras: "bg-emerald-400",
  "SaÃºde": "bg-red-400",
  Outros: "bg-neutral-400",
};
const CAT_ENTRADA = ["SalÃ¡rio", "Renda extra", "Freelance", "Investimentos", "Outros"];

/* ---------------- helpers de mÃªs ---------------- */

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

/** Um item (gasto/entrada) conta neste mÃªs? Recorrente conta sempre; avulso sÃ³ no mÃªs em que foi lanÃ§ado. */
function contaNesteMes(item, alvo) {
  return item.recorrente || (item.ano === alvo.ano && item.mes === alvo.mes);
}
function valorNoMes(item, alvo) {
  return contaNesteMes(item, alvo) ? Number(item.valor) || 0 : 0;
}

/** Parcelas de uma compra: primeira no mÃªs da compra, Ãºltima em inÃ­cio + (parcelas - 1). */
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
/** Todas as parcelas dessa compra jÃ¡ passaram (inclui compras Ã  vista, 1x, no mÃªs seguinte Ã  compra). */
function compraQuitada(compra, alvo) {
  const atual = indice(alvo) - indice({ ano: compra.ano, mes: compra.mes }) + 1;
  const pagas = Math.min(compra.parcelas, Math.max(0, atual));
  return pagas >= compra.parcelas;
}
/** Gasto avulso (nÃ£o recorrente) referente a um mÃªs que jÃ¡ passou Ã¢â‚¬â€ considerado resolvido/pago. */
function gastoConcluido(gasto, alvo) {
  return !gasto.recorrente && indice({ ano: gasto.ano, mes: gasto.mes }) < indice(alvo);
}
function faturaDoMes(compras, alvo, cartaoId = null) {
  return compras.reduce((s, c) => {
    if (cartaoId && c.cartaoId !== cartaoId) return s;
    return parcelaNoMes(c, alvo) ? s + c.valorTotal / c.parcelas : s;
  }, 0);
}

/** Total por categoria no mÃªs: gastos (fixos+variÃ¡veis) + parcelas de cartÃ£o que caem nesse mÃªs. */
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
          <button onClick={onFechar} className="text-neutral-500 hover:text-neutral-200 text-lg">Ã—</button>
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

/** Campo de mÃªs/ano ou recorrÃªncia, reutilizado em Gastos e Entradas. */
function CampoQuando({ f, set, rotuloRecorrente = "Recorrente (todo mÃªs)" }) {
  return (
    <>
      <Campo label="RepetiÃ§Ã£o">
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" checked={f.recorrente} onChange={(e) => set("recorrente", e.target.checked)} />
          {rotuloRecorrente}
        </label>
      </Campo>
      {f.recorrente ? (
        <Campo label="Dia do mÃªs (vencimento)">
          <input type="number" min="1" max="31" className={input} value={f.dia} onChange={(e) => set("dia", e.target.value)} />
        </Campo>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Campo label="MÃªs">
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

/* ---------------- tela: InÃ­cio ---------------- */

function Inicio({ entradas, gastos, setGastos, cartoes, compras, setCompras, irPara, notificar }) {
  const mesAtual = hoje();

  const totalEntradas = entradas.reduce((s, e) => s + valorNoMes(e, mesAtual), 0);
  const totalFixos = gastos.filter((g) => g.tipo === "Fixo").reduce((s, g) => s + valorNoMes(g, mesAtual), 0);
  const totalVariaveis = gastos.filter((g) => g.tipo === "VariÃ¡vel").reduce((s, g) => s + valorNoMes(g, mesAtual), 0);
  const faturaAtual = faturaDoMes(compras, mesAtual);
  const totalGastos = totalFixos + totalVariaveis + faturaAtual;
  const sobra = totalEntradas - totalGastos;

  const gastosConcluidos = gastos.filter((g) => gastoConcluido(g, mesAtual)).length;
  const comprasConcluidas = compras.filter((c) => compraQuitada(c, mesAtual)).length;
  const totalConcluidos = gastosConcluidos + comprasConcluidas;

  const limparConcluidos = () => {
    if (!confirm(`Remover ${totalConcluidos} lanÃ§amento(s) jÃ¡ encerrado(s) (parcelas quitadas e gastos de meses passados)? Isso nÃ£o pode ser desfeito.`)) return;
    setGastos(gastos.filter((g) => !gastoConcluido(g, mesAtual)));
    setCompras(compras.filter((c) => !compraQuitada(c, mesAtual)));
    notificar(`${totalConcluidos} lanÃ§amento(s) removido(s).`);
  };

  const proximos = Array.from({ length: 6 }, (_, i) => {
    const m = somaMes(mesAtual, i);
    return { mes: m, total: faturaDoMes(compras, m) };
  });
  const maior = Math.max(1, ...proximos.map((p) => p.total));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-neutral-100">Resumo</h2>
        <p className="text-sm text-neutral-500">{rotuloLongo(mesAtual)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">ENTRADAS</div>
          <div className="text-lg font-semibold text-emerald-400">{brl(totalEntradas)}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">GASTOS FIXOS</div>
          <div className="text-lg font-semibold text-neutral-100">{brl(totalFixos)}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">GASTOS VARIÃVEIS</div>
          <div className="text-lg font-semibold text-neutral-100">{brl(totalVariaveis)}</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">FATURA DO CARTÃƒO</div>
          <div className="text-lg font-semibold text-amber-400">{brl(faturaAtual)}</div>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 flex items-center justify-between">
        <span className="text-sm text-neutral-300">Sobra do mÃªs</span>
        <span className={`text-xl font-semibold ${sobra < 0 ? "text-red-400" : "text-emerald-400"}`}>{brl(sobra)}</span>
      </div>

      <button onClick={() => irPara("monitoramento")}
        className="w-full text-left bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors">
        <div className="text-sm text-neutral-300 mb-1">Ver onde estÃ¡ indo o dinheiro Ã¢â€ â€™</div>
        <div className="text-xs text-neutral-500">Gasto por categoria neste mÃªs</div>
      </button>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="text-sm text-neutral-300 mb-4">Fatura nos prÃ³ximos meses</div>
        <div className="flex items-end gap-2 h-28">
          {proximos.map((p) => (
            <div key={rotulo(p.mes)} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
              <div className="text-xs text-neutral-400 whitespace-nowrap">
                {p.total > 0 ? brl(p.total).replace("R$", "").trim() : "Ã¢â‚¬â€"}
              </div>
              <div className="w-full flex items-end" style={{ height: "60%" }}>
                <div className="w-full bg-amber-400 rounded-t" style={{ height: `${(p.total / maior) * 100}%`, minHeight: p.total > 0 ? 3 : 0 }} />
              </div>
              <div className="text-xs text-neutral-500">{rotulo(p.mes)}</div>
            </div>
          ))}
        </div>
      </div>

      {cartoes.length > 0 && (
        <div>
          <div className="text-sm text-neutral-300 mb-2">Fatura por cartÃ£o</div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
            {cartoes.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-neutral-300">{c.nome}</span>
                <span className="text-sm font-medium text-amber-400">{brl(faturaDoMes(compras, mesAtual, c.id))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalConcluidos > 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-neutral-300">{totalConcluidos} lanÃ§amento(s) jÃ¡ encerrado(s)</div>
            <div className="text-xs text-neutral-500">Parcelas quitadas e gastos de meses passados</div>
          </div>
          <button className={btnSec} onClick={limparConcluidos}>Fatura paga Â· limpar</button>
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
        <h2 className="text-lg font-semibold text-neutral-100">Monitoramento</h2>
        <p className="text-sm text-neutral-500">Onde seu dinheiro estÃ¡ indo Â· {rotuloLongo(mesAtual)}</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 flex items-center justify-between">
        <span className="text-sm text-neutral-300">Total gasto no mÃªs</span>
        <span className="text-xl font-semibold text-neutral-100">{brl(total)}</span>
      </div>

      {!linhas.length ? (
        <Vazio texto="Nenhum gasto registrado ainda este mÃªs." />
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-4">
          {linhas.map((l) => (
            <div key={l.categoria}>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="flex items-center gap-2 text-neutral-200">
                  <Ponto cor={COR_CATEGORIA[l.categoria]} />
                  {l.categoria}
                </span>
                <span className="text-neutral-400">{brl(l.valor)} Â· {((l.valor / total) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${COR_CATEGORIA[l.categoria]}`} style={{ width: `${(l.valor / maior) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-neutral-600">Inclui gastos fixos, variÃ¡veis e parcelas de cartÃ£o que caem neste mÃªs. SÃ³ muda quando vocÃª lanÃ§a algo Ã¢â‚¬â€ nada para ajustar aqui.</p>
    </div>
  );
}

/* ---------------- tela: CartÃµes ---------------- */

function Cartoes({ cartoes, setCartoes, compras, setCompras }) {
  const [modalCartao, setModalCartao] = useState(null);
  const [modalCompra, setModalCompra] = useState(null);
  const [aberto, setAberto] = useState(null);
  const mesAtual = hoje();

  const excluirCartao = (id) => {
    if (!confirm("Excluir este cartÃ£o e todas as suas compras?")) return;
    setCartoes(cartoes.filter((c) => c.id !== id));
    setCompras(compras.filter((c) => c.cartaoId !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">CartÃµes</h2>
          <p className="text-sm text-neutral-500">Compras parceladas e fatura mensal</p>
        </div>
        <div className="flex gap-2">
          <button className={btnSec} onClick={() => setModalCartao({})}>+ CartÃ£o</button>
          <button className={btn} disabled={!cartoes.length} onClick={() => setModalCompra({})}>+ Compra</button>
        </div>
      </div>

      {!cartoes.length && <Vazio texto="Cadastre um cartÃ£o para comeÃ§ar." />}

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
          <div key={cartao.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-neutral-100">{cartao.nome}</div>
                  <div className="text-xs text-neutral-500">{doCartao.length} compra(s)</div>
                </div>
                <div className="flex gap-2 text-neutral-500">
                  <button onClick={() => setModalCartao(cartao)} className="hover:text-neutral-200">Ã¢Å“Å½</button>
                  <button onClick={() => excluirCartao(cartao.id)} className="hover:text-red-400">Ã—</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-neutral-500">Fatura deste mÃªs</div>
                  <div className="text-base font-semibold text-amber-400">{brl(faturaMes)}</div>
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
                  <div className="text-xs text-neutral-500">DisponÃ­vel</div>
                  <div className={`text-base font-semibold ${cartao.limite > 0 && cartao.limite - aindaDevo < 0 ? "text-red-400" : "text-neutral-200"}`}>
                    {cartao.limite > 0 ? brl(cartao.limite - aindaDevo) : "Ã¢â‚¬â€"}
                  </div>
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
                          <button onClick={() => setModalCompra(c)} className="hover:text-neutral-200">Ã¢Å“Å½</button>
                          <button onClick={() => setCompras(compras.filter((x) => x.id !== c.id))} className="hover:text-red-400">Ã—</button>
                        </div>
                      </div>

                      <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${quitada ? "bg-emerald-400" : "bg-amber-400"}`}
                          style={{ width: `${Math.min(100, (pagas / c.parcelas) * 100)}%` }} />
                      </div>

                      <div className="text-xs text-neutral-500">
                        {quitada ? `Quitada em ${rotulo(fim)}` : `Parcela ${Math.max(1, atual)} de ${c.parcelas} Â· vai atÃ© ${rotulo(fim)}`}
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
  const [limite, setLimite] = useState(inicial.limite ?? "");
  const valido = nome.trim();
  return (
    <Modal titulo={inicial.id ? "Editar cartÃ£o" : "Novo cartÃ£o"} onFechar={onFechar}>
      <Campo label="Nome do cartÃ£o">
        <input className={input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Nubank" />
      </Campo>
      <Campo label="Limite do cartÃ£o">
        <input className={input} value={limite} placeholder="0,00"
          onChange={(e) => setLimite(e.target.value.replace(/[^0-9.,]/g, ""))} />
      </Campo>
      <div className="flex justify-end gap-2 mt-4">
        <button className={btnSec} onClick={onFechar}>Cancelar</button>
        <button className={btn} disabled={!valido}
          onClick={() => onSalvar({ nome: nome.trim(), limite: parseFloat(String(limite).replace(",", ".")) || 0 })}>
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
    <Modal titulo={inicial.id ? "Editar compra" : "Nova compra no cartÃ£o"} onFechar={onFechar}>
      <Campo label="CartÃ£o">
        <select className={input} value={f.cartaoId} onChange={(e) => set("cartaoId", e.target.value)}>
          {cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Campo label="DescriÃ§Ã£o">
        <input className={input} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Notebook" />
      </Campo>
      <Campo label="Categoria">
        <select className={input} value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Valor total">
          <input className={input} value={f.valorTotal} placeholder="0,00"
            onChange={(e) => set("valorTotal", e.target.value.replace(/[^0-9.,]/g, ""))} />
        </Campo>
        <Campo label="Parcelas">
          <input className={input} type="number" min="1" value={f.parcelas} onChange={(e) => set("parcelas", e.target.value)} />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Primeira parcela (mÃªs)">
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
          <div>{n}x de <span className="text-amber-400 font-medium">{brl(total / n)}</span></div>
          <div>De {rotulo({ ano: f.ano, mes: f.mes })} atÃ© <span className="text-neutral-200">{rotulo(fim)}</span></div>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button className={btnSec} onClick={onFechar}>Cancelar</button>
        <button className={btn} disabled={!valido} onClick={() => onSalvar({ ...f, valorTotal: total, parcelas: n })}>Salvar</button>
      </div>
    </Modal>
  );
}

/* ---------------- tela: Gastos (fixos + variÃ¡veis) ---------------- */

function Gastos({ gastos, setGastos }) {
  const [modal, setModal] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const mesAtual = hoje();

  const lista = gastos.filter((g) => filtro === "todos" || (filtro === "fixo" ? g.tipo === "Fixo" : g.tipo === "VariÃ¡vel"));
  const totalMes = gastos.reduce((s, g) => s + valorNoMes(g, mesAtual), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-neutral-100">Gastos</h2>
          <p className="text-sm text-neutral-500">Fora do cartÃ£o Â· {brl(totalMes)} este mÃªs</p>
        </div>
        <button className={btn} onClick={() => setModal({})}>+ Gasto</button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        <button className={chip(filtro === "todos")} onClick={() => setFiltro("todos")}>Todos</button>
        <button className={chip(filtro === "fixo")} onClick={() => setFiltro("fixo")}>Fixos</button>
        <button className={chip(filtro === "variavel")} onClick={() => setFiltro("variavel")}>VariÃ¡veis</button>
      </div>

      {!lista.length ? <Vazio texto="Nada aqui ainda." /> : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
          {lista.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-100 truncate">{g.descricao}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                  <Ponto cor={COR_CATEGORIA[g.categoria]} />
                  {g.categoria} Â· {g.tipo}
                  {g.recorrente ? ` Â· todo dia ${g.dia}` : ` Â· ${rotulo({ ano: g.ano, mes: g.mes })}`}
                </div>
              </div>
              <div className="text-sm text-neutral-100">{brl(g.valor)}</div>
              <button onClick={() => setModal(g)} className="text-neutral-500 hover:text-neutral-200">Ã¢Å“Å½</button>
              <button onClick={() => setGastos(gastos.filter((x) => x.id !== g.id))} className="text-neutral-600 hover:text-red-400">Ã—</button>
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
      <Campo label="DescriÃ§Ã£o">
        <input className={input} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Aluguel, Mercado..." />
      </Campo>
      <Campo label="Valor">
        <input className={input} value={f.valor} placeholder="0,00" onChange={(e) => set("valor", e.target.value.replace(/[^0-9.,]/g, ""))} />
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
            <option value="VariÃ¡vel">VariÃ¡vel</option>
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
          <h2 className="text-lg font-semibold text-neutral-100">Entradas</h2>
          <p className="text-sm text-neutral-500">{brl(totalMes)} este mÃªs</p>
        </div>
        <button className={btn} onClick={() => setModal({})}>+ Entrada</button>
      </div>

      {!entradas.length ? <Vazio texto="Nenhuma entrada cadastrada." /> : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl divide-y divide-neutral-800">
          {entradas.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-100 truncate">{e.descricao}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {e.categoria}{e.recorrente ? ` Â· todo dia ${e.dia}` : ` Â· ${rotulo({ ano: e.ano, mes: e.mes })}`}
                </div>
              </div>
              <div className="text-sm font-medium text-emerald-400">{brl(e.valor)}</div>
              <button onClick={() => setModal(e)} className="text-neutral-500 hover:text-neutral-200">Ã¢Å“Å½</button>
              <button onClick={() => setEntradas(entradas.filter((x) => x.id !== e.id))} className="text-neutral-600 hover:text-red-400">Ã—</button>
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
      <Campo label="DescriÃ§Ã£o">
        <input className={input} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: SalÃ¡rio" />
      </Campo>
      <Campo label="Valor">
        <input className={input} value={f.valor} placeholder="0,00" onChange={(e) => set("valor", e.target.value.replace(/[^0-9.,]/g, ""))} />
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

/* ---------------- lanÃ§amento rÃ¡pido (IA) ---------------- */

async function parseQuickAdd(texto) {
  const systemPrompt = `VocÃª extrai lanÃ§amentos financeiros de um texto em portuguÃªs informal. O texto pode conter UM OU VÃRIOS lanÃ§amentos, geralmente um por linha. Responda APENAS com um JSON vÃ¡lido, sem markdown: um ARRAY de objetos, um por lanÃ§amento identificado, no formato exato:
[{"tipo": "entrada" | "gasto" | "compraCartao", "descricao": "<3-5 palavras>", "valor": <numero>, "categoria": "<categoria>", "tipoGasto": "Fixo" | "VariÃ¡vel", "recorrente": <true ou false>, "dia": <numero ou null>, "parcelas": <numero ou 1>, "banco": "<nome do cartÃ£o/banco ou null>"}]

Categorias de gasto vÃ¡lidas: ${CATEGORIAS.join(", ")}.
Categorias de entrada vÃ¡lidas: ${CAT_ENTRADA.join(", ")}.

Regras:
- Cada linha ou frase separada Ã© um lanÃ§amento distinto. Mantenha a ordem em que aparecem.
- "gastei", "paguei X no mercado/uber/farmÃ¡cia" sem menÃ§Ã£o a cartÃ£o ou parcelas = "gasto", tipoGasto "VariÃ¡vel", recorrente false.
- Conta fixa mencionada ("aluguel", "internet", "Ã¡gua", "luz", "todo mÃªs", "todo dia X") = "gasto", tipoGasto "Fixo", recorrente true, dia = o dia mencionado (padrÃ£o 10 se nÃ£o citado).
- "recebi", "caiu", "salÃ¡rio" = "entrada". Se mencionar "todo mÃªs" ou for salÃ¡rio, recorrente true.
- MenÃ§Ã£o a cartÃ£o, banco ou parcelas ("em Nx", "parcelado") = "compraCartao"; parcelas = nÃºmero de parcelas (padrÃ£o 1); banco = nome citado ou null.
- Ignore qualquer linha sem valor numÃ©rico identificÃ¡vel (nÃ£o a inclua no array).
- Se nada for identificado, responda [].`;

  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: texto }],
    }),
  });
  if (!resposta.ok) {
    const local = parseLocal(texto);
    if (local.length) return local;
    throw new Error("Falha ao consultar a IA. Descreva em texto simples.");
  }
  try {
    const dados = await resposta.json();
    const bloco = (dados.content || []).find((b) => b.type === "text");
    if (!bloco) {
      const local = parseLocal(texto);
      if (local.length) return local;
      throw new Error("Resposta vazia da IA.");
    }
    const limpo = bloco.text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(limpo);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    const local = parseLocal(texto);
    if (local.length) return local;
    throw e;
  }
}

function ModalRapido({ entradas, setEntradas, gastos, setGastos, cartoes, compras, setCompras, onFechar, notificar }) {
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [ocrProgresso, setOcrProgresso] = useState(null);
  const [preview, setPreview] = useState(null);
  const [erro, setErro] = useState("");
  const agora = hoje();

  const processarImagem = async (fileOrBlob) => {
    if (!fileOrBlob) return;
    setErro("");
    setOcrProgresso(0);
    try {
      setPreview(URL.createObjectURL(fileOrBlob));
      const extraido = await ocrImagem(fileOrBlob, setOcrProgresso);
      if (!extraido) {
        setErro("NÃ£o consegui ler texto na imagem. Tente um print mais nÃ­tido.");
        setOcrProgresso(null);
        return;
      }
      setTexto((t) => (t ? t + "\n" + extraido : extraido));
      setOcrProgresso(null);
    } catch (e) {
      console.error(e);
      setErro("Falha no OCR. Tente de novo ou digite o texto.");
      setOcrProgresso(null);
    }
  };

  const onPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        processarImagem(item.getAsFile());
        return;
      }
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (file) processarImagem(file);
    e.target.value = "";
  };

  const enviar = async () => {
    if (!texto.trim() || carregando) return;
    setCarregando(true);
    setErro("");
    try {
      const lista = await parseQuickAdd(texto.trim());
      if (!lista.length) {
        setErro("NÃ£o identifiquei nenhum lanÃ§amento. Tente algo como 'gastei 45 no mercado'.");
        setCarregando(false);
        return;
      }

      const novasEntradas = [];
      const novosGastos = [];
      const novasCompras = [];
      let semCartao = 0;

      lista.forEach((p) => {
        if (!p.valor) return;
        const categoriaGasto = CATEGORIAS.includes(p.categoria) ? p.categoria : "Outros";
        const categoriaEntrada = CAT_ENTRADA.includes(p.categoria) ? p.categoria : "Outros";

        if (p.tipo === "entrada") {
          novasEntradas.push({ id: uid(), descricao: p.descricao, valor: Number(p.valor), categoria: categoriaEntrada,
            recorrente: !!p.recorrente, dia: p.dia || 5, ano: agora.ano, mes: agora.mes });
        } else if (p.tipo === "compraCartao") {
          if (!cartoes.length) { semCartao++; return; }
          const cartao = cartoes.find((c) => p.banco && c.nome.toLowerCase().includes(String(p.banco).toLowerCase())) || cartoes[0];
          const parcelas = Math.max(1, parseInt(p.parcelas) || 1);
          novasCompras.push({ id: uid(), cartaoId: cartao.id, descricao: p.descricao, categoria: categoriaGasto,
            valorTotal: Number(p.valor), parcelas, ano: agora.ano, mes: agora.mes });
        } else {
          novosGastos.push({ id: uid(), descricao: p.descricao, valor: Number(p.valor), categoria: categoriaGasto,
            tipo: p.tipoGasto === "Fixo" ? "Fixo" : "VariÃ¡vel", recorrente: !!p.recorrente, dia: p.dia || 10,
            ano: agora.ano, mes: agora.mes });
        }
      });

      if (novasEntradas.length) setEntradas([...novasEntradas, ...entradas]);
      if (novosGastos.length) setGastos([...novosGastos, ...gastos]);
      if (novasCompras.length) setCompras([...novasCompras, ...compras]);

      const total = novasEntradas.length + novosGastos.length + novasCompras.length;
      if (total === 0 && semCartao > 0) {
        setErro("Cadastre um cartÃ£o antes de lanÃ§ar compras no cartÃ£o.");
        setCarregando(false);
        return;
      }
      const partes = [];
      if (novasEntradas.length) partes.push(`${novasEntradas.length} entrada(s)`);
      if (novosGastos.length) partes.push(`${novosGastos.length} gasto(s)`);
      if (novasCompras.length) partes.push(`${novasCompras.length} compra(s) no cartÃ£o`);
      notificar(`Adicionado: ${partes.join(", ")}${semCartao ? ` Â· ${semCartao} ignorado(s) por falta de cartÃ£o` : ""}`);
      onFechar();
    } catch (e) {
      setErro(e.message || "NÃ£o entendi. Tente reformular.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Modal titulo="LanÃ§amento rÃ¡pido" onFechar={onFechar}>
      <p className="text-xs text-neutral-500 mb-3">
        Digite, cole texto, ou envie um print. O OCR lÃª o texto automaticamente.
      </p>
      <div className="mb-3 border border-dashed border-neutral-700 rounded-lg p-3 text-center">
        {preview ? (
          <div className="relative">
            <img src={preview} alt="preview" className="max-h-28 mx-auto rounded object-contain" />
            <button type="button" className="absolute top-0 right-0 text-neutral-400 hover:text-red-400 text-sm bg-neutral-900/80 rounded px-1.5" onClick={() => setPreview(null)}>Ã—</button>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            <p className="text-xs text-neutral-500">Cole um print ou escolha uma foto:</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <label className="inline-flex items-center justify-center gap-1.5 bg-amber-400 text-neutral-950 font-medium text-sm px-4 py-2.5 rounded-lg cursor-pointer active:bg-amber-300">
                Galeria
                <input type="file" accept="image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={onFile} />
              </label>
              <label className="inline-flex items-center justify-center gap-1.5 border border-neutral-700 text-neutral-200 text-sm px-4 py-2.5 rounded-lg cursor-pointer active:bg-neutral-800">
                CÃ¢mera
                <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onFile} />
              </label>
            </div>
          </div>
        )}
        {ocrProgresso != null && (
          <div className="mt-2">
            <div className="text-xs text-amber-400 mb-1">Lendo imagemÃ¢â‚¬Â¦ {ocrProgresso}%</div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${ocrProgresso}%` }} />
            </div>
          </div>
        )}
      </div>
      <textarea
        autoFocus
        className={input + " min-h-32 resize-none"}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onPaste={onPaste}
        placeholder={"Um lanÃ§amento por linha...\nEx:\ngastei 45 no mercado"}
      />
      {erro && <div className="text-xs text-red-400 mt-2">{erro}</div>}
      <p className="text-xs text-neutral-600 mt-2">O texto Ã© enviado Ã  IA da Anthropic sÃ³ para identificar valor e categoria.</p>
      <div className="flex justify-end gap-2 mt-4">
        <button className={btnSec} onClick={onFechar}>Cancelar</button>
        <button className={btn} disabled={carregando || ocrProgresso != null} onClick={enviar}>{carregando ? "Analisando..." : "Adicionar"}</button>
      </div>
    </Modal>
  );
}

/* ---------------- app ---------------- */

const ABAS = [
  { chave: "inicio", nome: "InÃ­cio" },
  { chave: "entradas", nome: "Entradas" },
  { chave: "gastos", nome: "Gastos" },
  { chave: "cartoes", nome: "CartÃµes" },
  { chave: "monitoramento", nome: "Monitoramento" },
];

export default function App() {
  const [aba, setAba] = useState("inicio");
  const [entradas, setEntradas, p1] = useSalvo("mc_entradas", []);
  const [gastos, setGastos, p2] = useSalvo("mc_gastos", []);
  const [cartoes, setCartoes, p3] = useSalvo("mc_cartoes", []);
  const [compras, setCompras, p4] = useSalvo("mc_compras", []);
  const [rapido, setRapido] = useState(false);
  const [aviso, setAviso] = useState("");

  const notificar = (msg) => {
    setAviso(msg);
    setTimeout(() => setAviso(""), 2600);
  };

  if (!(p1 && p2 && p3 && p4)) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="mb-5">
          <div className="text-base font-semibold">Meu Caixa</div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-neutral-900 overflow-x-auto">
          {ABAS.map((a) => (
            <button key={a.chave} onClick={() => setAba(a.chave)}
              className={`px-3.5 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
                aba === a.chave ? "border-amber-400 text-amber-400" : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}>
              {a.nome}
            </button>
          ))}
        </div>

        {aba === "inicio" && (
          <Inicio entradas={entradas} gastos={gastos} setGastos={setGastos} cartoes={cartoes}
            compras={compras} setCompras={setCompras} irPara={setAba} notificar={notificar} />
        )}
        {aba === "entradas" && <Entradas entradas={entradas} setEntradas={setEntradas} />}
        {aba === "gastos" && <Gastos gastos={gastos} setGastos={setGastos} />}
        {aba === "cartoes" && <Cartoes cartoes={cartoes} setCartoes={setCartoes} compras={compras} setCompras={setCompras} />}
        {aba === "monitoramento" && <Monitoramento gastos={gastos} compras={compras} />}
      </div>

      <button onClick={() => setRapido(true)} title="LanÃ§amento rÃ¡pido"
        className="fixed bottom-6 right-5 md:right-8 w-14 h-14 rounded-full bg-amber-400 text-neutral-950 text-2xl font-light shadow-lg hover:bg-amber-300 transition-colors flex items-center justify-center z-40">
        +
      </button>

      {rapido && (
        <ModalRapido
          entradas={entradas} setEntradas={setEntradas}
          gastos={gastos} setGastos={setGastos}
          cartoes={cartoes} compras={compras} setCompras={setCompras}
          onFechar={() => setRapido(false)}
          notificar={notificar}
        />
      )}

      {aviso && (
        <div className="fixed bottom-24 right-5 md:right-8 z-50 bg-neutral-800 border border-neutral-700 text-neutral-100 text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}
