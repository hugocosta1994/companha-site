import { emitir as emitirGlobal } from "../eventos.js";
import { ANUNCIOS } from "../config.js";
const IDS_TESTE = Object.freeze({
  appId: "ca-app-pub-3940256099942544~3347511713",
  recompensa: "ca-app-pub-3940256099942544/5224354917"
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
  const cfg = opcoes.config || ANUNCIOS || {};
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
      const r = await seguro(() => {
        var _a;
        return comTempo(impl.pedirConsentimento(), (_a = cfg.UMP_TEMPO_MS) != null ? _a : 3e3);
      }, () => ({ estado: "desconhecido" }));
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
      if (semAnuncios()) {
        emitir("anuncio:recompensa", { slot, direto: true });
        return { ganhou: true, motivo: "direto" };
      }
      if (!podeMostrar2() || !prontos.has(slot)) return { ganhou: false, motivo: "indisponivel" };
      prontos.delete(slot);
      emitir("anuncio:mostrado", { slot });
      const r = await seguro(() => impl.mostrarRecompensa(slot), () => ({ ganhou: false, motivo: "erro" }));
      if (r.ganhou) emitir("anuncio:recompensa", { slot, direto: false });
      else emitir("anuncio:falhou", { slot, motivo: r.motivo || "fechado_cedo" });
      return { ganhou: !!r.ganhou, motivo: r.motivo || (r.ganhou ? "ok" : "fechado_cedo") };
    }
  };
  const intersticial2 = { tentar() {
    return { mostrado: false, motivo: cfg.INTERSTICIAIS ? "nao_implementado" : "desligado" };
  } };
  return { iniciar: iniciar2, podeMostrar: podeMostrar2, abrirPrivacidade: abrirPrivacidade2, recompensa: recompensa2, intersticial: intersticial2, consentimento: () => consentimento, opcoesPrivacidade: () => opcoesPrivacidade2 && !semAnuncios(), tipo: impl.tipo };
}
const CFG_ANUNCIOS = () => ANUNCIOS || {};
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
const intersticial = { tentar: (c) => inst().intersticial.tentar(c) };
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
