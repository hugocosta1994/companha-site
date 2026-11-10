import { validar } from "../plataforma/gravacao.js";
const JOGO_ID = "seixo";
const SCHEMA = 1;
const EVENTOS_GUARDAR = Object.freeze(["puzzle:resolvido", "loja:troca", "compras:direitos", "app:pausa", "definicoes:alteradas"]);
const eObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const uniao = (a = [], b = []) => [.../* @__PURE__ */ new Set([...a || [], ...b || []])];
const quando = (d) => {
  const t = Date.parse(d && d.atualizadoEm);
  return Number.isFinite(t) ? t : 0;
};
const maxData = (a, b) => a == null ? b : b == null ? a : a >= b ? a : b;
const RANGO = { resolvido: 2, resolvido_com_pistas: 1, a_meio: 0 };
function melhorRegisto(a, b) {
  var _a, _b, _c, _d, _e, _f;
  if (!a) return b;
  if (!b) return a;
  const ra = (_a = RANGO[a.estado]) != null ? _a : -1, rb = (_b = RANGO[b.estado]) != null ? _b : -1;
  if (ra !== rb) return ra > rb ? a : b;
  if (ra > 0) return a.tempoMs <= b.tempoMs ? a : b;
  return ((_d = (_c = a.historico) == null ? void 0 : _c.length) != null ? _d : 0) >= ((_f = (_e = b.historico) == null ? void 0 : _e.length) != null ? _f : 0) ? a : b;
}
function fundirDocumentos(local, remoto) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  if (!eObj(local) || !eObj(remoto)) return null;
  if (local.versao !== remoto.versao) return null;
  const novo = quando(remoto) > quando(local) ? remoto : local;
  const L = local, R = remoto, out = structuredClone(novo);
  out.criadoEm = L.criadoEm && R.criadoEm ? L.criadoEm <= R.criadoEm ? L.criadoEm : R.criadoEm : L.criadoEm || R.criadoEm;
  const ids = /* @__PURE__ */ new Set([...Object.keys(L.puzzles || {}), ...Object.keys(R.puzzles || {})]);
  out.puzzles = {};
  for (const id of ids) out.puzzles[id] = structuredClone(melhorRegisto((L.puzzles || {})[id], (R.puzzles || {})[id]));
  const sl = L.sequencia || {}, sr = R.sequencia || {};
  const seqNova = ((_a = sl.ultimoDiaMantido) != null ? _a : "") >= ((_b = sr.ultimoDiaMantido) != null ? _b : "") ? sl : sr;
  out.sequencia = { ...seqNova, recorde: Math.max(sl.recorde || 0, sr.recorde || 0), diaMaisAltoVisto: maxData(sl.diaMaisAltoVisto, sr.diaMaisAltoVisto) };
  out.lascas = { ...novo.lascas || {}, ganhasTotal: Math.max(((_c = L.lascas) == null ? void 0 : _c.ganhasTotal) || 0, ((_d = R.lascas) == null ? void 0 : _d.ganhasTotal) || 0) };
  const ll = L.lascas || {}, lr = R.lascas || {};
  const mapa = /* @__PURE__ */ new Map();
  for (const o of [...ll.ordens || [], ...lr.ordens || []]) if (o && o.id && !mapa.has(o.id)) mapa.set(o.id, o);
  if (mapa.size || ll.compradasTotal || lr.compradasTotal) {
    out.lascas.ordens = [...mapa.values()].sort((a, b) => String(a.t).localeCompare(String(b.t))).slice(-100);
    out.lascas.compradasTotal = Math.max(ll.compradasTotal || 0, lr.compradasTotal || 0, [...mapa.values()].reduce((n, o) => n + (o.qtd || 0), 0));
    out.lascas.gastasTotal = Math.max(ll.gastasTotal || 0, lr.gastasTotal || 0);
    const nv = novo === R ? lr : ll, nvOrd = nv.ordens || [], conhecidas = new Set(nvOrd.map((o) => o.id));
    const corte = nvOrd.length >= 100 ? nvOrd.map((o) => String(o.t)).sort()[0] : null;
    const nova = (o) => !conhecidas.has(o.id) && !(corte !== null && String(o.t) < corte);
    out.lascas.saldo = (nv.saldo || 0) + [...mapa.values()].filter(nova).reduce((n, o) => n + (o.qtd || 0), 0);
  }
  out.pracas = {};
  for (const k of /* @__PURE__ */ new Set([...Object.keys(L.pracas || {}), ...Object.keys(R.pracas || {})])) {
    const a = (L.pracas || {})[k], b = (R.pracas || {})[k];
    out.pracas[k] = structuredClone(!a ? b : !b ? a : a.completaEm ? a : b);
    if (a && b) out.pracas[k].recompensaDada = !!(a.recompensaDada || b.recompensaDada);
  }
  const il = L.inventario || {}, ir = R.inventario || {}, inv = novo.inventario || {};
  out.inventario = {
    ...inv,
    itens: uniao(il.itens, ir.itens),
    loja: { ...inv.loja || {}, direitos: uniao((_e = il.loja) == null ? void 0 : _e.direitos, (_f = ir.loja) == null ? void 0 : _f.direitos), consumiveisCreditados: uniao((_g = il.loja) == null ? void 0 : _g.consumiveisCreditados, (_h = ir.loja) == null ? void 0 : _h.consumiveisCreditados), atualizadoEm: maxData((_i = il.loja) == null ? void 0 : _i.atualizadoEm, (_j = ir.loja) == null ? void 0 : _j.atualizadoEm) }
  };
  const ol = L.oficio || {}, or = R.oficio || {};
  out.oficio = { ...novo.oficio || {}, nivel: Math.max(ol.nivel || 1, or.nivel || 1), descobertas: uniao(ol.descobertas, or.descobertas) };
  out.oficio.po = (ol.nivel || 1) === (or.nivel || 1) ? Math.max(ol.po || 0, or.po || 0) : ((ol.nivel || 1) > (or.nivel || 1) ? ol.po : or.po) || 0;
  out.objetivos = { ...novo.objetivos || {}, cumpridos: { ...((_k = L.objetivos) == null ? void 0 : _k.cumpridos) || {}, ...((_l = R.objetivos) == null ? void 0 : _l.cumpridos) || {} } };
  const cl = L.caminho || {}, cr = R.caminho || {};
  out.caminho = { ...novo.caminho || {}, nivel: Math.max(cl.nivel || 1, cr.nivel || 1), resolvidos: uniao(cl.resolvidos, cr.resolvidos), saltados: uniao(cl.saltados, cr.saltados), "tro\xE7osPagos": uniao(cl["tro\xE7osPagos"], cr["tro\xE7osPagos"]) };
  const tl = L.tutorial || {}, tr = R.tutorial || {};
  out.tutorial = { ...novo.tutorial || {}, concluido: !!(tl.concluido || tr.concluido), introsVistas: uniao(tl.introsVistas, tr.introsVistas) };
  out.atualizadoEm = novo.atualizadoEm;
  return out;
}
async function ligarProgressoConta({ contas, ouvir, documento, substituir, gravarJa = null, aoMudar = null, aoAplicado = null, opcoesContas = {} }) {
  if (!contas) return { ativo: false, guardar() {
  }, desligar() {
  } };
  const guardar = () => {
    try {
      contas.guardar(documento());
    } catch {
    }
  };
  const aplicar = (dados) => {
    try {
      const { doc } = validar(dados);
      substituir(doc);
      if (gravarJa) Promise.resolve(gravarJa(doc)).catch(() => {
      });
      if (aoAplicadoSeguro) aoAplicadoSeguro(doc);
    } catch (e) {
      console.warn("[contas] progresso remoto n\xE3o aplicado:", e);
    }
  };
  const aoAplicadoSeguro = aoAplicado ? (d) => {
    try {
      aoAplicado(d);
    } catch {
    }
  } : null;
  let r = null;
  try {
    r = await contas.iniciar({ jogoId: JOGO_ID, schema: SCHEMA, merge: fundirDocumentos, aoMudar: (e) => {
      try {
        aoMudar && aoMudar(e);
      } catch {
      }
    }, aoAplicar: aplicar, ...opcoesContas });
  } catch (e) {
    console.warn("[contas] n\xE3o iniciou:", e);
    return { ativo: false, guardar() {
    }, desligar() {
    } };
  }
  guardar();
  let desligarEv = null;
  try {
    desligarEv = ouvir && ouvir((nome) => {
      if (EVENTOS_GUARDAR.includes(nome)) guardar();
    });
  } catch {
  }
  return { ativo: !!(r && r.ativo), guardar, desligar() {
    if (typeof desligarEv === "function") desligarEv();
  } };
}
export {
  EVENTOS_GUARDAR,
  JOGO_ID,
  SCHEMA,
  fundirDocumentos,
  ligarProgressoConta
};
