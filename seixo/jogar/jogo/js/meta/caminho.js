import { CONFIG } from "../config.js";
import { gerar } from "../nucleo/gerador.js";
import { dataLocal } from "../nucleo/dia.js";
const CAMINHO_TENTATIVAS = 3;
const N2_MAX_APOS_D = 6;
const DIF = { F: "facil", M: "medio", D: "dificil" };
const FAIXA = { facil: "F", medio: "M", dificil: "D" };
const RE_CAMINHO = /^CAM-(\d+)$/;
const idCaminho = (n) => `CAM-${n}`;
const caminhoDoId = (id) => {
  const m = RE_CAMINHO.exec(id || "");
  return m ? Number(m[1]) : null;
};
let TABELA = null;
let RESERVA = null;
const cache = /* @__PURE__ */ new Map();
function configurarCaminho({ tabela = TABELA, reserva = RESERVA } = {}) {
  TABELA = tabela;
  RESERVA = reserva;
  cache.clear();
}
function parametrosCaminho(n, tabela = TABELA) {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Caminho: n\xEDvel ${n} inv\xE1lido`);
  if (!tabela || !Array.isArray(tabela.trocos) || !tabela.trocos.length) throw new Error("Caminho: tabela de n\xEDveis em falta");
  const N = CONFIG.CAMINHO_TROCO_N || 10;
  const troco = Math.ceil(n / N), pos = (n - 1) % N;
  const t = tabela.trocos;
  const ciclo = tabela.cicloDesde || t.length;
  const linha = t.find((l) => l.troco === Math.min(troco, ciclo)) || t[t.length - 1];
  return { n, troco, pos, faixa: linha.faixas[pos], variante: linha.variantes && linha.variantes[pos] || linha.variante, tamanho: linha.n };
}
const faixaDe = (n, tabela = TABELA) => parametrosCaminho(n, tabela).faixa;
const aposD = (n, tabela) => n > 1 && faixaDe(n - 1, tabela) === "D";
function cumpreFaixa(puzzle, faixa, depoisDeD = false) {
  var _a, _b, _c;
  if (!puzzle || puzzle.dificuldade !== DIF[faixa]) return false;
  if (faixa === "M" && depoisDeD) return ((_c = (_b = (_a = puzzle.classificacao) == null ? void 0 : _a.passos) == null ? void 0 : _b.N2) != null ? _c : 99) <= N2_MAX_APOS_D;
  return true;
}
function comOrigem(p, n, extra = {}) {
  return { ...p, id: idCaminho(n), origem: { ...p.origem || {}, tipo: "caminho", indice: n, ...extra } };
}
function nivelDeReserva(n, tabela = TABELA, reserva = RESERVA) {
  const faixa = faixaDe(n, tabela);
  const lista = reserva && reserva.niveis && reserva.niveis[DIF[faixa]];
  if (!Array.isArray(lista) || !lista.length) return null;
  const base = lista[(n - 1) % lista.length];
  return comOrigem(structuredClone(base), n, { seed: `CAM-${n}`, reserva: true });
}
function facilDeEmergencia(n) {
  for (let k = 0; k < 16; k++) {
    try {
      return gerar({
        variante: "equilibrio",
        n: 6,
        dificuldade: "facil",
        seed: `CAM-${n}#e${k}`,
        id: idCaminho(n),
        origem: { tipo: "caminho", indice: n }
      }).puzzle;
    } catch (e) {
    }
  }
  throw new Error("Caminho: sem n\xEDvel poss\xEDvel");
}
function gerarNivelCaminho(n, { tabela = TABELA, reserva = RESERVA, tentativas = CAMINHO_TENTATIVAS, maxNos } = {}) {
  const p = parametrosCaminho(n, tabela);
  const depois = aposD(n, tabela);
  for (let k = 0; k < tentativas; k++) {
    const seed = k === 0 ? `CAM-${n}` : `CAM-${n}#${k}`;
    try {
      const r = gerar({
        variante: p.variante,
        n: p.tamanho,
        dificuldade: DIF[p.faixa],
        seed,
        id: idCaminho(n),
        origem: { tipo: "caminho", indice: n },
        ...maxNos != null ? { maxNos } : {}
      });
      if (r.alvoAtingido && cumpreFaixa(r.puzzle, p.faixa, depois)) return r.puzzle;
    } catch (e) {
    }
  }
  return nivelDeReserva(n, tabela, reserva) || facilDeEmergencia(n);
}
function nivelCacheado(n) {
  if (!cache.has(n)) {
    cache.set(n, gerarNivelCaminho(n));
    if (cache.size > 8) cache.delete(cache.keys().next().value);
  }
  return structuredClone(cache.get(n));
}
function caminhoInicial() {
  return { nivel: 1, resolvidos: [], saltados: [], "tro\xE7osPagos": [], hoje: { dia: null, lascas: 0 } };
}
function caminhoDe(doc) {
  const c = doc.caminho;
  const ints = (a) => Array.isArray(a) ? a.filter((x) => Number.isInteger(x) && x >= 1) : [];
  if (!c || typeof c !== "object") doc.caminho = caminhoInicial();
  else {
    c.nivel = Number.isInteger(c.nivel) && c.nivel >= 1 ? c.nivel : 1;
    c.resolvidos = ints(c.resolvidos);
    c.saltados = ints(c.saltados);
    c["tro\xE7osPagos"] = ints(c["tro\xE7osPagos"]);
    if (!c.hoje || typeof c.hoje !== "object" || !Number.isInteger(c.hoje.lascas) || c.hoje.lascas < 0) c.hoje = { dia: null, lascas: 0 };
  }
  return doc.caminho;
}
const lascasDoc = (doc) => {
  if (!doc.lascas) doc.lascas = { saldo: 0, ganhasTotal: 0 };
  return doc.lascas;
};
const fronteira = (c) => Math.max(0, ...c.resolvidos, ...c.saltados) + 1;
const valorFaixa = (faixa) => {
  var _a;
  return (_a = CONFIG[`CAMINHO_LASCAS_${faixa}`]) != null ? _a : 1;
};
function nivelAtual(doc) {
  let n = 1;
  try {
    n = caminhoDe(doc).nivel;
    return nivelCacheado(n);
  } catch (e) {
    console.warn("[caminho] n\xEDvel atual falhou; reserva:", e);
    cache.delete(n);
    try {
      return nivelDeReserva(n) || facilDeEmergencia(n);
    } catch (e2) {
      return facilDeEmergencia(n);
    }
  }
}
function lascasHoje(doc, hoje = dataLocal(/* @__PURE__ */ new Date())) {
  const c = caminhoDe(doc);
  return { ganhas: c.hoje.dia === hoje ? c.hoje.lascas : 0, teto: CONFIG.CAMINHO_TETO_DIA };
}
function resolver(doc, n, { comPista = false, faixa, hoje = dataLocal(/* @__PURE__ */ new Date()), tabela = TABELA } = {}) {
  const c = caminhoDe(doc);
  const eventos = [];
  if (!Number.isInteger(n) || n < 1 || c.resolvidos.includes(n)) return { lascas: 0, bonusTroco: 0, proximo: c.nivel, primeiraVez: false, eventos };
  const f = faixa || (tabela ? faixaDe(n, tabela) : "M");
  if (c.hoje.dia !== hoje) c.hoje = { dia: hoje, lascas: 0 };
  const teto = CONFIG.CAMINHO_TETO_DIA;
  const lascas = Math.max(0, Math.min(valorFaixa(f), teto - c.hoje.lascas));
  c.hoje.lascas += lascas;
  c.resolvidos.push(n);
  c.saltados = c.saltados.filter((x) => x !== n);
  const l = lascasDoc(doc);
  if (lascas > 0) {
    l.saldo += lascas;
    l.ganhasTotal += lascas;
    eventos.push(["lascas:alteradas", { delta: lascas, saldo: l.saldo, motivo: "caminho" }]);
  }
  eventos.push(["caminho:resolvido", { n, lascas, comPista: !!comPista }]);
  let bonusTroco = 0;
  const N = CONFIG.CAMINHO_TROCO_N || 10;
  if (n % N === 0) {
    const troco = n / N;
    if (!c["tro\xE7osPagos"].includes(troco)) {
      c["tro\xE7osPagos"].push(troco);
      bonusTroco = CONFIG.CAMINHO_LASCAS_TROCO;
      l.saldo += bonusTroco;
      l.ganhasTotal += bonusTroco;
      eventos.push(["lascas:alteradas", { delta: bonusTroco, saldo: l.saldo, motivo: "caminho_troco" }]);
      eventos.push(["caminho:troco", { troco, bonus: bonusTroco }]);
    }
  }
  if (lascas > 0 && c.hoje.lascas >= teto && c.hoje.lascas - lascas < teto) eventos.push(["caminho:teto", {}]);
  c.nivel = c.saltados.length >= 1 && n % 5 === 0 ? Math.min(...c.saltados) : fronteira(c);
  return { lascas, bonusTroco, proximo: c.nivel, primeiraVez: true, eventos };
}
function saltar(doc, n, tempoNoNivelS) {
  const c = caminhoDe(doc);
  const minimo = CONFIG.CAMINHO_SALTAR_S;
  if (!(tempoNoNivelS >= minimo)) return { ok: false, motivo: "cedo", faltamS: Math.max(0, Math.ceil(minimo - (tempoNoNivelS || 0))), proximo: c.nivel, eventos: [] };
  if (!Number.isInteger(n) || n < 1 || c.resolvidos.includes(n)) return { ok: false, motivo: "resolvido", proximo: c.nivel, eventos: [] };
  if (!c.saltados.includes(n)) c.saltados.push(n);
  c.nivel = fronteira(c);
  return { ok: true, proximo: c.nivel, eventos: [["caminho:saltado", { n }]] };
}
function ligarCaminho({ documento, gravarJa, ouvir, emitir, hoje = () => dataLocal(/* @__PURE__ */ new Date()) }) {
  return ouvir((nome, d) => {
    if (nome !== "puzzle:resolvido" || !d) return;
    const n = caminhoDoId(d.id);
    if (n == null) return;
    try {
      const doc = documento();
      const r = resolver(doc, n, { comPista: d.pistasUsadas > 0, faixa: FAIXA[d.dificuldade], hoje: hoje() });
      if (!r.primeiraVez) return;
      const reg = doc.puzzles && doc.puzzles[idCaminho(n)];
      if (reg) {
        reg.historico = [];
        reg.reveladas = [];
      }
      try {
        gravarJa(doc);
      } catch (e) {
        console.warn("[caminho] gravar falhou:", e);
      }
      for (const [nm, dados] of r.eventos) emitir(nm, dados);
    } catch (e) {
      console.warn("[caminho] falhou:", e);
    }
  });
}
export {
  CAMINHO_TENTATIVAS,
  N2_MAX_APOS_D,
  RE_CAMINHO,
  caminhoDe,
  caminhoDoId,
  caminhoInicial,
  configurarCaminho,
  cumpreFaixa,
  faixaDe,
  gerarNivelCaminho,
  idCaminho,
  lascasHoje,
  ligarCaminho,
  nivelAtual,
  nivelDeReserva,
  parametrosCaminho,
  resolver,
  saltar
};
