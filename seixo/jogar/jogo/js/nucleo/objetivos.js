import { diaDaSemana, somarDias, paraUtc } from "./dia.js";
import { quadradoDe } from "./praca.js";
import { nivelDePo } from "./oficio.js";
const OBJ_HOJE_LASCAS = 2, OBJ_SEMANA_LASCAS = 10, OBJ_SEMANA_N = 3;
const POOL_HOJE = Object.freeze(["OBJ-H1", "OBJ-H2", "OBJ-H3", "OBJ-H4", "OBJ-H5", "OBJ-H6"]);
const POOL_SEMANA = Object.freeze(["OBJ-S1", "OBJ-S2", "OBJ-S3", "OBJ-S4", "OBJ-S5", "OBJ-S6", "OBJ-S7", "OBJ-S8"]);
const MS_DIA = 864e5;
const TEMPO_MIN_MS = Object.freeze({ F: 2e4, M: 4e4, D: 6e4 });
const mesN = (m) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7));
function melhorSequenciaMeses(doc) {
  const ms = Object.entries(doc && doc.pracas || {}).filter(([k, v]) => /^\d{4}-\d{2}$/.test(k) && v && v.completaEm).map(([k]) => mesN(k)).sort((a, b) => a - b);
  let melhor = 0, c = 0;
  ms.forEach((m, i) => {
    c = i > 0 && m === ms[i - 1] + 1 ? c + 1 : 1;
    melhor = Math.max(melhor, c);
  });
  return melhor;
}
function mesesSeguidosAtual(doc, hoje) {
  const set = new Set(Object.entries(doc && doc.pracas || {}).filter(([k, v]) => /^\d{4}-\d{2}$/.test(k) && v && v.completaEm).map(([k]) => mesN(k)));
  let m = mesN(hoje.slice(0, 7));
  if (!set.has(m)) m -= 1;
  let c = 0;
  while (set.has(m)) {
    c++;
    m--;
  }
  return c;
}
const objetivosInicial = () => ({ cumpridos: {}, hoje: { id: null, data: null }, semana: { ids: [], semanaISO: null }, progresso: {} });
function objetivosDeV1(doc) {
  const o = objetivosInicial();
  const pr = doc && doc.pracas || {};
  o.progresso = {
    recorde: doc && doc.sequencia && doc.sequencia.recorde || 0,
    pracasMes: Object.entries(pr).filter(([k, v]) => /^\d{4}-\d{2}$/.test(k) && v && v.completaEm).length,
    pacotes: Object.entries(pr).filter(([k, v]) => /^PAC-/.test(k) && v && v.completaEm).length
  };
  return o;
}
const inicioSemana = (data) => somarDias(data, -diaDaSemana(data));
function semanaISO(data) {
  const quinta = somarDias(inicioSemana(data), 3);
  const ano = Number(quinta.slice(0, 4));
  const w = Math.floor(Math.round((paraUtc(quinta) - paraUtc(`${ano}-01-01`)) / MS_DIA) / 7) + 1;
  return `${ano}-W${String(w).padStart(2, "0")}`;
}
const diaN = (data) => Math.floor(paraUtc(data) / MS_DIA);
const semanaN = (data) => Math.floor((diaN(inicioSemana(data)) + 3) / 7);
const idHoje = (data) => POOL_HOJE[(diaN(data) % 6 + 6) % 6];
function idsSemana(data) {
  const w = semanaN(data);
  return Array.from({ length: OBJ_SEMANA_N }, (_, i) => POOL_SEMANA[(w * OBJ_SEMANA_N + i) % POOL_SEMANA.length]);
}
function ajustarHoje(id, doc, hoje) {
  const ini = doc.criadoEm && String(doc.criadoEm).slice(0, 10);
  if (id === "OBJ-H5" && ini && diaN(hoje) - diaN(ini) < 7) return "OBJ-H1";
  return id;
}
function ajustarSemana(ids, doc, infoDe) {
  if (!infoDe || !ids.includes("OBJ-S4")) return ids;
  const jaD = Object.entries(doc.puzzles || {}).some(([id, r]) => r && (r.estado === "resolvido" || r.estado === "resolvido_com_pistas") && (infoDe(id) || {}).dificuldade === "dificil");
  if (jaD) return ids;
  const troca = POOL_SEMANA.find((x) => x !== "OBJ-S4" && !ids.includes(x));
  return ids.map((x) => x === "OBJ-S4" ? troca : x);
}
function ativar(doc, hoje, { infoDe } = {}) {
  if (!doc.objetivos) doc.objetivos = objetivosInicial();
  const o = doc.objetivos;
  let mudou = false;
  if (!o.hoje || o.hoje.data !== hoje) {
    o.hoje = { id: ajustarHoje(idHoje(hoje), doc, hoje), data: hoje };
    mudou = true;
  }
  const sem = semanaISO(hoje);
  if (!o.semana || o.semana.semanaISO !== sem) {
    o.semana = { ids: ajustarSemana(idsSemana(hoje), doc, infoDe), semanaISO: sem };
    mudou = true;
  }
  return mudou;
}
function resolvidos(doc, infoDe) {
  const r = [];
  for (const [id, reg] of Object.entries(doc.puzzles || {})) {
    if (!reg || reg.estado !== "resolvido" && reg.estado !== "resolvido_com_pistas" || !reg.resolvidoEm) continue;
    r.push({ id, reg, info: infoDe ? infoDe(id) : null, data: reg.resolvidoEm, semPista: reg.estado === "resolvido", diario: id.startsWith("D-") });
  }
  return r;
}
const naJanela = (x, janela, hoje) => janela === "hoje" ? x.data === hoje : janela === "semana" ? x.data >= inicioSemana(hoje) && x.data <= somarDias(inicioSemana(hoje), 6) : true;
const FILTROS = {
  qualquer: () => true,
  diario: (x) => x.diario,
  arquivo: (x) => !x.diario || x.reg.noProprioDia === false,
  medio_dificil: (x) => !!x.info && (x.info.dificuldade === "medio" || x.info.dificuldade === "dificil"),
  medio: (x) => !!x.info && x.info.dificuldade === "medio",
  dificil: (x) => !!x.info && x.info.dificuldade === "dificil"
};
const variantesDe = (xs) => new Set(xs.map((x) => x.info && x.info.variante).filter(Boolean));
function progressoDe(obj, doc, { hoje, infoDe } = {}) {
  const al = obj.alvo || {}, rs = resolvidos(doc, infoDe);
  const res = (atual, alvo) => ({ atual: Math.min(atual, alvo), alvo, cumprido: atual >= alvo });
  switch (obj.tipo) {
    case "resolver_n":
    case "resolver_sem_pista": {
      let xs = rs.filter((x) => naJanela(x, al.janela, hoje));
      if (obj.tipo === "resolver_sem_pista") xs = xs.filter((x) => x.semPista);
      if (al.filtro === "quadrado") return res(xs.filter((x) => quadradoDe(x.id)).length, al.n);
      if (al.filtro === "mesmo_pacote") {
        const c = {};
        for (const x of xs) {
          const q = quadradoDe(x.id);
          if (q && q.praca.startsWith("PAC-")) c[q.praca] = (c[q.praca] || 0) + 1;
        }
        return res(Math.max(0, ...Object.values(c)), al.n);
      }
      return res(xs.filter(FILTROS[al.filtro] || FILTROS.qualquer).length, al.n);
    }
    case "sequencia": {
      if (al.dias_seguidos) {
        const dias = new Set(rs.filter((x) => x.diario && naJanela(x, "semana", hoje)).map((x) => x.data));
        let melhor = 0, corrente = 0;
        for (let i = 0; i < 7; i++) {
          corrente = dias.has(somarDias(inicioSemana(hoje), i)) ? corrente + 1 : 0;
          melhor = Math.max(melhor, corrente);
        }
        return res(melhor, al.dias_seguidos);
      }
      const rec = Math.max(doc.sequencia && doc.sequencia.recorde || 0, doc.objetivos && doc.objetivos.progresso && doc.objetivos.progresso.recorde || 0);
      return res(rec, al.recorde);
    }
    case "variante": {
      const atuais = rs.filter((x) => naJanela(x, al.janela, hoje));
      if (al.comparar === "ontem") {
        const ontem = variantesDe(rs.filter((x) => x.data === somarDias(hoje, -1)));
        return res(atuais.filter((x) => x.info && x.info.variante && !ontem.has(x.info.variante)).length, al.n);
      }
      const antes = variantesDe(rs.filter((x) => x.data >= somarDias(inicioSemana(hoje), -7) && x.data < inicioSemana(hoje)));
      const c = {};
      for (const x of atuais) {
        const v = x.info && x.info.variante;
        if (v && !antes.has(v)) c[v] = (c[v] || 0) + 1;
      }
      return res(Math.max(0, ...Object.values(c)), al.n);
    }
    case "praca_completa":
    case "colecao":
    case "pacote_completo": {
      const mes = obj.tipo !== "pacote_completo";
      const n = Object.entries(doc.pracas || {}).filter(([k, v]) => v && v.completaEm && (mes ? /^\d{4}-\d{2}$/.test(k) : /^PAC-/.test(k))).length;
      return res(n, al.n);
    }
    case "descobrir":
      return res(doc.oficio && doc.oficio.descobertas.includes(al.descoberta) ? 1 : 0, 1);
    case "nivel":
      return res(doc.oficio ? nivelDePo(doc.oficio.po) : 1, al.nivel);
    case "mestre_tecnica": {
      const sp = rs.filter((x) => x.semPista && x.info);
      if (al.variante) return res(sp.filter((x) => x.info.variante === al.variante).length, al.n);
      const rank = (v) => Number(String(v || "N1").slice(1)) || 1;
      return res(sp.filter((x) => rank(x.info.classificacao && x.info.classificacao.nivelMax) >= rank(al.nivelMax)).length, al.n);
    }
    case "sem_pista_total":
      return res(rs.filter((x) => x.semPista).length, al.n);
    case "meses_seguidos":
      return res(melhorSequenciaMeses(doc), al.n);
    case "estacao_completa":
      return res(Object.entries(doc.pracas || {}).filter(([k, v]) => /^EST-/.test(k) && v && v.completaEm).length, al.n);
    case "tempo_faixa": {
      const melhor = { F: Infinity, M: Infinity, D: Infinity }, F = { facil: "F", medio: "M", dificil: "D" };
      for (const x of rs) {
        const f = x.info && F[x.info.dificuldade], ms = x.reg.tempoMs;
        if (x.semPista && f && ms > 0 && ms >= TEMPO_MIN_MS[f]) melhor[f] = Math.min(melhor[f], ms);
      }
      const n = ["F", "M", "D"].filter((f) => melhor[f] <= (al[f] || 0) * 1e3).length;
      return res(n, 3);
    }
    case "amigos":
      return res((doc.social && doc.social.amigos || []).length, al.n);
    default:
      return res(0, 1);
  }
}
function atualizarProgresso(doc, catalogo, ctx) {
  if (!doc.objetivos) doc.objetivos = objetivosInicial();
  const p = doc.objetivos.progresso || (doc.objetivos.progresso = {});
  let mudou = false;
  for (const obj of catalogo) {
    if (obj.horizonte !== "longo") continue;
    const { atual } = progressoDe(obj, doc, ctx);
    if (p[obj.id] !== atual) {
      p[obj.id] = atual;
      mudou = true;
    }
  }
  return mudou;
}
function jaCumprido(doc, obj, hoje) {
  const d = doc.objetivos && doc.objetivos.cumpridos[obj.id];
  if (!d) return false;
  if (obj.horizonte === "hoje") return d === hoje;
  if (obj.horizonte === "semana") return semanaISO(d) === semanaISO(hoje);
  return true;
}
function listarAtivos(doc, catalogo, ctx) {
  ativar(doc, ctx.hoje, { infoDe: ctx.infoDe });
  const o = doc.objetivos, por = new Map(catalogo.map((x) => [x.id, x]));
  const ids = [o.hoje.id, ...o.semana.ids, ...catalogo.filter((x) => x.horizonte === "longo").map((x) => x.id)];
  return ids.map((id) => por.get(id)).filter(Boolean).map((obj) => ({ obj, ...progressoDe(obj, doc, ctx), feito: jaCumprido(doc, obj, ctx.hoje) }));
}
function verificar(doc, catalogo, ctx) {
  const eventos = [];
  let mudou = ativar(doc, ctx.hoje, { infoDe: ctx.infoDe });
  if (!doc.lascas) doc.lascas = { saldo: 0, ganhasTotal: 0 };
  if (!doc.inventario) doc.inventario = { pistas: 0, itens: [] };
  for (const a of listarAtivos(doc, catalogo, ctx)) {
    if (a.feito || !a.cumprido) continue;
    const { obj } = a, premio = obj.premio || {};
    doc.objetivos.cumpridos[obj.id] = ctx.hoje;
    mudou = true;
    if (premio.lascas > 0) {
      doc.lascas.saldo += premio.lascas;
      doc.lascas.ganhasTotal += premio.lascas;
      eventos.push(["lascas:alteradas", { delta: premio.lascas, saldo: doc.lascas.saldo, motivo: "objetivo" }]);
    }
    if (premio.item && !doc.inventario.itens.includes(premio.item)) {
      doc.inventario.itens.push(premio.item);
      eventos.push(["item:obtido", { id: premio.item, via: "objetivo" }]);
    }
    eventos.push(["objetivo:cumprido", { id: obj.id, horizonte: obj.horizonte, premio }]);
  }
  if (atualizarProgresso(doc, catalogo, ctx)) mudou = true;
  return { mudou, eventos };
}
export {
  OBJ_HOJE_LASCAS,
  OBJ_SEMANA_LASCAS,
  OBJ_SEMANA_N,
  POOL_HOJE,
  POOL_SEMANA,
  TEMPO_MIN_MS,
  ativar,
  atualizarProgresso,
  idHoje,
  idsSemana,
  inicioSemana,
  listarAtivos,
  melhorSequenciaMeses,
  mesesSeguidosAtual,
  objetivosDeV1,
  objetivosInicial,
  progressoDe,
  semanaISO,
  verificar
};
