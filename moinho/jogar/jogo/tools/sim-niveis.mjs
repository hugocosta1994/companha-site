// Bots de calibração (GDD 9.1). Uso: node tools/sim-niveis.mjs [partidasPorPar=200]
// Nível N+1 vs N, cores alternadas, 6 jogadas iniciais aleatórias, só partidas decididas. Env: LIMITE=1 usa o limite de tempo real
// (por defeito sem limite, profundidade fixa; o Mestre fica em 5 para ser viável: MESTRE_PROF=7 para o valor completo).
import { escolherJogada } from '../js/nucleo/ia.js';
import { jogadasCompletas } from '../js/nucleo/regras.js';
import { novaPartida, jogarCompleta } from '../js/nucleo/partida.js';
import { mulberry32 } from '../js/nucleo/prng.js';
import { NIVEIS_ORDEM } from '../js/config.js';
const N = +process.argv[2] || 200, ABERT = 6, LIM = !!process.env.LIMITE, MP = +process.env.MESTRE_PROF || 5;
const ALVO = { facil: 60, media: 60, atenta: 55, dificil: 52, mestre: 55 };
function jogo(nb, np, rng) { // nb joga com cor 1
  let pt = novaPartida({}), e = pt.estado, n = 0;
  while (!e.fim && n < 300) {
    let m;
    if (n < ABERT) { const ms = jogadasCompletas(e); m = ms[Math.floor(rng() * ms.length)]; }
    else {
      const nv = e.vez === 1 ? nb : np;
      m = escolherJogada(e, { nivel: nv, rng, semLimite: !LIM, profundidade: !LIM && nv === 'mestre' ? MP : undefined });
    }
    pt = jogarCompleta(pt, m); e = pt.estado; n++;
  }
  return e.fim ? e.fim.resultado : 0;
}
for (let i = 1; i < NIVEIS_ORDEM.length; i++) {
  const hi = NIVEIS_ORDEM[i], lo = NIVEIS_ORDEM[i - 1], rng = mulberry32(900 + i);
  let vh = 0, vl = 0, ev = 0;
  for (let g = 0; g < N; g++) {
    const sw = g % 2, r = jogo(sw ? lo : hi, sw ? hi : lo, rng);
    if (!r) ev++; else if ((r === 1) !== !!sw) vh++; else vl++;
  }
  const pct = (100 * vh / Math.max(1, vh + vl));
  console.log(`${hi} vs ${lo}: ${vh}-${vl} (empates ${ev}) -> ${hi} ganha ${pct.toFixed(0)}% das decididas (alvo >= ${ALVO[hi]}%) ${pct >= ALVO[hi] ? 'OK' : 'ABAIXO'}`);
}
