import { emitir } from "../eventos.js";
const cap = () => globalThis.Capacitor;
function ehNativo() {
  const c = cap();
  return !!(c && typeof c.isNativePlatform === "function" && c.isNativePlatform());
}
function plugin(nome) {
  if (!ehNativo()) return null;
  const p = cap().Plugins;
  return p && p[nome] || null;
}
function ligarCicloDeVida() {
  let ativo = true;
  const mudar = (agoraAtivo) => {
    if (agoraAtivo === ativo) return;
    ativo = agoraAtivo;
    emitir(ativo ? "app:retoma" : "app:pausa", {});
  };
  const App = plugin("App");
  if (App && typeof App.addListener === "function") {
    let pega = null;
    let desligado = false;
    Promise.resolve(App.addListener("appStateChange", (e) => mudar(!!(e && e.isActive)))).then((h) => {
      pega = h;
      if (desligado && h) h.remove();
    }).catch((err) => console.warn("[nativo] appStateChange indispon\xEDvel", err));
    return () => {
      desligado = true;
      if (pega) pega.remove();
    };
  }
  const doc = globalThis.document;
  if (doc && typeof doc.addEventListener === "function") {
    const fn = () => mudar(doc.visibilityState !== "hidden");
    doc.addEventListener("visibilitychange", fn);
    return () => doc.removeEventListener("visibilitychange", fn);
  }
  return () => {
  };
}
async function partilhar(texto, { id = null, titulo = "Pedra a Pedra" } = {}) {
  const r = await tentarPartilhar(texto, titulo);
  emitir("partilha:feita", { id, via: r.via, ok: r.ok });
  return r;
}
async function tentarPartilhar(texto, titulo) {
  const Share = plugin("Share");
  if (Share) {
    try {
      await Share.share({ title: titulo, text: texto, dialogTitle: titulo });
      return { via: "sistema", ok: true };
    } catch {
      return { via: "sistema", ok: false };
    }
  }
  const nav = globalThis.navigator;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title: titulo, text: texto });
      return { via: "navigator", ok: true };
    } catch (e) {
      if (e && e.name === "AbortError") return { via: "navigator", ok: false };
    }
  }
  try {
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === "function") {
      await nav.clipboard.writeText(texto);
      return { via: "copia", ok: true };
    }
  } catch {
  }
  return { via: "copia", ok: false };
}
export {
  ehNativo,
  ligarCicloDeVida,
  partilhar,
  plugin
};
