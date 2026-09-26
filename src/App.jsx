import { useState, useEffect, useCallback } from "react";
import { parseLocal, ocrImagem, parseQuickAdd } from "./ocrHelpers";
import { consumirCompartilhamento } from "./shareQueue";

const SKELETON_KKK = "data:image/webp;base64,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";

/* ---------------- constantes ---------------- */

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CATEGORIAS = ["Casa", "Alimentação", "Transporte", "Estudos", "Lazer", "Compras", "Saúde", "Outros"];
const COR_CATEGORIA = {
  Casa: "bg-neutral-900",
  "Alimentação": "bg-neutral-700",
  Transporte: "bg-neutral-500",
  Estudos: "bg-neutral-800",
  Lazer: "bg-neutral-400",
  Compras: "bg-neutral-600",
  "Saúde": "bg-red-500",
  Outros: "bg-neutral-300",
};
const CAT_ENTRADA = ["Salário", "Renda extra", "Freelance", "Investimentos", "Outros"];

const ABAS = [
  { chave: "inicio", nome: "Inicio" },
  { chave: "entradas", nome: "Entradas" },
  { chave: "gastos", nome: "Gastos" },
  { chave: "cartoes", nome: "Cartoes" },
  { chave: "monitoramento", nome: "Monitoramento" },
];

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

const input = "w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900";
const btn = "bg-neutral-900 text-white font-medium text-sm px-4 py-2 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40";
const btnSec = "text-neutral-600 hover:text-neutral-900 text-sm px-4 py-2 rounded-lg border border-neutral-200 transition-colors";
const chip = (ativo) => `text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${ativo ? "bg-neutral-900 text-white border-neutral-900" : "border-neutral-200 text-neutral-600 hover:text-neutral-800"}`;

