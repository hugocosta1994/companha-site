import { TEMPO_MIN_MS, melhorSequenciaMeses } from "./objetivos.js";
const FAIXA = { facil: "F", medio: "M", dificil: "D" };
function quadroDe(doc, infoDe) {
  const tempo = { 6: { F: null, M: null, D: null }, 8: { F: null, M: null, D: null } };
  let sem = 0, com = 0;
  for (const [id, r] of Object.entries(doc && doc.puzzles || {})) {
    if (!r) continue;
    if (r.estado === "resolvido_com_pistas") {
      com++;
      continue;
    }
    if (r.estado !== "resolvido") continue;
    sem++;
    const p = infoDe && infoDe(id), f = p && FAIXA[p.dificuldade];
    if (!p || !f || !tempo[p.n] || !(r.tempoMs >= TEMPO_MIN_MS[f])) continue;
    if (tempo[p.n][f] == null || r.tempoMs < tempo[p.n][f]) tempo[p.n][f] = r.tempoMs;
  }
  const pr = doc && doc.pracas || {};
  const tecnicas = {};
  for (const d of doc && doc.oficio && doc.oficio.descobertas || []) tecnicas[d] = doc.oficio.descobertasEm && doc.oficio.descobertasEm[d] || null;
  return {
    tempo,
    serie: doc && doc.sequencia && doc.sequencia.recorde || 0,
    pracas: Object.values(pr).filter((v) => v && v.completaEm).length,
    mesesSeguidos: melhorSequenciaMeses(doc),
    tecnicas,
    semPista: sem,
    comPista: com
  };
}
const formatarTempo = (ms) => ms == null ? "\u2014" : `${Math.floor(ms / 6e4)}:${String(Math.floor(ms / 1e3) % 60).padStart(2, "0")}`;
export {
  formatarTempo,
  quadroDe
};
