// Mede tempo e profundidade da IA por nível em partidas simuladas. Uso: node tools/bench-ia.mjs [partidas=6]
import { escolherJogada } from '../js/nucleo/ia.js';
import { jogadasCompletas } from '../js/nucleo/regras.js';
import { novaPartida, jogarCompleta } from '../js/nucleo/partida.js';
import { mulberry32 } from '../js/nucleo/prng.js';
const G = +process.argv[2] || 6;
for (const nv of ['facil', 'media', 'atenta', 'dificil', 'mestre']) {
  const t = [], pr = []; const rng = mulberry32(7);
  for (let g = 0; g < G; g++) {
    let pt = novaPartida({}), e = pt.estado, n = 0;
    while (!e.fim && n < 120) {
      let m;
      if (n < 6) { const ms = jogadasCompletas(e); m = ms[Math.floor(rng() * ms.length)]; }
      else { const info = {}; const t0 = performance.now(); m = escolherJogada(e, { nivel: nv, rng, info }); t.push(performance.now() - t0); pr.push(info.profundidade ?? 0); }
      pt = jogarCompleta(pt, m); e = pt.estado; n++;
    }
  }
  t.sort((a, b) => a - b);
  console.log(nv, 'n', t.length, 'med', t[t.length >> 1].toFixed(0), 'p95', t[Math.floor(t.length * .95)].toFixed(0), 'max', t[t.length - 1].toFixed(0), 'profMedia', (pr.reduce((a, b) => a + b, 0) / pr.length).toFixed(2));
}
