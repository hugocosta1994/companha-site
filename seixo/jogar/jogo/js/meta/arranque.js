import { emitir as emitirGlobal, ouvir as ouvirGlobal } from "../eventos.js";
import { gravacao as gravacaoApp, ligarAosEventos } from "../plataforma/gravacao.js";
import * as comprasApp from "../plataforma/compras.js";
import { estado as estadoApp } from "./estado.js";
import { loja as lojaApp } from "./loja.js";
import { extensaoDebug } from "../jogo/depuracao.js";
import { ligarDiario } from "./diario.js";
import { ligarPistas } from "./pistas.js";
import { ligarPracas } from "./pacotes.js";
import { ligarOficio } from "./oficio.js";
import { ligarCaminho } from "./caminho.js";
import { configurarDificuldades } from "../nucleo/oficio.js";
import { dataLocal } from "../nucleo/dia.js";
const BASE = Object.freeze({ pedra: "PEDRA-BASALTO", paleta: "PAL-LISBOA", moldura: null, som: "SOM-PEDRA" });
async function lerCatalogo(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const c = await r.json();
    return Array.isArray(c) ? c : [];
  } catch (e) {
    console.warn("[meta] cat\xE1logo indispon\xEDvel; loja vazia:", e);
    return [];
  }
}
async function iniciarMeta(opcoes = {}) {
  const grav = opcoes.gravacao || gravacaoApp();
  const compras = opcoes.compras || comprasApp;
  const est = opcoes.estado || estadoApp;
  const loja = opcoes.loja || lojaApp;
  const ouvir = opcoes.ouvir || ouvirGlobal;
  const emitir = opcoes.emitir || emitirGlobal;
  const catalogo = opcoes.catalogo || await lerCatalogo(opcoes.urlCatalogo || "data/catalogo.json");
  const puzzlePorId = opcoes.puzzlePorId || (() => null);
  configurarDificuldades((id) => {
    const p = puzzlePorId(id);
    return p ? p.dificuldade : null;
  });
  const { dados, aviso, textoAviso } = await grav.ler();
  est.substituir(dados);
  est.definirCatalogo(catalogo);
  loja.definirCatalogo(catalogo);
  est.definirDireitosLoja(() => compras.direitos());
  ligarAosEventos(grav, ouvir, est.documento);
  const relogio = opcoes.relogio || est.relogio || (() => /* @__PURE__ */ new Date());
  try {
    ligarPracas({ documento: est.documento, gravarJa: (doc) => grav.gravarJa(doc), ouvir, emitir, hoje: () => dataLocal(relogio()) });
  } catch (e) {
    console.warn("[meta] pra\xE7as n\xE3o ligaram:", e);
  }
  try {
    ligarOficio({ documento: est.documento, gravarJa: (doc) => grav.gravarJa(doc), ouvir, emitir, hoje: () => dataLocal(relogio()), puzzlePorId, catalogoObjetivos: opcoes.catalogoObjetivos });
  } catch (e) {
    console.warn("[meta] of\xEDcio n\xE3o ligou:", e);
  }
  let diario = null;
  try {
    diario = ligarDiario({
      documento: est.documento,
      gravarJa: (doc) => grav.gravarJa(doc),
      ouvir,
      emitir,
      relogio: opcoes.relogio || est.relogio,
      jogoAtual: opcoes.jogoAtual,
      agendar: opcoes.agendar,
      cancelar: opcoes.cancelar
    });
  } catch (e) {
    console.warn("[meta] di\xE1rio n\xE3o ligou:", e);
  }
  try {
    ligarCaminho({ documento: est.documento, gravarJa: (doc) => grav.gravarJa(doc), ouvir, emitir, hoje: () => dataLocal(relogio()) });
  } catch (e) {
    console.warn("[meta] caminho n\xE3o ligou:", e);
  }
  ligarPistas({ documento: est.documento, gravarJa: (doc) => grav.gravarJa(doc), ouvir, emitir });
  ouvir((nome, d) => {
    var _a;
    if (nome !== "item:perdido") return;
    const eq = (_a = est.documento().inventario) == null ? void 0 : _a.equipado;
    if (!eq) return;
    for (const tipo of Object.keys(BASE)) {
      if (eq[tipo] === d.id) {
        eq[tipo] = BASE[tipo];
        grav.gravarJa(est.documento());
        emitir("item:equipado", { tipo, id: BASE[tipo] });
      }
    }
  });
  const gravarDireitos = async (direitos, atualizadoEm) => {
    const doc = est.documento();
    doc.inventario.loja = { ...doc.inventario.loja, direitos: [...direitos], atualizadoEm };
    const ok = await grav.escrever(doc);
    if (!ok) throw new Error("grava\xE7\xE3o dos direitos falhou");
  };
  const promCompras = Promise.resolve().then(() => compras.iniciar({ catalogo, cache: est.documento().inventario.loja, gravarDireitos, temItem: (id) => est.temItem(id) })).catch((e) => {
    console.warn("[meta] compras n\xE3o iniciaram:", e);
    return { disponivel: false, motivo: "erro" };
  });
  extensaoDebug("gravacao", () => structuredClone(est.documento()));
  promCompras.then(() => {
    const dbg = compras.debugLoja ? compras.debugLoja() : null;
    extensaoDebug("loja", {
      ...dbg || {},
      trocar: (id) => loja.trocar(id),
      comprar: (id) => compras.comprar(id),
      restaurar: () => compras.restaurar(),
      direitos: () => compras.direitos()
    });
  });
  return { aviso, textoAviso, compras: promCompras, diario };
}
export {
  iniciarMeta
};
