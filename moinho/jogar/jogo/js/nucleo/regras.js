import { PECAS, SEM_CAPTURA_MAX } from "../config.js";
import { ADJ, MOINHOS_DO_PONTO, N } from "./tabuleiro.js";
const outro = (j) => 3 - j;
function novoEstado() {
  return { celas: new Array(N).fill(0), porColocar: [0, PECAS, PECAS], vez: 1, remover: false, semCaptura: 0, fim: null, ultimoMoinho: null };
}
const noTabuleiro = (e, j) => {
  let n = 0;
  for (let p = 0; p < N; p++) if (e.celas[p] === j) n++;
  return n;
};
const totalPecas = (e, j) => noTabuleiro(e, j) + e.porColocar[j];
function fase(e, j = e.vez) {
  if (e.porColocar[j] > 0) return "colocar";
  return noTabuleiro(e, j) === 3 ? "voar" : "mover";
}
const emMoinho = (celas, p) => MOINHOS_DO_PONTO[p].some((m) => m.every((q) => celas[q] === celas[p]));
function moinhosFormados(celas, p) {
  return MOINHOS_DO_PONTO[p].filter((m) => m.every((q) => celas[q] === celas[p]));
}
function removiveis(e, j = e.vez) {
  const adv = outro(j), todas = [];
  for (let p = 0; p < N; p++) if (e.celas[p] === adv) todas.push(p);
  const fora = todas.filter((p) => !emMoinho(e.celas, p));
  return fora.length ? fora : todas;
}
function livres(e) {
  const r = [];
  for (let p = 0; p < N; p++) if (e.celas[p] === 0) r.push(p);
  return r;
}
function destinos(e, de) {
  if (e.fim || e.remover) return [];
  const f = fase(e);
  if (f === "colocar") return de === void 0 ? livres(e) : [];
  if (de === void 0 || e.celas[de] !== e.vez) return [];
  return f === "voar" ? livres(e) : ADJ[de].filter((q) => e.celas[q] === 0);
}
function jogadasSimples(e) {
  if (e.fim || e.remover) return [];
  if (fase(e) === "colocar") return livres(e).map((para) => ({ para }));
  const r = [];
  for (let de = 0; de < N; de++) if (e.celas[de] === e.vez) for (const para of destinos(e, de)) r.push({ de, para });
  return r;
}
function legal(e, m) {
  if (e.fim || e.remover) return false;
  return m.de === void 0 ? fase(e) === "colocar" && e.celas[m.para] === 0 : destinos(e, m.de).includes(m.para);
}
function jogar(e, m) {
  if (!legal(e, m)) throw new Error("jogada ilegal");
  return passo(e, m);
}
function passo(e, m) {
  const celas = e.celas.slice(), por = e.porColocar.slice(), j = e.vez;
  const f = fase(e);
  if (m.de === void 0) por[j]--;
  else celas[m.de] = 0;
  celas[m.para] = j;
  const mills = MOINHOS_DO_PONTO[m.para].filter((l) => l.every((q) => celas[q] === j));
  const n = { celas, porColocar: por, vez: j, remover: mills.length > 0, semCaptura: f === "colocar" ? 0 : e.semCaptura + 1, fim: null, ultimoMoinho: mills.length ? mills : null };
  return n.remover ? n : passarVez(n);
}
function remover(e, p) {
  if (!e.remover || !removiveis(e).includes(p)) throw new Error("remo\xE7\xE3o ilegal");
  return tirar(e, p);
}
function tirar(e, p) {
  const celas = e.celas.slice();
  celas[p] = 0;
  const n = { celas, porColocar: e.porColocar, vez: e.vez, remover: false, semCaptura: 0, fim: null, ultimoMoinho: null };
  if (totalPecas(n, outro(e.vez)) < 3) {
    n.fim = { resultado: e.vez, motivo: "duas_pecas" };
    return n;
  }
  return passarVez(n);
}
function temMovimento(n) {
  const c = n.celas, j = n.vez;
  for (let p = 0; p < N; p++) if (c[p] === j) {
    for (const q of ADJ[p]) if (c[q] === 0) return true;
  }
  return false;
}
function passarVez(n) {
  n.vez = outro(n.vez);
  if (n.semCaptura >= SEM_CAPTURA_MAX) n.fim = { resultado: 0, motivo: "cinquenta" };
  else if (fase(n) === "mover" && !temMovimento(n)) n.fim = { resultado: outro(n.vez), motivo: "sem_movimentos" };
  return n;
}
function aplicar(e, m) {
  const n = jogar(e, m);
  return n.remover ? remover(n, m.tirar) : n;
}
function jogadasCompletas(e) {
  const r = [];
  for (const m of jogadasSimples(e)) {
    const n = jogar(e, m);
    if (n.remover) for (const t of removiveis(n)) r.push({ ...m, tirar: t });
    else r.push(m);
  }
  return r;
}
const chavePosicao = (e) => `${e.celas.join("")}|${e.vez}|${e.porColocar[1]}${e.porColocar[2]}`;
function filhosCompletos(e) {
  const r = [];
  for (const m of jogadasSimples(e)) {
    const n = passo(e, m);
    if (n.remover) for (const t of removiveis(n)) r.push({ m: { ...m, tirar: t }, n: tirar(n, t) });
    else r.push({ m, n });
  }
  return r;
}
export {
  aplicar,
  chavePosicao,
  destinos,
  emMoinho,
  fase,
  filhosCompletos,
  jogadasCompletas,
  jogadasSimples,
  jogar,
  legal,
  moinhosFormados,
  noTabuleiro,
  novoEstado,
  outro,
  remover,
  removiveis,
  totalPecas
};
