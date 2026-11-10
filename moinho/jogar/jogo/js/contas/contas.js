import { lerConfig } from "./config.js";
import { criarSimulado, armazemMemoria } from "./adaptadores/simulado.js";
import { criarSupabase, limparSessaoLocal } from "./adaptadores/supabase.js";
import {
  LIMITE_BYTES,
  BACKOFF_MS,
  lerDoc,
  gravarDoc,
  lerCopia,
  gravarCopia,
  deviceId,
  tamanho,
  reconciliar
} from "./sync.js";
const VERSAO = "1.0.0";
const CODIGOS = ["rede", "credenciais", "email_existe", "email_invalido", "password_fraca", "cancelado", "sem_sessao", "conflito", "limite", "email_limite", "espera", "email_nao_confirmado", "google_sem_id", "google_indisponivel", "desconhecido"];
const err = (e) => ({ ok: false, erro: { codigo: CODIGOS.includes(e && e.codigo) ? e.codigo : "desconhecido" } });
function armazemLocal() {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      ls.setItem("contas:t", "1");
      ls.removeItem("contas:t");
      return {
        get: (k) => ls.getItem(k),
        set: (k, v) => ls.setItem(k, v),
        remove: (k) => ls.removeItem(k),
        chaves: () => Array.from({ length: ls.length }, (_, i) => ls.key(i))
      };
    }
  } catch {
  }
  return armazemMemoria();
}
function criarContas() {
  let o = null, adaptador = null, armazem = null, timer = null, falhas = 0, aSincronizar = null;
  const est = { sessao: null, sync: "inativo", conflito: null };
  const emitir = () => {
    try {
      o && o.aoMudar && o.aoMudar({ ...est });
    } catch {
    }
  };
  const mudar = (p) => {
    Object.assign(est, p);
    emitir();
  };
  const tem = () => !!(o && adaptador);
  function cancelarTimer() {
    if (timer != null) {
      (o.clearTimer || clearTimeout)(timer);
      timer = null;
    }
  }
  function agendar(ms) {
    if (!tem()) return;
    cancelarTimer();
    timer = (o.setTimer || setTimeout)(() => {
      timer = null;
      self.sincronizar();
    }, ms);
  }
  const self = {
    // opts: { jogoId, schema, merge, aoMudar, aoAplicar, armazem, adaptador, config, debounceMs, backoffMs, setTimer, clearTimer }
    async iniciar(opts) {
      o = { schema: 1, debounceMs: 3e4, backoffMs: BACKOFF_MS, ...opts };
      armazem = o.armazem || armazemLocal();
      adaptador = o.adaptador || null;
      try {
        if (!adaptador) {
          const cfg = o.config || lerConfig();
          if (cfg.fornecedor === "simulado") adaptador = criarSimulado({ servidor: armazem });
          else if (cfg.fornecedor === "supabase") adaptador = criarSupabase(cfg);
        }
        if (adaptador && adaptador.restaurar) await adaptador.restaurar();
      } catch {
      }
      est.sessao = adaptador ? adaptador.sessaoAtual() : null;
      est.sync = adaptador ? "ok" : "inativo";
      est.conflito = null;
      if (typeof globalThis.addEventListener === "function") {
        globalThis.addEventListener("online", () => self.sincronizar());
        globalThis.addEventListener("pagehide", () => self.sincronizar());
        globalThis.addEventListener("focus", () => self.sincronizar());
        globalThis.addEventListener("visibilitychange", () => {
          if (globalThis.document && globalThis.document.visibilityState === "hidden") self.sincronizar();
        });
      }
      emitir();
      return { ok: true, ativo: !!adaptador };
    },
    estado() {
      return { ...est };
    },
    ativo: () => tem(),
    clienteSupabase() {
      return adaptador && adaptador.cliente ? adaptador.cliente() : Promise.resolve(null);
    },
    // N-39
    async criarConta(email, password) {
      if (!tem()) return err({ codigo: "desconhecido" });
      try {
        const r = await adaptador.criarConta(email, password);
        est.sessao = r.sessao || null;
        emitir();
        if (r.sessao) await self.sincronizar();
        return { ok: true, precisaConfirmar: !!r.precisaConfirmar };
      } catch (e) {
        return err(e);
      }
    },
    async entrar(email, password) {
      if (!tem()) return err({ codigo: "desconhecido" });
      try {
        est.sessao = await adaptador.entrar(email, password);
        emitir();
      } catch (e) {
        return err(e);
      }
      await self.sincronizar();
      return { ok: true };
    },
    async preparar() {
      try {
        if (tem() && adaptador.preparar) await adaptador.preparar();
      } catch {
      }
    },
    async entrarComGoogle() {
      if (!tem()) return err({ codigo: "desconhecido" });
      try {
        const s = await adaptador.entrarGoogle();
        if (s) {
          est.sessao = s;
          emitir();
          await self.sincronizar();
        }
        return { ok: true };
      } catch (e) {
        return err(e);
      }
    },
    async reenviarConfirmacao(email) {
      if (!tem() || !adaptador.reenviar) return err({ codigo: "desconhecido" });
      try {
        await adaptador.reenviar(email);
        return { ok: true };
      } catch (e) {
        return err(e);
      }
    },
    async recuperarPassword(email) {
      if (!tem()) return err({ codigo: "desconhecido" });
      try {
        await adaptador.recuperar(email);
        return { ok: true };
      } catch (e) {
        return err(e);
      }
    },
    async sair() {
      if (!tem()) {
        limparSessaoLocal();
        return { ok: true };
      }
      cancelarTimer();
      try {
        await adaptador.sair();
      } catch {
      }
      const d = lerDoc(armazem, o.jogoId);
      gravarDoc(armazem, o.jogoId, { ...d, base: 0, sujo: d.rev > 0 });
      mudar({ sessao: null, sync: "ok", conflito: null });
      return { ok: true };
    },
    async exportar() {
      if (!tem()) return err({ codigo: "sem_sessao" });
      try {
        return { ok: true, json: JSON.stringify(await adaptador.exportar(), null, 2) };
      } catch (e) {
        return err(e);
      }
    },
    async apagarConta(password = null, { manterLocal = true } = {}) {
      if (!tem() || !est.sessao) return err({ codigo: "sem_sessao" });
      try {
        if (password != null) await adaptador.entrar(est.sessao.email, password);
        await adaptador.apagarConta();
      } catch (e) {
        return err(e);
      }
      cancelarTimer();
      for (const k of armazem.chaves()) {
        if (k.startsWith("contas:") && k !== "contas:" + o.jogoId) armazem.remove(k);
      }
      if (manterLocal) {
        const d = lerDoc(armazem, o.jogoId);
        gravarDoc(armazem, o.jogoId, { ...d, base: 0, sujo: d.rev > 0 });
      } else armazem.remove("contas:" + o.jogoId);
      mudar({ sessao: null, sync: "ok", conflito: null });
      return { ok: true };
    },
    // Síncrono e barato: grava local já e agenda envio.
    guardar(dados) {
      if (!o) return { ok: false, erro: { codigo: "desconhecido" } };
      if (tamanho(dados) > LIMITE_BYTES) return { ok: false, erro: { codigo: "limite" } };
      const d = lerDoc(armazem, o.jogoId);
      gravarDoc(armazem, o.jogoId, { ...d, schema: o.schema, rev: d.rev + 1, sujo: true, updatedAt: Date.now(), dados });
      if (tem() && est.sessao) agendar(o.debounceMs);
      return { ok: true };
    },
    async carregar() {
      if (!o) return null;
      const d = lerDoc(armazem, o.jogoId);
      if (tem() && est.sessao) self.sincronizar();
      return d.dados;
    },
    // Reconciliação (§ 4.2) e envio. Pode ser chamada diretamente (testes, botão «sincronizar»).
    async sincronizar() {
      if (!tem() || !est.sessao) return { ok: true, resultado: "sem_sessao" };
      if (aSincronizar) return aSincronizar;
      aSincronizar = (async () => {
        cancelarTimer();
        mudar({ sync: "a_sincronizar" });
        const r = await reconciliar({ adaptador, armazem, jogoId: o.jogoId, schema: o.schema, merge: o.merge, device: deviceId(armazem) });
        if (r.resultado === "conflito") {
          falhas = 0;
          mudar({ sync: "erro", conflito: r.conflito });
          return { ok: false, erro: { codigo: "conflito" }, resultado: "conflito" };
        }
        if (r.resultado === "erro") {
          const rede = r.erro.codigo === "rede";
          mudar({ sync: rede ? "offline" : "erro" });
          if (rede) {
            const b = o.backoffMs;
            agendar(b[Math.min(falhas, b.length - 1)]);
            falhas++;
          }
          return { ok: false, erro: r.erro, resultado: "erro" };
        }
        falhas = 0;
        if (r.aplicar !== void 0 && o.aoAplicar) {
          try {
            o.aoAplicar(r.aplicar);
          } catch {
          }
        }
        mudar({ sync: "ok", conflito: null });
        return { ok: true, resultado: r.resultado };
      })();
      try {
        return await aSincronizar;
      } finally {
        aSincronizar = null;
      }
    },
    async resolverConflito(escolha) {
      const c = est.conflito;
      if (!c || !tem()) return { ok: false, erro: { codigo: "desconhecido" } };
      const d = lerDoc(armazem, o.jogoId);
      if (escolha === "nuvem") {
        gravarCopia(armazem, o.jogoId, { dados: c.local, em: Date.now() });
        gravarDoc(armazem, o.jogoId, { ...d, dados: c.remoto, base: c.remotoRev, sujo: false, rev: Math.max(d.rev, 1) });
        mudar({ conflito: null, sync: "ok" });
        if (o.aoAplicar) {
          try {
            o.aoAplicar(c.remoto);
          } catch {
          }
        }
        return { ok: true };
      }
      gravarCopia(armazem, o.jogoId, { dados: c.remoto, em: Date.now() });
      gravarDoc(armazem, o.jogoId, { ...d, base: c.remotoRev, sujo: true });
      mudar({ conflito: null });
      return self.sincronizar();
    },
    copiaAnterior() {
      return o ? lerCopia(armazem, o.jogoId) : null;
    },
    // Só com fornecedor simulado: injeção de falhas para testes.
    get __sim() {
      return adaptador && adaptador.__controlo ? adaptador.__controlo : null;
    }
  };
  return self;
}
const contas = criarContas();
export {
  CODIGOS,
  VERSAO,
  armazemLocal,
  contas,
  criarContas
};
