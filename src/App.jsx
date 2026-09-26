export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#eee", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 420, textAlign: "center", lineHeight: 1.6 }}>
        <p style={{ fontSize: 18, fontWeight: 600 }}>Meu Caixa</p>
        <p style={{ color: "#aaa", fontSize: 14, marginTop: 12 }}>
          Para corrigir o Failed to fetch e restaurar o app:
        </p>
        <p style={{ color: "#fbbf24", fontSize: 13, marginTop: 12 }}>
          1. Abra o arquivo App-SEM-FETCH.txt na conversa<br/>
          2. Selecione tudo e copie<br/>
          3. Cole em src/App.jsx no GitHub<br/>
          4. Commit changes
        </p>
      </div>
    </div>
  );
}
