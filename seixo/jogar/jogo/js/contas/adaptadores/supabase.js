const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
const falha = (codigo) => Object.assign(new Error(codigo), { codigo });
function mapearErro(e) {
  if (!e) return falha("desconhecido");
  if (e.codigo) return e;
  const msg = String(e.message || e).toLowerCase(), code = String(e.code || e.status || "");
  const t = msg + " " + code.toLowerCase();
  if (/failed to fetch|networkerror|network request|load failed/.test(msg) || code === "0") return falha("rede");
  if (/invalid login|invalid credentials|email not confirmed/.test(t)) return falha("credenciais");
  if (/already registered|already been registered|user_already_exists/.test(t)) return falha("email_existe");
  if (/invalid.*email|email.*invalid|validation_failed/.test(t)) return falha("email_invalido");
  if (/password/.test(msg) && /(weak|short|least|characters)/.test(msg)) return falha("password_fraca");
  if (/sem_sessao|jwt|not authenticated/.test(t)) return falha("sem_sessao");
  if (/rate limit|too many|429/.test(t)) return falha("limite");
  if (/check constraint|23514|51200|102400/.test(t)) return falha("limite");
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
    const mod = carregar ? await carregar() : await import(CDN);
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
  let prontoGoogle = null;
  const prepararGoogle = (n) => {
    const id = cfg.googleWebClientId;
    if (!(n.ehNativo() && n.SocialLogin) || !id || /^(EXEMPLO|COLOCAR|PLACEHOLDER)/i.test(id)) return null;
    if (!prontoGoogle) prontoGoogle = Promise.resolve(n.SocialLogin.initialize({ google: { webClientId: id, skipAuthOnlyAuthorizationAfterSignIn: true } })).catch((e) => {
      prontoGoogle = null;
      throw e;
    });
    return prontoGoogle;
  };
  return {
    nome: "supabase",
    sessaoAtual() {
      return sessaoCache;
    },
    preparar() {
      return prepararGoogle(nativo || nativoPadrao());
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
        if (!id || /^(EXEMPLO|COLOCAR|PLACEHOLDER)/i.test(id)) throw falha("google_indisponivel");
        let r;
        try {
          await prepararGoogle(n);
          r = await n.SocialLogin.login({ provider: "google", options: {} });
        } catch (e) {
          const m = String(e && (e.message || e.code) || e).toLowerCase();
          throw falha(/cancel|dismiss|user_cancelled|12501/.test(m) ? "cancelado" : /network|timeout|unable to resolve|failed to fetch|offline/.test(m) ? "rede" : /no credential|no_credential|nocredential|no google account/.test(m) ? "google_sem_conta" : "google_falhou");
        }
        const token = r && r.result && r.result.idToken;
        if (!token) throw falha("google_falhou");
        const d2 = ok(await s.auth.signInWithIdToken({ provider: "google", token }));
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
      await s.auth.signOut();
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
