import { CONFIG, DIA_LANCAMENTO, EPOCA_TABELA } from "./config.js";
import { t, tn, temTexto } from "./textos.js";
import { carregarPuzzle, carregarLista, escreverGrelha, VARIANTES, TAMANHOS, DIFICULDADES } from "./nucleo/formato.js";
import { novoJogo, tocar, desfazer, recomecar, violacoes, estadoParaGravar, retomarJogo, revelar } from "./nucleo/regras.js";
import { pista } from "./nucleo/pista.js";
import { textoDaPista } from "./jogo/textoPista.js";
import { saldoPistas } from "./meta/pistas.js";
import { Tabuleiro } from "./jogo/tabuleiro.js";
import { gerar, gerarDiario } from "./nucleo/gerador.js";
import { dataLocal, numeroPartilha, indiceTabela, diaDaSemana, somarDias } from "./nucleo/dia.js";
import { iniciarMeta } from "./meta/arranque.js";
import { documento, temItem, estado as estadoMeta } from "./meta/estado.js";
import { ligarProgressoConta } from "./jogo/progressoConta.js";
import { puzzleDoDia, dataDoId, idDoDia, estadoDe, sequenciaDe, arquivoDoMes, textoPartilha } from "./meta/diario.js";
import { partilhar, ligarCicloDeVida, plugin } from "./plataforma/nativo.js";
import { criarEcras } from "./jogo/ecras.js";
import { criarContasUI, carregarContas } from "./jogo/contasUI.js";
import { emitir, ouvir } from "./eventos.js";
import { escrever as gravarDocumento } from "./plataforma/gravacao.js";
import * as audio from "./audio/audio.js";
import { PACOTES, COLUNAS_LARGO, estadoDoPacote, pacoteDoId, idCurado, estadoDoMes, mesVizinho } from "./meta/pacotes.js";
import { loja, equipar, tipoDe } from "./meta/loja.js";
import { comprar as comprarEur, produtos as produtosEur, restaurar as restaurarCompras } from "./plataforma/compras.js";
import { criarPraca, acenderMotivo, desenharMiniatura } from "./jogo/praca.js";
import { mostrarAssentar, fecharAssentar, assentarVisivel } from "./jogo/assentar.js";
import { criarEcraLoja, lojaVisivel } from "./jogo/ecraLoja.js";
import { criarExperimentar } from "./jogo/experimentar.js";
import { criarEcraOficio, faixaOficio, corpoColecao } from "./jogo/ecraMetas.js";
import { oficioVista, objetivosVista, colecaoVista } from "./meta/vistaV2.js";
import { definirEquipado } from "./jogo/cosmeticos.js";
import * as tutorial from "./nucleo/tutorial.js";
import { criarEcraCalceteiros } from "./jogo/ecraCalceteiros.js";
import * as amigos from "./nucleo/amigos.js";
import { dificuldadeConfigurada } from "./nucleo/oficio.js";
import * as caminho from "./meta/caminho.js";
const params = new URLSearchParams(location.search);
if (params.get("avisos") === "0") CONFIG.AVISOS_LIGADOS = false;
document.getElementById("escolha").closest("label").hidden = !params.has("escolha");
const el = {
  titulo: document.getElementById("titulo"),
  escolha: document.getElementById("escolha"),
  regra: document.getElementById("regra"),
  mensagem: document.getElementById("mensagem"),
  canvas: document.getElementById("tabuleiro"),
  desfazer: document.getElementById("btn-desfazer"),
  recomecar: document.getElementById("btn-recomecar"),
  seguinte: document.getElementById("btn-seguinte"),
  pausa: document.getElementById("btn-pausa")
};
function rotular(btn, chave, { antes = "", depois = "" } = {}) {
  btn.replaceChildren();
  const icone = (s) => {
    const e = document.createElement("span");
    e.className = "icone";
    e.setAttribute("aria-hidden", "true");
    e.textContent = s;
    return e;
  };
  if (antes) btn.append(icone(antes), " ");
  btn.append(t(chave));
  if (depois) btn.append(" ", icone(depois));
}
rotular(el.desfazer, "botao.desfazer", { antes: "\u21B6" });
rotular(el.recomecar, "botao.recomecar");
rotular(el.seguinte, "botao.seguinte", { depois: "\u2192" });
rotular(el.pausa, "pausa.botao", { antes: "\u2039" });
el.pista = document.createElement("button");
el.pista.id = "btn-pista";
el.pista.type = "button";
el.desfazer.after(el.pista);
function criar(tag, atributos = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atributos)) {
    if (k === "class") e.className = v;
    else if (k === "hidden") e.hidden = !!v;
    else e.setAttribute(k, v);
  }
  e.append(...filhos);
  return e;
}
const ui = {
  painel: criar("section", { id: "diario", class: "diario", "aria-label": t("inicio.puzzle_do_dia") }),
  info: criar("p", { id: "dia-info", class: "dia-info" }),
  sequencia: criar("p", { id: "dia-sequencia", class: "dia-sequencia" }),
  jogar: criar("button", { id: "btn-jogar-dia", type: "button" }),
  arquivo: criar("details", { id: "arquivo", class: "arquivo" }),
  arquivoTitulo: criar("summary", {}),
  arquivoDias: criar("div", { id: "arquivo-dias", class: "arquivo-dias", role: "list" }),
  partilhar: criar("button", { id: "btn-partilhar", type: "button", hidden: true })
};
ui.arquivo.append(ui.arquivoTitulo, ui.arquivoDias);
ui.pacotes = criar("details", { id: "pacotes", class: "arquivo pacotes" });
ui.pacotesTitulo = criar("summary", {}, t("arquivo.sep_pacotes"));
ui.pacotesCorpo = criar("div", { id: "pacotes-corpo", class: "arquivo-dias pacotes-corpo" });
ui.pacotes.append(ui.pacotesTitulo, ui.pacotesCorpo);
ui.praca = criar("details", { id: "praca", class: "arquivo pracas" });
ui.pracaCorpo = criar("div", { id: "praca-corpo", class: "arquivo-dias pacotes-corpo" });
ui.praca.append(criar("summary", {}, t("nav.praca")), ui.pracaCorpo);
ui.praca.addEventListener("toggle", () => renderPraca());
ui.painel.append(
  criar("div", { class: "dia-linha" }, ui.info),
  criar("div", { class: "dia-linha" }, ui.sequencia, ui.jogar),
  criar("div", { class: "arquivo-linha" }, ui.arquivo, ui.pacotes, ui.praca)
);
el.regra.before(ui.painel);
el.seguinte.before(ui.partilhar);
rotular(ui.partilhar, "resultado.partilhar");
const VOLUME_OMISSAO = 0.8;
const def = {
  painel: criar("details", { id: "definicoes", class: "definicoes" }),
  titulo: criar("summary", { "aria-label": t("definicoes.titulo"), title: t("definicoes.titulo") }, criar("span", { "aria-hidden": "true" }, "\u2699")),
  corpo: criar("div", { class: "definicoes-painel" }),
  som: criar("input", { id: "def-som", type: "checkbox" }),
  volume: criar("input", { id: "def-volume", type: "range", min: "0", max: "100", step: "5" })
};
const rotuloVolume = temTexto("definicoes.volume") ? t("definicoes.volume") : t("definicoes.som");
def.volume.setAttribute("aria-label", rotuloVolume);
def.corpo.append(
  criar("label", { class: "def-linha" }, def.som, " ", t("definicoes.som")),
  criar("label", { class: "def-linha" }, rotuloVolume, " ", def.volume)
);
def.tempo = criar("input", { id: "def-tempo", type: "checkbox" });
def.corpo.append(criar("label", { class: "def-linha" }, def.tempo, " ", t("definicoes.tempo")));
def.painel.append(def.titulo, def.corpo);
ui.info.after(def.painel);
const lojaUI = criarEcraLoja({
  t,
  tn,
  documento,
  temItem,
  catalogo: () => loja.catalogo(),
  trocar: (id) => loja.trocar(id),
  equipar: (id) => equipar(id, { catalogo: loja.catalogo() }),
  tipoDe: (id) => tipoDe(loja.catalogo(), id),
  comprar: (id) => comprarEur(id),
  produtos: () => produtosEur(),
  restaurar: () => restaurarCompras(),
  confirmar: (texto) => confirm(texto),
  lascasDiario: CONFIG.LASCAS_DIARIO,
  // GDD §5.2 (só para o texto «faltam»)
  caminho: () => abrirCaminho(),
  caminhoTeto: CONFIG.CAMINHO_TETO_DIA,
  // BS-5
  experimentar: (a) => experimentarUI.abrir(a)
});
const experimentarUI = criarExperimentar({ t, tocarSom: (id) => audio.previsualizarSom(id) });
document.getElementById("app").append(lojaUI.el, experimentarUI.el);
new MutationObserver(() => atualizarNav()).observe(lojaUI.el, { attributes: true, attributeFilter: ["hidden"] });
ui.loja = criar("button", { id: "btn-loja", type: "button" }, t("nav.loja"));
ui.loja.addEventListener("click", () => lojaUI.abrir());
def.painel.before(ui.loja);
def.restaurar = criar("button", { id: "btn-def-restaurar", type: "button", class: "def-restaurar" }, t("loja.restaurar"));
def.restaurar.addEventListener("click", async () => {
  def.restaurar.disabled = true;
  try {
    await lojaUI.restaurar();
    el.mensagem.textContent = lojaUI.estado().mensagem;
  } finally {
    def.restaurar.disabled = false;
  }
});
def.corpo.prepend(def.restaurar);
let contasUI = null;
(async () => {
  try {
    contasUI = criarContasUI({ app: document.getElementById("app"), contas: await carregarContas() });
    def.corpo.append(contasUI.botao);
    contasUI.atualizar();
  } catch (e) {
    console.warn("[main] contas indispon\xEDveis:", e);
  }
})();
function definicoesAtuais() {
  return documento().definicoes || { avisos: true, som: true, vibracao: true };
}
function volumeGravado() {
  const v = Number(definicoesAtuais().volume);
  return Number.isFinite(v) && v >= 0 && v <= 1 ? v : VOLUME_OMISSAO;
}
function aplicarDefinicoes() {
  const d = definicoesAtuais();
  audio.silenciar(!d.som);
  audio.definirVolume(volumeGravado());
  def.som.checked = !!d.som;
  def.tempo.checked = !!d.tempo;
  def.volume.value = String(Math.round(volumeGravado() * 100));
  def.volume.disabled = !d.som;
}
async function mudarDefinicao(chave, valor) {
  const doc = documento();
  doc.definicoes = { ...definicoesAtuais(), [chave]: valor };
  try {
    await gravarDocumento(doc);
  } catch (e) {
    console.warn("[main] defini\xE7\xF5es n\xE3o gravaram:", e);
  }
  if (chave !== "volume") emitir("definicoes:alteradas", { chave, valor });
}
def.som.addEventListener("change", () => {
  def.volume.disabled = !def.som.checked;
  emitir("ui:toque", { alvo: def.som.id });
  mudarDefinicao("som", def.som.checked);
});
def.tempo.addEventListener("change", () => {
  mudarDefinicao("tempo", def.tempo.checked);
  mostrarTempo();
});
def.volume.addEventListener("input", () => audio.definirVolume(Number(def.volume.value) / 100));
def.volume.addEventListener("change", () => {
  mudarDefinicao("volume", audio.definirVolume(Number(def.volume.value) / 100));
  emitir("ui:toque", { alvo: def.volume.id });
});
document.addEventListener("click", (ev) => {
  const btn = ev.target instanceof Element ? ev.target.closest("button[id]") : null;
  if (btn && !btn.disabled) emitir("ui:toque", { alvo: btn.id });
}, true);
const appEl = document.getElementById("app");
let ecraAtual = "jogo";
let voltarPara = "menu";
let ganhoLascas = 0;
let trocoGanho = null;
let caminhoAtualObj = null;
const caminhoMs = /* @__PURE__ */ new Map();
let dicaSair = 0;
const EVENTO_ECRA = { menu: "inicio", jogo: "puzzle", resultado: "resultado", praca: "praca", puzzles: "arquivo", opcoes: "definicoes", oficio: "oficio", metas: "oficio", calceteiros: "oficio" };
function ir(nome) {
  ecraAtual = nome;
  const camada = ["menu", "pausa", "resultado"].includes(nome) ? nome : nome === "jogo" ? null : "sub";
  ecras.mostrar(camada);
  ecras.sub.marcarAba(camada === "sub" ? nome : "");
  atualizarNav();
  if (nome !== "jogo" && nome !== "resultado") fecharAssentar();
  if (EVENTO_ECRA[nome]) emitir("ecra:aberto", { ecra: EVENTO_ECRA[nome] });
  if (nome === "pausa") guardarAMeio();
}
function abrirSub(nome, de = "menu") {
  if (nome === "loja") {
    lojaUI.abrir();
    atualizarNav();
    return;
  }
  lojaUI.fechar();
  voltarPara = de;
  const c = ecras.sub.corpo;
  if (nome === "puzzles") {
    ecras.sub.titulo.textContent = t("menu.puzzles");
    ui.arquivo.open = true;
    ui.pacotes.open = true;
    c.replaceChildren(ui.arquivo, ui.pacotes, ui.colecao);
    renderDiario();
    renderColecao();
  } else if (nome === "oficio" || nome === "metas" || nome === "calceteiros") {
    ecras.sub.titulo.textContent = t(nome === "metas" ? "objetivos.titulo" : nome === "calceteiros" ? "rank.titulo" : "oficio.titulo");
    c.replaceChildren(ecraOficio.el);
    ecraOficio.abrir(nome);
  } else if (nome === "praca") {
    ecras.sub.titulo.textContent = t("nav.praca");
    fecharAssentar();
    assentarPendente = null;
    c.replaceChildren(ui.praca);
    ui.praca.open = true;
    renderPraca();
  } else if (nome === "comojogar") {
    ecras.sub.titulo.textContent = t("comojogar.titulo");
    c.replaceChildren(corpoComoJogar());
  } else {
    ecras.sub.titulo.textContent = t("nav.definicoes");
    c.replaceChildren(def.corpo);
  }
  ir(nome);
}
function corpoComoJogar() {
  const exemplo = criar("canvas", { class: "cj-exemplo", "aria-hidden": "true", width: "120", height: "120" });
  try {
    desenharMiniatura(exemplo, { n: 4, solucao: "PBPBBPBPPBBPBPPB" });
  } catch (e) {
  }
  const fechar = criar("button", { id: "btn-comojogar-fechar", type: "button", class: "ec-botao cheio grande" }, t("comum.fechar"));
  fechar.addEventListener("click", () => voltar());
  const cartao = (...f) => criar("div", { class: "ec-cartao cj-cartao" }, ...f);
  return criar(
    "div",
    { id: "comojogar", class: "comojogar" },
    cartao(criar("h3", {}, t("comojogar.base_titulo")), criar("p", {}, t("comojogar.base")), criar("div", { class: "cj-ex" }, exemplo)),
    cartao(criar("h3", {}, t("comojogar.variantes_titulo")), criar("p", {}, t("comojogar.juntas")), criar("p", {}, t("comojogar.contra_espelho"))),
    cartao(criar("p", {}, t("comojogar.pistas"))),
    fechar
  );
}
function voltar() {
  if (voltarPara === "pausa") ir("pausa");
  else {
    ir("menu");
    renderDiario();
  }
}
function aoVoltar() {
  if (contasUI && contasUI.voltar()) return "conta";
  if (!lojaUI.el.hidden) {
    lojaUI.fechar();
    return "loja";
  }
  if (["puzzles", "praca", "opcoes", "comojogar", "oficio", "metas", "calceteiros"].includes(ecraAtual)) {
    voltar();
    return "sub";
  }
  if (ecraAtual === "pausa") {
    ir("jogo");
    return "continuar";
  }
  if (ecraAtual === "resultado") {
    sairParaMenu();
    return "menu";
  }
  if (ecraAtual === "jogo") {
    ir("pausa");
    return "pausa";
  }
  const agora = Date.now();
  if (agora - dicaSair < 2e3) {
    const A = plugin("App");
    if (A && A.exitApp) A.exitApp();
    return "sair";
  }
  dicaSair = agora;
  ecras.menu.dica.hidden = false;
  setTimeout(() => {
    ecras.menu.dica.hidden = true;
  }, 2e3);
  return "dica";
}
function guardarAMeio() {
  if (!jogo || jogo.resolvido || tut || !jogo.historico.length) return;
  const id = jogo.puzzle.id;
  if (!dataDoId(id) && !pacoteDoId(id) && caminho.caminhoDoId(id) == null) return;
  const doc = documento();
  const antes = (doc.puzzles || {})[id];
  if (antes && antes.estado !== "a_meio") return;
  if (!doc.puzzles) doc.puzzles = {};
  doc.puzzles[id] = {
    ...antes || {},
    estado: "a_meio",
    ...estadoParaGravar(jogo),
    resolvidoEm: null,
    lascasDadas: false,
    noProprioDia: null,
    tempoMs: antes && antes.tempoMs || 0
  };
  gravarDocumento(doc).catch((e) => console.warn("[main] a meio n\xE3o gravou:", e));
}
function sairParaMenu() {
  guardarAMeio();
  if (tut) {
    tut = null;
    appEl.classList.remove("em-tutorial");
    tabuleiro.definirGuia(null);
    clearInterval(tutRelogio);
    ui.tutorial.hidden = true;
    ui.tutorialSair.hidden = true;
    el.regra.hidden = false;
  }
  ir("menu");
  renderDiario();
}
function mostrarResultado() {
  if (tut || !jogo || !jogo.resolvido) return;
  const R = ecras.resultado;
  const seq = sequenciaDe(documento()).atual;
  const id = jogo.puzzle.id;
  const cam = caminho.caminhoDoId(id);
  R.linha.textContent = cam != null ? linhaCaminho() : jogo.pistasUsadas > 0 ? t("resultado.com_pistas") : seq > 0 && dataDoId(id) ? tn("resultado.sequencia", seq) : "";
  R.lascas.textContent = ganhoLascas > 0 ? tn("resultado.lascas", ganhoLascas) : "";
  R.partilhar.hidden = !textoDaPartilha();
  R.seguinte.hidden = dataDoId(id) === hoje();
  ir("resultado");
  if (assentarUltimo && assentarUltimo.puzzleId === id) {
    assentarPendente = assentarUltimo;
    mostrarQuadradoAssente();
  }
}
let objetivosCat = [];
const vistaOficio = () => oficioVista(documento());
const vistaMetas = () => objetivosVista(documento(), objetivosCat, hoje());
const difDe = (id) => dificuldadeConfigurada() ? dificuldadeConfigurada()(id) : null;
async function gravarSocial() {
  try {
    await gravarDocumento(documento());
  } catch (e) {
    console.warn("[main] social n\xE3o gravou:", e);
  }
}
const ecraCalc = criarEcraCalceteiros({ t, tn }, {
  cartao: () => amigos.cartaoDe(documento(), hoje(), difDe),
  codigo: () => amigos.gerarCodigo(amigos.cartaoDe(documento(), hoje(), difDe)),
  tabela: (c) => amigos.tabelaCalceteiros(documento(), hoje(), difDe, c),
  recordes: () => amigos.meusRecordes(documento(), hoje(), difDe),
  amigos: () => amigos.garantirSocial(documento()).amigos.length
}, {
  guardarNome: (txt) => {
    const vazio = !String(txt).trim(), n = amigos.nomeValido(txt);
    if (!vazio && !n) return { ok: false };
    amigos.garantirSocial(documento()).nome = n || "";
    gravarSocial();
    return { ok: true };
  },
  adicionar: (txt) => {
    const r = amigos.adicionarAmigo(documento(), txt, hoje());
    if (!r.ok) return r;
    gravarSocial();
    emitir(r.evento[0], r.evento[1]);
    return { ok: true, estado: r.evento[0] === "amigo:atualizado" ? "atualizado" : "adicionado", nome: r.amigo.nome };
  },
  remover: (id) => {
    if (amigos.removerAmigo(documento(), id)) gravarSocial();
  },
  copiar: async () => {
    const cod = amigos.gerarCodigo(amigos.cartaoDe(documento(), hoje(), difDe));
    emitir("codigo:gerado", { tipo: "amigo" });
    try {
      await navigator.clipboard.writeText(cod);
      return true;
    } catch {
      return false;
    }
  },
  partilhar: () => {
    const cod = amigos.gerarCodigo(amigos.cartaoDe(documento(), hoje(), difDe));
    emitir("codigo:gerado", { tipo: "amigo" });
    partilhar(cod, { id: "codigo-amigo" }).catch((e) => console.warn("[main] partilha falhou:", e));
  }
});
const ecraOficio = criarEcraOficio({ t, tn }, { oficio: vistaOficio, metas: vistaMetas, calceteiros: ecraCalc });
ui.colecao = criar("div", { id: "colecao-host" });
function renderColecao() {
  const atual = hoje().slice(0, 7), minimo = DIA_LANCAMENTO.slice(0, 7) < atual ? DIA_LANCAMENTO.slice(0, 7) : atual;
  const meses = [];
  for (let m = atual; m >= minimo; m = mesVizinho(m, -1)) {
    const e = estadoPracaMes(m);
    meses.push({ mes: m, feitos: e.feitos, total: e.total, completa: !!e.completa });
  }
  const pacotes = estadosPacotes().map((e) => ({ id: e.id, feitos: e.feitos, total: e.total, completa: !!e.completa }));
  ui.colecao.replaceChildren(corpoColecao(colecaoVista(meses, pacotes), { t, tn }, (m) => t("praca.mes_ano", { mes: t(`mes.titulo.${Number(m.slice(5))}`), ano: m.slice(0, 4) })));
}
function renderOficio() {
  const M = ecras.menu;
  M.faixa.replaceChildren(faixaOficio(vistaOficio(), vistaMetas().hoje, { t, tn }, () => abrirSub("oficio")));
  if (ecraAtual === "oficio" || ecraAtual === "metas") ecraOficio.render();
}
function renderMenu(est, linhaSeq, meta) {
  const M = ecras.menu;
  renderOficio();
  const doc = documento();
  const primeira = tutorial.tutorialPorFazer(doc);
  const num = t("inicio.numero", { num: numeroDe(hoje()) });
  M.lascas.textContent = (doc.lascas || {}).saldo || 0;
  M.chipLascas.setAttribute("aria-label", `${t("nav.loja")}: ${tn("comum.lascas", (doc.lascas || {}).saldo || 0)}`);
  const seq = sequenciaDe(doc);
  M.serieNum.textContent = seq.atual;
  M.serie.setAttribute("aria-label", `${t("menu.serie")}: ${tn("inicio.sequencia", seq.atual, { n: seq.atual })}`);
  M.nome.textContent = meta ? `${num} \xB7 ${t("inicio.tipo", { variante: t(`variante.${meta.variante}`), dif: t(`dif.${meta.dificuldade}`) })}` : num;
  M.estado.textContent = t(ROTULO_ESTADO[est] || "arquivo.por_jogar");
  M.semanaSerie.textContent = tn("inicio.sequencia", seq.atual, { n: seq.atual });
  const meta0 = !tutObj() && objetivosCat.length ? vistaMetas().hoje[0] : null;
  M.objetivo.hidden = !meta0 || primeira;
  if (meta0) {
    M.objetivo.replaceChildren(ecras.nav.icone("visto", false), document.createTextNode(t(meta0.feito ? "objetivo.hoje_feito" : "objetivo.hoje", { meta: t(meta0.texto) })));
    M.objetivo.classList.toggle("feito", !!meta0.feito);
  }
  const h = hoje(), ini = somarDias(h, -diaDaSemana(h));
  M.semana.replaceChildren(...[0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = somarDias(ini, i), e = d <= h ? estadoDe(doc, idDoDia(d)) : "futuro";
    const feito = e === "resolvido" || e === "resolvido_com_pistas";
    const c = criar("span", {
      role: "listitem",
      class: `mn-dia${feito ? " feito" : ""}${d === h ? " hoje" : ""}${d > h ? " futuro" : ""}`,
      "aria-label": `${t(`semana.${i + 1}`)}: ${t(feito ? "arquivo.resolvido" : ROTULO_ESTADO[e] || "arquivo.por_jogar")}`
    });
    if (feito) c.append(ecras.nav.icone("visto", false));
    else c.textContent = t(`semana.${i + 1}`);
    return c;
  }));
  rotular(M.jogar, est === "a_meio" ? "inicio.continuar" : "inicio.jogar");
  const camN = caminho.caminhoDe(doc).nivel;
  M.caminhoNome.textContent = t("caminho.menu_titulo", { n: camN });
  const lh = caminho.lascasHoje(doc), textoHoje = t("caminho.hoje", { ganhas: lh.ganhas, teto: lh.teto });
  M.caminhoSub.textContent = textoHoje;
  M.caminho.setAttribute("aria-label", `${t("caminho.menu_titulo", { n: camN })}. ${textoHoje}`);
  for (const e of [M.rotulo, M.nome, M.estado, M.caminho, M.diario, M.grelha, M.chips, M.faixa]) e.hidden = primeira;
  atualizarNav();
}
function atualizarNav() {
  const nivel1 = ["menu", "puzzles", "praca", "calceteiros"].includes(ecraAtual);
  const lojaAberta = !lojaUI.el.hidden;
  const visivel = (nivel1 || lojaAberta && ["menu", "puzzles", "praca", "calceteiros", "oficio", "metas"].includes(ecraAtual)) && !tutorial.tutorialPorFazer(documento());
  ecras.nav.mostrar(lojaAberta ? "loja" : ecraAtual === "menu" ? "inicio" : "praca", visivel);
}
const tutObj = () => tut;
const ecras = criarEcras({ t, app: appEl, acoes: {
  jogar: () => {
    if (tutorial.tutorialPorFazer(documento())) iniciarTutorial("primeira");
    else abrirDia(hoje());
  },
  caminho: () => abrirCaminho(),
  abrir: abrirSub,
  inicio: () => {
    lojaUI.fechar();
    ir("menu");
    renderDiario();
  },
  continuar: () => ir("jogo"),
  recomecar: () => {
    if (pedirRecomecar()) ir("jogo");
  },
  partilhar: () => {
    aoPartilhar().catch((e) => console.warn("[main] partilha falhou:", e));
  },
  seguinte: () => el.seguinte.click(),
  sair: sairParaMenu,
  voltar
} });
{
  const A = plugin("App");
  if (A && typeof A.addListener === "function") Promise.resolve(A.addListener("backButton", () => aoVoltar())).catch((e) => console.warn("[main] backButton:", e));
}
let lista = [];
let curados = [];
let tabela = [];
let painelPronto = false;
let jogo = null;
let fimAnimacao = false;
let avisoArranque = "";
let mensagemPista = "";
const tabuleiro = new Tabuleiro(el.canvas, CONFIG, aoTocar);
async function mostrarBuild() {
  var _a;
  if (new URLSearchParams(((_a = globalThis.location) == null ? void 0 : _a.search) || "").get("debug") !== "1") return;
  try {
    const r = await fetch("build.json", { cache: "no-store" });
    if (!r.ok) return;
    const b = await r.json();
    const d = new Date(b.hora);
    if (!b.commit || Number.isNaN(d.getTime())) return;
    const p2 = (n) => String(n).padStart(2, "0");
    ecras.menu.build.textContent = `build ${b.commit}${b.sujo ? "*" : ""} \xB7 ${p2(d.getDate())}/${p2(d.getMonth() + 1)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    ecras.menu.build.hidden = false;
  } catch {
  }
}
mostrarBuild();
async function lerPuzzles(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`n\xE3o consegui ler ${url}: ${r.status}`);
  const doc = await r.json();
  const { puzzles } = carregarLista(doc);
  const validos = new Set(puzzles.map((p) => p.id));
  return doc.puzzles.filter((o) => validos.has(o.id));
}
function abrir(fonte, { novo = false } = {}) {
  guardarAMeio();
  const obj = typeof fonte === "string" ? lista.find((o) => o.id === fonte) || curados.find((o) => o.id === fonte) : fonte;
  if (!obj) throw new Error(`puzzle ${fonte} n\xE3o existe`);
  const p = carregarPuzzle(obj);
  const reg = !novo && (dataDoId(p.id) || pacoteDoId(p.id) || caminho.caminhoDoId(p.id) != null) ? (documento().puzzles || {})[p.id] : null;
  jogo = reg ? retomarJogo(p, reg) : novoJogo(p);
  fimAnimacao = jogo.resolvido;
  fecharAssentar();
  assentarPendente = null;
  assentarUltimo = null;
  ganhoLascas = 0;
  trocoGanho = null;
  mensagemPista = "";
  tempoMs = 0;
  desarmarRecomecar();
  el.titulo.textContent = tituloDe(p);
  if ([...el.escolha.options].some((o) => o.value === p.id)) el.escolha.value = p.id;
  el.regra.textContent = t("regra." + p.variante);
  tabuleiro.definirJogo(jogo);
  atualizarUI();
  if (painelPronto) renderDiario();
  if (ecraAtual !== "jogo") ir("jogo");
}
function tituloDe(p) {
  const data = dataDoId(p.id);
  const pc = pacoteDoId(p.id);
  const cam = caminho.caminhoDoId(p.id);
  if (cam != null) return t("caminho.titulo_nivel", { n: cam });
  if (pc) return `${t(`artigo.${pc.pacote}.nome`)} \xB7 ${pc.indice} \xB7 ${t(`dif.${p.dificuldade || "medio"}`)}`;
  if (!data) return `${p.id} \xB7 ${p.nome || p.variante}`;
  if (data !== hoje()) return t("puzzle.titulo_arquivo", { dia: Number(data.slice(8)), mes: t(`mes.${Number(data.slice(5, 7))}`) });
  return t("puzzle.titulo_diario", { num: numeroDe(data), dif: t(`dif.${p.dificuldade || "medio"}`) });
}
const hoje = () => dataLocal(/* @__PURE__ */ new Date());
function numeroDe(data) {
  const n = numeroPartilha(data, DIA_LANCAMENTO);
  return n > 0 ? n : data;
}
function diarioDe(data) {
  return puzzleDoDia(data, {
    tabela,
    epoca: EPOCA_TABELA,
    carregar: (o) => {
      carregarPuzzle(o);
      return o;
    },
    reserva: (d) => gerarDiario(d).puzzle
  });
}
function abrirDia(data) {
  const { puzzle, fonte } = diarioDe(data);
  abrir(puzzle);
  return fonte;
}
const ROTULO_ESTADO = { por_jogar: "arquivo.por_jogar", a_meio: "arquivo.a_meio", resolvido: "arquivo.resolvido", resolvido_com_pistas: "arquivo.com_pistas" };
function renderDiario() {
  const h = hoje();
  const doc = documento();
  const idHoje = idDoDia(h);
  const entrada = tabela[indiceTabela(h, EPOCA_TABELA)];
  const meta = entrada && entrada.id === idHoje ? entrada : jogo && jogo.puzzle.id === idHoje ? jogo.puzzle : null;
  const tipo = meta ? " \xB7 " + t("inicio.tipo", { variante: t(`variante.${meta.variante}`), dif: t(`dif.${meta.dificuldade}`) }) : "";
  ui.info.textContent = `${t("inicio.puzzle_do_dia")} \xB7 ${t("inicio.numero", { num: numeroDe(h) })}${tipo}`;
  const est = estadoDe(doc, idHoje);
  const resolvidoHoje = est === "resolvido" || est === "resolvido_com_pistas";
  rotular(ui.jogar, est === "a_meio" ? "inicio.continuar" : "inicio.jogar");
  ui.jogar.hidden = !!(jogo && jogo.puzzle.id === idHoje && !jogo.resolvido);
  const seq = sequenciaDe(doc);
  const linhaSeq = tn("inicio.sequencia", seq.atual, { n: seq.atual });
  ui.sequencia.textContent = resolvidoHoje ? `${t("inicio.resolvido_hoje")} ${linhaSeq}.` : seq.recorde > 0 ? `${linhaSeq} \xB7 ${t("inicio.recorde", { n: seq.recorde })}` : linhaSeq;
  const mes = h.slice(0, 7);
  const arq = arquivoDoMes(doc, mes, h, temItem);
  ui.arquivoTitulo.textContent = `${t("arquivo.titulo")} \xB7 ${t(`mes.titulo.${Number(mes.slice(5))}`)}`;
  const passados = arq.dias.filter((d) => !d.futuro);
  const botoes = passados.map((d) => {
    const b = criar("button", {
      id: `btn-arq-${d.data}`,
      type: "button",
      role: "listitem",
      class: `dia-arq ${d.estado}${d.hoje ? " hoje" : ""}`,
      "aria-label": `${t("puzzle.titulo_arquivo", { dia: d.dia, mes: t(`mes.${Number(mes.slice(5))}`) })}: ${t(ROTULO_ESTADO[d.estado])}`,
      title: t(ROTULO_ESTADO[d.estado])
    }, String(d.dia));
    if (d.dia === 1) b.style.gridColumnStart = String(diaDaSemana(d.data) + 1);
    b.addEventListener("click", () => {
      ui.arquivo.open = false;
      abrirDia(d.data);
    });
    return b;
  });
  ui.arquivoDias.replaceChildren(...passados.length > 1 ? botoes : [criar("p", { class: "arquivo-vazio" }, t("arquivo.vazio"))]);
  renderPacotes();
  renderPraca();
  renderMenu(est, ui.sequencia.textContent, meta);
}
let mesPraca = null;
function solucaoDoDia(id) {
  try {
    const p = diarioDe(dataDoId(id)).puzzle;
    return { n: p.n, solucao: typeof p.solucao === "string" ? p.solucao : escreverGrelha(p.solucao) };
  } catch {
    return null;
  }
}
let assentarPendente = null;
let assentarUltimo = null;
function mostrarQuadradoAssente() {
  const d = assentarPendente;
  assentarPendente = null;
  if (!d) return null;
  if (ecraAtual !== "jogo" && ecraAtual !== "resultado") return null;
  assentarUltimo = d;
  let dados;
  if (/^\d{4}-\d{2}$/.test(d.praca)) {
    const e = estadoPracaMes(d.praca);
    const mes = t(`mes.titulo.${Number(d.praca.slice(5))}`);
    dados = {
      titulo: t("praca.mes_ano", { mes, ano: d.praca.slice(0, 4) }),
      colunas: e.colunas,
      deslocamento: e.deslocamento,
      quadrados: e.quadrados,
      legenda: `${t("praca.dia_resolvido", { dia: d.quadrado })} \xB7 ${t("praca.progresso", { feitos: e.feitos, total: e.total })}`
    };
  } else {
    const e = estadosPacotes().find((x) => x.id === d.praca);
    if (!e) return null;
    dados = {
      titulo: t(`artigo.${e.id}.nome`),
      colunas: COLUNAS_LARGO,
      deslocamento: 0,
      quadrados: e.quadrados,
      legenda: t("praca.progresso_largo", { feitos: e.feitos, total: e.total })
    };
  }
  return mostrarAssentar(ecraAtual === "resultado" ? ecras.resultado.host : el.canvas, { ...dados, praca: d.praca, novo: d.quadrado, ms: CONFIG.ASSENTAR_PRACA_MS });
}
function pixelsEscuros(cv) {
  if (!cv || !cv.getContext) return null;
  const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2] < 96) n++;
  return n;
}
function estadoPracaMes(mes = mesPraca || hoje().slice(0, 7)) {
  return estadoDoMes(documento(), mes, hoje(), { temItem, solucaoDe: solucaoDoDia });
}
function renderPraca() {
  if (!ui.pracaCorpo) return;
  const h = hoje(), atual = h.slice(0, 7);
  const minimo = DIA_LANCAMENTO.slice(0, 7) < atual ? DIA_LANCAMENTO.slice(0, 7) : atual;
  if (!mesPraca || mesPraca > atual) mesPraca = atual;
  if (mesPraca < minimo) mesPraca = minimo;
  if (!ui.praca.open) {
    ui.pracaCorpo.replaceChildren();
    return;
  }
  const e = estadoPracaMes(mesPraca);
  const nomeMes = t(`mes.titulo.${Number(mesPraca.slice(5))}`);
  const ant = criar("button", { id: "btn-praca-anterior", type: "button", "aria-label": t("praca.anterior") }, "\u2039");
  const seg = criar("button", { id: "btn-praca-seguinte", type: "button", "aria-label": t("praca.seguinte") }, "\u203A");
  ant.disabled = mesPraca <= minimo;
  seg.disabled = mesPraca >= atual;
  ant.addEventListener("click", () => {
    mesPraca = mesVizinho(mesPraca, -1);
    renderPraca();
  });
  seg.addEventListener("click", () => {
    mesPraca = mesVizinho(mesPraca, 1);
    renderPraca();
  });
  const cab = criar(
    "div",
    { class: "praca-cab" },
    ant,
    criar("strong", { id: "praca-titulo" }, t("praca.mes_ano", { mes: nomeMes, ano: mesPraca.slice(0, 4) })),
    seg
  );
  const prog = criar(
    "p",
    { id: "praca-progresso", class: "pacote-estado" },
    e.completa ? t("praca.completa") : t("praca.progresso", { feitos: e.feitos, total: e.total })
  );
  const rotuloDia = (q) => {
    if (q.data === h) return t("praca.dia_hoje", { dia: q.indice });
    return t(q.praca === "resolvido" ? "praca.dia_resolvido" : q.praca === "futuro" ? "praca.dia_futuro" : "praca.dia_por_resolver", { dia: q.indice });
  };
  const praca = criarPraca({
    id: mesPraca,
    colunas: e.colunas,
    deslocamento: e.deslocamento,
    acesa: e.acesa,
    motivo: e.motivo,
    motivoNome: e.motivo ? t("praca.motivo", { motivo: t(`motivo.${e.motivo}`) }) : "",
    rotulo: `${nomeMes}: ${t("praca.progresso", { feitos: e.feitos, total: e.total })}`,
    quadrados: e.quadrados.map((q) => ({ ...q, rotulo: rotuloDia(q), desativado: q.praca === "futuro" || !e.desbloqueado }))
  }, (q) => {
    ui.praca.open = false;
    abrirDia(q.data);
  });
  const filhos = [cab, prog];
  if (e.feitos === 0 && mesPraca === atual) filhos.push(criar("p", { class: "loja-info" }, t("praca.vazia")));
  filhos.push(praca);
  ui.pracaCorpo.replaceChildren(...filhos);
}
let pacoteAberto = PACOTES[0].id;
const LASCAS_DIARIO = CONFIG.LASCAS_DIARIO;
const curadoPorId = () => Object.fromEntries(curados.map((o) => [o.id, o]));
function estadosPacotes() {
  const doc = documento();
  const puzzles = curadoPorId();
  const catalogo = PACOTES.map((p) => loja.artigo(p.id)).filter(Boolean);
  return PACOTES.map((p) => estadoDoPacote(doc, p.id, { temItem, catalogo, puzzles }));
}
function precoEur(id) {
  try {
    const p = produtosEur().find((x) => x.id === id);
    return p && p.disponivel ? p.preco : null;
  } catch {
    return null;
  }
}
async function trocarPacote(est) {
  const artigo = t(`artigo.${est.id}.nome`);
  if (!confirm(t("loja.confirmar_lascas", { preco: est.preco.lascas, artigo }))) return { resultado: "cancelada" };
  const r = await loja.trocar(est.id);
  if (r.resultado === "concluida" || r.resultado === "ja_tem") el.mensagem.textContent = t("loja.comprado", { artigo });
  else if (r.resultado === "saldo_insuficiente") el.mensagem.textContent = t("caminho.loja_faltam", { n: r.faltam, teto: CONFIG.CAMINHO_TETO_DIA });
  else el.mensagem.textContent = t("loja.erro");
  renderPacotes();
  return r;
}
async function comprarPacote(est) {
  var _a;
  const artigo = t(`artigo.${est.id}.nome`);
  el.mensagem.textContent = t("loja.a_comprar");
  let r;
  try {
    r = await comprarEur(est.id);
  } catch (e) {
    r = { resultado: "erro", erro: "desconhecido" };
  }
  const msg = { concluida: t("loja.comprado", { artigo }), ja_tem: t("loja.comprado", { artigo }), pendente: t("loja.pendente"), erro: t("loja.erro"), cancelada: "", em_curso: t("loja.a_comprar") };
  el.mensagem.textContent = (_a = msg[r.resultado]) != null ? _a : "";
  renderPacotes();
  return r;
}
function renderPacotes() {
  if (!ui.pacotesCorpo) return;
  const estados = estadosPacotes();
  const abas = criar("div", { class: "pacotes-abas", role: "tablist" }, ...estados.map((e2) => {
    const b = criar("button", {
      id: `btn-pac-${e2.id}`,
      type: "button",
      role: "tab",
      class: "pacote-aba",
      "aria-selected": String(e2.id === pacoteAberto)
    }, t(`artigo.${e2.id}.nome`));
    b.addEventListener("click", () => {
      pacoteAberto = e2.id;
      renderPacotes();
    });
    return b;
  }));
  const e = estados.find((x) => x.id === pacoteAberto) || estados[0];
  const estadoTxt = !e.desbloqueado ? t("arquivo.pacote_bloqueado") : `${e.gratis ? t("arquivo.pacote_gratis") + " \xB7 " : ""}${t("praca.progresso_largo", { feitos: e.feitos, total: e.total })}`;
  const cab = criar("p", { class: "pacote-estado", id: "pacote-estado" }, estadoTxt);
  const nome = t(`artigo.${e.id}.nome`);
  const praca = criarPraca({
    id: e.id,
    colunas: COLUNAS_LARGO,
    acesa: e.acesa,
    motivo: e.motivo,
    motivoNome: e.motivo ? t("praca.motivo", { motivo: t(`motivo.${e.motivo}`) }) : "",
    rotulo: `${nome}: ${t("praca.progresso_largo", { feitos: e.feitos, total: e.total })}`,
    quadrados: e.quadrados.map((q) => ({
      ...q,
      desativado: !e.desbloqueado || !curados.some((o) => o.id === q.id),
      rotulo: `${nome} ${q.indice}: ${t(ROTULO_ESTADO[q.estado] || "arquivo.por_jogar")}`
    }))
  }, (q) => {
    ui.pacotes.open = false;
    abrir(q.id);
  });
  const filhos = [abas, cab];
  if (!e.desbloqueado) {
    const precos = criar("div", { class: "pacote-precos" });
    if (e.preco.lascas) {
      const b = criar("button", { id: `btn-trocar-${e.id}`, type: "button" }, tn("comum.lascas", e.preco.lascas, { n: e.preco.lascas }));
      b.addEventListener("click", () => {
        trocarPacote(e).catch((x) => console.warn("[main] troca falhou:", x));
      });
      precos.append(b);
    }
    const faltam = (e.preco.lascas || 0) - ((documento().lascas || {}).saldo || 0);
    if (e.preco.lascas && faltam > 0) {
      const ir2 = criar("button", { id: `btn-caminho-${e.id}`, type: "button" }, t("caminho.loja_botao"));
      ir2.addEventListener("click", () => abrirCaminho());
      filhos.push(criar("p", { id: `pacote-caminho-${e.id}`, class: "loja-info" }, t("caminho.loja_faltam", { n: faltam, teto: CONFIG.CAMINHO_TETO_DIA })), ir2);
    }
    if (e.preco.eur != null) {
      const preco = precoEur(e.id);
      const b = criar("button", { id: `btn-eur-${e.id}`, type: "button" }, preco != null ? preco : t("loja.eur_sem_rede"));
      b.disabled = preco == null;
      b.addEventListener("click", () => {
        comprarPacote(e).catch((x) => console.warn("[main] compra falhou:", x));
      });
      precos.append(b);
    }
    filhos.push(precos);
  }
  filhos.push(praca);
  ui.pacotesCorpo.replaceChildren(...filhos);
}
function textoDaPartilha() {
  if (!jogo || caminho.caminhoDoId(jogo.puzzle.id) != null) return null;
  return textoPartilha(documento(), jogo.puzzle, {
    t,
    tn,
    diaLancamento: DIA_LANCAMENTO,
    nomePacote: (id) => t(`artigo.${id}.nome`)
  });
}
async function aoPartilhar() {
  const texto = textoDaPartilha();
  if (!texto) return null;
  const r = await partilhar(texto, { id: jogo.puzzle.id, titulo: t("partilha.titulo_folha") });
  if (r.ok && r.via === "copia") el.mensagem.textContent = t("resultado.copiado");
  return { ...r, texto };
}
function aoTocar(l, c) {
  const r = tocar(jogo, l, c);
  if (r.ok) {
    mensagemPista = "";
    avisoArranque = "";
    if (ui.avisoGravacao) ui.avisoGravacao.hidden = true;
  }
  if (!r.ok) {
    if (r.fixa) tabuleiro.animarAbanar(r.i, r.motivo);
    return r;
  }
  if (r.depois !== 0) tabuleiro.animarAssentar(r.i);
  if (tut && jogo.puzzle.id === tutorial.puzzleAtual(tut)) {
    tut = tutorial.aoTocar(tut, jogo.puzzle, jogo.grelha, r.i, performance.now());
  }
  depoisDeMudar();
  renderTutorial();
  return r;
}
let tut = null;
let tutRelogio = null;
ui.tutorial = criar("p", { id: "tutorial-dica", class: "tutorial-dica", role: "status", "aria-live": "polite", hidden: true });
ui.tutorialSair = criar("button", { id: "btn-tutorial-sair", type: "button", hidden: true }, t("comum.voltar"));
el.regra.before(ui.tutorial);
ui.avisoGravacao = criar("p", { id: "aviso-gravacao", class: "aviso-gravacao", role: "alert", hidden: true });
ui.avisoGravacao.addEventListener("click", () => {
  ui.avisoGravacao.hidden = true;
});
el.regra.before(ui.avisoGravacao);
el.recomecar.after(ui.tutorialSair);
ui.tutorialSair.addEventListener("click", async () => {
  if (tut && tut.modo === "primeira") {
    if (!confirm(t("tutorial.saltar_confirmar"))) return;
    const r = tutorial.saltar(documento(), hoje());
    try {
      await gravarDocumento(documento());
    } catch (e) {
      console.warn("[main] saltar tutorial n\xE3o gravou:", e);
    }
    for (const [n, d] of r.eventos) emitir(n, d);
  }
  terminarTutorial();
});
def.rever = criar("button", { id: "btn-def-tutorial", type: "button", class: "def-restaurar" }, t("definicoes.rever_tutorial"));
def.rever.addEventListener("click", () => {
  if (!confirm(t("tutorial.rever_confirmar"))) return;
  def.painel.open = false;
  iniciarTutorial("rever");
});
def.corpo.append(def.rever);
function iniciarTutorial(modo = "primeira") {
  appEl.classList.add("em-tutorial");
  tut = tutorial.criarTutorial(documento(), { modo, agoraMs: performance.now() });
  ui.painel.hidden = true;
  lojaUI.fechar();
  abrir(tutorial.puzzleAtual(tut), { novo: modo === "rever" });
  clearInterval(tutRelogio);
  tutRelogio = setInterval(verAjudaTutorial, 1e3);
  renderTutorial();
  return vistaTutorial();
}
function terminarTutorial() {
  tut = null;
  appEl.classList.remove("em-tutorial");
  tabuleiro.definirGuia(null);
  clearInterval(tutRelogio);
  ui.painel.hidden = false;
  ui.tutorial.hidden = true;
  ui.tutorialSair.hidden = true;
  el.regra.hidden = false;
  abrirDia(hoje());
  ir("menu");
}
function vistaTutorial() {
  if (!tut) return null;
  return tutorial.vista(tut, jogo && jogo.puzzle.id === tutorial.puzzleAtual(tut) ? jogo.puzzle : null, jogo ? jogo.grelha : null);
}
function renderTutorial() {
  var _a;
  if (!tut) return;
  const v = vistaTutorial();
  if (v.ecra === "resultado" && tut.indice === 0) v.chave = "tutorial.p1_revela";
  ui.tutorial.hidden = !v.chave;
  ui.tutorial.textContent = v.chave ? t(v.chave, v.params) : "";
  el.regra.hidden = !!v.chave && v.ecra === "puzzle";
  const podeSaltar = tut.modo === "primeira" && v.ecra === "puzzle";
  ui.tutorialSair.hidden = !(v.podeSair || podeSaltar);
  ui.tutorialSair.textContent = t(podeSaltar ? "tutorial.saltar" : "comum.voltar");
  if (v.ecra === "tutorial") {
    el.seguinte.hidden = false;
    arrumarBotoes();
  }
  const d = v.destaque && v.ecra === "puzzle" && jogo ? v.destaque : null;
  const sol = d && jogo.puzzle.solucao;
  tabuleiro.definirGuia(d ? { i: d.i, cor: (_a = d.cor) != null ? _a : sol ? sol[d.i] : null, mao: true } : null);
}
function verAjudaTutorial() {
  if (!tut || !jogo || jogo.resolvido) return;
  if (!tutorial.precisaAjuda(tut, performance.now(), CONFIG.TUTORIAL_AJUDA_S)) return;
  tut = tutorial.aoAjudar(tut, performance.now());
  const r = pista(jogo);
  if (!r || r.regra === "conflito") {
    renderTutorial();
    return;
  }
  const rv = revelar(jogo, r.i);
  if (!rv.ok) return;
  jogo.pistasUsadas = Math.max(0, jogo.pistasUsadas - 1);
  tabuleiro.mostrarPista(r, { gratis: true });
  depoisDeMudar();
  renderTutorial();
}
async function aoResolverTutorial() {
  const r = tutorial.aoResolver(tut, documento(), hoje(), { pistasIniciais: CONFIG.PISTAS_INICIAIS });
  tut = r.T;
  if (r.eventos.length) {
    try {
      await gravarDocumento(documento());
    } catch (e) {
      console.warn("[main] tutorial n\xE3o gravou:", e);
    }
    for (const [n, d] of r.eventos) emitir(n, d);
  }
  renderTutorial();
}
function continuarTutorial() {
  tut = tutorial.continuar(tut, performance.now());
  if (tut.passo === "saiu") {
    terminarTutorial();
    return;
  }
  abrir(tutorial.puzzleAtual(tut), { novo: tut.modo === "rever" });
  renderTutorial();
}
function aoDesfazer() {
  const r = desfazer(jogo);
  if (r) {
    mensagemPista = "";
    depoisDeMudar();
  }
  return r;
}
function aoPista() {
  var _a, _b;
  if (!jogo || jogo.resolvido) return { ok: false, motivo: "resolvido" };
  if (saldoPistas(documento()) <= 0 && caminho.caminhoDoId(jogo.puzzle.id) != null) {
    emitir("puzzle:sem_pistas", { id: jogo.puzzle.id });
    mensagemPista = t("caminho.sem_pistas", { preco: (_b = (_a = loja.artigo("PISTA-1")) == null ? void 0 : _a.lascas) != null ? _b : 15 });
    atualizarUI();
    return { ok: false, motivo: "sem_pistas" };
  }
  if (saldoPistas(documento()) <= 0) {
    emitir("puzzle:sem_pistas", { id: jogo.puzzle.id });
    mensagemPista = t("pista.sem_stock");
    atualizarUI();
    lojaUI.abrir("pistas");
    return { ok: false, motivo: "sem_pistas" };
  }
  const r = pista(jogo);
  if (!r) return { ok: false, motivo: "nada" };
  const frase = textoDaPista(jogo.puzzle, jogo.grelha, r);
  if (r.regra === "conflito") jogo.pistasUsadas++;
  else {
    const rv = revelar(jogo, r.i);
    if (!rv.ok) return { ok: false, motivo: rv.motivo };
  }
  const params2 = { ...frase.params };
  if (params2.onde) params2.onde = t("comum." + params2.onde);
  if (params2.cores) params2.cores = t("comum." + params2.cores);
  mensagemPista = t(frase.chave, params2);
  tabuleiro.mostrarPista(r);
  depoisDeMudar();
  return { ok: true, tipo: r.regra === "conflito" ? "conflito" : "revela", ...r, frase: mensagemPista };
}
function depoisDeMudar() {
  tabuleiro.atualizarAvisos();
  if (jogo.resolvido) {
    tabuleiro.animarResolvido(() => {
      fimAnimacao = true;
      atualizarUI();
      mostrarResultado();
    }, { revela: !!tut && /^p[12]/.test(tut.passo) });
  }
  tabuleiro.pedirDesenho();
  atualizarUI();
  clearTimeout(depoisDeMudar.tm);
  depoisDeMudar.tm = setTimeout(atualizarUI, CONFIG.AVISO_ATRASO_MS + 10);
}
function abrirCaminho() {
  lojaUI.fechar();
  const obj = caminho.nivelAtual(documento());
  caminhoAtualObj = obj;
  abrir(obj);
  emitir("caminho:nivel", { n: caminho.caminhoDoId(obj.id), faixa: caminho.faixaDe(caminho.caminhoDoId(obj.id)) });
  return obj.id;
}
async function saltarCaminho() {
  if (!jogo || jogo.resolvido) return { ok: false, motivo: "resolvido" };
  const n = caminho.caminhoDoId(jogo.puzzle.id);
  if (n == null) return { ok: false, motivo: "nao_caminho" };
  const r = caminho.saltar(documento(), n, (caminhoMs.get(n) || 0) / 1e3);
  if (!r.ok) return r;
  guardarAMeio();
  try {
    await gravarDocumento(documento());
  } catch (e) {
    console.warn("[main] saltar n\xE3o gravou:", e);
  }
  for (const [nome, dados] of r.eventos) emitir(nome, dados);
  abrirCaminho();
  el.mensagem.textContent = t("caminho.saltado");
  return r;
}
function linhaCaminho() {
  if (trocoGanho) return t("caminho.troco_concluido", trocoGanho);
  const h = caminho.lascasHoje(documento(), hoje());
  return ganhoLascas === 0 && h.ganhas >= h.teto ? t("caminho.teto_dia") : "";
}
ui.saltar = criar("button", { id: "btn-saltar", type: "button", class: "btn-saltar", hidden: true, "aria-label": t("caminho.saltar_aria") }, t("caminho.saltar"));
ui.saltar.addEventListener("click", () => {
  saltarCaminho().catch((e) => console.warn("[main] saltar falhou:", e));
});
el.titulo.after(ui.saltar);
ui.objetivo = criar("p", { id: "objetivo-hoje", class: "objetivo-hoje", hidden: true });
el.regra.before(ui.objetivo);
function renderObjetivo() {
  const cam = jogo ? caminho.caminhoDoId(jogo.puzzle.id) : null;
  ui.saltar.hidden = cam == null || !!jogo.resolvido;
  if (cam != null) {
    const h = caminho.lascasHoje(documento(), hoje());
    const falta = Math.max(0, Math.ceil(CONFIG.CAMINHO_SALTAR_S - (caminhoMs.get(cam) || 0) / 1e3));
    ui.saltar.disabled = falta > 0;
    ui.objetivo.hidden = false;
    ui.objetivo.textContent = [
      t(h.ganhas >= h.teto ? "caminho.hoje_teto" : "caminho.hoje", { ganhas: h.ganhas, teto: h.teto }),
      ...falta > 0 && !jogo.resolvido ? [t("caminho.saltar_em")] : []
    ].join(" \xB7 ");
    return;
  }
  const m = !tut && objetivosCat.length ? vistaMetas().hoje[0] : null;
  ui.objetivo.hidden = !m;
  if (m) ui.objetivo.textContent = t(m.feito ? "objetivo.hoje_feito" : "objetivo.hoje", { meta: t(m.texto) });
}
function renderRegra() {
  if (!jogo) return;
  const base = t("regra." + jogo.puzzle.variante);
  let n = 0;
  for (let i = 0; i < jogo.grelha.length; i++) if (jogo.grelha[i] === 0) n++;
  el.regra.textContent = jogo.resolvido ? base : base + " " + t(n === 1 ? "objetivo.falta_uma" : "objetivo.faltam", { n });
}
function atualizarUI() {
  renderRegra();
  renderObjetivo();
  el.desfazer.disabled = jogo.resolvido || jogo.historico.length === 0;
  el.pista.textContent = t("puzzle.pista", { n: saldoPistas(documento()) });
  el.pista.disabled = jogo.resolvido;
  el.seguinte.hidden = !fimAnimacao;
  ui.partilhar.hidden = !(fimAnimacao && textoDaPartilha());
  ui.loja.hidden = !lojaVisivel(jogo);
  let msg = "";
  if (jogo.resolvido) msg = fimAnimacao ? t("estado.resolvido") : "";
  else if (tabuleiro.avisosVisiveis() && tabuleiro.avisos.regras.size) {
    msg = t("aviso." + [...tabuleiro.avisos.regras][0]);
  }
  if (!jogo.resolvido && mensagemPista) msg = mensagemPista;
  el.mensagem.textContent = msg;
  el.mensagem.classList.toggle("ok", jogo.resolvido);
  arrumarBotoes();
}
function arrumarBotoes() {
  const fim = !!jogo && jogo.resolvido && !el.seguinte.hidden;
  el.desfazer.hidden = fim;
  el.pista.hidden = fim;
}
el.desfazer.addEventListener("click", aoDesfazer);
el.pista.addEventListener("click", aoPista);
let recomecarArmado = null;
function desarmarRecomecar() {
  if (!recomecarArmado) return;
  clearTimeout(recomecarArmado.tm);
  recomecarArmado.botoes.forEach(([b, f]) => f(b));
  recomecarArmado = null;
}
function recomecarAgora() {
  desarmarRecomecar();
  recomecar(jogo);
  fimAnimacao = false;
  mensagemPista = "";
  tempoMs = 0;
  tabuleiro.definirJogo(jogo);
  atualizarUI();
}
function pedirRecomecar() {
  if (!jogo.historico.length) {
    recomecarAgora();
    return true;
  }
  if (recomecarArmado) {
    recomecarAgora();
    return true;
  }
  const rot = (b) => {
    if (b === el.recomecar) rotular(b, "botao.recomecar");
    else b.textContent = t("botao.recomecar");
  };
  const botoes = [el.recomecar, ecras.pausa.recomecar].map((b) => [b, rot]);
  for (const [b] of botoes) {
    b.textContent = t("botao.recomecar_confirmar");
    b.setAttribute("aria-live", "polite");
  }
  recomecarArmado = { botoes, tm: setTimeout(desarmarRecomecar, 3e3) };
  return false;
}
el.recomecar.addEventListener("click", () => {
  pedirRecomecar();
});
let tempoMs = 0;
el.tempo = criar("span", { id: "tempo", class: "tempo", hidden: true, "aria-label": t("definicoes.tempo") });
el.escolha.closest("label").after(el.tempo);
const tempoLigado = () => !!definicoesAtuais().tempo;
function mostrarTempo() {
  const s = Math.floor(tempoMs / 1e3);
  el.tempo.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  el.tempo.hidden = !tempoLigado();
}
let tempoUltimo = performance.now();
setInterval(() => {
  const agora = performance.now();
  if (ecraAtual === "jogo" && jogo && !jogo.resolvido && !tut && !document.hidden) {
    tempoMs += agora - tempoUltimo;
    const cn = caminho.caminhoDoId(jogo.puzzle.id);
    if (cn != null) {
      caminhoMs.set(cn, (caminhoMs.get(cn) || 0) + agora - tempoUltimo);
      renderObjetivo();
    }
  }
  tempoUltimo = agora;
  mostrarTempo();
}, 500);
el.seguinte.addEventListener("click", () => {
  if (tut) {
    continuarTutorial();
    return;
  }
  if (caminho.caminhoDoId(jogo.puzzle.id) != null) {
    abrirCaminho();
    return;
  }
  const pc = pacoteDoId(jogo.puzzle.id);
  if (pc) {
    const prox = idCurado(pc.pacote, pc.indice % 20 + 1);
    if (curados.some((o) => o.id === prox)) {
      abrir(prox);
      return;
    }
  }
  const k = lista.findIndex((o) => o.id === jogo.puzzle.id);
  abrir(lista[(k + 1) % lista.length].id);
});
el.pausa.addEventListener("click", () => ir("pausa"));
el.escolha.addEventListener("change", () => abrir(el.escolha.value));
ui.jogar.addEventListener("click", () => abrirDia(hoje()));
ui.partilhar.addEventListener("click", () => {
  aoPartilhar().catch((e) => console.warn("[main] partilha falhou:", e));
});
ouvir((nome, dados) => {
  var _a, _b, _c;
  if (!painelPronto) return;
  if (nome === "puzzle:resolvido" && tut && dados && dados.id === tutorial.puzzleAtual(tut) && /^p[123]/.test(tut.passo)) {
    aoResolverTutorial().catch((e) => console.warn("[main] tutorial:", e));
  }
  if (nome === "app:pausa") guardarAMeio();
  if (nome === "lascas:alteradas" && dados && dados.motivo === "puzzle") ganhoLascas = dados.delta;
  if (nome === "lascas:alteradas" && dados && (dados.motivo === "caminho" || dados.motivo === "caminho_troco")) ganhoLascas += dados.delta;
  if (nome === "caminho:troco") trocoGanho = { troco: dados.troco, bonus: dados.bonus };
  if (["oficio:pontos", "oficio:nivel", "objetivo:cumprido", "colecao:alterada"].includes(nome)) {
    renderOficio();
    if (ecraAtual === "puzzles") renderColecao();
  }
  if (nome === "dia:verificado" || nome === "sequencia:alterada" || nome === "puzzle:assentado") renderDiario();
  if (nome === "pistas:alteradas" && jogo) atualizarUI();
  if (["praca:quadrado", "item:obtido", "item:perdido", "compras:direitos", "compras:produtos"].includes(nome)) renderPacotes();
  if (/^(lascas|pistas|item|compras):/.test(nome)) lojaUI.render();
  if (nome === "item:equipado") {
    if ((_b = (_a = documento().inventario) == null ? void 0 : _a.equipado) == null ? void 0 : _b.som) audio.definirSom(documento().inventario.equipado.som);
    definirEquipado((_c = documento().inventario) == null ? void 0 : _c.equipado);
    renderPacotes();
  }
  if (nome === "praca:quadrado") renderPraca();
  if (nome === "praca:quadrado" && !tut && dados && jogo && dados.puzzleId === jogo.puzzle.id) {
    assentarPendente = dados;
    if (fimAnimacao) mostrarQuadradoAssente();
  }
  if (nome === "puzzle:assentado" && assentarPendente && dados && dados.id === assentarPendente.puzzleId) mostrarQuadradoAssente();
  if (nome === "praca:completa" && dados && /^\d{4}-\d{2}$/.test(dados.praca)) {
    mesPraca = dados.praca;
    renderPraca();
    acenderMotivo(ui.pracaCorpo.querySelector(".praca"));
    el.mensagem.textContent = t("resultado.praca_completa", { mes: t(`mes.${Number(dados.praca.slice(5))}`), lascas: dados.lascas });
  }
  if (nome === "praca:completa" && dados && pacoteDoId(`${dados.praca}-01`)) {
    pacoteAberto = dados.praca;
    renderPacotes();
    acenderMotivo(ui.pacotesCorpo.querySelector(".praca"));
    el.mensagem.textContent = t("resultado.largo_completo", { pacote: t(`artigo.${dados.praca}.nome`) });
  }
});
function estado() {
  const v = violacoes(jogo.puzzle, jogo.grelha);
  return {
    id: jogo.puzzle.id,
    variante: jogo.puzzle.variante,
    dificuldade: jogo.puzzle.dificuldade,
    n: jogo.puzzle.n,
    grelha: escreverGrelha(jogo.grelha),
    dadas: escreverGrelha(jogo.puzzle.dadas),
    jogadas: jogo.historico.length,
    reveladas: jogo.reveladas.slice(),
    pistasUsadas: jogo.pistasUsadas,
    resolvido: jogo.resolvido,
    animacaoTerminada: fimAnimacao,
    violacoes: [...v.regras],
    casasEmConflito: [...v.celulas].sort((a, b) => a - b)
  };
}
function paramValido(nome, valor, validos, omissao) {
  if (valor == null || valor === "") return omissao;
  if (validos.includes(valor)) return valor;
  console.warn(`?${nome}=${valor} inv\xE1lido (${validos.join("/")}); uso ${omissao}`);
  return omissao;
}
function gerarDeParams(seed) {
  return gerar({
    seed,
    variante: paramValido("variante", params.get("variante"), VARIANTES, "equilibrio"),
    n: paramValido("n", params.has("n") ? Number(params.get("n")) : null, TAMANHOS, 6),
    dificuldade: paramValido("dif", params.get("dif"), DIFICULDADES, "medio")
  }).puzzle;
}
async function lerTabela(url) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const doc = await r.json();
    return Array.isArray(doc.puzzles) ? doc.puzzles : [];
  } catch (e) {
    console.warn(`[main] ${url} indispon\xEDvel; o di\xE1rio vem do gerador de reserva:`, e);
    return [];
  }
}
function marcarMenu() {
  if (marcarMenu.feito) return;
  marcarMenu.feito = true;
  const marcar = () => {
    try {
      const m = performance.mark("menu");
      console.info(`[seixo] menu ${Math.round(m && m.startTime != null ? m.startTime : performance.now())} ms`);
    } catch (e) {
      console.warn("[main] performance.mark indispon\xEDvel:", e);
    }
  };
  if (typeof requestAnimationFrame !== "function" || document.visibilityState === "hidden") {
    setTimeout(marcar, 0);
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(marcar));
}
async function arrancar() {
  var _a, _b, _c;
  ligarCicloDeVida();
  try {
    audio.ligar();
    audio.ligarGesto();
  } catch (e) {
    console.warn("[main] \xE1udio n\xE3o ligou:", e);
  }
  lista = await lerPuzzles("data/puzzles.json");
  for (const o of lista) el.escolha.add(new Option(o.id, o.id));
  tabela = await lerTabela("data/diarios.json");
  curados = await lerPuzzles("data/curados.json").catch((e) => {
    console.warn("[main] curados indispon\xEDveis:", e);
    return [];
  });
  objetivosCat = await fetch("data/objetivos.json").then((r) => r.json()).then((d) => d.objetivos || []).catch((e) => {
    console.warn("[main] objetivos indispon\xEDveis:", e);
    return [];
  });
  const porId = new Map([...lista, ...curados, ...tabela].map((o) => [o.id, o]));
  const [camTabela, camReserva] = await Promise.all(["data/caminho.json", "data/caminho-reserva.json"].map((u) => fetch(u).then((r) => r.json()).catch((e) => {
    console.warn(`[main] ${u} indispon\xEDvel:`, e);
    return null;
  })));
  if (camTabela) caminho.configurarCaminho({ tabela: camTabela, reserva: camReserva });
  const puzzlePorId = (id) => {
    const n = caminho.caminhoDoId(id);
    if (n == null) return porId.get(id) || null;
    if (caminhoAtualObj && caminhoAtualObj.id === id) return caminhoAtualObj;
    try {
      const p = caminho.parametrosCaminho(n);
      return { id, variante: p.variante, n: p.tamanho, dificuldade: { F: "facil", M: "medio", D: "dificil" }[p.faixa] };
    } catch {
      return null;
    }
  };
  const meta = await iniciarMeta({ puzzlePorId, catalogoObjetivos: () => objetivosCat, jogoAtual: () => jogo ? estadoParaGravar(jogo) : null }).catch((e) => {
    console.warn("[main] meta n\xE3o arrancou:", e);
    return {};
  });
  carregarContas().then((c) => ligarProgressoConta({
    contas: c,
    ouvir,
    documento,
    substituir: (d) => estadoMeta.substituir(d),
    gravarJa: (d) => import("./plataforma/gravacao.js").then((g) => g.gravarJa(d)),
    aoMudar: (e) => contasUI && contasUI.aoMudar(e),
    aoAplicado: () => {
      aplicarDefinicoes();
      renderOficio();
    }
  })).catch((e) => console.warn("[main] progresso/contas:", e));
  aplicarDefinicoes();
  definirEquipado((_a = documento().inventario) == null ? void 0 : _a.equipado);
  audio.definirSom((_c = (_b = documento().inventario) == null ? void 0 : _b.equipado) == null ? void 0 : _c.som);
  renderOficio();
  painelPronto = true;
  const pedido = params.get("p");
  if (params.get("data")) abrir(gerarDiario(params.get("data")).puzzle);
  else if (params.get("seed")) abrir(gerarDeParams(params.get("seed")));
  else if (lista.some((o) => o.id === pedido)) abrir(pedido);
  else if (params.get("dia")) abrirDia(params.get("dia"));
  else if (params.get("tutorial") === "1" || params.get("tutorial") !== "0" && curados.length && tutorial.ecraDeArranque(documento()) === "tutorial") iniciarTutorial("primeira");
  else {
    abrirDia(hoje());
    ir("menu");
  }
  if (params.get("debug") === "1") {
    globalThis.SEIXO_DEBUG = {
      estado,
      tocar: (l, c) => {
        var _a2;
        const r = aoTocar(l, c);
        return { ok: r.ok, motivo: (_a2 = r.motivo) != null ? _a2 : null, estado: estado() };
      },
      desfazer: () => {
        aoDesfazer();
        return estado();
      },
      // pista (T-385): { ok, motivo? | tipo, i, l, c, cor, tecnica, regra, frase } + estado · pistas() = saldo
      pista: () => ({ ...aoPista(), estado: estado() }),
      pistas: () => saldoPistas(documento()),
      carregar: (idOuJson) => {
        abrir(idOuJson);
        return estado();
      },
      ids: () => lista.map((o) => o.id),
      // gera e abre: gerar({ variante, n, dificuldade, seed }) · diario('AAAA-MM-DD')
      gerar: (opcoes) => {
        abrir(gerar(opcoes).puzzle);
        return estado();
      },
      diario: (data) => {
        abrir(gerarDiario(data).puzzle);
        return estado();
      },
      // puzzle do dia (T-368): dia('AAAA-MM-DD') abre pela tabela (ou reserva) · hoje() · sequencia() · arquivo()
      // · partilha() = texto · partilhar() = folha/cópia (emite partilha:feita) · resolver() põe a solução toque a toque
      dia: (data = hoje()) => {
        const fonte = abrirDia(data);
        return { ...estado(), fonte };
      },
      hoje,
      sequencia: () => ({ ...sequenciaDe(documento()) }),
      registo: (id = jogo.puzzle.id) => structuredClone((documento().puzzles || {})[id] || null),
      arquivo: () => arquivoDoMes(documento(), hoje().slice(0, 7), hoje(), temItem),
      partilha: () => textoDaPartilha(),
      // pacotes (T-394): pacotes() = estado de cada largo · curado('PAC-ROSSIO-01') abre · trocarPacote/comprarPacote
      // (sem confirmar) · ui() = o que o separador mostra agora
      pacotes: () => estadosPacotes().map(({ quadrados, ...r }) => ({ ...r, quadrados: quadrados.map((q) => q.estado) })),
      curado: (id) => {
        abrir(id);
        return estado();
      },
      trocarPacote: (id) => loja.trocar(id).then((r) => {
        renderPacotes();
        return r;
      }),
      comprarPacote: (id) => comprarPacote({ id }),
      abaPacote: (id) => {
        pacoteAberto = id;
        renderPacotes();
        return ui.pacotesCorpo.textContent;
      },
      // Loja (T-395): ecraLoja.abrir('cosmeticos'|'puzzles'|'pistas') · estado() · trocar(id) sem confirmar ·
      // comprar(id) · usar(id) · restaurar() — cada uma devolve o resultado; estado() é o que o ecrã mostra
      // T-426: praça pequena do quadrado a assentar à vista → { praca, novo, quadrados } ou null
      assentar: () => assentarVisivel(),
      // praça do mês (T-369): praca('AAAA-MM'?) = estado (quadrados resolvido/terra/futuro) · uiPraca(mes?) abre e lê o ecrã
      praca: (mes) => {
        const e = estadoPracaMes(mes);
        return { ...e, quadrados: e.quadrados.map((q) => q.praca) };
      },
      uiPraca: (mes) => {
        var _a2, _b2, _c2, _d, _e, _f, _g, _h, _i, _j, _k, _l;
        if (mes) mesPraca = mes;
        ui.praca.open = true;
        renderPraca();
        return {
          titulo: (_b2 = (_a2 = document.getElementById("praca-titulo")) == null ? void 0 : _a2.textContent) != null ? _b2 : null,
          progresso: (_d = (_c2 = document.getElementById("praca-progresso")) == null ? void 0 : _c2.textContent) != null ? _d : null,
          primeiraColuna: ((_e = ui.pracaCorpo.querySelector(".praca-q")) == null ? void 0 : _e.style.gridColumnStart) || "1",
          quadrados: [...ui.pracaCorpo.querySelectorAll(".praca-q")].map((b) => b.className.split(" ")[1] + (b.disabled ? "(x)" : "")),
          motivo: (_g = (_f = ui.pracaCorpo.querySelector(".praca-motivo")) == null ? void 0 : _f.dataset.motivo) != null ? _g : null,
          motivoNome: (_i = (_h = ui.pracaCorpo.querySelector(".praca-motivo canvas")) == null ? void 0 : _h.getAttribute("aria-label")) != null ? _i : null,
          // T-425: teste de pixels — pixels escuros em cada miniatura resolvida e no motivo (0 = em branco)
          escurosResolvidos: [...ui.pracaCorpo.querySelectorAll(".praca-q.resolvido canvas")].map(pixelsEscuros),
          escurosMotivo: pixelsEscuros(ui.pracaCorpo.querySelector(".praca-motivo canvas")),
          moldura: (_k = (_j = ui.pracaCorpo.querySelector(".praca")) == null ? void 0 : _j.dataset.moldura) != null ? _k : null,
          anterior: !((_l = document.getElementById("btn-praca-anterior")) == null ? void 0 : _l.disabled)
        };
      },
      // tutorial (T-393): tutorial() = { passo, indice, modo, vista, dica } · tutorialIniciar('primeira'|'rever')
      // · tutorialContinuar() (= «Seguinte») · tutorialAjuda() força a ajuda do P3 já · tutorialSair()
      // guia (T-424): { i, cor, mao } persistente na casa-alvo · avisoVermelho: o tabuleiro mostra avisos agora
      tutorial: () => tut ? {
        passo: tut.passo,
        indice: tut.indice,
        modo: tut.modo,
        vista: vistaTutorial(),
        guia: tabuleiro.guia ? { ...tabuleiro.guia } : null,
        avisoVermelho: tabuleiro.avisosVisiveis() && tabuleiro.avisos.celulas.size > 0,
        dica: ui.tutorial.hidden ? null : ui.tutorial.textContent,
        painelInicio: !ui.painel.hidden
      } : { ativo: false, painelInicio: !ui.painel.hidden, concluido: !tutorial.tutorialPorFazer(documento()) },
      tutorialIniciar: (modo) => iniciarTutorial(modo),
      tutorialContinuar: () => {
        continuarTutorial();
        return estado();
      },
      tutorialAjuda: () => {
        if (tut) tut = { ...tut, ultimoToqueMs: -1e9 };
        verAjudaTutorial();
        return estado();
      },
      tutorialSair: () => {
        if (tut && tutorial.podeSair(tut)) terminarTutorial();
        return !tut;
      },
      ecraLoja: {
        abrir: (s) => lojaUI.abrir(s),
        fechar: () => lojaUI.fechar(),
        estado: () => lojaUI.estado(),
        trocar: (id) => lojaUI.trocar(id, { confirmar: false }),
        comprar: (id) => lojaUI.comprar(id),
        usar: (id) => lojaUI.usar(id),
        restaurar: () => lojaUI.restaurar(),
        equipado: () => {
          var _a2;
          return { ...(_a2 = documento().inventario) == null ? void 0 : _a2.equipado };
        }
      },
      uiPacotes: () => {
        var _a2, _b2, _c2, _d;
        return {
          estado: (_b2 = (_a2 = document.getElementById("pacote-estado")) == null ? void 0 : _a2.textContent) != null ? _b2 : null,
          precos: [...ui.pacotesCorpo.querySelectorAll(".pacote-precos button")].map((b) => ({ id: b.id, texto: b.textContent, ativo: !b.disabled })),
          quadrados: [...ui.pacotesCorpo.querySelectorAll(".praca-q")].map((b) => ({ id: b.id, classe: b.className, ativo: !b.disabled })),
          motivo: (_d = (_c2 = ui.pacotesCorpo.querySelector(".praca-motivo")) == null ? void 0 : _c2.className) != null ? _d : null
        };
      },
      partilhar: () => aoPartilhar(),
      // áudio (T-359): estado do módulo e das Definições
      audio: () => ({ pronto: audio.estaPronto(), silenciado: audio.estaSilenciado(), volume: audio.obterVolume(), som: !!definicoesAtuais().som }),
      // Caminho (T-1112): caminho() = { nivel, resolvidos, saltados, … } · caminhoAbrir() abre o nível atual · caminhoSaltar()
      // · caminhoTempo(n, s) simula s segundos no nível n (para Saltar) · caminhoHoje() = { ganhas, teto } · caminhoMenu() = o cartão do Início
      caminho: () => structuredClone(caminho.caminhoDe(documento())),
      caminhoAbrir: () => {
        abrirCaminho();
        return estado();
      },
      caminhoSaltar: () => saltarCaminho().then((r) => ({ ...r, estado: estado() })),
      caminhoTempo: (n, s) => {
        caminhoMs.set(n, s * 1e3);
        renderObjetivo();
        return true;
      },
      caminhoHoje: () => caminho.lascasHoje(documento(), hoje()),
      caminhoMenu: () => ({ texto: ecras.menu.caminhoNome.textContent, sub: ecras.menu.caminhoSub.textContent, visivel: !ecras.menu.caminho.hidden, ativo: !ecras.menu.caminho.disabled }),
      // ecrãs (T-454): ecra() = atual · irEcra(nome) · voltar() = botão Voltar do Android
      ecra: () => ecraAtual,
      irEcra: (n) => {
        ir(n);
        return ecraAtual;
      },
      voltar: () => aoVoltar(),
      resolver: () => {
        const p = jogo.puzzle;
        for (let i = 0; i < p.n * p.n && !jogo.resolvido; i++) {
          for (let k = 0; k < 3 && jogo.grelha[i] !== p.solucao[i]; k++) aoTocar(Math.floor(i / p.n), i % p.n);
        }
        return estado();
      }
    };
  }
  if (meta.textoAviso) {
    avisoArranque = t(meta.textoAviso);
    ui.avisoGravacao.textContent = avisoArranque;
    ui.avisoGravacao.hidden = false;
  }
  document.body.dataset.pronto = "1";
  marcarMenu();
}
arrancar().catch((e) => {
  el.mensagem.textContent = `${t("comum.erro_arranque")} (${e.message})`;
  document.body.dataset.erro = e.message;
  console.error(e);
});
