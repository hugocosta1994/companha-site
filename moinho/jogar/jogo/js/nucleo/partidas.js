import { MULTI } from "../config.js";
import { lerCodigo, estadoDaPartida, situacao, corDe, jogarNaPartida } from "./multijogador.js";
const CHAVE_PARTIDAS = "tab_partidas", CHAVE_PARTIDAS_BAK = "tab_partidas_bak";
const VERSAO_LISTA = 1;
const DIA = 864e5;
function normalizarEntrada(texto) {
  if (typeof texto !== "string") return "";
  const limpo = texto.toUpperCase().replace(/["'`“”‘’«»]/g, "");
  const toks = limpo.split(/\s+/).filter(Boolean);
  const terminado = (a) => {
    const p = a.split("-");
    return p.length >= 5 && /^[0-9A-F]{4}$/.test(p[p.length - 1]);
  };
  for (let i = 0; i < toks.length; i++) {
    const k = toks[i].indexOf("MOI1-");
    if (k < 0) continue;
    let acc = toks[i].slice(k), j = i + 1;
    while (!terminado(acc.replace(/[.,;:!?)\]]+$/, "")) && j < toks.length && acc.length < MULTI.maxCodigo + 8) acc += toks[j++];
    return acc.replace(/[.,;:!?)\]]+$/, "");
  }
  return toks.join("");
}
const SECCOES = ["minha_vez", "a_espera", "terminada", "esquecida", "invalida"];
function estadoLista(g, agora = Date.now()) {
  if (g.desistiLocal) return "terminada";
  return estadoDaPartida(g, agora);
}
function agrupar(lista, agora = Date.now()) {
  const r = Object.fromEntries(SECCOES.map((s) => [s, []]));
  for (const g of lista) r[estadoLista(g, agora)].push(g);
  for (const s of SECCOES) r[s].sort((a, b) => b.atualizada - a.atualizada);
  return r;
}
const contarMinhaVez = (lista, agora = Date.now()) => lista.filter((g) => estadoLista(g, agora) === "minha_vez").length;
const diasDesde = (g, agora = Date.now()) => Math.max(0, Math.floor((agora - g.atualizada) / DIA));
function ultimaDoAdversario(g) {
  const r = lerCodigo(g.codigo);
  if (!r.ok || !r.jogadas.length) return null;
  const m = r.jogadas[r.jogadas.length - 1];
  if (m === "X" || m === "W") return null;
  const cor = r.jogadas.length % 2 === 1 ? 1 : 2;
  return cor === corDe(g) ? null : m;
}
function resultadoFim(g) {
  const r = lerCodigo(g.codigo);
  if (g.desistiLocal) return { fim: true, vencedor: 3 - corDe(g), motivo: "desistiu", euDesisti: true };
  if (!r.ok) return null;
  const s = situacao(r);
  if (!s.fim) return null;
  const venc = s.vencedor;
  return { fim: true, vencedor: venc, motivo: s.motivo, euDesisti: s.motivo === "desistiu" && venc !== corDe(g), adversarioDesistiu: s.motivo === "desistiu" && venc === corDe(g) };
}
function desistir(lista, semente, { agora = Date.now() } = {}) {
  const i = lista.findIndex((g) => g.semente === semente);
  if (i < 0) return { ok: false, erro: "invalido" };
  const est = estadoLista(lista[i], agora);
  if (est === "minha_vez") return jogarNaPartida(lista, semente, "X", { agora });
  if (est === "a_espera") return jogarNaPartida(lista, semente, "W", { agora });
  if (est === "esquecida") {
    const r = lerCodigo(lista[i].codigo);
    if (r.ok) return jogarNaPartida(lista, semente, r.partida.estado.vez === corDe(lista[i]) ? "X" : "W", { agora });
  }
  return { ok: false, erro: "ilegal" };
}
function apagar(lista, semente, { agora = Date.now() } = {}) {
  const g = lista.find((x) => x.semente === semente);
  if (!g) return { ok: false, erro: "invalido" };
  if (["minha_vez", "a_espera"].includes(estadoLista(g, agora))) return { ok: false, erro: "ativa" };
  return { ok: true, lista: lista.filter((x) => x.semente !== semente) };
}
function validarLista(x) {
  if (!x || typeof x !== "object" || x.v !== VERSAO_LISTA || !Array.isArray(x.lista)) return null;
  const ok = (g) => g && typeof g === "object" && Number.isInteger(g.semente) && typeof g.codigo === "string" && (g.euSou === "A" || g.euSou === "B") && (g.corA === 1 || g.corA === 2) && Number.isFinite(g.atualizada) && Number.isInteger(g.jogadas);
  return x.lista.filter(ok).slice(0, MULTI.maxPartidas);
}
function carregarLista(lerJSON) {
  let l = null;
  try {
    l = validarLista(lerJSON(CHAVE_PARTIDAS));
  } catch {
    l = null;
  }
  if (l) return l;
  try {
    l = validarLista(lerJSON(CHAVE_PARTIDAS_BAK));
  } catch {
    l = null;
  }
  return l || [];
}
function guardarLista(lerJSON, escreverJSON, lista) {
  try {
    const ant = lerJSON(CHAVE_PARTIDAS);
    if (validarLista(ant)) escreverJSON(CHAVE_PARTIDAS_BAK, ant);
    escreverJSON(CHAVE_PARTIDAS, { v: VERSAO_LISTA, lista });
  } catch {
  }
}
const textoPartilha = (frase, codigo) => `${frase} ${codigo}`;
export {
  CHAVE_PARTIDAS,
  CHAVE_PARTIDAS_BAK,
  SECCOES,
  VERSAO_LISTA,
  agrupar,
  apagar,
  carregarLista,
  contarMinhaVez,
  desistir,
  diasDesde,
  estadoLista,
  guardarLista,
  normalizarEntrada,
  resultadoFim,
  textoPartilha,
  ultimaDoAdversario,
  validarLista
};
