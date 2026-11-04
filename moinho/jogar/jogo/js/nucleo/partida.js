import { REPETICOES } from "../config.js";
import { novoEstado, aplicar, chavePosicao } from "./regras.js";
function novaPartida({ modo = "ia", nivel = "media", cor = 1, semente = 1 } = {}) {
  const e = novoEstado();
  return { modo, nivel, cor, semente, historico: [], estado: e, reps: { [chavePosicao(e)]: 1 } };
}
function jogarCompleta(p, m) {
  let e = aplicar(p.estado, m);
  const reps = { ...p.reps };
  if (!e.fim) {
    const k = chavePosicao(e);
    reps[k] = (reps[k] || 0) + 1;
    if (reps[k] >= REPETICOES) e = { ...e, fim: { resultado: 0, motivo: "repeticao" } };
  }
  return { ...p, estado: e, historico: [...p.historico, m], reps };
}
function reconstruir(base, historico) {
  let p = novaPartida(base);
  for (const m of historico) p = jogarCompleta(p, m);
  return p;
}
const desfazer = (p) => p.historico.length ? reconstruir(p, p.historico.slice(0, -1)) : p;
export {
  desfazer,
  jogarCompleta,
  novaPartida,
  reconstruir
};
