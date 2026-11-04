import { emitir as emitirGlobal } from "../eventos.js";
import { estado as estadoApp } from "./estado.js";
import { escrever as escreverGlobal } from "../plataforma/gravacao.js";
const RESULTADOS_TROCA = Object.freeze(["concluida", "ja_tem", "saldo_insuficiente", "nao_a_venda", "erro"]);
const RE_ARQ = /^ARQ-(\d{4})-(\d{2})$/;
function artigoDe(catalogo, id) {
  if (!id || !Array.isArray(catalogo)) return null;
  const direto = catalogo.find((e) => e.id === id);
  if (direto) return direto.modelo ? null : direto;
  if (RE_ARQ.test(id)) {
    const m = catalogo.find((e) => e.id === "ARQ-AAAA-MM");
    if (!m) return null;
    const { modelo, play_id_modelo, ...resto } = m;
    return { ...resto, id, eur: null, play_id: null };
  }
  return null;
}
function criarLoja(opcoes = {}) {
  let catalogo = opcoes.catalogo || [];
  const est = opcoes.estado || estadoApp;
  const escrever = opcoes.escrever || escreverGlobal;
  const emitir = opcoes.emitir || emitirGlobal;
  const emCurso = /* @__PURE__ */ new Map();
  let fila = Promise.resolve();
  async function trocarInterno(id) {
    var _a, _b;
    const art = artigoDe(catalogo, id);
    const reservado = art && art.reservado;
    if (!art || !Number.isInteger(art.lascas) || art.lascas <= 0 || art.gratis || reservado) {
      return { resultado: "nao_a_venda", faltam: 0 };
    }
    const consumivel = !!art.consumivel;
    if (!consumivel && est.temItem(id)) return { resultado: "ja_tem", faltam: 0 };
    const atual = est.documento();
    const saldo = (_b = (_a = atual.lascas) == null ? void 0 : _a.saldo) != null ? _b : 0;
    if (saldo < art.lascas) return { resultado: "saldo_insuficiente", faltam: art.lascas - saldo };
    const copia = structuredClone(atual);
    copia.lascas.saldo = saldo - art.lascas;
    const qtd = consumivel ? art.quantidade || 1 : 0;
    if (consumivel) copia.inventario.pistas = (copia.inventario.pistas || 0) + qtd;
    else copia.inventario.itens = [...copia.inventario.itens, id];
    let ok = false;
    try {
      ok = await escrever(copia);
    } catch (e) {
      console.warn("[loja] escrita da troca falhou:", e);
      ok = false;
    }
    if (!ok) return { resultado: "erro", faltam: 0 };
    est.substituir(copia);
    emitir("lascas:alteradas", { delta: -art.lascas, saldo: copia.lascas.saldo, motivo: "troca" });
    if (consumivel) emitir("pistas:alteradas", { delta: qtd, saldo: copia.inventario.pistas, motivo: "troca" });
    else emitir("item:obtido", { id, via: "lascas" });
    emitir("loja:troca", { id, lascas: art.lascas, saldo: copia.lascas.saldo });
    return { resultado: "concluida", faltam: 0 };
  }
  return {
    definirCatalogo(c) {
      catalogo = c || [];
    },
    artigo: (id) => artigoDe(catalogo, id),
    catalogo: () => catalogo,
    // → Promise<{ resultado: 'concluida'|'ja_tem'|'saldo_insuficiente'|'nao_a_venda'|'erro', faltam }>
    // ('erro' = a escrita falhou: sem débito nem eventos; compras.md 1.1 §6. Nunca rejeita.)
    trocar(id) {
      if (emCurso.has(id)) return emCurso.get(id);
      const p = fila.then(() => trocarInterno(id)).finally(() => emCurso.delete(id));
      fila = p.then(() => void 0, () => void 0);
      emCurso.set(id, p);
      return p;
    }
  };
}
const TIPO_COSMETICO = Object.freeze({ pedra: "pedra", paleta: "paleta", moldura: "moldura", som: "som" });
const RE_MOLD_MES = /^MOLD-\d{4}-\d{2}$/;
function tipoDe(catalogo, id) {
  if (RE_MOLD_MES.test(id || "")) return "moldura";
  const a = (catalogo || []).find((e) => e.id === id && !e.modelo);
  return a ? TIPO_COSMETICO[a.categoria] || null : null;
}
async function equipar(id, opcoes = {}) {
  var _a;
  const est = opcoes.estado || estadoApp;
  const escrever = opcoes.escrever || escreverGlobal;
  const emitir = opcoes.emitir || emitirGlobal;
  const tipo = opcoes.tipo || tipoDe(opcoes.catalogo || [], id);
  if (!tipo || id === null && tipo !== "moldura") return { ok: false, motivo: "nao_equipavel" };
  if (id !== null && !est.temItem(id)) return { ok: false, motivo: "nao_tem" };
  const atual = est.documento();
  if ((((_a = atual.inventario) == null ? void 0 : _a.equipado) || {})[tipo] === id) return { ok: false, motivo: "ja_equipado" };
  const copia = structuredClone(atual);
  copia.inventario.equipado = { ...copia.inventario.equipado, [tipo]: id };
  let ok = false;
  try {
    ok = await escrever(copia);
  } catch (e) {
    console.warn("[loja] escrita do equipar falhou:", e);
  }
  if (!ok) return { ok: false, motivo: "erro" };
  est.substituir(copia);
  emitir("item:equipado", { tipo, id });
  return { ok: true };
}
const loja = criarLoja();
const trocar = (id) => loja.trocar(id);
export {
  RESULTADOS_TROCA,
  TIPO_COSMETICO,
  artigoDe,
  criarLoja,
  equipar,
  loja,
  tipoDe,
  trocar
};
