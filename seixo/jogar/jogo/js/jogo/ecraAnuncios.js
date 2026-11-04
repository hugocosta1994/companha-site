const criar = (tag, attrs = {}, ...filhos) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else if (k === "hidden") e.hidden = !!v;
    else if (k === "disabled") e.disabled = !!v;
    else e.setAttribute(k, v);
  }
  e.append(...filhos);
  return e;
};
function criarOferta({ t }, cfg) {
  const botao = criar("button", { id: cfg.id, type: "button", class: "ec-botao sec ad-botao" });
  const msg = criar("p", { id: `${cfg.id}-msg`, class: "of-suave", role: "status", "aria-live": "polite" });
  const raiz = criar("div", { class: "ad-oferta", "data-slot": cfg.slot, hidden: true }, botao, msg);
  let a_atualizar = false;
  async function atualizar() {
    if (a_atualizar) return;
    a_atualizar = true;
    try {
      if (!cfg.elegivel()) {
        raiz.hidden = true;
        return;
      }
      const ok = await cfg.preparar();
      if (!ok) {
        raiz.hidden = true;
        return;
      }
      botao.textContent = t(cfg.semAnuncios() ? cfg.receber : cfg.ver, cfg.params ? cfg.params() : {});
      botao.disabled = false;
      raiz.hidden = false;
    } catch {
      raiz.hidden = true;
    } finally {
      a_atualizar = false;
    }
  }
  botao.addEventListener("click", async () => {
    botao.disabled = true;
    msg.textContent = "";
    let r;
    try {
      r = await cfg.mostrar();
    } catch {
      r = { ganhou: false, motivo: "erro" };
    }
    if (r.ganhou) {
      msg.textContent = await cfg.aoGanhar();
      raiz.hidden = !msg.textContent;
      botao.hidden = true;
      return;
    }
    if (r.motivo !== "indisponivel") msg.textContent = t("anuncio.fechado_cedo");
    botao.hidden = false;
    await atualizar();
  });
  return { el: raiz, atualizar: () => {
    botao.hidden = false;
    msg.textContent = "";
    return atualizar();
  }, botao };
}
export {
  criarOferta
};
