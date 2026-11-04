const PRODUTOS = Object.freeze([
  { playId: "moinho_pack_azulejo", temas: ["ceramica"], eur: "1,99 \u20AC" },
  { playId: "moinho_pack_lareira", temas: ["lareira"], eur: "1,99 \u20AC" },
  { playId: "moinho_apoio", temas: ["granito"], eur: "2,99 \u20AC" },
  { playId: "moinho_tudo", temas: ["ceramica", "lareira", "granito"], eur: "4,99 \u20AC" }
]);
const playIdDoTema = (tema) => {
  var _a;
  return ((_a = PRODUTOS.find((p) => p.temas.includes(tema) && p.playId !== "moinho_tudo")) == null ? void 0 : _a.playId) || null;
};
const sku_ofertavel = (playId, tem = () => false) => {
  const t = temasDe(playId);
  return t.length > 0 && t.every((x) => !tem(x));
};
const temasDe = (playId) => {
  var _a;
  return ((_a = PRODUTOS.find((p) => p.playId === playId)) == null ? void 0 : _a.temas) || [];
};
function criarStub(cenario = "ok") {
  const possui = /* @__PURE__ */ new Set();
  const ouvintes = [];
  return {
    tipo: "stub",
    async ligar() {
      return { disponivel: cenario !== "sem-rede", motivo: cenario === "sem-rede" ? "sem-rede" : "ok", precos: Object.fromEntries(PRODUTOS.map((p) => [p.playId, p.eur])) };
    },
    async comprasConhecidas() {
      return [...possui].map((playId) => ({ playId, estado: "comprada", orderId: "STUB." + playId, reconhecida: true }));
    },
    async encomendar(playId) {
      if (cenario === "cancela") return { estado: "cancelada", orderId: null };
      if (cenario === "erro") throw { codigo: "desconhecido" };
      possui.add(playId);
      return { estado: "comprada", orderId: "STUB." + playId };
    },
    async reconhecer() {
    },
    aoMudar(fn) {
      ouvintes.push(fn);
      return () => {
      };
    }
  };
}
function criarIndisponivel() {
  const falha = () => {
    throw { codigo: "loja_indisponivel" };
  };
  return { tipo: "indisponivel", async ligar() {
    return { disponivel: false, motivo: "erro", precos: {} };
  }, comprasConhecidas: falha, encomendar: falha, async reconhecer() {
  }, aoMudar() {
    return () => {
    };
  } };
}
async function porOmissao() {
  var _a, _b, _c;
  const search = ((_a = globalThis.location) == null ? void 0 : _a.search) || "";
  const q = new URLSearchParams(search);
  if (q.get("loja") === "stub") return criarStub(q.get("cenario") || "ok");
  let nativo = false;
  try {
    nativo = !!((_c = (_b = globalThis.Capacitor) == null ? void 0 : _b.isNativePlatform) == null ? void 0 : _c.call(_b));
  } catch {
  }
  if (!nativo) return criarIndisponivel();
  try {
    const caminho = "./compras-play.js";
    return await import(
      /* @vite-ignore */
      caminho
    );
  } catch (e) {
    console.warn("[compras] Play indispon\xEDvel:", e);
    return criarIndisponivel();
  }
}
function criarCompras({ impl = null, dar = () => {
}, tem = () => false } = {}) {
  let i = impl, estado = null, precos = {};
  const obter = async () => i || (i = await porOmissao());
  async function ligar() {
    if (estado == null ? void 0 : estado.disponivel) return estado;
    const m = await obter();
    estado = await m.ligar(PRODUTOS.map((p) => ({ playId: p.playId })));
    precos = estado.precos || {};
    return estado;
  }
  async function aplicar(m, c) {
    if (c.estado !== "comprada") return false;
    for (const tema of temasDe(c.playId)) dar(tema);
    if (c.orderId && !c.reconhecida) await m.reconhecer(c.orderId);
    return true;
  }
  return {
    ligar,
    preco: (playId) => {
      var _a;
      return precos[playId] || ((_a = PRODUTOS.find((p) => p.playId === playId)) == null ? void 0 : _a.eur);
    },
    ofertavel: (playId) => sku_ofertavel(playId, tem),
    async comprar(playId) {
      if (!sku_ofertavel(playId, tem)) return { resultado: "erro", erro: "ja_possui" };
      try {
        const e = await ligar();
        if (!e.disponivel) return { resultado: "erro", erro: "loja_indisponivel" };
        const m = await obter();
        const r = await m.encomendar(playId);
        if (r.estado === "cancelada") return { resultado: "cancelada" };
        if (r.estado === "comprada") {
          await aplicar(m, { playId, ...r });
          return { resultado: "concluida" };
        }
        return { resultado: "pendente" };
      } catch (x) {
        return { resultado: "erro", erro: (x == null ? void 0 : x.codigo) || "desconhecido" };
      }
    },
    async restaurar() {
      try {
        const e = await ligar();
        if (!e.disponivel) return { resultado: "erro", n: 0 };
        const m = await obter();
        let n = 0;
        for (const c of await m.comprasConhecidas()) if (await aplicar(m, c)) n++;
        return { resultado: "ok", n };
      } catch {
        return { resultado: "erro", n: 0 };
      }
    }
  };
}
export {
  PRODUTOS,
  criarCompras,
  criarIndisponivel,
  criarStub,
  playIdDoTema,
  sku_ofertavel,
  temasDe
};
