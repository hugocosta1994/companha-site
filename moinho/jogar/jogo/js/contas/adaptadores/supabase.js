const VENDOR = "../../vendor/supabase.js";
const falha = (codigo) => Object.assign(new Error(codigo), { codigo });
function mapearErro(e) {
  if (!e) return falha("desconhecido");
  if (e.codigo) return e;
  const msg = String(e.message || e).toLowerCase(), code = String(e.code || e.status || "");
  const t = msg + " " + code.toLowerCase();
  if (/failed to fetch|networkerror|network request|load failed/.test(msg) || code === "0") return falha("rede");
  if (/email[ _]not[ _]confirmed/.test(t)) return falha("email_nao_confirmado");
  if (/invalid login|invalid credentials/.test(t)) return falha("credenciais");
  if (/already registered|already been registered|user_already_exists/.test(t)) return falha("email_existe");
  if (/invalid.*email|email.*invalid|validation_failed/.test(t)) return falha("email_invalido");
  if (/password/.test(msg) && /(weak|short|least|characters)/.test(msg)) return falha("password_fraca");
  if (/sem_sessao|jwt|not authenticated/.test(t)) return falha("sem_sessao");
  if (/over_email_send_rate_limit|email rate limit|email.*rate/.test(t)) return falha("email_limite");
  if (/rate limit|too many|429/.test(t)) return falha("espera");
  if (/check constraint|51200/.test(t)) return falha("limite");
  return falha("desconhecido");
}
const sessaoDe = (u) => {
  if (!u) return null;
  const m = u.app_metadata || {};
  const p = m.provider || Array.isArray(m.providers) && m.providers[0] || u.identities && u.identities[0] && u.identities[0].provider || "email";
  return { uid: u.id, email: u.email, fornecedor: p };
};
const nativoPadrao = () => {
  const c = globalThis.Capacitor;
  let n = false;
  try {
    n = !!(c && c.isNativePlatform && c.isNativePlatform());
  } catch {
    n = false;
  }
  const P = c && c.Plugins || {};
  let SL = P.SocialLogin;
  if (!SL && n && c.registerPlugin) {
    try {
      SL = c.registerPlugin("SocialLogin");
    } catch {
      SL = null;
    }
  }
  return { ehNativo: () => n, App: P.App, Browser: P.Browser, SocialLogin: SL };
};
function limparSessaoLocal(ls = globalThis.localStorage) {
  try {
    const ks = [];
    for (let i = 0; i < ls.length; i++) ks.push(ls.key(i));
    for (const k of ks) if (/^sb-.*-auth-token/.test(k)) ls.removeItem(k);
  } catch {
  }
}
function criarSupabase(cfg, { cliente = null, carregar = null, nativo = null, tempoLimiteMs = 18e4 } = {}) {
  let c = cliente, sessaoCache = null;
  const obterCliente = async () => {
    if (c) return c;
    const mod = carregar ? await carregar() : await import(new URL(VENDOR, import.meta.url).href);
    c = mod.createClient(cfg.url, cfg.chavePublica, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } });
    return c;
  };
  const env = async (fn) => {
    try {
      return await fn(await obterCliente());
    } catch (e) {
      throw mapearErro(e);
    }
  };
  const ok = ({ data, error }) => {
    if (error) throw mapearErro(error);
    return data;
  };
  const redirect = cfg.redirectUrl || void 0;
  let iniciado = null;
  const iniciarGoogle = (n) => {
    if (!iniciado) iniciado = Promise.resolve(n.SocialLogin.initialize({ google: { webClientId: cfg.googleWebClientId } })).catch((e) => {
      iniciado = null;
      throw e;
    });
    return iniciado;
  };
  return {
    nome: "supabase",
    cliente: () => env(async (s) => s),
    // cliente único partilhado (feedbackTester.js, N-39)
    sessaoAtual() {
      return sessaoCache;
    },
    // Pré-aquece o Credential Manager no arranque (só em Android com cliente Web configurado).
    preparar: async () => {
      const n = nativo || nativoPadrao();
      if (n.ehNativo() && n.SocialLogin && cfg.googleWebClientId) {
        try {
          await iniciarGoogle(n);
        } catch {
        }
      }
    },
    restaurar: () => env(async (s) => {
      const d = ok(await s.auth.getSession());
      sessaoCache = sessaoDe(d && d.session && d.session.user);
      return sessaoCache;
    }),
    criarConta: (email, password) => env(async (s) => {
      const d = ok(await s.auth.signUp({ email, password, options: { emailRedirectTo: redirect } }));
      sessaoCache = d.session ? sessaoDe(d.user) : null;
      return { sessao: sessaoCache, precisaConfirmar: !d.session };
    }),
    entrar: (email, password) => env(async (s) => {
      const d = ok(await s.auth.signInWithPassword({ email, password }));
      sessaoCache = sessaoDe(d.user);
      return sessaoCache;
    }),
    entrarGoogle: () => env(async (s) => {
      const n = nativo || nativoPadrao();
      if (n.ehNativo() && n.SocialLogin) {
        const id = cfg.googleWebClientId;
        if (!id || /^(EXEMPLO|COLOCAR|PLACEHOLDER)/i.test(id)) throw falha("google_sem_id");
        let r;
        try {
          await iniciarGoogle(n);
          r = await n.SocialLogin.login({ provider: "google", options: {} });
        } catch (e) {
          const m = String(e && (e.message || e.code) || e);
          throw falha(/cancel|dismiss|12501|user_cancel/i.test(m) ? "cancelado" : /network|timeout|offline|unable to resolve|failed to fetch/i.test(m) ? "rede" : "google_indisponivel");
        }
        const idToken = r && r.result && r.result.idToken;
        if (!idToken) throw falha("google_indisponivel");
        const d2 = ok(await s.auth.signInWithIdToken({ provider: "google", token: idToken }));
        sessaoCache = sessaoDe(d2 && (d2.user || d2.session && d2.session.user));
        return sessaoCache;
      }
      if (!(n.ehNativo() && n.App && n.Browser && redirect)) {
        ok(await s.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect } }));
        return null;
      }
      const d = ok(await s.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect, skipBrowserRedirect: true } }));
      if (!d || !d.url) throw falha("desconhecido");
      let ouvinte = null, temporizador = null;
      try {
        const volta = new Promise((resolve, reject) => {
          temporizador = setTimeout(() => reject(falha("sem_sessao")), tempoLimiteMs);
          Promise.resolve(n.App.addListener("appUrlOpen", (ev) => {
            const url = String(ev && ev.url || "");
            if (!url.startsWith(redirect)) return;
            const u = new URL(url.replace("#", url.includes("?") ? "&" : "?"));
            if (u.searchParams.get("error") || u.searchParams.get("error_description")) return reject(falha("sem_sessao"));
            const code2 = u.searchParams.get("code");
            if (!code2) return reject(falha("sem_sessao"));
            resolve(code2);
          })).then((h) => {
            ouvinte = h;
          }, reject);
        });
        await n.Browser.open({ url: d.url });
        const code = await volta;
        const r = ok(await s.auth.exchangeCodeForSession(code));
        sessaoCache = sessaoDe(r && (r.user || r.session && r.session.user));
        return sessaoCache;
      } finally {
        clearTimeout(temporizador);
        if (ouvinte && ouvinte.remove) try {
          await ouvinte.remove();
        } catch {
        }
        try {
          await n.Browser.close();
        } catch {
        }
      }
    }),
    // Terminar sessão nunca falha nem fica pendurado: tenta o servidor com limite de tempo e limpa SEMPRE a sessão local.
    sair: async () => {
      sessaoCache = null;
      try {
        const s = await Promise.race([obterCliente(), new Promise((_, rej) => setTimeout(() => rej(new Error("tempo")), 4e3))]);
        await Promise.race([s.auth.signOut({ scope: "local" }), new Promise((r) => setTimeout(r, 4e3))]);
      } catch {
      }
      limparSessaoLocal();
      sessaoCache = null;
    },
    reenviar: (email) => env(async (s) => {
      ok(await s.auth.resend({ type: "signup", email, options: { emailRedirectTo: redirect } }));
    }),
    recuperar: (email) => env(async (s) => {
      ok(await s.auth.resetPasswordForEmail(email, { redirectTo: redirect }));
    }),
    obter: (jogoId) => env(async (s) => {
      const d = ok(await s.from("progresso").select("rev,schema,dados,updated_at").eq("jogo_id", jogoId).maybeSingle());
      return d ? { rev: Number(d.rev), schema: d.schema, dados: d.dados, updatedAt: Date.parse(d.updated_at) || 0 } : null;
    }),
    guardar: (jogoId, schema, base, device, dados) => env(async (s) => {
      const d = ok(await s.rpc("guardar_progresso", { p_jogo: jogoId, p_schema: schema, p_base: base, p_device: device, p_dados: dados }));
      return d == null ? null : Number(d);
    }),
    apagarConta: () => env(async (s) => {
      ok(await s.functions.invoke("apagar-conta", { body: {} }));
      try {
        await s.auth.signOut({ scope: "local" });
      } catch {
      }
      limparSessaoLocal();
      sessaoCache = null;
    }),
    exportar: () => env(async (s) => {
      const u = ok(await s.auth.getUser()), p = ok(await s.from("progresso").select("*"));
      return { email: u && u.user && u.user.email, progresso: p };
    })
  };
}
export {
  criarSupabase,
  limparSessaoLocal,
  mapearErro
};
