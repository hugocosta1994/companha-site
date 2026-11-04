const MS_DIA = 864e5;
const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const dois = (x) => String(x).padStart(2, "0");
function dataLocal(agora = /* @__PURE__ */ new Date()) {
  return deUtc(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
}
function paraUtc(data) {
  const m = RE_DATA.exec(data);
  if (!m) throw new Error(`data '${data}' fora do formato AAAA-MM-DD`);
  const a = +m[1], mes = +m[2], d = +m[3];
  const t = Date.UTC(a, mes - 1, d);
  if (deUtc(t) !== data) throw new Error(`data '${data}' n\xE3o existe`);
  return t;
}
function deUtc(t) {
  const x = new Date(t);
  return `${String(x.getUTCFullYear()).padStart(4, "0")}-${dois(x.getUTCMonth() + 1)}-${dois(x.getUTCDate())}`;
}
function diasEntre(de, ate) {
  return Math.round((paraUtc(ate) - paraUtc(de)) / MS_DIA);
}
function somarDias(data, dias) {
  return deUtc(paraUtc(data) + dias * MS_DIA);
}
function diaDaSemana(data) {
  return (new Date(paraUtc(data)).getUTCDay() + 6) % 7;
}
function indiceTabela(data, epocaTabela) {
  return diasEntre(epocaTabela, data);
}
function naTabela(indice, tamanho) {
  return indice >= 0 && indice < tamanho;
}
function numeroPartilha(data, diaLancamento) {
  return diasEntre(diaLancamento, data) + 1;
}
function seedDoDia(data, versaoGerador = "g1") {
  return `seixo:${versaoGerador}:${data}`;
}
function verDia(diaMaisAltoVisto, hoje) {
  paraUtc(hoje);
  if (diaMaisAltoVisto == null) return { diaMaisAltoVisto: hoje, relogioAtras: false };
  const atras = diasEntre(diaMaisAltoVisto, hoje) < 0;
  return { diaMaisAltoVisto: atras ? diaMaisAltoVisto : hoje, relogioAtras: atras };
}
function eFuturo(data, hoje) {
  return diasEntre(hoje, data) > 0;
}
export {
  dataLocal,
  diaDaSemana,
  diasEntre,
  eFuturo,
  indiceTabela,
  naTabela,
  numeroPartilha,
  paraUtc,
  seedDoDia,
  somarDias,
  verDia
};
