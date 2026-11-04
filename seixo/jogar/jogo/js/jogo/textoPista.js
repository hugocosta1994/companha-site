import { VAZIA, PRETA, BRANCA } from "../nucleo/formato.js";
function textoDaPista(p, g, r) {
  if (!r) return null;
  if (r.regra === "conflito") return { chave: "pista.conflito", params: {} };
  const n = p.n, { i, l, c, cor } = r;
  switch (r.regra) {
    case "tres":
    case "hipotese":
    case "espelho":
    case "orla":
      return { chave: "pista." + r.regra, params: {} };
    case "metade": {
      const outra = cor === PRETA ? BRANCA : PRETA;
      let naLinha = 0, naColuna = 0;
      for (let k = 0; k < n; k++) {
        if (g[l * n + k] === outra) naLinha++;
        if (g[k * n + c] === outra) naColuna++;
      }
      const onde = naLinha >= n / 2 ? "linha" : naColuna >= n / 2 ? "coluna" : null;
      if (!onde) return { chave: "pista.generica", params: {} };
      return { chave: "pista.metade", params: { onde, n: n / 2, cores: outra === PRETA ? "pretas" : "brancas" } };
    }
    case "junta": {
      const j = (p.juntas || []).find((x) => (x.a === i || x.b === i) && g[x.a === i ? x.b : x.a] !== VAZIA);
      if (!j) return { chave: "pista.generica", params: {} };
      return { chave: j.igual ? "pista.junta_igual" : "pista.junta_diferente", params: {} };
    }
    case "linha":
    case "coluna":
      return { chave: "pista.linha", params: { onde: r.regra } };
    default:
      return { chave: "pista.generica", params: {} };
  }
}
export {
  textoDaPista
};
