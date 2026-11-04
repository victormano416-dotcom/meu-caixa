import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const DATA_KEYS = ["mc_entradas", "mc_gastos", "mc_cartoes", "mc_compras", "mc_perfil"];
const EMPTY_DATA = {
  mc_entradas: [],
  mc_gastos: [],
  mc_cartoes: [],
  mc_compras: [],
  mc_perfil: { nome: "BANKAI", foto: "" },
};
const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white/30";
const primaryButton = "w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50";
const secondaryButton = "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-neutral-300 transition hover:bg-white/10 disabled:opacity-50";

function getLocalData() {
  return Object.fromEntries(DATA_KEYS.map((key) => {
    try {
      const value = localStorage.getItem(key);
      return [key, value == null ? EMPTY_DATA[key] : JSON.parse(value)];
    } catch {
      return [key, EMPTY_DATA[key]];
    }
  }));
}

function applyLocalData(data) {
  DATA_KEYS.forEach((key) => {
    const value = data?.[key];
    if (value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  });
}

function LoginScreen({ client }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      if (mode === "signup") {
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        if (!data.session) setMessage("Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.");
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err.message || "Não foi possível autenticar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-neutral-950 px-4 py-10 text-neutral-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_55%)]" />
      <section className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-neutral-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">Meu Caixa · BANKAI</p>
          <h1 className="mt-3 text-2xl font-semibold">{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h1>
          <p className="mt-2 text-sm text-neutral-400">Acesse seus dados financeiros com segurança em seus dispositivos.</p>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <label className="block text-xs text-neutral-400">E-mail
            <input className={`${inputClass} mt-1.5`} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
          </label>
          <label className="block text-xs text-neutral-400">Senha
            <input className={`${inputClass} mt-1.5`} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" />
          </label>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
          <button className={`${primaryButton} !mt-5`} type="submit" disabled={busy}>{busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button className="mt-4 w-full text-sm text-neutral-400 hover:text-white" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); setError(""); }}>
          {mode === "login" ? "Ainda não tem conta? Criar conta" : "Já tem uma conta? Entrar"}
        </button>
        <p className="mt-6 text-center text-[11px] leading-5 text-neutral-600">Seus lançamentos e perfil serão separados por conta e sincronizados na nuvem.</p>
      </section>
    </main>
  );
}

function CloudSetupMessage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-neutral-100">
      <section className="max-w-lg rounded-3xl border border-white/10 bg-neutral-900 p-6">
        <h1 className="text-xl font-semibold">Configure o Supabase</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-400">Para ativar login e sincronização, configure <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> nas variáveis de ambiente do projeto e crie a tabela indicada no README.</p>
      </section>
    </main>
  );
}

