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
function cartaoRegresso({ t, tn }, vista, acoes) {
  var _a;
  if (!vista || vista.nivel < 1) return null;
  if (vista.nivel === 1) {
    const texto = criar("p", { id: "regresso-linha-texto", class: "ec-suave" }, t("retorno.hoje"));
    const jogar = vista.sugerido && vista.puzzleRotulo && !vista.aceite ? [botao("regresso-linha-jogar", "sec", t("regresso.sugestao", { puzzle: vista.puzzleRotulo }), () => acoes.jogar())] : [];
    return criar("div", { id: "regresso-linha", class: "mn-retorno-linha", role: "status" }, texto, ...jogar);
  }
  if (!vista.mostrar) return null;
  const partes = [criar("h3", {}, t("retorno.titulo")), criar("p", {}, t(vista.nivel >= 3 ? "retorno.30" : "retorno.7"))];
  if (((_a = vista.mostrarSerie) != null ? _a : vista.recorde > 0) && vista.recorde > 0) partes.push(criar("p", { id: "regresso-serie", class: "ec-suave" }, tn ? tn("retorno.melhor_serie", vista.recorde, { n: vista.recorde }) : t("retorno.melhor_serie", { n: vista.recorde }), " ", t("retorno.serie_nota")));
  if (vista.sugerido && vista.puzzleRotulo) partes.push(criar("p", { id: "regresso-sugestao", class: "ec-suave" }, `${t("retorno.sugestao")} (${vista.puzzleRotulo})`));
  if (vista.nivel >= 3) partes.push(criar("p", { id: "regresso-tens-ca", class: "ec-suave" }, t("regresso.tens_ca", { nivel: vista.nivelOficio })));
  const bts = [
    botao("regresso-jogar", "cheio", t(vista.sugerido ? "retorno.sugestao_jogar" : "retorno.recomecar"), () => acoes.jogar()),
    ...vista.sugerido && vista.recomecar !== false ? [botao("regresso-recomecar", "sec", t("retorno.recomecar"), () => acoes.recomecar())] : [],
    ...vista.aquecer ? [botao("regresso-aquecer", "sec", t("regresso.aquecer"), () => acoes.aquecer())] : [],
    botao("regresso-agora-nao", "sec", t("retorno.sugestao_depois"), () => acoes.dispensar())
  ];
  return criar("div", { id: "regresso-cartao", class: "ec-cartao of-cartao", role: "status" }, ...partes, ...bts);
}
function cartaoSemana({ t, tn }, resumo, abrir) {
  if (!resumo) return null;
  const b = criar(
    "button",
    { id: "resumo-cartao", type: "button", class: "mn-cartao" },
    criar("span", { class: "mn-cartao-nome" }, t("resumo.titulo")),
    criar("span", { class: "ec-suave" }, t("resumo.cartao", { puzzles: resumo.puzzles, tecnicas: resumo.tecnicas.length }))
  );
  b.addEventListener("click", abrir);
  return b;
}
const linhaResumo = (r, t) => {
  const l = [
    criar("li", { "data-k": "puzzles" }, t("resumo.puzzles", { n: r.puzzles, sem: r.semPista })),
    criar("li", { "data-k": "diarios" }, t("resumo.diarios", { n: r.diarios }))
  ];
  if (r.tecnicas.length) l.push(criar("li", { "data-k": "tecnicas" }, t("resumo.tecnicas", { n: r.tecnicas.length })));
  if (r.poGanho > 0) l.push(criar("li", { "data-k": "oficio" }, t("resumo.oficio", { n: r.poGanho })));
  if (r.melhorTempo) l.push(criar("li", { "data-k": "tempo" }, t("resumo.melhor_tempo", { faixa: r.melhorTempo.faixa, seg: r.melhorTempo.seg })));
  if (r.quadrados > 0) l.push(criar("li", { "data-k": "praca" }, t("resumo.praca", { n: r.quadrados })));
  return l;
};
function corpoSemana({ t }, semanas) {
  const lista = [...semanas || []].sort((a, b) => a.iso < b.iso ? 1 : -1);
  return criar(
    "div",
    { id: "resumo-corpo", class: "of-corpo" },
    ...lista.length ? lista.map((r) => criar(
      "div",
      { class: "ec-cartao of-cartao", "data-iso": r.iso },
      criar("h3", {}, t("resumo.semana", { iso: r.iso.replace("-", " ") })),
      criar("ul", { class: "of-lista" }, ...linhaResumo(r, t))
    )) : [criar("p", { id: "resumo-vazio", class: "of-suave" }, t("resumo.vazio"))]
  );
}
function linhaLembrete({ t }, estado, acoes) {
  const cb = criar("input", { id: "def-lembrete", type: "checkbox" });
  const nota = criar("p", { id: "def-lembrete-nota", class: "of-suave", role: "status" });
  cb.checked = !!estado().ligado;
  cb.addEventListener("change", async () => {
    const r = await acoes.mudar(cb.checked);
    cb.checked = !!r.ligado;
    nota.textContent = r.textoChave ? t(r.textoChave) : "";
  });
  return { el: criar("div", { class: "def-linha" }, criar("label", {}, cb, " ", t("lembrete.opcao")), nota), atualizar() {
    cb.checked = !!estado().ligado;
  } };
}
export {
  cartaoRegresso,
  cartaoSemana,
  corpoSemana,
  linhaLembrete
};
