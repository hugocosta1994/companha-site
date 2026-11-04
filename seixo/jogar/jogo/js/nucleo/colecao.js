import { progressoDe } from "./objetivos.js";
import { NIVEIS_PO, nivelDePo } from "./oficio.js";
const SEPARADORES = Object.freeze([["pedra", "Pedras"], ["paleta", "Paletas"], ["moldura", "Molduras"], ["selo", "Selos"], ["som", "Sons"]]);
const RE_MOLD_MES = /^MOLD-(\d{4})-(\d{2})$/;
const RE_NIV = /^NIV-(\d)$/;
function condicaoDe(item, { objetivos = {} } = {}) {
  var _a, _b;
  if (item.gratis) return { tipo: "gratis", chave: "colecao.cond.gratis" };
  const o = item.obtencao || (/^SELO-(\d)$/.test(item.id) ? { tipo: "nivel", ref: item.id.replace("SELO", "NIV") } : null);
  if (o && o.tipo === "objetivo" && objetivos[o.ref]) return { tipo: "objetivo", ref: o.ref, chave: item.condicao_id || `colecao.cond.${o.ref}` };
  if (o && o.tipo === "nivel" && RE_NIV.test(o.ref)) return { tipo: "nivel", ref: o.ref, nivel: +RE_NIV.exec(o.ref)[1], chave: item.condicao_id || "colecao.cond.nivel" };
  if (o && o.tipo === "pacote" && o.ref) return { tipo: "pacote", ref: o.ref, chave: item.condicao_id || "colecao.cond.pacote" };
  if (item.eur != null || item.lascas != null || item.play_id) return { tipo: "compra", chave: "colecao.cond.compra", eur: (_a = item.eur) != null ? _a : null, lascas: (_b = item.lascas) != null ? _b : null };
  if (item.modelo && item.ganha_se) return { tipo: "praca", chave: item.condicao_id || "colecao.cond.praca" };
  return null;
}
const visivel = (item, hojeMes) => {
  const m = RE_MOLD_MES.exec(item.id);
  return !m || `${m[1]}-${m[2]}` <= hojeMes;
};
function estadoItem(item, ctx) {
  var _a, _b, _c;
  const condicao = condicaoDe(item, ctx);
  if (ctx.aplicado && ctx.aplicado(item.id)) return { id: item.id, categoria: item.categoria, estado: "aplicado", condicao, progresso: null };
  if (item.gratis || ctx.tem && ctx.tem(item.id)) return { id: item.id, categoria: item.categoria, estado: "tens", condicao, progresso: null };
  let progresso = null;
  if (condicao && condicao.tipo === "objetivo") progresso = progressoDe(ctx.objetivos[condicao.ref], ctx.doc, { hoje: ctx.hoje, infoDe: ctx.infoDe });
  else if (condicao && condicao.tipo === "nivel") {
    const po = ctx.doc.oficio && ctx.doc.oficio.po || 0;
    progresso = { atual: Math.min(po, (_a = NIVEIS_PO[condicao.nivel - 1]) != null ? _a : po), alvo: (_b = NIVEIS_PO[condicao.nivel - 1]) != null ? _b : 0, faltam: Math.max(0, ((_c = NIVEIS_PO[condicao.nivel - 1]) != null ? _c : 0) - po), nivelAtual: nivelDePo(po) };
  }
  return { id: item.id, categoria: item.categoria, estado: condicao && condicao.tipo === "compra" ? "venda" : "bloqueado", condicao, progresso };
}
function colecao(catalogo, ctx) {
  const visiveis = catalogo.filter((i) => !i.modelo && visivel(i, ctx.hojeMes || "9999-99"));
  return SEPARADORES.map(([sep, nome]) => {
    const cartoes = visiveis.filter((i) => i.categoria === sep).map((i) => estadoItem(i, ctx));
    return { separador: sep, nome, n: cartoes.filter((c) => c.estado === "tens" || c.estado === "aplicado").length, N: cartoes.length, cartoes };
  });
}
function oQueFalta(cartoes) {
  const r = (c) => c.progresso && c.progresso.alvo > 0 ? c.progresso.atual / c.progresso.alvo : -1;
  return cartoes.filter((c) => c.estado === "bloqueado" || c.estado === "venda").sort((a, b) => r(b) - r(a) || (a.id < b.id ? -1 : 1));
}
function itensSemCondicao(catalogo, ctx = {}) {
  return catalogo.filter((i) => !i.modelo && ["pedra", "paleta", "moldura", "selo", "som"].includes(i.categoria) && !condicaoDe(i, ctx)).map((i) => i.id);
}
export {
  SEPARADORES,
  colecao,
  condicaoDe,
  estadoItem,
  itensSemCondicao,
  oQueFalta,
  visivel
};
