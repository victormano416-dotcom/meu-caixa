import { useState, useEffect, useCallback } from "react";
import { parseLocal, ocrImagem, parseQuickAdd } from "./ocrHelpers";
import { consumirCompartilhamento } from "./shareQueue";

/* ---------------- constantes ---------------- */

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const CATEGORIAS = ["Casa", "Alimentação", "Transporte", "Estudos", "Lazer", "Compras", "Saúde", "Outros"];
const COR_CATEGORIA = {
  Casa: "bg-sky-400",
  "Alimentação": "bg-amber-400",
  Transporte: "bg-orange-400",
  Estudos: "bg-violet-400",
  Lazer: "bg-pink-400",
  Compras: "bg-emerald-400",
  "Saúde": "bg-red-400",
  Outros: "bg-neutral-400",
};
const CAT_ENTRADA = ["Salário", "Renda extra", "Freelance", "Investimentos", "Outros"];

const ABAS = [
  { chave: "inicio", nome: "Inicio" },
  { chave: "entradas", nome: "Entradas" },
  { chave: "gastos", nome: "Gastos" },
  { chave: "cartoes", nome: "Cartoes" },
  { chave: "monitoramento", nome: "Monitoramento" },
];
