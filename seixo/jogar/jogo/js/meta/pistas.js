function saldoPistas(doc) {
  var _a;
  const n = Number((_a = doc == null ? void 0 : doc.inventario) == null ? void 0 : _a.pistas);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function debitarPista(doc) {
  const saldo = saldoPistas(doc);
  if (saldo <= 0) return null;
  doc.inventario = doc.inventario || {};
  doc.inventario.pistas = saldo - 1;
  return saldo - 1;
}
function ligarPistas({ documento, gravarJa, ouvir, emitir }) {
  return ouvir((nome, d) => {
    if (nome !== "puzzle:pista" || !d || d.gratis) return;
    const doc = documento();
    const saldo = debitarPista(doc);
    if (saldo === null) return;
    Promise.resolve().then(() => gravarJa(doc)).catch((e) => console.warn("[meta] grava\xE7\xE3o do d\xE9bito de pista falhou:", e));
    emitir("pistas:alteradas", { delta: -1, saldo, motivo: "uso" });
  });
}
export {
  debitarPista,
  ligarPistas,
  saldoPistas
};
