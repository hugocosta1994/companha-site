import { formatarTempo } from "../nucleo/quadro.js";
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
const tempoS = (s) => formatarTempo(s * 1e3);
function criarEcraQuadro({ t, tn }, fonte, acoes) {
  const raiz = criar("div", { id: "ecra-quadro", class: "of-corpo quadro" });
  let msg = "", cartao = null, verTempo = false;
  function cartaoQuadro() {
    const q = fonte.quadro();
    const linhas = [];
    for (const tam of [6, 8]) for (const f of ["F", "M", "D"]) {
      linhas.push(criar(
        "li",
        { "data-tam": String(tam), "data-faixa": f },
        criar("span", { class: "meta-texto" }, t("quadro.tempo_linha", { tam, faixa: t(`quadro.faixa_${f.toLowerCase()}`) })),
        criar("span", { class: "meta-premio" }, formatarTempo(q.tempo[tam][f]))
      ));
    }
    const tec = Object.keys(q.tecnicas);
    return criar(
      "div",
      { class: "ec-cartao of-cartao", id: "quadro-cartao" },
      criar("h3", {}, t("quadro.titulo")),
      criar("p", { class: "of-suave" }, t("quadro.nota")),
      criar("h3", {}, t("quadro.tempos")),
      criar("ul", { class: "of-lista", id: "quadro-tempos" }, ...linhas),
      criar("p", { id: "quadro-serie" }, q.serie > 0 ? t("quadro.serie", { n: q.serie }) : `${t("quadro.serie", { n: "\u2014" })}`),
      criar("p", { id: "quadro-pracas" }, t("quadro.pracas", { n: q.pracas })),
      criar("p", { id: "quadro-meses", class: "of-suave" }, q.mesesSeguidos > 0 ? t("quadro.meses", { n: q.mesesSeguidos }) : ""),
      criar("p", { id: "quadro-puzzles", class: "of-suave" }, t("quadro.puzzles", { sem: q.semPista, com: q.comPista })),
      criar("h3", {}, t("quadro.tecnicas")),
      criar("ul", { class: "of-lista", id: "quadro-tecnicas" }, ...tec.length ? tec.map((id) => criar("li", { "data-id": id }, id)) : [criar("li", {}, "\u2014")])
    );
  }
  function cartaoDesafio() {
    const campo = criar("input", { id: "desafio-campo", type: "text", maxlength: "300", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", "aria-label": t("desafio.campo"), class: "calc-campo" });
    const ver = criar("button", { id: "desafio-abrir", type: "button", class: "ec-botao cheio" }, t("desafio.abrir"));
    const colar = criar("button", { id: "desafio-colar", type: "button", class: "ec-botao sec" }, t("desafio.colar"));
    const aviso = criar("p", { id: "desafio-msg", class: "of-suave", role: "status" }, msg);
    const abrir = () => {
      const r = acoes.ler(campo.value);
      if (!r.ok) {
        cartao = null;
        msg = t(r.erro === "versao" ? "desafio.outra_versao" : "desafio.invalido");
      } else {
        cartao = r;
        verTempo = false;
        msg = "";
      }
      render();
    };
    ver.addEventListener("click", abrir);
    colar.addEventListener("click", async () => {
      try {
        campo.value = await acoes.colar();
      } catch {
        campo.value = "";
      }
      abrir();
    });
    const partes = [criar("h3", {}, t("desafio.titulo")), criar("p", { class: "of-suave" }, t("desafio.nota")), campo, colar, ver, aviso];
    if (cartao) partes.push(cartaoRecebido());
    const hist = fonte.historico();
    if (hist.length) {
      const apagar = criar("button", { id: "desafio-apagar", type: "button", class: "ec-botao sec" }, t("desafio.apagar"));
      apagar.addEventListener("click", () => {
        acoes.apagar();
        render();
      });
      partes.push(
        criar("h3", {}, t("desafio.historico")),
        criar("ul", { class: "of-lista", id: "desafio-historico" }, ...hist.map((h) => criar(
          "li",
          { class: "feito" },
          criar("span", { class: "meta-texto" }, t(`desafio.${h.resultado}`)),
          criar("span", { class: "meta-premio" }, t("desafio.tempos", { dele: tempoS(h.tempoDele), meu: tempoS(h.meuTempo) }))
        ))),
        apagar
      );
    }
    return criar("div", { class: "ec-cartao of-cartao", id: "desafio-cartao" }, ...partes);
  }
  function cartaoRecebido() {
    const c = cartao;
    const jogar = criar("button", { id: "desafio-jogar", type: "button", class: "ec-botao cheio grande" }, t("desafio.jogar"));
    jogar.addEventListener("click", () => {
      if (acoes.jogar(c) === "desconhecido") {
        msg = t("desafio.desconhecido");
        render();
      }
    });
    const partes = [criar("h3", {}, t("desafio.de", { nome: c.nome || "Calceteiro" })), criar("p", { class: "of-suave" }, `${c.n}x${c.n} \xB7 ${t(`quadro.faixa_${c.faixa.toLowerCase()}`)}`)];
    if (c.tempoS > 0) {
      if (verTempo) partes.push(criar("p", { id: "desafio-tempo" }, t("desafio.tempo_dele", { tempo: tempoS(c.tempoS) })));
      else {
        const b = criar("button", { id: "desafio-ver-tempo", type: "button", class: "ec-botao sec" }, t("desafio.ver_tempo"));
        b.addEventListener("click", () => {
          verTempo = true;
          render();
        });
        partes.push(criar("p", { class: "of-suave" }, t("desafio.escondido")), b);
      }
    }
    partes.push(jogar);
    return criar("div", { id: "desafio-recebido" }, ...partes);
  }
  function render() {
    const campo = raiz.querySelector("#desafio-campo"), valor = campo ? campo.value : "";
    raiz.replaceChildren(cartaoQuadro(), cartaoDesafio());
    const novo = raiz.querySelector("#desafio-campo");
    if (novo) novo.value = valor;
  }
  return { el: raiz, render, aviso(txt) {
    msg = txt;
  } };
}
export {
  criarEcraQuadro
};
