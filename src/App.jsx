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

// TEMPORARY: full app body is being restored from local artifact.
// If you see this message, wait 1 minute and hard-refresh.
export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-3">
        <p className="text-lg font-semibold">Meu Caixa</p>
        <p className="text-sm text-neutral-400">Restaurando o app… atualize a página em instantes.</p>
      </div>
    </div>
  );
}