function useCloudSync(client, userId, active, setSyncStatus) {
  useEffect(() => {
    if (!active || !client || !userId) return undefined;
    const originalSetItem = Storage.prototype.setItem;
    let timer;
    let chain = Promise.resolve();
    let disposed = false;

    const save = () => {
      const data = getLocalData();
      setSyncStatus("Sincronizando…");
      chain = chain.then(async () => {
        if (disposed) return;
        const { error } = await client.from("user_data").upsert(
          { user_id: userId, data, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
        if (error) throw error;
      }).then(() => {
        if (!disposed) setSyncStatus("Sincronizado");
      }).catch((error) => {
        if (!disposed) setSyncStatus(`Falha na sincronização: ${error.message}`);
      });
    };

    Storage.prototype.setItem = function (key, value) {
      originalSetItem.call(this, key, value);
      if (this === localStorage && DATA_KEYS.includes(String(key))) {
        clearTimeout(timer);
        timer = setTimeout(save, 700);
      }
    };

    const syncNow = () => {
      clearTimeout(timer);
      save();
    };
    window.addEventListener("online", syncNow);
    window.addEventListener("pagehide", syncNow);

    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("online", syncNow);
      window.removeEventListener("pagehide", syncNow);
      if (Storage.prototype.setItem !== originalSetItem) Storage.prototype.setItem = originalSetItem;
    };
  }, [active, client, userId, setSyncStatus]);
}

export default function AuthCloudGate({ children }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const client = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
  }, [supabaseUrl, supabaseKey]);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudData, setCloudData] = useState(null);
  const [needsImportChoice, setNeedsImportChoice] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [syncStatus, setSyncStatus] = useState("Carregando conta…");

  useEffect(() => {
    if (!client) {
      setAuthLoading(false);
      return undefined;
    }
    let alive = true;
    client.auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) setSetupError(error.message);
      setSession(data?.session || null);
      setAuthLoading(false);
    });
    const { data: subscription } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setCloudData(null);
      setNeedsImportChoice(false);
      setSetupError("");
    });
    return () => {
      alive = false;
      subscription.subscription.unsubscribe();
    };
  }, [client]);

  useEffect(() => {
    if (!client || !session?.user?.id) return undefined;
    let cancelled = false;
    setCloudLoading(true);
    setSetupError("");
    client.from("user_data").select("data").eq("user_id", session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        if (data) {
          applyLocalData(data.data || {});
          setCloudData(data.data || EMPTY_DATA);
          setSyncStatus("Sincronizado");
        } else {
          setNeedsImportChoice(true);
        }
      })
      .catch((error) => { if (!cancelled) setSetupError(error.message || "Falha ao carregar seus dados."); })
      .finally(() => { if (!cancelled) setCloudLoading(false); });
    return () => { cancelled = true; };
  }, [client, session?.user?.id]);

  const initializeCloud = useCallback(async (data) => {
    if (!client || !session?.user?.id) return;
    setCloudLoading(true);
    setSetupError("");
    try {
      const { error } = await client.from("user_data").upsert(
        { user_id: session.user.id, data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      applyLocalData(data);
      setCloudData(data);
      setNeedsImportChoice(false);
      setSyncStatus("Sincronizado");
    } catch (error) {
      setSetupError(error.message || "Não foi possível iniciar o armazenamento na nuvem.");
    } finally {
      setCloudLoading(false);
    }
  }, [client, session?.user?.id]);

  useCloudSync(client, session?.user?.id, !!cloudData && !needsImportChoice, setSyncStatus);

  if (!client) return <CloudSetupMessage />;
  if (authLoading) return <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm text-neutral-400">Carregando…</main>;
  if (!session) return <LoginScreen client={client} />;
  if (cloudLoading) return <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm text-neutral-400">Carregando seus dados…</main>;
  if (setupError) return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-neutral-100">
      <section className="max-w-lg rounded-3xl border border-white/10 bg-neutral-900 p-6">
        <h1 className="text-xl font-semibold">Não foi possível acessar a nuvem</h1>
        <p role="alert" className="mt-3 text-sm text-red-300">{setupError}</p>
        <p className="mt-3 text-xs leading-5 text-neutral-500">Confira a configuração do Supabase, a tabela <code>user_data</code> e as políticas RLS.</p>
        <button className={`${secondaryButton} mt-5`} onClick={() => window.location.reload()}>Tentar novamente</button>
      </section>
    </main>
  );
  if (needsImportChoice) return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-neutral-100">
      <section className="max-w-md rounded-3xl border border-white/10 bg-neutral-900 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Primeiro acesso</p>
        <h1 className="mt-3 text-xl font-semibold">Prepare seus dados na nuvem</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-400">Esta conta ainda não tem dados sincronizados. Você pode importar os lançamentos salvos neste aparelho ou iniciar uma caixa vazia. A importação só acontece após sua escolha.</p>
        {setupError && <p role="alert" className="mt-3 text-sm text-red-300">{setupError}</p>}
        <div className="mt-5 space-y-3">
          <button className={primaryButton} disabled={cloudLoading} onClick={() => initializeCloud(getLocalData())}>Importar dados deste aparelho</button>
          <button className={secondaryButton + " w-full"} disabled={cloudLoading} onClick={() => initializeCloud(EMPTY_DATA)}>Começar com a caixa vazia</button>
        </div>
      </section>
    </main>
  );

  return (
    <>
      <div className="relative z-50 mx-auto flex max-w-2xl items-center justify-between gap-3 border-b border-white/10 bg-neutral-950 px-4 py-2 text-xs text-neutral-400">
        <span className="min-w-0 truncate">{session.user.email}</span>
        <span className="shrink-0" role="status">{syncStatus}</span>
        <button className="shrink-0 text-neutral-300 hover:text-white" onClick={() => client.auth.signOut()}>Sair</button>
      </div>
      {children}
    </>
  );
}
