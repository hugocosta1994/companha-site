const CHAVE = "tabuleiro.v0";
function ler() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}
function escrever(v) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(v));
  } catch {
  }
}
const CHAVE_STATS = "tab_stats", CHAVE_PUZZLES = "tab_puzzles";
function lerJSON(k) {
  try {
    return JSON.parse(localStorage.getItem(k));
  } catch {
    return null;
  }
}
function escreverJSON(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
  }
}
function apagar(k) {
  try {
    localStorage.removeItem(k);
  } catch {
  }
}
export {
  CHAVE,
  CHAVE_PUZZLES,
  CHAVE_STATS,
  apagar,
  escrever,
  escreverJSON,
  ler,
  lerJSON
};
