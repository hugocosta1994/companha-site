import { carregarTextos, t } from "./textos.js";
import { emitir, ouvir } from "./eventos.js";
import { ligarCicloDeVida } from "./plataforma/nativo.js";
import { ler, escrever, CHAVE, CHAVE_STATS, CHAVE_PUZZLES, lerJSON, escreverJSON, apagar } from "./plataforma/gravacao.js";
import { VERSAO, PERSONALIDADES, PERSONALIDADE_PADRAO, PUZZLES } from "./config.js";
import { iniciarPartida } from "./jogo/controlo.js";
import { criarTabuleiro, desenhar, marcarMoinho, limparMoinho } from "./jogo/vista.js";
import { fase, destinos, jogar as jogarRegra, aplicar } from "./nucleo/regras.js";
import { novaPartida, jogarCompleta } from "./nucleo/partida.js";
import { escolherJogada } from "./nucleo/ia.js";
import { estadoDoPuzzle, avaliarJogada, moinhosEmUm } from "./nucleo/puzzles.js";
import { registar, modoDe, total, mediaJogadas, validarStats, validarResolvidos, vitoriasIA, tipoAberto, resolvidosDoTipo, proximoPuzzle } from "./nucleo/estatisticas.js";
import { contas } from "./contas/contas.js";
import { ecraConta, ecraLogin } from "./contas/contas-ui.js";
import { JOGO_ID, SCHEMA, lerProgresso, merge as mergeConta } from "./contas/progresso-conta.js";
import { validarGravacao } from "./nucleo/gravacao.js";
import { CHAVE_META, CONQUISTAS, TEMAS_ORDEM, validarMeta, rankDe, proximoRank, registarFim, temaAberto } from "./nucleo/meta.js";
import { criarConvite, jogarNaPartida, importarCodigo, estadoDaPartida, corDe, lerCodigo, novoPerfil, gerarCartao, adicionarAmigo, ordenarTabela, sugerirNivel, SEMENTE_MAX } from "./nucleo/multijogador.js";
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
  dados.partida = p.estado.fim ? null : { modo: p.modo, nivel: p.nivel, personalidade: cfgAtual && cfgAtual.personalidade || PERSONALIDADE_PADRAO, cor: p.cor, semente: p.semente, posicao: p.estado.celas, vez: p.estado.vez, fase: fase(p.estado), historico: p.historico };
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
const NAV_DE = { E1: "jogar", E2: "jogar", E9: "jogar", E13: "jogar", E14: "jogar", E11: "rank", E10: "rank", E12: "loja", E15: "perfil" };
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
  rk.textContent = `${t(`mo.rank.${rankDe(meta.pontos)}`)} \xB7 ${fmt("mo.rank.pontos", { n: meta.pontos })}`;
  const prx = proximoRank(meta.pontos);
  const falta = document.createElement("p");
  falta.className = "rank-falta";
  falta.textContent = prx ? fmt("mo.rank.faltam", { n: prx.faltam, rank: t(`mo.rank.${prx.rank}`) }) : t("mo.rank.maximo");
  const tut = btn(t("mo.menu.como"), () => tutorial(menu), "cartao-como");
  const niveis = document.createElement("div");
  niveis.className = "grupo atalhos";
  niveis.setAttribute("role", "group");
  niveis.setAttribute("aria-label", t("mo.menu.nivel_rapido"));
  for (const id of ["facil", "media", "dificil"]) niveis.append(btn(t(`e2.nivel.${id}`), () => preparar(id), "atalho"));
  const ia = btn(t("mo.menu.jogar_ia"), () => preparar(), dados.partida ? "contorno" : "principal");
  r.append(l, mini.svg, rk, falta);
  if (!meta.tutorialFeito) r.append(tut);
  if (dados.partida) r.append(btn(t("e1.continuar"), continuar, "principal"));
  r.append(ia, niveis, btn(t("mo.menu.amigo"), mpMenu, "contorno alto"));
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
  cfgAtual = { tema: meta.tema, modo: s.modo, nivel: s.nivel, personalidade: s.personalidade || PERSONALIDADE_PADRAO, cor: s.cor, semente: s.semente, historico: s.historico };
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
    }
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
  const r = registarFim(meta, { modo: p.modo, nivel: p.nivel, resultado, jogadas: p.historico.length, pecasPerdidas: tiradas - meus, gata: pers === "mobilidade", moinhos: meus, fase3: chegouAVoar(p) }, ctxMeta());
  meta = r.meta;
  gravarMeta();
  return r;
}
function registarPartida(p) {
  const res = p.estado.fim.resultado;
  const resultado = res === 0 ? "e" : p.modo === "2j" ? res === 1 ? "v" : "d" : res === p.cor ? "v" : "d";
  stats = registar(stats, modoDe(p.modo, p.nivel), { resultado, jogadas: p.historico.length, fase3: chegouAVoar(p) });
  gravarStats();
}
function estatisticas() {
  const r = ecra("E10");
  r.append(topo(t("tab.stats.titulo"), perfil));
  const modos = Object.keys(stats).filter((k) => stats[k].partidas > 0);
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
      stats = {};
      apagar(CHAVE_STATS);
      sincronizar();
      estatisticas();
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
function lugar() {
  const r = ecra("E11");
  const rk = rankDe(meta.pontos), prox = proximoRank(meta.pontos);
  r.append(topo(t("mo.rank.titulo")));
  const c = document.createElement("div");
  c.className = "cartao-lugar";
  const c1 = document.createElement("span");
  c1.className = "c-pequeno";
  c1.textContent = t("mo.rank.lugar");
  const c2 = document.createElement("strong");
  c2.textContent = t(`mo.rank.${rk}`);
  const c3 = document.createElement("span");
  c3.textContent = fmt("mo.rank.pontos", { n: meta.pontos });
  c.append(c1, c2, c3);
  r.append(c);
  if (prox) r.append(par(`${fmt("mo.rank.proximo", { rank: t(`mo.rank.${prox.rank}`) })} \xB7 ${fmt("mo.rank.pontos", { n: prox.faltam })}`));
  const ab = CONQUISTAS.filter((k) => meta.conquistas[k]);
  r.append(par(`${t("mo.conq.titulo")}: ${fmt("mo.conq.n_de", { n: ab.length, total: CONQUISTAS.length })}`, "sub"));
  const lista = document.createElement("ul");
  lista.className = "conq";
  for (const k of CONQUISTAS) {
    const li = document.createElement("li");
    const on = !!meta.conquistas[k];
    li.className = on ? "on" : "";
    li.textContent = on ? `${t(`mo.conq.${k}.nome`)} \u2014 ${t(`mo.conq.${k}.desc`)}` : `${t("mo.conq.por_abrir")}: ${t(`mo.conq.${k}.desc`)}`;
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
    btn(t("mo.mp.codigo"), () => mpCodigos(), "principal"),
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
  meta.partidas = lista;
  gravarMeta();
};
function mpCodigos(msgInicial = "") {
  const r = ecra("E13");
  r.append(topo(t("mo.mp.codigo"), mpMenu), btn(t("mo.mp.criar"), () => {
    const c = criarConvite(meta.partidas, Math.floor(Math.random() * SEMENTE_MAX) + 1);
    if (!c.ok) return mpCodigos(t(`mo.mp.erro.${c.erro}`));
    gravarPartidas(c.lista);
    mpPartida(c.partida);
  }, "principal"));
  const campo = document.createElement("input");
  campo.type = "text";
  campo.className = "campo";
  campo.placeholder = t("mo.mp.codigo.campo");
  campo.setAttribute("aria-label", t("mo.mp.codigo.campo"));
  const msg = par(msgInicial, "msg");
  msg.setAttribute("role", "status");
  r.append(campo, btn(t("mo.mp.entrar"), () => {
    const x = importarCodigo(meta.partidas, campo.value, { euSou: "B" });
    if (!x.ok) {
      msg.textContent = ["cheia", "antigo", "alterada"].includes(x.erro) ? t(`mo.mp.erro.${x.erro}`) : t(x.erro === "ilegal" ? "mo.mp.jogada.invalida" : "mo.mp.codigo.invalido");
      return;
    }
    gravarPartidas(x.lista);
    mpPartida(x.partida);
  }), msg, par(t("mo.mp.minhas"), "sub"));
  if (!meta.partidas.length) r.append(par(t("mo.mp.vazio")));
  for (const g of meta.partidas) {
    const est = estadoDaPartida(g);
    r.append(btn(`${t("mo.mp.abrir")} \xB7 ${t(`mo.mp.estado.${est}`)} \xB7 ${g.codigo.split("-")[1]}`, () => mpPartida(g)));
  }
}
function mpPartida(g) {
  const est = estadoDaPartida(g);
  if (est === "minha_vez") {
    const lr = lerCodigo(g.codigo);
    cfgAtual = { tema: meta.tema, modo: "mp", nivel: "media", cor: corDe(g), semente: g.semente, historico: lr.ok ? lr.jogadas.filter((m) => m !== "X") : [] };
    const r2 = ecra("E3");
    jogoAtual = iniciarPartida(r2, cfgAtual, {
      opcoes: () => dados.opcoes,
      guardar: () => {
      },
      aoPausar: (retomar) => pausa(retomar),
      aoFim: () => {
      },
      aoJogadaMP: (p, m) => {
        const x = jogarNaPartida(meta.partidas, g.semente, m);
        if (x.ok) {
          gravarPartidas(x.lista);
          mpPartida(x.partida);
        } else mpCodigos(t("mo.mp.jogada.invalida"));
      }
    });
    return;
  }
  const r = ecra("E13");
  r.append(topo(t("mo.mp.titulo"), () => mpCodigos()), par(t(corDe(g) === 1 ? "mo.mp.cor.brancas" : "mo.mp.cor.pretas"), "sub"));
  const aviso = par("", "msg");
  aviso.setAttribute("role", "status");
  if (est === "terminada") r.append(par(t("mo.mp.terminada")));
  else r.append(par(t("mo.mp.espera")), par(t("mo.mp.codigo.enviar")));
  const cod = document.createElement("p");
  cod.className = "codigo";
  cod.textContent = g.codigo;
  r.append(
    par(t("mo.mp.codigo.teu"), "sub"),
    cod,
    btn(t("mo.mp.codigo.partilhar"), () => copiar(g.codigo, aviso), "principal"),
    btn(t("mo.mp.copiar"), async () => {
      try {
        await navigator.clipboard.writeText(g.codigo);
        aviso.textContent = t("mo.mp.codigo.copiado");
      } catch {
        aviso.textContent = g.codigo;
      }
    })
  );
  const campo = document.createElement("input");
  campo.type = "text";
  campo.className = "campo";
  campo.placeholder = t("mo.mp.jogada.recebida");
  campo.setAttribute("aria-label", t("mo.mp.jogada.recebida"));
  if (est !== "terminada") r.append(campo, btn(t("mo.mp.jogada.recebida"), () => {
    const x = importarCodigo(meta.partidas, campo.value, { euSou: g.euSou });
    if (!x.ok || x.partida.semente !== g.semente) {
      aviso.textContent = t(x.ok ? "mo.mp.jogada.invalida" : ["antigo", "alterada"].includes(x.erro) ? `mo.mp.erro.${x.erro}` : "mo.mp.jogada.invalida");
      return;
    }
    gravarPartidas(x.lista);
    mpPartida(x.partida);
  }));
  const conf = document.createElement("div");
  r.append(aviso, btn(t("mo.mp.deixar"), () => {
    conf.replaceChildren(par(t("mo.mp.desistir.confirmar")), btn(t("e5.recomecar.sim"), () => {
      gravarPartidas(meta.partidas.filter((x) => x.semente !== g.semente));
      mpCodigos();
    }), btn(t("e5.recomecar.nao"), () => conf.replaceChildren()));
  }), conf);
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
