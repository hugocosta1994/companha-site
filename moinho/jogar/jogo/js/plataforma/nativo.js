import { emitir } from "../eventos.js";
function ligarCicloDeVida({ aoVoltar } = {}) {
  document.addEventListener("visibilitychange", () => emitir(document.hidden ? "app:pausa" : "app:retoma"));
  const cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (cap && cap.addListener) {
    cap.addListener("backButton", () => {
      if (aoVoltar) aoVoltar();
    });
    cap.addListener("appStateChange", (e) => emitir(e && e.isActive ? "app:retoma" : "app:pausa"));
  }
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && aoVoltar) aoVoltar();
  });
  return { sair: () => {
    if (cap && cap.exitApp) cap.exitApp();
  } };
}
function plugin(nome) {
  const c = globalThis.Capacitor;
  if (!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform())) return null;
  return c.Plugins && c.Plugins[nome] || null;
}
async function partilharTexto(texto, sis = globalThis) {
  const sh = plugin("Share");
  try {
    if (sh && sh.share) {
      await sh.share({ text: texto });
      return "partilhado";
    }
    if (sis.navigator && sis.navigator.share) {
      await sis.navigator.share({ text: texto });
      return "partilhado";
    }
  } catch {
    return "cancelado";
  }
  return "indisponivel";
}
export {
  ligarCicloDeVida,
  partilharTexto,
  plugin
};
