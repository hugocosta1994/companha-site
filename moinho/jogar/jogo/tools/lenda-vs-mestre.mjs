// Lenda (id mestre, prof. 7) vs Mestre (id dificil), saída progressiva (uma linha por partida).
// Uso: SEMENTE=11 node tools/lenda-vs-mestre.mjs [partidas=10]   (agregar: node tools/lenda-vs-mestre.mjs --somar ficheiro...)
import { readFileSync } from 'node:fs';
if (process.argv[2] === '--somar') {
  let h = 0, l = 0, e = 0;
  for (const f of process.argv.slice(3)) for (const ln of readFileSync(f, 'utf8').split('\n')) {
    const m = /^G\d+ (LENDA|MESTRE|EMPATE)/.exec(ln); if (!m) continue;
    if (m[1] === 'LENDA') h++; else if (m[1] === 'MESTRE') l++; else e++;
  }
  console.log(`TOTAL ${h + l + e} partidas: Lenda ${h}-${l} (empates ${e}) -> ${(100 * h / Math.max(1, h + l)).toFixed(1)}% das decididas (alvo >= 55%)`);
  process.exit(0);
}
const { escolherJogada } = await import('../js/nucleo/ia.js');
const { jogadasCompletas } = await import('../js/nucleo/regras.js');
const { novaPartida, jogarCompleta } = await import('../js/nucleo/partida.js');
const { mulberry32 } = await import('../js/nucleo/prng.js');
const N = +process.argv[2] || 10, S = +process.env.SEMENTE || 1, ABERT = 6;
const rng = mulberry32(900 + 5 + S * 7919);
function jogo(lenda, mestre) {
  let pt = novaPartida({}), e = pt.estado, n = 0;
  while (!e.fim && n < 300) {
    let m;
    if (n < ABERT) { const ms = jogadasCompletas(e); m = ms[Math.floor(rng() * ms.length)]; }
    else { const nv = e.vez === 1 ? lenda : mestre; m = escolherJogada(e, { nivel: nv, rng, semLimite: true, profundidade: nv === 'mestre' ? 7 : undefined }); }
    pt = jogarCompleta(pt, m); e = pt.estado; n++;
  }
  return e.fim ? e.fim.resultado : 0;
}
for (let g = 0; g < N; g++) {
  const sw = g % 2, r = sw ? jogo('dificil', 'mestre') : jogo('mestre', 'dificil');
  const quem = !r ? 'EMPATE' : ((r === 1) !== !!sw ? 'LENDA' : 'MESTRE');
  console.log(`G${S}.${g} ${quem}`.replace(/^G(\d+)\.(\d+)/, 'G$1$2 ').replace(/ +/, ' '));
}
