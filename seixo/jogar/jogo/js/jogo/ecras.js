function criarEcras({ t, app, acoes }) {
  const criar = (tag, atributos = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(atributos)) {
      if (k === "class") e.className = v;
      else if (k === "hidden") e.hidden = !!v;
      else e.setAttribute(k, v);
    }
    e.append(...filhos);
    return e;
  };
  const botao = (id, classe, texto, fn) => {
    const b = criar("button", { id, type: "button", class: `ec-botao ${classe}` }, texto);
    if (fn) b.addEventListener("click", fn);
    return b;
  };
  const NS = "http://www.w3.org/2000/svg";
  const ICONES = {
    chama: "M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z",
    lasca: "M12 3 20 8l-2 10-6 3-6-3-2-10z",
    engrenagem: "M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM10.5 2h3l.5 2.6 2 .9 2.2-1.5 2.1 2.1-1.5 2.2.9 2 2.6.5v3l-2.6.5-.9 2 1.5 2.2-2.1 2.1-2.2-1.5-2 .9-.5 2.6h-3l-.5-2.6-2-.9-2.2 1.5-2.1-2.1 1.5-2.2-.9-2L2 13.5v-3l2.6-.5.9-2L4 5.8l2.1-2.1 2.2 1.5 2-.9z",
    inicio: "M3 11 12 3l9 8v10h-6v-6H9v6H3z",
    puzzles: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    praca: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
    loja: "M5 8h14l-1 13H6zM9 8a3 3 0 0 1 6 0",
    calceteiros: "M7 4h10v4a5 5 0 0 1-10 0zM12 13v4M8 20h8M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
    visto: "M4 12.5 9.5 18 20 6.5",
    caminho: "M12 12c-2-3-3.5-4-5.5-4a4 4 0 0 0 0 8c2 0 3.5-1 5.5-4s3.5-4 5.5-4a4 4 0 0 1 0 8c-2 0-3.5-1-5.5-4"
  };
  const icone = (nome, cheio = true) => {
    const sv = document.createElementNS(NS, "svg");
    sv.setAttribute("viewBox", "0 0 24 24");
    sv.setAttribute("width", "24");
    sv.setAttribute("height", "24");
    sv.setAttribute("aria-hidden", "true");
    sv.setAttribute("class", "mn-ico");
    const pa = document.createElementNS(NS, "path");
    pa.setAttribute("d", ICONES[nome]);
    pa.setAttribute("stroke", "currentColor");
    pa.setAttribute("stroke-width", "2");
    pa.setAttribute("stroke-linejoin", "round");
    pa.setAttribute("stroke-linecap", "round");
    pa.setAttribute("fill", cheio ? "currentColor" : "none");
    sv.append(pa);
    return sv;
  };
  const m = {
    titulo: criar("h1", { class: "ec-titulo" }, t("jogo.nome")),
    lascas: criar("span", { id: "menu-lascas", class: "ec-lascas" }),
    serieNum: criar("span", { id: "menu-serie-num" }),
    rotulo: criar("p", { class: "ec-suave" }, t("inicio.puzzle_do_dia")),
    nome: criar("p", { id: "menu-nome", class: "ec-nome" }),
    estado: criar("p", { id: "menu-estado", class: "ec-suave" }),
    objetivo: criar("p", { id: "menu-objetivo", class: "mn-objetivo", hidden: true }),
    jogar: botao("menu-jogar", "cheio grande mn-jogar", t("inicio.jogar"), () => acoes.jogar()),
    semana: criar("div", { id: "menu-semana", class: "mn-semana", role: "list" }),
    semanaSerie: criar("span", { id: "menu-semana-serie", class: "ec-suave" }),
    faixa: criar("div", { id: "menu-faixa", class: "ec-faixa" }),
    build: criar("p", { id: "menu-build", class: "ec-build", hidden: true }),
    dica: criar("p", { id: "menu-dica", class: "ec-dica", role: "status", hidden: true }, t("menu.sair_dica"))
  };
  m.serie = criar("button", { id: "menu-serie", type: "button", class: "mn-chip", "aria-label": t("menu.serie") }, icone("chama"), m.serieNum);
  m.serie.addEventListener("click", () => acoes.abrir("puzzles"));
  m.chipLascas = criar("button", { id: "menu-chip-lascas", type: "button", class: "mn-chip", "aria-label": t("nav.loja") }, icone("lasca"), m.lascas);
  m.chipLascas.addEventListener("click", () => acoes.abrir("loja"));
  m.opcoes = criar("button", { id: "menu-opcoes", type: "button", class: "mn-engrenagem", "aria-label": t("nav.definicoes") }, icone("engrenagem"));
  m.opcoes.addEventListener("click", () => acoes.abrir("opcoes"));
  m.chips = criar("div", { class: "mn-chips" }, m.serie, m.chipLascas);
  m.cab = criar("div", { class: "ec-cab mn-cab" }, m.titulo, m.chips, m.opcoes);
  m.cartao = criar("div", { class: "ec-cartao mn-hero" }, m.rotulo, m.nome, m.estado, m.objetivo, m.jogar);
  m.diario = criar("div", { class: "mn-diario" }, criar("div", { class: "mn-diario-cab" }, criar("span", { class: "mn-sub" }, t("menu.semana")), m.semanaSerie), m.semana);
  const cartaoSec = (id, nome, sub, destino) => {
    const b = criar("button", { id, type: "button", class: "mn-cartao" }, criar("span", { class: "mn-cartao-nome" }, nome), criar("span", { class: "ec-suave" }, sub));
    b.addEventListener("click", () => acoes.abrir(destino));
    return b;
  };
  m.cartaoPuzzles = cartaoSec("menu-puzzles", t("menu.puzzles"), t("menu.puzzles_sub"), "puzzles");
  m.cartaoCalc = cartaoSec("menu-calc", t("menu.calceteiros"), t("rank.titulo"), "calceteiros");
  m.grelha = criar("div", { class: "mn-cartoes" }, m.cartaoPuzzles, m.cartaoCalc);
  m.caminhoNome = criar("span", { class: "mn-cartao-nome" });
  m.caminhoSub = criar("span", { class: "ec-suave" }, "");
  m.caminho = criar(
    "button",
    { id: "menu-caminho", type: "button", class: "mn-cartao mn-continuo" },
    criar("span", { class: "mn-continuo-ic", "aria-hidden": "true" }, icone("caminho", false)),
    criar("span", { class: "mn-continuo-tx" }, m.caminhoNome, m.caminhoSub),
    criar("span", { class: "mn-continuo-seta", "aria-hidden": "true" }, "\u203A")
  );
  m.caminho.addEventListener("click", () => acoes.caminho());
  m.el = criar(
    "section",
    { id: "ecra-menu", class: "ecra ecra-menu", hidden: true, "aria-label": t("jogo.nome") },
    m.cab,
    m.cartao,
    m.caminho,
    m.diario,
    m.grelha,
    m.faixa,
    criar("div", { class: "ec-mola" }),
    m.dica,
    m.build
  );
  const sepDefs = [
    ["inicio", "nav.inicio", "nav-inicio", () => acoes.inicio()],
    ["praca", "nav.praca", "menu-praca", () => acoes.abrir("praca")],
    ["loja", "nav.loja", "menu-loja", () => acoes.abrir("loja")]
  ];
  const nav = { botoes: {} };
  for (const [chave, texto, id, fn] of sepDefs) {
    const b = criar("button", { id, type: "button", class: "nv-sep", "data-sep": chave }, icone(chave, false), criar("span", { class: "nv-rot" }, t(texto)));
    b.addEventListener("click", fn);
    nav.botoes[chave] = b;
  }
  nav.el = criar("nav", { id: "nav-inferior", class: "nav-inferior", hidden: true, "aria-label": t("jogo.nome") }, ...Object.values(nav.botoes));
  nav.mostrar = (ativo, visivel2) => {
    nav.el.hidden = !visivel2;
    app.classList.toggle("com-nav", !!visivel2);
    for (const [k, b] of Object.entries(nav.botoes)) {
      b.classList.toggle("ativo", k === ativo);
      if (k === ativo) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    }
  };
  nav.icone = icone;
  const p = {
    continuar: botao("pausa-continuar", "cheio grande", t("inicio.continuar"), () => acoes.continuar()),
    recomecar: botao("pausa-recomecar", "", t("botao.recomecar"), () => acoes.recomecar()),
    opcoes: botao("pausa-opcoes", "", t("nav.definicoes"), () => acoes.abrir("opcoes", "pausa")),
    comojogar: botao("pausa-comojogar", "", t("pausa.como_jogar"), () => acoes.abrir("comojogar", "pausa")),
    sair: botao("pausa-sair", "sec", t("pausa.sair"), () => acoes.sair())
  };
  p.el = criar(
    "section",
    { id: "ecra-pausa", class: "ecra ecra-pausa", hidden: true, role: "dialog", "aria-label": t("pausa.titulo") },
    criar("div", { class: "ec-mola" }),
    criar("h2", { class: "ec-sub" }, t("pausa.titulo")),
    p.continuar,
    p.recomecar,
    p.opcoes,
    p.comojogar,
    p.sair
  );
  const r = {
    titulo: criar("h1", { class: "ec-titulo centro" }, t("resultado.titulo")),
    linha: criar("p", { id: "res-linha", class: "ec-centro" }),
    host: criar("div", { id: "res-host", class: "res-host" }),
    lascas: criar("p", { id: "res-lascas", class: "ec-centro forte" }),
    desafio: criar("p", { id: "res-desafio", class: "ec-centro forte", role: "status" }),
    desafiar: botao("res-desafiar", "sec", t("desafio.partilhar"), () => acoes.desafiar()),
    partilhar: botao("res-partilhar", "cheio grande", t("resultado.partilhar"), () => acoes.partilhar()),
    seguinte: botao("res-seguinte", "", t("botao.seguinte"), () => acoes.seguinte()),
    menu: botao("res-menu", "sec", t("resultado.menu"), () => acoes.sair())
  };
  r.el = criar(
    "section",
    { id: "ecra-resultado", class: "ecra ecra-resultado", hidden: true, role: "dialog", "aria-label": t("resultado.titulo") },
    r.titulo,
    r.linha,
    r.host,
    r.lascas,
    r.desafio,
    criar("div", { class: "ec-mola" }),
    r.partilhar,
    r.desafiar,
    r.seguinte,
    r.menu
  );
  const s = {
    voltar: botao("sub-voltar", "sec ec-voltar", `\u2039 ${t("comum.voltar")}`, () => acoes.voltar()),
    titulo: criar("h2", { id: "sub-titulo", class: "ec-sub-titulo" }),
    corpo: criar("div", { id: "sub-corpo", class: "ec-sub-corpo" })
  };
  s.abas = criar("div", { id: "sub-abas", class: "mn-abas", role: "tablist", hidden: true });
  s.abaBotoes = {};
  for (const [chave, texto] of [["praca", "nav.praca"], ["puzzles", "menu.puzzles"], ["calceteiros", "menu.calceteiros"]]) {
    const b = criar("button", { id: `sub-aba-${chave}`, type: "button", role: "tab", class: "mn-aba", "aria-selected": "false" }, t(texto));
    b.addEventListener("click", () => acoes.abrir(chave));
    s.abaBotoes[chave] = b;
    s.abas.append(b);
  }
  s.marcarAba = (nome) => {
    s.abas.hidden = !s.abaBotoes[nome];
    for (const [k, b] of Object.entries(s.abaBotoes)) b.setAttribute("aria-selected", String(k === nome));
  };
  s.el = criar(
    "section",
    { id: "ecra-sub", class: "ecra ecra-sub", hidden: true },
    criar("div", { class: "ec-barra" }, s.voltar, s.titulo),
    s.abas,
    s.corpo
  );
  app.append(m.el, r.el, s.el, p.el, nav.el);
  const todos = { menu: m.el, pausa: p.el, resultado: r.el, sub: s.el };
  function mostrar(nome) {
    for (const [k, el] of Object.entries(todos)) el.hidden = k !== nome;
    const cobre = nome === "menu" || nome === "sub" || nome === "pausa";
    for (const n of app.children) {
      if (n === nav.el || Object.values(todos).includes(n)) continue;
      if (cobre) {
        n.setAttribute("inert", "");
        n.setAttribute("aria-hidden", "true");
      } else {
        n.removeAttribute("inert");
        n.removeAttribute("aria-hidden");
      }
    }
  }
  const visivel = () => {
    var _a, _b;
    return (_b = (_a = Object.entries(todos).find(([, el]) => !el.hidden)) == null ? void 0 : _a[0]) != null ? _b : "jogo";
  };
  return { menu: m, nav, pausa: p, resultado: r, sub: s, mostrar, visivel };
}
export {
  criarEcras
};
