import { metaRumo, META_ORDEM } from "../meta/rumo.js";
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
const botao = (id, classe, texto, fn) => {
  const b = criar("button", { id, type: "button", class: `ec-botao ${classe}` }, texto);
  b.addEventListener("click", fn);
  return b;
};
function escolherRumo(longo, ordem = META_ORDEM) {
  const objetivo = (longo || []).find((o) => o.id === "OBJ-L1") || null;
  return { objetivo, meta: metaRumo((longo || []).filter((o) => o.id !== "OBJ-L1"), ordem) };
}
const nomeCurto = ({ t, temTexto }, meta) => temTexto && temTexto(`${meta.texto}_curto`) ? t(`${meta.texto}_curto`) : t(meta.texto);
function fitaRumo({ t, temTexto }, { id = "fita-rumo", passo = null, objetivo = "", meta = null, navegavel = false, abrir = null }) {
  const esq = criar("span", { class: "fita-esq" });
  if (passo) esq.append(criar("span", { class: "fita-passo" }, t("tutorial3.fita_passo", { i: passo })), " ");
  esq.append(criar("span", { class: "fita-obj" }, objetivo));
  const filhos = [esq];
  let chip = null;
  if (meta) {
    const [antes, depois = ""] = t("tutorial3.fita_meta", { meta: "\0", x: meta.atual, n: meta.n }).split("\0");
    const partes = () => [
      ...antes ? [criar("span", { class: "fita-chip-num" }, antes)] : [],
      criar("span", { class: "fita-chip-txt" }, nomeCurto({ t, temTexto }, meta)),
      ...depois ? [criar("span", { class: "fita-chip-num" }, depois)] : []
    ];
    const desc = t("tutorial3.chip_desc", { meta: t(meta.texto), x: meta.atual, n: meta.n });
    chip = navegavel ? criar("button", { id: `${id}-chip`, type: "button", class: "fita-chip navegavel", "aria-label": desc }, ...partes()) : criar("span", { id: `${id}-chip`, class: "fita-chip", role: "img", "aria-label": desc }, criar("span", { class: "fita-chip-in", "aria-hidden": "true" }, ...partes()));
    if (navegavel && abrir) chip.addEventListener("click", abrir);
    filhos.push(chip);
  }
  const el = criar("div", { id, class: `fita-rumo${meta ? "" : " sem-meta"}` }, ...filhos);
  return { el, pulsar: () => {
    if (!chip) return;
    chip.classList.remove("pulso");
    void chip.offsetWidth;
    chip.classList.add("pulso");
  } };
}
const premio = (t, o) => o && o.premio && o.premio.lascas > 0 ? t("tutorial3.rumo_premio", { n: o.premio.lascas }) : "";
function cartaoRumo({ t }, rumo, acoes) {
  const linhas = [];
  const { objetivo, meta } = rumo || {};
  if (objetivo) linhas.push(criar("p", { id: "tut3-objetivo" }, t("tutorial3.rumo_objetivo", { objetivo: t(objetivo.texto) }), " ", `(${objetivo.atual}/${objetivo.n}) `, premio(t, objetivo)));
  if (meta) linhas.push(criar("p", { id: "tut3-meta" }, t("tutorial3.rumo_meta", { meta: t(meta.texto), x: meta.atual, n: meta.n }), " ", premio(t, meta)));
  return criar(
    "div",
    { id: "tut3-cartao-a", class: "ec-cartao of-cartao", role: "group" },
    criar("h2", {}, t("tutorial3.rumo_titulo")),
    ...linhas,
    botao("tut3-seguinte", "cheio", t("tutorial3.rumo_seguinte"), () => acoes.seguinte())
  );
}
const CODIGO_EXEMPLO = "SEX1-D20261108-F-0P-CALCETEI-0000";
function cartaoAmigo({ t }, acoes, { tempo = null } = {}) {
  const exemplo = criar(
    "div",
    { id: "tut3-exemplo", class: "tut3-exemplo", role: "img", "aria-label": t("tutorial3.amigo_exemplo") },
    criar("span", { class: "ec-suave" }, t("tutorial3.amigo_exemplo")),
    " ",
    criar("code", { class: "tut3-codigo", "aria-hidden": "true" }, CODIGO_EXEMPLO)
  );
  return criar(
    "div",
    { id: "tut3-cartao-b", class: "ec-cartao of-cartao", role: "group" },
    criar("h2", {}, t("tutorial3.amigo_titulo")),
    ...tempo ? [criar("p", { id: "tut3-tempo" }, t("tutorial3.amigo_tempo", { tempo }))] : [],
    criar("p", {}, t("tutorial3.amigo_texto")),
    exemplo,
    criar("p", { id: "tut3-privado", class: "ec-suave" }, t("tutorial3.amigo_privado")),
    botao("tut3-ir", "cheio", t("tutorial3.amigo_ir"), () => acoes.ir()),
    botao("tut3-saltar", "sec texto", t("tutorial3.amigo_saltar"), () => acoes.saltar())
  );
}
export {
  CODIGO_EXEMPLO,
  META_ORDEM,
  cartaoAmigo,
  cartaoRumo,
  escolherRumo,
  fitaRumo,
  nomeCurto
};
