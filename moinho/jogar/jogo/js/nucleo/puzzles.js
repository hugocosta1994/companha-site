import { novoEstado, jogar, aplicar, jogadasSimples, jogadasCompletas, outro, fase, emMoinho } from "./regras.js";
import { N } from "./tabuleiro.js";
const CH = { B: 1, P: 2, ".": 0 };
function estadoDoPuzzle(p) {
  const e = novoEstado();
  e.celas = p.tab.map((c) => CH[c]);
  e.porColocar = [0, p.porColocar.B, p.porColocar.P];
  e.vez = p.vez === "P" ? 2 : 1;
  return e;
}
const chave = (m) => `${m.de === void 0 ? "-" : m.de}>${m.para}`;
const unicas = (ms) => {
  const v = /* @__PURE__ */ new Map();
  for (const m of ms) v.set(chave(m), { de: m.de, para: m.para });
  return [...v.values()];
};
function moinhosEmUm(e) {
  return unicas(jogadasSimples(e).filter((m) => jogar(e, m).remover));
}
function ameacas(e) {
  const adv = { ...e, vez: outro(e.vez), remover: false, fim: null };
  return jogadasSimples(adv).filter((m) => jogar(adv, m).remover).length;
}
function forcamMoinhoEm2(e) {
  const j = e.vez, res = [];
  for (const m of unicas(jogadasSimples(e))) {
    const n = jogar(e, m);
    if (n.remover || n.fim) continue;
    const resp = jogadasCompletas(n);
    if (!resp.length) continue;
    let ok = true;
    for (const r of resp) {
      if (r.tirar !== void 0) {
        ok = false;
        break;
      }
      const s = aplicar(n, r);
      if (s.fim || s.vez !== j || moinhosEmUm(s).length === 0) {
        ok = false;
        break;
      }
    }
    if (ok) res.push(m);
  }
  return res;
}
function defesas(e) {
  if (ameacas(e) === 0) return [];
  return unicas(jogadasSimples(e)).filter((m) => {
    const n = jogar(e, m);
    return !n.remover && !n.fim && ameacas(n) === 0;
  });
}
function solucoes(p) {
  const e = estadoDoPuzzle(p);
  if (p.tipo === "P1") return moinhosEmUm(e);
  if (p.tipo === "P2" || p.tipo === "P3") return forcamMoinhoEm2(e);
  if (p.tipo === "P4") return defesas(e);
  return [];
}
function valido(p) {
  const e = estadoDoPuzzle(p);
  const s = solucoes(p);
  if (s.length !== 1) return false;
  if (p.tipo === "P2" || p.tipo === "P3") return moinhosEmUm(e).length === 0;
  if (p.tipo === "P4") return moinhosEmUm(e).length === 0;
  return true;
}
function avaliarJogada(p, e, m, passo = 0) {
  if (p.tipo === "P1") {
    return moinhosEmUm(e).some((x) => chave(x) === chave(m)) ? "certo" : "errado";
  }
  if (p.tipo === "P4") return defesas(e).some((x) => chave(x) === chave(m)) ? "certo" : "errado";
  if (passo === 0) return forcamMoinhoEm2(e).some((x) => chave(x) === chave(m)) ? "segue" : "errado";
  return moinhosEmUm(e).some((x) => chave(x) === chave(m)) ? "certo" : "errado";
}
const ehMesmaJogada = (a, b) => chave(a) === chave(b);
function formatar(e, id, tipo, extra = {}) {
  const tab = e.celas.map((c) => [".", "B", "P"][c]);
  const sol = solucoes({ tipo, tab, porColocar: { B: e.porColocar[1], P: e.porColocar[2] }, vez: "B" });
  const f = fase(e);
  return {
    id,
    tipo,
    tab,
    fase: f === "voar" ? 3 : f === "colocar" ? 1 : 2,
    vez: "B",
    porColocar: { B: e.porColocar[1], P: e.porColocar[2] },
    max_jogadas: tipo === "P1" || tipo === "P4" ? 1 : 2,
    solucao: sol,
    dica: sol[0] ? sol[0].para : null,
    ...extra
  };
}
const semMoinhosFormados = (celas) => {
  for (let p = 0; p < N; p++) if (celas[p] && emMoinho(celas, p)) return false;
  return true;
};
export {
  ameacas,
  avaliarJogada,
  defesas,
  ehMesmaJogada,
  estadoDoPuzzle,
  forcamMoinhoEm2,
  formatar,
  moinhosEmUm,
  semMoinhosFormados,
  solucoes,
  valido
};
