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
const img = (src, tam, cls) => criar("img", { src, width: String(tam), height: String(tam), alt: "", "aria-hidden": "true", class: cls, draggable: "false" });
const ICONE_META = { H1: "hoje", H2: "sem-pista", H3: "arquivo", H4: "arquivo", H5: "tecnica", H6: "variante", S1: "sem-pista", S2: "seq-3", S3: "arquivo", S4: "mestre", S5: "tecnica", S6: "pacote", S7: "praca-mes", S8: "variante", L1: "primeiro", L2: "seq-3", L3: "seq-7", L4: "seq-30", L5: "praca-mes", L6: "tecnica", L7: "tecnica", "L8-JUNTAS": "variante", "L8-CONTRA": "variante", "L8-ORLA": "variante", L9: "pacote", L10: "dez", L11: "moldura", L12: "mestre", L13: "variante", L14: "variante", L15: "variante", L16: "variante", L17: "tecnica", L18: "tecnica", L19: "cem", L20: "cem", L21: "cem", L22: "praca-mes", L23: "praca-mes", L24: "moldura", L25: "pacote", L26: "pacote", L27: "rapido", L28: "partilha" };
const iconeMeta = (id) => `img/metas/m-${ICONE_META[String(id).replace(/^OBJ-/, "")] || "pedra"}.svg`;
const seloNivel = (n) => `img/selos/nivel-${Math.min(5, Math.max(1, n))}.svg`;
const marca = (feito) => criar("span", { class: "of-marca", "aria-hidden": "true" }, feito ? "\u2713" : "\u25CB");
function barra(fracao, rotulo) {
  const pc = Math.round(fracao * 100);
  const b = criar("div", { class: "of-barra", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": String(pc), "aria-label": rotulo });
  b.append(criar("span", { style: `width:${pc}%` }));
  return b;
}
const linhaFalta = (of, { t, tn }) => of.mestre ? t("oficio.mestre") : tn("oficio.faltam", of.faltam, { nivel: t(`oficio.nivel.${of.proximo}`) });
function faixaOficio(of, metasHoje, { t, tn }, aoAbrir) {
  const nome = t(`oficio.nivel.${of.nivel}`);
  const b = criar("button", { id: "menu-oficio", type: "button", class: "ec-botao sec of-faixa", "aria-label": t("oficio.a11y_barra", { nivel: nome, n: of.po }) });
  b.append(criar("span", { class: "of-nome" }, nome), criar("span", { class: "of-suave" }, linhaFalta(of, { t, tn })), barra(of.fracao, nome));
  if (metasHoje && metasHoje.length) {
    const f = metasHoje.filter((m) => m.feito).length;
    b.append(criar("span", { class: "of-suave", id: "menu-oficio-hoje" }, `${t("objetivos.sep_hoje")}: ${t("objetivos.progresso", { feitos: f, total: metasHoje.length })}`));
  }
  b.addEventListener("click", aoAbrir);
  return b;
}
function corpoOficio(of, { t, tn }) {
  const nome = t(`oficio.nivel.${of.nivel}`);
  const cab = criar(
    "div",
    { class: "ec-cartao of-cartao" },
    img(seloNivel(of.nivel), 96, "of-selo"),
    criar("h3", { id: "of-atual" }, t("oficio.atual", { nivel: nome })),
    criar("p", { class: "of-suave" }, tn("oficio.pontos", of.po, { n: of.po })),
    barra(of.fracao, t("oficio.a11y_barra", { nivel: nome, n: of.po })),
    criar("p", { id: "of-faltam", class: "of-suave" }, linhaFalta(of, { t, tn })),
    criar("p", {}, t("oficio.explica"))
  );
  const fila = criar("div", { class: "of-selos", id: "of-selos" }, ...[1, 2, 3, 4, 5].map((n) => img(seloNivel(n), 48, n <= of.nivel ? "of-selo-p" : "of-selo-p por-ganhar")));
  cab.insertBefore(fila, cab.querySelector("#of-faltam").nextSibling);
  const desc = criar(
    "div",
    { class: "ec-cartao of-cartao" },
    criar("h3", {}, t("oficio.sep_descobertas")),
    criar("ul", { class: "of-lista", id: "of-descobertas" }, ...of.descobertas.map((d) => criar(
      "li",
      { class: d.feita ? "feito" : "", "data-id": d.id },
      marca(d.feita),
      t(d.chave),
      d.feita ? criar("span", { class: "sr" }, ` (${t("objetivos.feito")})`) : ""
    )))
  );
  const prem = criar(
    "div",
    { class: "ec-cartao of-cartao" },
    criar("h3", {}, t("oficio.sep_premios")),
    criar("ul", { class: "of-lista", id: "of-premios" }, ...of.premios.map((p) => criar("li", { class: p.alcancado ? "feito" : "", "data-nivel": String(p.nivel) }, marca(p.alcancado), t(`oficio.premio.${p.nivel}`))))
  );
  return criar("div", { class: "of-corpo", id: "of-corpo" }, cab, desc, prem);
}
function linhaMeta(m, { t, tn }) {
  const premio = m.premio.lascas ? t("objetivos.premio_lascas", { n: m.premio.lascas }) : m.premio.item ? t("objetivos.premio_item", { artigo: t(`artigo.${m.premio.item}.nome`) }) : "";
  const prog = m.n > 1 ? criar("span", { class: "of-suave" }, t("objetivos.progresso", { feitos: m.atual, total: m.n })) : "";
  return criar(
    "li",
    { class: `meta${m.feito ? " feito" : ""}`, "data-id": m.id },
    img(iconeMeta(m.id), 48, "meta-icone"),
    criar("span", { class: "meta-texto" }, criar("span", {}, t(m.texto)), prog),
    criar("span", { class: "meta-premio" }, m.feito ? t("objetivos.feito") : premio)
  );
}
function corpoMetas(v, { t, tn }) {
  const sec = (id, titulo, nota, lista, vazio) => criar(
    "div",
    { class: "ec-cartao of-cartao", id },
    criar("h3", {}, titulo),
    nota ? criar("p", { class: "of-suave" }, nota) : "",
    lista.length ? criar("ul", { class: "of-lista metas" }, ...lista.map((m) => linhaMeta(m, { t, tn }))) : criar("p", { class: "of-suave" }, vazio || "")
  );
  return criar(
    "div",
    { class: "of-corpo", id: "metas-corpo" },
    sec("metas-hoje", t("objetivos.sep_hoje"), t("objetivos.hoje_nota"), v.hoje, t("objetivos.hoje_vazio")),
    sec("metas-semana", t("objetivos.sep_semana"), `${t("objetivos.semana_nota")} ${t("objetivos.desaparece")}`, v.semana),
    sec("metas-longo", t("objetivos.sep_longo"), "", v.longo)
  );
}
function criarEcraOficio({ t, tn }, fontes) {
  let aba = "oficio";
  const raiz = criar("div", { id: "ecra-oficio", class: "of-raiz" });
  const abas = criar("div", { class: "of-abas", role: "tablist" });
  const corpo = criar("div", { class: "of-conteudo" });
  const btn = (id, rotulo) => {
    const b = criar("button", { id: `of-aba-${id}`, type: "button", role: "tab", class: "of-aba" }, rotulo);
    b.addEventListener("click", () => {
      aba = id;
      render();
    });
    return b;
  };
  abas.append(btn("oficio", t("oficio.aba")), btn("metas", t("objetivos.titulo")));
  if (fontes.calceteiros) abas.append(btn("calceteiros", t("rank.titulo")));
  raiz.append(abas, corpo);
  function render() {
    for (const b of abas.children) b.setAttribute("aria-selected", String(b.id === `of-aba-${aba}`));
    if (aba === "calceteiros" && fontes.calceteiros) {
      fontes.calceteiros.render();
      corpo.replaceChildren(fontes.calceteiros.el);
      return;
    }
    corpo.replaceChildren(aba === "oficio" ? corpoOficio(fontes.oficio(), { t, tn }) : corpoMetas(fontes.metas(), { t, tn }));
  }
  return { el: raiz, render, abrir(a = "oficio") {
    aba = a;
    render();
  }, aba: () => aba };
}
function corpoColecao(v, { t }, nomeMes) {
  const linhas = [
    ...v.meses.map((m) => ({ id: `col-${m.mes}`, nome: nomeMes(m.mes), est: m.completa ? t("colecao.completa") : t("colecao.mes", { feitos: m.feitos, total: m.total }), completa: m.completa })),
    ...v.pacotes.filter((p) => p.feitos > 0 || p.completa).map((p) => ({ id: `col-${p.id}`, nome: t(`artigo.${p.id}.nome`), est: p.completa ? t("colecao.largo_completo") : t("colecao.mes", { feitos: p.feitos, total: p.total }), completa: p.completa }))
  ];
  return criar(
    "div",
    { id: "colecao", class: "colecao" },
    criar("h3", {}, t("arquivo.sep_colecao")),
    v.vazia ? criar("p", { class: "of-suave" }, t("colecao.vazia")) : criar("p", { class: "of-suave", id: "colecao-resumo" }, t("colecao.resumo", { feitos: v.completas, total: v.quadrados })),
    criar("ul", { class: "of-lista" }, ...linhas.map((l) => criar(
      "li",
      { class: l.completa ? "feito" : "", id: l.id },
      marca(l.completa),
      criar("span", { class: "meta-texto" }, l.nome),
      criar("span", { class: "meta-premio" }, l.est)
    )))
  );
}
export {
  barra,
  corpoColecao,
  corpoMetas,
  corpoOficio,
  criarEcraOficio,
  faixaOficio,
  iconeMeta,
  seloNivel
};
