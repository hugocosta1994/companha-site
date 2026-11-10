const URL_PRIVACIDADE = "https://hugocosta1994.github.io/companha-legal/privacidade/";
function caixaPrivacidade(t) {
  const l = document.createElement("label");
  l.className = "contas-ck";
  const c = document.createElement("input");
  c.type = "checkbox";
  c.id = "mo-priv";
  const a = document.createElement("a");
  a.id = "mo-priv-link";
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.href = globalThis.CONTAS_CONFIG && globalThis.CONTAS_CONFIG.privacidadeUrl || URL_PRIVACIDADE;
  a.textContent = t("mo.conta.priv_link");
  const s = document.createElement("span");
  s.append(t("mo.conta.priv") + " (", a, ")");
  l.append(c, s);
  return [l, c];
}
function ecraConta(contas, h) {
  const { ecra, topo, btn, par, t } = h;
  const r = ecra("E16");
  r.append(topo(t("mo.conta.titulo")));
  const msg = par("", "msg");
  msg.setAttribute("role", "status");
  const campo = (tipo, chave, ac) => {
    const l = document.createElement("label");
    l.className = "contas-f";
    l.textContent = t(chave);
    const i = document.createElement("input");
    i.type = tipo;
    i.autocomplete = ac;
    l.append(i);
    return [l, i];
  };
  const corpo = document.createElement("div");
  r.append(corpo, msg);
  const reenvio = botaoReenvio(contas, msg, h, () => (corpo.querySelector("input[type=email]") || {}).value);
  const erro = (res) => {
    msg.textContent = res.ok ? "" : t(`mo.conta.erro.${res.erro.codigo}`);
    reenvio(!res.ok && res.erro.codigo === "email_nao_confirmado");
    return res.ok;
  };
  function pintar() {
    corpo.replaceChildren();
    const s = contas.estado();
    if (!s.sessao) {
      corpo.append(par(t("mo.conta.sem_conta"), "sub"));
      const [le, ie] = campo("email", "mo.conta.email", "email"), [lp, ip] = campo("password", "mo.conta.password", "current-password");
      const [lpv, cpv] = caixaPrivacidade(t);
      const ir = async (f) => {
        msg.textContent = t("mo.conta.a_ligar");
        if (erro(await f(ie.value.trim(), ip.value))) pintar();
      };
      const criarC = () => {
        if (!cpv.checked) {
          msg.textContent = t("mo.conta.priv_obrig");
          return;
        }
        ir(contas.criarConta);
      };
      corpo.append(
        le,
        lp,
        lpv,
        btn(t("mo.conta.entrar"), () => ir(contas.entrar), "principal"),
        btn(t("mo.conta.criar"), criarC, "contorno"),
        btn(t("mo.conta.recuperar"), async () => {
          if (erro(await contas.recuperarPassword(ie.value.trim()))) msg.textContent = t("mo.conta.recuperar_ok");
        }),
        par(t("mo.conta.obrigatoria"), "nota")
      );
      return;
    }
    corpo.append(par(`${t("mo.conta.sessao")}: ${s.sessao.email}`, "sub"), par(t(`mo.conta.sync.${s.sync}`), "nota"));
    if (s.conflito) {
      corpo.append(
        par(t("mo.conta.conflito"), "sub"),
        btn(t("mo.conta.usar_nuvem"), async () => {
          await contas.resolverConflito("nuvem");
          h.aoAplicar && h.aoAplicar();
          pintar();
        }, "principal"),
        btn(t("mo.conta.usar_local"), async () => {
          await contas.resolverConflito("local");
          pintar();
        })
      );
    }
    corpo.append(
      btn(t("mo.conta.sair"), async () => {
        await contas.sair();
        if (h.aoSair) h.aoSair();
        else pintar();
      }),
      btn(t("mo.conta.apagar"), async () => {
        if (confirm(t("mo.conta.apagar_conf"))) {
          if (erro(await contas.apagarConta(null)) && h.aoSair) h.aoSair();
          else pintar();
        }
      }, "contorno")
    );
  }
  pintar();
  return { pintar };
}
function botaoReenvio(contas, msg, h, emailDe) {
  let b = null;
  const mostrar = (v) => {
    if (!v) {
      if (b) {
        b.remove();
        b = null;
      }
      return;
    }
    if (b) return;
    b = h.btn(h.t("mo.conta.reenviar"), async () => {
      const email = String(emailDe() || "").trim();
      const x = await contas.reenviarConfirmacao(email);
      msg.textContent = x.ok ? h.t("mo.conta.reenviado").replace("{email}", email) : h.t(`mo.conta.erro.${x.erro.codigo}`);
      if (x.ok) mostrar(false);
    });
    msg.after(b);
  };
  return mostrar;
}
function ecraLogin(contas, h, aoEntrar) {
  const { ecra, btn, par, t } = h;
  const r = ecra("E17");
  r.classList.add("contas-login");
  const h1 = document.createElement("h1");
  h1.textContent = t("mo.login.titulo");
  const msg = par("", "msg");
  msg.setAttribute("role", "status");
  const campo = (tipo, chave, ac) => {
    const l = document.createElement("label");
    l.className = "contas-f";
    l.textContent = t(chave);
    const i = document.createElement("input");
    i.type = tipo;
    i.autocomplete = ac;
    l.append(i);
    return [l, i];
  };
  const [le, ie] = campo("email", "mo.conta.email", "email"), [lp, ip] = campo("password", "mo.conta.password", "current-password");
  const reenvio = botaoReenvio(contas, msg, h, () => ie.value);
  const ir = async (f) => {
    msg.textContent = t("mo.conta.a_ligar");
    const res = await f();
    reenvio(false);
    if (!res.ok) {
      msg.textContent = t(`mo.conta.erro.${res.erro.codigo}`);
      reenvio(res.erro.codigo === "email_nao_confirmado");
      return;
    }
    if (res.precisaConfirmar) {
      msg.textContent = t("mo.login.confirmar");
      return;
    }
    if (contas.estado().sessao) aoEntrar();
    else msg.textContent = "";
  };
  const conteudoG = (txt) => {
    const g = document.createElement("span");
    g.className = "btn-google__g";
    g.setAttribute("aria-hidden", "true");
    const x = document.createElement("span");
    x.className = "btn-google__t";
    x.textContent = txt;
    return [g, x];
  };
  const bg = btn("", async () => {
    if (bg.disabled) return;
    bg.disabled = true;
    bg.setAttribute("aria-busy", "true");
    bg.replaceChildren(...conteudoG(t("mo.login.google_a_abrir")));
    msg.textContent = "";
    try {
      await ir(() => contas.entrarComGoogle());
    } finally {
      bg.disabled = false;
      bg.removeAttribute("aria-busy");
      bg.replaceChildren(...conteudoG(t("mo.login.google")));
    }
  }, "btn-google");
  bg.replaceChildren(...conteudoG(t("mo.login.google")));
  const [lpv, cpv] = caixaPrivacidade(t);
  const criarL = () => {
    if (!cpv.checked) {
      msg.textContent = t("mo.conta.priv_obrig");
      return;
    }
    ir(() => contas.criarConta(ie.value.trim(), ip.value));
  };
  r.append(
    h1,
    par(t("mo.login.sub"), "sub"),
    bg,
    par(t("mo.login.ou"), "nota"),
    le,
    lp,
    lpv,
    btn(t("mo.conta.entrar"), () => ir(() => contas.entrar(ie.value.trim(), ip.value)), "principal"),
    btn(t("mo.conta.criar"), criarL, "contorno"),
    btn(t("mo.conta.recuperar"), async () => {
      const x = await contas.recuperarPassword(ie.value.trim());
      msg.textContent = x.ok ? t("mo.conta.recuperar_ok") : t(`mo.conta.erro.${x.erro.codigo}`);
    }),
    msg
  );
  return r;
}
export {
  URL_PRIVACIDADE,
  ecraConta,
  ecraLogin
};
