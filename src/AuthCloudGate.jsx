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

/** Mesmo projeto Supabase do BANKAI (chave publishable — segura no frontend). */
const FALLBACK_URL = "https://iunyfvtctxwsfdvdspui.supabase.co";
const FALLBACK_KEY = "sb_publishable_ucfSS1KBYv6kKO0OeVzdkg_3r1UoK1T";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-white/30";
const primaryButton =
  "w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 disabled:opacity-50";
const secondaryButton =
  "rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-neutral-300 transition hover:bg-white/10 disabled:opacity-50";

function getLocalData() {
  return Object.fromEntries(
    DATA_KEYS.map((key) => {
      try {
        const value = localStorage.getItem(key);
        return [key, value == null ? EMPTY_DATA[key] : JSON.parse(value)];
      } catch {
        return [key, EMPTY_DATA[key]];
      }
    }),
  );
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
        const { data, error: authError } = await client.auth.signUp({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Conta criada. Se pedir confirmação, abra o e-mail e depois entre aqui.");
        }
      } else {
        const { error: authError } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
      }
    } catch (err) {
      const msg = err?.message || "Não foi possível autenticar.";
      if (/invalid login|invalid credentials/i.test(msg)) {
        setError("E-mail ou senha incorretos.");
      } else if (/already registered|already been registered/i.test(msg)) {
        setError("Este e-mail já tem conta. Use Entrar.");
        setMode("login");
      } else {
        setError(msg);
      }
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
          <h1 className="mt-3 text-2xl font-semibold">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Seus lançamentos ficam na nuvem e sincronizam entre aparelhos.
          </p>
        </div>

        <div className="mb-4 flex rounded-full bg-white/5 p-1">
          <button
            type="button"
            className={`flex-1 rounded-full py-2 text-xs font-medium transition ${
              mode === "login" ? "bg-white text-neutral-900" : "text-neutral-400"
            }`}
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`flex-1 rounded-full py-2 text-xs font-medium transition ${
              mode === "signup" ? "bg-white text-neutral-900" : "text-neutral-400"
            }`}
            onClick={() => {
              setMode("signup");
              setError("");
              setMessage("");
            }}
          >
            Criar conta
          </button>
        </div>

        <form className="space-y-3" onSubmit={submit}>
          <label className="block text-xs text-neutral-400">
            E-mail
            <input
              className={`${inputClass} mt-1.5`}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>
          <label className="block text-xs text-neutral-400">
            Senha
            <input
              className={`${inputClass} mt-1.5`}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          {message && <p className="text-sm text-emerald-300">{message}</p>}
          <button className={primaryButton} disabled={busy} type="submit">
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      </section>
    </main>
  );
}

