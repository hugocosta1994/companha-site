import { CONFIG } from "../config.js";
import { diasEntre } from "../nucleo/dia.js";
const RE_DIARIO = /^D-(\d{4}-\d{2}-\d{2})$/;
const RE_CURADO = /^PAC-[A-Z]+(?:-[A-Z]+)*-\d{2}$/;
const resolvido = (r) => !!r && (r.estado === "resolvido" || r.estado === "resolvido_com_pistas");
const inteiro = (v, omissao) => Number.isInteger(v) && v >= 0 ? v : omissao;
function valoresLascas(cfg = CONFIG) {
  return {
    diario: inteiro(cfg.LASCAS_DIARIO, 10),
    facil: inteiro(cfg.LASCAS_ARQ_F, 3),
    medio: inteiro(cfg.LASCAS_ARQ_M, 5),
    dificil: inteiro(cfg.LASCAS_ARQ_D, 8),
    seq7: inteiro(cfg.LASCAS_SEQ7, 20),
    pistasSeq7: inteiro(cfg.PISTAS_SEQ7, 1)
  };
}
function lascasDe(doc) {
  if (!doc.lascas) doc.lascas = { saldo: 0, ganhasTotal: 0 };
  return doc.lascas;
}
function valorDaResolucao(doc, { id, dificuldade }, hoje, v = valoresLascas()) {
  const diario = RE_DIARIO.exec(id || "");
  if (!diario && !RE_CURADO.test(id || "")) return 0;
  if (diario && diario[1] === hoje) {
    const visto = doc.sequencia && doc.sequencia.diaMaisAltoVisto;
    const relogioAtras = visto != null && diasEntre(visto, hoje) < 0;
    if (!relogioAtras) return v.diario;
  }
  return dificuldade === "facil" ? v.facil : dificuldade === "dificil" ? v.dificil : v.medio;
}
function creditarResolucao(doc, d, hoje, v = valoresLascas()) {
  const reg = doc.puzzles && doc.puzzles[d.id];
  if (!resolvido(reg) || reg.lascasDadas) return [];
  reg.lascasDadas = true;
  const delta = valorDaResolucao(doc, d, hoje, v);
  if (delta <= 0) return [];
  const l = lascasDe(doc);
  l.saldo += delta;
  l.ganhasTotal += delta;
  return [["lascas:alteradas", { delta, saldo: l.saldo, motivo: "puzzle" }]];
}
function recompensaSequencia(doc, eventosSeq, v = valoresLascas()) {
  const eventos = [];
  for (const [nome, s] of eventosSeq) {
    if (nome !== "sequencia:alterada" || !s || s.motivo !== "subiu" || !(s.atual > 0) || s.atual % 7 !== 0) continue;
    if (v.seq7 > 0) {
      const l = lascasDe(doc);
      l.saldo += v.seq7;
      l.ganhasTotal += v.seq7;
      eventos.push(["lascas:alteradas", { delta: v.seq7, saldo: l.saldo, motivo: "seq7" }]);
    }
    if (v.pistasSeq7 > 0) {
      doc.inventario = doc.inventario || {};
      const p = Number.isInteger(doc.inventario.pistas) && doc.inventario.pistas > 0 ? doc.inventario.pistas : 0;
      doc.inventario.pistas = p + v.pistasSeq7;
      eventos.push(["pistas:alteradas", { delta: v.pistasSeq7, saldo: doc.inventario.pistas, motivo: "seq7" }]);
    }
  }
  return eventos;
}
export {
  creditarResolucao,
  recompensaSequencia,
  valorDaResolucao,
  valoresLascas
};
