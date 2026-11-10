// T-1835: pior caso do Mestre (tempo total de escolherJogada vs limite 360 ms e orçamento de pesquisa). Uso: node tools/pior-mestre.mjs [partidas=8] [escala=1]
// escala > 1 simula CPU lenta reduzindo o limite na mesma proporção (o excesso medido escala com a CPU).
import { escolherJogada } from '../js/nucleo/ia.js';
import { jogadasCompletas, aplicar } from '../js/nucleo/regras.js';
import { mulberry32 } from '../js/nucleo/prng.js';
const G = +process.argv[2] || 8;
const t = []; let pior = null;
for (let g = 0; g < G; g++) {
  const rng = mulberry32(100 + g); let e = (await import('../js/nucleo/partida.js')).novaPartida({}).estado, n = 0;
  while (!e.fim && n < 140) {
    let m; if (n < 4) { const ms = jogadasCompletas(e); m = ms[Math.floor(rng() * ms.length)]; }
    else { const t0 = performance.now(); m = escolherJogada(e, { nivel: 'mestre', rng }); const dt = performance.now() - t0; t.push(dt); if (!pior || dt > pior.dt) pior = { dt, n }; }
    if (!m) break; e = aplicar(e, m); n++;
  }
}
t.sort((a, b) => a - b);
console.log('mestre n', t.length, 'med', t[t.length >> 1].toFixed(0), 'p95', t[Math.floor(t.length * .95)].toFixed(0), 'max', t[t.length - 1].toFixed(0), 'pior na jogada', pior.n);
