import { CONFIG } from "../config.js";
import { estadoDaPraca, aoResolver, quadradoDe, eResolvido, QUADRADOS_PACOTE, COLUNAS_PACOTE } from "../nucleo/praca.js";
const PACOTES = Object.freeze([
  Object.freeze({ id: "PAC-ROSSIO", motivo: "onda" }),
  // 04-narrativa.md §3
  Object.freeze({ id: "PAC-CHIADO", motivo: "xadrez" }),
  Object.freeze({ id: "PAC-RIBEIRA", motivo: "barco" }),
  // T-1255 (GDD §11.4): pacotes da v2, por nível do ofício (catálogo `via_nivel`) ou compra. Motivos definitivos (T-1266, Arte: arte/padroes).
  Object.freeze({ id: "PAC-RIA", motivo: "moliceiro", viaNivel: 2 }),
  Object.freeze({ id: "PAC-MOSTEIRO", motivo: "arco", viaNivel: 4 }),
  Object.freeze({ id: "PAC-AZULEJO-CALCADA", motivo: "azulejo", viaNivel: 5 })
]);
const COLUNAS_LARGO = COLUNAS_PACOTE;
function pacoteDoId(id) {
  const q = quadradoDe(id);
  return q && /^PAC-/.test(q.praca) ? { pacote: q.praca, indice: q.quadrado } : null;
}
const idCurado = (pacote, indice) => `${pacote}-${String(indice).padStart(2, "0")}`;
const MOTIVOS_MES = Object.freeze([
  null,
  "estrela",
  "peixe",
  "andorinha",
  "cravo",
  "flor",
  "sardinha",
  "sol",
  "gaivota",
  "uvas",
  "ancora",
  "rosa_dos_ventos",
  "caravela"
]);
const motivoDoMes = (mes) => MOTIVOS_MES[Number(String(mes).slice(5, 7))] || null;
function mesVizinho(mes, delta) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function estadoDoMes(doc, mes, hoje, opcoes = {}) {
  const temItem = opcoes.temItem || (() => false);
  const solucaoDe = opcoes.solucaoDe || (() => null);
  const pr = estadoDaPraca(doc, mes, hoje);
  return {
    ...pr,
    motivo: motivoDoMes(mes),
    desbloqueado: !!temItem(`ARQ-${mes}`),
    quadrados: pr.quadrados.map((q) => {
      const r = q.estado === "resolvido";
      const p = r ? solucaoDe(q.id) : null;
      return {
        indice: q.quadrado,
        id: q.id,
        data: `${mes}-${String(q.quadrado).padStart(2, "0")}`,
        praca: q.estado,
        estado: q.registo && q.registo.estado ? q.registo.estado : "por_jogar",
        resolvido: r,
        n: p ? p.n : null,
        solucao: p ? p.solucao : null
      };
    })
  };
}
function precoDoPacote(catalogo, pacote) {
  var _a, _b;
  const a = (catalogo || []).find((e) => e.id === pacote);
  return a ? { lascas: (_a = a.lascas) != null ? _a : null, eur: (_b = a.eur) != null ? _b : null, gratis: !!a.gratis } : { lascas: null, eur: null, gratis: false };
}
function estadoDoPacote(doc, pacote, opcoes = {}) {
  const temItem = opcoes.temItem || (() => false);
  const puzzles = opcoes.puzzles || {};
  const def = PACOTES.find((p) => p.id === pacote) || { id: pacote, motivo: null };
  const preco = precoDoPacote(opcoes.catalogo, pacote);
  const gratis = preco.gratis || pacote === "PAC-ROSSIO";
  const pr = estadoDaPraca(doc, pacote);
  const quadrados = pr.quadrados.map((q) => {
    const p = puzzles[q.id];
    const r = q.estado === "resolvido";
    return {
      indice: q.quadrado,
      id: q.id,
      estado: q.registo && q.registo.estado ? q.registo.estado : "por_jogar",
      praca: q.estado,
      resolvido: r,
      n: p ? p.n : null,
      solucao: r && p ? p.solucao : null
    };
  });
  return {
    id: pacote,
    motivo: def.motivo,
    gratis,
    desbloqueado: gratis || !!temItem(pacote),
    preco,
    feitos: pr.feitos,
    total: pr.total,
    completa: pr.completa,
    acesa: pr.acesa,
    completaEm: pr.completaEm,
    colunas: pr.colunas,
    filas: pr.filas,
    quadrados
  };
}
function aoResolverPraca(doc, id, hoje, jaResolvido, lascasPraca = ((_a) => (_a = CONFIG.LASCAS_PRACA) != null ? _a : 50)()) {
  return aoResolver(doc, id, hoje, { jaResolvido, lascasPraca });
}
const aoResolverCurado = (doc, id, hoje, jaResolvido) => pacoteDoId(id) ? aoResolverPraca(doc, id, hoje, jaResolvido) : { mudou: false, eventos: [] };
function ligarPracas({ documento, gravarJa, ouvir, emitir, hoje, lascasPraca }) {
  return ouvir((nome, d) => {
    if (nome !== "puzzle:resolvido" || !d || !quadradoDe(d.id)) return;
    const doc0 = documento();
    const ja = eResolvido(doc0.puzzles && doc0.puzzles[d.id]);
    queueMicrotask(() => {
      const doc = documento();
      const r = aoResolverPraca(doc, d.id, hoje(), ja, lascasPraca);
      if (r.mudou) {
        try {
          gravarJa(doc);
        } catch (e) {
          console.warn("[pracas] gravar falhou:", e);
        }
      }
      for (const [n, dados] of r.eventos) emitir(n, dados);
    });
  });
}
const ligarPacotes = ligarPracas;
export {
  COLUNAS_LARGO,
  MOTIVOS_MES,
  PACOTES,
  QUADRADOS_PACOTE,
  aoResolverCurado,
  aoResolverPraca,
  estadoDoMes,
  estadoDoPacote,
  idCurado,
  ligarPacotes,
  ligarPracas,
  mesVizinho,
  motivoDoMes,
  pacoteDoId,
  precoDoPacote
};
