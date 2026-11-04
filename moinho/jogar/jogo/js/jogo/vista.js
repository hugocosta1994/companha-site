import { COORD, MOINHOS, N } from "../nucleo/tabuleiro.js";
const ns = "http://www.w3.org/2000/svg";
const RAIOS = [130, 87, 44];
const pos = (p) => {
  const [x, y] = COORD[p % 8], r = RAIOS[Math.floor(p / 8)];
  return [150 + x * r, 150 + y * r];
};
const R_PECA = 14, R_TOQUE = 24;
function e(tag, attrs = {}, pai) {
  const x = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, v);
  if (pai) pai.append(x);
  return x;
}
function formaPeca(g, jogador) {
  if (jogador === 1) e("circle", { r: R_PECA, class: "p-corpo p-b" }, g);
  else {
    e("rect", { x: -R_PECA, y: -R_PECA, width: 2 * R_PECA, height: 2 * R_PECA, rx: 4, class: "p-corpo p-p" }, g);
    e("path", { d: `M${-R_PECA + 5} 0 H${R_PECA - 5}`, class: "p-traco" }, g);
  }
}
function criarTabuleiro({ aoPonto } = {}) {
  const svg = e("svg", { viewBox: "0 0 300 300", class: "tab", role: "img" });
  const linhas = e("g", { class: "linhas" }, svg);
  for (const m of MOINHOS) {
    const [a, , c] = m, [x1, y1] = pos(a), [x2, y2] = pos(c);
    e("line", { x1, y1, x2, y2 }, linhas);
  }
  const pontos = e("g", { class: "pontos" }, svg), pecas = e("g", { class: "pecas" }, svg), marcas = e("g", { class: "marcas" }, svg), toques = e("g", { class: "toques" }, svg);
  const g = [], dest = [];
  for (let p = 0; p < N; p++) {
    const [x, y] = pos(p);
    e("circle", { cx: x, cy: y, r: 4, class: "ponto" }, pontos);
    const pg = e("g", { transform: `translate(${x} ${y})`, class: "peca", "data-p": p, visibility: "hidden" }, pecas);
    g.push(pg);
    const d = e("g", { transform: `translate(${x} ${y})`, class: "marca", "data-p": p, visibility: "hidden" }, marcas);
    dest.push(d);
    const t = e("circle", { cx: x, cy: y, r: R_TOQUE, class: "toque", "data-p": p }, toques);
    t.addEventListener("pointerdown", (ev) => {
      ev.preventDefault();
      aoPonto && aoPonto(p, "down");
    });
    t.addEventListener("pointerup", (ev) => {
      ev.preventDefault();
      const alvo = document.elementFromPoint(ev.clientX, ev.clientY);
      const q = alvo && alvo.dataset && alvo.dataset.p !== void 0 ? +alvo.dataset.p : p;
      aoPonto && aoPonto(q, "up");
    });
  }
  return { svg, g, dest, pecasEl: pecas };
}
function desenhar(tab, celas, { destinos = [], selecionado = null, removiveis = null, daltonico = false } = {}) {
  tab.svg.classList.toggle("daltonico", !!daltonico);
  tab.svg.classList.toggle("a-remover", !!removiveis);
  const sig = tab.sig || (tab.sig = { g: [], d: [] });
  for (let p = 0; p < N; p++) {
    const g = tab.g[p], c = celas[p];
    g.setAttribute("class", "peca");
    const rem = removiveis ? removiveis.includes(p) ? "r" : "b" : "";
    const sg = c + "|" + rem;
    if (sig.g[p] !== sg) {
      sig.g[p] = sg;
      g.replaceChildren();
      if (c) {
        formaPeca(g, c);
        g.setAttribute("visibility", "visible");
        if (rem === "r") {
          e("path", { d: "M-9 -9 L9 9 M9 -9 L-9 9", class: "cruz" }, g);
          e("circle", { r: R_PECA + 5, class: "anel" }, g);
        }
      } else g.setAttribute("visibility", "hidden");
    }
    if (c) {
      if (selecionado === p) g.classList.add("sel");
      if (rem === "r") g.classList.add("rem");
      else if (rem === "b") g.classList.add("baca");
    }
    const d = tab.dest[p], quer = destinos.includes(p) && !c, sd = quer ? daltonico ? "d" : "c" : "";
    if (sig.d[p] !== sd) {
      sig.d[p] = sd;
      d.replaceChildren();
      if (quer) {
        d.setAttribute("visibility", "visible");
        e(daltonico ? "rect" : "circle", daltonico ? { x: -7, y: -7, width: 14, height: 14, transform: "rotate(45)", class: "dest" } : { r: 7, class: "dest" }, d);
      } else d.setAttribute("visibility", "hidden");
    }
  }
}
function marcarMoinho(tab, linha) {
  for (const p of linha) tab.g[p].classList.add("moinho");
  tab.svg.classList.add("escuro");
}
function limparMoinho(tab) {
  tab.svg.classList.remove("escuro");
}
function iconePeca(jogador, cruz = false) {
  const s = e("svg", { viewBox: "-18 -18 36 36", class: "icone", "aria-hidden": "true" });
  formaPeca(s, jogador);
  if (cruz) e("path", { d: "M-10 -10 L10 10 M10 -10 L-10 10", class: "cruz" }, s);
  return s;
}
export {
  criarTabuleiro,
  desenhar,
  formaPeca,
  iconePeca,
  limparMoinho,
  marcarMoinho,
  ns,
  pos
};
