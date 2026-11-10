const ESPERA_INICIAL_MS = 15e3;
const ESPERA_ENCOMENDA_MS = 10 * 60 * 1e3;
function criarPlay(cdv = globalThis.CdvPurchase) {
  const ouvintes = [];
  const pendentes = /* @__PURE__ */ new Map();
  const transacoes = /* @__PURE__ */ new Map();
  let loja = null;
  let plataforma = null;
  let ligada = null;
  let registada = false;
  const idDe = (t) => {
    var _a, _b;
    return t.transactionId || t.orderId || `${(_b = (_a = t.products) == null ? void 0 : _a[0]) == null ? void 0 : _b.id}:${t.purchaseDate || ""}`;
  };
  const playIdDe = (t) => {
    var _a, _b;
    return (_b = (_a = t.products) == null ? void 0 : _a[0]) == null ? void 0 : _b.id;
  };
  const avisar = (e) => {
    for (const fn of ouvintes) {
      try {
        fn(e);
      } catch (x) {
        console.warn("[compras-play] ouvinte falhou:", x);
      }
    }
  };
  function estadoDe(t) {
    const S = cdv.TransactionState;
    return t.state === S.APPROVED || t.state === S.FINISHED || t.state === S.OWNED ? "comprada" : "pendente";
  }
  function transacoesLocais() {
    const lista = [];
    for (const rec of loja.localReceipts || []) for (const t of rec.transactions || []) lista.push(t);
    return lista;
  }
  function codigoDe(erro) {
    const E = cdv.ErrorCode || {};
    const c = erro == null ? void 0 : erro.code;
    if (c === E.PAYMENT_CANCELLED) return "cancelada";
    if (c === E.NETWORK_ERROR || c === E.SERVICE_DISCONNECTED || c === E.SERVICE_UNAVAILABLE) return "sem_rede";
    if (c === E.PRODUCT_NOT_AVAILABLE || c === E.INVALID_PRODUCT_ID) return "produto_desconhecido";
    return "desconhecido";
  }
  function aprovada(t) {
    transacoes.set(idDe(t), t);
    const playId = playIdDe(t);
    const espera = pendentes.get(playId);
    if (espera) {
      pendentes.delete(playId);
      espera({ estado: "comprada", orderId: idDe(t) });
      return;
    }
    avisar({ playId, estado: "comprada", orderId: idDe(t) });
  }
  return {
    tipo: "play",
    async ligar(produtosPlay = []) {
      if (!(cdv == null ? void 0 : cdv.store)) return { disponivel: false, motivo: "erro", precos: {} };
      if (ligada) return ligada;
      ligada = (async () => {
        var _a, _b, _c, _d, _e, _f;
        try {
          loja = cdv.store;
          plataforma = cdv.Platform.GOOGLE_PLAY;
          if (!registada) {
            registada = true;
            loja.register(produtosPlay.map((p) => ({ id: p.playId, type: cdv.ProductType.NON_CONSUMABLE, platform: plataforma })));
            loja.when().approved(aprovada).finished((t) => transacoes.set(idDe(t), t));
          }
          const erros = await Promise.race([
            loja.initialize([plataforma]),
            new Promise((r2) => setTimeout(() => r2("tempo"), ESPERA_INICIAL_MS))
          ]);
          if (erros === "tempo") return { disponivel: false, motivo: "sem-rede", precos: {} };
          if (Array.isArray(erros) && erros.length) {
            const rede = erros.some((e) => codigoDe(e) === "sem_rede");
            return { disponivel: false, motivo: rede ? "sem-rede" : "erro", precos: {} };
          }
          const precos = {};
          for (const p of produtosPlay) {
            const prod = loja.get(p.playId, plataforma);
            const preco = (_f = (_d = (_c = (_b = (_a = prod == null ? void 0 : prod.offers) == null ? void 0 : _a[0]) == null ? void 0 : _b.pricingPhases) == null ? void 0 : _c[0]) == null ? void 0 : _d.price) != null ? _f : (_e = prod == null ? void 0 : prod.pricing) == null ? void 0 : _e.price;
            if (preco) precos[p.playId] = preco;
          }
          return { disponivel: true, motivo: "ok", precos };
        } catch (e) {
          console.warn("[compras-play] ligar falhou:", e);
          return { disponivel: false, motivo: "erro", precos: {} };
        }
      })();
      const corrente = ligada;
      const r = await corrente;
      if (!r.disponivel && ligada === corrente) ligada = null;
      return r;
    },
    async comprasConhecidas() {
      if (!loja) throw { codigo: "loja_indisponivel" };
      return transacoesLocais().map((t) => {
        transacoes.set(idDe(t), t);
        return { playId: playIdDe(t), estado: estadoDe(t), orderId: idDe(t), reconhecida: t.state === cdv.TransactionState.FINISHED };
      });
    },
    async encomendar(playId) {
      var _a, _b;
      if (!loja) throw { codigo: "loja_indisponivel" };
      const prod = loja.get(playId, plataforma);
      const oferta = ((_a = prod == null ? void 0 : prod.getOffer) == null ? void 0 : _a.call(prod)) || ((_b = prod == null ? void 0 : prod.offers) == null ? void 0 : _b[0]);
      if (!prod || !oferta) throw { codigo: "produto_desconhecido" };
      const resultado = new Promise((resolve) => {
        var _a2;
        pendentes.set(playId, resolve);
        const t = setTimeout(() => {
          if (pendentes.get(playId) === resolve) {
            pendentes.delete(playId);
            resolve({ estado: "pendente", orderId: null });
          }
        }, ESPERA_ENCOMENDA_MS);
        (_a2 = t.unref) == null ? void 0 : _a2.call(t);
      });
      const erro = await loja.order(oferta);
      if (erro) {
        pendentes.delete(playId);
        const c = codigoDe(erro);
        if (c === "cancelada") return { estado: "cancelada", orderId: null };
        throw { codigo: c };
      }
      return resultado;
    },
    async reconhecer(orderId) {
      const t = transacoes.get(orderId);
      if (!t || t.state === cdv.TransactionState.FINISHED) return;
      try {
        await t.finish();
      } catch (e) {
        console.warn("[compras-play] finish falhou (repete no pr\xF3ximo arranque):", e);
      }
    },
    aoMudar(fn) {
      ouvintes.push(fn);
      return () => {
        const i = ouvintes.indexOf(fn);
        if (i >= 0) ouvintes.splice(i, 1);
      };
    },
    // Restaurar: o plugin volta a perguntar à Play pelas compras da conta.
    async restaurarNaPlay() {
      if (loja) await loja.restorePurchases();
    }
  };
}
let instancia = null;
const inst = () => instancia || (instancia = criarPlay());
const tipo = "play";
const ligar = (p) => inst().ligar(p);
const comprasConhecidas = async () => {
  let confirmada = true;
  try {
    await inst().restaurarNaPlay();
  } catch {
    confirmada = false;
  }
  const l = await inst().comprasConhecidas();
  l.confirmada = confirmada;
  return l;
};
const encomendar = (id) => inst().encomendar(id);
const reconhecer = (id) => inst().reconhecer(id);
const aoMudar = (fn) => inst().aoMudar(fn);
export {
  aoMudar,
  comprasConhecidas,
  criarPlay,
  encomendar,
  ligar,
  reconhecer,
  tipo
};
