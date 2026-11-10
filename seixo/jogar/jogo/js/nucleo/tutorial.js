import { VAZIA } from "./formato.js";
import { violacoes, REGRA } from "./regras.js";
import { proximoPasso } from "./resolver.js";
const PUZZLES_TUTORIAL = Object.freeze(["PAC-ROSSIO-01", "PAC-ROSSIO-02", "PAC-ROSSIO-03"]);
const TUTORIAL_AJUDA_S = 30;
const PISTAS_INICIAIS = 3;
const PASSO_INICIAL = ["p1_toque", "p2_regra", "p3"];
const PASSOS_V3 = Object.freeze(["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"]);
const PASSO3_INICIAL = ["T1", "T3", "T5"];
const resolvido = (reg) => !!reg && (reg.estado === "resolvido" || reg.estado === "resolvido_com_pistas");
const tutorialPorFazer = (doc) => !(doc && doc.tutorial && doc.tutorial.concluido);
const diarioDisponivel = (doc) => !tutorialPorFazer(doc);
const ecraDeArranque = (doc) => tutorialPorFazer(doc) ? "tutorial" : "inicio";
function criarTutorial(doc, { modo = "primeira", agoraMs = 0 } = {}) {
  let indice = 0;
  if (modo === "primeira") {
    const puzzles = doc && doc.puzzles || {};
    const k = PUZZLES_TUTORIAL.findIndex((id) => !resolvido(puzzles[id]));
    indice = k < 0 ? PUZZLES_TUTORIAL.length - 1 : k;
  }
  return { modo, indice, passo: PASSO_INICIAL[indice], passo3: PASSO3_INICIAL[indice], passoMs: agoraMs, inicioMs: agoraMs, toques: 0, ultimoToqueMs: agoraMs, destaque: null };
}
const puzzleAtual = (T) => PUZZLES_TUTORIAL[T.indice];
const podeSair = (T) => T.modo === "rever";
function casaForcadaTres(p, g) {
  const h = Int8Array.from(g);
  for (let k = 0; k < h.length; k++) {
    const r = proximoPasso(p, h, 1);
    if (!r || r.contradicao) return null;
    if (r.regra === REGRA.TRES) return { i: r.i, l: r.l, c: r.c, cor: r.cor };
    h[r.i] = r.cor;
  }
  return null;
}
function casaDaMao(p, g) {
  const r = proximoPasso(p, g, 1);
  if (r && !r.contradicao) return { i: r.i, l: r.l, c: r.c };
  const i = Array.from(g).indexOf(VAZIA);
  return i < 0 ? null : { i, l: Math.floor(i / p.n), c: i % p.n };
}
function vista(T, p, g) {
  var _a;
  const base = { puzzleId: puzzleAtual(T), params: {}, destaque: null, mao: false, podeSair: podeSair(T) };
  if (T.passo === "resultado") return { ...base, ecra: "resultado", chave: null };
  if (T.passo === "fim") return { ...base, ecra: "tutorial", chave: "tutorial.fim", params: { n: (_a = T.pistas) != null ? _a : PISTAS_INICIAIS } };
  if (T.passo === "saiu") return { ...base, ecra: T.modo === "rever" ? "definicoes" : "inicio", chave: null };
  const v = { ...base, ecra: "puzzle", chave: T.passo === "p2_livre" ? null : `tutorial.${T.passo}` };
  if (T.passo === "p1_toque") {
    v.destaque = T.destaque || casaDaMao(p, g);
    v.mao = true;
  }
  if (T.passo === "p2_regra" || T.passo === "p2_forcada") v.destaque = T.destaque || casaForcadaTres(p, g);
  if (T.indice < 2 && T.passo !== "p1_toque" && p && g && violacoes(p, g).celulas.size > 0) v.chave = "tutorial.desfazer";
  return v;
}
function aoTocar(T, p, g, i, agoraMs = 0) {
  const N = { ...T, toques: T.toques + 1, ultimoToqueMs: agoraMs };
  if (T.passo === "p1_toque") {
    if (!N.destaque) N.destaque = casaDaMao(p, Int8Array.from(g, (v, k) => k === i ? VAZIA : v));
    if (N.toques >= 2) {
      N.passo = "p1_regra";
      N.destaque = null;
    }
    N.passo3 = "T2";
  } else if (T.passo === "p2_regra" || T.passo === "p2_forcada") {
    const alvo = T.destaque || casaForcadaTres(p, Int8Array.from(g, (v, k) => k === i ? VAZIA : v));
    if (alvo && i === alvo.i) N.passo3 = "T4";
    if (alvo && i === alvo.i && g[i] === alvo.cor) {
      N.passo = "p2_livre";
      N.destaque = null;
    } else {
      N.passo = "p2_forcada";
      N.destaque = alvo;
    }
  }
  return N;
}
function precisaAjuda(T, agoraMs, ajudaS = TUTORIAL_AJUDA_S) {
  return T.passo === "p3" && agoraMs - T.ultimoToqueMs >= ajudaS * 1e3;
}
const aoAjudar = (T, agoraMs) => ({ ...T, ultimoToqueMs: agoraMs });
const passoEvento = (T, agoraMs = 0) => ["tutorial3:passo", { id: T.passo3, ms: Math.max(0, Math.round(agoraMs - (T.passoMs || 0))) }];
function aoResolver(T, doc, hoje, { pistasIniciais = PISTAS_INICIAIS, semPista = false, agoraMs = 0 } = {}) {
  if (T.indice < PUZZLES_TUTORIAL.length - 1) return { T: { ...T, passo: "resultado", destaque: null }, eventos: [] };
  const eventos = [];
  const T6 = { passo3: "T6", semPista: !!semPista, subiu: false, passoMs: agoraMs };
  if (T.modo === "primeira" && doc && tutorialPorFazer(doc)) {
    if (!doc.tutorial) doc.tutorial = { concluido: false, concluidoEm: null, introsVistas: [] };
    doc.tutorial.concluido = true;
    doc.tutorial.concluidoEm = hoje;
    if (semPista && !doc.tutorial.p3SemPista) {
      doc.tutorial.p3SemPista = true;
      T6.subiu = true;
    }
    if (!doc.inventario) doc.inventario = { pistas: 0, itens: [] };
    doc.inventario.pistas = (doc.inventario.pistas || 0) + pistasIniciais;
    eventos.push(["pistas:alteradas", { delta: pistasIniciais, saldo: doc.inventario.pistas, motivo: "tutorial" }]);
    eventos.push(["tutorial:concluido", { pistas: pistasIniciais }]);
    return { T: { ...T, ...T6, passo: "fim", destaque: null, pistas: pistasIniciais }, eventos };
  }
  return { T: { ...T, ...T6, passo: T.modo === "rever" ? "saiu" : "fim", destaque: null, pistas: 0 }, eventos };
}
function continuar(T, agoraMs = 0) {
  if (T.passo === "resultado") {
    const indice = T.indice + 1;
    return { ...T, indice, passo: PASSO_INICIAL[indice], passo3: PASSO3_INICIAL[indice], passoMs: agoraMs, toques: 0, ultimoToqueMs: agoraMs, destaque: null };
  }
  if (T.passo === "fim") return { ...T, passo: "saiu" };
  return T;
}
function avancarCartoes(T, agoraMs = 0) {
  const seg = { T6: "T7", T7: "T8", T8: "fim" }[T.passo3];
  if (!seg) return { T, eventos: [] };
  const eventos = [["tutorial3:passo", { id: T.passo3, ms: Math.max(0, Math.round(agoraMs - (T.passoMs || 0))) }]];
  if (seg === "fim") eventos.push(["tutorial3:fim", { total_ms: Math.max(0, Math.round(agoraMs - (T.inicioMs || 0))) }]);
  return { T: { ...T, passo3: seg === "fim" ? "T8" : seg, passoMs: agoraMs, cartoesFeitos: seg === "fim" }, eventos };
}
const saltarParaCartoes = (T, agoraMs = 0) => ({ ...T, passo3: "T7", passoMs: agoraMs });
const contaTutorialL19 = (doc) => doc && doc.tutorial && doc.tutorial.p3SemPista ? 1 : 0;
const ehPuzzleTutorial = (id) => PUZZLES_TUTORIAL.includes(id);
function saltar(doc, hoje) {
  if (!tutorialPorFazer(doc)) return { eventos: [] };
  if (!doc.tutorial) doc.tutorial = { concluido: false, concluidoEm: null, introsVistas: [] };
  doc.tutorial.concluido = true;
  doc.tutorial.concluidoEm = hoje;
  doc.tutorial.saltado = true;
  return { eventos: [["tutorial:concluido", { pistas: 0 }]] };
}
export {
  PASSOS_V3,
  PISTAS_INICIAIS,
  PUZZLES_TUTORIAL,
  TUTORIAL_AJUDA_S,
  aoAjudar,
  aoResolver,
  aoTocar,
  avancarCartoes,
  casaForcadaTres,
  contaTutorialL19,
  continuar,
  criarTutorial,
  diarioDisponivel,
  ecraDeArranque,
  ehPuzzleTutorial,
  passoEvento,
  podeSair,
  precisaAjuda,
  puzzleAtual,
  saltar,
  saltarParaCartoes,
  tutorialPorFazer,
  vista
};
