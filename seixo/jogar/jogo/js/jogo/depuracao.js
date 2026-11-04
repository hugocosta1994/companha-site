import { textosEmFalta } from "../textos.js";
import { registoEventos, limparEventos } from "../eventos.js";
const extras = {};
let instalado = false;
function debugLigado() {
  var _a;
  try {
    return new URLSearchParams(((_a = globalThis.location) == null ? void 0 : _a.search) || "").get("debug") === "1";
  } catch {
    return false;
  }
}
function juntar(alvo) {
  if (!alvo || typeof alvo !== "object") return alvo;
  for (const [k, fn] of Object.entries(extras)) if (!(k in alvo)) alvo[k] = fn;
  return alvo;
}
function instalar() {
  if (instalado) return;
  instalado = true;
  let atual = juntar(globalThis.SEIXO_DEBUG);
  Object.defineProperty(globalThis, "SEIXO_DEBUG", {
    configurable: true,
    enumerable: true,
    get() {
      return atual;
    },
    set(v) {
      atual = juntar(v);
    }
  });
}
function extensaoDebug(nome, fn) {
  if (!debugLigado()) return;
  extras[nome] = fn;
  instalar();
  juntar(globalThis.SEIXO_DEBUG);
}
extensaoDebug("textosEmFalta", textosEmFalta);
extensaoDebug("eventos", registoEventos);
extensaoDebug("limparEventos", () => {
  limparEventos();
  return [];
});
export {
  extensaoDebug
};
