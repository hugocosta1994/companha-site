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
const ICONE = { aplicado: "\u25CF", tens: "\u2713", bloqueado: "\u25CB", venda: "\u25C6" };
const APLICAVEIS = ["pedra", "paleta", "moldura", "som"];
function criarEcraColecao({ t, tn }, fonte, acoes) {
  let aba = "pedra", soFalta = false;
  const raiz = criar("div", { id: "ecra-colecao", class: "of-raiz colecao-v3" });
  const abas = criar("div", { class: "of-abas", role: "tablist", id: "col-abas" });
  const topo = criar("div", { class: "col-topo" });
  const corpo = criar("div", { class: "of-conteudo" });
  raiz.append(abas, topo, corpo);
  const textoCondicao = (c) => c.condicao ? t(c.condicao.chave) : "";
  function linhaProgresso(c) {
    const p = c.progresso;
    if (!p) return null;
    if (c.condicao && c.condicao.tipo === "nivel") return criar("span", { class: "of-suave col-prog" }, t("colecao.faltam_po", { n: p.faltam }));
    if (!(p.alvo > 0)) return null;
    const b = criar("div", { class: "of-barra", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(p.alvo), "aria-valuenow": String(p.atual), "aria-label": t(`artigo.${c.id}.nome`) });
    b.append(criar("span", { style: `width:${Math.round(Math.min(1, p.atual / p.alvo) * 100)}%` }));
    return criar("span", { class: "col-prog" }, criar("span", { class: "of-suave" }, t("colecao.progresso", { atual: p.atual, alvo: p.alvo })), b);
  }
  function cartao(c) {
    var _a, _b;
    const item = fonte.item(c.id);
    const nome = fonte.nome && fonte.nome(c.id) || t(`artigo.${c.id}.nome`);
    const legenda = fonte.legenda ? fonte.legenda(c.id) : null;
    const estado = criar("span", { class: "col-estado", "data-estado": c.estado }, criar("span", { "aria-hidden": "true" }, ICONE[c.estado] + " "), t(`colecao.estado.${c.estado}`));
    const partes = [criar("strong", { class: "col-nome" }, nome), ...legenda ? [criar("span", { class: "of-suave col-legenda" }, legenda)] : [], estado];
    if (c.estado === "bloqueado") partes.push(criar("span", { class: "of-suave col-como" }, t("colecao.como", { condicao: textoCondicao(c) })), linhaProgresso(c));
    else if (c.estado === "venda") partes.push(criar("span", { class: "of-suave col-como" }, t("colecao.venda_lascas", { n: (_b = (_a = item && item.lascas) != null ? _a : fonte.lascasDe(c.id)) != null ? _b : 0 })));
    const bts = [];
    if (item && APLICAVEIS.includes(item.categoria)) {
      if (acoes.ver) {
        const ver = criar("button", { type: "button", class: "ec-botao sec col-ver", "data-id": c.id }, t("colecao.ver"));
        ver.addEventListener("click", () => acoes.ver(item));
        bts.push(ver);
      }
      if (c.estado === "tens") {
        const ap = criar("button", { type: "button", class: "ec-botao cheio col-aplicar", "data-id": c.id }, t("colecao.aplicar"));
        ap.addEventListener("click", async () => {
          await acoes.aplicar(c.id);
          render();
        });
        bts.push(ap);
      }
    }
    return criar("li", { class: `col-cartao ${c.estado}`, "data-id": c.id }, ...partes.filter(Boolean), ...bts);
  }
  function render() {
    const todos = fonte.colecao();
    abas.replaceChildren(...todos.map((s) => {
      const b = criar("button", { id: `col-aba-${s.separador}`, type: "button", role: "tab", class: "of-aba", "aria-selected": String(s.separador === aba) }, `${t(`colecao.aba.${s.separador}`)} ${s.n}/${s.N}`);
      b.addEventListener("click", () => {
        aba = s.separador;
        if (acoes.aoAbrir) acoes.aoAbrir(aba);
        render();
      });
      return b;
    }));
    const sep = todos.find((s) => s.separador === aba) || todos[0];
    const filtro = criar("button", { id: "col-filtro", type: "button", class: "ec-botao sec", "aria-pressed": String(soFalta) }, t(soFalta ? "colecao.filtro_tudo" : "colecao.filtro_falta"));
    filtro.addEventListener("click", () => {
      soFalta = !soFalta;
      render();
    });
    topo.replaceChildren(criar("p", { id: "col-n", class: "of-suave" }, t("colecao.n_de", { n: sep.n, total: sep.N })), filtro);
    const lista = soFalta ? fonte.oQueFalta(sep.cartoes) : sep.cartoes;
    corpo.replaceChildren(lista.length ? criar("ul", { id: "col-grelha", class: "col-grelha" }, ...lista.map(cartao)) : criar("p", { id: "col-vazio", class: "of-suave" }, t("colecao.vazio_falta")));
  }
  return { el: raiz, render, abrir(sep) {
    if (sep) aba = sep;
    render();
  }, aba: () => aba };
}
export {
  APLICAVEIS,
  criarEcraColecao
};
