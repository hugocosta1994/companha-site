const DICAS = { metas: "dica.metas", quadro: "dica.quadro" };
const dicaPendente = (doc, aba) => DICAS[aba] && !(doc && doc.dicas && doc.dicas[aba]) ? DICAS[aba] : null;
function marcarDica(doc, aba) {
  if (!doc || !DICAS[aba]) return false;
  if (!doc.dicas || typeof doc.dicas !== "object") doc.dicas = {};
  if (doc.dicas[aba]) return false;
  doc.dicas[aba] = true;
  return true;
}
export {
  DICAS,
  dicaPendente,
  marcarDica
};
