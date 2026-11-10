import { diasEntre, somarDias, diaDaSemana, paraUtc } from "../nucleo/dia.js";
import { REGRESSO_NIVEIS, nivelDeAusencia as nivelNucleo, ausenciaEmDias, melhorSerie, estadoDeRegresso } from "../nucleo/regresso.js";
const HORA_LEMBRETE = "19:00";
const LEMBRETE_SILENCIO_DIAS = 7;
const SEMANAS_GUARDADAS = 12;
const resolvido = (r) => !!r && (r.estado === "resolvido" || r.estado === "resolvido_com_pistas");
const regressoDe = (doc) => doc.regresso || (doc.regresso = { ultimoDia: null, dispensadoEm: null, nivel: 0, sugerido: null, avaliadoEm: null });
function ultimoDiaJogado(doc) {
  let u = regressoDe(doc).ultimoDia;
  for (const r of Object.values(doc.puzzles || {})) if (resolvido(r) && r.resolvidoEm && (!u || r.resolvidoEm > u)) u = r.resolvidoEm;
  return u;
}
const nivelDeAusencia = (dias) => nivelNucleo(dias);
function marcarAberto(doc, hoje) {
  const r = regressoDe(doc);
  if (!r.ultimoDia || hoje > r.ultimoDia) r.ultimoDia = hoje;
}
function avaliarRegresso(doc, hoje, { sugerir = () => null } = {}) {
  var _a;
  const r = regressoDe(doc);
  const ult = ultimoDiaJogado(doc);
  const recorde = melhorSerie(doc.sequencia);
  const aquecer = (n) => n === 3 && (doc.oficio && doc.oficio.po || 0) > 0;
  const vazio = { ausencia: 0, nivel: 0, mostrar: false, recorde, sugerido: null, aquecer: false, eventos: [] };
  if (!ult) return vazio;
  const dias = ausenciaEmDias(ult, hoje);
  if (dias <= 0) return vazio;
  if (r.avaliadoEm === hoje) {
    return { ...doNucleo(ult, hoje, doc), ausencia: dias, nivel: r.nivel, mostrar: r.nivel >= 2 && r.dispensadoEm !== hoje, recorde, sugerido: r.sugerido, aquecer: aquecer(r.nivel), eventos: [] };
  }
  const nivel = nivelDeAusencia(dias);
  r.avaliadoEm = hoje;
  r.nivel = nivel;
  r.sugerido = nivel >= 1 ? (_a = sugerir(doc, nivel)) != null ? _a : null : null;
  const eventos = nivel >= 1 ? [["regresso:mostrado", { ausencia: dias, nivel }]] : [];
  return { ...doNucleo(ult, hoje, doc), ausencia: dias, nivel, mostrar: nivel >= 2, recorde, sugerido: r.sugerido, aquecer: aquecer(nivel), eventos };
}
function doNucleo(ult, hoje, doc) {
  const e = estadoDeRegresso(ult, hoje, { sequencia: doc.sequencia, po: doc.oficio && doc.oficio.po || 0 });
  return { estado: e.estado, melhorSerie: e.melhorSerie, mostrarSerie: e.mostrarSerie, recomecar: e.recomecar };
}
function aceitarRegresso(doc, hoje) {
  const r = regressoDe(doc);
  r.dispensadoEm = hoje;
  return [["regresso:aceite", { puzzle: r.sugerido }]];
}
function dispensarRegresso(doc, hoje) {
  regressoDe(doc).dispensadoEm = hoje;
  return [["regresso:dispensado", {}]];
}
function semanaIso(data) {
  const d = new Date(paraUtc(data));
  d.setUTCDate(d.getUTCDate() - diaDaSemana(data) + 3);
  const ano = d.getUTCFullYear();
  const dia1 = Date.UTC(ano, 0, 1);
  const sem = Math.floor(Math.round((d.getTime() - dia1) / 864e5) / 7) + 1;
  return `${ano}-W${String(sem).padStart(2, "0")}`;
}
const segundaDe = (data) => somarDias(data, -diaDaSemana(data));
function resumoDaSemana(doc, iso, { poDe = null } = {}) {
  const todos = Object.entries(doc.puzzles || {}).filter(([, r]) => resolvido(r) && r.resolvidoEm);
  const pu = todos.filter(([, r]) => semanaIso(r.resolvidoEm) === iso);
  if (!pu.length) return null;
  const dias = new Set(pu.filter(([id, r]) => /^D-/.test(id) && r.noProprioDia).map(([, r]) => r.resolvidoEm));
  const quadrados = pu.filter(([id]) => /^D-/.test(id)).length;
  const base = doc.semanaBase || null;
  const of = doc.oficio || { po: 0, nivel: 1, descobertas: [] };
  const inicio = segundaDe(pu[0][1].resolvidoEm);
  const lado = (r) => Math.round(Math.sqrt((r.grelha || "").length));
  const tempos = pu.map(([, r]) => r).filter((r) => r.estado === "resolvido" && r.tempoMs > 0 && lado(r) > 0);
  let melhorTempo = null;
  if (tempos.length) {
    const m = tempos.reduce((a, b) => b.tempoMs < a.tempoMs ? b : a);
    const antes = todos.map(([, r]) => r).filter((r) => r.estado === "resolvido" && r.tempoMs > 0 && lado(r) === lado(m) && r.resolvidoEm < inicio);
    if (antes.length && antes.every((r) => r.tempoMs > m.tempoMs)) melhorTempo = { faixa: `${lado(m)}x${lado(m)}`, seg: Math.round(m.tempoMs / 1e3) };
  }
  return {
    iso,
    puzzles: pu.length,
    semPista: pu.filter(([, r]) => r.estado === "resolvido").length,
    diarios: Math.min(7, dias.size),
    tecnicas: base ? (of.descobertas || []).filter((d) => !(base.descobertas || []).includes(d)) : [],
    poGanho: base ? Math.max(0, (of.po || 0) - (base.po || 0)) : poDe ? pu.reduce((a, [, r]) => a + poDe(r), 0) : 0,
    nivel: of.nivel || 1,
    melhorTempo,
    quadrados
  };
}
function gerarResumoSemanal(doc, hoje, opcoes = {}) {
  const atual = semanaIso(hoje);
  const anterior = semanaIso(somarDias(segundaDe(hoje), -1));
  const lista = doc.semanas || (doc.semanas = []);
  if (lista.some((s) => s.iso === anterior) || doc.semanaBase && doc.semanaBase.iso === atual) return { resumo: null, eventos: [] };
  const resumo = resumoDaSemana(doc, anterior, opcoes);
  doc.semanaBase = { iso: atual, descobertas: [...doc.oficio && doc.oficio.descobertas || []], po: doc.oficio && doc.oficio.po || 0 };
  if (!resumo) return { resumo: null, eventos: [] };
  lista.push(resumo);
  lista.sort((a, b) => a.iso < b.iso ? -1 : 1);
  while (lista.length > SEMANAS_GUARDADAS) lista.shift();
  return { resumo, eventos: [["semana:resumo", { iso: resumo.iso, puzzles: resumo.puzzles, diarios: resumo.diarios }]] };
}
const lembreteDe = (doc) => doc.lembrete || (doc.lembrete = { ligado: false, hora: HORA_LEMBRETE, ultimoDisparo: null, motivo: null });
function ligarLembrete(doc, hora = HORA_LEMBRETE, permissao = true) {
  const l = lembreteDe(doc);
  if (!permissao) {
    l.ligado = false;
    return { ligado: false, textoChave: "seixo.lembrete.recusado", eventos: [] };
  }
  l.ligado = true;
  l.hora = /^\d{2}:\d{2}$/.test(hora) ? hora : HORA_LEMBRETE;
  l.motivo = null;
  return { ligado: true, eventos: [["lembrete:ativado", { hora: l.hora }]] };
}
function desligarLembrete(doc, motivo = "jogador") {
  const l = lembreteDe(doc);
  const era = l.ligado;
  l.ligado = false;
  l.motivo = motivo;
  return era ? [["lembrete:desativado", { motivo }]] : [];
}
function deveDisparar(doc, hoje, horaAgora) {
  const l = lembreteDe(doc);
  if (!l.ligado) return { disparar: false, eventos: [] };
  const ult = ultimoDiaJogado(doc);
  if (ult && diasEntre(ult, hoje) >= LEMBRETE_SILENCIO_DIAS) return { disparar: false, eventos: desligarLembrete(doc, "inatividade") };
  if (l.ultimoDisparo === hoje || horaAgora < l.hora) return { disparar: false, eventos: [] };
  l.ultimoDisparo = hoje;
  return { disparar: true, eventos: [["lembrete:disparado", {}]] };
}
export {
  HORA_LEMBRETE,
  LEMBRETE_SILENCIO_DIAS,
  REGRESSO_NIVEIS,
  SEMANAS_GUARDADAS,
  aceitarRegresso,
  avaliarRegresso,
  desligarLembrete,
  deveDisparar,
  dispensarRegresso,
  gerarResumoSemanal,
  lembreteDe,
  ligarLembrete,
  marcarAberto,
  nivelDeAusencia,
  regressoDe,
  resumoDaSemana,
  segundaDe,
  semanaIso,
  ultimoDiaJogado
};
