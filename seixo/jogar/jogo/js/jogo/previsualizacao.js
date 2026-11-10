import { aspeto, equipadoAtual } from "./cosmeticos.js";
import { desenharMoldura } from "./padroes.js";
import { textoSazonal } from "../meta/sazonal.js";
const RE_MOLD_MES = /^MOLD-(\d{4})-(\d{2})$/;
function nomeDeArtigo(t, id) {
  var _a;
  const m = RE_MOLD_MES.exec(id || "");
  if (m) return t("artigo.MOLD-AAAA-MM.nome", { mes: t(`mes.titulo.${Number(m[2])}`), ano: m[1] });
  return (_a = textoSazonal(t, id, "nome")) != null ? _a : t(`artigo.${id}.nome`);
}
const AMOSTRA_N = 4;
const AMOSTRA_LAYOUT = "ECxECxECxECxCECE";
const AMOSTRA_SELECIONADA = 0;
const AMOSTRA_REVELADA = 10;
function equipadoDeAmostra(artigo, eq = equipadoAtual()) {
  const tipo = artigo.categoria;
  if (tipo === "pedra") return { ...eq, pedra: artigo.id };
  if (tipo === "paleta") return { ...eq, paleta: artigo.id };
  if (tipo === "moldura") return { ...eq, moldura: artigo.id };
  return { ...eq };
}
function criarPrevisualizacao({ t, tocarSom, silenciado = () => false }) {
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
  const raiz = criar("section", { id: "previsualizacao", class: "previsualizacao", role: "dialog", "aria-label": t("loja.ver_titulo"), hidden: true });
  const titulo = criar("h2", { class: "prev-titulo" }, t("loja.ver_titulo"));
  const nome = criar("p", { id: "prev-nome", class: "forte" });
  const cv = criar("canvas", { id: "prev-amostra", class: "prev-amostra", width: "296", height: "296", "aria-hidden": "true" });
  const aviso = criar("p", { class: "of-suave" }, t("loja.ver_aviso"));
  const nota = criar("p", { id: "prev-nota", class: "of-suave", role: "status", "aria-live": "polite" });
  const ouvir = criar("button", { id: "btn-prev-ouvir", type: "button", class: "ec-botao sec grande", hidden: true }, t("loja.ver_ouvir"));
  const fechar = criar("button", { id: "btn-prev-fechar", type: "button", class: "ec-botao cheio grande" }, t("loja.ver_fechar"));
  raiz.append(titulo, nome, cv, aviso, nota, ouvir, fechar);
  let estado = null;
  function desenhar() {
    const g = cv.getContext && cv.getContext("2d");
    if (!g || !estado) return;
    const { cores } = aspeto({ ...estado.eq, moldura: null });
    const L = cv.width / AMOSTRA_N;
    g.fillStyle = cores.junta;
    g.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < AMOSTRA_N * AMOSTRA_N; i++) {
      const x = i % AMOSTRA_N * L + 2, y = Math.floor(i / AMOSTRA_N) * L + 2, c = AMOSTRA_LAYOUT[i];
      if (c === "x") {
        g.strokeStyle = cores.junta;
        g.setLineDash([4, 4]);
        g.strokeRect(x + 0.5, y + 0.5, L - 5, L - 5);
        g.setLineDash([]);
      } else {
        g.fillStyle = c === "E" ? cores.preta : cores.branca;
        g.fillRect(x, y, L - 4, L - 4);
      }
      if (i === AMOSTRA_SELECIONADA) {
        g.strokeStyle = cores.junta;
        g.lineWidth = 3;
        g.strokeRect(x + 1.5, y + 1.5, L - 7, L - 7);
        g.lineWidth = 1;
      }
      if (i === AMOSTRA_REVELADA) {
        g.strokeStyle = cores.branca;
        g.lineWidth = 2;
        g.strokeRect(x + 4, y + 4, L - 12, L - 12);
        g.lineWidth = 1;
      }
    }
    if (estado.eq.moldura) {
      const m = criar("canvas", { width: String(cv.width), height: String(cv.height) });
      try {
        desenharMoldura(m, estado.eq.moldura, cores);
        g.drawImage(m, 0, 0, cv.width, cv.height);
      } catch (e) {
      }
    }
  }
  const tocar = () => {
    if (!estado || estado.artigo.categoria !== "som") return false;
    if (silenciado()) {
      nota.textContent = t("loja.ver_ouvir_mudo");
      return false;
    }
    nota.textContent = "";
    try {
      if (tocarSom) tocarSom(estado.artigo.id);
    } catch (e) {
    }
    return true;
  };
  fechar.addEventListener("click", () => api.fechar());
  ouvir.addEventListener("click", () => tocar());
  const api = {
    el: raiz,
    abrir(artigo, eq) {
      estado = { artigo, eq: equipadoDeAmostra(artigo, eq) };
      const som = artigo.categoria === "som";
      const n = nomeDeArtigo(t, artigo.id);
      nome.textContent = t("loja.ver_amostra", { nome: n });
      cv.hidden = som;
      nota.textContent = "";
      ouvir.hidden = !som;
      if (som) ouvir.setAttribute("aria-label", t("loja.ver_ouvir_aria", { nome: n }));
      raiz.hidden = false;
      desenhar();
      return api.estado();
    },
    ouvir: tocar,
    fechar() {
      raiz.hidden = true;
      estado = null;
    },
    aberta: () => !raiz.hidden,
    estado: () => ({ aberta: !raiz.hidden, grelha: AMOSTRA_N, ouvir: !ouvir.hidden, nota: nota.textContent, aplicar: false })
  };
  return api;
}
export {
  AMOSTRA_LAYOUT,
  AMOSTRA_N,
  AMOSTRA_REVELADA,
  AMOSTRA_SELECIONADA,
  criarPrevisualizacao,
  equipadoDeAmostra,
  nomeDeArtigo
};
