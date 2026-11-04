import { aspeto } from "./cosmeticos.js";
import { MASCARAS, desenharMotivo, molduraCss } from "./padroes.js";
const TERRA = { terra: "#c9b48f", terraGrao: "#b59f78" };
function desenharMiniatura(canvas, { n, solucao, futuro = false } = {}) {
  const COR = { ...TERRA, ...aspeto().cores };
  const px = canvas.width;
  const g = canvas.getContext && canvas.getContext("2d");
  if (!g) return;
  if (futuro) {
    g.clearRect(0, 0, px, px);
    g.strokeStyle = COR.terraGrao;
    g.lineWidth = 2;
    g.setLineDash && g.setLineDash([5, 4]);
    g.strokeRect(3, 3, px - 6, px - 6);
    return;
  }
  if (!solucao || !n) {
    g.fillStyle = COR.terra;
    g.fillRect(0, 0, px, px);
    g.fillStyle = COR.terraGrao;
    for (let k = 0; k < 14; k++) {
      const x = k * 37 % px, y = k * 53 % px;
      g.fillRect(x, y, 2, 2);
    }
    return;
  }
  const c = px / n;
  g.fillStyle = COR.junta;
  g.fillRect(0, 0, px, px);
  for (let i = 0; i < n * n; i++) {
    g.fillStyle = solucao[i] === "P" ? COR.preta : COR.branca;
    const x = i % n * c, y = Math.floor(i / n) * c;
    g.fillRect(x + 0.5, y + 0.5, c - 1, c - 1);
  }
}
function criarPraca(dados, aoEscolher = () => {
}) {
  const raiz = document.createElement("div");
  raiz.className = "praca";
  raiz.dataset.praca = dados.id || "";
  if (dados.rotulo) raiz.setAttribute("aria-label", dados.rotulo);
  const grelha = document.createElement("div");
  grelha.className = "praca-grelha";
  grelha.setAttribute("role", "list");
  grelha.dataset.colunas = String(dados.colunas || 5);
  grelha.style.gridTemplateColumns = `repeat(${dados.colunas || 5}, minmax(0, 1fr))`;
  for (const q of dados.quadrados) {
    const b = document.createElement("button");
    b.type = "button";
    b.id = `btn-q-${q.id}`;
    const est = q.praca || (q.resolvido ? "resolvido" : "terra");
    b.className = `praca-q ${est} ${q.estado || "por_jogar"}`;
    if (q === dados.quadrados[0] && dados.deslocamento) b.style.gridColumnStart = String(dados.deslocamento + 1);
    b.setAttribute("role", "listitem");
    if (q.rotulo) {
      b.setAttribute("aria-label", q.rotulo);
      b.title = q.rotulo;
    }
    b.disabled = !!q.desativado;
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    cv.setAttribute("aria-hidden", "true");
    desenharMiniatura(cv, est === "resolvido" ? q : { futuro: est === "futuro" });
    const num = document.createElement("span");
    num.className = "praca-num";
    num.setAttribute("aria-hidden", "true");
    num.textContent = String(q.indice);
    b.append(cv, num);
    b.addEventListener("click", () => aoEscolher(q));
    grelha.append(b);
  }
  const motivo = document.createElement("div");
  motivo.className = "praca-motivo" + (dados.acesa ? " acesa" : "");
  const { cores, molduraId, moldura } = aspeto();
  if (dados.motivo && MASCARAS[dados.motivo]) {
    motivo.dataset.motivo = dados.motivo;
    const cv = document.createElement("canvas");
    cv.width = 192;
    cv.height = 192;
    cv.className = "praca-motivo-desenho";
    cv.setAttribute("role", "img");
    if (dados.motivoNome) cv.setAttribute("aria-label", dados.motivoNome);
    desenharMotivo(cv, dados.motivo, { ...TERRA, ...cores });
    motivo.append(cv);
  }
  if (molduraId) {
    const img = molduraCss(molduraId, cores);
    if (img) {
      raiz.style.border = "12px solid transparent";
      raiz.style.borderImage = img;
    } else raiz.style.border = moldura;
    raiz.style.padding = "4px";
    raiz.dataset.moldura = molduraId;
  }
  raiz.append(grelha, motivo);
  return raiz;
}
function acenderMotivo(raiz) {
  const m = raiz && raiz.querySelector(".praca-motivo");
  if (!m) return false;
  m.classList.add("acesa", "acender");
  m.addEventListener("animationend", () => m.classList.remove("acender"), { once: true });
  return true;
}
export {
  acenderMotivo,
  criarPraca,
  desenharMiniatura
};
