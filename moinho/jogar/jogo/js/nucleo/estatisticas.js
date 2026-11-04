import { MODOS_STATS, PUZZLES } from "../config.js";
const modoVazio = () => ({ v: 0, d: 0, e: 0, serie: 0, melhorSerie: 0, partidas: 0, jogadasTotais: 0, fase3: 0 });
const statsVazias = () => ({});
const modoDe = (modo, nivel, motor = "moinho") => modo === "2j" ? "dois" : `${motor === "alquerque" ? "alq" : "ia"}_${nivel}`;
function registar(stats, modo, { resultado, jogadas = 0, fase3 = false }) {
  if (!MODOS_STATS.includes(modo) || !["v", "d", "e"].includes(resultado)) return stats;
  const m = { ...modoVazio(), ...stats[modo] || {} };
  m[resultado]++;
  m.partidas++;
  m.jogadasTotais += Math.max(0, jogadas | 0);
  if (fase3) m.fase3++;
  m.serie = resultado === "v" ? m.serie + 1 : 0;
  m.melhorSerie = Math.max(m.melhorSerie, m.serie);
  return { ...stats, [modo]: m };
}
function total(stats) {
  const t = modoVazio();
  delete t.serie;
  for (const m of Object.values(stats)) {
    for (const k of ["v", "d", "e", "partidas", "jogadasTotais", "fase3"]) t[k] += m[k] || 0;
    t.melhorSerie = Math.max(t.melhorSerie || 0, m.melhorSerie || 0);
  }
  return t;
}
const mediaJogadas = (m) => m && m.partidas ? Math.round(m.jogadasTotais / m.partidas) : 0;
function validarStats(x) {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const r = {};
  for (const k of MODOS_STATS) if (x[k] && typeof x[k] === "object") {
    const m = modoVazio();
    for (const c of Object.keys(m)) if (Number.isFinite(x[k][c]) && x[k][c] >= 0) m[c] = Math.floor(x[k][c]);
    r[k] = m;
  }
  return r;
}
const vitoriasIA = (stats) => Object.entries(stats).filter(([k]) => k.startsWith("ia_") || k.startsWith("alq_")).reduce((s, [, m]) => s + m.v, 0);
const resolvidosDoTipo = (res, tipo, todos) => todos.filter((p) => p.tipo === tipo && res[p.id]).length;
function tipoAberto(res, tipo, todos) {
  const i = PUZZLES.tipos.indexOf(tipo);
  return i <= 0 || resolvidosDoTipo(res, PUZZLES.tipos[i - 1], todos) >= PUZZLES.desbloqueioResolvidos;
}
const validarResolvidos = (x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).filter(([k, v]) => /^p[1-4]-[1-3]$/.test(k) && v === true)) : {};
const proximoPuzzle = (res, todos) => todos.find((p) => !res[p.id] && tipoAberto(res, p.tipo, todos)) || null;
export {
  mediaJogadas,
  modoDe,
  modoVazio,
  proximoPuzzle,
  registar,
  resolvidosDoTipo,
  statsVazias,
  tipoAberto,
  total,
  validarResolvidos,
  validarStats,
  vitoriasIA
};
