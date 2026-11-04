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
export {
  ligarCicloDeVida
};
