const CENARIOS = Object.freeze(["ok", "cancela", "pendente", "erro", "sem-rede"]);
const CHAVE_STUB = "seixo.stub.loja";
const ATRASO_OMISSAO_MS = 400;
const playIdDe = (id) => "seixo_" + String(id).toLowerCase().replace(/-/g, "_");
function precoTexto(eur) {
  return typeof eur === "number" && Number.isFinite(eur) ? eur.toFixed(2).replace(".", ",") + "\xA0\u20AC" : null;
}
function armazemMemoria() {
  const m = /* @__PURE__ */ new Map();
  return { getItem: (k) => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) };
}
function armazemOmissao() {
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch {
  }
  return armazemMemoria();
}
function criarStub(opcoes = {}) {
  let cenario = CENARIOS.includes(opcoes.cenario) ? opcoes.cenario : "ok";
  const atraso = Number.isFinite(opcoes.atraso) && opcoes.atraso >= 0 ? opcoes.atraso : ATRASO_OMISSAO_MS;
  const armazem = opcoes.armazem || armazemOmissao();
  const ouvintes = [];
  let produtos = /* @__PURE__ */ new Map();
  let matar = false;
  function carregar() {
    try {
      const d = JSON.parse(armazem.getItem(CHAVE_STUB));
      if (d && Array.isArray(d.compras) && Number.isInteger(d.seq)) return d;
    } catch {
    }
    return { seq: 0, compras: [] };
  }
  let loja = carregar();
  function guardar() {
    try {
      armazem.setItem(CHAVE_STUB, JSON.stringify(loja));
    } catch {
    }
  }
  const novoOrderId = () => `STUB.${String(++loja.seq).padStart(4, "0")}`;
  let mudou = false;
  for (const c of loja.compras) if (c.estado === "pendente") {
    c.estado = "comprada";
    mudou = true;
  }
  for (const id of opcoes.possui || []) {
    const playId = playIdDe(id);
    if (!loja.compras.some((c) => c.playId === playId)) {
      loja.compras.push({ playId, estado: "comprada", orderId: novoOrderId(), reconhecida: true });
      mudou = true;
    }
  }
  if (mudou) guardar();
  const esperar = () => atraso > 0 ? new Promise((r) => setTimeout(r, atraso)) : Promise.resolve();
  const copia = (c) => ({ playId: c.playId, estado: c.estado, orderId: c.orderId, reconhecida: c.reconhecida });
  const stub = {
    tipo: "stub",
    async ligar(produtosPlay = []) {
      produtos = new Map(produtosPlay.map((p) => [p.playId, p]));
      await esperar();
      if (cenario === "sem-rede") return { disponivel: false, motivo: "sem-rede", precos: {} };
      const precos = {};
      for (const p of produtos.values()) precos[p.playId] = precoTexto(p.eur);
      return { disponivel: true, motivo: "ok", precos };
    },
    async comprasConhecidas() {
      await esperar();
      if (cenario === "sem-rede") throw { codigo: "sem_rede" };
      return loja.compras.filter((c) => c.estado === "comprada" || c.estado === "pendente").map(copia);
    },
    async encomendar(playId) {
      await esperar();
      if (cenario === "sem-rede") throw { codigo: "sem_rede" };
      if (!produtos.has(playId)) throw { codigo: "produto_desconhecido" };
      if (cenario === "erro") throw { codigo: "desconhecido" };
      if (cenario === "cancela") return { estado: "cancelada", orderId: null };
      const existente = loja.compras.find((c2) => c2.playId === playId);
      if (existente && existente.estado === "comprada") return { estado: "comprada", orderId: existente.orderId };
      if (existente) return { estado: "pendente", orderId: existente.orderId };
      const c = { playId, estado: cenario === "pendente" ? "pendente" : "comprada", orderId: novoOrderId(), reconhecida: false };
      loja.compras.push(c);
      guardar();
      return { estado: c.estado, orderId: c.orderId };
    },
    async reconhecer(orderId) {
      if (matar) {
        matar = false;
        return;
      }
      const c = loja.compras.find((x) => x.orderId === orderId);
      if (c && c.estado === "comprada" && !c.reconhecida) {
        c.reconhecida = true;
        guardar();
      }
    },
    aoMudar(fn) {
      ouvintes.push(fn);
      return () => {
        const k = ouvintes.indexOf(fn);
        if (k >= 0) ouvintes.splice(k, 1);
      };
    },
    // ---- controlo de depuração ----
    cenario(nome) {
      if (nome === void 0) return cenario;
      if (!CENARIOS.includes(nome)) throw new Error(`cen\xE1rio desconhecido: ${nome}`);
      cenario = nome;
      return cenario;
    },
    concluirPendentes() {
      const mudadas = loja.compras.filter((c) => c.estado === "pendente");
      for (const c of mudadas) c.estado = "comprada";
      if (mudadas.length) guardar();
      for (const c of mudadas) for (const fn of [...ouvintes]) {
        try {
          fn({ playId: c.playId, estado: "comprada", orderId: c.orderId });
        } catch (e) {
          console.warn("[compras-stub] ouvinte falhou:", e);
        }
      }
      return mudadas.length;
    },
    reembolsar(id) {
      const playId = playIdDe(id);
      const antes = loja.compras.length;
      loja.compras = loja.compras.filter((c) => c.playId !== playId);
      guardar();
      return antes !== loja.compras.length;
    },
    matarAntesDeReconhecer(sim = true) {
      matar = !!sim;
    },
    limpar() {
      loja = { seq: loja.seq, compras: [] };
      guardar();
    },
    estadoLoja() {
      return loja.compras.map(copia);
    }
    // para os testes e para o QA
  };
  return stub;
}
let omissao = null;
const inst = () => omissao || (omissao = criarStub());
const ligar = (p) => inst().ligar(p);
const comprasConhecidas = () => inst().comprasConhecidas();
const encomendar = (playId) => inst().encomendar(playId);
const reconhecer = (orderId) => inst().reconhecer(orderId);
const aoMudar = (fn) => inst().aoMudar(fn);
export {
  ATRASO_OMISSAO_MS,
  CENARIOS,
  CHAVE_STUB,
  aoMudar,
  armazemMemoria,
  comprasConhecidas,
  criarStub,
  encomendar,
  ligar,
  playIdDe,
  precoTexto,
  reconhecer
};
