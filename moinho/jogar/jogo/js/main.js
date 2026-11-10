import { carregarTextos, t } from "./textos.js";
import { emitir, ouvir } from "./eventos.js";
import { ligarCicloDeVida, partilharTexto } from "./plataforma/nativo.js";
import { ler, escrever, CHAVE, CHAVE_STATS, CHAVE_PUZZLES, lerJSON, escreverJSON, apagar } from "./plataforma/gravacao.js";
import { VERSAO, PERSONALIDADES, PERSONALIDADE_PADRAO, PUZZLES, MODOS_STATS_ATIVOS } from "./config.js";
import { iniciarPartida } from "./jogo/controlo.js";
import { criarTabuleiro, desenhar, marcarMoinho, limparMoinho, iconePeca, definirFormaPreta } from "./jogo/vista.js";
import { fase, destinos, jogar as jogarRegra, aplicar } from "./nucleo/regras.js";
import { novaPartida, jogarCompleta } from "./nucleo/partida.js";
import { escolherJogada } from "./nucleo/ia.js";
import { estadoDoPuzzle, avaliarJogada, moinhosEmUm } from "./nucleo/puzzles.js";
import { registar, registarGlobais, taxaVitoria, vitoriasPorNivel, modoDe, total, mediaJogadas, validarStats, validarResolvidos, vitoriasIA, tipoAberto, resolvidosDoTipo, proximoPuzzle, statsParaGravar, puzzlesParaGravar } from "./nucleo/estatisticas.js";
import { contas } from "./contas/contas.js";
import { ecraConta, ecraLogin } from "./contas/contas-ui.js";
import { JOGO_ID, SCHEMA, lerProgresso, merge as mergeConta } from "./contas/progresso-conta.js";
import { validarGravacao } from "./nucleo/gravacao.js";
import { migrarSaves } from "./nucleo/migracao.js";
import { novosDesbloqueios, linhasGanhos, proximoDesafio } from "./nucleo/meta.js";
import { CHAVE_META, CONQUISTAS, TEMAS_ORDEM, validarMeta, rankDe, proximoRank, hojeISO, registarFim, temaAberto, nivelDe, proximoNivel, patenteDeNivel, xpDoNivel, estadoDesafio, serieAtual, conquistaEvento, desbloqueioCosmetico, condicaoCosmetico, aplicarCosmetico, novosCosmeticos } from "./nucleo/meta.js";
import { criarConvite, jogarNaPartida, importarCodigo, estadoDaPartida, corDe, lerCodigo, novoPerfil, gerarCartao, adicionarAmigo, ordenarTabela, sugerirNivel, SEMENTE_MAX, posicaoDoDia, sementeDoDia, podeJogarDesafio } from "./nucleo/multijogador.js";
import { normalizarEntrada, agrupar, estadoLista, contarMinhaVez, diasDesde, ultimaDoAdversario, resultadoFim, desistir, apagar as apagarPartida, carregarLista, guardarLista, textoPartilha } from "./nucleo/partidas.js";
import { NIVEIS_ORDEM } from "./config.js";
import { criarCompras, playIdDoTema, SKU_SEM_ANUNCIOS, PRODUTOS } from "./plataforma/compras.js";
import { SELOS, estadoDe, secoes, cartoesApoio } from "./nucleo/loja-secoes.js";
import * as anuncios from "./plataforma/anuncios.js";
import { criarFeedbackUI } from "./jogo/feedbackTesterUI.js";
import { lerConfig as lerConfigContas } from "./contas/config.js";
import { criarToques, alternarContador } from "./plataforma/fps.js";
import { podeSlot, conceder, semAnuncios } from "./nucleo/anuncios-regras.js";
import { ANUNCIOS } from "./config.js";
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
  escreverJSON(CHAVE_STATS, statsParaGravar(stats, lerJSON(CHAVE_STATS)));
  escreverJSON(CHAVE_PUZZLES, puzzlesParaGravar(resolvidos, lerJSON(CHAVE_PUZZLES)));
  aplicarTema(meta.tema);
}
const gravarMeta = () => {
  escreverJSON(CHAVE_META, meta);
  sincronizar();
};
const ctxMeta = () => ({ vitoriasIA: vitoriasIA(stats), puzzlesResolvidos: Object.keys(resolvidos).length });
let cosmeticos = [];
const itemCosm = (id) => cosmeticos.find((i) => i.id === id);
function varsCosm(el, peca, moldura) {
  const pc = peca && itemCosm(peca), md = moldura && itemCosm(moldura);
  if (pc) {
    el.style.setProperty("--peca-b", pc.branca);
    el.style.setProperty("--peca-p", pc.preta);
  }
  if (el === document.documentElement) definirFormaPreta(pc ? pc.formaPreta : "quadrado");
  if (md) {
    el.style.setProperty("--moldura", md.cor);
    el.style.setProperty("--moldura-l", `${md.largura || 3}px`);
  }
}
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
  varsCosm(document.documentElement, meta.peca, meta.moldura);
  document.documentElement.classList.toggle("com-moldura", !!(meta.moldura && itemCosm(meta.moldura)));
}
function carregar() {
  try {
    migrarSaves({ get: (k) => localStorage.getItem(k), set: (k, v) => localStorage.setItem(k, v) });
  } catch {
  }
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
  escreverJSON(CHAVE_STATS, statsParaGravar(stats, lerJSON(CHAVE_STATS)));
  sincronizar();
};
const gravarResolvidos = () => {
  escreverJSON(CHAVE_PUZZLES, puzzlesParaGravar(resolvidos, lerJSON(CHAVE_PUZZLES)));
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
function botaoAnuncio(slot, ctx, aoGanhar) {
  const caixa = document.createElement("div");
  caixa.className = "anuncio";
  if (!podeSlot(meta, slot, ctx).ok) return caixa;
  const id = ANUNCIOS.SLOTS[slot], direto = semAnuncios(meta);
  anuncios.recompensa.preparar(id).then((ok) => {
    if (!ok || !caixa.isConnected || !podeSlot(meta, slot, ctx).ok) return;
    const nome = t(`mo.ad.${slot}`), txt = direto ? nome : `\u25B6 ${t("mo.ad.ver")} \xB7 ${nome}`;
    const b = btn(txt, async () => {
      b.disabled = true;
      const r = await anuncios.recompensa.mostrar(id);
      b.remove();
      if (!r.ganhou) return;
      const c = conceder(meta, slot, ctx);
      if (c) {
        gravarMeta();
        aoGanhar(c);
      }
    }, "contorno anuncio-btn");
    b.setAttribute("aria-label", txt);
    caixa.append(b);
  });
  return caixa;
}
function criarEl(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.append(...filhos);
  return e;
}
function btn(txt, f, cls = "") {
  const b = document.createElement("button");
  b.textContent = txt;
  if (cls) b.className = cls;
  b.addEventListener("click", f);
  return b;
}
const NAV_DE = { E1: "jogar", E2: "jogar", E9P: "jogar", E10P: "jogar", E11P: "jogar", E13: "jogar", E14: "jogar", E11: "rank", E12: "loja", E15: "perfil", E9: "perfil", E10: "perfil" };
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
    const g = btn("\u2699", () => abrirOpcoes(REABRE[ecraAtual] || menu), "icone-b engrenagem");
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
  for (const id of ["facil", "media", "dificil"]) niveis.append(btn(t(`mo.nivel.${NIVEIS_ORDEM.indexOf(id) + 1}.nome`), () => preparar(id), "atalho"));
  const ia = btn(t("mo.menu.jogar_ia"), () => preparar(), dados.partida ? "contorno" : "principal");
  const prox = proximoDesafio(meta);
  r.append(l, mini.svg, rk, falta);
  if (prox) {
    const pd = par(fmt("mo.menu.proximo", { nivel: t(`mo.nivel.${NIVEIS_ORDEM.indexOf(prox) + 1}.nome`) }), "nota proximo-desafio");
    r.append(pd);
  }
  r.append(cartaoDesafio());
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
function avisarCosm(antes) {
  for (const n of novosCosmeticos(antes, meta, cosmeticos, ctxMeta())) {
    const it = itemCosm(n.id);
    emitir("cosmetico:desbloqueado", n);
    if (it) toast(fmt("mo.cosm.toast", { nome: it.n }));
  }
}
function eventoMeta(id) {
  const x = conquistaEvento(meta, id);
  if (!x.novas.length) return;
  const antes = meta;
  meta = x.meta;
  gravarMeta();
  avisarCosm(antes);
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
      if ((meta.niveisVencidos || []).includes(id)) {
        const sv = document.createElement("span");
        sv.className = "selo-vencido";
        sv.textContent = t("mo.nivel.vencido");
        sv.title = t("mo.nivel.vencido.aria");
        b.append(sv);
        b.setAttribute("aria-description", t("mo.nivel.vencido.aria"));
      }
      return b;
    });
    g.append(...bs);
    marca();
    r.append(s0, g);
    if (sug) {
      const nome = t(`mo.nivel.${NIVEIS_ORDEM.indexOf(sug.para) + 1}.nome`);
      const nq = sug.tipo === "descer" ? par(t("mo.nivel.descer.nota"), "nota") : null;
      const q = btn(fmt(sug.tipo === "subir" ? "mo.nivel.experimentar" : "mo.nivel.descer", { nivel: nome }), () => {
        esc.nivel = sug.para;
        marca();
        q.remove();
        if (nq) nq.remove();
      }, "contorno sugestao-nivel");
      q.dataset.sugestao = sug.tipo;
      r.append(q);
      if (nq) r.append(nq);
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
    g.className = "grupo grupo-feitios";
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
    aoFim: (p) => fim(p),
    avatar: () => itemCosm(meta.moldura) ? avatarMoldura(itemCosm(meta.moldura), "peq") : null
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
      abrirOpcoes(() => {
        r.style.display = "";
        sobrepor();
      }, true, () => {
        r.style.display = "none";
      });
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
  const metaAntes = meta, ctxAntes = ctxMeta();
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
  {
    const mdf = itemCosm(meta.moldura);
    if (mdf) {
      const w = document.createElement("div");
      w.className = "av-fim";
      w.append(avatarMoldura(mdf, "med"));
      r.append(w);
    }
  }
  r.append(h, m, c);
  if (rm) {
    const novos = novosDesbloqueios(metaAntes, meta, temas, cosmeticos, ctxAntes, ctxMeta());
    const linhas = linhasGanhos(rm, novos, { tetoAtingido: meta.xpHoje.n >= 400 });
    if (rm.xp && rm.xp.total) emitir("xp:ganho", { total: rm.xp.total, linhas: rm.xp.linhas });
    if (rm.subiu) emitir("nivel:subiu", { de: rm.nivelAntes, para: rm.nivelDepois });
    for (const k of rm.novas) emitir("conquista:ganha", { id: k });
    for (const n of novos) emitir("cosmetico:desbloqueado", n);
    if (linhas.length) {
      r.append(blocoGanhos(linhas));
      r.classList.add("com-ganhos");
    }
    const gp = document.createElement("p");
    gp.className = "nota";
    gp.textContent = rm.ganhos ? fmt("mo.fim.ganhos", { n: rm.ganhos }) : p.modo === "ia" && meta.hoje >= 40 ? t("mo.fim.limite") : "";
    if (gp.textContent) r.append(gp);
    if (rm.rankDepois > rm.rankAntes) {
      const q = document.createElement("p");
      q.className = "nota destaque";
      q.textContent = fmt("mo.rank.subiste", { rank: t(`mo.rank.${rm.rankDepois}`) });
      r.append(q);
    }
    if (rm.desafioSerie !== void 0) emitir("desafio:fim", { ganhou: res === p.cor, serie: rm.desafioSerie });
  }
  const pers = cfgAtual && cfgAtual.personalidade;
  if (p.modo === "ia" && PERSONALIDADES[pers]) {
    const fr = document.createElement("p");
    fr.className = "nota";
    fr.textContent = t(`tab.ia.${pers}.${res === p.cor ? "perde" : res === 0 ? "empate" : "ganha"}`);
    r.append(fr);
  }
  r.append(btn(t("fim.revanche"), () => {
    const n = { modo: p.modo, nivel: p.nivel, personalidade: pers, cor: p.modo === "ia" ? 3 - p.cor : 1 };
    comecar(n);
  }, "principal"), btn(t("fim.menu"), menu));
  if (rm && p.modo === "ia" && res === p.cor && rm.moedas > 0) r.append(botaoAnuncio("A1", { moedasPartida: rm.moedas }, (c2) => toast(fmt("mo.ad.A1.ok", { n: c2.moedas }))));
  if (rm && cfgAtual && cfgAtual.desafio && res !== p.cor && metaAntesFim) {
    const antes = metaAntesFim;
    r.append(botaoAnuncio("A2", {}, () => {
      meta.desafio = antes.desafio;
      meta.ultimoDesafio = antes.ultimoDesafio;
      meta.contadores.desafioDias = antes.contadores.desafioDias;
      gravarMeta();
      comecarDesafio();
    }));
  }
}
function blocoGanhos(linhas) {
  const b = document.createElement("section");
  b.className = "ganhos-fim";
  b.setAttribute("aria-label", t("mo.fim.ganhos.aria"));
  const h = document.createElement("h3");
  h.textContent = t("mo.fim.ganhos.titulo");
  const ul = document.createElement("ul");
  ul.className = "ganhos-lista";
  for (const l of linhas) {
    const li = document.createElement("li");
    li.dataset.ganho = l.ganho;
    if (!["xp", "teto"].includes(l.ganho)) li.className = "destaque";
    const tx = document.createElement("span");
    tx.className = "ganho-tx";
    if (l.ganho === "xp") {
      const ln = [];
      for (const k of ["base", "moinhos", "ia", "desafio"]) if (l.linhas[k]) ln.push(fmt(`mo.xp.linha.${k}`, { n: l.linhas[k] }));
      tx.textContent = fmt("mo.fim.ganhos.xp", { n: l.n, linhas: ln.join(t("mo.fim.ganhos.sep")) });
      li.append(tx);
    } else if (l.ganho === "nivel") {
      tx.textContent = fmt("mo.fim.ganhos.nivel", { n: l.n });
      li.append(tx, barraXP());
    } else if (l.ganho === "moedas") {
      tx.textContent = fmt("mo.fim.ganhos.moedas", { n: l.n });
      li.append(tx);
    } else if (l.ganho === "conquista") {
      tx.textContent = fmt("mo.fim.ganhos.conquista", { nome: t(`mo.conq.${l.id}.nome`) });
      li.append(tx);
    } else if (l.ganho === "teto") {
      tx.textContent = t("mo.fim.ganhos.teto");
      li.append(tx);
    } else if (l.ganho === "cosmetico") {
      const it = l.tipo === "tema" ? temas[l.id] : itemCosm(l.id);
      if (!it) continue;
      tx.textContent = fmt("mo.fim.ganhos.cosmetico", { nome: it.n });
      const mini = document.createElement("span");
      mini.className = `ganho-mini mini-${l.tipo}`;
      mini.setAttribute("aria-hidden", "true");
      if (l.tipo === "tema") {
        mini.style.background = it.fundo;
        mini.style.borderColor = it.linha;
        mini.style.color = it.preta;
      } else if (l.tipo === "peca") {
        mini.style.background = it.sup || "var(--superficie)";
        mini.style.color = it.preta;
      } else if (l.tipo === "moldura") mini.style.borderColor = it.cor;
      const emUso = () => (l.tipo === "tema" ? meta.tema : meta[l.tipo]) === l.id;
      const usar = btn("", () => {
        if (l.tipo === "tema") mudarTema(l.id);
        else {
          const o = aplicarCosmetico(meta, it, ctxMeta());
          if (!o.aplicado) return;
          meta = o.meta;
          gravarMeta();
          aplicarTema(meta.tema);
        }
        emitir("cosmetico:aplicado", { id: l.id });
        marca();
      }, "contorno usar");
      const marca = () => {
        usar.textContent = t(emUso() ? "mo.fim.ganhos.em_uso" : "mo.fim.ganhos.usar");
        usar.disabled = emUso();
      };
      marca();
      li.append(mini, tx, usar);
    }
    ul.append(li);
  }
  b.append(h, ul);
  return b;
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
let metaAntesFim = null;
function registarMeta(p) {
  const res = p.estado.fim.resultado;
  const eu = p.modo === "ia" ? p.cor : 1;
  const resultado = res === 0 ? "e" : p.modo === "2j" ? "v" : res === p.cor ? "v" : "d";
  const tiradas = p.historico.filter((m) => m !== "X" && m !== "W" && m.tirar !== void 0).length;
  const pers = cfgAtual && cfgAtual.personalidade;
  const meus = p.historico.filter((m, i) => m.tirar !== void 0 && (i % 2 === 0 ? 1 : 2) === eu).length;
  const r = registarFim(meta, { modo: p.modo, nivel: p.nivel, resultado, jogadas: p.historico.length, pecasPerdidas: tiradas - meus, gata: pers === "mobilidade", personalidade: pers, iaMoinhos: p.modo === "ia" ? tiradas - meus : void 0, jogadasMinhas: Math.ceil((p.historico.length - (cfgAtual && cfgAtual.desafioIni || 0)) / (p.modo === "ia" ? 2 : 1)), moinhos: meus, fase3: chegouAVoar(p), desafio: !!(cfgAtual && cfgAtual.desafio) }, ctxMeta());
  metaAntesFim = JSON.parse(JSON.stringify(meta));
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
const nomeNivel = (id) => t(`mo.nivel.${NIVEIS_ORDEM.indexOf(id) + 1}.nome`);
function estatisticas() {
  const r = ecra("E10");
  r.append(topo(t("tab.stats.titulo"), perfil));
  const modos = MODOS_STATS_ATIVOS.filter((k) => stats[k] && stats[k].partidas > 0);
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
    nm.textContent = nomeNivel(x.nivel);
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
  for (const k of modos) bloco(k.startsWith("ia_") ? `${t("mo.nivel.titulo")}: ${nomeNivel(k.slice(3))}` : t(`tab.stats.modo.${k}`), stats[k], k === "dois");
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
const adDicasPuzzle = /* @__PURE__ */ new Map();
function puzzle(pz, dicasUsadas = 0) {
  const r = ecra("E9");
  let e = estadoDoPuzzle(pz), passo = 0, sel = null, feito = false, dicas = PUZZLES.dicasMax - dicasUsadas, dicaPonto = null;
  const doTipo = puzzles.filter((q) => q.tipo === pz.tipo), nPz = Math.max(1, doTipo.findIndex((q) => q.id === pz.id) + 1);
  const h = topo(`${t(`tab.puzzle.${pz.tipo}.nome`)} \xB7 ${fmt("tab.puzzle.n_de", { n: nPz, total: doTipo.length || 3 })}`, finais);
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
  let caixaDica = null;
  function ofertaDica() {
    if (feito || dicas > 0 || caixaDica) return;
    caixaDica = botaoAnuncio("A3", { dicasUsadasNoPuzzle: adDicasPuzzle.get(pz.id) || 0 }, () => {
      adDicasPuzzle.set(pz.id, (adDicasPuzzle.get(pz.id) || 0) + 1);
      dicas++;
      caixaDica = null;
      pintar();
    });
    acoes.after(caixaDica);
  }
  function pintar() {
    const dests = sel !== null ? destinos(e, sel) : [];
    if (dicaPonto !== null) dests.push(dicaPonto);
    desenhar(tab, e.celas, { destinos: dests, selecionado: sel, daltonico: dados.opcoes.daltonico });
    dicaBtn.textContent = dicas > 0 ? `${t("tab.puzzle.dica")} (${dicas})` : t("tab.puzzle.sem_dicas");
    dicaBtn.disabled = dicas <= 0 || feito;
    if (feito && caixaDica) {
      caixaDica.remove();
      caixaDica = null;
    } else ofertaDica();
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
      const resp = escolherJogada(e, { nivel: "media", semLimite: true, variar: false });
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
  acoes.append(dicaBtn, btn(t("tab.puzzle.recomecar"), () => puzzle(pz, PUZZLES.dicasMax - dicas)));
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
let ecraOrigemFb = "";
let fbUIc = null;
function fb() {
  if (!fbUIc) {
    fbUIc = criarFeedbackUI({ t: fmt, criar: criarEl, lerConfig: () => lerConfigContas(), ecraAtual: () => ecraOrigemFb });
    document.body.append(fbUIc.dlg);
  }
  return fbUIc;
}
async function abrirOpcoes(voltar2, daPausa = false, aoPreparar = () => {
}) {
  ecraOrigemFb = String(ecraAtual || "");
  try {
    await Promise.race([Promise.resolve(fb().aoAbrirDefinicoes()), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
  }
  aoPreparar();
  opcoes(() => {
    fb().aoFecharDefinicoes();
    voltar2();
  }, daPausa);
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
  {
    const toque = criarToques(5);
    v.addEventListener("click", () => {
      if (toque()) alternarContador(t, fmt);
    });
  }
  const priv = btn(t("mo.anuncio.privacidade"), () => {
    anuncios.abrirPrivacidade().catch((e) => console.warn("[main] privacidade:", e));
  });
  priv.id = "btn-def-privacidade";
  priv.hidden = !anuncios.opcoesPrivacidade();
  anuncios.iniciar().then(() => {
    priv.hidden = !anuncios.opcoesPrivacidade();
  }).catch(() => {
  });
  const avisoCompras = par("", "msg");
  avisoCompras.setAttribute("role", "status");
  fb().botao.hidden = !fb().visivel();
  alvo.append(som, dest, dalt, vib, priv, btnRestaurar(avisoCompras), avisoCompras, fb().botao, repor, rep, v, btn("\u2039", () => {
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
function btnRestaurar(aviso, depois = () => {
}) {
  let aCorrer = false;
  const b = btn(t("mo.loja.restaurar"), async () => {
    if (aCorrer) return;
    aCorrer = true;
    b.disabled = true;
    try {
      const x = await compras.restaurar();
      aviso.textContent = x.resultado === "erro" ? t("mo.loja.sem_ligacao") : x.n ? fmt("mo.cosm.restauradas", { n: x.n }) : t("mo.loja.restaurar.vazio");
      depois();
    } finally {
      aCorrer = false;
      b.disabled = false;
    }
  }, "btn-restaurar");
  return b;
}
const mudarTema = (id) => {
  meta.tema = id;
  gravarMeta();
  aplicarTema(id);
};
function tutorial(depois) {
  const r = ecra("E7");
  const LINHA = [0, 1, 2], ADV = [12, 20];
  const T0 = Date.now();
  let passo = 0, sel = null, temp = null;
  let sub = 0;
  const reduzir = () => {
    try {
      return matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  };
  const celas = new Array(24).fill(0);
  for (const p of ADV) celas[p] = 2;
  const msg = par("", "msg");
  msg.setAttribute("role", "status");
  const txt = par("", "sub");
  const prog = par("");
  const extra = document.createElement("div");
  extra.className = "tut-extra";
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
  const fimTut = (concluido) => {
    clearTimeout(temp);
    emitir("tutorial:fim", { saltado: !concluido, ms: Date.now() - T0 });
    if (concluido && !meta.tutorialCompleto) {
      meta.tutorialCompleto = true;
      meta.xp += 50;
    }
    meta.tutorialFeito = true;
    dados.tutorialVisto = true;
    gravarMeta();
    gravar();
    depois();
  };
  r.append(h2(t("mo.tut.titulo")), par(t("mo.tut.objetivo"), "objetivo"), prog, tab.svg, txt, msg, extra, acoes);
  const maq = (el) => {
    el.classList.add("tut-maqueta");
    return el;
  };
  const exemplo = () => par(t("mo.tut.exemplo"), "nota tut-exemplo");
  const brilho = (b) => {
    b.classList.add("tut-alvo");
    return b;
  };
  const codigo = () => {
    const c = document.createElement("code");
    c.className = "tut-codigo";
    c.textContent = "MOI1-EXEMPLO";
    c.setAttribute("aria-hidden", "true");
    c.style.userSelect = "none";
    return c;
  };
  function barraMaqueta() {
    const w = maq(document.createElement("div"));
    w.className += " xp";
    const rm = reduzir();
    const b = document.createElement("div");
    b.className = "xp-barra";
    b.setAttribute("role", "progressbar");
    b.setAttribute("aria-label", t("mo.xp.barra"));
    b.setAttribute("aria-valuemin", "0");
    b.setAttribute("aria-valuemax", "60");
    b.setAttribute("aria-valuenow", rm ? "60" : "0");
    const i = document.createElement("i");
    i.style.width = rm ? "100%" : "0%";
    if (!rm) i.style.transition = "width 800ms linear";
    b.append(i);
    const nv = par(rm ? t("mo.tut.7.nivel") : "", "nota destaque faixa-nivel");
    if (!rm) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        i.style.width = "100%";
      }));
      setTimeout(() => {
        nv.textContent = t("mo.tut.7.nivel");
        b.setAttribute("aria-valuenow", "60");
      }, 800);
    }
    w.append(exemplo(), b, par(t("mo.tut.7.linhas"), "nota"), nv);
    return w;
  }
  function pintar() {
    clearTimeout(temp);
    msg.textContent = "";
    extra.replaceChildren();
    acoes.replaceChildren();
    const maquetas = passo >= 6 && passo <= 8;
    tab.svg.style.display = maquetas ? "none" : "";
    let alvo = passo < 3 ? [LINHA[passo]] : [];
    if (passo === 4) alvo = sel === null ? [] : [3];
    if (passo === 5) alvo = sel === null ? [] : celas.map((v, i) => v ? -1 : i).filter((i) => i >= 0);
    if (!maquetas) desenhar(tab, celas, { destinos: alvo, selecionado: sel !== null ? sel : passo === 4 ? 2 : passo === 5 ? 0 : null, removiveis: passo === 3 ? ADV : null, daltonico: dados.opcoes.daltonico });
    prog.textContent = passo < 9 ? fmt("mo.tut.passo", { n: passo + 1 }) : "";
    const CH = ["1", "2", "3", "4", "5", "6", "7.xp", sub ? "8.codigo" : "8.convidar", sub ? "9.recebida" : "9.colar"];
    txt.textContent = passo < 9 ? t(`mo.tut.${CH[passo]}`) : "";
    if (passo === 9) {
      msg.textContent = t("mo.tut.fim");
      acoes.append(btn(t("mo.tut.comecar"), () => fimTut(true), "principal"));
      return;
    }
    emitir("tutorial:passo", { n: passo + 1 });
    const seguinte = () => {
      sub = 0;
      passo++;
      pintar();
    };
    const abrir = () => {
      sub = 1;
      pintar();
    };
    let dica = null;
    if (passo === 6) {
      extra.append(barraMaqueta());
      dica = btn(t("mo.tut.7.continuar"), seguinte, "principal");
      acoes.append(dica);
    } else if (passo === 7 && !sub) {
      dica = brilho(btn(t("tab.async.convidar"), abrir));
      extra.append(maq(dica));
    } else if (passo === 7) {
      const p = btn(t("tab.async.partilhar"), () => {
      });
      p.setAttribute("aria-hidden", "true");
      p.tabIndex = -1;
      p.style.pointerEvents = "none";
      extra.append(maq(Object.assign(document.createElement("div"), {})));
      extra.lastChild.append(exemplo(), codigo(), p);
      dica = btn(t("mo.tut.7.continuar"), seguinte, "principal");
      acoes.append(dica);
    } else if (passo === 8 && !sub) {
      const w = maq(document.createElement("div"));
      dica = brilho(btn(t("tab.async.colar"), abrir));
      w.append(exemplo(), codigo(), dica);
      extra.append(w);
    } else if (passo === 8) {
      extra.append(maq(Object.assign(document.createElement("div"), {})));
      extra.lastChild.append(exemplo());
      tab.svg.style.display = "";
      const c2 = new Array(24).fill(0);
      c2[0] = 2;
      c2[1] = 1;
      c2[2] = 1;
      desenhar(tab, c2, { selecionado: 1, destinos: [4], daltonico: dados.opcoes.daltonico });
      temp = setTimeout(() => desenhar(tab, c2, { daltonico: dados.opcoes.daltonico }), 600);
      dica = btn(t("mo.tut.7.continuar"), seguinte, "principal");
      acoes.append(dica);
    }
    acoes.append(btn(t("mo.tut.saltar"), () => fimTut(false)));
    const d = dica;
    temp = setTimeout(() => (d || tab.svg).classList.add("tut-alvo"), 8e3);
  }
  function tocar(pt) {
    if (passo > 5) return;
    if (passo < 3) {
      if (pt !== LINHA[passo]) {
        msg.textContent = t("mo.tut.dica.errada");
        return;
      }
      celas[pt] = 1;
      passo++;
      if (passo === 3) {
        clearTimeout(temp);
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
    nivel20: f(nivelDe(meta.xp), 20),
    nivel30: f(nivelDe(meta.xp), 30),
    quatro_feitios: f((meta.persVencidas || []).length, 4)
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
function guirlanda(cor) {
  const NS = "http://www.w3.org/2000/svg", sv = document.createElementNS(NS, "svg");
  sv.setAttribute("class", "guirlanda");
  sv.setAttribute("viewBox", "0 0 100 100");
  sv.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.1 + 0.8 * i / 8), x = 50 + 46 * Math.cos(a + Math.PI), y = 50 + 46 * Math.sin(a + Math.PI);
    const tri = document.createElementNS(NS, "path");
    tri.setAttribute("d", `M${x - 5} ${y - 3} L${x + 5} ${y - 3} L${x} ${y + 7} Z`);
    tri.setAttribute("fill", i % 2 ? cor : "var(--ouro, #B08A2E)");
    sv.append(tri);
  }
  return sv;
}
function avatarMoldura(md, tam = "med") {
  const nome = meta.perfil && meta.perfil.alcunha ? meta.perfil.alcunha : t("mo.perfil.sem_alcunha");
  const av = document.createElement("span");
  av.className = `avatar ${tam}`;
  av.setAttribute("aria-hidden", "true");
  av.textContent = [...nome][0].toUpperCase();
  if (md) {
    av.classList.add("av-m");
    av.style.setProperty("--moldura", md.cor);
    av.style.setProperty("--moldura-l", `${md.largura || 3}px`);
    if (md.guirlanda) av.append(guirlanda(md.cor));
  }
  return av;
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
  const md = itemCosm(meta.moldura), tt0 = itemCosm(meta.titulo);
  if (md && md.guirlanda) av.append(guirlanda(md.cor));
  cab.append(av, nm);
  if (tt0) {
    const ti = document.createElement("span");
    ti.className = "perfil-titulo";
    ti.textContent = tt0.n;
    cab.append(ti);
  }
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
  r.append(linhas, btn(t("mo.perfil.editar"), () => amigos(), "contorno"), btn(t("tab.puzzle.titulo"), finais), btn(t("tab.stats.titulo"), estatisticas), btn(t("mo.perfil.conta"), () => conta(), "contorno"));
}
function conta() {
  ecraConta(contas, { ecra, topo, btn, par, t, aoAplicar: async () => {
    aplicarConta(await contas.carregar());
  }, aoSair: entrada });
}
function loja(sep = "temas") {
  const r = ecra("E12");
  r.append(topo(t("mo.cosm.titulo")), par(t("mo.loja.sem_anuncios")));
  const saldo = par("", "nota");
  const abas = document.createElement("div");
  abas.className = "abas";
  abas.setAttribute("role", "tablist");
  const caixa = document.createElement("div");
  caixa.className = "loja";
  const aviso = par("", "msg");
  aviso.setAttribute("role", "status");
  const erroCompra = (x) => {
    if (x.resultado === "erro") aviso.textContent = t(x.erro === "sem_rede" || x.erro === "loja_indisponivel" ? "mo.loja.sem_ligacao" : "mo.loja.erro");
    else if (x.resultado === "pendente") aviso.textContent = t("mo.loja.pendente");
  };
  const comprarTema = async (id, th) => {
    aviso.textContent = "";
    const x = await compras.comprar(playIdDoTema(id));
    if (x.resultado === "concluida") {
      aviso.textContent = fmt("mo.loja.comprado", { nome: th.n });
      lista();
    } else erroCompra(x);
  };
  const abertoDe = (item, tipo) => tipo === "tema" ? temaAberto(item.id, item.desb, ctxMeta(), meta) : desbloqueioCosmetico(item.desb, ctxMeta(), meta) === true;
  const fraseTema = (item) => {
    const k = `tab.tema.${item.id}.desbloqueio`;
    const f = t(k);
    return f === `\xAB${k}\xBB` ? null : f;
  };
  const condTxt = (item, semPrefixo = false) => {
    const c = condicaoCosmetico(item.desb);
    if (c) return fmt(semPrefixo && c.chave === "mo.cosm.conq" ? "mo.cosm.conq.selo" : c.chave, { n: c.valor, nome: c.chave === "mo.cosm.conq" ? t(`mo.conq.${c.valor}.nome`) : "" });
    const f = fraseTema(item);
    return f || (semPrefixo ? String(item.desb) : fmt("mo.loja.bloqueado", { como: item.desb }));
  };
  const vars = (el, th) => {
    const st = el.style;
    st.setProperty("--fundo", th.fundo);
    st.setProperty("--superficie", th.sup);
    st.setProperty("--tinta", th.linha);
    st.setProperty("--ferrugem", th.sel);
    st.setProperty("--peca-b", th.branca);
    st.setProperty("--peca-p", th.preta);
    st.setProperty("--ponto", th.ponto);
  };
  const miniTab = (cm, forma) => {
    const pv = criarTabuleiro();
    pv.svg.classList.add("mini-tema", "com-moldura");
    pv.svg.removeAttribute("role");
    pv.svg.setAttribute("aria-hidden", "true");
    desenhar(pv, cm, { daltonico: dados.opcoes.daltonico, formaPreta: forma });
    return pv.svg;
  };
  const formaDe = (item, tipo) => (tipo === "peca" ? item.formaPreta : (itemCosm(meta.peca) || {}).formaPreta) || "quadrado";
  const pecasEx = (o) => {
    const cm = new Array(24).fill(0);
    for (const [pt, v] of Object.entries(o)) cm[+pt] = v;
    return cm;
  };
  function previa(item, tipo) {
    const th = tipo === "tema" ? item : temas[meta.tema] || temas.madeira;
    const pv = document.createElement("div");
    pv.className = "previa";
    pv.setAttribute("role", "dialog");
    pv.setAttribute("aria-label", item.n);
    vars(pv, th);
    varsCosm(pv, tipo === "peca" ? item.id : meta.peca, tipo === "moldura" ? item.id : meta.moldura);
    const aberto = abertoDe(item, tipo);
    const acs = document.createElement("div");
    acs.className = "acoes";
    const ap = btn(t("mo.cosm.aplicar"), () => {
      if (tipo === "tema") mudarTema(item.id);
      else {
        const o = aplicarCosmetico(meta, item, ctxMeta());
        if (!o.aplicado) return;
        meta = o.meta;
        gravarMeta();
        aplicarTema(meta.tema);
      }
      emitir("cosmetico:aplicado", { id: item.id });
      lista();
    }, "principal");
    ap.disabled = !aberto;
    acs.append(ap, btn(t("mo.cosm.voltar"), () => pv.remove(), "contorno"));
    if (tipo === "moldura") {
      const cmp = document.createElement("div");
      cmp.className = "av-cmp";
      for (const [md, rot] of [[null, t("mo.moldura.sem")], [item, item.n]]) {
        const f = document.createElement("figure");
        f.append(avatarMoldura(md, "grd"));
        const fc = document.createElement("figcaption");
        fc.textContent = rot;
        f.append(fc);
        cmp.append(f);
      }
      pv.append(par(item.n, "sub"), cmp, par(t(`mo.moldura.${item.id}.desc`), "nota"), par(aberto ? "" : condTxt(item), "nota"), acs);
    } else pv.append(par(item.n, "sub"), miniTab(pecasEx({ 0: 1, 4: 1, 9: 2, 14: 2 }), formaDe(item, tipo)), par(aberto ? "" : condTxt(item), "nota"), acs);
    r.append(pv);
  }
  function selo(est, cond = "", preco = "") {
    const d = SELOS[est];
    const e = document.createElement("p");
    e.className = `selo selo-${d.forma}`;
    const ic = document.createElement("span");
    ic.setAttribute("aria-hidden", "true");
    ic.textContent = d.icone + " ";
    e.append(ic, document.createTextNode(d.chave ? t(d.chave) : preco));
    if (est === "ganha" && cond) {
      const c = document.createElement("small");
      c.textContent = cond;
      e.append(document.createElement("br"), c);
    }
    e.setAttribute("aria-label", fmt(d.aria, { cond, preco }));
    return e;
  }
  function cartaoApoio(p) {
    const c = document.createElement("div");
    c.className = "item cartao-tema cartao-apoio";
    const th = temas[p.falta[0]];
    if (th) vars(c, th);
    if (p.comMiniatura && th) c.append(miniTab(pecasEx({ 0: 1, 4: 1, 9: 2, 14: 2 }), "quadrado"));
    c.append(par(`${p.coracao ? "\u2665 " : ""}${t(`loja.produto.${p.chave}.titulo`)}`, "sub"), par(t(`loja.produto.${p.chave}.texto`), "nota-tema"));
    if (p.coracao) c.append(par(t("loja.produto.apoio.nota"), "nota-tema"));
    if (p.chave === "tudo") c.append(par(fmt("loja.produto.tudo.falta", { lista: p.falta.map((x) => (temas[x] || {}).n || x).join(", ") }), "nota-tema"));
    const preco = compras.preco(p.playId);
    c.append(selo("venda", "", preco));
    const comprar = btn(fmt("loja.comprar", { preco }), async () => {
      aviso.textContent = "";
      const x = await compras.comprar(p.playId);
      if (x.resultado === "concluida") {
        aviso.textContent = t(p.chave === "tudo" ? "mo.loja.tudo.ok" : "mo.loja.comprado").replace("{nome}", (temas[p.falta[0]] || {}).n || "");
        lista();
      } else erroCompra(x);
    }, "principal");
    c.append(comprar);
    if (th) c.append(btn(t("loja.experimentar"), () => {
      r.querySelectorAll(".previa").forEach((x) => x.remove());
      previa({ ...th, id: p.falta[0] }, "tema");
    }, "contorno"), par(t("loja.experimentar.nota"), "nota-tema"));
    return c;
  }
  function secao(chave, titulo, sub, filhos, contagem = "", aviso2 = "") {
    if (!filhos.length) return;
    const sec = document.createElement("section");
    sec.className = `loja-secao loja-secao-${chave}`;
    const h = document.createElement("h2");
    h.className = "secao";
    h.textContent = titulo;
    if (contagem) {
      const ct = document.createElement("span");
      ct.className = "secao-contagem";
      ct.textContent = contagem;
      h.append(ct);
    }
    sec.append(h);
    if (sub) sec.append(par(sub, "nota"));
    if (aviso2) sec.append(par(aviso2, "msg"));
    const g = document.createElement("div");
    g.className = "loja-cartoes";
    g.append(...filhos);
    sec.append(g);
    caixa.append(sec);
  }
  function cartao(item, tipo) {
    const aberto = abertoDe(item, tipo);
    const emUso = tipo === "tema" ? meta.tema === item.id : meta[tipo] === item.id;
    const venda = !aberto && tipo === "tema" && !!playIdDoTema(item.id);
    const c = document.createElement("div");
    c.className = "item cartao-tema";
    vars(c, tipo === "tema" ? item : temas[meta.tema] || temas.madeira);
    if (tipo === "peca" || tipo === "moldura") varsCosm(c, tipo === "peca" ? item.id : "", tipo === "moldura" ? item.id : "");
    if (tipo === "moldura") {
      const w = document.createElement("div");
      w.className = "av-cartao";
      w.append(avatarMoldura(item, "med"));
      c.append(w);
    } else if (tipo !== "titulo") c.append(miniTab(pecasEx({ 0: 1, 4: 1, 9: 2, 14: 2, 21: 1, 12: 2 }), formaDe(item, tipo)));
    const ver = btn(item.n, () => {
      r.querySelectorAll(".previa").forEach((x) => x.remove());
      previa(item, tipo);
    }, "contorno");
    ver.classList.add("ver");
    c.append(ver);
    c.append(selo(estadoDe({ emUso, aberto }), condTxt(item, true)));
    if (tipo === "moldura") c.append(par(t(`mo.moldura.${item.id}.desc`), "nota-tema"));
    return c;
  }
  function lista() {
    r.querySelectorAll(".previa").forEach((x) => x.remove());
    caixa.replaceChildren();
    abas.replaceChildren();
    saldo.textContent = fmt("mo.loja.saldo", { n: meta.moedas || 0 });
    for (const [k, rot] of [["temas", "mo.cosm.sep.temas"], ["pecas", "mo.cosm.sep.pecas"], ["molduras", "mo.cosm.sep.molduras"]]) {
      const b = btn(t(rot), () => {
        sep = k;
        lista();
      }, k === sep ? "principal" : "contorno");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(k === sep));
      abas.append(b);
    }
    const itens = sep === "temas" ? TEMAS_ORDEM.filter((id) => temas[id]).map((id) => ({ ...temas[id], id })) : sep === "pecas" ? cosmeticos.filter((x) => x.tipo === "peca") : cosmeticos.filter((x) => x.tipo === "moldura" || x.tipo === "titulo");
    const tp = (i) => sep === "temas" ? "tema" : i.tipo;
    const sc = secoes(itens, { aberto: (i) => abertoDe(i, tp(i)), emUso: (i) => tp(i) === "tema" ? meta.tema === i.id : meta[tp(i)] === i.id, apoio: (i) => sep === "temas" && !!playIdDoTema(i.id) && !abertoDe(i, "tema") });
    secao("teus", t("loja.secao.teus"), "", sc.teus.map((i) => cartao(i, tp(i))), fmt("loja.secao.contagem", { n: sc.teus.length, total: itens.length }));
    secao("ganha", t("loja.secao.ganha"), t("loja.secao.ganha.sub"), sc.ganha.map((i) => cartao(i, tp(i))));
    if (sep === "temas") {
      const ap = cartoesApoio(PRODUTOS, (x) => !!meta.pagos[x]);
      secao("apoiar", t("loja.secao.apoiar"), t("loja.secao.apoiar.sub"), ap.map(cartaoApoio), "", t("loja.aviso.compras"));
      if (compras.ofertavel(SKU_SEM_ANUNCIOS)) caixa.append(btn(fmt("mo.loja.sem_anuncios.comprar", { preco: compras.preco(SKU_SEM_ANUNCIOS) }), async () => {
        const x = await compras.comprar(SKU_SEM_ANUNCIOS);
        if (x.resultado === "concluida") {
          aviso.textContent = t("mo.loja.sem_anuncios.ok");
          lista();
        } else erroCompra(x);
      }));
      caixa.append(botaoAnuncio("A4", {}, (c) => {
        aviso.textContent = fmt("mo.ad.A4.ok", { n: c.moedas });
        lista();
      }));
    }
  }
  lista();
  r.append(saldo, abas, caixa, aviso, par(t("mo.loja.sub")), btnRestaurar(aviso, lista));
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
  if (await partilharTexto(texto) !== "indisponivel") return;
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
  const oferta = document.createElement("div");
  oferta.className = "acoes";
  oferta.id = "oferta-codigo";
  r.append(oferta);
  (async () => {
    try {
      const tx = await navigator.clipboard.readText();
      if (ecraAtual === "E9P" && lerCodigo(normalizarEntrada(tx)).ok) oferta.append(btn(t("tab.async.colar.usar"), () => {
        const k = importar(tx);
        if (k) ecraColar(k);
      }, "principal"));
    } catch {
    }
  })();
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
  if (!g.jogadas && g.euSou === "A" && corDe(g) !== 1) return ecraEnviar(g, { convite: true });
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
    {
      const r = await partilharTexto(texto);
      if (r === "cancelado") return false;
      if (r === "partilhado") {
        emitir("async:enviado", { semente: g.semente, via });
        return true;
      }
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
    historico: lr.jogadas.filter((m) => m !== "X" && m !== "W"),
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
  const eu = corDe(g), lr = lerCodigo(g.codigo), js = lr.ok ? lr.jogadas.filter((m) => m !== "X" && m !== "W") : [];
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
  {
    const antes = meta;
    meta = rf.meta;
    gravarMeta();
    avisarCosm(antes);
  }
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
const AVATARES = ["\u{1F98A}", "\u{1F43B}", "\u{1F43C}", "\u{1F989}", "\u{1F419}", "\u{1F422}", "\u{1F981}", "\u{1F438}", "\u{1F984}", "\u{1F427}", "\u{1F98B}", "\u{1F41D}"];
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
    let av = 0;
    const grelha = document.createElement("div");
    grelha.className = "avatares";
    grelha.setAttribute("role", "group");
    grelha.setAttribute("aria-label", t("tab.cartao.escolhe_avatar"));
    const bs = AVATARES.map((e, i) => {
      const b = btn(e, () => {
        av = i;
        marca();
      }, "avatar-b");
      b.setAttribute("aria-label", fmt("tab.cartao.avatar", { n: i + 1 }));
      return b;
    });
    const marca = () => bs.forEach((b, i) => {
      b.setAttribute("aria-pressed", i === av);
      b.classList.toggle("sel", i === av);
    });
    marca();
    grelha.append(...bs);
    r.append(par(t("mo.mp.alcunha"), "sub"), campo2, par(t("tab.cartao.escolhe_avatar"), "nota"), grelha, btn(t("mo.mp.guardar"), () => {
      const x = novoPerfil(campo2.value, av);
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
  const partilhar = async () => {
    const txt = t("tab.cartao.partilha_frase") + cartao;
    {
      const r2 = await partilharTexto(txt);
      if (r2 === "cancelado") return;
      if (r2 === "partilhado") {
        emitir("cartao:partilhado", { via: "partilha" });
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(txt);
      msg.textContent = t("tab.cartao.copiado");
      emitir("cartao:partilhado", { via: "copiar" });
    } catch {
      msg.textContent = cartao;
    }
  };
  const copiarC = async () => {
    try {
      await navigator.clipboard.writeText(cartao);
      msg.textContent = t("tab.cartao.copiado");
    } catch {
      msg.textContent = cartao;
    }
  };
  r.append(par(t("mo.mp.cartao.teu"), "sub"), cp, btn(t("mo.mp.codigo.partilhar"), partilhar, "principal"), btn(t("tab.cartao.copiar"), copiarC, "contorno"));
  const campo = document.createElement("input");
  campo.type = "text";
  campo.className = "campo";
  campo.placeholder = t("mo.mp.cartao.colar");
  campo.setAttribute("aria-label", t("mo.mp.cartao.colar"));
  const ERRO = { proprio: "tab.cartao.proprio", cheia: "tab.cartao.cheia" };
  const importar2 = (texto) => {
    const antes = meta.amigos.length;
    const x = adicionarAmigo(meta.amigos, texto, meta.perfil.id);
    if (!x.ok) {
      emitir("cartao:erro", { erro: x.erro });
      msg.textContent = t(ERRO[x.erro] || "tab.cartao.erro.invalido");
      return;
    }
    const nova = x.tabela.length > antes, id = texto.trim().split("-")[2];
    meta.amigos = x.tabela;
    gravarMeta();
    eventoMeta("amigo");
    emitir("cartao:importado", { id, nova });
    amigos(t(nova ? "mo.mp.cartao.adicionado" : "tab.cartao.atualizado"));
  };
  const colarArea = async () => {
    let txt = "";
    try {
      txt = await navigator.clipboard.readText();
    } catch {
    }
    campo.value = txt;
    importar2(txt);
  };
  r.append(campo, btn(t("mo.mp.cartao.colar"), () => importar2(campo.value), "principal"), btn(t("tab.cartao.colar_area"), colarArea, "contorno"), msg);
  r.append(par(t("tab.cartao.tabela"), "sub"));
  const eu = { alcunha: meta.perfil.alcunha, pontos: meta.pontos, id: meta.perfil.id, eu: true };
  const ol = document.createElement("ol");
  ol.className = "tabela-amigos";
  for (const a of ordenarTabela([eu, ...meta.amigos])) {
    const li = document.createElement("li");
    if (a.eu) li.className = "eu";
    const nome = document.createElement("span");
    nome.className = "nome";
    nome.textContent = `${a.alcunha} \xB7 ${fmt("mo.rank.pontos", { n: a.pontos })}`;
    li.append(nome);
    const e = document.createElement("span");
    e.className = "etiqueta";
    li.append(e);
    if (a.eu) e.textContent = t("tab.cartao.tu");
    else {
      e.textContent = "? " + t("tab.cartao.nao_verificado");
      const b = btn("\u2715", () => confirmar(t("tab.cartao.remover.confirma"), t("tab.cartao.remover"), () => {
        meta.amigos = meta.amigos.filter((m) => m.id !== a.id);
        gravarMeta();
        amigos(t("tab.cartao.removido"));
      }), "icone-b remover");
      b.setAttribute("aria-label", `${t("tab.cartao.remover")} ${a.alcunha}`);
      li.append(b);
    }
    ol.append(li);
  }
  r.append(ol);
  if (!meta.amigos.length) r.append(par(t("tab.cartao.vazio"), "nota"));
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
  try {
    cosmeticos = await (await fetch(new URL("../data/cosmeticos.json", import.meta.url))).json();
  } catch {
    cosmeticos = [];
  }
  carregar();
  aplicarTema(meta.tema);
  if (!meta.instalado) {
    meta.instalado = Date.now();
    escreverJSON(CHAVE_META, meta);
  }
  anuncios.configurar({ semAnuncios: () => semAnuncios(meta) });
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
  anuncios.iniciar();
}
function entrada() {
  if (contas.ativo() && !contas.estado().sessao) ecraLogin(contas, { ecra, btn, par, t }, () => menu());
  else menu();
}
arrancar();
