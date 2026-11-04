import { NIVEIS_ORDEM } from "../config.js";
import { pontosPartida } from "./multijogador.js";
const CHAVE_META = "moinho_meta";
const RANKS = [0, 12, 35, 80, 160, 320];
const CONQUISTAS = ["primeiro_moinho", "primeira_vitoria", "voar", "virada", "duplo", "sem_perder", "serie3", "mestre", "gata", "puzzles", "alquerque", "amigo", "dez"];
const TEMAS_ORDEM = ["madeira", "ardosia", "papel", "noite", "ceramica", "lareira", "granito", "alvorada"];
const metaVazia = () => ({ pontos: 0, dia: "", hoje: 0, conquistas: {}, tema: "madeira", pagos: {}, perfil: null, amigos: [], partidas: [], ultimosResultados: [], ultimoDesafio: "", tutorialFeito: false, contadores: { partidas: 0, serie: 0, melhorSerie: 0, amigo: 0 } });
function validarMeta(x) {
  const b = metaVazia();
  if (!x || typeof x !== "object" || Array.isArray(x)) return b;
  const n = (v, d = 0) => Number.isFinite(v) && v >= 0 ? Math.floor(v) : d;
  const o = { ...b };
  o.pontos = n(x.pontos);
  o.hoje = n(x.hoje);
  o.dia = typeof x.dia === "string" ? x.dia : "";
  o.conquistas = Object.fromEntries(Object.entries(x.conquistas || {}).filter(([k, v]) => CONQUISTAS.includes(k) && v === true));
  o.tema = TEMAS_ORDEM.includes(x.tema) ? x.tema : "madeira";
  o.pagos = Object.fromEntries(Object.entries(x.pagos || {}).filter(([k, v]) => TEMAS_ORDEM.includes(k) && v === true));
  o.perfil = x.perfil && typeof x.perfil.alcunha === "string" && typeof x.perfil.id === "string" ? { alcunha: x.perfil.alcunha, avatar: n(x.perfil.avatar), id: x.perfil.id } : null;
  o.amigos = Array.isArray(x.amigos) ? x.amigos.filter((a) => a && typeof a.id === "string" && typeof a.alcunha === "string").slice(0, 50).map((a) => ({ ...a, pontos: n(a.pontos) })) : [];
  o.partidas = Array.isArray(x.partidas) ? x.partidas.filter((g) => g && Number.isInteger(g.semente) && typeof g.codigo === "string").slice(0, 10) : [];
  o.ultimosResultados = Array.isArray(x.ultimosResultados) ? x.ultimosResultados.filter((r) => "vde".includes(r) && r.length === 1).slice(-3) : [];
  o.nivelUsado = NIVEIS_ORDEM.includes(x.nivelUsado) ? x.nivelUsado : void 0;
  o.ultimoDesafio = typeof x.ultimoDesafio === "string" ? x.ultimoDesafio : "";
  o.tutorialFeito = x.tutorialFeito === true;
  const c = x.contadores || {};
  o.contadores = { partidas: n(c.partidas), serie: n(c.serie), melhorSerie: n(c.melhorSerie), amigo: n(c.amigo) };
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
  const m = /^(\d+) vit[oó]rias contra a IA/.exec(desb || "");
  if (m) return ctx.vitoriasIA >= +m[1];
  const p = /^(\d+) puzzles/.exec(desb || "");
  if (p) return ctx.puzzlesResolvidos >= +p[1];
  if (/Alquerque/.test(desb || "")) return ctx.alquerque >= 1;
  if (/^oferta do tutorial/.test(desb || "")) return meta.tutorialFeito === true;
  return false;
}
function registarFim(meta, info, ctx = {}, agora = Date.now()) {
  const m = validarMeta(JSON.parse(JSON.stringify(meta)));
  const hoje = hojeISO(agora);
  if (m.dia !== hoje) {
    m.dia = hoje;
    m.hoje = 0;
  }
  const rankAntes = rankDe(m.pontos);
  let ganhos = 0;
  if (info.modo === "ia") {
    const r = pontosPartida(info.nivel, info.resultado, { semPerder: info.resultado === "v" && info.pecasPerdidas === 0, jogadas: info.jogadas, desafio: !!info.desafio }, m.hoje);
    ganhos = r.ganhos;
    m.hoje = r.total;
    m.pontos += ganhos;
  }
  const c = m.contadores;
  c.partidas++;
  if (info.resultado === "v") {
    c.serie++;
    c.melhorSerie = Math.max(c.melhorSerie, c.serie);
  } else if (info.resultado === "d") c.serie = 0;
  if (info.modo !== "ia") c.amigo++;
  m.ultimosResultados = [...m.ultimosResultados, info.resultado].slice(-3);
  const ganhou = info.resultado === "v";
  const cond = {
    primeiro_moinho: (info.moinhos || 0) > 0,
    primeira_vitoria: ganhou && info.modo === "ia",
    voar: !!info.fase3,
    virada: ganhou && !!info.virada,
    duplo: !!info.duplo,
    sem_perder: ganhou && info.pecasPerdidas === 0 && info.modo === "ia",
    serie3: c.melhorSerie >= 3,
    mestre: ganhou && info.modo === "ia" && info.nivel === "mestre",
    gata: ganhou && info.modo === "ia" && !!info.gata,
    puzzles: (ctx.puzzlesResolvidos || 0) >= 12,
    alquerque: info.motor === "alquerque",
    amigo: info.modo !== "ia" && info.modo !== void 0 && info.motor !== "alquerque",
    dez: c.partidas >= 10
  };
  const novas = [];
  for (const [k, v] of Object.entries(cond)) if (v && !m.conquistas[k]) {
    m.conquistas[k] = true;
    novas.push(k);
  }
  return { meta: m, ganhos, rankAntes, rankDepois: rankDe(m.pontos), novas };
}
export {
  CHAVE_META,
  CONQUISTAS,
  NIVEIS_ORDEM,
  RANKS,
  TEMAS_ORDEM,
  hojeISO,
  metaVazia,
  proximoRank,
  rankDe,
  registarFim,
  temaAberto,
  validarMeta
};
