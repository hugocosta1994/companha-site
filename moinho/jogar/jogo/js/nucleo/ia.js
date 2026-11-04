import { AVALIACAO, NIVEIS, IA_MAX_MS, PERSONALIDADES, PERSONALIDADE_PADRAO } from "../config.js";
import { ADJ, MOINHOS, N } from "./tabuleiro.js";
import { aplicar, fase, filhosCompletos, jogadasCompletas, jogadasSimples, jogar, noTabuleiro, outro, totalPecas } from "./regras.js";
const VITORIA = 1e5;
function lado(e, j) {
  const c = e.celas;
  let moinhos = 0, quase = 0, bloq = 0, mob = 0;
  for (const m of MOINHOS) {
    let a = 0, v = 0;
    for (const p of m) {
      if (c[p] === j) a++;
      else if (c[p] === 0) v++;
    }
    if (a === 3) moinhos++;
    else if (a === 2 && v === 1) quase++;
  }
  for (let p = 0; p < N; p++) if (c[p] === j) {
    let l = 0;
    for (const q of ADJ[p]) if (c[q] === 0) l++;
    if (l === 0) bloq++;
    mob += l;
  }
  return { moinhos, quase, bloq, mob, voa: e.porColocar[j] === 0 && noTabuleiro(e, j) === 3 };
}
function avaliar(e, j, W = AVALIACAO) {
  const a = lado(e, j), b = lado(e, outro(j));
  let v = (totalPecas(e, j) - totalPecas(e, outro(j))) * W.pecas + (a.moinhos - b.moinhos) * W.moinhos + (a.quase - b.quase) * W.quase + (a.mob - b.mob) * W.mobilidade + (a.bloq - b.bloq) * W.bloqueadas;
  if (a.voa && !b.voa) v += W.bonusVoo;
  if (b.voa && !a.voa) v -= W.bonusVoo;
  return v;
}
const ordenar = (ms) => ms.sort((x, y) => (y.tirar !== void 0) - (x.tirar !== void 0));
class Tempo extends Error {
}
function pesquisa(e, prof, alfa, beta, raiz, ctx) {
  const W = ctx.W;
  if (e.fim) return e.fim.resultado === 0 ? 0 : e.fim.resultado === raiz ? VITORIA + prof : -VITORIA - prof;
  if (prof === 0) return avaliar(e, raiz, W);
  if ((++ctx.nos & 3) === 0 && ctx.limite && Date.now() > ctx.limite) throw new Tempo();
  const fs = filhosCompletos(e);
  fs.sort((x, y) => (y.m.tirar !== void 0) - (x.m.tirar !== void 0));
  if (e.vez === raiz) {
    let melhor2 = -Infinity;
    for (const f of fs) {
      melhor2 = Math.max(melhor2, pesquisa(f.n, prof - 1, alfa, beta, raiz, ctx));
      alfa = Math.max(alfa, melhor2);
      if (alfa >= beta) break;
    }
    return melhor2;
  }
  let melhor = Infinity;
  for (const f of fs) {
    melhor = Math.min(melhor, pesquisa(f.n, prof - 1, alfa, beta, raiz, ctx));
    beta = Math.min(beta, melhor);
    if (alfa >= beta) break;
  }
  return melhor;
}
function momentoCritico(e, ms) {
  if (ms.some((m) => m.tirar !== void 0)) return true;
  return jogadasCompletas({ ...e, vez: outro(e.vez) }).some((m) => m.tirar !== void 0);
}
function ameacasAdversarias(n, j) {
  const adv = { ...n, vez: outro(j), remover: false };
  if (n.fim) return 0;
  let c = 0;
  for (const m of jogadasSimples(adv)) if (jogar(adv, m).remover) c++;
  return c;
}
const METRICAS = {
  ameacas: (n, j) => -ameacasAdversarias(n, j),
  quase: (n, j) => lado(n, j).quase,
  destinos: (n, j) => lado(n, j).mob
};
function escolherJogada(e, { nivel = "media", rng = Math.random, semLimite = false, profundidade, personalidade = PERSONALIDADE_PADRAO, info = null } = {}) {
  const cfg = NIVEIS[nivel];
  const pers = PERSONALIDADES[personalidade] || PERSONALIDADES[PERSONALIDADE_PADRAO];
  const W = { ...AVALIACAO, ...pers.pesos };
  const ms = ordenar(jogadasCompletas(e));
  if (!ms.length) return null;
  if (cfg.ignoraMoinho && ms.some((m) => m.tirar !== void 0) && rng() < cfg.ignoraMoinho) {
    const sem = ms.filter((m) => m.tirar === void 0);
    if (sem.length) return sem[Math.floor(rng() * sem.length)];
  }
  const livre = !cfg.acasoSeguro || fase(e) !== "voar" && !momentoCritico(e, ms);
  if (cfg.acaso && livre && rng() < cfg.acaso) return ms[Math.floor(rng() * ms.length)];
  const D = profundidade || cfg.profundidadeMax || cfg.profundidade;
  const ctx = { W, nos: 0, limite: semLimite ? 0 : Date.now() + Math.round((cfg.limiteMs || IA_MAX_MS) * 0.65) };
  let escolhida = ms[0];
  let melhorFinal = -Infinity, dFeito = 0;
  for (let d = 1; d <= D; d++) {
    let melhorV = -Infinity, melhor = null;
    try {
      for (const m of ms) {
        if (ctx.limite && Date.now() > ctx.limite) throw new Tempo();
        const v = pesquisa(aplicar(e, m), d - 1, melhorV, Infinity, e.vez, ctx);
        if (v > melhorV) {
          melhorV = v;
          melhor = m;
        }
      }
    } catch (x) {
      if (x instanceof Tempo) break;
      throw x;
    }
    escolhida = melhor;
    melhorFinal = melhorV;
    dFeito = d;
    ms.splice(ms.indexOf(melhor), 1);
    ms.unshift(melhor);
    if (melhorV >= VITORIA) break;
  }
  if (info) {
    info.profundidade = dFeito;
    info.degradou = dFeito < D;
  }
  if (pers.desempate && ms.length > 1 && dFeito > 0 && melhorFinal < VITORIA) {
    try {
      const empatadas = [escolhida];
      for (const m of ms) {
        if (m === escolhida) continue;
        if (ctx.limite && Date.now() > ctx.limite) throw new Tempo();
        const v = pesquisa(aplicar(e, m), dFeito - 1, melhorFinal - 1, Infinity, e.vez, ctx);
        if (v >= melhorFinal) empatadas.push(m);
      }
      if (empatadas.length > 1) {
        const f = METRICAS[pers.desempate];
        let melhorM = escolhida, melhorS = f(aplicar(e, escolhida), e.vez);
        for (const m of empatadas) {
          const sc = f(aplicar(e, m), e.vez);
          if (sc > melhorS) {
            melhorS = sc;
            melhorM = m;
          }
        }
        escolhida = melhorM;
      }
    } catch (x) {
      if (!(x instanceof Tempo)) throw x;
    }
  }
  return escolhida;
}
export {
  avaliar,
  escolherJogada
};
