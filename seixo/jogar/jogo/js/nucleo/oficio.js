const PO_FACIL = 1, PO_MEDIO = 2, PO_DIFICIL = 3, PO_DESCOBERTA = 5;
const NIVEIS_PO = Object.freeze([0, 20, 60, 140, 280]);
const NIVEIS_LASCAS = Object.freeze([0, 25, 40, 60, 100]);
const NOMES_NIVEL = Object.freeze(["Aprendiz", "Ajudante", "Calceteiro", "Oficial", "Mestre"]);
const DESCOBERTAS = Object.freeze(["DESC-N2", "DESC-N3", "DESC-JUNTAS", "DESC-CONTRA", "DESC-ORLA"]);
const PACOTE_DO_NIVEL = Object.freeze({ 2: "PAC-RIA", 4: "PAC-MOSTEIRO", 5: "PAC-AZULEJO-CALCADA" });
const idNivel = (n) => `NIV-${n}`;
const idSelo = (n) => `SELO-${n}`;
function poDe(dificuldade) {
  return dificuldade === "facil" ? PO_FACIL : dificuldade === "dificil" ? PO_DIFICIL : PO_MEDIO;
}
function nivelDePo(po) {
  let n = 1;
  for (let i = 1; i < NIVEIS_PO.length; i++) if (po >= NIVEIS_PO[i]) n = i + 1;
  return n;
}
function faltam(po) {
  const n = nivelDePo(po);
  return n >= NIVEIS_PO.length ? 0 : NIVEIS_PO[n] - po;
}
function descobertasDe(puzzle) {
  const r = [];
  const t = puzzle && puzzle.classificacao && puzzle.classificacao.nivelMax;
  if (t === "N2") r.push("DESC-N2");
  else if (t === "N3") r.push("DESC-N3");
  const v = puzzle && puzzle.variante;
  if (v === "juntas") r.push("DESC-JUNTAS");
  else if (v === "contra_espelho") r.push("DESC-CONTRA");
  else if (v === "orla") r.push("DESC-ORLA");
  return r;
}
function oficioInicial() {
  return { po: 0, nivel: 1, descobertas: [] };
}
const ehSemPista = (reg) => !!reg && reg.estado === "resolvido";
function recalcularPo(puzzles, dificuldadeDe) {
  let po = 0;
  for (const [id, reg] of Object.entries(puzzles || {})) {
    if (ehSemPista(reg)) po += poDe(dificuldadeDe ? dificuldadeDe(id) : null);
  }
  return po;
}
let fonteDificuldade = null;
function configurarDificuldades(fn) {
  fonteDificuldade = typeof fn === "function" ? fn : null;
}
const dificuldadeConfigurada = () => fonteDificuldade;
function garantir(doc) {
  if (!doc.oficio) doc.oficio = oficioInicial();
  if (!doc.lascas) doc.lascas = { saldo: 0, ganhasTotal: 0 };
  if (!doc.inventario) doc.inventario = { pistas: 0, itens: [] };
  if (!doc.inventario.itens) doc.inventario.itens = [];
  return doc;
}
function darItem(doc, id, via, eventos) {
  if (doc.inventario.itens.includes(id)) return;
  doc.inventario.itens.push(id);
  eventos.push(["item:obtido", { id, via }]);
}
function aoResolver(doc, puzzle, { semPista }) {
  const eventos = [];
  if (!semPista) return { mudou: false, eventos };
  garantir(doc);
  const of = doc.oficio;
  const antes = of.nivel;
  const dpuz = poDe(puzzle.dificuldade);
  of.po += dpuz;
  eventos.push(["oficio:pontos", { delta: dpuz, po: of.po, motivo: "puzzle" }]);
  for (const d of descobertasDe(puzzle)) {
    if (of.descobertas.includes(d)) continue;
    of.descobertas.push(d);
    of.po += PO_DESCOBERTA;
    eventos.push(["oficio:pontos", { delta: PO_DESCOBERTA, po: of.po, motivo: "descoberta" }]);
  }
  const novo = nivelDePo(of.po);
  for (let n = antes + 1; n <= novo; n++) {
    const lascas = NIVEIS_LASCAS[n - 1];
    doc.lascas.saldo += lascas;
    doc.lascas.ganhasTotal += lascas;
    eventos.push(["lascas:alteradas", { delta: lascas, saldo: doc.lascas.saldo, motivo: "nivel" }]);
    darItem(doc, idSelo(n), "nivel", eventos);
    if (n === 5) darItem(doc, "MOLD-MESTRE", "nivel", eventos);
    if (PACOTE_DO_NIVEL[n]) darItem(doc, PACOTE_DO_NIVEL[n], "nivel", eventos);
    eventos.push(["oficio:nivel", { antes: n - 1, nivel: n, lascas, selo: idSelo(n) }]);
  }
  of.nivel = Math.max(of.nivel, novo);
  return { mudou: true, eventos };
}
export {
  DESCOBERTAS,
  NIVEIS_LASCAS,
  NIVEIS_PO,
  NOMES_NIVEL,
  PACOTE_DO_NIVEL,
  PO_DESCOBERTA,
  PO_DIFICIL,
  PO_FACIL,
  PO_MEDIO,
  aoResolver,
  configurarDificuldades,
  descobertasDe,
  dificuldadeConfigurada,
  faltam,
  idNivel,
  idSelo,
  nivelDePo,
  oficioInicial,
  poDe,
  recalcularPo
};
