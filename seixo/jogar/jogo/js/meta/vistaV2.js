import { NIVEIS_PO, NIVEIS_LASCAS, DESCOBERTAS, nivelDePo, faltam } from "../nucleo/oficio.js";
const TEXTO_L8 = { "OBJ-L8-JUNTAS": "obj.L8a", "OBJ-L8-CONTRA": "obj.L8b", "OBJ-L8-ORLA": "obj.L8c" };
const chaveTextoObjetivo = (id) => TEXTO_L8[id] || `obj.${String(id).replace(/^OBJ-/, "")}`;
const CHAVE_DESC = { "DESC-N2": "oficio.desc.n2", "DESC-N3": "oficio.desc.n3", "DESC-JUNTAS": "oficio.desc.juntas", "DESC-CONTRA": "oficio.desc.contra", "DESC-ORLA": "oficio.desc.orla" };
const SEMANA_N = 3;
const diaNumero = (iso) => Math.floor(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5);
const semanaNumero = (iso) => Math.floor((diaNumero(iso) - 4) / 7);
function oficioVista(doc) {
  const o = (doc == null ? void 0 : doc.oficio) || {};
  const po = Number.isFinite(o.po) ? o.po : 0;
  const nivel = nivelDePo(po);
  const feitas = new Set(o.descobertas || []);
  const base = NIVEIS_PO[nivel - 1], topo = nivel >= NIVEIS_PO.length ? null : NIVEIS_PO[nivel];
  return {
    po,
    nivel,
    mestre: topo == null,
    faltam: faltam(po),
    proximo: topo == null ? null : nivel + 1,
    fracao: topo == null ? 1 : Math.max(0, Math.min(1, (po - base) / (topo - base))),
    descobertas: DESCOBERTAS.map((id) => ({ id, feita: feitas.has(id), chave: CHAVE_DESC[id] })),
    premios: [2, 3, 4, 5].map((n) => ({ nivel: n, lascas: NIVEIS_LASCAS[n - 1], alcancado: nivel >= n }))
  };
}
function objetivosVista(doc, catalogo, hoje) {
  const lista = Array.isArray(catalogo) ? catalogo : (catalogo == null ? void 0 : catalogo.objetivos) || [];
  const ob = (doc == null ? void 0 : doc.objetivos) || {};
  const cumpridos = ob.cumpridos || {}, progresso = ob.progresso || {};
  const pool = (h) => lista.filter((o) => o.horizonte === h);
  const item = (o) => {
    var _a;
    const n = Number((_a = o.alvo) == null ? void 0 : _a.n) > 1 ? Number(o.alvo.n) : 1;
    const feito = !!cumpridos[o.id];
    const atual = feito ? n : Math.min(n, Math.max(0, Number(progresso[o.id]) || 0));
    return { id: o.id, horizonte: o.horizonte, texto: chaveTextoObjetivo(o.id), feito, n, atual, premio: o.premio || {} };
  };
  const ph = pool("hoje"), ps = pool("semana"), pl = pool("longo");
  const idHoje = ob.hoje && ob.hoje.data === hoje && ob.hoje.id ? ob.hoje.id : ph.length ? ph[(diaNumero(hoje) % ph.length + ph.length) % ph.length].id : null;
  const idsSemana = ob.semana && Array.isArray(ob.semana.ids) && ob.semana.ids.length ? ob.semana.ids : (() => {
    const k = semanaNumero(hoje);
    return ps.length ? Array.from({ length: Math.min(SEMANA_N, ps.length) }, (_, i) => ps[(k * SEMANA_N + i) % ps.length].id) : [];
  })();
  const porId = (id) => lista.find((o) => o.id === id);
  const longo = pl.map(item);
  return {
    hoje: idHoje && porId(idHoje) ? [item(porId(idHoje))] : [],
    semana: idsSemana.map(porId).filter(Boolean).map(item),
    longo,
    feitosLongo: longo.filter((o) => o.feito).length
  };
}
function colecaoVista(meses = [], pacotes = []) {
  const m = meses.filter((x) => x.feitos > 0 || x.completa);
  const completas = meses.filter((x) => x.completa).length + pacotes.filter((x) => x.completa).length;
  const quadrados = meses.reduce((s, x) => s + x.feitos, 0) + pacotes.reduce((s, x) => s + x.feitos, 0);
  return { meses: m.sort((a, b) => a.mes < b.mes ? 1 : -1), pacotes, completas, quadrados, vazia: quadrados === 0 };
}
export {
  SEMANA_N,
  chaveTextoObjetivo,
  colecaoVista,
  objetivosVista,
  oficioVista,
  semanaNumero
};
