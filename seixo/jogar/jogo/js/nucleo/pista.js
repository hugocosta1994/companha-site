import { VAZIA } from "./formato.js";
import { eFixa } from "./regras.js";
import { proximoPasso } from "./resolver.js";
function conflitos(jogo) {
  const { grelha } = jogo, sol = jogo.puzzle.solucao, out = [];
  for (let i = 0; i < grelha.length; i++) {
    if (grelha[i] !== VAZIA && grelha[i] !== sol[i] && !eFixa(jogo, i)) out.push(i);
  }
  return out;
}
function pista(jogo) {
  const p = jogo.puzzle, n = p.n, sol = p.solucao;
  const erradas = conflitos(jogo);
  if (erradas.length) {
    const i = erradas[0];
    return { conflito: i, l: i / n | 0, c: i % n, regra: "conflito" };
  }
  const g = Int8Array.from(jogo.grelha);
  const r = proximoPasso(p, g);
  if (r && !r.contradicao && r.cor === sol[r.i]) {
    return { i: r.i, l: r.l, c: r.c, cor: r.cor, tecnica: r.tecnica, regra: r.regra };
  }
  for (let i = 0; i < g.length; i++) {
    if (g[i] === VAZIA) return { i, l: i / n | 0, c: i % n, cor: sol[i], tecnica: "N3", regra: "hipotese" };
  }
  return null;
}
export {
  conflitos,
  pista
};
