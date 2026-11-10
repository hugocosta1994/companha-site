import { plugin } from "./nativo.js";
import { lerConfig } from "../contas/config.js";
const CHAVE_DEVICE = "companha.feedback.device";
const JOGO = "seixo";
let capturaMem = null;
const uuid = () => globalThis.crypto && globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0;
  return (c === "x" ? r : r & 3 | 8).toString(16);
});
async function deviceId(o) {
  const P = o.preferences !== void 0 ? o.preferences : plugin("Preferences");
  try {
    if (P) {
      const r = await P.get({ key: CHAVE_DEVICE });
      if (r && r.value) return r.value;
      const id = uuid();
      await P.set({ key: CHAVE_DEVICE, value: id });
      return id;
    }
  } catch {
  }
  try {
    const ls = globalThis.localStorage;
    let id = ls.getItem(CHAVE_DEVICE);
    if (!id) {
      id = uuid();
      ls.setItem(CHAVE_DEVICE, id);
    }
    return id;
  } catch {
    return uuid();
  }
}
const diag = (o) => o.diagnostico !== void 0 ? o.diagnostico : plugin("Diagnostico");
async function prepararCaptura(o = {}) {
  capturaMem = null;
  const D = diag(o);
  if (!D || typeof D.capturar !== "function") return null;
  try {
    const r = await D.capturar({ larguraMax: 1080, qualidade: 70 });
    capturaMem = r && r.base64 || null;
  } catch {
    capturaMem = null;
  }
  return capturaMem;
}
function descartarCaptura() {
  capturaMem = null;
}
const temCaptura = () => !!capturaMem;
const miniaturaCaptura = () => capturaMem ? "data:image/jpeg;base64," + capturaMem : null;
function insetsCss() {
  try {
    const d = globalThis.document;
    const el = d.createElement("div");
    el.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    d.body.appendChild(el);
    const c = getComputedStyle(el);
    const r = { t: parseFloat(c.paddingTop) || 0, r: parseFloat(c.paddingRight) || 0, b: parseFloat(c.paddingBottom) || 0, l: parseFloat(c.paddingLeft) || 0 };
    el.remove();
    return r;
  } catch {
    return null;
  }
}
async function recolherDados(o = {}) {
  const w = globalThis;
  const D = diag(o);
  let info = null;
  if (D && typeof D.info === "function") {
    try {
      info = await D.info();
    } catch {
      info = null;
    }
  }
  const dados = {
    jogo: JOGO,
    plataforma: info ? "android" : "web",
    viewport: w.innerWidth ? { css: [w.innerWidth, w.innerHeight], dpr: w.devicePixelRatio || 1 } : null,
    insets: { nativo: info ? info.insets || null : null, css: insetsCss() },
    idioma: { jogo: o.idioma || "pt", sistema: w.navigator && w.navigator.language || "" },
    ecraJogo: o.ecraJogo || ""
  };
  if (info) {
    for (const k of ["versionCode", "versao", "fabricante", "modelo", "android", "sdk", "ecra", "navegacao"]) if (info[k] != null) dados[k] = info[k];
  } else {
    dados.userAgent = String(w.navigator && w.navigator.userAgent || "").slice(0, 200);
  }
  return dados;
}
async function enviarFeedback({ texto, comCaptura }, o = {}) {
  const txt = String(texto || "").trim();
  if (!txt || txt.length > 2e3) return { ok: false, erro: "invalido" };
  const cfg = o.config || lerConfig();
  const cap = comCaptura ? capturaMem : null;
  if (cfg.fornecedor === "simulado") {
    console.info("[feedback] simulado", { texto: txt, comCaptura: !!cap });
    descartarCaptura();
    return { ok: true, id: "simulado" };
  }
  if (cfg.fornecedor !== "supabase") return { ok: false, erro: "inativo" };
  let cliente;
  try {
    cliente = o.cliente || await (o.contas || (await import("../contas/contas.js")).contas).clienteSupabase();
  } catch {
    cliente = null;
  }
  if (!cliente) return { ok: false, erro: "inativo" };
  let id;
  try {
    const dados = await recolherDados(o);
    const { data, error } = await cliente.rpc("enviar_feedback", { p_jogo: JOGO, p_device: await deviceId(o), p_texto: txt, p_dados: dados, p_captura: !!cap });
    if (error) return { ok: false, erro: /limite_/.test(String(error.message || error)) ? "limite" : /invalid|invalido|check/i.test(String(error.message || "")) ? "invalido" : "rede" };
    id = data;
  } catch {
    return { ok: false, erro: "rede" };
  }
  if (cap) {
    try {
      const bin = atob(cap);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      await cliente.storage.from("feedback").upload(id + ".jpg", new Blob([u8], { type: "image/jpeg" }), { contentType: "image/jpeg", upsert: false });
    } catch {
    }
  }
  descartarCaptura();
  return { ok: true, id };
}
export {
  descartarCaptura,
  enviarFeedback,
  miniaturaCaptura,
  prepararCaptura,
  recolherDados,
  temCaptura
};
