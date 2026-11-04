const TX = {
  titulo: "Conta",
  abrir: "Conta e sincroniza\xE7\xE3o",
  voltar: "Voltar",
  intro: "Uma conta para todos os jogos. O teu progresso vai contigo.",
  google: "Continuar com Google",
  googleAbrir: "A abrir o Google\u2026",
  ou: "ou",
  email: "Email",
  pass: "Palavra-passe",
  entrar: "Entrar com email",
  criarLink: "Criar conta",
  recuperarLink: "Esqueci a palavra-passe",
  marca: "COMPANHA",
  obrigNota: "Precisas de uma conta para jogar. O progresso fica guardado na nuvem.",
  criarTitulo: "Criar conta",
  criarIntro: "Enviamos-te uma liga\xE7\xE3o para confirmar o email. S\xF3 depois de confirmares a conta fica ativa.",
  privac: "Li a pol\xEDtica de privacidade",
  criarBtn: "Criar conta",
  jaTenho: "J\xE1 tenho conta",
  criarNota: "O progresso deste aparelho passa para a conta.",
  confirmar: "Envi\xE1mos uma liga\xE7\xE3o de confirma\xE7\xE3o para {email}. Abre-a e volta aqui para entrar.",
  recTitulo: "Recuperar palavra-passe",
  recBtn: "Enviar liga\xE7\xE3o",
  recOk: "Se o email existir, envi\xE1mos uma liga\xE7\xE3o para {email}.",
  agora: "Sincronizar agora",
  sair: "Terminar sess\xE3o",
  exportar: "Exportar os meus dados",
  eliminarLink: "Eliminar conta e dados",
  eliminarTitulo: "Eliminar conta",
  eliminarAviso: "Isto apaga a conta e o progresso guardado na nuvem, em todos os jogos Companha. N\xE3o se pode desfazer.",
  eliminarPassNota: "Confirma com a tua palavra-passe.",
  eliminarGoogle: "Vais confirmar de novo com a Google.",
  manter: "Manter o progresso neste aparelho",
  eliminarBtn: "Eliminar para sempre",
  cancelar: "Cancelar",
  eliminada: "Conta eliminada.",
  saiu: "Sess\xE3o terminada. O progresso continua neste aparelho.",
  exportado: "Dados exportados.",
  confTitulo: "Qual progresso queres manter?",
  confIntro: "A nuvem e este aparelho t\xEAm progressos diferentes. A outra vers\xE3o fica guardada para desfazer.",
  confNuvem: "Usar progresso da nuvem",
  confLocal: "Usar progresso deste aparelho",
  privacLink: "ler",
  privacObrig: "Aceita a pol\xEDtica de privacidade para criar a conta."
};
const SINC = {
  inativo: ["off", "Sem sess\xE3o", "o progresso fica s\xF3 neste aparelho"],
  a_sincronizar: ["wk", "A sincronizar\u2026", "a enviar o progresso"],
  ok: ["ok", "Sincronizado", "o progresso est\xE1 na nuvem"],
  offline: ["off", "Sem liga\xE7\xE3o", "guardado no aparelho; sincroniza ao voltar"],
  erro: ["er", "Falhou", "vamos tentar outra vez"],
  limite: ["er", "Progresso grande demais", "passa de 50 KB; fica guardado s\xF3 neste aparelho"]
};
const ERROS = {
  rede: "Sem liga\xE7\xE3o. Tenta outra vez quando tiveres rede.",
  credenciais: "Email ou palavra-passe errados.",
  email_existe: "J\xE1 existe uma conta com este email.",
  email_invalido: "Escreve um email v\xE1lido.",
  password_fraca: "Palavra-passe fraca: usa 8 ou mais caracteres.",
  cancelado: "Cancelaste o login com Google. Toca outra vez quando quiseres.",
  google_indisponivel: "O login com Google ainda n\xE3o est\xE1 dispon\xEDvel nesta vers\xE3o. Usa o email e a palavra-passe.",
  google_sem_conta: "N\xE3o encontrei uma conta Google neste telem\xF3vel. Adiciona uma nas Defini\xE7\xF5es ou usa o email.",
  google_falhou: "N\xE3o foi poss\xEDvel entrar com Google. Tenta de novo ou usa o email.",
  sem_sessao: "A sess\xE3o terminou. Entra de novo.",
  conflito: "O progresso mudou noutro aparelho.",
  limite: "O progresso \xE9 grande demais para a nuvem.",
  desconhecido: "Algo correu mal. Tenta outra vez."
};
const msgErro = (r) => {
  var _a;
  return ERROS[(_a = r == null ? void 0 : r.erro) == null ? void 0 : _a.codigo] || ERROS.desconhecido;
};
const tx = (k, v = {}) => {
  var _a;
  let s = (_a = TX[k]) != null ? _a : k;
  for (const [a, b] of Object.entries(v)) s = s.replace(`{${a}}`, b);
  return s;
};
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
    var _a;
    try {
      const q = new URLSearchParams(((_a = globalThis.location) == null ? void 0 : _a.search) || "");
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
  let vista = "entrar", forcado = false, gOcupado = false;
  const eMail = campo("ct-e-email", tx("email"), "email", "email"), ePass = campo("ct-e-pass", tx("pass"), "password", "current-password");
  V.entrar = { titulo: tx("titulo"), el: criar(
    "div",
    { class: "ct-vista" },
    marca(),
    criar("p", {}, tx("intro")),
    btn("ct-google", "btn-google", conteudoG(tx("google")), async () => {
      if (gOcupado) return;
      gOcupado = true;
      aviso("");
      const b = V.entrar.el.querySelector("#ct-google");
      b.disabled = true;
      b.setAttribute("aria-busy", "true");
      b.classList.add("a-carregar");
      b.replaceChildren(...conteudoG(tx("googleAbrir")));
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
      } else aviso(msgErro(r), true);
    }),
    lig("ct-ir-criar", tx("criarLink"), () => mostrar("criar")),
    lig("ct-ir-rec", tx("recuperarLink"), () => mostrar("recuperar")),
    criar("small", { class: "ct-sy" }, criar("i", { class: "ct-d off" }), tx("obrigNota"))
  ) };
  const cMail = campo("ct-c-email", tx("email"), "email", "email"), cPass = campo("ct-c-pass", tx("pass"), "password", "new-password");
  const cOk = criar("input", { id: "ct-c-priv", type: "checkbox" });
  V.criar = { titulo: tx("criarTitulo"), el: criar(
    "div",
    { class: "ct-vista" },
    criar("p", {}, tx("criarIntro")),
    cMail.el,
    cPass.el,
    criar("label", { class: "ct-ck", for: "ct-c-priv" }, cOk, criar("span", {}, tx("privac"), " (", criar("a", { id: "ct-c-priv-link", href: urlPrivacidade(), target: "_blank", rel: "noopener noreferrer" }, tx("privacLink")), ")")),
    btn("ct-c-criar", "cheio", tx("criarBtn"), async () => {
      var _a;
      aviso("");
      if (!cOk.checked) {
        aviso(tx("privacObrig"), true);
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
    lig("ct-c-ja", tx("jaTenho"), () => mostrar("entrar")),
    criar("small", { class: "ct-sy" }, criar("i", { class: "ct-d ok" }), tx("criarNota"))
  ) };
  const rMail = campo("ct-r-email", tx("email"), "email", "email");
  V.recuperar = { titulo: tx("recTitulo"), el: criar(
    "div",
    { class: "ct-vista" },
    rMail.el,
    btn("ct-r-enviar", "cheio", tx("recBtn"), async () => {
      aviso("");
      const email = rMail.i.value.trim();
      const r = await contas.recuperarPassword(email);
      if (r.ok) aviso(tx("recOk", { email }));
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
        aviso(ERROS.desconhecido, true);
      }
    }),
    lig("ct-ir-eliminar", tx("eliminarLink"), () => mostrar("eliminar"), "perigo")
  ) };
  const xPass = campo("ct-x-pass", tx("pass"), "password", "current-password"), xManter = criar("input", { id: "ct-x-manter", type: "checkbox", checked: "checked" });
  const xNota = criar("p", { class: "ec-suave" });
  V.eliminar = { titulo: tx("eliminarTitulo"), el: criar(
    "div",
    { class: "ct-vista" },
    criar("p", { class: "ct-aviso" }, tx("eliminarAviso")),
    xNota,
    xPass.el,
    criar("label", { class: "ct-ck", for: "ct-x-manter" }, xManter, criar("span", {}, tx("manter"))),
    btn("ct-x-eliminar", "cheio perigo", tx("eliminarBtn"), async () => {
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
  V.conflito = { titulo: tx("confTitulo"), el: criar(
    "div",
    { class: "ct-vista" },
    criar("p", {}, tx("confIntro")),
    btn("ct-conf-nuvem", "cheio", tx("confNuvem"), () => resolver("nuvem")),
    btn("ct-conf-local", "sec", tx("confLocal"), () => resolver("local"))
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
    if (nome === "eliminar") {
      const g = ((_b = (_a = contas.estado) == null ? void 0 : _a.call(contas).sessao) == null ? void 0 : _b.fornecedor) === "google";
      xPass.el.hidden = g;
      xNota.textContent = g ? tx("eliminarGoogle") : tx("eliminarPassNota");
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
    const [cls, tt, ss] = SINC[e.sync] || SINC.inativo;
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
