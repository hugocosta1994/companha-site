const FORMATO = 1;
const VAZIA = 0;
const PRETA = 1;
const BRANCA = 2;
const VARIANTES = ["equilibrio", "juntas", "contra_espelho", "orla"];
const TAMANHOS = [4, 6, 8];
const DIFICULDADES = ["facil", "medio", "dificil"];
const NIVEIS = ["N1", "N2", "N3"];
const ORIGENS = ["diario", "curado", "intro", "gerado", "caminho", "teste"];
const DE_CHAR = { ".": VAZIA, P: PRETA, B: BRANCA };
const PARA_CHAR = [".", "P", "B"];
function lerGrelha(str, n) {
  if (typeof str !== "string" || str.length !== n * n) {
    throw new Error(`grelha com ${str && str.length} caracteres; esperava ${n * n}`);
  }
  const g = new Int8Array(n * n);
  for (let i = 0; i < str.length; i++) {
    const v = DE_CHAR[str[i]];
    if (v === void 0) throw new Error(`car\xE1cter inv\xE1lido '${str[i]}' na posi\xE7\xE3o ${i}`);
    g[i] = v;
  }
  return g;
}
function escreverGrelha(g) {
  let s = "";
  for (let i = 0; i < g.length; i++) s += PARA_CHAR[g[i]];
  return s;
}
function validarPuzzle(o) {
  const erros = [];
  if (!o || typeof o !== "object") return ["n\xE3o \xE9 um objeto"];
  if (o.formato !== FORMATO) erros.push(`formato ${o.formato} (esperava ${FORMATO})`);
  if (typeof o.id !== "string" || !o.id) erros.push("id em falta");
  if (!VARIANTES.includes(o.variante)) erros.push(`variante '${o.variante}' desconhecida`);
  if (!DIFICULDADES.includes(o.dificuldade)) erros.push(`dificuldade '${o.dificuldade}' desconhecida`);
  if (!TAMANHOS.includes(o.n)) {
    erros.push(`n=${o.n} fora de ${TAMANHOS.join("/")}`);
    return erros;
  }
  const n = o.n, nn = n * n;
  const dadasOk = typeof o.dadas === "string" && o.dadas.length === nn && !/[^.PB]/.test(o.dadas);
  const solOk = typeof o.solucao === "string" && o.solucao.length === nn && !/[^PB]/.test(o.solucao);
  if (!dadasOk) erros.push("dadas mal formadas");
  if (!solOk) erros.push("solu\xE7\xE3o mal formada (n\xB2 caracteres P/B)");
  if (!dadasOk || !solOk) return erros;
  for (let i = 0; i < nn; i++) {
    if (o.dadas[i] !== "." && o.dadas[i] !== o.solucao[i]) {
      erros.push(`dada ${i} difere da solu\xE7\xE3o`);
      break;
    }
  }
  if (!Array.isArray(o.juntas)) erros.push("juntas tem de ser uma lista");
  else {
    if (o.variante !== "juntas" && o.juntas.length) erros.push('juntas s\xF3 na variante "juntas"');
    const vistas = /* @__PURE__ */ new Set();
    for (const j of o.juntas) {
      if (!Array.isArray(j) || j.length !== 5) {
        erros.push("junta mal formada");
        continue;
      }
      const [l1, c1, l2, c2, s] = j;
      const dentro = [l1, c1, l2, c2].every((x) => Number.isInteger(x) && x >= 0 && x < n);
      const canonica = l2 === l1 && c2 === c1 + 1 || c2 === c1 && l2 === l1 + 1;
      if (!dentro || !canonica || s !== "=" && s !== "x") {
        erros.push(`junta ${JSON.stringify(j)} inv\xE1lida`);
        continue;
      }
      const chave = `${l1},${c1},${l2},${c2}`;
      if (vistas.has(chave)) erros.push(`junta ${chave} duplicada`);
      vistas.add(chave);
      const iguais = o.solucao[l1 * n + c1] === o.solucao[l2 * n + c2];
      if (iguais !== (s === "=")) erros.push(`junta ${chave} n\xE3o cumprida pela solu\xE7\xE3o`);
    }
  }
  if (o.variante === "contra_espelho") {
    for (let l = 0; l < n; l++) for (let c = 0; c < n / 2; c++) {
      if (o.solucao[l * n + c] === o.solucao[l * n + n - 1 - c]) {
        erros.push(`espelho falha na linha ${l}`);
        l = n;
        break;
      }
    }
  }
  if (o.variante === "orla") {
    let pretas = 0, total = 0;
    for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) {
      if (l && c && l < n - 1 && c < n - 1) continue;
      total++;
      if (o.solucao[l * n + c] === "P") pretas++;
    }
    if (pretas * 2 !== total) erros.push("orla: o per\xEDmetro da solu\xE7\xE3o n\xE3o tem metade de cada cor");
  }
  for (let k = 0; k < n; k++) {
    for (const vertical of [false, true]) {
      let linha = "";
      for (let t = 0; t < n; t++) linha += o.solucao[vertical ? t * n + k : k * n + t];
      const pretas = linha.split("P").length - 1;
      if (pretas !== n / 2 || /PPP|BBB/.test(linha)) {
        erros.push(`solu\xE7\xE3o quebra o Equil\xEDbrio na ${vertical ? "coluna" : "linha"} ${k}`);
      }
    }
  }
  const publicado = o.origem && o.origem.tipo !== "teste";
  if (o.classificacao != null) {
    if (!NIVEIS.includes(o.classificacao.nivelMax)) erros.push("classificacao.nivelMax inv\xE1lido");
  } else if (publicado) erros.push("classificacao obrigat\xF3ria em puzzles publicados");
  if (o.origem != null && !ORIGENS.includes(o.origem.tipo)) erros.push(`origem.tipo '${o.origem.tipo}' desconhecido`);
  return erros;
}
function carregarPuzzle(o) {
  const erros = validarPuzzle(o);
  if (erros.length) throw new Error(`puzzle ${o && o.id} inv\xE1lido: ${erros.join("; ")}`);
  return puzzleInterno(o);
}
function carregarLista(doc) {
  const puzzles = [], rejeitados = [];
  for (const o of doc && doc.puzzles || []) {
    const erros = validarPuzzle(o);
    if (erros.length) {
      rejeitados.push({ id: o && o.id, erros });
      if (globalThis.console) console.warn(`[seixo] puzzle ${o && o.id} rejeitado: ${erros.join("; ")}`);
    } else puzzles.push(puzzleInterno(o));
  }
  return { puzzles, rejeitados };
}
function puzzleInterno(o) {
  var _a, _b, _c;
  const n = o.n;
  return {
    id: o.id,
    variante: o.variante,
    n,
    dificuldade: o.dificuldade,
    dadas: lerGrelha(o.dadas, n),
    solucao: lerGrelha(o.solucao, n),
    juntas: o.juntas.map(([l1, c1, l2, c2, s]) => ({ a: l1 * n + c1, b: l2 * n + c2, igual: s === "=" })),
    classificacao: (_a = o.classificacao) != null ? _a : null,
    origem: (_b = o.origem) != null ? _b : null,
    nome: (_c = o.nome) != null ? _c : null
    // campo opcional extra (só protótipo)
  };
}
function puzzleParcial({ variante, n, dadas, juntas = [], solucao = null }) {
  return { id: "", variante, n, dificuldade: null, dadas, solucao, juntas, classificacao: null, origem: null };
}
function serializarPuzzle(p) {
  const n = p.n;
  return {
    formato: FORMATO,
    id: p.id,
    n,
    variante: p.variante,
    dificuldade: p.dificuldade,
    dadas: escreverGrelha(p.dadas),
    juntas: p.juntas.map((j) => {
      const a = Math.min(j.a, j.b), b = Math.max(j.a, j.b);
      return [Math.floor(a / n), a % n, Math.floor(b / n), b % n, j.igual ? "=" : "x"];
    }),
    solucao: escreverGrelha(p.solucao),
    classificacao: p.classificacao,
    origem: p.origem
  };
}
export {
  BRANCA,
  DIFICULDADES,
  FORMATO,
  NIVEIS,
  ORIGENS,
  PRETA,
  TAMANHOS,
  VARIANTES,
  VAZIA,
  carregarLista,
  carregarPuzzle,
  escreverGrelha,
  lerGrelha,
  puzzleParcial,
  serializarPuzzle,
  validarPuzzle
};
