const PALETAS = {
  "PAL-LISBOA": { preta: "#24282d", branca: "#fbf8f1", junta: "#6e655a" },
  "PAL-ALTO-CONTRASTE": { preta: "#000000", branca: "#ffffff", junta: "#000000" },
  "PAL-DALTONISMO": { preta: "#202327", branca: "#ffffff", junta: "#5e5850" },
  "PAL-ANIL": { preta: "#1b2a4a", branca: "#ffffff", junta: "#4e5d78" },
  "PAL-OCRE": { preta: "#33261c", branca: "#fff8ec", junta: "#6b5236" },
  "PAL-NOITE": { preta: "#0b0d11", branca: "#e8e4da", junta: "#9aa3ae" }
};
const PEDRAS = {
  "PEDRA-CALCARIO-ROSA": { branca: "#f3d9d2" },
  "PEDRA-MARMORE": { branca: "#fbfbf7" },
  "PEDRA-AZULEJO": { preta: "#1f4e8c" },
  "PEDRA-SEIXO-RIO": { preta: "#3b3f3a", branca: "#e6e1d3" }
};
const MOLDURAS = {
  "MOLD-ONDAS": "4px double #2d2a26",
  "MOLD-CORDA": "4px dashed #6b5638",
  "MOLD-FLOR": "4px dotted #8b3a62"
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
function coresTabuleiro(base, eq = equipado) {
  const t = lerTokens();
  if (!t) return base;
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
  else if (eq.pedra && PEDRAS[eq.pedra]) {
    if (PEDRAS[eq.pedra].preta) C.preta = cores.preta;
    if (PEDRAS[eq.pedra].branca) C.branca = cores.branca;
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
  const cores = { ...base, ...PEDRAS[eq.pedra] || {} };
  let moldura = null;
  if (eq.moldura) moldura = MOLDURAS[eq.moldura] || "4px solid #8a6d3b";
  return { cores, moldura, molduraId: eq.moldura || null };
}
export {
  aspeto,
  coresTabuleiro,
  definirEquipado,
  equipadoAtual,
  lerTokens,
  misturar,
  recarregarTokens
};
