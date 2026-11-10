import { CONFIG } from "../config.js";
const META_ORDEM = Object.freeze([...CONFIG.TUTORIAL_V3_META_ORDEM || ["OBJ-L19", "OBJ-L13", "OBJ-L22"]]);
function metaRumo(longo, ordem = META_ORDEM) {
  const pos = (id) => {
    const i = ordem.indexOf(id);
    return i < 0 ? ordem.length : i;
  };
  const fr = (o) => o.n > 0 ? Math.min(1, (o.atual || 0) / o.n) : 0;
  const abertas = (longo || []).filter((o) => o && !o.feito && (!o.horizonte || o.horizonte === "longo"));
  abertas.sort((a, b) => fr(b) - fr(a) || pos(a.id) - pos(b.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return abertas[0] || null;
}
const OBJ = ["tutorial3.obj_p1", "tutorial3.obj_p2", "tutorial3.obj_p3"];
function passoFita(T) {
  if (!T || T.passo === "saiu") return null;
  if (T.passo3) return { id: T.passo3, i: Math.min(3, (T.indice || 0) + 1), objetivo: T.passo3 === "T6" ? "tutorial3.fita_feito" : OBJ[T.indice || 0] };
  const i = T.indice || 0;
  let id;
  if (T.passo === "fim") id = "T6";
  else if (i === 0) id = T.passo === "p1_toque" ? "T1" : "T2";
  else if (i === 1) id = T.passo === "p2_regra" || T.passo === "p2_forcada" ? "T3" : "T4";
  else id = "T5";
  return { id, i: i + 1, objetivo: id === "T6" ? "tutorial3.fita_feito" : OBJ[i] };
}
const linhaT6 = ({ semPista, subiu }) => semPista && subiu ? "tutorial3.meta_subiu" : "tutorial3.meta_com_pista";
export {
  META_ORDEM,
  linhaT6,
  metaRumo,
  passoFita
};
