import { desenharMiniatura } from "./praca.js";
let atual = null;
function fecharAssentar() {
  if (!atual) return;
  clearTimeout(atual.tm);
  atual.el.remove();
  atual = null;
}
function assentarVisivel() {
  if (!atual) return null;
  return { praca: atual.praca, novo: atual.novo, quadrados: atual.el.querySelectorAll(".assentar-q").length };
}
function mostrarAssentar(sobre, dados) {
  fecharAssentar();
  if (!sobre || !sobre.parentElement) return null;
  const raiz = document.createElement("div");
  raiz.className = "assentar";
  raiz.setAttribute("role", "status");
  raiz.style.top = `${sobre.offsetTop}px`;
  raiz.style.left = `${sobre.offsetLeft}px`;
  raiz.style.width = `${sobre.offsetWidth}px`;
  raiz.style.height = `${sobre.offsetHeight}px`;
  const cartao = document.createElement("div");
  cartao.className = "assentar-cartao";
  const titulo = document.createElement("strong");
  titulo.className = "assentar-titulo";
  titulo.textContent = dados.titulo || "";
  const grelha = document.createElement("div");
  grelha.className = "assentar-grelha";
  grelha.setAttribute("aria-hidden", "true");
  grelha.style.gridTemplateColumns = `repeat(${dados.colunas || 5}, 1fr)`;
  let primeiro = true;
  for (const q of dados.quadrados || []) {
    const cv = document.createElement("canvas");
    cv.width = 32;
    cv.height = 32;
    const novo = q.indice === dados.novo;
    const est = novo ? "resolvido" : q.praca || (q.resolvido ? "resolvido" : "terra");
    cv.className = `assentar-q ${est}${novo ? " novo" : ""}`;
    if (primeiro && dados.deslocamento) cv.style.gridColumnStart = String(dados.deslocamento + 1);
    primeiro = false;
    desenharMiniatura(cv, est === "resolvido" ? q : { futuro: est === "futuro" });
    grelha.append(cv);
  }
  const legenda = document.createElement("span");
  legenda.className = "assentar-legenda";
  legenda.textContent = dados.legenda || "";
  cartao.append(titulo, grelha, legenda);
  raiz.append(cartao);
  raiz.addEventListener("click", fecharAssentar);
  sobre.parentElement.append(raiz);
  const ms = dados.ms || 3e3;
  const este = { el: raiz, praca: dados.praca, novo: dados.novo, tm: 0 };
  este.tm = setTimeout(() => {
    raiz.classList.add("sair");
    este.tm = setTimeout(() => {
      if (atual === este) fecharAssentar();
    }, 400);
  }, ms);
  atual = este;
  return raiz;
}
export {
  assentarVisivel,
  fecharAssentar,
  mostrarAssentar
};
