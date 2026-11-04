import { aspeto, equipadoAtual } from "./cosmeticos.js";
import { desenharMoldura } from "./padroes.js";
const DEMO_SOLUCAO = "PBPBPBBPBPBPPBPBPBBPBPBPPBPBPBBPBPBP";
const DEMO_VAZIAS = Object.freeze([3, 9, 14, 20, 25, 28, 34]);
const DEMO_N = 6;
function equipadoDeEnsaio(artigo, eq = equipadoAtual()) {
  const tipo = artigo.categoria;
  if (tipo === "pedra") return { ...eq, pedra: artigo.id };
  if (tipo === "paleta") return { ...eq, paleta: artigo.id };
  if (tipo === "moldura") return { ...eq, moldura: artigo.id };
  return { ...eq };
}
function criarExperimentar({ t, tocarSom }) {
  const criar = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k === "hidden") e.hidden = !!v;
      else e.setAttribute(k, v);
    }
    e.append(...filhos);
    return e;
  };
  const raiz = criar("section", { id: "experimentar", class: "experimentar", role: "dialog", "aria-label": t("loja.experimentar"), hidden: true });
  const aviso = criar("p", { class: "of-suave" }, t("loja.experimentar_aviso"));
  const fim = criar("p", { id: "experimentar-fim", class: "forte", role: "status", "aria-live": "polite" });
  const cv = criar("canvas", { id: "experimentar-tabuleiro", class: "exp-tabuleiro", width: "288", height: "288" });
  const sair = criar("button", { id: "btn-experimentar-sair", type: "button", class: "ec-botao cheio grande" }, t("loja.experimentar_sair"));
  raiz.append(aviso, cv, fim, sair);
  let estado = null;
  const L = cv.width / DEMO_N;
  function desenhar() {
    const g = cv.getContext && cv.getContext("2d");
    if (!g || !estado) return;
    const { cores } = aspeto({ ...estado.eq, moldura: null });
    g.fillStyle = cores.junta;
    g.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < DEMO_N * DEMO_N; i++) {
      const x = i % DEMO_N * L + 2, y = Math.floor(i / DEMO_N) * L + 2;
      if (DEMO_VAZIAS.includes(i) && !estado.feitas.has(i)) {
        g.strokeStyle = cores.junta;
        g.setLineDash([4, 4]);
        g.strokeRect(x + 0.5, y + 0.5, L - 5, L - 5);
        g.setLineDash([]);
        continue;
      }
      g.fillStyle = DEMO_SOLUCAO[i] === "P" ? cores.preta : cores.branca;
      g.fillRect(x, y, L - 4, L - 4);
    }
    if (estado.eq.moldura) {
      const moldura = criar("canvas", { width: String(cv.width), height: String(cv.height) });
      try {
        desenharMoldura(moldura, estado.eq.moldura, cores);
        g.save();
        g.globalAlpha = 1;
        g.drawImage(moldura, 0, 0, cv.width, cv.height);
        g.restore();
      } catch (e) {
      }
    }
  }
  cv.addEventListener("click", (ev) => {
    if (!estado) return;
    const r = cv.getBoundingClientRect();
    const i = Math.floor((ev.clientY - r.top) / r.height * DEMO_N) * DEMO_N + Math.floor((ev.clientX - r.left) / r.width * DEMO_N);
    api.assentar(i);
  });
  sair.addEventListener("click", () => api.fechar());
  const api = {
    el: raiz,
    abrir(artigo, eq) {
      estado = { artigo, eq: equipadoDeEnsaio(artigo, eq), feitas: /* @__PURE__ */ new Set() };
      fim.textContent = "";
      raiz.hidden = false;
      desenhar();
      if (artigo.categoria === "som" && tocarSom) {
        try {
          tocarSom(artigo.id);
        } catch (e) {
        }
      }
      return api.estado();
    },
    assentar(i) {
      if (!estado || !DEMO_VAZIAS.includes(i) || estado.feitas.has(i)) return false;
      estado.feitas.add(i);
      if (estado.artigo.categoria === "som" && tocarSom) {
        try {
          tocarSom(estado.artigo.id);
        } catch (e) {
        }
      }
      desenhar();
      if (estado.feitas.size === DEMO_VAZIAS.length) fim.textContent = t("loja.experimentar_fim");
      return true;
    },
    fechar() {
      raiz.hidden = true;
      estado = null;
    },
    aberta: () => !raiz.hidden,
    estado: () => ({ aberta: !raiz.hidden, vazias: estado ? DEMO_VAZIAS.length - estado.feitas.size : 0, fim: fim.textContent })
  };
  return api;
}
export {
  DEMO_N,
  DEMO_SOLUCAO,
  DEMO_VAZIAS,
  criarExperimentar,
  equipadoDeEnsaio
};
