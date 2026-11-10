import { NIVEIS_ORDEM, PERSONALIDADES } from "../config.js";
const PERS_ORDEM = Object.keys(PERSONALIDADES);
import { pontosPartida } from "./multijogador.js";
import { creditar, MOEDAS } from "./anuncios-regras.js";
const CHAVE_META = "moinho_meta";
const RANKS = [0, 12, 35, 80, 160, 320];
const CONQUISTAS = [
  "primeiro_moinho",
  "primeira_vitoria",
  "voar",
  "virada",
  "duplo",
  "sem_perder",
  "primeiro_puzzle",
  "primeira_por_codigo",
  "primeiro_convite",
  "perfil",
  "serie3",
  "gata",
  "puzzles",
  "quatro_feitios",
  "amigo",
  "desafio3",
  "desafio_vitoria",
  "dez",
  "atenta",
  "tres_amigos",
  "mestre",
  "serie7",
  "cem",
  "cinquenta",
  "desafio30",
  "puzzles_todos",
  "nivel10",
  "nivel20",
  "nivel30"
];
const NIVEL_MAX = 30;
const xpDoNivel = (n) => 10 * (n - 1) * (n + 4);
const nivelDe = (xp) => {
  let n = 1;
  for (let i = 2; i <= NIVEL_MAX; i++) if (xp >= xpDoNivel(i)) n = i;
  return n;
};
const proximoNivel = (xp) => {
  const n = nivelDe(xp);
  return n < NIVEL_MAX ? { nivel: n + 1, faltam: xpDoNivel(n + 1) - xp } : null;
};
const PATENTE_NIVEIS = [1, 4, 8, 12, 16, 20];
const patenteDeNivel = (nivel) => {
  let r = 1;
  PATENTE_NIVEIS.forEach((m, i) => {
    if (nivel >= m) r = i + 1;
  });
  return r;
};
const XP = { v: 30, e: 15, d: 10, porMoinho: 2, maxMoinhos: 10, bonusIA: [0, 4, 8, 12, 16, 20], desafio: 20, tetoDia: 400, minJogadas: 6, minJogadasDesist: 10 };
function xpPartida(info) {
  var _a, _b, _c;
  const jm = (_b = (_a = info.jogadasMinhas) != null ? _a : info.jogadas) != null ? _b : 99;
  if (jm < XP.minJogadas) return { total: 0, linhas: { base: 0, moinhos: 0, ia: 0, desafio: 0 } };
  let r = info.resultado;
  if (r === "v" && info.desistencia && ((_c = info.jogadas) != null ? _c : 99) < XP.minJogadasDesist) r = "d";
  const base = XP[r] || 0;
  const moinhos = XP.porMoinho * Math.min(XP.maxMoinhos, info.moinhos || 0);
  const idx = info.modo === "ia" ? NIVEIS_ORDEM.indexOf(info.nivel) : -1;
  const ia = r === "v" && idx >= 0 ? XP.bonusIA[Math.min(idx, 5)] : 0;
  const desafio = r === "v" && info.desafio ? XP.desafio : 0;
  return { total: base + moinhos + ia + desafio, linhas: { base, moinhos, ia, desafio } };
}
const CONTADORES_EXTRA = ["desafioDias", "partidasCodigo", "convites", "vitorias"];
const TEMAS_ORDEM = ["madeira", "ardosia", "papel", "noite", "ceramica", "lareira", "granito", "alvorada", "calcada", "cortica", "xisto"];
const TEMAS_PAGOS = ["ceramica", "lareira", "granito"];
const DIREITOS_PAGOS = ["sem_anuncios"];
const PAGOS_VALIDOS = [...TEMAS_PAGOS, ...DIREITOS_PAGOS];
const COSMETICOS_IDS = ["peca_pedra", "peca_bolota", "peca_azul", "moldura_pinhal", "moldura_sardinha", "moldura_ouro", "titulo_mestre"];
const TIPO_COSMETICO = { peca: "peca", moldura: "moldura", titulo: "titulo" };
const metaVazia = () => ({ pontos: 0, dia: "", hoje: 0, conquistas: {}, tema: "madeira", peca: "", moldura: "", titulo: "", pagos: {}, moedas: 0, moedasHoje: { dia: "", n: 0 }, ad: { dia: "", A1: 0, A2: 0, A4: 0 }, instalado: 0, perfil: null, amigos: [], partidas: [], ultimosResultados: [], ultimoDesafio: "", tutorialFeito: false, tutorialCompleto: false, niveisVencidos: [], persVencidas: [], xp: 0, xpHoje: { dia: "", n: 0 }, desafio: { serie: 0, melhor: 0, ultimoJogado: "", ganhou: false }, contadores: { partidas: 0, serie: 0, melhorSerie: 0, amigo: 0, desafioDias: 0, partidasCodigo: 0, convites: 0, vitorias: 0 } });
function validarMeta(x) {
  const b = metaVazia();
  if (!x || typeof x !== "object" || Array.isArray(x)) return b;
  const n = (v, d2 = 0) => Number.isFinite(v) && v >= 0 ? Math.floor(v) : d2;
  const o = { ...b };
  o.pontos = n(x.pontos);
  o.hoje = n(x.hoje);
  o.dia = typeof x.dia === "string" ? x.dia : "";
  o.conquistas = Object.fromEntries(Object.entries(x.conquistas || {}).filter(([k, v]) => CONQUISTAS.includes(k) && v === true));
  o.tema = TEMAS_ORDEM.includes(x.tema) ? x.tema : "madeira";
  if (TEMAS_PAGOS.includes(o.tema) && !(x.pagos && x.pagos[o.tema] === true)) o.tema = "madeira";
  o.pagos = Object.fromEntries(Object.entries(x.pagos || {}).filter(([k, v]) => PAGOS_VALIDOS.includes(k) && v === true));
  const extra = Object.fromEntries(Object.entries(x.pagos_extra || {}).concat(Object.entries(x.pagos || {}).filter(([k, v]) => !PAGOS_VALIDOS.includes(k) && v === true)).filter(([, v]) => v === true));
  if (Object.keys(extra).length) o.pagos_extra = extra;
  if (Number.isFinite(x.v) && x.v >= 2) o.v = Math.floor(x.v);
  for (const k of ["peca", "moldura", "titulo"]) o[k] = COSMETICOS_IDS.includes(x[k]) && x[k].startsWith(k) ? x[k] : "";
  o.perfil = x.perfil && typeof x.perfil.alcunha === "string" && typeof x.perfil.id === "string" ? { alcunha: x.perfil.alcunha, avatar: n(x.perfil.avatar), id: x.perfil.id } : null;
  o.amigos = Array.isArray(x.amigos) ? x.amigos.filter((a) => a && typeof a.id === "string" && typeof a.alcunha === "string").slice(0, 50).map((a) => ({ ...a, pontos: n(a.pontos) })) : [];
  o.partidas = Array.isArray(x.partidas) ? x.partidas.filter((g) => g && Number.isInteger(g.semente) && typeof g.codigo === "string").slice(0, 10) : [];
  o.ultimosResultados = Array.isArray(x.ultimosResultados) ? x.ultimosResultados.filter((r) => "vde".includes(r) && r.length === 1).slice(-3) : [];
  o.nivelUsado = NIVEIS_ORDEM.includes(x.nivelUsado) ? x.nivelUsado : void 0;
  o.ultimoDesafio = typeof x.ultimoDesafio === "string" ? x.ultimoDesafio : "";
  o.tutorialFeito = x.tutorialFeito === true;
  o.tutorialCompleto = x.tutorialCompleto === true || x.tutorialCompleto === void 0 && x.tutorialFeito === true;
  o.moedas = n(x.moedas);
  o.instalado = n(x.instalado);
  const mh = x.moedasHoje || {};
  o.moedasHoje = { dia: typeof mh.dia === "string" ? mh.dia : "", n: n(mh.n) };
  const ad = x.ad || {};
  o.ad = { dia: typeof ad.dia === "string" ? ad.dia : "", A1: n(ad.A1), A2: n(ad.A2), A4: n(ad.A4) };
  const c = x.contadores || {};
  o.contadores = { partidas: n(c.partidas), serie: n(c.serie), melhorSerie: n(c.melhorSerie), amigo: n(c.amigo) };
  for (const k of CONTADORES_EXTRA) o.contadores[k] = n(c[k]);
  o.xp = x.xp === void 0 ? Math.min(1500, o.pontos * 3) : n(x.xp);
  const xh = x.xpHoje || {};
  o.xpHoje = { dia: typeof xh.dia === "string" ? xh.dia : "", n: n(xh.n) };
  o.niveisVencidos = Array.isArray(x.niveisVencidos) ? NIVEIS_ORDEM.filter((id) => x.niveisVencidos.includes(id)) : NIVEIS_ORDEM.filter((id) => id === "aprendiz" && o.contadores.vitorias > 0 || (id === "atenta" || id === "mestre") && o.conquistas[id] === true);
  o.persVencidas = Array.isArray(x.persVencidas) ? PERS_ORDEM.filter((id) => x.persVencidas.includes(id)) : [];
  const d = x.desafio || {};
  const dia = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
  o.desafio = { serie: n(d.serie), melhor: Math.max(n(d.melhor), n(d.serie)), ultimoJogado: dia(d.ultimoJogado), ganhou: d.ganhou === true };
  return o;
}
const rankDe = (pontos) => {
  let r = 0;
  RANKS.forEach((m, i) => {
    if (pontos >= m) r = i;
  });
  return r + 1;
};
const proximoRank = (pontos) => {
  const r = rankDe(pontos);
  return r < RANKS.length ? { rank: r + 1, faltam: RANKS[r] - pontos } : null;
};
const hojeISO = (agora = Date.now()) => new Date(agora).toISOString().slice(0, 10);
function temaAberto(id, desb, ctx, meta) {
  if (id === "madeira" || meta.pagos[id]) return true;
  const cc = desbloqueioCosmetico(desb, ctx, meta);
  if (cc !== null) return cc;
  const m = /^(\d+) vit[oó]rias contra a IA/.exec(desb || "");
  if (m) return ctx.vitoriasIA >= +m[1];
  const p = /^(\d+) puzzles/.exec(desb || "");
  if (p) return ctx.puzzlesResolvidos >= +p[1];
  const pt = /^(\d+) partidas/.exec(desb || "");
  if (pt) return (meta.contadores && meta.contadores.partidas || 0) >= +pt[1];
  if (/^oferta do tutorial/.test(desb || "")) return meta.tutorialCompleto === true;
  return false;
}
function desbloqueioCosmetico(desb, ctx, meta) {
  const n = /^nivel (\d+)$/.exec(desb || "");
  if (n) return nivelDe(meta.xp || 0) >= +n[1] || (ctx.nivel || 0) >= +n[1];
  const q = /^conq ([a-z0-9_]+)$/.exec(desb || "");
  if (q) return meta.conquistas[q[1]] === true;
  return null;
}
function condicaoCosmetico(desb) {
  const n = /^nivel (\d+)$/.exec(desb || "");
  if (n) return { chave: "mo.cosm.nivel", valor: +n[1] };
  const q = /^conq ([a-z0-9_]+)$/.exec(desb || "");
  if (q) return { chave: "mo.cosm.conq", valor: q[1] };
  return null;
}
const cosmeticoAberto = (item, ctx, meta) => desbloqueioCosmetico(item.desb, ctx, meta) === true;
function novosCosmeticos(antes, depois, itens, ctx = {}) {
  return itens.filter((i) => desbloqueioCosmetico(i.desb, ctx, antes) === false && desbloqueioCosmetico(i.desb, ctx, depois) === true).map((i) => {
    var _a;
    return { id: i.id, tipo: (_a = i.tipo) != null ? _a : "tema", via: i.desb };
  });
}
function aplicarCosmetico(meta, item, ctx = {}) {
  const m = validarMeta(JSON.parse(JSON.stringify(meta)));
  if (!(item.tipo === void 0 ? temaAberto(item.id, item.desb, ctx, m) : cosmeticoAberto(item, ctx, m))) return { meta: m, aplicado: false };
  if (item.tipo === void 0) m.tema = item.id;
  else m[item.tipo] = item.id;
  return { meta: m, aplicado: true };
}
function registarFim(meta, info, ctx = {}, agora = Date.now()) {
  const m = validarMeta(JSON.parse(JSON.stringify(meta)));
  const hoje = hojeISO(agora);
  if (m.dia !== hoje) {
    m.dia = hoje;
    m.hoje = 0;
  }
  const rankAntes = rankDe(m.pontos);
  const nivelAntes = nivelDe(m.xp);
  let ganhos = 0, moedas = 0;
  if (info.modo === "ia") {
    const r = pontosPartida(info.nivel, info.resultado, { semPerder: info.resultado === "v" && info.pecasPerdidas === 0, jogadas: info.jogadas, desafio: !!info.desafio }, m.hoje);
    ganhos = r.ganhos;
    m.hoje = r.total;
    m.pontos += ganhos;
    if (info.resultado === "v") moedas = creditar(m, MOEDAS.vitoriaIA, agora);
  }
  const c = m.contadores;
  c.partidas++;
  if (info.resultado === "v") c.vitorias++;
  const porCodigo = info.modo === "mp" || info.modo === "codigo";
  if (porCodigo) c.partidasCodigo++;
  const xr = xpPartida({ ...info, modo: porCodigo ? "codigo" : info.modo });
  if (m.xpHoje.dia !== hoje) m.xpHoje = { dia: hoje, n: 0 };
  const xpGanho = Math.max(0, Math.min(xr.total, XP.tetoDia - m.xpHoje.n));
  m.xpHoje.n += xpGanho;
  m.xp += xpGanho;
  const nivelDepois = nivelDe(m.xp);
  let desafioSerie;
  if (info.desafio) desafioSerie = registarDesafio(m, hoje, info.resultado === "v");
  if (info.resultado === "v") {
    c.serie++;
    c.melhorSerie = Math.max(c.melhorSerie, c.serie);
  } else if (info.resultado === "d") c.serie = 0;
  if (info.modo !== "ia") c.amigo++;
  m.ultimosResultados = [...m.ultimosResultados, info.resultado].slice(-3);
  const ganhou = info.resultado === "v";
  if (ganhou && info.modo === "ia" && !info.desafio && NIVEIS_ORDEM.includes(info.nivel) && !m.niveisVencidos.includes(info.nivel)) m.niveisVencidos = NIVEIS_ORDEM.filter((id) => id === info.nivel || m.niveisVencidos.includes(id));
  if (ganhou && info.modo === "ia" && !info.desafio && PERS_ORDEM.includes(info.personalidade) && !m.persVencidas.includes(info.personalidade)) m.persVencidas = PERS_ORDEM.filter((id) => id === info.personalidade || m.persVencidas.includes(id));
  const cond = {
    primeiro_moinho: (info.moinhos || 0) > 0,
    primeira_vitoria: ganhou && info.modo === "ia",
    voar: !!info.fase3,
    virada: ganhou && !!info.virada,
    duplo: !!info.duplo,
    sem_perder: ganhou && info.pecasPerdidas === 0 && info.modo === "ia",
    serie3: c.melhorSerie >= 3,
    mestre: ganhou && info.modo === "ia" && info.nivel === "mestre",
    gata: ganhou && info.modo === "ia" && (info.iaMoinhos !== void 0 ? info.iaMoinhos === 0 : !!info.gata),
    puzzles: (ctx.puzzlesResolvidos || 0) >= 10,
    primeiro_puzzle: (ctx.puzzlesResolvidos || 0) >= 1,
    puzzles_todos: ctx.puzzlesTotal > 0 && (ctx.puzzlesResolvidos || 0) >= ctx.puzzlesTotal,
    primeira_por_codigo: porCodigo && (info.jogadas || 0) > 0,
    tres_amigos: c.partidasCodigo >= 3,
    desafio3: m.desafio.melhor >= 3,
    desafio_vitoria: !!info.desafio && ganhou,
    desafio30: c.desafioDias >= 30,
    atenta: ganhou && info.modo === "ia" && info.nivel === "atenta",
    serie7: c.melhorSerie >= 7,
    cem: c.partidas >= 100,
    cinquenta: c.vitorias >= 50,
    nivel10: nivelDepois >= 10,
    nivel20: nivelDepois >= 20,
    nivel30: nivelDepois >= 30,
    quatro_feitios: m.persVencidas.length >= PERS_ORDEM.length,
    amigo: info.modo === "2j",
    // 2 jogadores; o cartão colado usa conquistaEvento('amigo')
    dez: c.partidas >= 10
  };
  const novas = [];
  for (const [k, v] of Object.entries(cond)) if (v && !m.conquistas[k]) {
    m.conquistas[k] = true;
    novas.push(k);
  }
  return { meta: m, ganhos, moedas, rankAntes, rankDepois: rankDe(m.pontos), novas, xp: { total: xpGanho, linhas: xr.linhas }, nivelAntes, nivelDepois, subiu: nivelDepois > nivelAntes, desafioSerie };
}
const diaAnterior = (iso) => new Date(Date.parse(iso) - 864e5).toISOString().slice(0, 10);
function registarDesafio(m, hoje, ganhou) {
  const d = m.desafio;
  if (d.ultimoJogado > hoje) {
    m.ultimoDesafio = d.ultimoJogado;
    return d.serie;
  }
  if (d.ultimoJogado === hoje) return d.serie;
  d.serie = d.ultimoJogado === diaAnterior(hoje) ? d.serie + 1 : 1;
  d.melhor = Math.max(d.melhor, d.serie);
  d.ultimoJogado = hoje;
  d.ganhou = ganhou;
  m.ultimoDesafio = hoje;
  m.contadores.desafioDias++;
  return d.serie;
}
const serieAtual = (m, hoje) => m.desafio.ultimoJogado === hoje || m.desafio.ultimoJogado === diaAnterior(hoje) ? m.desafio.serie : 0;
const estadoDesafio = (m, hoje) => m.desafio.ultimoJogado >= hoje ? m.desafio.ganhou ? "feito_ganhou" : "feito_perdeu" : "por_jogar";
function conquistaEvento(meta, id) {
  const m = validarMeta(JSON.parse(JSON.stringify(meta)));
  if (!CONQUISTAS.includes(id) || m.conquistas[id]) return { meta: m, novas: [] };
  if (id === "primeiro_convite") m.contadores.convites++;
  m.conquistas[id] = true;
  return { meta: m, novas: [id] };
}
function novosDesbloqueios(antes, depois, temas, itens, ctxAntes = {}, ctxDepois = ctxAntes) {
  const out = [];
  for (const [id, th] of Object.entries(temas || {})) if (!temaAberto(id, th.desb, ctxAntes, antes) && temaAberto(id, th.desb, ctxDepois, depois)) out.push({ id, tipo: "tema", via: th.desb });
  for (const i of itens || []) if (!cosmeticoAberto(i, ctxAntes, antes) && cosmeticoAberto(i, ctxDepois, depois)) out.push({ id: i.id, tipo: i.tipo, via: i.desb });
  return out;
}
function linhasGanhos(rf, novos = [], { tetoAtingido = false } = {}) {
  const L = [];
  if (rf.xp && rf.xp.total > 0) L.push({ ganho: "xp", n: rf.xp.total, linhas: rf.xp.linhas });
  if (rf.subiu) L.push({ ganho: "nivel", n: rf.nivelDepois });
  if (rf.moedas > 0) L.push({ ganho: "moedas", n: rf.moedas });
  for (const id of rf.novas || []) L.push({ ganho: "conquista", id });
  for (const c of novos) L.push({ ganho: "cosmetico", id: c.id, tipo: c.tipo });
  if (rf.xp && rf.xp.total === 0 && tetoAtingido) L.push({ ganho: "teto" });
  return L;
}
const temDestaque = (linhas) => linhas.some((l) => l.ganho === "nivel" || l.ganho === "conquista" || l.ganho === "cosmetico");
const proximoDesafio = (meta) => NIVEIS_ORDEM.find((id) => !(meta.niveisVencidos || []).includes(id)) || null;
export {
  CHAVE_META,
  CONQUISTAS,
  COSMETICOS_IDS,
  DIREITOS_PAGOS,
  NIVEIS_ORDEM,
  NIVEL_MAX,
  PATENTE_NIVEIS,
  PERS_ORDEM,
  RANKS,
  TEMAS_ORDEM,
  TEMAS_PAGOS,
  TIPO_COSMETICO,
  XP,
  aplicarCosmetico,
  condicaoCosmetico,
  conquistaEvento,
  cosmeticoAberto,
  desbloqueioCosmetico,
  estadoDesafio,
  hojeISO,
  linhasGanhos,
  metaVazia,
  nivelDe,
  novosCosmeticos,
  novosDesbloqueios,
  patenteDeNivel,
  proximoDesafio,
  proximoNivel,
  proximoRank,
  rankDe,
  registarDesafio,
  registarFim,
  serieAtual,
  temDestaque,
  temaAberto,
  validarMeta,
  xpDoNivel,
  xpPartida
};
