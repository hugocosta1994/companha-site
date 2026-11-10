const PRACAS_PARA_SAZONAL = 2;
const RE_MOLD_MES = /^MOLD-(\d{4})-(\d{2})$/;
function trimestreDe(mes) {
  const m = /^(\d{4})-(\d{2})/.exec(mes || "");
  if (!m) throw new Error(`m\xEAs '${mes}' fora do formato AAAA-MM`);
  return `${m[1]}-Q${Math.floor((Number(m[2]) - 1) / 3) + 1}`;
}
const idSazonal = (trimestre) => `PAC-SAZ-${trimestre}`;
const eSazonal = (id) => /^PAC-SAZ-\d{4}-Q[1-4]$/.test(id || "");
function pracasPorTrimestre(itens = []) {
  const r = {};
  for (const id of itens) {
    const m = RE_MOLD_MES.exec(id);
    if (m) {
      const q = trimestreDe(`${m[1]}-${m[2]}`);
      r[q] = (r[q] || 0) + 1;
    }
  }
  return r;
}
function progressoSazonal(itens, trimestre) {
  return { feito: Math.min(PRACAS_PARA_SAZONAL, pracasPorTrimestre(itens)[trimestre] || 0), alvo: PRACAS_PARA_SAZONAL };
}
function concederSazonais(doc, temDados = () => true) {
  const inv = doc.inventario || (doc.inventario = { pistas: 0, itens: [] });
  const itens = inv.itens || (inv.itens = []);
  const eventos = [];
  for (const [q, n] of Object.entries(pracasPorTrimestre(itens))) {
    const id = idSazonal(q);
    if (n >= PRACAS_PARA_SAZONAL && !itens.includes(id) && temDados(q)) {
      itens.push(id);
      eventos.push(["item:obtido", { id, via: "praca" }]);
    }
  }
  return { mudou: eventos.length > 0, eventos };
}
const trimestreDoPacote = (id) => eSazonal(id) ? id.slice(8) : null;
const estacaoDe = (trimestre) => Number(String(trimestre).slice(-1));
function trimestresVisiveis(hoje, comDados, primeiro) {
  const atual = trimestreDe(String(hoje).slice(0, 7));
  return [...new Set(comDados)].filter((q) => q >= primeiro && q <= atual).sort();
}
function pacotesVisiveis(hoje, comDados, primeiro, itens = []) {
  const ids = new Set(trimestresVisiveis(hoje, comDados, primeiro).map(idSazonal));
  for (const id of itens) if (eSazonal(id) && [...comDados].includes(trimestreDoPacote(id))) ids.add(id);
  return [...ids].sort();
}
function textoSazonal(t, id, campo = "nome") {
  const q = trimestreDoPacote(id);
  return q ? t(`artigo.PAC-SAZ-AAAA-Q.${campo}`, { estacao: t(`colecao.estacao.q${estacaoDe(q)}`), ano: q.slice(0, 4) }) : null;
}
export {
  PRACAS_PARA_SAZONAL,
  concederSazonais,
  eSazonal,
  estacaoDe,
  idSazonal,
  pacotesVisiveis,
  pracasPorTrimestre,
  progressoSazonal,
  textoSazonal,
  trimestreDe,
  trimestreDoPacote,
  trimestresVisiveis
};
