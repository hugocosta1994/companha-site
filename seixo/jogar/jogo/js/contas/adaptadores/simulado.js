const UTILIZADOR_TESTE = { email: "teste@exemplo.pt", password: "Teste1234!" };
function armazemMemoria() {
  const m = /* @__PURE__ */ new Map();
  return {
    get: (k) => m.has(k) ? m.get(k) : null,
    set: (k, v) => {
      m.set(k, String(v));
    },
    remove: (k) => {
      m.delete(k);
    },
    chaves: () => [...m.keys()]
  };
}
const falha = (codigo) => Object.assign(new Error(codigo), { codigo });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function criarSimulado({ servidor = armazemMemoria(), sessao: ses = servidor, relogio = () => Date.now() } = {}) {
  const K = "contas-sim:db", KS = "contas-sim:sessao";
  const falhas = { rede: false, latenciaMs: 0, conflitoNaProxima: false };
  const vazio = () => ({ utilizadores: {}, progresso: {} });
  const ler = () => {
    try {
      return JSON.parse(servidor.get(K)) || vazio();
    } catch {
      return vazio();
    }
  };
  const gravar = (db) => servidor.set(K, JSON.stringify(db));
  const porta = async () => {
    if (falhas.latenciaMs) await new Promise((r) => setTimeout(r, falhas.latenciaMs));
    if (falhas.rede) throw falha("rede");
  };
  const uid = (email) => "u-" + String(email).toLowerCase();
  const atual = () => {
    try {
      return JSON.parse(ses.get(KS));
    } catch {
      return null;
    }
  };
  const exigir = () => {
    const s = atual();
    if (!s) throw falha("sem_sessao");
    return s;
  };
  const abrir = (email, fornecedor = "email") => {
    const s = { uid: uid(email), email: String(email).toLowerCase(), fornecedor };
    ses.set(KS, JSON.stringify(s));
    return s;
  };
  const db0 = ler();
  if (!db0.utilizadores[uid(UTILIZADOR_TESTE.email)]) {
    db0.utilizadores[uid(UTILIZADOR_TESTE.email)] = { ...UTILIZADOR_TESTE };
    gravar(db0);
  }
  return {
    nome: "simulado",
    __controlo: {
      falhar(o = {}) {
        Object.assign(falhas, { rede: false, latenciaMs: 0, conflitoNaProxima: false }, o);
      },
      lerDb: ler
    },
    sessaoAtual() {
      return atual();
    },
    async criarConta(email, password, { exigirConfirmacao = false } = {}) {
      await porta();
      if (!EMAIL.test(email || "")) throw falha("email_invalido");
      if (!password || password.length < 8) throw falha("password_fraca");
      const db = ler();
      if (db.utilizadores[uid(email)]) throw falha("email_existe");
      db.utilizadores[uid(email)] = { email: String(email).toLowerCase(), password };
      gravar(db);
      if (exigirConfirmacao) return { sessao: null, precisaConfirmar: true };
      return { sessao: abrir(email), precisaConfirmar: false };
    },
    async entrar(email, password) {
      await porta();
      const u = ler().utilizadores[uid(email || "")];
      if (!u || u.password !== password) throw falha("credenciais");
      return abrir(email);
    },
    async entrarGoogle() {
      await porta();
      return abrir("google@exemplo.pt", "google");
    },
    async sair() {
      ses.remove(KS);
    },
    async recuperar(email) {
      await porta();
      if (!EMAIL.test(email || "")) throw falha("email_invalido");
    },
    async obter(jogoId) {
      await porta();
      const s = exigir();
      const l = ler().progresso[s.uid + "|" + jogoId];
      return l ? { rev: l.rev, schema: l.schema, dados: l.dados, updatedAt: l.updatedAt } : null;
    },
    async guardar(jogoId, schema, base, device, dados) {
      await porta();
      const s = exigir();
      if (JSON.stringify(dados).length > 51200) throw falha("limite");
      const db = ler(), k = s.uid + "|" + jogoId, l = db.progresso[k];
      if (falhas.conflitoNaProxima) {
        falhas.conflitoNaProxima = false;
        if (l) {
          l.rev += 1;
          gravar(db);
        }
        return null;
      }
      if (l ? l.rev !== base : base !== 0) return null;
      const rev = l ? l.rev + 1 : 1;
      db.progresso[k] = { rev, schema, device, dados, updatedAt: relogio() };
      gravar(db);
      return rev;
    },
    async apagarConta() {
      await porta();
      const s = exigir(), db = ler();
      delete db.utilizadores[s.uid];
      for (const k of Object.keys(db.progresso)) if (k.startsWith(s.uid + "|")) delete db.progresso[k];
      gravar(db);
      ses.remove(KS);
    },
    async exportar() {
      await porta();
      const s = exigir(), db = ler();
      const progresso = Object.entries(db.progresso).filter(([k]) => k.startsWith(s.uid + "|")).map(([k, v]) => ({ jogo_id: k.split("|")[1], ...v }));
      return { email: s.email, progresso };
    }
  };
}
export {
  UTILIZADOR_TESTE,
  armazemMemoria,
  criarSimulado
};
