import { emitir as emitirGlobal } from "../eventos.js";
import { criarStub } from "./compras-stub.js";
const RESULTADOS = Object.freeze(["concluida", "pendente", "cancelada", "erro", "ja_tem", "em_curso"]);
const ERROS = Object.freeze(["sem_rede", "loja_indisponivel", "produto_desconhecido", "gravacao", "desconhecido"]);
function isoAgora(d = /* @__PURE__ */ new Date()) {
  const p = (x) => String(Math.abs(x)).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${off >= 0 ? "+" : "-"}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
}
function escolherImplementacao(search = ((_a) => (_a = globalThis.location) == null ? void 0 : _a.search)() || "", nativo = false) {
  const loja = new URLSearchParams(search).get("loja");
  if (loja === "stub") return "stub";
  return nativo ? "play" : "indisponivel";
}
function opcoesDoUrl(search = ((_b) => (_b = globalThis.location) == null ? void 0 : _b.search)() || "") {
  const q = new URLSearchParams(search);
  return {
    cenario: q.get("cenario") || "ok",
    possui: (q.get("possui") || "").split(",").map((s) => s.trim()).filter(Boolean),
    atraso: q.has("atraso") ? Number(q.get("atraso")) : void 0
  };
}
function criarIndisponivel() {
  const falha = () => {
    throw { codigo: "loja_indisponivel" };
  };
  return {
    tipo: "indisponivel",
    async ligar() {
      return { disponivel: false, motivo: "erro", precos: {} };
    },
    async comprasConhecidas() {
      falha();
    },
    async encomendar() {
      falha();
    },
    async reconhecer() {
    },
    aoMudar() {
      return () => {
      };
    }
  };
}
async function implementacaoPorOmissao() {
  var _a, _b, _c;
  let nativo = false;
  try {
    nativo = !!((_b = (_a = globalThis.Capacitor) == null ? void 0 : _a.isNativePlatform) == null ? void 0 : _b.call(_a));
  } catch {
    nativo = false;
  }
  const search = ((_c = globalThis.location) == null ? void 0 : _c.search) || "";
  const tipo = escolherImplementacao(search, nativo);
  if (tipo === "stub") return criarStub(opcoesDoUrl(search));
  if (tipo === "indisponivel") return criarIndisponivel();
  try {
    const caminho = "./compras-play.js";
    const mod = await import(
      /* @vite-ignore */
      caminho
    );
    return mod;
  } catch (e) {
    console.warn("[compras] compras-play.js indispon\xEDvel; loja em \u20AC indispon\xEDvel:", e);
    return criarIndisponivel();
  }
}
function criarCompras(opcoes = {}) {
  const emitir = opcoes.emitir || emitirGlobal;
  const relogio = opcoes.relogio || (() => /* @__PURE__ */ new Date());
  let impl = opcoes.impl || null;
  let promessaIniciar = null;
  let iniciado = false;
  let disponivel = false;
  let motivo = "a_iniciar";
  let gravarDireitos = async () => {
  };
  let temItemLocal = () => false;
  let creditarLascas = async () => {
    throw new Error("creditarLascas n\xE3o ligado");
  };
  const porId = /* @__PURE__ */ new Map();
  const porPlayId = /* @__PURE__ */ new Map();
  let precos = {};
  let direitosAtuais = /* @__PURE__ */ new Set();
  const emCurso = /* @__PURE__ */ new Map();
  let promessaRestauro = null;
  let porGravar = false;
  const ordenados = () => [...direitosAtuais].sort();
  async function gravar() {
    try {
      await gravarDireitos(ordenados(), isoAgora(relogio()));
      porGravar = false;
    } catch (e) {
      porGravar = true;
      throw e;
    }
  }
  async function reconhecer(orderId) {
    try {
      await impl.reconhecer(orderId);
    } catch (e) {
      console.warn("[compras] reconhecer falhou (repete-se no arranque):", e);
    }
  }
  async function reconstruir(conhecidas, origem) {
    const deLascas = conhecidas.filter((c) => c && c.estado === "comprada" && porPlayId.has(c.playId) && porId.get(porPlayId.get(c.playId)).consumivel);
    if (origem === "arranque") {
      for (const c of deLascas) {
        const id = porPlayId.get(c.playId);
        const erro = await creditarEConsumir(id, c.orderId);
        emitir("compras:compra", { id, fase: erro ? "erro" : "concluida", erro });
      }
    }
    conhecidas = conhecidas.filter((c) => !deLascas.includes(c));
    const compradas = conhecidas.filter((c) => c && c.estado === "comprada" && porPlayId.has(c.playId));
    const novoConjunto = new Set(compradas.map((c) => porPlayId.get(c.playId)));
    const novos = [...novoConjunto].filter((id) => !direitosAtuais.has(id)).sort();
    const removidos = [...direitosAtuais].filter((id) => !novoConjunto.has(id)).sort();
    const porReconhecer = new Set(compradas.filter((c) => !c.reconhecida).map((c) => porPlayId.get(c.playId)));
    const deCompra = novos.filter((id) => porReconhecer.has(id));
    const restaurados = novos.filter((id) => !porReconhecer.has(id));
    const mudou = novos.length > 0 || removidos.length > 0;
    let gravou = true;
    if (mudou || porGravar) {
      direitosAtuais = novoConjunto;
      try {
        await gravar();
      } catch (e) {
        gravou = false;
        console.warn("[compras] gravarDireitos falhou:", e);
      }
    }
    if (gravou) {
      for (const c of compradas) if (!c.reconhecida) await reconhecer(c.orderId);
    }
    if (restaurados.length > 0 || removidos.length > 0) {
      emitir("compras:direitos", { direitos: ordenados().filter((id) => !deCompra.includes(id)), origem });
      for (const id of removidos) emitir("item:perdido", { id, motivo: "reembolso" });
      for (const id of restaurados) emitir("item:obtido", { id, via: "restaurar" });
    }
    if (deCompra.length > 0 && gravou) {
      emitir("compras:direitos", { direitos: ordenados(), origem: "pendente" });
      for (const id of deCompra) {
        emitir("item:obtido", { id, via: "compra" });
        emitir("compras:compra", { id, fase: "concluida", erro: null });
      }
    } else if (deCompra.length > 0) {
      for (const id of deCompra) emitir("compras:compra", { id, fase: "erro", erro: "gravacao" });
    }
    return { novos, removidos };
  }
  async function conceder(id, orderId, origem) {
    const jaTinha = direitosAtuais.has(id);
    if (jaTinha && !porGravar) {
      await reconhecer(orderId);
      return null;
    }
    direitosAtuais.add(id);
    try {
      await gravar();
    } catch (e) {
      console.warn("[compras] gravarDireitos falhou; a compra fica por reconhecer (C3):", e);
      return "gravacao";
    }
    await reconhecer(orderId);
    if (jaTinha) return null;
    emitir("compras:direitos", { direitos: ordenados(), origem });
    emitir("item:obtido", { id, via: "compra" });
    return null;
  }
  async function aoMudarLoja({ playId, estado, orderId }) {
    const id = porPlayId.get(playId);
    if (!id || estado !== "comprada") return;
    if (porId.get(id).consumivel) {
      const erro2 = await creditarEConsumir(id, orderId);
      emitir("compras:compra", { id, fase: erro2 ? "erro" : "concluida", erro: erro2 });
      return;
    }
    const jaTinha = direitosAtuais.has(id);
    const erro = await conceder(id, orderId, "pendente");
    if (!jaTinha) emitir("compras:compra", { id, fase: erro ? "erro" : "concluida", erro });
  }
  async function creditarEConsumir(id, orderId) {
    const p = porId.get(id);
    try {
      await creditarLascas({ orderId, qtd: p.qtd });
    } catch (e) {
      console.warn("[compras] cr\xE9dito de lascas falhou; fica por consumir:", e);
      return "gravacao";
    }
    await reconhecer(orderId);
    return null;
  }
  async function iniciarInterno({ catalogo = [], cache = {}, gravarDireitos: gd, temItem, creditarLascas: cl } = {}) {
    if (typeof gd === "function") gravarDireitos = gd;
    if (typeof cl === "function") creditarLascas = cl;
    if (typeof temItem === "function") temItemLocal = temItem;
    for (const e of catalogo) {
      if (!e || !e.id || !e.play_id) continue;
      if (e.consumivel && e.kind !== "lascas") {
        console.warn(`[compras] ${e.id} \xE9 consum\xEDvel com play_id: recusado (s\xF3 pacotes de lascas s\xE3o consum\xEDveis)`);
        continue;
      }
      porId.set(e.id, { id: e.id, playId: e.play_id, eur: e.eur, consumivel: e.kind === "lascas", qtd: e.kind === "lascas" ? e.lascas : 0 });
      porPlayId.set(e.play_id, e.id);
    }
    direitosAtuais = new Set(Array.isArray(cache.direitos) ? cache.direitos.filter((x) => typeof x === "string") : []);
    emitir("compras:estado", { disponivel: false, motivo: "a_iniciar" });
    emitir("compras:direitos", { direitos: ordenados(), origem: "cache" });
    if (!impl) impl = await implementacaoPorOmissao();
    try {
      const r = await impl.ligar([...porId.values()]);
      disponivel = !!r.disponivel;
      motivo = r.motivo || (disponivel ? "ok" : "erro");
      precos = disponivel ? { ...r.precos || {} } : {};
    } catch (e) {
      disponivel = false;
      motivo = e && e.codigo === "sem_rede" ? "sem-rede" : "erro";
      precos = {};
    }
    iniciado = true;
    emitir("compras:estado", { disponivel, motivo });
    emitir("compras:produtos", { produtos: produtos2().map(({ id, preco, disponivel: d }) => ({ id, preco, disponivel: d })) });
    try {
      impl.aoMudar((m) => {
        aoMudarLoja(m).catch((e) => console.warn("[compras] aoMudar falhou:", e));
      });
    } catch {
    }
    if (disponivel) {
      try {
        await reconstruir(await impl.comprasConhecidas(), "arranque");
      } catch (e) {
        disponivel = false;
        motivo = e && e.codigo === "sem_rede" ? "sem-rede" : "erro";
        emitir("compras:estado", { disponivel, motivo });
      }
    }
    return { disponivel, motivo };
  }
  function produtos2() {
    return [...porId.values()].map((p) => {
      const preco = disponivel && precos[p.playId] != null ? precos[p.playId] : null;
      return { id: p.id, playId: p.playId, preco, disponivel: preco !== null, consumivel: !!p.consumivel };
    });
  }
  async function comprarInterno(id) {
    const fim = (fase, resultado, erro2 = null) => {
      emitir("compras:compra", { id, fase, erro: erro2 });
      return { resultado, erro: erro2 };
    };
    emitir("compras:compra", { id, fase: "a_comprar", erro: null });
    const p = porId.get(id);
    if (!p) return fim("erro", "erro", "produto_desconhecido");
    if (!iniciado || !disponivel) return fim("erro", "erro", motivo === "sem-rede" ? "sem_rede" : "loja_indisponivel");
    let r;
    try {
      r = await impl.encomendar(p.playId);
    } catch (e) {
      const codigo = e && ERROS.includes(e.codigo) ? e.codigo : "desconhecido";
      return fim("erro", "erro", codigo);
    }
    if (r.estado === "cancelada") return fim("cancelada", "cancelada");
    if (r.estado === "pendente") return fim("pendente", "pendente");
    if (r.estado !== "comprada") return fim("erro", "erro", "desconhecido");
    const erro = p.consumivel ? await creditarEConsumir(id, r.orderId) : await conceder(id, r.orderId, "compra");
    return erro ? fim("erro", "erro", erro) : fim("concluida", "concluida");
  }
  return {
    // Chamar duas vezes devolve a mesma promessa.
    iniciar(args) {
      if (!promessaIniciar) promessaIniciar = iniciarInterno(args);
      return promessaIniciar;
    },
    produtos: produtos2,
    comprar(id) {
      var _a;
      if (emCurso.has(id)) return emCurso.get(id);
      if (!((_a = porId.get(id)) == null ? void 0 : _a.consumivel) && (direitosAtuais.has(id) || temItemLocal(id))) return Promise.resolve({ resultado: "ja_tem", erro: null });
      if (emCurso.size > 0) return Promise.resolve({ resultado: "em_curso", erro: null });
      const prom = comprarInterno(id).finally(() => emCurso.delete(id));
      emCurso.set(id, prom);
      return prom;
    },
    restaurar() {
      if (promessaRestauro) return promessaRestauro;
      promessaRestauro = (async () => {
        emitir("compras:restauro", { fase: "a_restaurar", novos: [], removidos: [] });
        if (!iniciado) {
          emitir("compras:restauro", { fase: "erro", novos: [], removidos: [] });
          return { resultado: "erro", novos: [], removidos: [] };
        }
        let conhecidas;
        try {
          conhecidas = await impl.comprasConhecidas();
        } catch (e) {
          const fase = e && e.codigo === "sem_rede" ? "sem-rede" : "erro";
          emitir("compras:restauro", { fase, novos: [], removidos: [] });
          return { resultado: fase, novos: [], removidos: [] };
        }
        const { novos, removidos } = await reconstruir(conhecidas, "restaurar");
        emitir("compras:restauro", { fase: "concluido", novos, removidos });
        return { resultado: "ok", novos, removidos };
      })().finally(() => {
        promessaRestauro = null;
      });
      return promessaRestauro;
    },
    direitos: () => ordenados(),
    temDireito: (id) => direitosAtuais.has(id),
    // SEIXO_DEBUG.loja (§7): só existe com o stub.
    debug() {
      if (!impl || impl.tipo !== "stub") return null;
      const s = impl;
      return {
        cenario: (n) => s.cenario(n),
        concluirPendentes: () => s.concluirPendentes(),
        reembolsar: (id) => s.reembolsar(id),
        matarAntesDeReconhecer: (sim = true) => s.matarAntesDeReconhecer(sim),
        limpar: () => s.limpar(),
        estado: () => s.estadoLoja()
      };
    }
  };
}
const app = criarCompras();
const iniciar = (args) => app.iniciar(args);
const produtos = () => app.produtos();
const comprar = (id) => app.comprar(id);
const restaurar = () => app.restaurar();
const direitos = () => app.direitos();
const temDireito = (id) => app.temDireito(id);
const debugLoja = () => app.debug();
export {
  ERROS,
  RESULTADOS,
  comprar,
  criarCompras,
  criarIndisponivel,
  debugLoja,
  direitos,
  escolherImplementacao,
  iniciar,
  opcoesDoUrl,
  produtos,
  restaurar,
  temDireito
};
