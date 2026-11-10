import { diaDaSemana } from "./dia.js";
const QUADRADOS_PACOTE = 20;
const COLUNAS_MES = 7;
const COLUNAS_PACOTE = 5;
const LASCAS_PRACA = 50;
const RE_DIA = /^D-(\d{4}-\d{2})-(\d{2})$/;
const PACOTE = "PAC-(?:SAZ-\\d{4}-Q[1-4]|[A-Z]+(?:-[A-Z]+)*)";
const RE_CURADO = new RegExp(`^(${PACOTE})-(\\d{2})$`);
const RE_PACOTE = new RegExp(`^${PACOTE}$`);
const RE_MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const eResolvido = (reg) => !!reg && (reg.estado === "resolvido" || reg.estado === "resolvido_com_pistas");
const eMes = (praca) => RE_MES.test(praca || "");
const ePacote = (praca) => RE_PACOTE.test(praca || "");
const eSazonal = (praca) => /^PAC-SAZ-\d{4}-Q[1-4]$/.test(praca || "");
function diasDoMes(mes) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}
function quadradoDe(id) {
  let m = RE_DIA.exec(id || "");
  if (m) {
    const dia = Number(m[2]);
    return dia >= 1 && dia <= diasDoMes(m[1]) ? { praca: m[1], quadrado: dia } : null;
  }
  m = RE_CURADO.exec(id || "");
  if (m) {
    const i = Number(m[2]);
    return i >= 1 && i <= QUADRADOS_PACOTE ? { praca: m[1], quadrado: i } : null;
  }
  return null;
}
function idDoQuadrado(praca, quadrado) {
  const nn = String(quadrado).padStart(2, "0");
  return eMes(praca) ? `D-${praca}-${nn}` : `${praca}-${nn}`;
}
function disposicao(praca) {
  if (eMes(praca)) {
    const total = diasDoMes(praca), deslocamento = diaDaSemana(`${praca}-01`);
    return { colunas: COLUNAS_MES, filas: Math.ceil((deslocamento + total) / COLUNAS_MES), deslocamento, total };
  }
  return { colunas: COLUNAS_PACOTE, filas: QUADRADOS_PACOTE / COLUNAS_PACOTE, deslocamento: 0, total: QUADRADOS_PACOTE };
}
function estadoDaPraca(doc, praca, hoje = null) {
  var _a;
  const d = disposicao(praca), mes = eMes(praca);
  const puzzles = doc && doc.puzzles || {};
  const quadrados = [];
  let feitos = 0;
  for (let q = 1; q <= d.total; q++) {
    const id = idDoQuadrado(praca, q), reg = puzzles[id];
    let estado = "terra";
    if (eResolvido(reg)) {
      estado = "resolvido";
      feitos++;
    } else if (mes && hoje && `${praca}-${String(q).padStart(2, "0")}` > hoje) estado = "futuro";
    quadrados.push({ quadrado: q, id, estado, registo: reg || null });
  }
  const pr = doc && doc.pracas && doc.pracas[praca] || null;
  return {
    praca,
    tipo: mes ? "mes" : "pacote",
    ...d,
    feitos,
    completa: feitos === d.total,
    acesa: !!(pr && pr.recompensaDada),
    completaEm: pr ? (_a = pr.completaEm) != null ? _a : null : null,
    quadrados
  };
}
function aoResolver(doc, id, hoje, opcoes = {}) {
  const { jaResolvido = false, lascasPraca = LASCAS_PRACA, creditar = true } = opcoes;
  const eventos = [];
  const qd = quadradoDe(id);
  if (!qd || jaResolvido || !eResolvido(doc.puzzles && doc.puzzles[id])) return { mudou: false, eventos };
  const { praca, quadrado } = qd;
  eventos.push(["praca:quadrado", { praca, quadrado, puzzleId: id }]);
  if (!doc.pracas) doc.pracas = {};
  let mudou = false;
  if (!doc.pracas[praca]) {
    doc.pracas[praca] = { completaEm: null, recompensaDada: false };
    mudou = true;
  }
  const pr = doc.pracas[praca];
  if (pr.recompensaDada || !estadoDaPraca(doc, praca).completa) return { mudou, eventos };
  pr.completaEm = hoje;
  pr.recompensaDada = true;
  mudou = true;
  if (!eMes(praca)) {
    eventos.push(["praca:completa", { praca, lascas: 0, moldura: null }]);
    return { mudou, eventos };
  }
  const moldura = `MOLD-${praca}`;
  eventos.push(["praca:completa", { praca, lascas: lascasPraca, moldura }]);
  if (creditar) {
    if (lascasPraca > 0) {
      if (!doc.lascas) doc.lascas = { saldo: 0, ganhasTotal: 0 };
      doc.lascas.saldo += lascasPraca;
      doc.lascas.ganhasTotal += lascasPraca;
      eventos.push(["lascas:alteradas", { delta: lascasPraca, saldo: doc.lascas.saldo, motivo: "praca" }]);
    }
    if (!doc.inventario) doc.inventario = { itens: [] };
    if (!doc.inventario.itens) doc.inventario.itens = [];
    if (!doc.inventario.itens.includes(moldura)) {
      doc.inventario.itens.push(moldura);
      eventos.push(["item:obtido", { id: moldura, via: "ganho" }]);
    }
  }
  return { mudou, eventos };
}
function pracasComAlgo(doc, pacotes = ["PAC-ROSSIO", "PAC-CHIADO", "PAC-RIBEIRA", "PAC-RIA", "PAC-MOSTEIRO", "PAC-AZULEJO-CALCADA"]) {
  const meses = /* @__PURE__ */ new Set(), pacs = /* @__PURE__ */ new Set();
  for (const [id, reg] of Object.entries(doc && doc.puzzles || {})) {
    if (!eResolvido(reg)) continue;
    const qd = quadradoDe(id);
    if (qd) (eMes(qd.praca) ? meses : pacs).add(qd.praca);
  }
  const sazonais = [...pacs].filter((p) => eSazonal(p) && !pacotes.includes(p)).sort();
  return [...[...meses].sort().reverse(), ...pacotes.filter((p) => pacs.has(p)), ...sazonais];
}
export {
  COLUNAS_MES,
  COLUNAS_PACOTE,
  LASCAS_PRACA,
  QUADRADOS_PACOTE,
  aoResolver,
  diasDoMes,
  disposicao,
  eMes,
  ePacote,
  eResolvido,
  estadoDaPraca,
  idDoQuadrado,
  pracasComAlgo,
  quadradoDe
};
