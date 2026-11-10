const PALETAS = {
  "PAL-LISBOA": { preta: "#24282d", branca: "#fbf8f1", junta: "#6e655a" },
  "PAL-ALTO-CONTRASTE": { preta: "#000000", branca: "#ffffff", junta: "#000000" },
  "PAL-DALTONISMO": { preta: "#202327", branca: "#ffffff", junta: "#5e5850" },
  "PAL-ANIL": { preta: "#1b2a4a", branca: "#ffffff", junta: "#4e5d78" },
  "PAL-OCRE": { preta: "#33261c", branca: "#fff8ec", junta: "#6b5236" },
  "PAL-NOITE": { preta: "#0b0d11", branca: "#e8e4da", junta: "#9aa3ae" },
  // T-1701 (S3-07, ganhas a jogar): contraste preta/branca >= 12:1 (registado em catalogo.json).
  "PAL-ESTUARIO": { preta: "#14304d", branca: "#f2f7fa", junta: "#4d6a85" },
  "PAL-OLIVAL": { preta: "#2b3318", branca: "#f6f5e6", junta: "#5f6a3c" }
};
const PEDRAS = {
  "PEDRA-CALCARIO-ROSA": { branca: "#f3d9d2" },
  "PEDRA-MARMORE": { branca: "#fbfbf7" },
  "PEDRA-AZULEJO": { preta: "#1f4e8c" },
  "PEDRA-SEIXO-RIO": { preta: "#3b3f3a", branca: "#e6e1d3" },
  "PEDRA-XISTO": { preta: "#33414f", branca: "#e9edf0" },
  "PEDRA-CORTICA": { preta: "#3d2b1c", branca: "#e8d3b0", junta: "#5a4630" },
  // T-1762: junta própria, clara/junta 3,9 → 6,1:1
  "PEDRA-AREIA": { preta: "#2f3236", branca: "#efe2c4" }
};
const TONS_ESTACOES = Object.freeze([
  Object.freeze({ preta: "#2e4a66", branca: "#e6eef5" }),
  Object.freeze({ preta: "#3e5c2e", branca: "#eef2dc" }),
  Object.freeze({ preta: "#7a4512", branca: "#fcefcf" }),
  Object.freeze({ preta: "#6e2f1a", branca: "#f9e8dc" })
]);
const estacaoDoMes = (m) => Math.floor((m + 1) % 12 / 3);
function pedraDe(id, data = /* @__PURE__ */ new Date()) {
  if (id === "PEDRA-ESTACOES") return { ...TONS_ESTACOES[estacaoDoMes(data.getMonth())] };
  return PEDRAS[id] || null;
}
const MOLDURAS = {
  "MOLD-ONDAS": "4px double #2d2a26",
  "MOLD-CORDA": "4px dashed #6b5638",
  "MOLD-FLOR": "4px dotted #8b3a62",
  // T-1399: molduras de objetivo (arte/molduras): cento, trimestre, ano, pinhal.
  "MOLD-CENTO": "4px solid #8a6d3b",
  "MOLD-TRIMESTRE": "4px double #3f5a3a",
  "MOLD-ANO": "4px ridge #6b5638",
  "MOLD-PINHAL": "4px groove #3f5a3a"
};
const IMG_SELOS = { "SELO-100": "img/selos/selo-100.svg", "SELO-AMIGOS": "img/selos/selo-amigos.svg" };
const IMG_MOLDURAS = { "MOLD-CENTO": "img/molduras/mold-cento.svg", "MOLD-TRIMESTRE": "img/molduras/mold-trimestre.svg", "MOLD-ANO": "img/molduras/mold-ano.svg", "MOLD-PINHAL": "img/molduras/mold-pinhal.svg" };
const imagemCosmetico = (id) => IMG_SELOS[id] || IMG_MOLDURAS[id] || (/^SELO-[1-5]$/.test(id || "") ? `img/selos/nivel-${id.slice(5)}.svg` : null);
const imagemPacote = (id) => {
  const m = /^PAC-SAZ-\d{4}-Q([1-4])$/.exec(id || "");
  return m ? `img/pacotes/pac-saz-${m[1]}.svg` : null;
};
const LEGADO = { preta: "#24282d", branca: "#fbf8f1", junta: "#6e655a" };
const hex = (c) => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(c).trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
function misturar(a, b, k) {
  const x = hex(a), y = hex(b);
  if (!x || !y) return a;
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
let tokens = null;
function recarregarTokens() {
  tokens = null;
}
if (typeof matchMedia === "function") {
  try {
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", recarregarTokens);
  } catch {
  }
}
function lerTokens() {
  if (tokens) return tokens;
  if (typeof document === "undefined" || typeof getComputedStyle !== "function" || !document.documentElement) return null;
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  const t = {
    leito: v("--leito"),
    escura: v("--pedra-escura"),
    clara: v("--pedra-clara"),
    junta: v("--junta"),
    selecionado: v("--selecionado"),
    aviso: v("--aviso"),
    revelado: v("--revelado"),
    tinta: v("--tinta-suave")
  };
  if (!hex(t.leito) || !hex(t.escura) || !hex(t.clara) || !hex(t.junta)) return null;
  tokens = t;
  return t;
}
let cacheCores = null;
function coresTabuleiro(base, eq = equipado) {
  const t = lerTokens();
  if (!t) return base;
  const k = `${eq.pedra}|${eq.paleta}`;
  if (cacheCores && cacheCores.t === t && cacheCores.base === base && cacheCores.k === k) return cacheCores.C;
  const C = calcularCores(base, eq, t);
  cacheCores = { t, base, k, C };
  return C;
}
function calcularCores(base, eq, t) {
  const C = {
    ...base,
    argamassa: misturar(t.leito, t.junta, 0.22),
    casa: t.leito,
    preta: t.escura,
    pretaRelevo: misturar(t.escura, t.clara, 0.25),
    branca: t.clara,
    brancaContorno: t.junta,
    brancaRelevo: misturar(t.clara, t.escura, 0.15),
    junta: t.junta,
    juntaFundo: t.clara,
    eixo: t.tinta,
    guia: t.selecionado,
    revela: t.revelado
  };
  if (hex(t.aviso)) C.aviso = t.aviso;
  const { cores } = aspeto(eq);
  if (eq.paleta && eq.paleta !== "PAL-LISBOA") Object.assign(C, { preta: cores.preta, branca: cores.branca, junta: cores.junta, juntaFundo: cores.branca, brancaContorno: cores.junta });
  else if (eq.pedra && pedraDe(eq.pedra)) {
    const p = pedraDe(eq.pedra);
    if (p.preta) C.preta = cores.preta;
    if (p.branca) C.branca = cores.branca;
    if (p.junta) Object.assign(C, { junta: p.junta, brancaContorno: p.junta });
  }
  return C;
}
let equipado = { pedra: "PEDRA-BASALTO", paleta: "PAL-LISBOA", moldura: null };
function definirEquipado(eq) {
  equipado = { ...equipado, ...eq || {} };
}
function equipadoAtual() {
  return { ...equipado };
}
function aspeto(eq = equipado) {
  const t = !eq.paleta || eq.paleta === "PAL-LISBOA" ? lerTokens() : null;
  const base = t ? { preta: t.escura, branca: t.clara, junta: t.junta } : PALETAS[eq.paleta] || PALETAS["PAL-LISBOA"];
  const cores = { ...base, ...pedraDe(eq.pedra) || {} };
  let moldura = null;
  if (eq.moldura) moldura = MOLDURAS[eq.moldura] || "4px solid #8a6d3b";
  return { cores, moldura, molduraId: eq.moldura || null };
}
export {
  TONS_ESTACOES,
  aspeto,
  coresTabuleiro,
  definirEquipado,
  equipadoAtual,
  estacaoDoMes,
  imagemCosmetico,
  imagemPacote,
  lerTokens,
  misturar,
  pedraDe,
  recarregarTokens
};
