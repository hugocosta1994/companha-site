import { NIVEIS_ORDEM, PERSONALIDADES } from "../config.js";
const JOGO_ID = "moinho";
const SCHEMA = 1;
const num = (a, b) => Math.max(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
const uniao = (a, b) => ({ ...a && typeof a === "object" ? a : {}, ...b && typeof b === "object" ? b : {} });
const lerProgresso = (meta, stats, resolvidos) => ({ meta, stats, resolvidos });
function fundirStats(a, b) {
  a = a || {};
  b = b || {};
  const r = {};
  for (const k of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k] || {}, y = b[k] || {};
    r[k] = {};
    for (const c of /* @__PURE__ */ new Set([...Object.keys(x), ...Object.keys(y)])) r[k][c] = num(x[c], y[c]);
  }
  return r;
}
function fundirMeta(a, b) {
  a = a || {};
  b = b || {};
  const mais = (b.pontos || 0) > (a.pontos || 0) ? b : a, menos = mais === a ? b : a;
  const ca = a.contadores || {}, cb = b.contadores || {}, cont = {};
  for (const c of /* @__PURE__ */ new Set([...Object.keys(ca), ...Object.keys(cb)])) cont[c] = num(ca[c], cb[c]);
  const r = { ...menos, ...mais, pontos: num(a.pontos, b.pontos), conquistas: uniao(a.conquistas, b.conquistas), pagos: uniao(a.pagos, b.pagos), contadores: cont, tutorialFeito: !!(a.tutorialFeito || b.tutorialFeito) };
  if (Array.isArray(a.niveisVencidos) || Array.isArray(b.niveisVencidos)) {
    const v = [...a.niveisVencidos || [], ...b.niveisVencidos || []];
    r.niveisVencidos = NIVEIS_ORDEM.filter((id) => v.includes(id));
  }
  if (Array.isArray(a.persVencidas) || Array.isArray(b.persVencidas)) {
    const v = [...a.persVencidas || [], ...b.persVencidas || []];
    r.persVencidas = Object.keys(PERSONALIDADES).filter((id) => v.includes(id));
  }
  return r;
}
function merge(local, remoto) {
  if (!local) return remoto || null;
  if (!remoto) return local;
  return { meta: fundirMeta(local.meta, remoto.meta), stats: fundirStats(local.stats, remoto.stats), resolvidos: uniao(local.resolvidos, remoto.resolvidos) };
}
export {
  JOGO_ID,
  SCHEMA,
  fundirMeta,
  fundirStats,
  lerProgresso,
  merge
};
