import { MODOS_STATS, PUZZLES } from "../config.js";
const modoVazio = () => ({ v: 0, d: 0, e: 0, serie: 0, melhorSerie: 0, partidas: 0, jogadasTotais: 0, fase3: 0 });
const statsVazias = () => ({});
const modoDe = (modo, nivel) => modo === "2j" ? "dois" : modo === "mp" || modo === "codigo" ? "codigo" : `ia_${nivel}`;
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
const globaisVazios = () => ({ moinhos: 0, melhorSerieGeral: 0, ultimaPartida: "" });
function registarGlobais(stats, { moinhos = 0, resultado, dia = "" }, serieGeral = 0) {
  const g = { ...globaisVazios(), ...stats._g || {} };
  g.moinhos += Math.max(0, moinhos | 0);
  g.melhorSerieGeral = Math.max(g.melhorSerieGeral, serieGeral);
  if (dia) g.ultimaPartida = dia;
  return { ...stats, _g: g };
}
const taxaVitoria = (stats) => {
  let v = 0, t = 0;
  for (const [k, m] of Object.entries(stats)) if (k.startsWith("ia_") || k === "codigo") {
    v += m.v || 0;
    t += (m.v || 0) + (m.d || 0) + (m.e || 0);
  }
  return t ? Math.round(100 * v / t) : null;
};
const vitoriasPorNivel = (stats, niveis) => niveis.map((n) => ({ nivel: n, v: (stats[`ia_${n}`] || {}).v || 0 }));
function total(stats) {
  const t = modoVazio();
  delete t.serie;
  for (const [k, m] of Object.entries(stats)) {
    if (k === "_g") continue;
    for (const k2 of ["v", "d", "e", "partidas", "jogadasTotais", "fase3"]) t[k2] += m[k2] || 0;
    t.melhorSerie = Math.max(t.melhorSerie || 0, m.melhorSerie || 0);
  }
  return t;
}
const mediaJogadas = (m) => m && m.partidas ? Math.round(m.jogadasTotais / m.partidas) : 0;
function validarStats(x) {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  const r = {};
  const g = x._g && typeof x._g === "object" ? x._g : null;
  if (g) {
    const gv = globaisVazios();
    for (const c of ["moinhos", "melhorSerieGeral"]) if (Number.isFinite(g[c]) && g[c] >= 0) gv[c] = Math.floor(g[c]);
    if (typeof g.ultimaPartida === "string") gv.ultimaPartida = g.ultimaPartida;
    r._g = gv;
  }
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
const ehObjeto = (x) => !!x && typeof x === "object" && !Array.isArray(x);
function comDesconhecidos(validado, bruto, conhecido) {
  if (!ehObjeto(bruto)) return validado;
  const extra = Object.fromEntries(Object.entries(bruto).filter(([k]) => !conhecido(k) && !(k in validado)));
  return { ...extra, ...validado };
}
const statsParaGravar = (stats, bruto) => comDesconhecidos(stats, bruto, (k) => k === "_g" || MODOS_STATS.includes(k));
const puzzlesParaGravar = (res, bruto) => comDesconhecidos(res, bruto, (k) => /^p[1-4]-[1-3]$/.test(k));
const proximoPuzzle = (res, todos) => todos.find((p) => !res[p.id] && tipoAberto(res, p.tipo, todos)) || null;
export {
  comDesconhecidos,
  globaisVazios,
  mediaJogadas,
  modoDe,
  modoVazio,
  proximoPuzzle,
  puzzlesParaGravar,
  registar,
  registarGlobais,
  resolvidosDoTipo,
  statsParaGravar,
  statsVazias,
  taxaVitoria,
  tipoAberto,
  total,
  validarResolvidos,
  validarStats,
  vitoriasIA,
  vitoriasPorNivel
};
