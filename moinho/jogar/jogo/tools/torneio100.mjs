// 100 partidas por par (V1-04): node tools/torneio100.mjs. Mesmas regras de qa-marco (semente s+1, cores alternadas).
import { novaPartida, jogarCompleta } from '../js/nucleo/partida.js';
import { escolherJogada } from '../js/nucleo/ia.js';
import { mulberry32 } from '../js/nucleo/prng.js';
function jogo(nB, nP, semente) {
  let p = novaPartida(); const rng = mulberry32(semente);
  for (let i = 0; i < 300 && !p.estado.fim; i++) p = jogarCompleta(p, escolherJogada(p.estado, { nivel: p.estado.vez === 1 ? nB : nP, rng, semLimite: nB !== 'dificil' && nP !== 'dificil' }));
  return p;
}
for (const [a, b] of [['dificil', 'facil'], ['media', 'facil']]) {
  let va = 0, vb = 0, e = 0;
  for (let s = 0; s < 100; s++) { const aBr = s % 2 === 0; const p = jogo(aBr ? a : b, aBr ? b : a, s + 1); const r = p.estado.fim ? p.estado.fim.resultado : 0; if (!r) e++; else if ((r === 1) === aBr) va++; else vb++; }
  console.log(`${a} vs ${b}: ${va}-${vb} empates ${e} (${va}%)`);
}
