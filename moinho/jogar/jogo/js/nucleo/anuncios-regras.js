import { AD } from "../config.js";
const SLOTS = ["A1", "A2", "A3", "A4"];
const hojeISO = (agora) => new Date(agora).toISOString().slice(0, 10);
const MOEDAS = { vitoriaIA: 5 };
function rodarDia(meta, agora = Date.now()) {
  const hoje = hojeISO(agora);
  if (!meta.moedasHoje || meta.moedasHoje.dia !== hoje) meta.moedasHoje = { dia: hoje, n: 0 };
  if (!meta.ad || meta.ad.dia !== hoje) meta.ad = { dia: hoje, A1: 0, A2: 0, A4: 0 };
  return meta;
}
function creditar(meta, n, agora = Date.now()) {
  rodarDia(meta, agora);
  const entra = Math.max(0, Math.min(Math.floor(n), AD.TETO_MOEDAS_DIA - meta.moedasHoje.n));
  meta.moedasHoje.n += entra;
  meta.moedas = (meta.moedas || 0) + entra;
  return entra;
}
const semAnuncios = (meta) => {
  var _a;
  return ((_a = meta.pagos) == null ? void 0 : _a.sem_anuncios) === true;
};
const nosPrimeirosMinutos = (meta, agora = Date.now()) => !meta.instalado || agora - meta.instalado < AD.PRIMEIROS_MIN * 6e4;
function podeSlot(meta, slot, ctx = {}, agora = Date.now()) {
  rodarDia(meta, agora);
  if (!meta.tutorialFeito) return { ok: false, motivo: "tutorial" };
  if (nosPrimeirosMinutos(meta, agora)) return { ok: false, motivo: "recem_instalado" };
  const teto = meta.moedasHoje.n >= AD.TETO_MOEDAS_DIA;
  switch (slot) {
    case "A1":
      if (!(ctx.moedasPartida > 0)) return { ok: false, motivo: "sem_moedas" };
      if (meta.ad.A1 >= AD.A1_DIA) return { ok: false, motivo: "limite_dia" };
      return teto ? { ok: false, motivo: "teto" } : { ok: true };
    case "A2":
      return meta.ad.A2 >= 1 ? { ok: false, motivo: "limite_dia" } : { ok: true };
    case "A3":
      return (ctx.dicasUsadasNoPuzzle || 0) >= AD.A3_POR_PUZZLE ? { ok: false, motivo: "limite_puzzle" } : { ok: true };
    case "A4":
      if (meta.ad.A4 >= AD.A4_DIA) return { ok: false, motivo: "limite_dia" };
      return teto ? { ok: false, motivo: "teto" } : { ok: true };
    default:
      return { ok: false, motivo: "slot" };
  }
}
function conceder(meta, slot, ctx = {}, agora = Date.now()) {
  if (!podeSlot(meta, slot, ctx, agora).ok) return null;
  if (slot === "A1") {
    meta.ad.A1++;
    return { moedas: creditar(meta, ctx.moedasPartida, agora) };
  }
  if (slot === "A4") {
    meta.ad.A4++;
    return { moedas: creditar(meta, AD.A4_MOEDAS, agora) };
  }
  if (slot === "A2") {
    meta.ad.A2++;
    return { segunda: true };
  }
  return { dica: 1 };
}
export {
  MOEDAS,
  SLOTS,
  conceder,
  creditar,
  nosPrimeirosMinutos,
  podeSlot,
  rodarDia,
  semAnuncios
};
