import { useState, useEffect, useCallback } from "react";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-lg font-semibold">Meu Caixa</h1>
        <p className="text-sm text-neutral-400">
          O arquivo do app precisa ser restaurado. Abra o link abaixo, copie o código e cole em src/App.jsx no GitHub.
        </p>
        <a
          className="block text-amber-400 text-sm underline break-all"
          href="https://raw.githubusercontent.com/victormano416-dotcom/meu-caixa/daa3346d19c3efa95d3dcf240f5f341668e91c32/src/App.jsx"
          target="_blank"
          rel="noreferrer"
        >
          Baixar versão estável (Raw)
        </a>
        <p className="text-xs text-neutral-500">
          Depois me avise que eu te passo o passo a passo do OCR de novo.
        </p>
      </div>
    </div>
  );
}
