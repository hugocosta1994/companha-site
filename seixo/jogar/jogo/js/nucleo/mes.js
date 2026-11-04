const eResolvido = (r) => !!r && (r.estado === "resolvido" || r.estado === "resolvido_com_pistas");
const MESES = [
  { id: "OBJ-M1", tipo: "diarios", n: 20, lascas: 20, selo: null },
  { id: "OBJ-M2", tipo: "variantes", n: 4, lascas: 0, selo: "SELO-MES-VARIANTES" },
  { id: "OBJ-M3", tipo: "quadrados", n: 24, lascas: 20, selo: null }
];
const METAS_MES = Object.freeze(MESES);
const mesDe = (iso) => String(iso).slice(0, 7);
const indiceMes = (mes) => +mes.slice(0, 4) * 12 + (+mes.slice(5, 7) - 1);
function metaDoMes(mes) {
  return MESES[indiceMes(mes) % MESES.length];
}
function progressoMes(doc, hoje, { infoDe } = {}) {
  const mes = mesDe(hoje), meta = metaDoMes(mes);
  const rs = Object.entries(doc && doc.puzzles || {}).filter(([, r]) => eResolvido(r) && mesDe(r.resolvidoEm || "") === mes);
  let atual = 0;
  if (meta.tipo === "diarios") atual = rs.filter(([id]) => /^D-/.test(id)).length;
  else if (meta.tipo === "quadrados") atual = rs.length;
  else atual = new Set(rs.map(([id]) => infoDe && infoDe(id) && infoDe(id).variante).filter(Boolean)).size;
  const dado = !!(doc && doc.metaMes && doc.metaMes[mes]);
  return { meta, mes, atual: Math.min(atual, meta.n), alvo: meta.n, cumprida: atual >= meta.n, recompensaDada: dado };
}
function receberMes(doc, hoje, ctx) {
  const p = progressoMes(doc, hoje, ctx);
  if (!p.cumprida || p.recompensaDada) return null;
  if (!doc.metaMes || typeof doc.metaMes !== "object") doc.metaMes = {};
  doc.metaMes[p.mes] = true;
  return { lascas: p.meta.lascas, selo: p.meta.selo };
}
const somarDias = (iso, n) => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + n)).toISOString().slice(0, 10);
function resumo30Dias(doc, hoje) {
  const dias = [];
  for (let i = 29; i >= 0; i--) dias.push({ data: somarDias(hoje, -i), n: 0 });
  const por = Object.fromEntries(dias.map((d) => [d.data, d]));
  let tempoMs = 0, comPistas = 0;
  for (const r of Object.values(doc && doc.puzzles || {})) {
    if (!eResolvido(r)) continue;
    const d = por[String(r.resolvidoEm || "").slice(0, 10)];
    if (!d) continue;
    d.n++;
    if (r.estado === "resolvido_com_pistas") comPistas++;
    else if (r.tempoMs > 0) tempoMs += r.tempoMs;
  }
  return { dias, diasAtivos: dias.filter((d) => d.n > 0).length, resolvidos: dias.reduce((a, d) => a + d.n, 0), tempoMs, comPistas };
}
export {
  METAS_MES,
  metaDoMes,
  progressoMes,
  receberMes,
  resumo30Dias
};
