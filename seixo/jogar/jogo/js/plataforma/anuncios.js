import { emitir as emitirGlobal } from "../eventos.js";
import { CONFIG } from "../config.js";
const IDS_TESTE = Object.freeze({
  appId: "ca-app-pub-3940256099942544~3347511713",
  recompensa: "ca-app-pub-3940256099942544/5224354917",
  intersticial: "ca-app-pub-3940256099942544/1033173712"
});
const emRelease = (cfg = {}) => cfg.RELEASE === true && !!cfg.IDS_REAIS;
const idsAnuncios = (cfg = {}) => emRelease(cfg) ? cfg.IDS_REAIS : IDS_TESTE;
function criarStub(o = {}) {
  const e = { consentimento: "obtido", carrega: true, resultado: "ganhou", ...o };
  return {
    tipo: "stub",
    estado: e,
    async pedirConsentimento() {
      return { estado: e.consentimento, opcoesPrivacidade: !!e.opcoesPrivacidade };
    },
    async abrirFormularioPrivacidade() {
      return { estado: e.consentimento };
    },
    async inicializar() {
    },
    async carregarRecompensa() {
      if (!e.carrega) throw new Error("sem_anuncio");
    },
    async mostrarRecompensa() {
      return { ganhou: e.resultado === "ganhou", motivo: e.resultado === "ganhou" ? "ok" : e.resultado };
    },
    async carregarIntersticial() {
      if (!e.carrega) throw new Error("sem_anuncio");
    },
    async mostrarIntersticial() {
      return { mostrado: e.intersticial !== "falha" };
    }
  };
}
function criarAdMob(AdMob, ids = IDS_TESTE, teste = ids === IDS_TESTE, debugGeography = 0) {
  const obtido = (s) => s === "OBTAINED" || s === "NOT_REQUIRED" ? "obtido" : "recusado";
  return {
    tipo: "admob",
    async pedirConsentimento() {
      const info = await AdMob.requestConsentInfo({ debugGeography, tagForUnderAgeOfConsent: false });
      const opcoesPrivacidade2 = info.privacyOptionsRequirementStatus === "REQUIRED";
      if (info.isConsentFormAvailable && info.status === "REQUIRED") {
        const r = obtido((await AdMob.showConsentForm()).status);
        return { estado: r, opcoesPrivacidade: opcoesPrivacidade2 };
      }
      return { estado: obtido(info.status), opcoesPrivacidade: opcoesPrivacidade2 };
    },
    async abrirFormularioPrivacidade() {
      var _a;
      return { estado: obtido((_a = await AdMob.showPrivacyOptionsForm()) == null ? void 0 : _a.status) };
    },
    async inicializar() {
      await AdMob.initialize({ initializeForTesting: teste });
    },
    async carregarRecompensa() {
      await AdMob.prepareRewardVideoAd({ adId: ids.recompensa, isTesting: teste });
    },
    async carregarIntersticial() {
      await AdMob.prepareInterstitial({ adId: ids.intersticial, isTesting: teste });
    },
    async mostrarIntersticial() {
      await AdMob.showInterstitial();
      return { mostrado: true };
    },
    async mostrarRecompensa() {
      var _a;
      let ganhou = false;
      let ouvinte;
      try {
        ouvinte = await AdMob.addListener("onRewardedVideoAdReward", () => {
          ganhou = true;
        });
        await AdMob.showRewardVideoAd();
      } finally {
        try {
          await ((_a = ouvinte == null ? void 0 : ouvinte.remove) == null ? void 0 : _a.call(ouvinte));
        } catch {
        }
      }
      return { ganhou, motivo: ganhou ? "ok" : "fechado_cedo" };
    }
  };
}
function comTempo(p, ms) {
  let t;
  return Promise.race([p, new Promise((_, rej) => {
    t = setTimeout(() => rej(new Error("tempo")), ms);
  })]).finally(() => clearTimeout(t));
}
function criarAnuncios(opcoes = {}) {
  const emitir = opcoes.emitir || emitirGlobal;
  const cfg = opcoes.config || CONFIG.ANUNCIOS || {};
  const semAnuncios = opcoes.semAnuncios || (() => false);
  const impl = opcoes.impl || criarStub();
  const prontos = /* @__PURE__ */ new Set();
  let consentimento = "desconhecido";
  let promessaIniciar = null;
  let sdkPronto = false;
  let opcoesPrivacidade2 = false;
  const seguro = async (f, padrao) => {
    try {
      return await f();
    } catch (e) {
      return padrao(e);
    }
  };
  const mudar = (novo) => {
    if (novo !== consentimento) {
      consentimento = novo;
      emitir("consentimento:mudou", { estado: novo });
    }
  };
  function iniciar2() {
    if (promessaIniciar) return promessaIniciar;
    promessaIniciar = (async () => {
      if (semAnuncios()) return { ativo: false, motivo: "sem_anuncios" };
      const pedido = Promise.resolve().then(() => impl.pedirConsentimento());
      const r = await seguro(() => {
        var _a;
        return comTempo(pedido, (_a = cfg.UMP_TEMPO_MS) != null ? _a : 3e3);
      }, () => ({ estado: "desconhecido" }));
      if (r.estado === "desconhecido") {
        pedido.then(async (t) => {
          if (!t || sdkPronto || semAnuncios()) return;
          opcoesPrivacidade2 = !!t.opcoesPrivacidade;
          mudar(t.estado);
          if (t.estado === "obtido") sdkPronto = await seguro(async () => {
            await impl.inicializar();
            return true;
          }, () => false);
        }, () => {
        });
      }
      opcoesPrivacidade2 = !!r.opcoesPrivacidade;
      mudar(r.estado);
      if (consentimento !== "obtido") return { ativo: false, motivo: "sem_consentimento" };
      sdkPronto = await seguro(async () => {
        await impl.inicializar();
        return true;
      }, () => false);
      return { ativo: sdkPronto, motivo: sdkPronto ? "ok" : "sdk" };
    })();
    return promessaIniciar;
  }
  const podeMostrar2 = () => !semAnuncios() && consentimento === "obtido" && sdkPronto;
  async function abrirPrivacidade2() {
    const r = await seguro(() => impl.abrirFormularioPrivacidade(), () => null);
    if (r) {
      mudar(r.estado);
      if (!sdkPronto && r.estado === "obtido") {
        promessaIniciar = null;
        await iniciar2();
      }
    }
    return consentimento;
  }
  const recompensa2 = {
    // Com «Sem anúncios» a vantagem é direta: sempre «pronto».
    pronto: (slot) => semAnuncios() || podeMostrar2() && prontos.has(slot),
    async preparar(slot) {
      if (semAnuncios()) return true;
      await iniciar2();
      if (!podeMostrar2()) return false;
      if (prontos.has(slot)) return true;
      emitir("anuncio:pedido", { slot });
      const ok = await seguro(async () => {
        await impl.carregarRecompensa(slot);
        return true;
      }, () => {
        emitir("anuncio:falhou", { slot, motivo: "carregar" });
        return false;
      });
      if (ok) prontos.add(slot);
      return ok;
    },
    // O jogo só concede com ganhou:true. Com «Sem anúncios» concede sem mostrar nada (motivo 'direto').
    async mostrar(slot) {
      var _a;
      if (semAnuncios()) {
        emitir("anuncio:recompensa", { slot, direto: true });
        return { ganhou: true, motivo: "direto" };
      }
      if (!podeMostrar2() || !prontos.has(slot)) return { ganhou: false, motivo: "indisponivel" };
      prontos.delete(slot);
      emitir("anuncio:mostrado", { slot });
      const r = await seguro(() => impl.mostrarRecompensa(slot), () => ({ ganhou: false, motivo: "erro" }));
      if (r.ganhou) {
        emitir("anuncio:recompensa", { slot, direto: false });
        (_a = recompensa2.aoGanhar) == null ? void 0 : _a.call(recompensa2);
      } else emitir("anuncio:falhou", { slot, motivo: r.motivo || "fechado_cedo" });
      return { ganhou: !!r.ganhou, motivo: r.motivo || (r.ganhou ? "ok" : "fechado_cedo") };
    }
  };
  const INT = () => {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
      cada: Math.max(1, (_b = (_a = cfg.INT_A_CADA_N_JOGOS) != null ? _a : cfg.INTERSTICIAL_CADA) != null ? _b : 3),
      intervaloS: (_c = cfg.INT_INTERVALO_MIN_S) != null ? _c : 180,
      maxSessao: (_d = cfg.INT_MAX_SESSAO) != null ? _d : 3,
      maxDia: (_e = cfg.INT_MAX_DIA) != null ? _e : 8,
      semPrimeiras: (_f = cfg.AD_SEM_ANUNCIO_PRIMEIRAS) != null ? _f : 5,
      inatividadeMs: ((_g = cfg.INT_SESSAO_INATIVIDADE_MIN) != null ? _g : 30) * 6e4
    };
  };
  const agora = opcoes.agora || Date.now;
  const armazem = opcoes.armazem || { get: (k) => {
    var _a;
    return (_a = globalThis.localStorage) == null ? void 0 : _a.getItem(k);
  }, set: (k, v) => {
    var _a;
    return (_a = globalThis.localStorage) == null ? void 0 : _a.setItem(k, v);
  } };
  const CHAVE = "seixo.anuncios.int";
  const vazio = () => ({ partidas: 0, contador: 0, ultimo: 0, sessoes: 0, atividade: 0, sessaoN: 0, dia: "", diaN: 0 });
  let est = vazio();
  try {
    est = { ...vazio(), ...JSON.parse(armazem.get(CHAVE) || "{}") };
  } catch {
    est = vazio();
  }
  const guardar = () => {
    try {
      armazem.set(CHAVE, JSON.stringify(est));
    } catch {
    }
  };
  const diaDe = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  };
  function sessao(t) {
    if (!est.atividade || t - est.atividade > INT().inatividadeMs) {
      est.sessoes += 1;
      est.sessaoN = 0;
    }
    est.atividade = t;
    const d = diaDe(t);
    if (est.dia !== d) {
      est.dia = d;
      est.diaN = 0;
    }
  }
  sessao(agora());
  guardar();
  const registarPausa = () => {
    est.ultimo = agora();
    est.contador = 0;
    guardar();
  };
  recompensa2.aoGanhar = registarPausa;
  let intersticialPronto = false;
  const saltar = (motivo) => {
    emitir("intersticial:saltado", { motivo });
    return { mostrado: false, motivo };
  };
  const intersticial2 = {
    async pre_carregar() {
      if (intersticialPronto || !podeMostrar2()) return intersticialPronto;
      intersticialPronto = await seguro(async () => {
        var _a;
        await ((_a = impl.carregarIntersticial) == null ? void 0 : _a.call(impl));
        return !!impl.carregarIntersticial;
      }, () => false);
      return intersticialPronto;
    },
    async tentar(contexto = {}) {
      if (!cfg.INTERSTICIAIS) return { mostrado: false, motivo: "desligado" };
      if (contexto.tutorial) return saltar("tutorial");
      if (semAnuncios()) return saltar("comprou_sem_anuncios");
      const c = INT();
      const t = agora();
      sessao(t);
      est.partidas += 1;
      const primeiras = est.partidas <= c.semPrimeiras;
      if (!primeiras) est.contador += 1;
      guardar();
      if (primeiras) return saltar("carencia");
      await iniciar2();
      if (!podeMostrar2()) return saltar("sem_consentimento");
      await this.pre_carregar();
      if (est.contador < c.cada) {
        return { mostrado: false, motivo: "frequencia" };
      }
      emitir("intersticial:elegivel", {});
      if (t - est.ultimo < c.intervaloS * 1e3) return saltar("intervalo");
      if (est.sessaoN >= c.maxSessao) return saltar("limite_sessao");
      if (est.diaN >= c.maxDia) return saltar("limite_dia");
      if (!intersticialPronto) return saltar("sem_anuncio");
      intersticialPronto = false;
      emitir("anuncio:mostrado", { slot: "intersticial" });
      const r = await seguro(() => impl.mostrarIntersticial(), () => ({ mostrado: false }));
      if (r.mostrado) {
        est.sessaoN += 1;
        est.diaN += 1;
        registarPausa();
        emitir("intersticial:mostrado", {});
      }
      this.pre_carregar();
      return { mostrado: !!r.mostrado, motivo: r.mostrado ? "ok" : "erro" };
    }
  };
  return { iniciar: iniciar2, podeMostrar: podeMostrar2, abrirPrivacidade: abrirPrivacidade2, recompensa: recompensa2, intersticial: intersticial2, consentimento: () => consentimento, opcoesPrivacidade: () => opcoesPrivacidade2 && !semAnuncios(), tipo: impl.tipo };
}
const CFG_ANUNCIOS = () => CONFIG.ANUNCIOS || {};
function implPorOmissao() {
  var _a, _b, _c, _d;
  try {
    const AdMob = ((_b = (_a = globalThis.Capacitor) == null ? void 0 : _a.isNativePlatform) == null ? void 0 : _b.call(_a)) ? (_c = globalThis.Capacitor.Plugins) == null ? void 0 : _c.AdMob : null;
    if (AdMob) {
      const c = CFG_ANUNCIOS();
      return criarAdMob(AdMob, idsAnuncios(c), !emRelease(c), (_d = c.UMP_DEBUG_GEOGRAFIA) != null ? _d : 0);
    }
  } catch {
  }
  return criarStub();
}
let app = null;
function configurar(opcoes = {}) {
  app = criarAnuncios({ impl: implPorOmissao(), ...opcoes });
  return app;
}
const inst = () => app || configurar();
const iniciar = () => inst().iniciar();
const podeMostrar = () => inst().podeMostrar();
const abrirPrivacidade = () => inst().abrirPrivacidade();
const opcoesPrivacidade = () => inst().opcoesPrivacidade();
const recompensa = {
  pronto: (s) => inst().recompensa.pronto(s),
  preparar: (s) => inst().recompensa.preparar(s),
  mostrar: (s) => inst().recompensa.mostrar(s)
};
const intersticial = { tentar: (c) => inst().intersticial.tentar(c), preCarregar: () => inst().intersticial.pre_carregar() };
export {
  IDS_TESTE,
  abrirPrivacidade,
  configurar,
  criarAdMob,
  criarAnuncios,
  criarStub,
  emRelease,
  idsAnuncios,
  iniciar,
  intersticial,
  opcoesPrivacidade,
  podeMostrar,
  recompensa
};