function Campo({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-xs text-neutral-600 mb-1.5">{label}</label>
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
      <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
          <h3 className="text-sm font-medium text-neutral-900">{titulo}</h3>
          <button onClick={onFechar} className="text-neutral-500 hover:text-neutral-800 text-lg">{"×"}</button>
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

/** Campo de mês/ano ou recorrência, reutilizado em Gastos e Entradas. */
function CampoQuando({ f, set, rotuloRecorrente = "Recorrente (todo mês)" }) {
  return (
    <>
      <Campo label={"Repetição"}>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
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
        <h2 className="text-lg font-semibold text-neutral-900">Resumo</h2>
        <p className="text-sm text-neutral-500">{rotuloLongo(mesAtual)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">ENTRADAS</div>
          <div className="text-lg font-semibold text-neutral-900">{brl(totalEntradas)}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">GASTOS FIXOS</div>
          <div className="text-lg font-semibold text-neutral-900">{brl(totalFixos)}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">GASTOS VARIÁVEIS</div>
          <div className="text-lg font-semibold text-neutral-900">{brl(totalVariaveis)}</div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3">
          <div className="text-xs text-neutral-500 mb-1">FATURA DO CARTÃO</div>
          <div className="text-lg font-semibold text-neutral-900">{brl(faturaAtual)}</div>
        </div>
      </div>

      <img src={SKELETON_KKK} alt="" aria-hidden="true" className="w-14 h-14 object-contain mx-auto -mb-3" />
      <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 flex items-center justify-between">
        <span className="text-sm text-neutral-700">Sobra do mês</span>
        <span className={`text-xl font-semibold ${sobra < 0 ? "text-red-500" : "text-neutral-900"}`}>{brl(sobra)}</span>
      </div>

      <button onClick={() => irPara("monitoramento")}
        className="w-full text-left bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 transition-colors">
        <div className="text-sm text-neutral-700 mb-1">{"Ver onde está indo o dinheiro →"}</div>
        <div className="text-xs text-neutral-500">Gasto por categoria neste mês</div>
      </button>

      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="text-sm text-neutral-700 mb-4">Fatura nos próximos meses</div>
        <div className="flex items-end gap-2 h-28">
          {proximos.map((p) => (
            <div key={rotulo(p.mes)} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
              <div className="text-xs text-neutral-600 whitespace-nowrap">
                {p.total > 0 ? brl(p.total).replace("R$", "").trim() : "—"}
              </div>
              <div className="w-full flex items-end" style={{ height: "60%" }}>
                <div className="w-full bg-neutral-900 rounded-t" style={{ height: `${(p.total / maior) * 100}%`, minHeight: p.total > 0 ? 3 : 0 }} />
              </div>
              <div className="text-xs text-neutral-500">{rotulo(p.mes)}</div>
            </div>
          ))}
        </div>
      </div>

      {cartoes.length > 0 && (
        <div>
          <div className="text-sm text-neutral-700 mb-2">Fatura por cartão</div>
          <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-200">
            {cartoes.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-neutral-700">{c.nome}</span>
                <span className="text-sm font-medium text-neutral-900">{brl(faturaDoMes(compras, mesAtual, c.id))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalConcluidos > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-neutral-700">{totalConcluidos} lançamento(s) já encerrado(s)</div>
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
        <h2 className="text-lg font-semibold text-neutral-900">Monitoramento</h2>
        <p className="text-sm text-neutral-500">Onde seu dinheiro está indo · {rotuloLongo(mesAtual)}</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3.5 flex items-center justify-between">
        <span className="text-sm text-neutral-700">Total gasto no mês</span>
        <span className="text-xl font-semibold text-neutral-900">{brl(total)}</span>
      </div>

      {!linhas.length ? (
        <Vazio texto="Nenhum gasto registrado ainda este mês." />
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-4">
          {linhas.map((l) => (
            <div key={l.categoria}>
              <div className="flex items-center justify-between mb-1.5 text-sm">
                <span className="flex items-center gap-2 text-neutral-800">
                  <Ponto cor={COR_CATEGORIA[l.categoria]} />
                  {l.categoria}
                </span>
                <span className="text-neutral-600">{brl(l.valor)} · {((l.valor / total) * 100).toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${COR_CATEGORIA[l.categoria]}`} style={{ width: `${(l.valor / maior) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-neutral-400">{"Inclui gastos fixos, variáveis e parcelas de cartão que caem neste mês. Só muda quando você lança algo — nada para ajustar aqui."}</p>
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
          <h2 className="text-lg font-semibold text-neutral-900">{"Cartões"}</h2>
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
          <div key={cartao.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-medium text-neutral-900">{cartao.nome}</div>
                  <div className="text-xs text-neutral-500">{doCartao.length} compra(s)</div>
                </div>
                <div className="flex gap-2 text-neutral-500">
                  <button onClick={() => setModalCartao(cartao)} className="hover:text-neutral-800">{"✏️"}</button>
                  <button onClick={() => excluirCartao(cartao.id)} className="hover:text-red-500">{"×"}</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <div className="text-xs text-neutral-500">Fatura deste mês</div>
                  <div className="text-base font-semibold text-neutral-900">{brl(faturaMes)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Ainda a pagar</div>
                  <div className="text-base font-semibold text-neutral-800">{brl(aindaDevo)}</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Limite</div>
                  {cartao.limite > 0 ? (
                    <div className="text-base font-semibold text-neutral-800">{brl(cartao.limite)}</div>
                  ) : (
                    <button className="text-xs text-neutral-500 underline hover:text-neutral-700" onClick={() => setModalCartao(cartao)}>
                      Definir limite
                    </button>
                  )}
                </div>
                <div>
                  <div className="text-xs text-neutral-500">Disponível</div>
                  <div className={`text-base font-semibold ${cartao.limite > 0 && cartao.limite - aindaDevo < 0 ? "text-red-500" : "text-neutral-800"}`}>
                    {cartao.limite > 0 ? brl(cartao.limite - aindaDevo) : "—"}
                  </div>
                </div>
              </div>

              <button className="text-xs text-neutral-600 hover:text-neutral-800"
                onClick={() => setAberto(expandido ? null : cartao.id)}>
                {expandido ? "Ocultar compras" : "Ver compras"}
              </button>
            </div>

            {expandido && (
              <div className="border-t border-neutral-200 divide-y divide-neutral-200">
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
                          <div className="text-sm text-neutral-900 truncate">{c.descricao}</div>
                          <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                            <Ponto cor={COR_CATEGORIA[c.categoria]} />{c.categoria}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm text-neutral-900">{c.parcelas}x {brl(valorParcela)}</div>
                          <div className="text-xs text-neutral-500">total {brl(c.valorTotal)}</div>
                        </div>
                        <div className="flex gap-1.5 shrink-0 text-neutral-500">
                          <button onClick={() => setModalCompra(c)} className="hover:text-neutral-800">{"✏️"}</button>
                          <button onClick={() => setCompras(compras.filter((x) => x.id !== c.id))} className="hover:text-red-500">{"×"}</button>
                        </div>
                      </div>

                      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden mb-1.5">
                        <div className={`h-full rounded-full ${quitada ? "bg-neutral-900" : "bg-neutral-400"}`}
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
  const [limite, setLimite] = useState(inicial.limite ?? "");
  const valido = nome.trim();
  return (
    <Modal titulo={inicial.id ? "Editar cartão" : "Novo cartão"} onFechar={onFechar}>
      <Campo label="Nome do cartão">
        <input className={input} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Nubank" />
      </Campo>
      <Campo label="Limite do cartão">
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
    <Modal titulo={inicial.id ? "Editar compra" : "Nova compra no cartão"} onFechar={onFechar}>
      <Campo label="Cartão">
        <select className={input} value={f.cartaoId} onChange={(e) => set("cartaoId", e.target.value)}>
          {cartoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </Campo>
      <Campo label="Descrição">
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
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2.5 text-xs text-neutral-600 space-y-1">
          <div>{n}x de <span className="text-neutral-900 font-medium">{brl(total / n)}</span></div>
          <div>De {rotulo({ ano: f.ano, mes: f.mes })} até <span className="text-neutral-800">{rotulo(fim)}</span></div>
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
          <h2 className="text-lg font-semibold text-neutral-900">Gastos</h2>
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
        <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-200">
          {lista.map((g) => (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-900 truncate">{g.descricao}</div>
                <div className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                  <Ponto cor={COR_CATEGORIA[g.categoria]} />
                  {g.categoria} · {g.tipo}
                  {g.recorrente ? ` · todo dia ${g.dia}` : ` · ${rotulo({ ano: g.ano, mes: g.mes })}`}
                </div>
              </div>
              <div className="text-sm text-neutral-900">{brl(g.valor)}</div>
              <button onClick={() => setModal(g)} className="text-neutral-500 hover:text-neutral-800">{"✏️"}</button>
              <button onClick={() => setGastos(gastos.filter((x) => x.id !== g.id))} className="text-neutral-400 hover:text-red-500">{"×"}</button>
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
          <h2 className="text-lg font-semibold text-neutral-900">Entradas</h2>
          <p className="text-sm text-neutral-500">{brl(totalMes)} este mês</p>
        </div>
        <button className={btn} onClick={() => setModal({})}>+ Entrada</button>
      </div>

      {!entradas.length ? <Vazio texto="Nenhuma entrada cadastrada." /> : (
        <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-200">
          {entradas.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-neutral-900 truncate">{e.descricao}</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {e.categoria}{e.recorrente ? ` · todo dia ${e.dia}` : ` · ${rotulo({ ano: e.ano, mes: e.mes })}`}
                </div>
              </div>
              <div className="text-sm font-medium text-neutral-900">{brl(e.valor)}</div>
              <button onClick={() => setModal(e)} className="text-neutral-500 hover:text-neutral-800">{"✏️"}</button>
              <button onClick={() => setEntradas(entradas.filter((x) => x.id !== e.id))} className="text-neutral-400 hover:text-red-500">{"×"}</button>
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
        <input className={input} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} placeholder="Ex: Salário" />
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
    <Modal titulo="Lancamento rapido" onFechar={onFechar}>
      <p className="text-xs text-neutral-500 mb-3">
        Envie o print ou cole o texto. Depois confira valor, data, parcelas e a forma de pagamento.
      </p>

      <div className="mb-3 border border-dashed border-neutral-300 rounded-lg p-3 text-center">
        {preview ? (
          <div className="relative">
            <img src={preview} alt="preview" className="max-h-28 mx-auto rounded object-contain" />
            <button type="button" className="absolute top-0 right-0 text-neutral-600 hover:text-red-500 text-sm bg-neutral-100/80 rounded px-1.5" onClick={() => setPreview(null)}>x</button>
          </div>
        ) : (
          <div className="space-y-2 py-1">
            <p className="text-xs text-neutral-500">Foto do comprovante</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <label className={btnSec + " cursor-pointer"}>
                Galeria
                <input type="file" accept="image/*" className="hidden" onChange={onFile} />
              </label>
              <label className={btnSec + " cursor-pointer"}>
                Camera
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
              </label>
            </div>
          </div>
        )}
        {ocrProgresso != null && (
          <p className="text-xs text-neutral-900 mt-2">Lendo imagem... {ocrProgresso}%</p>
        )}
      </div>

      <Campo label="Texto (OCR ou digitado)">
        <textarea
          className={input + " min-h-[72px]"}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole o texto do comprovante ou o que o OCR leu"
        />
      </Campo>

      {!rascunho && (
        <button type="button" className={btn + " w-full mb-3"} disabled={carregando || !texto.trim()} onClick={analisar}>
          {carregando ? "Analisando..." : "Reconhecer"}
        </button>
      )}

      {rascunho && (
        <div className="space-y-3 border border-neutral-200 rounded-xl p-3 mb-3">
          <div className="text-xs text-neutral-900 font-medium">Confirme antes de salvar</div>

          <Campo label="Descricao">
            <input className={input} value={rascunho.descricao} onChange={(e) => setR("descricao", e.target.value)} />
          </Campo>

          <Campo label="Valor da parcela / valor">
            <input className={input} inputMode="decimal" value={rascunho.valor} onChange={(e) => setR("valor", e.target.value)} placeholder="0,00" />
          </Campo>

          <Campo label="Forma de pagamento">
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
          </Campo>

          {rascunho.forma === "credito" && (
            <>
              <Campo label="Cartao">
                {!cartoes.length ? (
                  <p className="text-xs text-red-500">Cadastre um cartao na aba Cartoes.</p>
                ) : (
                  <select className={input} value={rascunho.cartaoId} onChange={(e) => setR("cartaoId", e.target.value)}>
                    <option value="">Selecione...</option>
                    {cartoes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                )}
              </Campo>
              <Campo label="Parcelas">
                <input className={input} type="number" min={1} max={48} value={rascunho.parcelas}
                  onChange={(e) => setR("parcelas", e.target.value)} />
              </Campo>
            </>
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
            <Campo label="Mes (1a parcela)">
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
            Voltar / editar texto
          </button>
        </div>
      )}

      {erro && <p className="text-xs text-red-500 mt-2">{erro}</p>}
    </Modal>
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
      setRapido(true);
      limparQuery();
      return true;
    };

    (async () => {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("share") === "1") setRapido(true); // abre modal enquanto OCR carrega
      await tentarShare();
    })();

    const onMsg = () => { tentarShare(); };
    window.addEventListener("meu-caixa-share-received", onMsg);
    return () => {
      cancelled = true;
      window.removeEventListener("meu-caixa-share-received", onMsg);
    };
  }, []);

  if (!(p1 && p2 && p3 && p4)) return null;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-4 py-5">
        <div className="mb-5">
          <div className="text-base font-semibold">Meu Caixa</div>
        </div>

        <div className="flex gap-1 mb-6 border-b border-neutral-100 overflow-x-auto">
          {ABAS.map((a) => (
            <button key={a.chave} onClick={() => setAba(a.chave)}
              className={`px-3.5 py-2 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
                aba === a.chave ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-700"
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

      <button onClick={() => setRapido(true)} title={"Lançamento rápido"}
        className="fixed bottom-6 right-5 md:right-8 w-14 h-14 rounded-full bg-neutral-900 text-white text-2xl font-light shadow-lg hover:bg-neutral-800 transition-colors flex items-center justify-center z-40">
        +
      </button>

      {rapido && (
        <ModalRapido
          key={arquivoShare ? `share-${arquivoShare.size}-${arquivoShare.name || "img"}` : "manual"}
          entradas={entradas} setEntradas={setEntradas}
          gastos={gastos} setGastos={setGastos}
          cartoes={cartoes} compras={compras} setCompras={setCompras}
          onFechar={() => { setRapido(false); setArquivoShare(null); }}
          notificar={notificar}
          arquivoInicial={arquivoShare}
        />
      )}

      {aviso && (
        <div className="fixed bottom-24 right-5 md:right-8 z-50 bg-neutral-200 border border-neutral-300 text-neutral-900 text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}
