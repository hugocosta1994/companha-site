const SKU_APOIO = "moinho_apoio";
const ORDEM_SECOES = Object.freeze(["teus", "ganha", "apoiar"]);
const SELOS = Object.freeze({
  aplicado: { icone: "\u2714", forma: "circulo-cheio", chave: "loja.selo.aplicado", aria: "loja.aria.aplicado" },
  teu: { icone: "\u2713", forma: "circulo-vazio", chave: "loja.selo.teu", aria: "loja.aria.teu" },
  ganha: { icone: "\u{1F512}", forma: "tracejado", chave: "loja.selo.ganha", aria: "loja.aria.ganha" },
  venda: { icone: "\u{1F3F7}", forma: "losango", chave: null, aria: "loja.aria.venda" },
  apoiante: { icone: "\u2665", forma: "coracao", chave: "loja.selo.apoiante", aria: "loja.aria.apoiante" }
});
const estadoDe = ({ emUso, aberto }) => emUso ? "aplicado" : aberto ? "teu" : "ganha";
function secoes(itens, { aberto, emUso, apoio = (i) => i.id === "granito" }) {
  const posse = itens.filter((i) => aberto(i));
  const teus = posse.length > 1 ? posse : [];
  const ganha = itens.filter((i) => !aberto(i) && !apoio(i));
  const resto = posse.length > 1 ? [] : posse;
  return { teus, ganha: [...resto, ...ganha], emUso: itens.filter((i) => emUso(i)) };
}
const TITULOS = { moinho_pack_azulejo: "azulejo", moinho_pack_lareira: "lareira", moinho_apoio: "apoio", moinho_tudo: "tudo" };
function cartoesApoio(produtos, tem) {
  const out = [];
  for (const p of produtos) {
    const k = TITULOS[p.playId];
    if (!k) continue;
    const falta = p.temas.filter((x) => !tem(x));
    if (!falta.length) continue;
    if (p.playId !== "moinho_tudo" && falta.length !== p.temas.length) continue;
    out.push({ playId: p.playId, chave: k, falta, eur: p.eur, comMiniatura: p.playId === SKU_APOIO, coracao: p.playId === SKU_APOIO });
  }
  return out;
}
export {
  ORDEM_SECOES,
  SELOS,
  SKU_APOIO,
  cartoesApoio,
  estadoDe,
  secoes
};
