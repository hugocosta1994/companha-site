// Simulação do teste de diferença do GDD 8.1. Uso: node tools/sim-pers.mjs [partidasPorPar=100]
import { escolherJogada } from '../js/nucleo/ia.js';
import { jogadasCompletas, fase } from '../js/nucleo/regras.js';
import { novaPartida, jogarCompleta } from '../js/nucleo/partida.js';
import { mulberry32 } from '../js/nucleo/prng.js';
import { PERSONALIDADES } from '../js/config.js';
const N = +process.argv[2] || 100, ABERT = 6;
// Opcional: SO=pers1,pers2 (só esse par) e PESOS='{"prudente":{"moinhos":30}}' (afinação sem editar config).
if (process.env.PESOS) { const o = JSON.parse(process.env.PESOS); for (const k in o) Object.assign(PERSONALIDADES[k].pesos, o[k]); }
const SO = process.env.SO ? process.env.SO.split(',') : null;
function jogo(pb, pp, rng) { // pb joga com cor 1
  let pt = novaPartida({}), e = pt.estado, caps1 = { 1: 0, 2: 0 }, n = 0;
  while (!e.fim && n < 300) {
    let m;
    if (n < ABERT) { const ms = jogadasCompletas(e); m = ms[Math.floor(rng() * ms.length)]; }
    else m = escolherJogada(e, { nivel: 'media', rng, semLimite: true, personalidade: e.vez === 1 ? pb : pp });
    if (m.tirar !== undefined && fase(e) === 'colocar') caps1[e.vez]++;
    pt = jogarCompleta(pt, m); e = pt.estado; n++;
  }
  return { r: e.fim ? e.fim.resultado : 0, n, caps1 };
}
const ids = Object.keys(PERSONALIDADES), S = {};
for (const i of ids) S[i] = { caps: 0, jog: 0, g: 0 };
for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
  if (SO && !(SO.includes(ids[a]) && SO.includes(ids[b]))) continue;
  const rng = mulberry32(100 + a * 10 + b); let va = 0, vb = 0, ev = 0;
  for (let g = 0; g < N; g++) {
    const sw = g % 2; const pa = sw ? ids[b] : ids[a], pb = sw ? ids[a] : ids[b];
    const o = jogo(pa, pb, rng);
    const ca = sw ? o.caps1[2] : o.caps1[1], cb = sw ? o.caps1[1] : o.caps1[2];
    S[ids[a]].caps += ca; S[ids[b]].caps += cb; S[ids[a]].jog += o.n; S[ids[b]].jog += o.n; S[ids[a]].g++; S[ids[b]].g++;
    const w = o.r === 0 ? 0 : (o.r === 1 ? (sw ? ids[b] : ids[a]) : (sw ? ids[a] : ids[b]));
    if (w === 0) ev++; else if (w === ids[a]) va++; else vb++;
  }
  console.log(`${ids[a]} vs ${ids[b]}: ${va}-${vb} (empates ${ev})  -> ${(100 * va / N).toFixed(0)}%/${(100 * vb / N).toFixed(0)}%`);
}
for (const i of ids) console.log(i, 'capF1/jogo', (S[i].caps / S[i].g).toFixed(2), 'jogadas/jogo', (S[i].jog / S[i].g).toFixed(1));
const A = S.agressiva, P = S.prudente;
if (!A.g || !P.g) process.exit(0);
console.log('capturas F1 agr/pru', ((A.caps / A.g) / (P.caps / P.g)).toFixed(2), ' duracao pru/agr', ((P.jog / P.g) / (A.jog / A.g)).toFixed(2));
