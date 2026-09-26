export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#eee", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 440, textAlign: "center", lineHeight: 1.5 }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Meu Caixa</p>
        <p style={{ color: "#aaa", fontSize: 14, marginTop: 12 }}>
          O arquivo precisa ser colado de novo. Use o App-OCR.txt da conversa (versao ASCII, nao corrompe acentos).
        </p>
        <p style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
          GitHub edit src/App.jsx → apagar tudo → colar → Commit
        </p>
      </div>
    </div>
  );
}
