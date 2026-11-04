import { VAZIA, PRETA } from "./formato.js";
const cachePadroes = /* @__PURE__ */ new Map();
function padroesLinha(n) {
  if (cachePadroes.has(n)) return cachePadroes.get(n);
  const cheio = (1 << n) - 1;
  const lista = [];
  for (let m = 0; m <= cheio; m++) {
    if (popcount(m) !== n / 2) continue;
    const z = ~m & cheio;
    if (m & m >> 1 & m >> 2) continue;
    if (z & z >> 1 & z >> 2) continue;
    lista.push(m);
  }
  cachePadroes.set(n, lista);
  return lista;
}
function popcount(m) {
  let c = 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
}
function inverter(m, n) {
  let r = 0;
  for (let k = 0; k < n; k++) if (m & 1 << k) r |= 1 << n - 1 - k;
  return r;
}
function linhasDoPuzzle(p) {
  const n = p.n;
  const cheio = (1 << n) - 1;
  const linhas = [];
  for (let k = 0; k < 2 * n; k++) {
    const vertical = k >= n;
    const fixo = vertical ? k - n : k;
    const idx = [];
    for (let t = 0; t < n; t++) idx.push(vertical ? t * n + fixo : fixo * n + t);
    linhas.push({ k, vertical, idx, igual: 0, dif: 0, espelho: !vertical && p.variante === "contra_espelho" });
  }
  for (const j of p.juntas) {
    const a = Math.min(j.a, j.b), b = Math.max(j.a, j.b);
    let linha, t;
    if (b - a === 1) {
      linha = linhas[Math.floor(a / n)];
      t = a % n;
    } else {
      linha = linhas[n + a % n];
      t = Math.floor(a / n);
    }
    if (j.igual) linha.igual |= 1 << t;
    else linha.dif |= 1 << t;
  }
  for (const linha of linhas) {
    linha.padroes = padroesLinha(n).filter((m) => {
      const d = m ^ m >> 1;
      if (d & linha.igual) return false;
      if ((d & linha.dif) !== linha.dif) return false;
      if (linha.espelho && (m ^ inverter(m, n)) !== cheio) return false;
      return true;
    });
  }
  return linhas;
}
function mascarasLinha(linha, g) {
  let pretas = 0, brancas = 0;
  const idx = linha.idx;
  for (let t = 0; t < idx.length; t++) {
    const v = g[idx[t]];
    if (v === VAZIA) continue;
    if (v === PRETA) pretas |= 1 << t;
    else brancas |= 1 << t;
  }
  return { pretas, brancas };
}
export {
  inverter,
  linhasDoPuzzle,
  mascarasLinha,
  padroesLinha,
  popcount
};
