import { VAZIA, PRETA, BRANCA } from "./formato.js";
import { REGRA, casasDaOrla } from "./regras.js";
import { linhasDoPuzzle, mascarasLinha } from "./linhas.js";
import { gastar } from "./verificador.js";
const NIVEL = { N1: 1, N2: 2, N3: 3 };
const outra = (v) => v === PRETA ? BRANCA : PRETA;
function prepararResolvedor(p) {
  if (p._resolvedor) return p._resolvedor;
  const n = p.n;
  const linhas = linhasDoPuzzle(p);
  const juntasDe = Array.from({ length: n * n }, () => []);
  for (const j of p.juntas) {
    juntasDe[j.a].push({ outra: j.b, igual: j.igual });
    juntasDe[j.b].push({ outra: j.a, igual: j.igual });
  }
  const r = { p, n, linhas, juntasDe, espelho: p.variante === "contra_espelho", orla: p.variante === "orla" ? casasDaOrla(n) : null };
  Object.defineProperty(p, "_resolvedor", { value: r, enumerable: false, configurable: true });
  return r;
}
function quebra(R, g, i, v) {
  const n = R.n, l = i / n | 0, c = i % n;
  for (let eixo = 0; eixo < 2; eixo++) {
    const pos = eixo ? l : c;
    const at = eixo ? (t) => t * n + c : (t) => l * n + t;
    for (let s = pos - 2; s <= pos; s++) {
      if (s < 0 || s + 2 >= n) continue;
      let iguais = 0;
      for (let t = s; t <= s + 2; t++) if (t !== pos && g[at(t)] === v) iguais++;
      if (iguais === 2) return REGRA.TRES;
    }
    let cont = 1;
    for (let t = 0; t < n; t++) if (t !== pos && g[at(t)] === v) cont++;
    if (cont > n / 2) return REGRA.METADE;
  }
  for (const j of R.juntasDe[i]) {
    const o = g[j.outra];
    if (o !== VAZIA && o === v !== j.igual) return REGRA.JUNTA;
  }
  if (R.espelho) {
    const m = l * n + (n - 1 - c);
    if (g[m] === v) return REGRA.ESPELHO;
  }
  if (R.orla && (l === 0 || c === 0 || l === n - 1 || c === n - 1)) {
    let cont = 1;
    for (const k of R.orla) if (k !== i && g[k] === v) cont++;
    if (cont > R.orla.length / 2) return REGRA.ORLA;
  }
  return null;
}
function deduzirLinha(linha, g) {
  const { pretas, brancas } = mascarasLinha(linha, g);
  let e = -1, ou = 0, algum = false;
  const pad = linha.padroes;
  for (let x = 0; x < pad.length; x++) {
    const m = pad[x];
    if ((m & pretas) !== pretas || (m & brancas) !== 0) continue;
    e &= m;
    ou |= m;
    algum = true;
  }
  if (!algum) return null;
  const out = [];
  const idx = linha.idx;
  for (let t = 0; t < idx.length; t++) {
    if (g[idx[t]] !== VAZIA) continue;
    if (e >> t & 1) out.push({ i: idx[t], cor: PRETA });
    else if (!(ou >> t & 1)) out.push({ i: idx[t], cor: BRANCA });
  }
  return out;
}
function propagar(R, g, orc = null) {
  let mudou = true;
  while (mudou) {
    if (orc) gastar(orc, 1);
    mudou = false;
    for (let k = 0; k < R.linhas.length; k++) {
      const d = deduzirLinha(R.linhas[k], g);
      if (d === null) return false;
      for (const { i, cor } of d) {
        if (g[i] === VAZIA) {
          g[i] = cor;
          mudou = true;
        } else if (g[i] !== cor) return false;
      }
    }
    if (R.orla) {
      const o = propagarOrla(R, g);
      if (o < 0) return false;
      if (o) mudou = true;
    }
  }
  return true;
}
function propagarOrla(R, g) {
  const meia = R.orla.length / 2;
  let mudou = false;
  for (const cor of [PRETA, BRANCA]) {
    let cont = 0;
    for (const k of R.orla) if (g[k] === cor) cont++;
    if (cont > meia) return -1;
    if (cont === meia) {
      for (const k of R.orla) if (g[k] === VAZIA) {
        g[k] = outra(cor);
        mudou = true;
      }
    }
  }
  return mudou ? 1 : 0;
}
function passo(R, i, cor, tecnica, regra) {
  return { i, l: i / R.n | 0, c: i % R.n, cor, tecnica, regra };
}
function proximoPasso(p, g, maxNivel = 3, orc = null) {
  return proximoPassoR(prepararResolvedor(p), g, maxNivel, orc);
}
function proximoPassoR(R, g, maxNivel = 3, orc = null) {
  if (orc) gastar(orc, 4 * R.n);
  const nn = R.n * R.n;
  for (let i = 0; i < nn; i++) {
    if (g[i] !== VAZIA) continue;
    const qp = quebra(R, g, i, PRETA), qb = quebra(R, g, i, BRANCA);
    if (qp && qb) return { contradicao: true, i };
    if (qp) return passo(R, i, BRANCA, "N1", qp);
    if (qb) return passo(R, i, PRETA, "N1", qb);
  }
  if (maxNivel < 2) return null;
  for (let k = 0; k < R.linhas.length; k++) {
    const d = deduzirLinha(R.linhas[k], g);
    if (d === null) return { contradicao: true };
    if (d.length) return passo(R, d[0].i, d[0].cor, "N2", R.linhas[k].vertical ? "coluna" : "linha");
  }
  if (maxNivel < 3) return null;
  const copia = new Int8Array(nn);
  for (let i = 0; i < nn; i++) {
    if (g[i] !== VAZIA) continue;
    for (const v of [PRETA, BRANCA]) {
      copia.set(g);
      copia[i] = v;
      if (!propagar(R, copia, orc)) return passo(R, i, outra(v), "N3", "hipotese");
    }
  }
  return null;
}
function resolver(p, opcoes = {}) {
  var _a, _b, _c, _d, _e;
  const maxNivel = (_a = opcoes.maxNivel) != null ? _a : 3;
  const limN2 = (_b = opcoes.N2) != null ? _b : Infinity, limN3 = (_c = opcoes.N3) != null ? _c : Infinity;
  const orc = (_d = opcoes.orcamento) != null ? _d : null;
  const g = Int8Array.from((_e = opcoes.grelha) != null ? _e : p.dadas);
  const passos = { N1: 0, N2: 0, N3: 0 };
  let vazias = 0;
  for (let i = 0; i < g.length; i++) if (g[i] === VAZIA) vazias++;
  const R = prepararResolvedor(p);
  let resolvido = true;
  while (vazias > 0) {
    const s = proximoPassoR(R, g, maxNivel, orc);
    if (!s || s.contradicao) {
      resolvido = false;
      break;
    }
    g[s.i] = s.cor;
    vazias--;
    passos[s.tecnica]++;
    if (passos.N2 > limN2 || passos.N3 > limN3) {
      resolvido = false;
      break;
    }
  }
  return { resolvido, grelha: g, passos, nivelMax: nivelDe(passos) };
}
function nivelDe(passos) {
  return passos.N3 > 0 ? "N3" : passos.N2 > 0 ? "N2" : "N1";
}
export {
  NIVEL,
  nivelDe,
  prepararResolvedor,
  propagar,
  proximoPasso,
  proximoPassoR,
  resolver
};