async function fetchCloudBlob(client, userId) {
  const { data, error } = await client
    .from("dados")
    .select("json")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertCloudBlob(client, userId, payload) {
  const { error } = await client.from("dados").upsert(
    {
      user_id: userId,
      json: payload,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
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
      chain = chain
        .then(async () => {
          if (disposed) return;
          await upsertCloudBlob(client, userId, data);
        })
        .then(() => {
          if (!disposed) setSyncStatus("Sincronizado");
        })
        .catch((error) => {
          if (!disposed) setSyncStatus(`Falha: ${error.message}`);
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
      if (Storage.prototype.setItem !== originalSetItem) {
        Storage.prototype.setItem = originalSetItem;
      }
    };
  }, [active, client, userId, setSyncStatus]);
}

export default function AuthCloudGate({ children }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

  const client = useMemo(() => {
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }, [supabaseUrl, supabaseKey]);

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
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
      setCloudReady(false);
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

    (async () => {
      try {
        await client.from("perfis").upsert(
          {
            id: session.user.id,
            nome: session.user.user_metadata?.full_name || "",
            email: session.user.email || "",
          },
          { onConflict: "id" },
        );

        let row = await fetchCloudBlob(client, session.user.id);
        if (cancelled) return;

        if (!row) {
          await upsertCloudBlob(client, session.user.id, EMPTY_DATA);
          row = await fetchCloudBlob(client, session.user.id);
        }
        if (cancelled) return;

        const remote = row?.json && typeof row.json === "object" ? row.json : null;
        const hasRemoteData =
          remote && DATA_KEYS.some((k) => Array.isArray(remote[k]) && remote[k].length > 0);

        const local = getLocalData();
        const hasLocalData = DATA_KEYS.some(
          (k) => Array.isArray(local[k]) && local[k].length > 0,
        );

        if (!hasRemoteData && hasLocalData) {
          setNeedsImportChoice(true);
          setCloudLoading(false);
          return;
        }

        if (remote) applyLocalData({ ...EMPTY_DATA, ...remote });
        setCloudReady(true);
        setSyncStatus("Sincronizado");
        setCloudLoading(false);
      } catch (error) {
        if (!cancelled) {
          setSetupError(error.message || "Falha ao carregar a nuvem.");
          setCloudLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, session?.user?.id]);

  const initializeCloud = useCallback(
    async (data) => {
      if (!client || !session?.user?.id) return;
      setCloudLoading(true);
      setSetupError("");
      try {
        applyLocalData(data);
        await upsertCloudBlob(client, session.user.id, data);
        setNeedsImportChoice(false);
        setCloudReady(true);
        setSyncStatus("Sincronizado");
      } catch (error) {
        setSetupError(error.message || "Falha ao preparar a nuvem.");
      } finally {
        setCloudLoading(false);
      }
    },
    [client, session?.user?.id],
  );

  useCloudSync(
    client,
    session?.user?.id,
    Boolean(client && session && cloudReady && !needsImportChoice),
    setSyncStatus,
  );

  if (!client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-neutral-100">
        <p className="text-sm text-red-300">Cliente Supabase indisponível.</p>
      </main>
    );
  }

  // Compartilhar do banco: não espera login/nuvem (regressão que quebrou o OCR)
  const fromShare =
    typeof window !== "undefined" &&
    (window.__MC_FROM_SHARE === true ||
      Boolean(window.__MC_SHARE_PAYLOAD) ||
      new URLSearchParams(window.location.search).get("share") === "1" ||
      new URLSearchParams(window.location.search).get("shareError") === "1");

  if (fromShare) {
    return children;
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm text-neutral-400">
        Carregando…
      </main>
    );
  }

  if (!session) return <LoginScreen client={client} />;

  if (cloudLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-sm text-neutral-400">
        Carregando seus dados na nuvem…
      </main>
    );
  }

  if (setupError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-neutral-100">
        <section className="max-w-lg rounded-3xl border border-white/10 bg-neutral-900 p-6">
          <h1 className="text-xl font-semibold">Não foi possível acessar a nuvem</h1>
          <p role="alert" className="mt-3 text-sm text-red-300">
            {setupError}
          </p>
          <button className={`${secondaryButton} mt-5`} onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
          <button
            className={`${secondaryButton} ml-2 mt-5`}
            onClick={() => client.auth.signOut()}
          >
            Sair
          </button>
        </section>
      </main>
    );
  }

  if (needsImportChoice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 text-neutral-100">
        <section className="max-w-md rounded-3xl border border-white/10 bg-neutral-900 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Primeiro acesso</p>
          <h1 className="mt-3 text-xl font-semibold">Levar dados para a nuvem?</h1>
          <p className="mt-3 text-sm leading-6 text-neutral-400">
            Esta conta ainda não tem lançamentos na nuvem. Você pode importar o que está neste
            aparelho ou começar zerado.
          </p>
          <div className="mt-5 space-y-3">
            <button
              className={primaryButton}
              disabled={cloudLoading}
              onClick={() => initializeCloud(getLocalData())}
            >
              Importar dados deste aparelho
            </button>
            <button
              className={`${secondaryButton} w-full`}
              disabled={cloudLoading}
              onClick={() => initializeCloud(EMPTY_DATA)}
            >
              Começar com a caixa vazia
            </button>
          </div>
        </section>
      </main>
    );
  }

  // Barra de e-mail/sincronizado oculta — sessão e sync continuam em segundo plano.
  return children;
}
