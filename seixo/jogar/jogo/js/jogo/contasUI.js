import { t, temTexto } from "../textos.js";
const SINC_CLASSE = { inativo: "off", a_sincronizar: "wk", ok: "ok", offline: "off", erro: "er", limite: "er" };
const msgErro = (r) => {
  var _a;
  const c = (_a = r == null ? void 0 : r.erro) == null ? void 0 : _a.codigo;
  return t(c && temTexto("contaui.erro." + c) ? "contaui.erro." + c : "contaui.erro.desconhecido");
};
const tx = (k, v = {}) => t("contaui." + k, v);
const URL_PRIVACIDADE = "https://hugocosta1994.github.io/companha-legal/privacidade/";
const urlPrivacidade = () => globalThis.CONTAS_CONFIG && globalThis.CONTAS_CONFIG.privacidadeUrl || URL_PRIVACIDADE;
function criarContasUI({ app, contas, aoSair = null }) {
  const criar = (tag, at = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(at)) {
      if (k === "class") e.className = v;
      else if (k === "hidden") e.hidden = !!v;
      else e.setAttribute(k, v);
    }
    e.append(...filhos);
    return e;
  };
  const btn = (id, classe, texto, fn) => {
    const b = criar("button", { id, type: "button", class: `ec-botao ${classe}` }, ...[].concat(texto));
    b.addEventListener("click", fn);
    return b;
  };
  const lig = (id, texto, fn, classe = "") => {
    const b = criar("button", { id, type: "button", class: `ct-link ${classe}` }, texto);
    b.addEventListener("click", fn);
    return b;
  };
  const campo = (id, rotulo, tipo, auto) => {
    const i = criar("input", { id, type: tipo, autocomplete: auto, ...tipo === "email" ? { inputmode: "email", autocapitalize: "none" } : {} });
    return { i, el: criar("label", { class: "ct-campo", for: id }, rotulo, i) };
  };
  const msg = criar("p", { id: "ct-msg", class: "ct-msg", role: "status", "aria-live": "polite" });
  const aviso = (texto, erro = false) => {
    msg.textContent = texto || "";
    msg.classList.toggle("erro", !!erro);
  };
  const mostrarReenvio = (v) => {
    let b = msg.parentNode && msg.parentNode.querySelector("#ct-e-reenviar");
    if (!v) {
      if (b) b.remove();
      return;
    }
    if (b || !msg.parentNode) return;
    b = lig("ct-e-reenviar", tx("reenviar"), async () => {
      const email = eMail.i.value.trim();
      const r = await contas.reenviarConfirmacao(email);
      if (r.ok) {
        aviso(tx("reenviado", { email }));
        mostrarReenvio(false);
      } else aviso(msgErro(r), true);
    });
    msg.after(b);
  };
  const V = {};
  const NS = "http://www.w3.org/2000/svg";
  const marca = () => {
    const sv = document.createElementNS(NS, "svg");
    sv.setAttribute("viewBox", "0 0 64 64");
    sv.setAttribute("width", "56");
    sv.setAttribute("height", "56");
    sv.setAttribute("aria-label", "Companha");
    sv.innerHTML = '<rect width="64" height="64" rx="14" fill="#1E3A5F"/><path d="M12 38a20 20 0 0 1 40 0" fill="none" stroke="#F2ECDF" stroke-width="6" stroke-linecap="round"/><path d="M20 22v22M32 14v32M44 22v22" stroke="#F2ECDF" stroke-width="6" stroke-linecap="round"/><path d="M32 14l10 4-10 4z" fill="#D2483D"/>';
    return criar("div", { class: "ct-marca" }, sv, criar("h1", { class: "ct-marca-nome" }, tx("marca")));
  };
  const saltarConta = () => {
    var _a, _b, _c;
    try {
      if (((_b = (_a = globalThis.SeixoDebug) == null ? void 0 : _a.semconta) == null ? void 0 : _b.call(_a)) === true) return true;
      const q = new URLSearchParams(((_c = globalThis.location) == null ? void 0 : _c.search) || "");
      return q.get("debug") === "1" && q.get("semconta") === "1";
    } catch {
      return false;
    }
  };
  const precisaLogin = () => {
    var _a, _b;
    try {
      return !saltarConta() && !!(contas && ((_a = contas.ativo) == null ? void 0 : _a.call(contas)) && !((_b = contas.estado) == null ? void 0 : _b.call(contas).sessao));
    } catch {
      return false;
    }
  };
  const conteudoG = (txt) => [criar("span", { class: "btn-google__g", "aria-hidden": "true" }), criar("span", { class: "btn-google__t" }, txt)];
  let vista = "entrar", forcado = false, gOcupado = false, mostradoEm = 0;
  const eMail = campo("ct-e-email", tx("email"), "email", "email"), ePass = campo("ct-e-pass", tx("pass"), "password", "current-password");
  V.entrar = { titulo: tx("titulo"), el: criar(
    "div",
    { class: "ct-vista" },
    marca(),
    criar("p", {}, tx("intro")),
    btn("ct-google", "btn-google", conteudoG(tx("google")), async (ev) => {
      if (ev && (ev.isTrusted === false || Date.now() - mostradoEm < 400)) return;
      if (gOcupado) return;
      gOcupado = true;
      aviso("");
      const b = V.entrar.el.querySelector("#ct-google");
      b.disabled = true;
      b.setAttribute("aria-busy", "true");
      b.classList.add("a-carregar");
      b.replaceChildren(...conteudoG(tx("google_abrir")));
      try {
        const r = await contas.entrarComGoogle();
        if (!r.ok) aviso(msgErro(r), true);
        else atualizar();
      } finally {
        gOcupado = false;
        b.disabled = false;
        b.removeAttribute("aria-busy");
        b.classList.remove("a-carregar");
        b.replaceChildren(...conteudoG(tx("google")));
      }
    }),
    criar("div", { class: "ct-ou" }, tx("ou")),
    eMail.el,
    ePass.el,
    btn("ct-e-entrar", "cheio", tx("entrar"), async () => {
      aviso("");
      const r = await contas.entrar(eMail.i.value.trim(), ePass.i.value);
      if (r.ok) {
        ePass.i.value = "";
        aposLogin();
      } else {
        aviso(msgErro(r), true);
        mostrarReenvio(r.erro.codigo === "email_nao_confirmado");
      }
    }),
    lig("ct-ir-criar", tx("criar_link"), () => mostrar("criar")),
    lig("ct-ir-rec", tx("recuperar_link"), () => mostrar("recuperar")),
    criar("small", { class: "ct-sy" }, criar("i", { class: "ct-d off" }), tx("obrig_nota"))
  ) };
  const cMail = campo("ct-c-email", tx("email"), "email", "email"), cPass = campo("ct-c-pass", tx("pass"), "password", "new-password");
  const cOk = criar("input", { id: "ct-c-priv", type: "checkbox" });
  V.criar = { titulo: tx("criar_titulo"), el: criar(
    "div",
    { class: "ct-vista" },
    criar("p", {}, tx("criar_intro")),
    cMail.el,
    cPass.el,
    criar("label", { class: "ct-ck", for: "ct-c-priv" }, cOk, criar("span", {}, tx("privac"), " (", criar("a", { id: "ct-c-priv-link", href: urlPrivacidade(), target: "_blank", rel: "noopener noreferrer" }, tx("privac_link")), ")")),
    btn("ct-c-criar", "cheio", tx("criar_btn"), async () => {
      var _a;
      aviso("");
      if (!cOk.checked) {
        aviso(tx("privac_obrig"), true);
        return;
      }
      const email = cMail.i.value.trim();
      const r = await contas.criarConta(email, cPass.i.value);
      if (!r.ok) {
        aviso(msgErro(r), true);
        return;
      }
      cPass.i.value = "";
      if ((_a = contas.estado) == null ? void 0 : _a.call(contas).sessao) aposLogin();
      else aviso(tx("confirmar", { email }));
    }),
    lig("ct-c-ja", tx("ja_tenho"), () => mostrar("entrar")),
    criar("small", { class: "ct-sy" }, criar("i", { class: "ct-d ok" }), tx("criar_nota"))
  ) };
  const rMail = campo("ct-r-email", tx("email"), "email", "email");
  V.recuperar = { titulo: tx("rec_titulo"), el: criar(
    "div",
    { class: "ct-vista" },
    rMail.el,
    btn("ct-r-enviar", "cheio", tx("rec_btn"), async () => {
      aviso("");
      const email = rMail.i.value.trim();
      const r = await contas.recuperarPassword(email);
      if (r.ok) aviso(tx("rec_ok", { email }));
      else aviso(msgErro(r), true);
    })
  ) };
  const cEmail = criar("p", { id: "ct-conta-email", class: "ct-email" });
  const sincPonto = criar("i", { class: "ct-d off" }), sincT = criar("b", {}), sincS = criar("small", {});
  const sinc = criar("div", { id: "ct-sinc", class: "ct-st", role: "status", "aria-live": "polite" }, sincPonto, criar("div", {}, sincT, criar("br"), sincS));
  V.conta = { titulo: tx("titulo"), el: criar(
    "div",
    { class: "ct-vista" },
    cEmail,
    sinc,
    btn("ct-agora", "cheio", tx("agora"), async () => {
      var _a;
      aviso("");
      await ((_a = contas.carregar) == null ? void 0 : _a.call(contas));
      atualizar();
    }),
    btn("ct-sair", "sec", tx("sair"), async () => {
      const r = await contas.sair();
      if (r.ok) {
        mostrar("entrar");
        aviso(tx("saiu"));
      } else aviso(msgErro(r), true);
    }),
    btn("ct-exportar", "sec", tx("exportar"), async () => {
      const r = await contas.exportar();
      if (!r.ok) {
        aviso(msgErro(r), true);
        return;
      }
      try {
        const u = URL.createObjectURL(new Blob([r.json], { type: "application/json" }));
        criar("a", { href: u, download: "companha-dados.json" }).click();
        setTimeout(() => URL.revokeObjectURL(u), 4e3);
        aviso(tx("exportado"));
      } catch {
        aviso(t("contaui.erro.desconhecido"), true);
      }
    }),
    lig("ct-ir-eliminar", tx("eliminar_link"), () => mostrar("eliminar"), "perigo")
  ) };
  const xPass = campo("ct-x-pass", tx("pass"), "password", "current-password"), xManter = criar("input", { id: "ct-x-manter", type: "checkbox", checked: "checked" });
  const xNota = criar("p", { class: "ec-suave" });
  V.eliminar = { titulo: tx("eliminar_titulo"), el: criar(
    "div",
    { class: "ct-vista" },
    criar("p", { class: "ct-aviso" }, tx("eliminar_aviso")),
    xNota,
    xPass.el,
    criar("label", { class: "ct-ck", for: "ct-x-manter" }, xManter, criar("span", {}, tx("manter"))),
    btn("ct-x-eliminar", "cheio perigo", tx("eliminar_btn"), async () => {
      aviso("");
      const r = await contas.apagarConta(xPass.el.hidden ? null : xPass.i.value);
      if (!r.ok) {
        aviso(msgErro(r), true);
        return;
      }
      xPass.i.value = "";
      if (!xManter.checked) {
        try {
          for (const k of Object.keys(localStorage)) if (k.startsWith("contas:")) localStorage.removeItem(k);
        } catch {
        }
      }
      mostrar("entrar");
      aviso(tx("eliminada"));
    }),
    btn("ct-x-cancelar", "sec", tx("cancelar"), () => mostrar("conta"))
  ) };
  const resolver = async (lado) => {
    const r = await contas.resolverConflito(lado);
    if ((r == null ? void 0 : r.ok) === false) aviso(msgErro(r), true);
    else mostrar("conta");
  };
  V.conflito = { titulo: tx("conf_titulo"), el: criar(
    "div",
    { class: "ct-vista" },
    criar("p", {}, tx("conf_intro")),
    btn("ct-conf-nuvem", "cheio", tx("conf_nuvem"), () => resolver("nuvem")),
    btn("ct-conf-local", "sec", tx("conf_local"), () => resolver("local"))
  ) };
  const titulo = criar("h2", { id: "ct-titulo", class: "ec-sub-titulo" });
  const voltar = btn("ct-voltar", "sec ec-voltar", `\u2039 ${tx("voltar")}`, () => voltarDeVista());
  const el = criar(
    "section",
    { id: "ecra-conta", class: "ecra ecra-conta", hidden: true, role: "dialog", "aria-labelledby": "ct-titulo" },
    criar("div", { class: "ec-barra" }, voltar, titulo),
    msg,
    ...Object.values(V).map((v) => {
      v.el.hidden = true;
      return v.el;
    })
  );
  app.append(el);
  function pintar(nome) {
    vista = nome;
    for (const [k, v] of Object.entries(V)) v.el.hidden = k !== nome;
    titulo.textContent = V[nome].titulo;
  }
  function mostrar(nome) {
    var _a, _b;
    aviso("");
    mostradoEm = Date.now();
    if (nome === "eliminar") {
      const g = ((_b = (_a = contas.estado) == null ? void 0 : _a.call(contas).sessao) == null ? void 0 : _b.fornecedor) === "google";
      xPass.el.hidden = g;
      xNota.textContent = g ? tx("eliminar_google") : tx("eliminar_pass_nota");
    }
    if (nome === "entrar" && !el.hidden && precisaLogin()) forcado = true;
    pintar(nome);
    atualizar();
  }
  function sincVoltar() {
    voltar.hidden = precisaLogin() && vista === "entrar";
  }
  function atualizar() {
    var _a, _b;
    const e = ((_a = contas.estado) == null ? void 0 : _a.call(contas)) || { sessao: null, sync: "inativo", conflito: null };
    if (e.conflito && vista !== "conflito") pintar("conflito");
    else if (!e.sessao && el.hidden && precisaLogin()) exigir();
    else if (!e.sessao && (vista === "conta" || vista === "eliminar")) {
      pintar("entrar");
      if (!el.hidden && precisaLogin()) forcado = true;
    } else if (e.sessao && (vista === "entrar" || vista === "criar") && !el.hidden) {
      if (forcado) {
        fechar();
      } else pintar("conta");
    }
    cEmail.textContent = ((_b = e.sessao) == null ? void 0 : _b.email) || "";
    const est = SINC_CLASSE[e.sync] ? e.sync : "inativo", cls = SINC_CLASSE[est], tt = t(`contaui.sinc.${est}.titulo`), ss = t(`contaui.sinc.${est}.detalhe`);
    sincVoltar();
    sincPonto.className = `ct-d ${cls}`;
    sincT.textContent = tt;
    sincS.textContent = ss;
  }
  function voltarDeVista() {
    if (precisaLogin() && vista === "entrar") return;
    if (vista === "criar" || vista === "recuperar") mostrar("entrar");
    else if (vista === "eliminar") mostrar("conta");
    else fechar();
  }
  const aposLogin = () => {
    if (forcado) fechar();
    else mostrar("conta");
  };
  function exigir() {
    forcado = true;
    el.hidden = false;
    mostrar("entrar");
  }
  function abrir() {
    var _a, _b;
    const e = (_a = contas.estado) == null ? void 0 : _a.call(contas);
    mostrar((e == null ? void 0 : e.conflito) ? "conflito" : (e == null ? void 0 : e.sessao) ? "conta" : "entrar");
    el.hidden = false;
    (_b = voltar.focus) == null ? void 0 : _b.call(voltar);
  }
  function fechar() {
    if (precisaLogin()) return;
    forcado = false;
    el.hidden = true;
    aoSair == null ? void 0 : aoSair();
  }
  const botao = criar("button", { id: "btn-conta", type: "button", class: "ec-botao sec ct-abrir", hidden: !contas }, tx("abrir"));
  botao.addEventListener("click", abrir);
  return {
    el,
    botao,
    abrir,
    fechar,
    atualizar,
    exigir,
    precisaLogin,
    aoMudar: () => {
      atualizar();
    },
    vista: () => el.hidden ? null : vista,
    voltar: () => {
      if (el.hidden) return false;
      voltarDeVista();
      return true;
    }
    // para o botão Voltar do Android
  };
}
async function carregarContas() {
  var _a;
  try {
    return (_a = (await import("../contas/contas.js")).contas) != null ? _a : null;
  } catch {
    return null;
  }
}
export {
  URL_PRIVACIDADE,
  carregarContas,
  criarContasUI
};
