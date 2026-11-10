import { CONFIG } from "../config.js";
import { PUZZLES_TUTORIAL } from "../nucleo/tutorial.js";
const SLOTS = Object.freeze({ pista: "AD1", lascas: "AD2", troco: "AD3" });
const estadoAnuncios = (doc) => doc.anuncios || (doc.anuncios = { pistaDia: null, pistaN: 0, lascasDia: null, trocos: [] });
const resolvido = (r) => !!r && (r.estado === "resolvido" || r.estado === "resolvido_com_pistas");
function partidasCompletas(doc) {
  return Object.entries(doc.puzzles || {}).filter(([id, r]) => resolvido(r) && !PUZZLES_TUTORIAL.includes(id)).length;
}
const pistasHoje = (doc, hoje) => {
  const a = estadoAnuncios(doc);
  return a.pistaDia === hoje ? a.pistaN : 0;
};
function elegivel(doc, slot, { hoje, emTutorial = false, ref = null, cfg = CONFIG } = {}) {
  var _a, _b;
  if (emTutorial) return { ok: false, motivo: "tutorial" };
  if (partidasCompletas(doc) < ((_a = cfg.AD_SEM_ANUNCIO_PRIMEIRAS) != null ? _a : 5)) return { ok: false, motivo: "primeiras" };
  const a = estadoAnuncios(doc);
  if (slot === "AD1" && pistasHoje(doc, hoje) >= ((_b = cfg.AD_PISTA_DIA) != null ? _b : 3)) return { ok: false, motivo: "limite" };
  if (slot === "AD2" && a.lascasDia === hoje) return { ok: false, motivo: "limite" };
  if (slot === "AD3" && (ref == null || a.trocos.includes(ref))) return { ok: false, motivo: "limite" };
  if (!["AD1", "AD2", "AD3"].includes(slot)) return { ok: false, motivo: "desconhecido" };
  return { ok: true };
}
function conceder(doc, slot, { hoje, ref = null, extra = 0, cfg = CONFIG } = {}) {
  var _a, _b;
  const a = estadoAnuncios(doc);
  doc.inventario = doc.inventario || {};
  doc.lascas = doc.lascas || { saldo: 0, ganhasTotal: 0 };
  if (slot === "AD1") {
    const saldo = (Number.isInteger(doc.inventario.pistas) && doc.inventario.pistas > 0 ? doc.inventario.pistas : 0) + 1;
    doc.inventario.pistas = saldo;
    a.pistaN = pistasHoje(doc, hoje) + 1;
    a.pistaDia = hoje;
    return { ganho: { pistas: 1 }, eventos: [["pistas:alteradas", { delta: 1, saldo, motivo: "anuncio" }]] };
  }
  const n = slot === "AD2" ? (_a = cfg.AD_LASCAS_BONUS) != null ? _a : 5 : Math.max(0, Math.min(Math.floor(extra), (_b = cfg.CAMINHO_TROCO_N) != null ? _b : 10));
  if (slot === "AD2") a.lascasDia = hoje;
  else a.trocos.push(ref);
  if (a.trocos.length > 50) a.trocos.splice(0, a.trocos.length - 50);
  if (n <= 0) return { ganho: { lascas: 0 }, eventos: [] };
  doc.lascas.saldo = (doc.lascas.saldo || 0) + n;
  doc.lascas.ganhasTotal = (doc.lascas.ganhasTotal || 0) + n;
  return { ganho: { lascas: n }, eventos: [["lascas:alteradas", { delta: n, saldo: doc.lascas.saldo, motivo: "anuncio" }]] };
}
export {
  SLOTS,
  conceder,
  elegivel,
  estadoAnuncios,
  partidasCompletas,
  pistasHoje
};
