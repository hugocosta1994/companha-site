import { VAZIA, PRETA, BRANCA } from "./formato.js";
const REGRA = {
  TRES: "tres",
  // três iguais seguidas
  METADE: "metade",
  // mais de metade de uma cor numa linha/coluna
  JUNTA: "junta",
  // junta = ou × violada
  ESPELHO: "espelho",
  // contra-espelho: a casa espelhada tem de ter a cor oposta
  ORLA: "orla"
  // orla (GDD §11.4): o perímetro tem metade de cada cor
};
function casasDaOrla(n) {
  const r = [];
  for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) if (l === 0 || c === 0 || l === n - 1 || c === n - 1) r.push(l * n + c);
  return r;
}
function proximaCor(v) {
  return v === VAZIA ? PRETA : v === PRETA ? BRANCA : VAZIA;
}
function violacoes(p, g) {
  const n = p.n;
  const celulas = /* @__PURE__ */ new Set();
  const regras = /* @__PURE__ */ new Set();
  const porRegra = /* @__PURE__ */ new Map();
  const marcar = (regra, ...idx) => {
    regras.add(regra);
    let casas = porRegra.get(regra);
    if (!casas) porRegra.set(regra, casas = /* @__PURE__ */ new Set());
    for (const i of idx) {
      celulas.add(i);
      casas.add(i);
    }
  };
  for (let k = 0; k < n; k++) {
    for (const vertical of [false, true]) {
      const at = (t) => vertical ? t * n + k : k * n + t;
      let pretas = 0, brancas = 0;
      for (let t = 0; t < n; t++) {
        const v = g[at(t)];
        if (v === PRETA) pretas++;
        else if (v === BRANCA) brancas++;
        if (t >= 2 && v !== VAZIA && g[at(t - 1)] === v && g[at(t - 2)] === v) {
          marcar(REGRA.TRES, at(t - 2), at(t - 1), at(t));
        }
      }
      for (const [cor, cont] of [[PRETA, pretas], [BRANCA, brancas]]) {
        if (cont > n / 2) {
          for (let t = 0; t < n; t++) if (g[at(t)] === cor) marcar(REGRA.METADE, at(t));
        }
      }
    }
  }
  for (const j of p.juntas) {
    const a = g[j.a], b = g[j.b];
    if (a !== VAZIA && b !== VAZIA && a === b !== j.igual) marcar(REGRA.JUNTA, j.a, j.b);
  }
  if (p.variante === "contra_espelho") {
    for (let l = 0; l < n; l++) {
      for (let c = 0; c < n / 2; c++) {
        const a = l * n + c, b = l * n + (n - 1 - c);
        if (g[a] !== VAZIA && g[a] === g[b]) marcar(REGRA.ESPELHO, a, b);
      }
    }
  }
  if (p.variante === "orla") {
    const orla = casasDaOrla(n);
    for (const cor of [PRETA, BRANCA]) {
      const casas = orla.filter((i) => g[i] === cor);
      if (casas.length > orla.length / 2) marcar(REGRA.ORLA, ...casas);
    }
  }
  return { celulas, regras, porRegra };
}
function cheia(g) {
  for (let i = 0; i < g.length; i++) if (g[i] === VAZIA) return false;
  return true;
}
function resolvida(p, g) {
  return cheia(g) && violacoes(p, g).regras.size === 0;
}
function novoJogo(p) {
  return { puzzle: p, grelha: Int8Array.from(p.dadas), historico: [], reveladas: [], pistasUsadas: 0, resolvido: false };
}
function eDada(jogo, i) {
  return jogo.puzzle.dadas[i] !== VAZIA;
}
function eRevelada(jogo, i) {
  return jogo.reveladas.includes(i);
}
function eFixa(jogo, i) {
  return eDada(jogo, i) || eRevelada(jogo, i);
}
function tocar(jogo, l, c) {
  const n = jogo.puzzle.n;
  if (l < 0 || c < 0 || l >= n || c >= n) return { ok: false, motivo: "fora" };
  const i = l * n + c;
  if (jogo.resolvido) return { ok: false, motivo: "resolvido", i };
  if (eDada(jogo, i)) return { ok: false, motivo: "dada", fixa: true, i };
  if (eRevelada(jogo, i)) return { ok: false, motivo: "revelada", fixa: true, i };
  const antes = jogo.grelha[i];
  const depois = proximaCor(antes);
  jogo.grelha[i] = depois;
  jogo.historico.push({ i, antes });
  jogo.resolvido = resolvida(jogo.puzzle, jogo.grelha);
  return { ok: true, i, antes, depois, resolvido: jogo.resolvido };
}
function desfazer(jogo) {
  if (jogo.resolvido || jogo.historico.length === 0) return null;
  const { i, antes } = jogo.historico.pop();
  jogo.grelha[i] = antes;
  return { i, cor: antes };
}
function recomecar(jogo) {
  jogo.grelha = Int8Array.from(jogo.puzzle.dadas);
  for (const i of jogo.reveladas) jogo.grelha[i] = jogo.puzzle.solucao[i];
  jogo.historico = [];
  jogo.resolvido = false;
}
function revelar(jogo, i) {
  const p = jogo.puzzle;
  if (!Number.isInteger(i) || i < 0 || i >= p.n * p.n) return { ok: false, motivo: "fora" };
  if (jogo.resolvido) return { ok: false, motivo: "resolvido", i };
  if (eFixa(jogo, i)) return { ok: false, motivo: eDada(jogo, i) ? "dada" : "revelada", fixa: true, i };
  const antes = jogo.grelha[i];
  const depois = p.solucao[i];
  jogo.grelha[i] = depois;
  jogo.reveladas.push(i);
  jogo.historico = jogo.historico.filter((h) => h.i !== i);
  jogo.pistasUsadas++;
  jogo.resolvido = resolvida(p, jogo.grelha);
  return { ok: true, i, antes, depois, resolvido: jogo.resolvido };
}
const CHAR = [".", "P", "B"];
const DE_CHAR = { ".": VAZIA, P: PRETA, B: BRANCA };
function historicoParaGravar(jogo) {
  return jogo.historico.map(({ i, antes }) => [i, CHAR[antes]]);
}
function estadoParaGravar(jogo) {
  let grelha = "";
  for (let i = 0; i < jogo.grelha.length; i++) grelha += CHAR[jogo.grelha[i]];
  return { grelha, reveladas: jogo.reveladas.slice(), historico: historicoParaGravar(jogo), pistasUsadas: jogo.pistasUsadas };
}
function retomarJogo(p, reg) {
  const jogo = novoJogo(p);
  if (!reg) return jogo;
  const nn = p.n * p.n;
  const valido = (i) => Number.isInteger(i) && i >= 0 && i < nn;
  if (typeof reg.grelha === "string" && reg.grelha.length === nn) {
    for (let i = 0; i < nn; i++) {
      const v = DE_CHAR[reg.grelha[i]];
      if (v !== void 0 && !eDada(jogo, i)) jogo.grelha[i] = v;
    }
  }
  for (const i of reg.reveladas || []) {
    if (valido(i) && !eFixa(jogo, i)) {
      jogo.reveladas.push(i);
      jogo.grelha[i] = p.solucao[i];
    }
  }
  for (const h of reg.historico || []) {
    if (Array.isArray(h) && valido(h[0]) && !eFixa(jogo, h[0]) && DE_CHAR[h[1]] !== void 0) {
      jogo.historico.push({ i: h[0], antes: DE_CHAR[h[1]] });
    }
  }
  jogo.pistasUsadas = Math.max(0, Math.floor(Number(reg.pistasUsadas) || 0));
  jogo.resolvido = resolvida(p, jogo.grelha);
  return jogo;
}
export {
  REGRA,
  casasDaOrla,
  cheia,
  desfazer,
  eDada,
  eFixa,
  eRevelada,
  estadoParaGravar,
  historicoParaGravar,
  novoJogo,
  proximaCor,
  recomecar,
  resolvida,
  retomarJogo,
  revelar,
  tocar,
  violacoes
};
