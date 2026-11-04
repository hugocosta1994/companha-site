import { COLUNAS, tempoTexto } from "../nucleo/amigos.js";
const COL_TEXTO = { seq: "rank.col.seguidos", recorde: "calc.col.recorde", po: "rank.col.oficio", diarios: "calc.col.diarios", pracas: "rank.col.pracas", tF: "calc.col.tf", tM: "calc.col.tm", tD: "calc.col.td" };
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
function criarEcraCalceteiros({ t, tn }, fonte, acoes) {
  let coluna = "seq";
  let mensagem = "";
  const raiz = criar("div", { id: "ecra-calceteiros", class: "of-corpo calc" });
  const dizer = (txt) => {
    mensagem = txt;
    const m = raiz.querySelector("#calc-msg");
    if (m) m.textContent = txt;
  };
  function cartao() {
    const c = fonte.cartao();
    const nome = criar("input", { id: "calc-nome", type: "text", maxlength: "16", autocomplete: "off", value: c.nome === "Calceteiro" ? "" : c.nome, placeholder: c.nome, "aria-label": t("calc.nome_rotulo"), class: "calc-campo" });
    const guardar = criar("button", { id: "calc-nome-guardar", type: "button", class: "ec-botao sec" }, t("calc.nome_guardar"));
    guardar.addEventListener("click", () => {
      const r = acoes.guardarNome(nome.value);
      dizer(t(r.ok ? "calc.nome_guardado" : "calc.nome_invalido"));
      if (r.ok) render();
    });
    const codigo = criar("p", { id: "calc-codigo", class: "calc-codigo", tabindex: "0" }, fonte.codigo());
    const copiar = criar("button", { id: "calc-copiar", type: "button", class: "ec-botao cheio" }, t("calc.copiar"));
    copiar.addEventListener("click", async () => {
      dizer(t(await acoes.copiar() ? "calc.copiado" : "calc.nao_copiou"));
    });
    const part = criar("button", { id: "calc-partilhar", type: "button", class: "ec-botao sec" }, t("calc.partilhar"));
    part.addEventListener("click", () => {
      acoes.partilhar();
    });
    return criar(
      "div",
      { class: "ec-cartao of-cartao", id: "calc-cartao" },
      criar("h3", {}, t("calc.meu_cartao")),
      criar("label", { class: "of-suave", for: "calc-nome" }, t("calc.nome_rotulo")),
      nome,
      guardar,
      criar("p", { class: "of-suave" }, `${t(`oficio.nivel.${c.nivel}`)} \xB7 ${tn("oficio.pontos", c.po, { n: c.po })}`),
      criar("h3", {}, t("rank.codigo_teu", { codigo: "" }).replace(/[: ]+$/, "")),
      codigo,
      copiar,
      part,
      criar("p", { class: "of-suave" }, t("calc.sem_spoilers")),
      criar("p", { class: "of-suave" }, t("rank.local_nota"))
    );
  }
  function adicionar() {
    const campo = criar("input", { id: "calc-colar", type: "text", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", "aria-label": t("rank.codigo_pede"), placeholder: "SEIXO-\u2026", class: "calc-campo" });
    const b = criar("button", { id: "calc-adicionar", type: "button", class: "ec-botao cheio" }, t("rank.adicionar"));
    b.addEventListener("click", () => {
      const r = acoes.adicionar(campo.value);
      if (r.ok) {
        dizer(t("rank.amigo_juntado", { nome: r.nome }));
        campo.value = "";
        render();
      } else dizer(["cheia", "propria", "antigo"].includes(r.erro) ? t(`calc.erro.${r.erro}`) : t("rank.codigo_invalido"));
    });
    return criar("div", { class: "ec-cartao of-cartao", id: "calc-adicionar-cartao" }, criar("label", { class: "of-suave", for: "calc-colar" }, t("rank.codigo_pede")), campo, b);
  }
  function comparar() {
    const chips = criar(
      "div",
      { class: "calc-chips", role: "group", "aria-label": t("calc.comparar") },
      ...COLUNAS.map((c) => {
        const b = criar("button", { id: `calc-col-${c}`, type: "button", class: "ec-botao sec calc-chip", "aria-pressed": String(c === coluna) }, t(COL_TEXTO[c]));
        b.addEventListener("click", () => {
          coluna = c;
          render();
        });
        return b;
      })
    );
    const tab = fonte.tabela(coluna);
    const lista = criar("ul", { class: "of-lista calc-tabela", id: "calc-tabela" }, ...tab.linhas.map((l) => {
      const li = criar(
        "li",
        { class: l.proprio ? "calc-eu" : "", "data-id": l.id },
        criar("span", { class: "meta-texto" }, l.proprio ? `${l.nome} (${t("rank.tu").toLowerCase()})` : l.nome),
        criar("span", { class: "meta-premio" }, l.texto)
      );
      if (!l.proprio) {
        const rm = criar("button", { type: "button", id: `calc-rm-${l.id}`, class: "ec-botao sec calc-rm", "aria-label": `${t("rank.remover")} ${l.nome}` }, "\xD7");
        rm.addEventListener("click", () => {
          if (confirm(t("calc.remover_confirmar"))) {
            acoes.remover(l.id);
            render();
          }
        });
        li.append(rm);
      }
      return li;
    }));
    return criar(
      "div",
      { class: "ec-cartao of-cartao", id: "calc-comparar" },
      criar("h3", {}, t("rank.titulo")),
      chips,
      lista,
      fonte.amigos() === 0 ? criar("p", { class: "of-suave", id: "calc-vazio" }, t("rank.vazio")) : criar("p", { class: "of-suave" }, t("rank.sequencia_cuidado"))
    );
  }
  function recordes() {
    const r = fonte.recordes();
    const maxN = Math.max(1, ...r.meses.map((m) => m.n));
    const barras = criar(
      "div",
      { class: "calc-barras", id: "calc-meses", role: "img", "aria-label": t("calc.rec_meses") },
      ...r.meses.map((m) => criar("span", { class: "calc-barra", title: `${m.mes}: ${m.n}`, style: `height:${Math.max(2, Math.round(m.n / maxN * 48))}px` }))
    );
    const linhas = [
      t("calc.rec_sequencia", { n: r.recorde }),
      ...["F", "M", "D"].map((f) => r.tempos[f] > 0 ? t("calc.rec_tempo", { faixa: t(`faixa.${f.toLowerCase()}`), tempo: tempoTexto(r.tempos[f]) }) : t("calc.rec_sem_tempo", { faixa: t(`faixa.${f.toLowerCase()}`) })),
      t("calc.rec_mes", { n: r.diariosMes }),
      t("calc.rec_total", { n: r.diarios }),
      t("calc.rec_pracas", { n: r.pracas })
    ];
    return criar(
      "div",
      { class: "ec-cartao of-cartao", id: "calc-recordes" },
      criar("h3", {}, t("calc.recordes")),
      criar("ul", { class: "of-lista" }, ...linhas.map((x) => criar("li", {}, x))),
      criar("p", { class: "of-suave" }, t("calc.rec_meses")),
      barras
    );
  }
  function render() {
    raiz.replaceChildren(criar("p", { class: "of-suave" }, t("rank.intro")), criar("p", { id: "calc-msg", class: "of-suave", role: "status", "aria-live": "polite" }, mensagem), cartao(), adicionar(), comparar(), recordes());
  }
  return { el: raiz, render, dizer };
}
export {
  criarEcraCalceteiros
};
