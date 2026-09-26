import { useState, useEffect, useCallback } from "react";
import { parseLocal, ocrImagem, parseQuickAdd } from "./ocrHelpers";

// TEMP: full app will be restored - testing push
export default function App() {
  return (
    <div style={{padding:40,background:"#0a0a0a",color:"#fff",minHeight:"100vh",fontFamily:"system-ui"}}>
      <p>Atualizando para corrigir Failed to fetch...</p>
      <p style={{color:"#aaa",fontSize:14}}>Se isso continuar, me avise na conversa.</p>
    </div>
  );
}
