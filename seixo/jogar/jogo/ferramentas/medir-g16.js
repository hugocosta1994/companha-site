import { gerar } from "../js/nucleo/gerador.js";
import { contarSolucoes } from "../js/nucleo/verificador.js";
import { carregarPuzzle } from "../js/nucleo/formato.js";
const GERADOR_MAX_MS = 2e3;
const VERIFICADOR_MAX_MS = 200;
function percentil(valores, p) {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  return v[Math.min(v.length - 1, Math.max(0, Math.ceil(p / 100 * v.length) - 1))];
}
const ceder = () => new Promise((r) => setTimeout(r, 0));
async function medirG16({ seeds = 100, prefixo = "g16", aoProgresso = null } = {}) {
  const tg = [], tv = [];
  let acertos = 0;
  for (let s = 0; s < seeds; s++) {
    const t0 = performance.now();
    const r = gerar({ variante: "equilibrio", n: 8, dificuldade: "dificil", seed: `${prefixo}:${s}` });
    tg.push(performance.now() - t0);
    if (r.alvoAtingido) acertos++;
    const p = carregarPuzzle(r.puzzle);
    const t1 = performance.now();
    contarSolucoes(p, 2);
    tv.push(performance.now() - t1);
    if (aoProgresso) aoProgresso(s + 1, seeds);
    await ceder();
  }
  const resumo = (t) => ({ p50: arred(percentil(t, 50)), p95: arred(percentil(t, 95)), max: arred(Math.max(...t)) });
  const g = resumo(tg), v = resumo(tv);
  return {
    seeds,
    gerar: g,
    verificador: v,
    alvoAtingido: acertos,
    okGerar: g.p95 <= GERADOR_MAX_MS,
    okVerificador: v.p95 <= VERIFICADOR_MAX_MS
  };
}
const arred = (x) => Math.round(x * 10) / 10;
export {
  GERADOR_MAX_MS,
  VERIFICADOR_MAX_MS,
  medirG16,
  percentil
};
