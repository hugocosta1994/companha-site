import { VAZIA, VARIANTES, TAMANHOS, DIFICULDADES, lerGrelha, puzzleParcial, serializarPuzzle } from "./formato.js";
import { contarSolucoes, ORCAMENTO_ESGOTADO } from "./verificador.js";
import { resolver, nivelDe } from "./resolver.js";
import { classificar, limitesDe } from "./dificuldade.js";
import { criarPrng } from "./prng.js";
const VERSAO_GERADOR = "g1";
const MAX_TENTATIVAS = 8;
const GERADOR_MAX_NOS = 8e4;
const TAMANHO_TABELA = 728;
class SemPuzzleError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "SemPuzzleError";
    this.codigo = "SEM_PUZZLE";
  }
}
function gerar(opcoes) {
  var _a;
  const { variante, n, dificuldade, seed } = opcoes;
  if (seed == null) throw new Error("gerar: falta a seed");
  validarAlvo(variante, n, dificuldade);
  const maxNos = (_a = opcoes.maxNos) != null ? _a : GERADOR_MAX_NOS;
  let melhor = null;
  for (let k = 0; k < MAX_TENTATIVAS; k++) {
    const prng = criarPrng(k === 0 ? String(seed) : `${seed}#${k}`);
    const orcamento = { nos: 0, max: maxNos };
    const r = tentar(variante, n, dificuldade, prng, opcoes.molde, orcamento);
    const dif = r ? classificar(r.passos) : null;
    if (opcoes.medicao) opcoes.medicao.push({ nos: orcamento.nos, valido: !!r, dif });
    if (!r) continue;
    if (dif === dificuldade) return embrulhar(opcoes, r, dif, k + 1, true);
    if (dif !== null && (!melhor || distancia(dif, dificuldade) < distancia(melhor.dif, dificuldade))) melhor = { r, dif };
  }
  if (!melhor) throw new SemPuzzleError(`gerar: sem puzzle v\xE1lido e classific\xE1vel para ${variante} ${n}\xD7${n} (${seed})`);
  return embrulhar(opcoes, melhor.r, melhor.dif, MAX_TENTATIVAS, false);
}
const distancia = (a, b) => Math.abs(DIFICULDADES.indexOf(a) - DIFICULDADES.indexOf(b));
function validarAlvo(variante, n, dificuldade) {
  if (!VARIANTES.includes(variante)) throw new Error(`gerar: variante '${variante}' desconhecida`);
  if (!TAMANHOS.includes(n)) throw new Error(`gerar: tamanho ${n} fora de ${TAMANHOS.join("/")}`);
  if (!DIFICULDADES.includes(dificuldade)) throw new Error(`gerar: dificuldade '${dificuldade}' desconhecida`);
}
function embrulhar(opcoes, r, dif, tentativas, alvoAtingido) {
  var _a;
  const p = r.puzzle;
  p.id = (_a = opcoes.id) != null ? _a : `G-${opcoes.variante}-${opcoes.n}-${opcoes.seed}`;
  p.dificuldade = dif;
  p.classificacao = { nivelMax: nivelDe(r.passos), passos: { ...r.passos } };
  p.origem = {
    tipo: "gerado",
    data: null,
    pacote: null,
    indice: null,
    seed: String(opcoes.seed),
    versaoGerador: VERSAO_GERADOR,
    molde: opcoes.molde ? opcoes.molde.id : null,
    ...opcoes.origem || {}
  };
  return { puzzle: serializarPuzzle(p), tentativas, alvoAtingido };
}
function tentar(variante, n, dificuldade, prng, molde, orcamento) {
  try {
    return tentarComOrcamento(variante, n, dificuldade, prng, molde, orcamento);
  } catch (e) {
    if (e === ORCAMENTO_ESGOTADO) return null;
    throw e;
  }
}
function tentarComOrcamento(variante, n, dificuldade, prng, molde, orcamento) {
  const nn = n * n;
  let solucao;
  if (molde) {
    solucao = lerGrelha(molde.solucao, n);
    if (contarSolucoes(puzzleParcial({ variante, n, dadas: solucao }), 1).total !== 1) {
      throw new Error(`molde ${molde.id} n\xE3o cumpre as regras de ${variante}`);
    }
  } else {
    const vazio = puzzleParcial({ variante: variante === "juntas" ? "equilibrio" : variante, n, dadas: new Int8Array(nn) });
    const r = contarSolucoes(vazio, 1, { prng, orcamento });
    if (r.total === 0) return null;
    solucao = r.solucoes[0];
  }
  const limites = { ...limitesDe(dificuldade), orcamento };
  const dadas = Int8Array.from(solucao);
  const todas = [];
  if (variante === "juntas") {
    for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) {
      const a = l * n + c;
      if (c + 1 < n) todas.push({ a, b: a + 1, igual: solucao[a] === solucao[a + 1] });
      if (l + 1 < n) todas.push({ a, b: a + n, igual: solucao[a] === solucao[a + n] });
    }
  }
  const ativa = new Uint8Array(todas.length).fill(1);
  const ativas = () => todas.filter((_, k) => ativa[k]);
  const montar = () => puzzleParcial({ variante, n, dadas, juntas: ativas(), solucao });
  const aceitavel = (p) => {
    if (contarSolucoes(p, 2, { orcamento }).total !== 1) return null;
    const r = resolver(p, limites);
    return r.resolvido ? r : null;
  };
  let ultimo = aceitavel(montar());
  if (!ultimo) return null;
  let desfazer = null;
  try {
    const ordem = [];
    for (let i = 0; i < nn; i++) ordem.push(i);
    prng.baralhar(ordem);
    for (let x = 0; x < ordem.length; x++) {
      const i = ordem[x];
      const antes = dadas[i];
      dadas[i] = VAZIA;
      desfazer = () => {
        dadas[i] = antes;
      };
      const r = aceitavel(montar());
      if (r) ultimo = r;
      else desfazer();
      desfazer = null;
    }
    if (variante === "juntas") {
      const ordemJ = todas.map((_, k) => k);
      prng.baralhar(ordemJ);
      for (let x = 0; x < ordemJ.length; x++) {
        const k = ordemJ[x];
        ativa[k] = 0;
        desfazer = () => {
          ativa[k] = 1;
        };
        const r = aceitavel(montar());
        if (r) ultimo = r;
        else desfazer();
        desfazer = null;
      }
    }
  } catch (e) {
    if (e !== ORCAMENTO_ESGOTADO) throw e;
    if (desfazer) desfazer();
  }
  const puzzle = puzzleParcial({ variante, n, dadas: Int8Array.from(dadas), juntas: ativas(), solucao });
  return { puzzle, passos: ultimo.passos };
}
const CALENDARIO_SEMANAL = [
  { dificuldade: "facil", variante: "equilibrio", n: 6 },
  { dificuldade: "medio", variante: "equilibrio", n: 6 },
  { dificuldade: "medio", variante: "juntas", n: 6 },
  { dificuldade: "medio", variante: "equilibrio", n: 8 },
  { dificuldade: "medio", variante: "equilibrio", n: 8 },
  // sexta: Médio (T-1008, GDD 11.9: nunca dois D seguidos)
  { dificuldade: "dificil", variante: "juntas", n: 6 },
  { dificuldade: "medio", variante: "contra_espelho", n: 8 }
];
function gerarDiario(data, reserva = null, opcoes = {}) {
  const [a, m, d] = data.split("-").map(Number);
  const diaSemana = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7;
  const alvo = CALENDARIO_SEMANAL[diaSemana];
  try {
    return gerar({
      ...alvo,
      seed: `seixo:${VERSAO_GERADOR}:${data}`,
      id: `D-${data}`,
      origem: { tipo: "gerado", data },
      ...opcoes.maxNos != null ? { maxNos: opcoes.maxNos } : {}
    });
  } catch (e) {
    if (!(e instanceof SemPuzzleError) || !reserva || !reserva.tabela || reserva.indice == null) throw e;
    return reutilizarDaTabela(reserva.tabela, reserva.indice, data);
  }
}
function reutilizarDaTabela(tabela, indice, data) {
  if (tabela.length !== TAMANHO_TABELA) throw new Error(`tabela com ${tabela.length} dias (esperado ${TAMANHO_TABELA})`);
  const i = (indice % TAMANHO_TABELA + TAMANHO_TABELA) % TAMANHO_TABELA;
  const base = tabela[i];
  const puzzle = {
    ...base,
    id: `D-${data}`,
    juntas: base.juntas.map((j) => j.slice()),
    classificacao: { ...base.classificacao, passos: { ...base.classificacao.passos } },
    origem: { ...base.origem, data, indice: i }
  };
  return { puzzle, tentativas: MAX_TENTATIVAS, alvoAtingido: false, reutilizado: true };
}
export {
  CALENDARIO_SEMANAL,
  GERADOR_MAX_NOS,
  MAX_TENTATIVAS,
  SemPuzzleError,
  TAMANHO_TABELA,
  VERSAO_GERADOR,
  gerar,
  gerarDiario,
  reutilizarDaTabela,
  validarAlvo
};
