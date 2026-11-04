const FAIXAS = {
  facil: { N2: [0, 0], N3: [0, 0] },
  medio: { N2: [1, 12], N3: [0, 0] },
  dificil: { N2: [0, Infinity], N3: [1, 3] }
};
const CURADO_MEDIO_MIN_N2 = 3;
function cumpreCuradoria(puzzle, apresentacao = false) {
  if (puzzle.dificuldade !== "medio") return true;
  const n2 = puzzle.classificacao.passos.N2;
  return n2 >= (apresentacao ? 1 : CURADO_MEDIO_MIN_N2);
}
function limitesDe(dificuldade) {
  const f = FAIXAS[dificuldade];
  return { maxNivel: f.N3[1] > 0 ? 3 : 2, N2: f.N2[1], N3: f.N3[1] };
}
function classificar(passos) {
  for (const [nome, f] of Object.entries(FAIXAS)) {
    if (passos.N2 >= f.N2[0] && passos.N2 <= f.N2[1] && passos.N3 >= f.N3[0] && passos.N3 <= f.N3[1]) return nome;
  }
  return null;
}
export {
  CURADO_MEDIO_MIN_N2,
  FAIXAS,
  classificar,
  cumpreCuradoria,
  limitesDe
};
