import { estadoInicial, isoLocal } from "../plataforma/gravacao.js";
const RE_ARQ = /^ARQ-(\d{4})-(\d{2})$/;
function mesDe(d = /* @__PURE__ */ new Date()) {
  return isoLocal(d).slice(0, 7);
}
function criarEstado(opcoes = {}) {
  let doc = opcoes.documento || estadoInicial();
  const relogio = opcoes.relogio || (() => /* @__PURE__ */ new Date());
  let catalogo = opcoes.catalogo || [];
  let direitosLoja = opcoes.direitosLoja || null;
  function direitos() {
    var _a, _b;
    const cache = ((_b = (_a = doc.inventario) == null ? void 0 : _a.loja) == null ? void 0 : _b.direitos) || [];
    if (!direitosLoja) return cache;
    try {
      return [.../* @__PURE__ */ new Set([...cache, ...direitosLoja()])];
    } catch {
      return cache;
    }
  }
  function temItem2(id) {
    var _a;
    if (!id) return false;
    const itens = ((_a = doc.inventario) == null ? void 0 : _a.itens) || [];
    const dir = direitos();
    if (itens.includes(id) || dir.includes(id)) return true;
    const m = RE_ARQ.exec(id);
    if (m) {
      const mes = `${m[1]}-${m[2]}`;
      if (mes === mesDe(relogio())) return true;
      if (itens.includes("ARQ-TUDO") || dir.includes("ARQ-TUDO")) return true;
    }
    for (const kit of catalogo) {
      if (Array.isArray(kit.partes) && kit.partes.includes(id) && (itens.includes(kit.id) || dir.includes(kit.id))) return true;
    }
    return false;
  }
  return {
    documento: () => doc,
    substituir(novo) {
      doc = novo;
    },
    definirCatalogo(c) {
      catalogo = c || [];
    },
    definirDireitosLoja(fn) {
      direitosLoja = fn;
    },
    temItem: temItem2,
    relogio
  };
}
const estado = criarEstado();
const documento = () => estado.documento();
const temItem = (id) => estado.temItem(id);
export {
  criarEstado,
  documento,
  estado,
  mesDe,
  temItem
};
