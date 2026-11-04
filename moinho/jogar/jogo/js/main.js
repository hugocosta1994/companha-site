import { carregarTextos, t } from "./textos.js";
import { emitir, ouvir } from "./eventos.js";
import { ligarCicloDeVida } from "./plataforma/nativo.js";
import { ler, escrever, CHAVE, CHAVE_STATS, CHAVE_PUZZLES, lerJSON, escreverJSON, apagar } from "./plataforma/gravacao.js";
import { VERSAO, PERSONALIDADES, PERSONALIDADE_PADRAO, PUZZLES } from "./config.js";
import { iniciarPartida } from "./jogo/controlo.js";
import { criarTabuleiro, desenhar, marcarMoinho, limparMoinho, iconePeca } from "./jogo/vista.js";
import { fase, destinos, jogar as jogarRegra, aplicar } from "./nucleo/regras.js";
import { novaPartida, jogarCompleta } from "./nucleo/partida.js";
import { escolherJogada } from "./nucleo/ia.js";
import { estadoDoPuzzle, avaliarJogada, moinhosEmUm } from "./nucleo/puzzles.js";
import { registar, registarGlobais, taxaVitoria, vitoriasPorNivel, modoDe, total, mediaJogadas, validarStats, validarResolvidos, vitoriasIA, tipoAberto, resolvidosDoTipo, proximoPuzzle } from "./nucleo/estatisticas.js";
import { contas } from "./contas/contas.js";
import { ecraConta, ecraLogin } from "./contas/contas-ui.js";
import { JOGO_ID, SCHEMA, lerProgresso, merge as mergeConta } from "./contas/progresso-conta.js";
import { validarGravacao } from "./nucleo/gravacao.js";
import { CHAVE_META, CONQUISTAS, TEMAS_ORDEM, validarMeta, rankDe, proximoRank, hojeISO, registarFim, temaAberto, nivelDe, proximoNivel, patenteDeNivel, xpDoNivel, estadoDesafio, serieAtual, conquistaEvento } from "./nucleo/meta.js";
import { criarConvite, jogarNaPartida, importarCodigo, estadoDaPartida, corDe, lerCodigo, novoPerfil, gerarCartao, adicionarAmigo, ordenarTabela, sugerirNivel, SEMENTE_MAX, posicaoDoDia, sementeDoDia, podeJogarDesafio } from "./nucleo/multijogador.js";
import { normalizarEntrada, agrupar, estadoLista, contarMinhaVez, diasDesde, ultimaDoAdversario, resultadoFim, desistir, apagar as apagarPartida, carregarLista, guardarLista, textoPartilha } from "./nucleo/partidas.js";
import { NIVEIS_ORDEM } from "./config.js";
import { criarCompras, playIdDoTema } from "./plataforma/compras.js";
const app = document.getElementById("app");
const fmt = (k, v = {}) => t(k).replace(/\{(\w+)\}/g, (_, c) => c in v ? v[c] : `{${c}}`);
const PADRAO = { versao: 0, partida: null, opcoes: { som: true, destaques: true, daltonico: false, vibrar: true }, tutorialVisto: false };
let dados = JSON.parse(JSON.stringify(PADRAO));
let jogoAtual = null;
let cfgAtual = null;
let ecraAtual = "E1";
let origemOpcoes = null;
let avisoGravacao = false;
let stats = {}, resolvidos = {}, puzzles = [], meta = validarMeta(null), temas = {};
let ocupadoConta = false;
let partidas = [];
const sincronizar = () => {
  try {
    contas.guardar(lerProgresso(meta, stats, resolvidos));
  } catch {
  }
};
function aplicarConta(d) {
  if (!d || typeof d !== "object") return;
  meta = validarMeta(d.meta);
  stats = validarStats(d.stats);
  resolvidos = validarResolvidos(d.resolvidos);
  escreverJSON(CHAVE_META, meta);
  escreverJSON(CHAVE_STATS, stats);
  escreverJSON(CHAVE_PUZZLES, resolvidos);
  aplicarTema(meta.tema);
}
const gravarMeta = () => {
  escreverJSON(CHAVE_META, meta);
  sincronizar();
};
const ctxMeta = () => ({ vitoriasIA: vitoriasIA(stats), puzzlesResolvidos: Object.keys(resolvidos).length, alquerque: Object.keys(stats).filter((k) => k.startsWith("alq_")).reduce((a, k) => a + stats[k].partidas, 0) });
function aplicarTema(id) {
  const th = temas[id] || temas.madeira;
  if (!th) return;
  const st = document.documentElement.style;
  st.setProperty("--fundo", th.fundo);
  st.setProperty("--superficie", th.sup);
  st.setProperty("--tinta", th.linha);
  st.setProperty("--texto", th.linha);
  st.setProperty("--suave", th.linha);
  st.setProperty("--ferrugem", th.sel);
  st.setProperty("--ouro", th.sel);
  st.setProperty("--peca-b", th.branca);
  st.setProperty("--peca-p", th.preta);
  st.setProperty("--ponto", th.ponto);
}
function carregar() {
  const r = validarGravacao(ler());
  dados = r.dados;
  avisoGravacao = r.aviso;
  meta = validarMeta(lerJSON(CHAVE_META));
  partidas = carregarLista(lerJSON);
  if (!partidas.length && meta.partidas.length) {
    partidas = meta.partidas.slice(0, 10);
    guardarLista(lerJSON, escreverJSON, partidas);
  }
  if (meta.partidas.length) {
    meta.partidas = [];
    escreverJSON(CHAVE_META, meta);
  }
  stats = validarStats(lerJSON(CHAVE_STATS));
  resolvidos = validarResolvidos(lerJSON(CHAVE_PUZZLES));
}
const gravarStats = () => {
  escreverJSON(CHAVE_STATS, stats);
  sincronizar();
};
const gravarResolvidos = () => {
  escreverJSON(CHAVE_PUZZLES, resolvidos);
  sincronizar();
};
function gravar() {
  escrever(dados);
}
function guardarPartida(p) {
  dados.partida = p.estado.fim ? null : { modo: p.modo, nivel: p.nivel, personalidade: cfgAtual && cfgAtual.personalidade || PERSONALIDADE_PADRAO, cor: p.cor, semente: p.semente, posicao: p.estado.celas, vez: p.estado.vez, fase: fase(p.estado), historico: p.historico, desafio: !!(cfgAtual && cfgAtual.desafio), desafioIni: cfgAtual && cfgAtual.desafioIni || 0 };
  gravar();
}
ouvir("som:mudou", ({ ligado }) => {
  dados.opcoes.som = ligado;
  gravar();
});
function btn(txt, f, cls = "") {
  const b = document.createElement("button");
  b.textContent = txt;
  if (cls) b.className = cls;
  b.addEventListener("click", f);
  return b;
}
const NAV_DE = { E1: "jogar", E2: "jogar", E9: "jogar", E9P: "jogar", E10P: "jogar", E11P: "jogar", E13: "jogar", E14: "jogar", E11: "rank", E10: "rank", E12: "loja", E15: "perfil" };
const NAV = [["jogar", "mo.nav.jogar", "\u25CB", () => menu()], ["rank", "mo.nav.rank", "\u2605", () => lugar()], ["loja", "mo.nav.loja", "\u25A3", () => loja()], ["perfil", "mo.nav.perfil", "\u263A", () => perfil()]];
const REABRE = { E1: () => menu(), E11: () => lugar(), E12: () => {
  aplicarTema(meta.tema);
  loja();
}, E15: () => perfil() };
function barraNav(ativo) {
  const n = document.createElement("nav");
  n.className = "nav";
  n.setAttribute("aria-label", t("mo.nav.rotulo"));
  for (const [k, chave, ic, f] of NAV) {
    const b = document.createElement("button");
    b.className = "nav-b" + (k === ativo ? " ativo" : "");
    b.dataset.nav = k;
    if (k === ativo) b.setAttribute("aria-current", "page");
    const i = document.createElement("span");
    i.className = "nav-ic";
    i.setAttribute("aria-hidden", "true");
    i.textContent = ic;
    const l = document.createElement("span");
    l.textContent = t(chave);
    b.append(i, l);
    b.addEventListener("click", () => {
      if (k === "loja" || ecraAtual === "E12") aplicarTema(meta.tema);
      f();
    });
    n.append(b);
  }
  return n;
}
function ecra(id) {
  if (jogoAtual) {
    jogoAtual.parar();
    jogoAtual = null;
  }
  app.replaceChildren();
  app.className = id.toLowerCase();
  ecraAtual = id;
  if (window.TABULEIRO_DEBUG) window.TABULEIRO_DEBUG.ecra = id;
  if (!NAV_DE[id]) return app;
  const cont = document.createElement("div");
  cont.className = "cont";
  app.append(cont, barraNav(NAV_DE[id]));
  return cont;
}
function topo(titulo, voltarF) {
  const d = document.createElement("header");
  d.className = "topo2";
  const esq = document.createElement("span");
  esq.className = "topo-lado";
  const dir = document.createElement("span");
  dir.className = "topo-lado";
  if (voltarF) {
    const b = btn("\u2039", voltarF, "voltar icone-b");
    b.setAttribute("aria-label", t("mo.nav.voltar"));
    esq.append(b);
  } else {
    const g = btn("\u2699", () => opcoes(REABRE[ecraAtual] || menu), "icone-b engrenagem");
    g.setAttribute("aria-label", t("mo.menu.definicoes"));
    dir.append(g);
  }
  const h = document.createElement("h2");
  h.textContent = titulo;
  d.append(esq, h, dir);
  return d;
}
function menu() {
  const r = ecra("E1");
  if (!meta.tutorialFeito && !dados.partida) return tutorial(menu);
  r.append(topo(t("titulo")));
  const l = document.createElement("p");
  l.className = "lema";
  l.textContent = t("mo.menu.objetivo");
  const mini = criarTabuleiro();
  mini.svg.classList.add("mini");
  mini.svg.setAttribute("aria-hidden", "true");
  mini.svg.removeAttribute("role");
  const cm = new Array(24).fill(0);
  for (const [pt, v] of Object.entries({ 0: 1, 1: 1, 2: 1, 9: 2, 14: 2, 21: 2, 10: 1, 13: 2 })) cm[+pt] = v;
  desenhar(mini, cm, { daltonico: dados.opcoes.daltonico });
  marcarMoinho(mini, [0, 1, 2]);
  const rk = document.createElement("p");
  rk.className = "rank";
  rk.textContent = textoNivel();
  const falta = barraXP();
  const tut = btn(t("mo.menu.como"), () => tutorial(menu), "cartao-como");
  const niveis = document.createElement("div");
  niveis.className = "grupo atalhos";
  niveis.setAttribute("role", "group");
  niveis.setAttribute("aria-label", t("mo.menu.nivel_rapido"));
  for (const id of ["facil", "media", "dificil"]) niveis.append(btn(t(`e2.nivel.${id}`), () => preparar(id), "atalho"));
  const ia = btn(t("mo.menu.jogar_ia"), () => preparar(), dados.partida ? "contorno" : "principal");
  r.append(l, mini.svg, rk, falta, cartaoDesafio());
  if (!meta.tutorialFeito) r.append(tut);
  if (dados.partida) r.append(btn(t("e1.continuar"), continuar, "principal"));
  r.append(ia, niveis, comBadge(btn(t("mo.menu.amigo"), mpMenu, "contorno alto")));
  if (meta.tutorialFeito) r.append(tut);
  if (avisoGravacao) {
    avisoGravacao = false;
    const a = document.createElement("p");
    a.className = "aviso";
    a.textContent = t("e1.gravacao_reposta");
    app.append(a);
    setTimeout(() => a.remove(), 3e3);
  }
}
const textoNivel = () => fmt("mo.xp.nivel", { n: nivelDe(meta.xp), patente: t(`mo.rank.${patenteDeNivel(nivelDe(meta.xp))}`) });
function barraXP() {
  const n = nivelDe(meta.xp), prx = proximoNivel(meta.xp);
  const w = document.createElement("div");
  w.className = "xp";
  const b = document.createElement("div");
  b.className = "xp-barra";
  b.setAttribute("role", "progressbar");
  b.setAttribute("aria-label", t("mo.xp.barra"));
  const ini = xpDoNivel(n), fim2 = prx ? xpDoNivel(n + 1) : ini + 1, pc = prx ? Math.round(100 * (meta.xp - ini) / (fim2 - ini)) : 100;
  b.setAttribute("aria-valuemin", "0");
  b.setAttribute("aria-valuemax", "100");
  b.setAttribute("aria-valuenow", String(pc));
  const i = document.createElement("i");
  i.style.width = `${pc}%`;
  b.append(i);
  const tx = document.createElement("p");
  tx.className = "rank-falta";
  tx.textContent = prx ? fmt("mo.xp.faltam", { n: prx.faltam, nivel: prx.nivel }) : t("mo.xp.maximo");
  w.append(b, tx);
  return w;
}
function cartaoDesafio() {
  const hoje = hojeISO(), est = estadoDesafio(meta, hoje), d = meta.desafio;
  const b = btn("", () => comecarDesafio(), "cartao-desafio contorno");
  b.disabled = est !== "por_jogar";
  b.setAttribute("data-estado", est);
  const a = document.createElement("strong");
  a.textContent = t(`mo.desafio.${est}`);
  const s = document.createElement("span");
  const sa = serieAtual(meta, hoje);
  s.textContent = d.ultimoJogado && sa === 0 && est === "por_jogar" ? fmt("mo.desafio.recomeca", { n: d.melhor }) : `${fmt("mo.desafio.serie", { n: sa })} \xB7 ${fmt("mo.desafio.melhor", { n: d.melhor })}`;
  b.append(a, s);
  return b;
}
function comecarDesafio() {
  const hoje = hojeISO();
  if (!podeJogarDesafio(meta.ultimoDesafio, hoje) || estadoDesafio(meta, hoje) !== "por_jogar") return menu();
  const p = posicaoDoDia(hoje);
  cfgAtual = { tema: meta.tema, modo: "ia", nivel: "media", personalidade: PERSONALIDADE_PADRAO, cor: 1, semente: sementeDoDia(hoje), historico: p.historico, desafio: true, desafioIni: p.historico.length };
  dados.partida = null;
  emitir("desafio:iniciado", { dia: hoje });
  jogar(cfgAtual);
}
function toast(txt) {
  const f = document.createElement("div");
  f.className = "toast-meta";
  f.setAttribute("role", "status");
  f.textContent = txt;
  document.body.append(f);
  setTimeout(() => f.remove(), 2e3);
}
function eventoMeta(id) {
  const x = conquistaEvento(meta, id);
  if (!x.novas.length) return;
  meta = x.meta;
  gravarMeta();
  for (const k of x.novas) {
    emitir("conquista:ganha", { id: k });
    toast(fmt("mo.conq.toast", { nome: t(`mo.conq.${k}.nome`) }));
  }
}
function preparar(nivelInicial) {
  const r = ecra("E2");
  const esc = { nivel: "media", cor: "aleatorio", personalidade: PERSONALIDADE_PADRAO };
  r.append(topo(t("e2.titulo"), menu));
  const grupo = (titulo, chave, opcs, nota) => {
    const s = document.createElement("p");
    s.className = "sub";
    s.textContent = titulo;
    const g = document.createElement("div");
    g.className = "grupo";
    const n = document.createElement("p");
    n.className = "nota";
    const bs = opcs.map((o) => btn(t(`e2.${chave}.${o}`), () => {
      esc[chave] = o;
      marca();
    }));
    function marca() {
      bs.forEach((b, i) => {
        b.className = opcs[i] === esc[chave] ? "sel" : "";
        b.setAttribute("aria-pressed", opcs[i] === esc[chave]);
      });
      if (nota) n.textContent = t(`e2.${chave}.${esc[chave]}.nota`);
    }
    g.append(...bs);
    marca();
    r.append(s, g);
    if (nota) r.append(n);
  };
  {
    let marca = function() {
      bs.forEach((b, i) => {
        const on = NIVEIS_ORDEM[i] === esc.nivel;
        b.className = "cartao-nivel" + (on ? " sel" : "");
        b.setAttribute("aria-pressed", on);
        b.querySelector(".visto").textContent = on ? "\u2713" : "";
      });
    };
    const sug = sugerirNivel(meta.nivelUsado || "media", meta.ultimosResultados);
    if (meta.nivelUsado) esc.nivel = meta.nivelUsado;
    if (nivelInicial) esc.nivel = nivelInicial;
    const s0 = document.createElement("p");
    s0.className = "sub";
    s0.textContent = t("mo.nivel.titulo");
    const g = document.createElement("div");
    g.className = "niveis";
    const bs = NIVEIS_ORDEM.map((id, i) => {
      const b = btn("", () => {
        esc.nivel = id;
        marca();
      }, "cartao-nivel");
      const a = document.createElement("strong");
      a.textContent = t(`mo.nivel.${i + 1}.nome`);
      const c = document.createElement("span");
      c.textContent = t(`mo.nivel.${i + 1}.nota`);
      const v = document.createElement("span");
      v.className = "visto";
      v.setAttribute("aria-hidden", "true");
      b.append(a, c, v);
      return b;
    });
    g.append(...bs);
    marca();
    r.append(s0, g);
    if (sug && sug.tipo === "subir") {
      const q = document.createElement("p");
      q.className = "nota destaque";
      q.textContent = fmt("mo.nivel.subiu", { nivel: t(`mo.nivel.${NIVEIS_ORDEM.indexOf(sug.para) + 1}.nome`) });
      r.append(q);
    }
  }
  {
    let marca = function() {
      bs.forEach((b, i) => {
        b.className = ids[i] === esc.personalidade ? "sel" : "";
        b.setAttribute("aria-pressed", ids[i] === esc.personalidade);
      });
      n.textContent = t(`tab.ia.${esc.personalidade}.desc`);
    };
    const s = document.createElement("p");
    s.className = "sub";
    s.textContent = t("tab.ia.titulo");
    const g = document.createElement("div");
    g.className = "grupo";
    const n = document.createElement("p");
    n.className = "nota";
    const ids = Object.keys(PERSONALIDADES);
    const bs = ids.map((id) => btn(t(`tab.ia.${id}.nome`), () => {
      esc.personalidade = id;
      marca();
    }));
    g.append(...bs);
    marca();
    r.append(s, g, n);
  }
  grupo(t("e2.cor"), "cor", ["brancas", "pretas", "aleatorio"], false);
  r.append(btn(t("e2.comecar"), () => {
    meta.nivelUsado = esc.nivel;
    gravarMeta();
    comecar({ modo: "ia", nivel: esc.nivel, personalidade: esc.personalidade, cor: esc.cor === "brancas" ? 1 : esc.cor === "pretas" ? 2 : Math.random() < 0.5 ? 1 : 2, escolhaCor: esc.cor });
  }, "principal"));
}
function comecar(cfg) {
  cfgAtual = { ...cfg, tema: meta.tema, semente: Date.now() & 2147483647 || 1 };
  dados.partida = null;
  jogar(cfgAtual);
}
function continuar() {
  const s = dados.partida;
  if (!s) return menu();
  cfgAtual = { tema: meta.tema, modo: s.modo, nivel: s.nivel, personalidade: s.personalidade || PERSONALIDADE_PADRAO, cor: s.cor, semente: s.semente, historico: s.historico, desafio: !!s.desafio, desafioIni: s.desafioIni || 0 };
  jogar(cfgAtual);
}
function jogar(cfg) {
  const r = ecra("E3");
  jogoAtual = iniciarPartida(r, cfg, {
    opcoes: () => dados.opcoes,
    guardar: guardarPartida,
    aoPausar: (retomar) => pausa(retomar),
    aoFim: (p) => fim(p)
  });
}
function pausa(retomar) {
  const r = document.createElement("div");
  r.className = "sobreposicao e5";
  const fechar = () => r.remove();
  const h = document.createElement("h2");
  h.textContent = t("e5.titulo");
  r.append(h);
  const conf = document.createElement("div");
  r.append(
    btn(t("e5.continuar"), () => {
      fechar();
      retomar();
    }, "principal"),
    btn(t("e5.recomecar"), () => {
      conf.replaceChildren();
      const q = document.createElement("p");
      q.textContent = t("e5.recomecar.confirma");
      conf.append(q, btn(t("e5.recomecar.sim"), () => {
        fechar();
        const c = cfgAtual;
        comecar({ modo: c.modo, nivel: c.nivel, personalidade: c.personalidade, cor: c.cor });
      }), btn(t("e5.recomecar.nao"), () => conf.replaceChildren()));
    }),
    conf,
    btn(t("e5.opcoes"), () => {
      r.style.display = "none";
      opcoes(() => {
        r.style.display = "";
        sobrepor();
      }, true);
    }),
    btn(t("e5.sair"), () => {
      fechar();
      menu();
    })
  );
  app.append(r);
  r.querySelector("button").focus();
  function sobrepor() {
  }
}
function fim(p) {
  const r = ecra("E6");
  const e = p.estado.fim, res = e.resultado;
  dados.partida = null;
  gravar();
  registarPartida(p);
  const rm = registarMeta(p);
  const titulo = res === 0 ? "fim.titulo.empate" : p.modo === "2j" ? res === 1 ? "fim.titulo.brancas" : "fim.titulo.pretas" : res === p.cor ? "fim.titulo.ganhaste" : "fim.titulo.perdeste";
  const h = document.createElement("h2");
  h.textContent = t(titulo);
  const m = document.createElement("p");
  m.textContent = t(`fim.motivo.${e.motivo}`);
  const c = document.createElement("p");
  c.className = "nota";
  const cont = (j) => p.estado.celas.filter((x) => x === j).length + p.estado.porColocar[j];
  c.textContent = fmt("fim.contagem", { brancas: cont(1), pretas: cont(2) });
  r.append(h, m, c);
  if (rm) {
    if (rm.xp) {
      const L = rm.xp.linhas, ln = [];
      for (const k of ["base", "moinhos", "ia", "desafio"]) if (L[k]) ln.push(fmt(`mo.xp.linha.${k}`, { n: L[k] }));
      const xp = document.createElement("p");
      xp.className = "nota xp-linhas";
      xp.textContent = rm.xp.total ? `${fmt("mo.xp.ganho", { n: rm.xp.total })} (${ln.join(" \xB7 ")})` : meta.xpHoje.n >= 400 ? t("mo.xp.teto") : "";
      if (xp.textContent) r.append(xp);
      if (rm.xp.total) emitir("xp:ganho", { total: rm.xp.total, linhas: L });
    }
    if (rm.subiu) {
      const nv = document.createElement("p");
      nv.className = "nota destaque faixa-nivel";
      nv.textContent = fmt("mo.xp.subiu", { n: rm.nivelDepois });
      r.append(nv);
      emitir("nivel:subiu", { de: rm.nivelAntes, para: rm.nivelDepois });
    }
    const gp = document.createElement("p");
    gp.className = "nota";
    gp.textContent = rm.ganhos ? fmt("mo.fim.ganhos", { n: rm.ganhos }) : p.modo === "ia" && meta.hoje >= 40 ? t("mo.fim.limite") : "";
    r.append(gp);
    if (rm.rankDepois > rm.rankAntes) {
      const q = document.createElement("p");
      q.className = "nota destaque";
      q.textContent = fmt("mo.rank.subiste", { rank: t(`mo.rank.${rm.rankDepois}`) });
      r.append(q);
    }
    for (const k of rm.novas) {
      const q = document.createElement("p");
      q.className = "nota destaque";
      q.textContent = fmt("mo.conq.novo", { nome: t(`mo.conq.${k}.nome`) });
      r.append(q);
      emitir("conquista:ganha", { id: k });
    }
    if (rm.desafioSerie !== void 0) emitir("desafio:fim", { ganhou: res === p.cor, serie: rm.desafioSerie });
  }
  const pers = cfgAtual && cfgAtual.personalidade;
  if (p.modo === "ia" && PERSONALIDADES[pers]) {
    const fr = document.createElement("p");
    fr.className = "nota";
    fr.textContent = t(`tab.ia.${pers}.${res === p.cor ? "perde" : res === 0 ? "abre" : "ganha"}`);
    r.append(fr);
  }
  r.append(btn(t("fim.revanche"), () => {
    const n = { modo: p.modo, nivel: p.nivel, personalidade: pers, cor: p.modo === "ia" ? 3 - p.cor : 1 };
    comecar(n);
  }, "principal"), btn(t("fim.menu"), menu));
}
function chegouAVoar(p) {
  try {
    let q = novaPartida({ modo: p.modo, nivel: p.nivel, cor: p.cor, semente: p.semente });
    for (const m of p.historico) {
      q = jogarCompleta(q, m);
      if (fase(q.estado, 1) === "voar" || fase(q.estado, 2) === "voar") return true;
    }
  } catch {
  }
  return false;
}
function registarMeta(p) {
  const res = p.estado.fim.resultado;
  const eu = p.modo === "ia" ? p.cor : 1;
  const resultado = res === 0 ? "e" : p.modo === "2j" ? "v" : res === p.cor ? "v" : "d";
  const tiradas = p.historico.filter((m) => m !== "X" && m.tirar !== void 0).length;
  const pers = cfgAtual && cfgAtual.personalidade;
  const meus = p.historico.filter((m, i) => m.tirar !== void 0 && (i % 2 === 0 ? 1 : 2) === eu).length;
  const r = registarFim(meta, { modo: p.modo, nivel: p.nivel, resultado, jogadas: p.historico.length, pecasPerdidas: tiradas - meus, gata: pers === "mobilidade", iaMoinhos: p.modo === "ia" ? tiradas - meus : void 0, jogadasMinhas: Math.ceil((p.historico.length - (cfgAtual && cfgAtual.desafioIni || 0)) / (p.modo === "ia" ? 2 : 1)), moinhos: meus, fase3: chegouAVoar(p), desafio: !!(cfgAtual && cfgAtual.desafio) }, ctxMeta());
  meta = r.meta;
  gravarMeta();
  return r;
}
function registarPartida(p) {
  const res = p.estado.fim.resultado;
  const resultado = res === 0 ? "e" : p.modo === "2j" ? res === 1 ? "v" : "d" : res === p.cor ? "v" : "d";
  stats = registar(stats, modoDe(p.modo, p.nivel), { resultado, jogadas: p.historico.length, fase3: chegouAVoar(p) });
  stats = registarGlobais(stats, { moinhos: p.historico.filter((m) => m.tirar !== void 0).length, resultado, dia: hojeISO() }, meta.contadores.melhorSerie);
  gravarStats();
}
function estatisticas() {
  const r = ecra("E10");
  r.append(topo(t("tab.stats.titulo"), perfil));
  const modos = Object.keys(stats).filter((k) => k !== "_g" && stats[k].partidas > 0);
  const g = stats._g || { moinhos: 0, melhorSerieGeral: 0 }, tg = total(stats), tx = taxaVitoria(stats);
  r.append(par(textoNivel(), "sub"), barraXP());
  const dl = document.createElement("dl");
  dl.className = "linhas-stats";
  for (const [k, v] of [["tab.stats.partidas", tg.partidas], ["tab.stats.vitorias", tg.v], ["tab.stats.taxa", tx === null ? t("tab.stats.sem_taxa") : `${tx} %`], ["tab.stats.serie_geral", Math.max(g.melhorSerieGeral, tg.melhorSerie)], ["tab.stats.moinhos", g.moinhos]]) {
    const a = document.createElement("dt"), b = document.createElement("dd");
    a.textContent = t(k);
    b.textContent = String(v);
    dl.append(a, b);
  }
  r.append(dl, par(t("tab.stats.por_nivel"), "sub"));
  const vn = vitoriasPorNivel(stats, NIVEIS_ORDEM), mx = Math.max(1, ...vn.map((x) => x.v));
  const ul = document.createElement("ul");
  ul.className = "barras-nivel";
  for (const x of vn) {
    const li = document.createElement("li");
    const nm = document.createElement("span");
    nm.textContent = t(`tab.stats.modo.ia_${x.nivel}`).replace(/^Moinho, /, "");
    const br = document.createElement("i");
    br.style.width = `${Math.round(100 * x.v / mx)}%`;
    const nu = document.createElement("b");
    nu.textContent = String(x.v);
    li.append(nm, br, nu);
    ul.append(li);
  }
  r.append(ul);
  if (!modos.length) {
    const v = document.createElement("p");
    v.textContent = t("tab.stats.vazio");
    r.append(v);
  }
  const bloco = (nome, m, dois) => {
    const d = document.createElement("div");
    d.className = "bloco-stats";
    const s = document.createElement("p");
    s.className = "sub";
    s.textContent = nome;
    const l = document.createElement("p");
    l.className = "nota";
    l.textContent = [
      dois ? null : `${t("tab.stats.vitorias")} ${m.v}`,
      dois ? null : `${t("tab.stats.derrotas")} ${m.d}`,
      `${t("tab.stats.empates")} ${m.e}`,
      `${t("tab.stats.partidas")} ${m.partidas}`,
      dois ? null : `${t("tab.stats.serie")} ${m.melhorSerie}`,
      `${t("tab.stats.jogadas")} ${mediaJogadas(m)}`,
      `${t("tab.stats.fase3")} ${m.fase3}`
    ].filter(Boolean).join(" \xB7 ");
    d.append(s, l);
    r.append(d);
  };
  for (const k of modos) bloco(t(`tab.stats.modo.${k}`), stats[k], k === "dois");
  if (modos.length) bloco(t("tab.stats.total"), total(stats));
  const pz = document.createElement("p");
  pz.className = "nota";
  pz.textContent = `${t("tab.stats.puzzles")}: ${Object.keys(resolvidos).length}/${puzzles.length}`;
  r.append(pz);
  const conf = document.createElement("div");
  if (modos.length) r.append(btn(t("tab.stats.apagar"), () => {
    conf.replaceChildren();
    const q = document.createElement("p");
    q.textContent = t("tab.stats.apagar.confirmar");
    conf.append(q, btn(t("tab.stats.apagar.sim"), () => {
      conf.replaceChildren();
      const q2 = document.createElement("p");
      q2.textContent = t("tab.stats.apagar.confirmar2");
      conf.append(q2, btn(t("tab.stats.apagar.sim2"), () => {
        stats = {};
        apagar(CHAVE_STATS);
        sincronizar();
        estatisticas();
      }), btn(t("tab.stats.apagar.nao"), () => conf.replaceChildren()));
    }), btn(t("tab.stats.apagar.nao"), () => conf.replaceChildren()));
  }), conf);
}
function finais() {
  const r = ecra("E9");
  r.append(topo(t("tab.puzzle.titulo"), menu));
  for (const tipo of PUZZLES.tipos) {
    const aberto = tipoAberto(resolvidos, tipo, puzzles), n = resolvidosDoTipo(resolvidos, tipo, puzzles);
    const b = btn(`${t(`tab.puzzle.${tipo}.nome`)} \xB7 ${aberto ? fmt("tab.puzzle.n_de", { n, total: PUZZLES.porTipo }) : t("tab.puzzle.por_abrir")}`, () => {
      const lista = puzzles.filter((p) => p.tipo === tipo);
      puzzle(lista.find((p) => !resolvidos[p.id]) || lista[0]);
    }, aberto ? "principal" : "");
    b.disabled = !aberto;
    const d = document.createElement("p");
    d.className = "nota";
    d.textContent = aberto ? t(`tab.puzzle.${tipo}.desc`) : fmt("tab.puzzle.abre_2", { tipo: t(`tab.puzzle.${PUZZLES.tipos[PUZZLES.tipos.indexOf(tipo) - 1]}.nome`) });
    r.append(b, d);
  }
  if (puzzles.length && Object.keys(resolvidos).length >= puzzles.length) {
    const f = document.createElement("p");
    f.textContent = t("tab.puzzle.todos");
    r.append(f);
  }
}
function puzzle(pz, dicasUsadas = 0) {
  const r = ecra("E9");
  let e = estadoDoPuzzle(pz), passo = 0, sel = null, feito = false, dicas = PUZZLES.dicasMax - dicasUsadas, dicaPonto = null;
  const h = document.createElement("h2");
  h.textContent = `${t(`tab.puzzle.${pz.tipo}.nome`)} \xB7 ${pz.id}`;
  const d = document.createElement("p");
  d.className = "nota";
  d.textContent = t(`tab.puzzle.${pz.tipo}.desc`);
  const msg = document.createElement("p");
  msg.className = "msg";
  msg.setAttribute("role", "status");
  const tab = criarTabuleiro({ aoPonto: (pt, acao) => {
    if (acao === "up") tocar(pt);
  } });
  const acoes = document.createElement("div");
  acoes.className = "grupo";
  r.append(h, d, tab.svg, msg, acoes);
  const dicaBtn = btn("", () => {
    if (feito || dicas <= 0) return;
    dicas--;
    const sol = passo === 0 ? pz.solucao[0] : moinhosEmUm(e)[0];
    dicaPonto = sol.para;
    pintar();
  });
  function pintar() {
    const dests = sel !== null ? destinos(e, sel) : [];
    if (dicaPonto !== null) dests.push(dicaPonto);
    desenhar(tab, e.celas, { destinos: dests, selecionado: sel, daltonico: dados.opcoes.daltonico });
    dicaBtn.textContent = `${t("tab.puzzle.dica")} \xB7 ${dicas > 0 ? fmt("tab.puzzle.dicas_resto", { n: dicas }) : t("tab.puzzle.sem_dicas")}`;
    dicaBtn.disabled = dicas <= 0 || feito;
  }
  function tocar(pt) {
    if (feito) return;
    if (e.celas[pt] === 1) {
      sel = pt;
      dicaPonto = null;
      pintar();
      return;
    }
    if (sel === null || !destinos(e, sel).includes(pt)) return;
    const m = { de: sel, para: pt };
    const res = avaliarJogada(pz, e, m, passo);
    sel = null;
    dicaPonto = null;
    if (res === "errado") {
      msg.textContent = t("tab.puzzle.errado");
      emitir("puzzle:errado", { id: pz.id });
      feito = true;
      e = jogarRegra(e, m).remover ? e : jogarRegra(e, m);
      pintar();
      acoes.replaceChildren(btn(t("tab.puzzle.recomecar"), () => puzzle(pz, PUZZLES.dicasMax - dicas), "principal"), btn(t("tab.puzzle.voltar"), finais));
      return;
    }
    if (res === "segue") {
      e = jogarRegra(e, m);
      pintar();
      const resp = escolherJogada(e, { nivel: "media", semLimite: true });
      e = aplicar(e, resp);
      passo = 1;
      pintar();
      return;
    }
    const n = jogarRegra(e, m);
    e = { ...n, remover: false };
    feito = true;
    pintar();
    msg.textContent = t("tab.puzzle.certo");
    resolvidos[pz.id] = true;
    gravarResolvidos();
    emitir("puzzle:certo", { id: pz.id });
    eventoMeta(Object.keys(resolvidos).length >= puzzles.length ? "puzzles_todos" : Object.keys(resolvidos).length >= 10 ? "puzzles" : "primeiro_puzzle");
    const prox = proximoPuzzle(resolvidos, puzzles);
    acoes.replaceChildren(...prox ? [btn(t("tab.puzzle.proximo"), () => puzzle(prox), "principal")] : [], btn(t("tab.puzzle.voltar"), finais));
  }
  acoes.append(dicaBtn, btn(t("tab.puzzle.recomecar"), () => puzzle(pz, PUZZLES.dicasMax - dicas)), btn("\u2039", finais, "voltar"));
  pintar();
}
function comoJogar(depois) {
  const paginas = [
    { k: 1, celas: { 0: 1, 9: 2, 18: 1 }, dest: [1, 2, 3, 4, 5, 6], sel: null },
    { k: 2, celas: { 1: 1, 10: 2, 5: 1, 13: 2, 21: 1, 22: 2 }, dest: [0, 2, 9], sel: 1 },
    { k: 3, celas: { 1: 1, 11: 1, 20: 1, 3: 2, 5: 2, 14: 2 }, dest: [0, 2, 4, 6, 7, 8, 9, 10, 12, 13, 15, 16, 17, 18, 19, 21, 22, 23], sel: 20 }
  ];
  let i = 0;
  function pagina() {
    const r = ecra("E7");
    const pg = paginas[i];
    const h = document.createElement("h2");
    h.textContent = t("e7.titulo");
    const s = document.createElement("div");
    s.className = "pagina";
    const sh = document.createElement("p");
    sh.className = "sub";
    sh.textContent = t(`e7.${pg.k}.titulo`);
    const tab = criarTabuleiro();
    const celas = new Array(24).fill(0);
    for (const [pt, v] of Object.entries(pg.celas)) celas[+pt] = v;
    desenhar(tab, celas, { destinos: pg.dest, selecionado: pg.sel, daltonico: dados.opcoes.daltonico });
    const tx = document.createElement("p");
    tx.textContent = t(`e7.${pg.k}.texto`);
    s.append(sh, tab.svg, tx);
    if (i === 2) {
      const a = document.createElement("p");
      a.textContent = t("e7.moinho");
      const b = document.createElement("p");
      b.textContent = t("e7.fim");
      s.append(a, b);
    }
    r.append(h, s);
    const fimTut = () => {
      dados.tutorialVisto = true;
      gravar();
      depois();
    };
    r.append(i < 2 ? btn(t("e7.seguinte"), () => {
      i++;
      pagina();
    }, "principal") : btn(t("e7.ok"), fimTut, "principal"));
    if (i < 2) r.append(btn(t("e7.saltar"), fimTut));
  }
  pagina();
}
function opcoes(voltar2, daPausa = false) {
  const alvo = daPausa ? document.createElement("div") : ecra("E8");
  if (daPausa) {
    alvo.className = "sobreposicao e8";
    app.append(alvo);
  }
  const h = document.createElement("h2");
  h.textContent = t("e8.titulo");
  alvo.append(h);
  const on = (v2) => v2 ? "ON" : "OFF";
  const som = btn("", () => {
    emitir("som:mudou", { ligado: !dados.opcoes.som });
    atualiza();
  });
  const dest = btn("", () => {
    dados.opcoes.destaques = !dados.opcoes.destaques;
    gravar();
    atualiza();
  });
  const dalt = btn("", () => {
    dados.opcoes.daltonico = !dados.opcoes.daltonico;
    gravar();
    atualiza();
  });
  const vib = btn("", () => {
    dados.opcoes.vibrar = !dados.opcoes.vibrar;
    gravar();
    atualiza();
  });
  function atualiza() {
    som.textContent = `${t("e8.som")}: ${on(dados.opcoes.som)}`;
    dest.textContent = `${t("e8.destaques")}: ${on(dados.opcoes.destaques)}`;
    dalt.textContent = `${t("e8.daltonico")}: ${on(dados.opcoes.daltonico)}`;
    vib.textContent = `${t("e8.vibracao")}: ${on(dados.opcoes.vibrar)}`;
    app.classList.toggle("sem-destaques", !dados.opcoes.destaques);
    const e3 = document.querySelector(".e3");
    if (e3) e3.classList.toggle("sem-destaques", !dados.opcoes.destaques);
    const sv = document.querySelector(".e3 svg.tab");
    if (sv) sv.classList.toggle("daltonico", dados.opcoes.daltonico);
  }
  atualiza();
  const rep = document.createElement("div");
  const repor = btn(t("e8.repor"), () => {
    rep.replaceChildren();
    const q = document.createElement("p");
    q.textContent = t("e8.repor.1");
    rep.append(q, btn(t("e8.repor.sim"), () => {
      rep.replaceChildren();
      const q2 = document.createElement("p");
      q2.textContent = t("e8.repor.2");
      rep.append(q2, btn(t("e8.repor.sim"), () => {
        dados = JSON.parse(JSON.stringify(PADRAO));
        try {
          localStorage.removeItem(CHAVE);
        } catch {
        }
        emitir("som:mudou", { ligado: true });
        if (daPausa) alvo.remove();
        menu();
      }), btn(t("e8.repor.nao"), () => rep.replaceChildren()));
    }), btn(t("e8.repor.nao"), () => rep.replaceChildren()));
  });
  const v = document.createElement("p");
  v.textContent = fmt("e8.versao", { v: VERSAO });
  alvo.append(som, dest, dalt, vib, repor, rep, v, btn("\u2039", () => {
    if (daPausa) alvo.remove();
    voltar2();
  }, "voltar"));
  origemOpcoes = voltar2;
}
const h2 = (txt) => {
  const h = document.createElement("h2");
  h.textContent = txt;
  return h;
};
const par = (txt, cls = "nota") => {
  const p = document.createElement("p");
  p.className = cls;
  p.textContent = txt;
  return p;
};
const compras = criarCompras({ tem: (tema) => !!meta.pagos[tema], dar: (tema) => {
  if (!meta.pagos[tema]) {
    meta.pagos[tema] = true;
    gravarMeta();
  }
} });
const mudarTema = (id) => {
  meta.tema = id;
  gravarMeta();
  aplicarTema(id);
};
function tutorial(depois) {
  const r = ecra("E7");
  const LINHA = [0, 1, 2], ADV = [12, 20];
  let passo = 0, sel = null;
  const celas = new Array(24).fill(0);
  for (const p of ADV) celas[p] = 2;
  const msg = par("", "msg");
  msg.setAttribute("role", "status");
  const txt = par("", "sub");
  const prog = par("");
  let de = null;
  const tab = criarTabuleiro({ aoPonto: (pt, acao) => {
    if (acao === "down") {
      de = pt;
      return;
    }
    if (acao !== "up") return;
    const o = de;
    de = null;
    if (o !== null && o !== pt && sel === null && (passo === 4 || passo === 5)) {
      tocar(o);
      if (sel !== o) return;
    }
    tocar(pt);
  } });
  const acoes = document.createElement("div");
  acoes.className = "acoes";
  const fimTut = () => {
    meta.tutorialFeito = true;
    dados.tutorialVisto = true;
    gravarMeta();
    gravar();
    depois();
  };
  r.append(h2(t("mo.tut.titulo")), par(t("mo.tut.objetivo"), "objetivo"), prog, tab.svg, txt, msg, acoes);
  function pintar() {
    msg.textContent = "";
    let alvo = passo < 3 ? [LINHA[passo]] : [];
    if (passo === 4) alvo = sel === null ? [] : [3];
    if (passo === 5) alvo = sel === null ? [] : celas.map((v, i) => v ? -1 : i).filter((i) => i >= 0);
    desenhar(tab, celas, { destinos: alvo, selecionado: sel !== null ? sel : passo === 4 ? 2 : passo === 5 ? 0 : null, removiveis: passo === 3 ? ADV : null, daltonico: dados.opcoes.daltonico });
    prog.textContent = passo < 6 ? fmt("mo.tut.passo", { n: passo + 1 }) : "";
    txt.textContent = t(`mo.tut.${passo + 1}`);
    acoes.replaceChildren();
    if (passo === 6) {
      msg.textContent = t("mo.tut.fim");
      acoes.append(btn(t("mo.tut.comecar"), fimTut, "principal"));
    } else acoes.append(btn(t("mo.tut.saltar"), fimTut));
  }
  function tocar(pt) {
    if (passo < 3) {
      if (pt !== LINHA[passo]) {
        msg.textContent = t("mo.tut.dica.errada");
        return;
      }
      celas[pt] = 1;
      passo++;
      if (passo === 3) {
        desenhar(tab, celas, { daltonico: dados.opcoes.daltonico });
        marcarMoinho(tab, LINHA);
        emitir("moinho:fechado", { jogador: 1, linha: LINHA, removiveis: ADV });
        setTimeout(() => {
          limparMoinho(tab);
          pintar();
        }, 700);
        return;
      }
      pintar();
      return;
    }
    if (passo === 3) {
      if (!ADV.includes(pt)) {
        msg.textContent = t("mo.tut.dica.errada");
        return;
      }
      celas[pt] = 0;
      emitir("peca:removida", { jogador: 1, ponto: pt });
      passo = 4;
      pintar();
      return;
    }
    if (passo === 4 || passo === 5) {
      const origem = passo === 4 ? 2 : 0;
      if (sel === null) {
        if (pt !== origem) {
          msg.textContent = t("mo.tut.dica.errada");
          return;
        }
        sel = pt;
        pintar();
        return;
      }
      if (pt === sel) {
        sel = null;
        pintar();
        return;
      }
      if (celas[pt] || passo === 4 && pt !== 3) {
        msg.textContent = t("mo.tut.dica.errada");
        return;
      }
      celas[pt] = 1;
      celas[sel] = 0;
      sel = null;
      passo++;
      pintar();
    }
  }
  pintar();
}
function contagemConq(k) {
  const c = meta.contadores, f = (n, tot) => fmt("mo.conq.progresso", { n: Math.min(n, tot), total: tot });
  const M = {
    dez: f(c.partidas, 10),
    cem: f(c.partidas, 100),
    cinquenta: f(c.vitorias, 50),
    serie3: f(c.melhorSerie, 3),
    serie7: f(c.melhorSerie, 7),
    tres_amigos: f(c.partidasCodigo, 3),
    desafio3: f(meta.desafio.melhor, 3),
    desafio30: f(c.desafioDias, 30),
    puzzles: f(Object.keys(resolvidos).length, 10),
    puzzles_todos: f(Object.keys(resolvidos).length, puzzles.length || 1),
    nivel10: f(nivelDe(meta.xp), 10),
    nivel20: f(nivelDe(meta.xp), 20)
  };
  return M[k] || "";
}
function lugar() {
  const r = ecra("E11");
  const rk = patenteDeNivel(nivelDe(meta.xp));
  r.append(topo(t("mo.rank.titulo")));
  const c = document.createElement("div");
  c.className = "cartao-lugar";
  const c1 = document.createElement("span");
  c1.className = "c-pequeno";
  c1.textContent = t("mo.rank.lugar");
  const c2 = document.createElement("strong");
  c2.textContent = t(`mo.rank.${rk}`);
  const c3 = document.createElement("span");
  c3.textContent = textoNivel();
  c.append(c1, c2, c3);
  r.append(c, barraXP());
  const ab = CONQUISTAS.filter((k) => meta.conquistas[k]);
  r.append(par(`${t("mo.conq.titulo")}: ${fmt("mo.conq.n_de", { n: ab.length, total: CONQUISTAS.length })}`, "sub"));
  const lista = document.createElement("ul");
  lista.className = "conq";
  for (const k of CONQUISTAS) {
    const li = document.createElement("li");
    const on = !!meta.conquistas[k];
    li.className = on ? "on" : "";
    const cn = contagemConq(k);
    li.textContent = on ? `${t(`mo.conq.${k}.nome`)} \u2014 ${t(`mo.conq.${k}.desc`)}` : `${t("mo.conq.por_abrir")}: ${t(`mo.conq.${k}.desc`)}${cn ? ` (${cn})` : ""}`;
    lista.append(li);
  }
  r.append(lista, btn(t("mo.menu.amigos_rank"), () => amigos()));
}
function perfil() {
  const r = ecra("E15");
  r.append(topo(t("mo.perfil.titulo")));
  const nome = meta.perfil && meta.perfil.alcunha ? meta.perfil.alcunha : t("mo.perfil.sem_alcunha");
  const cab = document.createElement("div");
  cab.className = "perfil-cab";
  const av = document.createElement("span");
  av.className = "avatar";
  av.setAttribute("aria-hidden", "true");
  av.textContent = [...nome][0].toUpperCase();
  const nm = document.createElement("strong");
  nm.textContent = nome;
  cab.append(av, nm);
  r.append(cab);
  const tt = total(stats);
  const linhas = document.createElement("dl");
  linhas.className = "linhas-stats";
  for (const [k, v] of [["tab.stats.vitorias", tt.v], ["tab.stats.partidas", tt.partidas], ["tab.stats.fase3", tt.fase3], ["tab.stats.serie", tt.melhorSerie]]) {
    const d1 = document.createElement("div");
    const a = document.createElement("dt");
    a.textContent = t(k);
    const b = document.createElement("dd");
    b.textContent = String(v);
    d1.append(a, b);
    linhas.append(d1);
  }
  r.append(linhas, btn(t("mo.perfil.editar"), () => amigos(), "contorno"), btn(t("tab.stats.titulo"), estatisticas), btn(t("mo.perfil.conta"), () => conta(), "contorno"));
}
function conta() {
  ecraConta(contas, { ecra, topo, btn, par, t, aoAplicar: async () => {
    aplicarConta(await contas.carregar());
  }, aoSair: entrada });
}
function loja() {
  const r = ecra("E12");
  r.append(topo(t("mo.loja.titulo")), par(t("mo.loja.sem_anuncios")));
  const caixa = document.createElement("div");
  caixa.className = "loja grelha";
  const aviso = par("", "msg");
  aviso.setAttribute("role", "status");
  function lista() {
    caixa.replaceChildren();
    for (const id of TEMAS_ORDEM) {
      const th = temas[id];
      if (!th) continue;
      const aberto = temaAberto(id, th.desb, ctxMeta(), meta);
      const c = document.createElement("div");
      c.className = "item cartao-tema";
      const st = c.style;
      st.setProperty("--fundo", th.fundo);
      st.setProperty("--superficie", th.sup);
      st.setProperty("--tinta", th.linha);
      st.setProperty("--ferrugem", th.sel);
      st.setProperty("--peca-b", th.branca);
      st.setProperty("--peca-p", th.preta);
      st.setProperty("--ponto", th.ponto);
      const pv = criarTabuleiro();
      pv.svg.classList.add("mini-tema");
      pv.svg.removeAttribute("role");
      pv.svg.setAttribute("aria-hidden", "true");
      const cm = new Array(24).fill(0);
      for (const [pt, v] of Object.entries({ 0: 1, 4: 1, 9: 2, 14: 2, 21: 1, 12: 2 })) cm[+pt] = v;
      desenhar(pv, cm, {});
      const nome = document.createElement("span");
      nome.className = "nome";
      nome.textContent = th.n;
      c.append(pv.svg, nome);
      if (aberto) c.append(meta.tema === id ? par(t("mo.loja.em_uso"), "em-uso") : btn(t("mo.loja.usar"), () => {
        mudarTema(id);
        lista();
      }));
      else if (th.desb === "loja (cosmetico)") c.append(btn(fmt("mo.loja.comprar", { preco: compras.preco(playIdDoTema(id)) }), async () => {
        aviso.textContent = "";
        const x = await compras.comprar(playIdDoTema(id));
        if (x.resultado === "concluida") {
          aviso.textContent = fmt("mo.loja.comprado", { nome: th.n });
          lista();
        } else if (x.resultado === "erro") aviso.textContent = t(x.erro === "sem_rede" || x.erro === "loja_indisponivel" ? "mo.loja.sem_ligacao" : "mo.loja.erro");
        else if (x.resultado === "pendente") aviso.textContent = t("mo.loja.pendente");
      }));
      else c.append(par(fmt("mo.loja.bloqueado", { como: th.desb }), "nota-tema"));
      caixa.append(c);
    }
    if (compras.ofertavel("moinho_tudo")) caixa.append(btn(fmt("mo.loja.tudo", { preco: compras.preco("moinho_tudo") }), async () => {
      const x = await compras.comprar("moinho_tudo");
      if (x.resultado === "concluida") {
        aviso.textContent = t("mo.loja.tudo.ok");
        lista();
      } else if (x.resultado === "erro") aviso.textContent = t(x.erro === "sem_rede" || x.erro === "loja_indisponivel" ? "mo.loja.sem_ligacao" : "mo.loja.erro");
      else if (x.resultado === "pendente") aviso.textContent = t("mo.loja.pendente");
    }));
  }
  lista();
  r.append(caixa, aviso, par(t("mo.loja.sub")), btn(t("mo.loja.restaurar"), async () => {
    const x = await compras.restaurar();
    aviso.textContent = t(x.resultado === "erro" ? "mo.loja.sem_ligacao" : x.n ? "mo.loja.restaurado" : "mo.loja.restaurar.vazio");
    lista();
  }));
}
function mpMenu() {
  const r = ecra("E13");
  r.append(
    topo(t("mo.mp.titulo"), menu),
    btn(t("mo.mp.local"), () => comecar({ modo: "2j", nivel: "media", cor: 1 })),
    par(t("mo.mp.local.desc")),
    comBadge(btn(t("mo.mp.codigo"), () => ecraPartidas(), "principal")),
    par(t("mo.mp.codigo.desc")),
    btn(t("mo.mp.amigos"), () => amigos())
  );
}
async function copiar(texto, aviso) {
  try {
    if (navigator.share) {
      await navigator.share({ text: texto });
      return;
    }
  } catch {
  }
  try {
    await navigator.clipboard.writeText(texto);
    aviso.textContent = t("mo.mp.codigo.copiado");
  } catch {
    aviso.textContent = texto;
  }
}
const gravarPartidas = (lista) => {
  partidas = lista;
  guardarLista(lerJSON, escreverJSON, lista);
};
const ERRO_TXT = { invalido: "invalido", versao: "invalido", crc: "invalido", ilegal: "invalido", limite: "invalido", antigo: "antigo", alterada: "alterada", cheia: "cheia" };
function comBadge(b) {
  const n = contarMinhaVez(partidas);
  if (n > 0) {
    const s = document.createElement("span");
    s.className = "badge";
    s.textContent = String(n);
    s.setAttribute("aria-label", fmt("tab.async.menu.pendentes", { n }));
    b.append(s);
  }
  return b;
}
function confirmar(texto, simTxt, aoSim, naoTxt = t("tab.async.desistir.nao")) {
  const r = document.createElement("div");
  r.className = "sobreposicao e5";
  r.append(btn(naoTxt, () => r.remove(), "voltar"), par(texto, "nota"), btn(simTxt, () => {
    r.remove();
    aoSim();
  }, "principal"));
  app.append(r);
  r.querySelector("button").focus();
}
function faixaErro(chave, aoOk) {
  const f = document.createElement("div");
  f.className = "erro-faixa";
  f.setAttribute("role", "alert");
  const p = document.createElement("p");
  p.textContent = t(chave);
  p.style.margin = "0";
  f.append(p, btn(t("tab.async.ok"), aoOk));
  return f;
}
function ecraPartidas(erroChave = "") {
  const r = ecra("E9P");
  const g = agrupar(partidas);
  let aviso = erroChave;
  if (g.invalida.length) {
    gravarPartidas(partidas.filter((x) => !g.invalida.includes(x)));
    g.invalida = [];
    aviso = aviso || "tab.async.corrompida";
  }
  r.append(topo(t("tab.async.titulo"), mpMenu));
  const ac = document.createElement("div");
  ac.className = "acoes";
  ac.append(btn(t("tab.async.convidar"), convidar, "principal"), btn(t("tab.async.colar"), () => ecraColar(), "contorno"));
  r.append(ac, par(fmt("tab.async.contador", { n: partidas.length }), "nota contador"));
  if (aviso) r.append(faixaErro(aviso, () => ecraPartidas()));
  if (!partidas.length) r.append(par(t("tab.async.vazio")));
  const secao = (chave, lista, apagavel, desistivel) => {
    if (!lista.length) return;
    const h = document.createElement("h3");
    h.textContent = t(chave);
    r.append(h);
    for (const x of lista) {
      const est = estadoLista(x);
      const li = document.createElement("div");
      li.className = "linha-l";
      li.dataset.estado = est;
      const b = document.createElement("button");
      b.className = "linha-p contorno";
      const ic = iconePeca(corDe(x));
      ic.classList.add("ic");
      const dias = diasDesde(x);
      const quando = dias === 0 ? t("tab.async.dias.0") : dias === 1 ? t("tab.async.dias.1") : fmt("tab.async.dias.n", { n: dias });
      const tx = document.createElement("span");
      tx.className = "txt";
      const l1 = document.createElement("span");
      l1.textContent = fmt("tab.async.linha", { semente: x.codigo.split("-")[1] });
      const l2 = document.createElement("span");
      l2.className = "sub";
      l2.textContent = `${fmt("tab.async.jogadas", { n: x.jogadas })} \xB7 ${quando}`;
      tx.append(l1, l2);
      const e = document.createElement("span");
      e.className = "est";
      e.textContent = t(`tab.async.estado.${est}`);
      b.append(ic, tx, e);
      b.addEventListener("click", () => abrirPartida(x));
      li.append(b);
      if (desistivel) li.append(btn(t("tab.async.desistir"), () => confirmar(t("tab.async.desistir.confirma"), t("tab.async.desistir.sim"), () => fazerDesistir(x)), "apagar"));
      if (apagavel) li.append(btn(t("tab.async.apagar"), () => confirmar(t("tab.async.apagar.confirma"), t("tab.async.apagar.sim"), () => {
        const o = apagarPartida(partidas, x.semente);
        if (o.ok) gravarPartidas(o.lista);
        ecraPartidas();
      }), "apagar"));
      r.append(li);
    }
  };
  secao("tab.async.sec.minha_vez", g.minha_vez, false, true);
  secao("tab.async.sec.a_espera", g.a_espera, false, true);
  secao("tab.async.sec.terminadas", g.terminada, true, false);
  secao("tab.async.sec.esquecidas", g.esquecida, true, false);
}
function convidar() {
  const c = criarConvite(partidas, Math.floor(Math.random() * SEMENTE_MAX) + 1);
  if (!c.ok) {
    emitir("async:erro", { erro: c.erro });
    return ecraPartidas("tab.async.erro.cheia");
  }
  gravarPartidas(c.lista);
  emitir("async:convite", { semente: c.partida.semente });
  ecraEnviar(c.partida, { convite: true });
  eventoMeta("primeiro_convite");
}
function abrirPartida(g) {
  const est = estadoLista(g);
  if (est === "terminada") return ecraFimMP(g);
  if (!g.jogadas && g.euSou === "A") return ecraEnviar(g, { convite: true });
  ecraPartida(g);
}
function fazerDesistir(g) {
  const o = desistir(partidas, g.semente);
  if (!o.ok) return ecraPartidas("tab.async.erro.invalido");
  gravarPartidas(o.lista);
  emitir("async:desistiu", { semente: g.semente, quem: "eu" });
  if (o.codigo) {
    emitir("async:fim", { semente: g.semente, resultado: "desistiu" });
    return ecraEnviar(o.partida);
  }
  ecraPartidas();
}
async function partilharCodigo(g, aviso, via) {
  const texto = textoPartilha(t("tab.async.frase"), g.codigo);
  if (via === "partilha") {
    try {
      if (navigator.share) {
        await navigator.share({ text: texto });
        emitir("async:enviado", { semente: g.semente, via });
        return true;
      }
    } catch {
      return false;
    }
  }
  try {
    await navigator.clipboard.writeText(via === "copiar" ? g.codigo : texto);
    aviso.textContent = t("tab.async.copiado");
    emitir("async:enviado", { semente: g.semente, via: "copiar" });
    return true;
  } catch {
    aviso.textContent = g.codigo;
    return false;
  }
}
function ecraEnviar(g, opts = {}) {
  const r = ecra("E10P");
  const fimR = resultadoFim(g);
  r.append(topo(t(opts.convite ? "tab.async.convite.titulo" : "tab.async.enviar.titulo"), () => ecraPartidas()));
  r.append(par(t(corDe(g) === 1 ? "tab.async.cor.brancas" : "tab.async.cor.pretas"), "sub"));
  if (fimR) r.append(par(t(fimR.vencedor === 0 ? "tab.async.fim.empate" : fimR.motivo === "desistiu" ? "tab.async.fim.desisti" : fimR.vencedor === corDe(g) ? "tab.async.fim.ganhaste" : "tab.async.fim.perdeste"), "sub"));
  r.append(par(t(opts.convite ? "tab.async.convite.ajuda" : "tab.async.enviar.ajuda"), "nota"));
  const cod = document.createElement("p");
  cod.className = "codigo";
  cod.textContent = g.codigo;
  const aviso = par("", "msg");
  aviso.setAttribute("role", "status");
  let desf = null;
  const enviado = async (via) => {
    const ok = await partilharCodigo(g, aviso, via);
    if (ok && desf) {
      desf.remove();
      desf = null;
    }
  };
  r.append(cod, btn(t("tab.async.partilhar"), () => enviado("partilha"), "principal"), btn(t("tab.async.copiar"), () => enviado("copiar"), "contorno"), aviso);
  if (opts.prev && opts.gAnt) {
    desf = btn(t("tab.async.enviar.desfazer"), () => {
      gravarPartidas(opts.prev);
      ecraPartida(opts.gAnt);
    }, "contorno");
    r.append(desf);
  }
  if (fimR) r.append(btn(t("tab.async.fim.nova"), convidar), btn(t("tab.async.fim.partidas"), () => ecraPartidas()));
  else r.append(btn(t("tab.async.enviar.mais_tarde"), () => ecraPartidas()));
}
function importar(texto) {
  const c = normalizarEntrada(texto);
  const x = importarCodigo(partidas, c, { euSou: "B" });
  if (!x.ok) {
    emitir("async:erro", { erro: x.erro });
    return `tab.async.erro.${ERRO_TXT[x.erro] || "invalido"}`;
  }
  gravarPartidas(x.lista);
  emitir("async:importado", { semente: x.partida.semente, nova: x.nova });
  if (resultadoFim(x.partida)) emitir("async:fim", { semente: x.partida.semente, resultado: "fim" });
  abrirPartida(x.partida);
  return "";
}
function ecraColar(msgChave = "") {
  const r = ecra("E11P");
  r.append(topo(t("tab.async.colar.titulo"), () => ecraPartidas()));
  const slot = document.createElement("div");
  const campo = document.createElement("textarea");
  campo.className = "campo-area";
  campo.placeholder = t("tab.async.colar.campo");
  campo.setAttribute("aria-label", t("tab.async.colar.campo"));
  campo.rows = 4;
  const msg = document.createElement("div");
  const mostrar = (chave) => {
    msg.replaceChildren();
    if (chave) msg.append(faixaErro(chave, () => msg.replaceChildren()));
  };
  r.append(slot, campo, btn(t("tab.async.colar.da_area"), async () => {
    try {
      campo.value = await navigator.clipboard.readText();
      mostrar("");
    } catch {
      mostrar("tab.async.colar.sem_area");
    }
  }, "contorno"), btn(t("tab.async.colar.continuar"), () => mostrar(importar(campo.value)), "principal"), msg);
  mostrar(msgChave);
  (async () => {
    try {
      const tx = await navigator.clipboard.readText();
      if (ecraAtual === "E11P" && lerCodigo(normalizarEntrada(tx)).ok) slot.append(btn(t("tab.async.colar.usar"), () => {
        campo.value = tx;
        mostrar(importar(tx));
      }, "principal"));
    } catch {
    }
  })();
}
function ecraPartida(g) {
  const lr = lerCodigo(g.codigo);
  if (!lr.ok) {
    gravarPartidas(partidas.filter((x) => x.semente !== g.semente));
    return ecraPartidas("tab.async.corrompida");
  }
  cfgAtual = {
    tema: meta.tema,
    modo: "mp",
    nivel: "media",
    cor: corDe(g),
    semente: g.semente,
    historico: lr.jogadas.filter((m) => m !== "X"),
    titulo: fmt("tab.async.e12.titulo", { semente: g.codigo.split("-")[1] }),
    corTexto: t(corDe(g) === 1 ? "tab.async.cor.brancas" : "tab.async.cor.pretas"),
    ultima: ultimaDoAdversario(g)
  };
  const r = ecra("E12P");
  jogoAtual = iniciarPartida(r, cfgAtual, {
    opcoes: () => dados.opcoes,
    guardar: () => {
    },
    aoPausar: (retomar) => pausaMP(g, retomar),
    aoFim: () => {
    },
    aoJogadaMP: (p, m) => {
      const prev = partidas;
      const x = jogarNaPartida(partidas, g.semente, m);
      if (!x.ok) {
        emitir("async:erro", { erro: x.erro });
        return ecraPartidas("tab.async.erro.invalido");
      }
      gravarPartidas(x.lista);
      emitir("async:jogada", { semente: g.semente, jogada: m });
      if (resultadoFim(x.partida)) emitir("async:fim", { semente: g.semente, resultado: "fim" });
      ecraEnviar(x.partida, { prev, gAnt: g });
    }
  });
}
function pausaMP(g, retomar) {
  const r = document.createElement("div");
  r.className = "sobreposicao e5";
  const fechar = () => r.remove();
  const h = document.createElement("h2");
  h.textContent = t("e5.titulo");
  r.append(h);
  r.append(btn(t("e5.continuar"), () => {
    fechar();
    retomar();
  }, "principal"));
  if (g.jogadas) r.append(btn(t("tab.async.enviar.titulo"), () => {
    fechar();
    ecraEnviar(g);
  }, "contorno"));
  r.append(
    btn(t("tab.async.desistir"), () => {
      fechar();
      confirmar(t("tab.async.desistir.confirma"), t("tab.async.desistir.sim"), () => fazerDesistir(g));
    }, "contorno"),
    btn(t("e5.sair"), () => {
      fechar();
      ecraPartidas();
    })
  );
  app.append(r);
  r.querySelector("button").focus();
}
function contarPartidaCodigo(g, f) {
  if (!f) return;
  let cont = [];
  try {
    const c = lerJSON("moinho_contadas");
    if (Array.isArray(c)) cont = c;
  } catch {
  }
  if (cont.includes(g.semente)) return;
  const eu = corDe(g), lr = lerCodigo(g.codigo), js = lr.ok ? lr.jogadas.filter((m) => m !== "X") : [];
  const resultado = f.vencedor === 0 ? "e" : f.vencedor === eu ? "v" : "d";
  let moinhos = 0, q = null, fase3 = false;
  try {
    q = novaPartida({ modo: "mp", nivel: "media", cor: eu, semente: g.semente });
    js.forEach((m, i) => {
      q = jogarCompleta(q, m);
      if (m.tirar !== void 0 && (i % 2 === 0 ? 1 : 2) === eu) moinhos++;
      if (fase(q.estado, 1) === "voar" || fase(q.estado, 2) === "voar") fase3 = true;
    });
  } catch {
  }
  const minhas = js.filter((_, i) => (i % 2 === 0 ? 1 : 2) === eu).length;
  stats = registar(stats, "codigo", { resultado, jogadas: js.length, fase3 });
  stats = registarGlobais(stats, { moinhos, resultado, dia: hojeISO() }, meta.contadores.melhorSerie);
  gravarStats();
  const rf = registarFim(meta, { modo: "codigo", resultado, jogadas: js.length, jogadasMinhas: minhas, moinhos, desistencia: !!f.adversarioDesistiu, fase3 }, ctxMeta());
  meta = rf.meta;
  gravarMeta();
  cont.push(g.semente);
  escreverJSON("moinho_contadas", cont.slice(-100));
  if (rf.xp.total) emitir("xp:ganho", { total: rf.xp.total, linhas: rf.xp.linhas });
  if (rf.subiu) {
    emitir("nivel:subiu", { de: rf.nivelAntes, para: rf.nivelDepois });
    toast(fmt("mo.xp.subiu", { n: rf.nivelDepois }));
  }
  for (const k of rf.novas) {
    emitir("conquista:ganha", { id: k });
    toast(fmt("mo.conq.toast", { nome: t(`mo.conq.${k}.nome`) }));
  }
}
function ecraFimMP(g) {
  const r = ecra("E6");
  const f = resultadoFim(g);
  contarPartidaCodigo(g, f);
  const chave = !f || f.vencedor === 0 ? "tab.async.fim.empate" : f.adversarioDesistiu ? "tab.async.fim.amigo_desistiu" : f.euDesisti ? "tab.async.fim.desisti" : f.vencedor === corDe(g) ? "tab.async.fim.ganhaste" : "tab.async.fim.perdeste";
  const h = document.createElement("h2");
  h.textContent = t(chave);
  r.append(h);
  r.append(par(fmt("tab.async.linha", { semente: g.codigo.split("-")[1] }), "nota"), btn(t("tab.async.fim.nova"), convidar, "principal"), btn(t("tab.async.fim.partidas"), () => ecraPartidas(), "contorno"));
}
function amigos(msgInicial = "") {
  const r = ecra("E14");
  r.append(topo(t("mo.mp.amigos"), mpMenu));
  const msg = par(msgInicial, "msg");
  msg.setAttribute("role", "status");
  if (!meta.perfil) {
    const campo2 = document.createElement("input");
    campo2.type = "text";
    campo2.className = "campo";
    campo2.placeholder = t("mo.mp.alcunha");
    campo2.maxLength = 16;
    campo2.setAttribute("aria-label", t("mo.mp.alcunha"));
    r.append(par(t("mo.mp.alcunha"), "sub"), campo2, btn(t("mo.mp.guardar"), () => {
      const x = novoPerfil(campo2.value);
      if (!x.ok) {
        msg.textContent = t("mo.mp.alcunha.invalida");
        return;
      }
      meta.perfil = x.perfil;
      gravarMeta();
      eventoMeta("perfil");
      amigos();
    }, "principal"), msg);
    return;
  }
  const cartao = gerarCartao(meta.perfil, meta.pontos);
  const cp = document.createElement("p");
  cp.className = "codigo";
  cp.textContent = cartao;
  r.append(par(t("mo.mp.cartao.teu"), "sub"), cp, btn(t("mo.mp.codigo.partilhar"), () => copiar(cartao, msg), "principal"));
  const campo = document.createElement("input");
  campo.type = "text";
  campo.className = "campo";
  campo.placeholder = t("mo.mp.cartao.colar");
  campo.setAttribute("aria-label", t("mo.mp.cartao.colar"));
  r.append(campo, btn(t("mo.mp.cartao.colar"), () => {
    const x = adicionarAmigo(meta.amigos, campo.value, meta.perfil.id);
    if (!x.ok) {
      msg.textContent = t("mo.mp.cartao.invalido");
      return;
    }
    meta.amigos = x.tabela;
    gravarMeta();
    eventoMeta("amigo");
    amigos(t("mo.mp.cartao.adicionado"));
  }), msg);
  const tabela = ordenarTabela([{ alcunha: meta.perfil.alcunha, pontos: meta.pontos, id: meta.perfil.id }, ...meta.amigos]);
  const ol = document.createElement("ol");
  ol.className = "conq";
  for (const a of tabela) {
    const li = document.createElement("li");
    li.className = a.id === meta.perfil.id ? "on" : "";
    li.textContent = `${a.alcunha} \xB7 ${fmt("mo.rank.pontos", { n: a.pontos })}`;
    ol.append(li);
  }
  r.append(ol);
}
let ultimoVoltar = 0, plat = null;
function voltar() {
  const sob = app.querySelector('.sobreposicao:not([style*="none"])');
  if (sob) {
    const b = sob.querySelector(".voltar") || sob.querySelector("button");
    b.click();
    return;
  }
  if (ecraAtual === "E12P") {
    ecraPartidas();
    return;
  }
  if (ecraAtual === "E3") {
    emitir("app:pausa");
    return;
  }
  if (ecraAtual === "E1") {
    const agora = Date.now();
    if (agora - ultimoVoltar < 2e3) {
      plat && plat.sair();
      return;
    }
    ultimoVoltar = agora;
    const a = document.createElement("p");
    a.className = "aviso";
    a.textContent = t("e1.sair");
    app.append(a);
    setTimeout(() => a.remove(), 2e3);
    return;
  }
  menu();
}
async function arrancar() {
  await carregarTextos();
  if (new URLSearchParams(location.search).get("debug") === "1") window.TABULEIRO_DEBUG = { ecra: "E1" };
  try {
    puzzles = await (await fetch(new URL("../data/puzzles.json", import.meta.url))).json();
  } catch {
    puzzles = [];
  }
  try {
    temas = await (await fetch(new URL("../data/temas-loja.json", import.meta.url))).json();
  } catch {
    temas = {};
  }
  carregar();
  aplicarTema(meta.tema);
  try {
    await contas.iniciar({ jogoId: JOGO_ID, schema: SCHEMA, merge: mergeConta, aoMudar: (e) => {
      if (ocupadoConta || !e.sessao || e.sync !== "ok") return;
      ocupadoConta = true;
      contas.carregar().then((d) => {
        ocupadoConta = false;
        if (d && JSON.stringify(d) !== JSON.stringify(lerProgresso(meta, stats, resolvidos))) aplicarConta(d);
      });
    } });
    if (!await contas.carregar()) sincronizar();
    contas.preparar();
  } catch {
  }
  if (window.JogoAudio) {
    window.JogoAudio.ligar({ on: ouvir });
    window.JogoAudio.setLigado(dados.opcoes.som);
  }
  document.addEventListener("pointerdown", () => window.JogoAudio && window.JogoAudio.desbloquear(), { once: true });
  plat = ligarCicloDeVida({ aoVoltar: voltar });
  entrada();
}
function entrada() {
  if (contas.ativo() && !contas.estado().sessao) ecraLogin(contas, { ecra, btn, par, t }, () => menu());
  else menu();
}
arrancar();
