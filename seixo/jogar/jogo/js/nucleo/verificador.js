import { PRETA, BRANCA } from "./formato.js";
import { linhasDoPuzzle, mascarasLinha } from "./linhas.js";
function contarSolucoes(p, limite = 2, opcoes = {}) {
  const n = p.n;
  const metade = n / 2;
  const cheio = (1 << n) - 1;
  const linhas = linhasDoPuzzle(p);
  const prng = opcoes.prng || null;
  const orc = opcoes.orcamento || null;
  const cand = [];
  for (let l = 0; l < n; l++) {
    const { pretas, brancas } = mascarasLinha(linhas[l], p.dadas);
    cand.push(linhas[l].padroes.filter((m) => (m & pretas) === pretas && (m & brancas) === 0));
    if (cand[l].length === 0) return { total: 0, solucoes: [] };
  }
  const vIgual = new Int32Array(n), vDif = new Int32Array(n);
  for (const j of p.juntas) {
    const a = Math.min(j.a, j.b), b = Math.max(j.a, j.b);
    if (b - a === n) {
      const l = Math.floor(b / n), c = b % n;
      if (j.igual) vIgual[l] |= 1 << c;
      else vDif[l] |= 1 << c;
    }
  }
  const orla = p.variante === "orla";
  const meiaOrla = 2 * n - 2;
  const bits = (x) => {
    let k = 0;
    while (x) {
      k += x & 1;
      x >>= 1;
    }
    return k;
  };
  let orlaPretas = 0, orlaVistas = 0;
  const escolha = new Int32Array(n);
  const pretasCol = new Int32Array(n);
  const solucoes = [];
  let total = 0;
  function baralhar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const k = prng.int(i + 1);
      const t = a[i];
      a[i] = a[k];
      a[k] = t;
    }
    return a;
  }
  function dfs(l) {
    if (orc) gastar(orc, 1);
    if (l === n) {
      total++;
      const g = new Int8Array(n * n);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r * n + c] = escolha[r] >> c & 1 ? PRETA : BRANCA;
      solucoes.push(g);
      return total >= limite;
    }
    const lista = prng ? baralhar(cand[l]) : cand[l];
    const ant = l > 0 ? escolha[l - 1] : 0;
    const ant2 = l > 1 ? escolha[l - 2] : 0;
    const feitas = l + 1;
    for (let x = 0; x < lista.length; x++) {
      const m = lista[x];
      if (l > 0) {
        const d = m ^ ant;
        if (d & vIgual[l]) continue;
        if ((d & vDif[l]) !== vDif[l]) continue;
      }
      if (l > 1) {
        if (m & ant & ant2) continue;
        if (~m & ~ant & ~ant2 & cheio) continue;
      }
      let ok = true;
      for (let c = 0; c < n; c++) {
        const pc = pretasCol[c] + (m >> c & 1);
        if (pc > metade || feitas - pc > metade) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      let pm = 0, pp = 0;
      if (orla) {
        pm = l === 0 || l === n - 1 ? cheio : 1 | 1 << n - 1;
        pp = bits(m & pm);
        if (orlaPretas + pp > meiaOrla || orlaVistas + bits(pm) - (orlaPretas + pp) > meiaOrla) continue;
      }
      for (let c = 0; c < n; c++) pretasCol[c] += m >> c & 1;
      escolha[l] = m;
      if (orla) {
        orlaPretas += pp;
        orlaVistas += bits(pm);
      }
      const parar = dfs(l + 1);
      if (orla) {
        orlaPretas -= pp;
        orlaVistas -= bits(pm);
      }
      for (let c = 0; c < n; c++) pretasCol[c] -= m >> c & 1;
      if (parar) return true;
    }
    return false;
  }
  dfs(0);
  return { total, solucoes };
}
const ORCAMENTO_ESGOTADO = /* @__PURE__ */ Symbol("orcamento-esgotado");
function gastar(orc, k) {
  orc.nos += k;
  if (orc.nos > orc.max) throw ORCAMENTO_ESGOTADO;
}
function solucaoUnica(p) {
  const r = contarSolucoes(p, 2);
  return r.total === 1 ? r.solucoes[0] : null;
}
function grelhasIguais(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
export {
  ORCAMENTO_ESGOTADO,
  contarSolucoes,
  gastar,
  grelhasIguais,
  solucaoUnica
};
