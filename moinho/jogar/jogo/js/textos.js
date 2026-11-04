let tabela = {};
function aplicar(obj) {
  tabela = obj;
}
async function carregarTextos(url = new URL("../data/textos.json", import.meta.url)) {
  tabela = await (await fetch(url)).json();
}
function t(chave) {
  return Object.prototype.hasOwnProperty.call(tabela, chave) ? tabela[chave] : `\xAB${chave}\xBB`;
}
export {
  aplicar,
  carregarTextos,
  t
};
