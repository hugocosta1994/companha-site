import { CONFIG, DIA_LANCAMENTO, EPOCA_TABELA } from "./config.js";
import { t, tn, temTexto, linguaInicial, LANG_HTML } from "./textos.js";
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
import { partilhar, ligarCicloDeVida, plugin, ehNativo } from "./plataforma/nativo.js";
import { criarEcras } from "./jogo/ecras.js";
import { criarFeedbackUI } from "./jogo/feedbackTesterUI.js";
import { criarPortaoDefinicoes } from "./jogo/portaoDefinicoes.js";
import { lerConfig as lerConfigContas } from "./contas/config.js";
import { criarContasUI, carregarContas } from "./jogo/contasUI.js";
import { emitir, ouvir } from "./eventos.js";
import { escrever as gravarDocumento } from "./plataforma/gravacao.js";
import * as audio from "./audio/audio.js";
import { PACOTES, COLUNAS_LARGO, estadoDoPacote, pacoteDoId, idCurado, estadoDoMes, mesVizinho } from "./meta/pacotes.js";
import { concederSazonais, pacotesVisiveis, textoSazonal, trimestreDoPacote, progressoSazonal } from "./meta/sazonal.js";
import { loja, equipar, tipoDe } from "./meta/loja.js";
import { escolherImplementacao, comprar as comprarEur, produtos as produtosEur, restaurar as restaurarCompras, temDireito } from "./plataforma/compras.js";
import { criarPraca, acenderMotivo, desenharMiniatura } from "./jogo/praca.js";
import { mostrarAssentar, fecharAssentar, assentarVisivel } from "./jogo/assentar.js";
import { criarEcraLoja, lojaVisivel } from "./jogo/ecraLoja.js";
import { criarPrevisualizacao } from "./jogo/previsualizacao.js";
import { criarEcraOficio, faixaOficio, corpoColecao } from "./jogo/ecraMetas.js";
import { oficioVista, objetivosVista, colecaoVista } from "./meta/vistaV2.js";
import { definirEquipado } from "./jogo/cosmeticos.js";
import { carregarMotivosMes } from "./jogo/padroes.js";
import * as tutorial from "./nucleo/tutorial.js";
import { criarEcraCalceteiros } from "./jogo/ecraCalceteiros.js";
import { aplicar as agendarLembrete, cancelar as cancelarLembrete } from "./plataforma/lembrete.js";
import * as anuncios from "./plataforma/anuncios.js";
import { elegivel as adElegivel, conceder as adConceder } from "./meta/anunciosJogo.js";
import { criarOferta } from "./jogo/ecraAnuncios.js";
import { criarFeedback } from "./jogo/feedbackFim.js";
import { criarEcraColecao } from "./jogo/ecraColecao.js";
import { colecao as colecaoV3, oQueFalta } from "./nucleo/colecao.js";
import * as retorno from "./meta/retorno.js";
import { cartaoRumo, cartaoAmigo, escolherRumo, fitaRumo } from "./jogo/ecraTutorialV3.js";
import { metaRumo, passoFita, linhaT6 } from "./meta/rumo.js";
import { cartaoRegresso, cartaoSemana, corpoSemana, linhaLembrete } from "./jogo/ecraRetorno.js";
import { dicaPendente, marcarDica } from "./meta/dicas.js";
import { criarEcraQuadro } from "./jogo/ecraQuadro.js";
import { quadroDe } from "./nucleo/quadro.js";
import * as desafio from "./nucleo/desafio.js";
import { atualizarProgresso } from "./nucleo/objetivos.js";
import * as amigos from "./nucleo/amigos.js";
import { dificuldadeConfigurada } from "./nucleo/oficio.js";
import * as caminho from "./meta/caminho.js";
const marca = (n) => {
  try {
    performance.mark("seixo:" + n);
  } catch {
  }
};
marca("modulos");
const params = new URLSearchParams(location.search);
if (params.get("avisos") === "0") CONFIG.AVISOS_LIGADOS = false;
const LINGUA = linguaInicial();
document.documentElement.lang = LANG_HTML[LINGUA] || LINGUA;
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
ui.pacotes.addEventListener("toggle", () => {
  if (ui.pacotes.open) renderPacotes();
});
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
let contasAtual = null;
let infoVersao = null;
const textoVersao = () => infoVersao ? t("versao.texto", { nome: infoVersao.version, build: infoVersao.build }) : "";
{
  const A = plugin("App");
  if (A && typeof A.getInfo === "function") {
    Promise.resolve(A.getInfo()).then((i) => {
      if (i && i.version) {
        infoVersao = { version: String(i.version), build: String(i.build) };
        atualizarVersao();
      }
    }).catch((e) => console.warn("[main] getInfo:", e));
  } else infoVersao = { version: "web", build: "-" };
}
function atualizarVersao() {
  try {
    if (def.versao) def.versao.textContent = textoVersao();
    if (lojaUI.aberta()) lojaUI.render();
  } catch (e) {
  }
}
const lojaUI = criarEcraLoja({
  t,
  tn,
  documento,
  temItem,
  catalogo: () => loja.catalogo(),
  sazonais: () => sazonaisVisiveis(),
  // T-1771
  trocar: (id) => loja.trocar(id),
  equipar: (id) => equipar(id, { catalogo: loja.catalogo() }),
  tipoDe: (id) => tipoDe(loja.catalogo(), id),
  comprar: (id) => comprarEur(id),
  produtos: () => produtosEur(),
  eurVisivel: () => eurVisivel(),
  lascasVenda: () => lascasVenda(),
  // T-1466: aberta só com sessão e progresso sincronizado
  restaurar: () => restaurarCompras(),
  confirmar: (texto) => confirmarDialogo(texto),
  // T-1514
  lascasDiario: CONFIG.LASCAS_DIARIO,
  // GDD §5.2 (só para o texto «faltam»)
  caminho: () => abrirCaminho(),
  caminhoTeto: CONFIG.CAMINHO_TETO_DIA,
  // BS-5
  semAnuncios: () => semAnuncios(),
  versao: () => textoVersao(),
  extraPistas: () => {
    setTimeout(() => ui.ad1.atualizar(), 0);
    return ui.ad1.el;
  },
  // T-1338
  previsualizar: (a) => previsualizacaoUI.abrir(a)
});
const previsualizacaoUI = criarPrevisualizacao({ t, tocarSom: (id) => audio.previsualizarSom(id), silenciado: () => audio.estaSilenciado() });
lojaUI.el.setAttribute("data-sem-inert", "");
previsualizacaoUI.el.setAttribute("data-sem-inert", "");
document.getElementById("app").append(lojaUI.el, previsualizacaoUI.el);
new MutationObserver(() => atualizarNav()).observe(lojaUI.el, { attributes: true, attributeFilter: ["hidden"] });
new MutationObserver(() => atualizarNav()).observe(previsualizacaoUI.el, { attributes: true, attributeFilter: ["hidden"] });
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
def.versao = criar("p", { id: "def-versao", class: "of-suave" }, textoVersao());
def.corpo.append(def.versao);
def.corpo.prepend(def.restaurar);
let contasUI = null;
const neutro = { contas: false, jogo: false };
function fecharNeutro(parte) {
  if (parte) neutro[parte] = true;
  if (parte && !(neutro.contas && neutro.jogo)) return;
  const n = document.getElementById("arranque-neutro");
  if (!n) return;
  const sair = () => {
    n.hidden = true;
  };
  if (!parte) {
    sair();
    return;
  }
  try {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(sair, 400)));
  } catch {
    sair();
  }
}
setTimeout(() => fecharNeutro(), 15e3);
let contasIniciadas = null;
const aguardarContas = new Promise((r) => {
  contasIniciadas = r;
});
(async () => {
  try {
    contasUI = criarContasUI({ app: document.getElementById("app"), contas: await carregarContas() });
    def.corpo.append(contasUI.botao);
    await aguardarContas;
    contasUI.atualizar();
  } catch (e) {
    console.warn("[main] contas indispon\xEDveis:", e);
  }
  fecharNeutro("contas");
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
let origemDef = "menu";
const portaoDef = criarPortaoDefinicoes({
  capturar: () => ui.feedbackTester && ui.feedbackTester.aoAbrirDefinicoes(),
  aoFechar: () => {
    if (ui.feedbackTester) ui.feedbackTester.aoFecharDefinicoes();
  }
});
function ir(nome) {
  if (ecraAtual === "opcoes" && nome !== "opcoes") portaoDef.fechar();
  if (nome === "opcoes") portaoDef.marcarAbertas();
  ecraAtual = nome;
  const camada = ["menu", "pausa", "resultado"].includes(nome) ? nome : nome === "jogo" ? null : "sub";
  ecras.mostrar(camada);
  ecras.sub.marcarAba(camada === "sub" ? nome : "");
  atualizarNav();
  if (nome === "menu") abandonarTutorial();
  if (nome !== "jogo" && nome !== "resultado") fecharAssentar();
  if (EVENTO_ECRA[nome]) emitir("ecra:aberto", { ecra: EVENTO_ECRA[nome] });
  if (nome === "pausa") guardarAMeio();
}
function abrirSub(nome, de = "menu") {
  if (nome === "opcoes" && !["opcoes", "semana", "comojogar"].includes(ecraAtual)) {
    if (portaoDef.interceptar(() => abrirSub(nome, de), () => {
      origemDef = ecraAtual;
    })) return;
  }
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
    renderPacotes();
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
    c.replaceChildren(ui.praca, ui.btnColecao);
    ui.praca.open = true;
    renderPraca();
  } else if (nome === "colecao") {
    ecras.sub.titulo.textContent = t("colecao.titulo");
    c.replaceChildren(ecraColecaoV3.el);
    ecraColecaoV3.abrir();
    emitir("colecao:aberta", { separador: ecraColecaoV3.aba() });
  } else if (nome === "semana") {
    ecras.sub.titulo.textContent = t("resumo.titulo");
    c.replaceChildren(corpoSemana({ t }, documento().semanas));
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
  if (["puzzles", "praca", "opcoes", "comojogar", "semana", "colecao", "oficio", "metas", "calceteiros"].includes(ecraAtual)) {
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
function transicaoIntersticial() {
  if (tut || !jogo || !jogo.resolvido || contouTransicao === jogo.puzzle.id) return;
  contouTransicao = jogo.puzzle.id;
  anuncios.intersticial.tentar({ tutorial: false }).catch(() => {
  });
}
let contouTransicao = null;
function sairParaMenu() {
  if (ecraAtual === "resultado") transicaoIntersticial();
  guardarAMeio();
  abandonarTutorial();
  ir("menu");
  renderDiario();
}
function abandonarTutorial() {
  if (!tut) return;
  tut = null;
  appEl.classList.remove("em-tutorial");
  tabuleiro.definirGuia(null);
  clearInterval(tutRelogio);
  ui.tutorial.hidden = true;
  ui.tutorialSair.hidden = true;
  el.regra.hidden = false;
}
function codigoDesafio() {
  const p = jogo.puzzle, ref = desafio.refDeId(p.id), faixa = desafio.faixaDe(p.dificuldade || "medio");
  if (!ref || !faixa) return null;
  const idLocal = amigos.garantirSocial(documento()).idLocal;
  return desafio.gerarCodigo({ ref, faixa, tempoMs, semPista: !(jogo.pistasUsadas > 0), idLocal });
}
function resultadoDesafio(R) {
  const cod = codigoDesafio();
  R.desafiar.hidden = !cod;
  R.desafio.textContent = "";
  const a = desafioAtivo;
  if (!a || a.id !== jogo.puzzle.id) return;
  if (jogo.pistasUsadas > 0) {
    R.desafio.textContent = t("desafio.com_pistas");
    return;
  }
  if (!(a.tempoS > 0) || !(tempoMs > 0)) return;
  const meu = Math.max(1, Math.round(tempoMs / 1e3)), res = desafio.compararTempos(meu, a.tempoS);
  R.desafio.textContent = `${t(`desafio.${res}`)} \xB7 ${t("desafio.tempos", { dele: formatarTempoS(a.tempoS), meu: formatarTempoS(meu) })}`;
  if (!a.registado) {
    a.registado = true;
    desafio.registarResultado(documento(), { ref: a.ref, de: a.nome, tempoDele: a.tempoS, meuTempo: meu, resultado: res, data: hoje() });
    gravarSocial();
    emitir("desafio:resultado", { ref: a.ref, resultado: res });
  }
}
const formatarTempoS = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function mostrarOfertasResultado(R, cam) {
  if (!R.anuncios) {
    R.anuncios = criar("div", { id: "res-anuncios", class: "res-anuncios" }, ui.ad2.el, ui.ad3.el);
    R.lascas.after(R.anuncios);
  }
  const diario = cam == null && !!dataDoId(jogo.puzzle.id);
  ui.ad2.el.hidden = true;
  ui.ad3.el.hidden = true;
  if (diario) ui.ad2.atualizar();
  else if (cam != null && trocoGanho) ui.ad3.atualizar();
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
  mostrarOfertasResultado(R, cam);
  resultadoDesafio(R);
  R.seguinte.hidden = dataDoId(id) === hoje();
  ir("resultado");
  if (!tut) anuncios.intersticial.preCarregar().catch(() => {
  });
  if (assentarUltimo && assentarUltimo.puzzleId === id) {
    assentarPendente = assentarUltimo;
    mostrarQuadradoAssente();
  }
}
let objetivosCat = [];
const vistaOficio = () => oficioVista(documento());
let puzzleInfo = () => null;
const vistaMetas = () => {
  try {
    atualizarProgresso(documento(), objetivosCat, { hoje: hoje(), infoDe: puzzleInfo });
  } catch (e) {
    console.warn("[main] progresso das metas:", e);
  }
  return objetivosVista(documento(), objetivosCat, hoje());
};
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
  confirmar: (texto) => confirmarDialogo(texto),
  // T-1514
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
let desafioAtivo = null;
const nomeDeIdLocal = (idLocal) => {
  const a = idLocal && amigos.garantirSocial(documento()).amigos.find((x) => x.id === idLocal);
  return a && a.nome || null;
};
const ecraQuadro = criarEcraQuadro({ t, tn }, {
  quadro: () => quadroDe(documento(), puzzleInfo),
  historico: () => Array.isArray(documento().desafios) ? documento().desafios : []
}, {
  ler: (txt) => {
    const r = desafio.lerCodigo(txt);
    if (!r.ok) {
      emitir("desafio:erro", { erro: r.erro });
      return r;
    }
    const id = desafio.idDeRef(r.ref), info = id ? puzzleInfo(id) : null;
    emitir("desafio:recebido", { ref: r.ref });
    return { ...r, id, nome: nomeDeIdLocal(r.idLocal), n: info && info.n || "?" };
  },
  jogar: (c) => {
    const feito = desafio.respondido(documento(), c.ref, c.tempoS);
    try {
      if (!c.id) return "desconhecido";
      const dia = dataDoId(c.id);
      if (dia) {
        if (dia > hoje()) return "desconhecido";
        abrirDia(dia);
      } else if (c.id.startsWith("CAM-") || !puzzleInfo(c.id)) return "desconhecido";
      else abrir(c.id);
    } catch (e) {
      console.warn("[main] desafio:", e);
      return "desconhecido";
    }
    desafioAtivo = { ref: c.ref, id: c.id, nome: c.nome, tempoS: c.tempoS, jaFeito: !!feito };
    return "ok";
  },
  apagar: () => {
    documento().desafios = [];
    gravarSocial();
  },
  colar: async () => navigator.clipboard && navigator.clipboard.readText ? navigator.clipboard.readText() : ""
});
const ecraOficio = criarEcraOficio({ t, tn }, {
  oficio: vistaOficio,
  metas: vistaMetas,
  calceteiros: ecraCalc,
  quadro: ecraQuadro,
  dicas: { pendente: (a) => dicaPendente(documento(), a), vista: (a) => {
    if (marcarDica(documento(), a)) gravarSocial();
  } }
});
let regressoVista = null, resumoNovo = null;
ui.retorno = criar("div", { id: "menu-retorno", class: "mn-retorno" });
ui.regresso = criar("div", { id: "menu-regresso", class: "mn-retorno" });
const emitirTodos = (evs) => {
  for (const [n, d] of evs || []) emitir(n, d);
};
const puzzleSugerivel = (id) => (dataDoId(id) ? tabela.find((x) => x.id === id) : curados.find((x) => x.id === id)) || null;
const rotuloSugerido = (id) => {
  const o = puzzleSugerivel(id);
  return o ? `${t(`dif.${o.dificuldade}`)} ${o.n}x${o.n}` : "";
};
const NIVEL_TEC = { N1: 1, N2: 2, N3: 3 };
function sugerirRegresso(doc) {
  const feito = (id) => ["resolvido", "resolvido_com_pistas"].includes(estadoDe(doc, id));
  const nivelDe = (o) => NIVEL_TEC[o && o.classificacao && o.classificacao.nivelMax] || 1;
  let tecJogador = 1;
  for (const id of Object.keys(doc.puzzles || {})) if (feito(id)) {
    const o = puzzleSugerivel(id);
    if (o) tecJogador = Math.max(tecJogador, nivelDe(o));
  }
  const ligeiro = (o, tam = [5, 6]) => !!o && o.dificuldade === "facil" && tam.includes(o.n) && nivelDe(o) <= tecJogador && !feito(o.id);
  const h = hoje(), porId = new Map(tabela.map((o) => [o.id, o]));
  const limite = h >= DIA_LANCAMENTO ? DIA_LANCAMENTO : EPOCA_TABELA;
  for (let k = 1; k <= 30; k++) {
    const d = somarDias(h, -k);
    if (d < limite) break;
    const o = porId.get(idDoDia(d));
    if (ligeiro(o)) return o.id;
  }
  const ultimoPac = Object.keys(doc.puzzles || {}).map(pacoteDoId).filter(Boolean).pop();
  if (ultimoPac) {
    const c2 = curados.find((o) => o.id.startsWith(ultimoPac.pacote + "-") && ligeiro(o));
    if (c2) return c2.id;
  }
  const c = curados.find((o) => o.id.startsWith("PAC-ROSSIO") && ligeiro(o, [4, 5, 6]));
  return c ? c.id : null;
}
const abrirSugerido = (id) => dataDoId(id) ? abrirDia(dataDoId(id)) : abrir(id);
function iniciarRetorno() {
  try {
    const doc = documento(), h = hoje();
    const r = retorno.avaliarRegresso(doc, h, { sugerir: sugerirRegresso });
    regressoVista = { ...r, puzzleRotulo: r.sugerido ? rotuloSugerido(r.sugerido) : "", nivelOficio: t(`oficio.nivel.${doc.oficio && doc.oficio.nivel || 1}`) };
    emitirTodos(r.eventos);
    const g = retorno.gerarResumoSemanal(doc, h);
    resumoNovo = g.resumo;
    emitirTodos(g.eventos);
    gravarSocial();
    reagendarLembrete().catch((e) => console.warn("[main] lembrete:", e));
  } catch (e) {
    console.warn("[main] retorno:", e);
  }
}
function renderRetorno() {
  const doc = documento(), h = hoje();
  const dispensado = !!regressoVista && retorno.regressoDe(doc).dispensadoEm === h;
  const reg = regressoVista && dispensado ? { ...regressoVista, mostrar: false, aceite: true } : regressoVista;
  const acoesReg = {
    jogar: () => {
      const s = regressoVista.sugerido;
      emitirTodos(retorno.aceitarRegresso(doc, h));
      gravarSocial();
      renderRetorno();
      if (s) abrirSugerido(s);
      else abrirDia(h);
    },
    recomecar: () => {
      emitirTodos(retorno.aceitarRegresso(doc, h));
      gravarSocial();
      renderRetorno();
      abrirDia(h);
      el.mensagem.textContent = t("retorno.recomecar_feito");
    },
    // T-1811: «Nova série. Um dia de cada vez.»
    aquecer: () => {
      emitirTodos(retorno.aceitarRegresso(doc, h));
      gravarSocial();
      renderRetorno();
      abrirCaminho();
    },
    dispensar: () => {
      emitirTodos(retorno.dispensarRegresso(doc, h));
      gravarSocial();
      renderRetorno();
    }
  };
  const cr = cartaoRegresso({ t, tn }, reg, acoesReg), cartaoReg = cr && cr.id === "regresso-cartao" ? cr : null;
  const filhos = [cartaoSemana({ t, tn }, resumoNovo, () => abrirSub("semana"))].filter(Boolean);
  if (cr && !cartaoReg) filhos.unshift(cr);
  const porFazer = tutorial.tutorialPorFazer(doc);
  ui.regresso.replaceChildren(...cartaoReg ? [cartaoReg] : []);
  ui.regresso.hidden = !cartaoReg || porFazer;
  ui.retorno.replaceChildren(...filhos);
  ui.retorno.hidden = !filhos.length || porFazer;
}
const pluginLembrete = () => plugin("LocalNotifications");
const textosLembrete = () => ({ titulo: t("jogo.nome"), texto: t("lembrete.texto") });
async function mudarLembrete(ligado) {
  const doc = documento(), LN = pluginLembrete();
  if (!ligado) {
    emitirTodos(retorno.desligarLembrete(doc, "jogador"));
    gravarSocial();
    await cancelarLembrete(LN);
    return { ligado: false };
  }
  if (!LN) return { ligado: false, textoChave: "lembrete.indisponivel" };
  let ok = false;
  try {
    ok = (await LN.requestPermissions()).display === "granted";
  } catch {
    ok = false;
  }
  const r = retorno.ligarLembrete(doc, retorno.HORA_LEMBRETE, ok);
  emitirTodos(r.eventos);
  gravarSocial();
  if (r.ligado) await agendarLembrete(LN, doc, textosLembrete());
  return { ligado: r.ligado, textoChave: r.ligado ? null : "lembrete.recusado" };
}
async function reagendarLembrete() {
  const doc = documento(), LN = pluginLembrete();
  if (!retorno.lembreteDe(doc).ligado) return;
  const r = retorno.deveDisparar(doc, hoje(), "00:00");
  if (r.eventos.length) {
    emitirTodos(r.eventos);
    gravarSocial();
    if (ui.lembrete) ui.lembrete.atualizar();
    await cancelarLembrete(LN);
    return;
  }
  await agendarLembrete(LN, doc, textosLembrete());
}
{
  const LN = pluginLembrete();
  if (LN && LN.addListener) Promise.resolve(LN.addListener("localNotificationReceived", () => emitir("lembrete:disparado", {}))).catch(() => {
  });
}
ui.lembrete = linhaLembrete({ t }, () => retorno.lembreteDe(documento()), { mudar: mudarLembrete });
ui.minhaSemana = criar("button", { id: "btn-def-semana", type: "button", class: "def-restaurar" }, t("resumo.botao"));
ui.minhaSemana.addEventListener("click", () => abrirSub("semana", "opcoes"));
def.corpo.append(ui.lembrete.el, ui.minhaSemana);
const RE_MOLD_MES_COL = /^MOLD-(\d{4})-(\d{2})$/;
const itemDoCatalogo = (id) => loja.catalogo().find((i) => i.id === id) || (RE_MOLD_MES_COL.test(id || "") ? { id, categoria: "moldura", gratis: false, eur: null, lascas: null, ganha_se: "praca_completa" } : null);
function molduraMesCartoes(doc, eq) {
  var _a;
  const mesHoje = hoje().slice(0, 7);
  const ids = new Set((((_a = doc.inventario) == null ? void 0 : _a.itens) || []).filter((id) => RE_MOLD_MES_COL.test(id)));
  ids.add(`MOLD-${mesHoje}`);
  return [...ids].sort().reverse().map((id) => {
    if (temItem(id)) return { id, categoria: "moldura", estado: Object.values(eq).includes(id) ? "aplicado" : "tens", condicao: null, progresso: null };
    const e = estadoPracaMes(mesHoje);
    return { id, categoria: "moldura", estado: "bloqueado", condicao: { tipo: "praca", chave: "colecao.cond.mold_mes" }, progresso: { atual: e.feitos, alvo: e.total } };
  });
}
const ecraColecaoV3 = criarEcraColecao({ t, tn }, {
  colecao: () => {
    const doc = documento(), eq = doc.inventario && doc.inventario.equipado || {};
    const seps = colecaoV3(loja.catalogo(), {
      doc,
      tem: (id) => temItem(id),
      aplicado: (id) => Object.values(eq).includes(id),
      objetivos: Object.fromEntries(objetivosCat.map((o) => [o.id, o])),
      hoje: hoje(),
      infoDe: puzzleInfo,
      hojeMes: hoje().slice(0, 7)
    });
    const mold = seps.find((s) => s.separador === "moldura");
    if (mold) {
      const extra = molduraMesCartoes(doc, eq);
      mold.cartoes = [...mold.cartoes, ...extra];
      mold.N += extra.length;
      mold.n += extra.filter((c) => c.estado !== "bloqueado").length;
    }
    return seps;
  },
  oQueFalta,
  item: itemDoCatalogo,
  lascasDe: (id) => {
    var _a;
    return (_a = (itemDoCatalogo(id) || {}).lascas) != null ? _a : 0;
  },
  nome: (id) => {
    const m = RE_MOLD_MES_COL.exec(id || "");
    return m ? t("artigo.MOLD-AAAA-MM.nome", { mes: t(`mes.titulo.${Number(m[2])}`), ano: m[1] }) : null;
  },
  legenda: (id) => {
    const m = RE_MOLD_MES_COL.exec(id || "");
    return m ? t(`colecao.mold_mes.${m[2]}`) : null;
  }
}, {
  aplicar: (id) => equipar(id, { catalogo: loja.catalogo() }),
  ver: (item) => previsualizacaoUI.abrir(item),
  aoAbrir: (sep) => emitir("colecao:aberta", { separador: sep })
});
const feedbackFim = criarFeedback({ app: appEl, criar, duracaoMs: CONFIG.FEEDBACK_FIM_MS, reduzir: () => !!(globalThis.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) });
ui.btnColecao = criar("button", { id: "btn-colecao", type: "button", class: "ec-botao sec" }, t("colecao.abrir"));
ui.btnColecao.addEventListener("click", () => abrirSub("colecao", "praca"));
const semAnuncios = () => {
  try {
    return temItem("SEM-ANUNCIOS") || temDireito("sem_anuncios");
  } catch {
    return false;
  }
};
anuncios.configurar({ semAnuncios });
async function concederAnuncio(slot, opcoes) {
  const r = adConceder(documento(), slot, { hoje: hoje(), ...opcoes });
  await gravarSocial();
  emitirTodos(r.eventos);
  return r.ganho;
}
const fabricaOferta = (id, slot, extra) => criarOferta({ t }, {
  id,
  slot,
  semAnuncios,
  elegivel: () => !tut && (!extra.cond || extra.cond()) && adElegivel(documento(), slot, { hoje: hoje(), emTutorial: !!tut || tutorial.tutorialPorFazer(documento()), ...extra.ctx ? extra.ctx() : {} }).ok,
  preparar: () => anuncios.recompensa.preparar(slot),
  mostrar: () => anuncios.recompensa.mostrar(slot),
  ver: extra.ver,
  receber: extra.receber,
  params: extra.params,
  aoGanhar: async () => {
    const g = await concederAnuncio(slot, extra.ctx ? extra.ctx() : {});
    return extra.confirmar(g);
  }
});
ui.ad1 = fabricaOferta("ad-pista", "AD1", { cond: () => saldoPistas(documento()) <= 0, ver: "anuncio.ver_pista", receber: "anuncio.receber_pista", confirmar: () => t("anuncio.ganhou_pista") });
ui.ad2 = fabricaOferta("ad-lascas", "AD2", { ver: "anuncio.ver_lascas", receber: "anuncio.receber_lascas", params: () => ({ n: CONFIG.AD_LASCAS_BONUS }), confirmar: (g) => t("anuncio.ganhou_lascas", { n: g.lascas || 0 }) });
ui.ad3 = fabricaOferta("ad-troco", "AD3", {
  ver: "anuncio.ver_troco",
  receber: "anuncio.receber_troco",
  ctx: () => ({ ref: jogo ? caminho.caminhoDoId(jogo.puzzle.id) : null, extra: trocoGanho ? trocoGanho.troco : 0 }),
  confirmar: (g) => t("anuncio.ganhou_lascas", { n: g.lascas || 0 })
});
ui.privacidade = criar("button", { id: "btn-def-privacidade", type: "button", class: "def-restaurar" }, t("anuncio.privacidade"));
ui.privacidade.hidden = true;
ui.privacidade.addEventListener("click", () => {
  anuncios.abrirPrivacidade().catch((e) => console.warn("[main] privacidade:", e));
});
ui.removerAnuncios = criar("button", { id: "btn-def-sem-anuncios", type: "button", class: "def-restaurar" }, t("anuncio.remover"));
ui.removerAnunciosMsg = criar("p", { id: "def-sem-anuncios-msg", class: "of-suave", role: "status" });
function renderSemAnuncios() {
  ui.removerAnuncios.hidden = semAnuncios();
  ui.privacidade.hidden = !anuncios.opcoesPrivacidade();
  if (semAnuncios()) ui.removerAnunciosMsg.textContent = t("anuncio.removidos");
}
ui.removerAnuncios.addEventListener("click", async () => {
  ui.removerAnuncios.disabled = true;
  let r;
  try {
    r = await comprarEur("SEM-ANUNCIOS");
  } catch {
    r = { resultado: "erro" };
  }
  ui.removerAnunciosMsg.textContent = r.resultado === "erro" ? t("anuncio.remover_erro") : "";
  ui.removerAnuncios.disabled = false;
  renderSemAnuncios();
});
def.corpo.append(ui.privacidade, ui.removerAnuncios, ui.removerAnunciosMsg);
ui.feedbackTester = criarFeedbackUI({ t, criar, lerConfig: () => lerConfigContas(), ecraAtual: () => ecraAtual === "opcoes" ? origemDef : ecraAtual });
def.corpo.append(ui.feedbackTester.botao);
def.painel.addEventListener("toggle", () => {
  if (!def.painel.open) portaoDef.fechar();
});
document.body.append(ui.feedbackTester.dlg);
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
  renderRetorno();
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
  const melhor = regressoVista && regressoVista.nivel >= 1 && seq.recorde > seq.atual ? seq.recorde : 0;
  if (melhor) {
    const m = tn("retorno.melhor_serie", melhor, { n: melhor });
    M.semanaSerie.textContent = seq.atual > 0 ? `${M.semanaSerie.textContent} \xB7 ${m}` : m;
  }
  M.semanaSerie.dataset.melhor = melhor ? String(melhor) : "";
  const vm = !tutObj() && objetivosCat.length ? vistaMetas() : null;
  M.objetivo.hidden = !vm || primeira;
  if (vm) {
    const l1 = vm.longo.find((o) => o.id === "OBJ-L1");
    const porFazer = l1 && !l1.feito ? l1 : [...vm.hoje, ...vm.semana || []].find((o) => !o.feito) || null;
    const fita = fitaRumo({ t, temTexto }, {
      id: "menu-fita",
      objetivo: porFazer ? t("tutorial3.fita_hoje", { objetivo: t(porFazer.texto) }) : t("tutorial3.fita_hoje_feito"),
      meta: metaRumo(longasRumo(vm.longo)),
      navegavel: true,
      abrir: () => abrirSub("metas")
    });
    M.objetivo.replaceChildren(fita.el);
    M.objetivo.classList.toggle("feito", !porFazer);
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
  const visivel = previsualizacaoUI.el.hidden && (nivel1 || lojaAberta && ["menu", "puzzles", "praca", "calceteiros", "oficio", "metas"].includes(ecraAtual)) && !tutorial.tutorialPorFazer(documento());
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
  desafiar: () => {
    const cod = jogo && jogo.resolvido ? codigoDesafio() : null;
    if (!cod) return;
    emitir("desafio:codigo", { ref: desafio.refDeId(jogo.puzzle.id) });
    partilhar(t("desafio.codigo_teu", { codigo: cod }), { id: "desafio-codigo" }).catch((e) => console.warn("[main] partilha falhou:", e));
  },
  seguinte: () => el.seguinte.click(),
  sair: sairParaMenu,
  voltar
} });
ecras.menu.cartao.before(ui.regresso);
ecras.menu.cartao.after(ui.retorno);
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
const DADOS_ARRANQUE = [
  "data/puzzles.json",
  "data/diarios.json",
  "data/curados.json",
  "data/sazonais.json",
  "data/objetivos.json",
  "data/caminho.json",
  "data/caminho-reserva.json"
];
const pedidos = /* @__PURE__ */ new Map();
function buscar(url) {
  const p = pedidos.get(url);
  if (p) {
    pedidos.delete(url);
    return p;
  }
  return fetch(url);
}
function pedirDadosArranque() {
  for (const u of DADOS_ARRANQUE) if (!pedidos.has(u)) {
    const p = fetch(u);
    p.catch(() => {
    });
    pedidos.set(u, p);
  }
}
const validacoesAdiadas = [];
function validarAdiados() {
  for (const doc of validacoesAdiadas.splice(0)) {
    const ok = new Set(carregarLista(doc).puzzles.map((p) => p.id));
    const maus = new Set(doc.puzzles.filter((o) => !ok.has(o && o.id)).map((o) => o && o.id));
    if (maus.size) {
      curados = curados.filter((o) => !maus.has(o.id));
      renderPacotes();
    }
  }
}
async function lerPuzzles(url, adiar = false) {
  const r = await buscar(url);
  if (!r.ok) throw new Error(`n\xE3o consegui ler ${url}: ${r.status}`);
  const doc = await r.json();
  if (adiar && Array.isArray(doc.puzzles)) {
    validacoesAdiadas.push(doc);
    return doc.puzzles.filter((o) => o && typeof o.id === "string" && typeof o.dadas === "string" && typeof o.solucao === "string");
  }
  const { puzzles } = carregarLista(doc);
  const validos = new Set(puzzles.map((p) => p.id));
  return doc.puzzles.filter((o) => validos.has(o.id));
}
function abrir(fonte, { novo = false } = {}) {
  guardarAMeio();
  if (tut && !(typeof fonte === "string" && fonte === tutorial.puzzleAtual(tut))) abandonarTutorial();
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
  if (pc) return `${nomePacote(pc.pacote)} \xB7 ${pc.indice} \xB7 ${t(`dif.${p.dificuldade || "medio"}`)}`;
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
      titulo: nomePacote(e.id),
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
let trimestresSaz = /* @__PURE__ */ new Set();
const nomePacote = (id) => {
  var _a;
  return (_a = textoSazonal(t, id, "nome")) != null ? _a : t(`artigo.${id}.nome`);
};
const sazonaisVisiveis = () => {
  var _a;
  return pacotesVisiveis(hoje(), trimestresSaz, CONFIG.SAZ_PRIMEIRO, ((_a = documento().inventario) == null ? void 0 : _a.itens) || []);
};
function concederSaz() {
  const doc = documento();
  const r = concederSazonais(doc, (q) => trimestresSaz.has(q));
  if (!r.mudou) return r;
  import("./plataforma/gravacao.js").then((g) => g.gravarJa(doc)).catch((e) => console.warn("[main] sazonal n\xE3o gravou:", e));
  for (const [n, d] of r.eventos) emitir(n, d);
  return r;
}
function estadosPacotes() {
  const doc = documento();
  const puzzles = curadoPorId();
  const ids = [...PACOTES.map((p) => p.id), ...sazonaisVisiveis()];
  const catalogo = ids.map((id) => loja.artigo(id)).filter(Boolean);
  return ids.map((id) => estadoDoPacote(doc, id, { temItem, catalogo, puzzles }));
}
function eurVisivel() {
  var _a;
  try {
    return escolherImplementacao(((_a = globalThis.location) == null ? void 0 : _a.search) || "", ehNativo()) !== "indisponivel";
  } catch {
    return true;
  }
}
function lascasVenda() {
  try {
    const e = contasAtual && contasAtual.estado ? contasAtual.estado() : null;
    if (!e || !e.sessao) return "fechada";
    if (e.sync === "a_sincronizar") return "a_sincronizar";
    return e.sync === "ok" && !e.conflito ? "aberta" : "fechada";
  } catch {
    return "fechada";
  }
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
  const artigo = nomePacote(est.id);
  if (!await confirmarDialogo(t("loja.confirmar_lascas", { preco: est.preco.lascas, artigo }))) return { resultado: "cancelada" };
  const r = await loja.trocar(est.id);
  if (r.resultado === "concluida" || r.resultado === "ja_tem") el.mensagem.textContent = t("loja.comprado", { artigo });
  else if (r.resultado === "saldo_insuficiente") el.mensagem.textContent = t("caminho.loja_faltam", { n: r.faltam, teto: CONFIG.CAMINHO_TETO_DIA });
  else el.mensagem.textContent = t("loja.erro");
  renderPacotes();
  return r;
}
async function comprarPacote(est) {
  var _a;
  const artigo = nomePacote(est.id);
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
function renderPacotes(forcar = false) {
  var _a, _b;
  if (!ui.pacotesCorpo) return;
  if (!forcar && !ui.pacotes.open) {
    ui.pacotesCorpo.replaceChildren();
    return;
  }
  const estados = estadosPacotes();
  const abas = criar("div", { class: "pacotes-abas", role: "tablist" }, ...estados.map((e2) => {
    const b = criar("button", {
      id: `btn-pac-${e2.id}`,
      type: "button",
      role: "tab",
      class: "pacote-aba",
      "aria-selected": String(e2.id === pacoteAberto)
    }, nomePacote(e2.id));
    b.addEventListener("click", () => {
      pacoteAberto = e2.id;
      renderPacotes();
    });
    return b;
  }));
  const leftAnt = ((_a = ui.pacotesCorpo.querySelector(".pacotes-abas")) == null ? void 0 : _a.scrollLeft) || 0;
  requestAnimationFrame(() => {
    const sel = abas.querySelector('[aria-selected="true"]');
    abas.scrollLeft = leftAnt;
    if (sel && (sel.offsetLeft < abas.scrollLeft || sel.offsetLeft + sel.offsetWidth > abas.scrollLeft + abas.clientWidth)) abas.scrollLeft = Math.max(0, sel.offsetLeft - 16);
  });
  const e = estados.find((x) => x.id === pacoteAberto) || estados[0];
  const saz = trimestreDoPacote(e.id);
  const pSaz = saz && !e.desbloqueado ? progressoSazonal(((_b = documento().inventario) == null ? void 0 : _b.itens) || [], saz) : null;
  const estadoTxt = pSaz ? `${t("colecao.cond.pac_saz")} ${t("colecao.progresso", { atual: pSaz.feito, alvo: pSaz.alvo })}` : !e.desbloqueado ? t("arquivo.pacote_bloqueado") : `${e.gratis ? t("arquivo.pacote_gratis") + " \xB7 " : ""}${t("praca.progresso_largo", { feitos: e.feitos, total: e.total })}`;
  const cab = criar("p", { class: "pacote-estado", id: "pacote-estado" }, estadoTxt);
  const nome = nomePacote(e.id);
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
    if (e.preco.eur != null && eurVisivel()) {
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
    nomePacote: (id) => nomePacote(id)
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
    const antes = tut;
    tut = tutorial.aoTocar(tut, jogo.puzzle, jogo.grelha, r.i, performance.now());
    emitirPasso3(antes, tut);
  }
  depoisDeMudar();
  renderTutorial();
  return r;
}
function confirmarDialogo(texto) {
  return new Promise((resolve) => {
    const fundo = criar("div", { class: "dialogo-fundo", role: "alertdialog", "aria-modal": "true", "aria-label": texto });
    fundo.style.cssText = "position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:16px";
    const caixa = criar("div", { class: "dialogo-caixa" });
    caixa.style.cssText = "max-width:360px;width:100%;background:var(--fundo,#fff);color:var(--texto,#222);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:16px;box-shadow:0 8px 32px rgba(0,0,0,.4)";
    const p = criar("p", { class: "dialogo-texto" }, texto);
    const linha = criar("div", { class: "dialogo-botoes" });
    linha.style.cssText = "display:flex;gap:12px;justify-content:flex-end";
    const nao = criar("button", { type: "button", class: "sec dialogo-cancelar" }, t("comum.cancelar"));
    const sim = criar("button", { type: "button", class: "dialogo-ok" }, t("comum.ok"));
    const fim = (v) => {
      document.removeEventListener("keydown", tecla, true);
      fundo.remove();
      resolve(v);
    };
    const tecla = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        fim(false);
      }
    };
    nao.addEventListener("click", () => fim(false));
    sim.addEventListener("click", () => fim(true));
    document.addEventListener("keydown", tecla, true);
    linha.append(nao, sim);
    caixa.append(p, linha);
    fundo.append(caixa);
    document.body.append(fundo);
    nao.focus();
  });
}
function dialogoSaltarTutorial() {
  return dialogoFolha({ titulo: t("tutorial.saltar") + "?", corpo: t("tutorial.saltar_confirmar"), prim: t("tutorial.saltar_manter"), sec: t("tutorial.saltar_sim"), primFalso: true });
}
function dialogoReverTutorial() {
  return dialogoFolha({ titulo: t("tutorial.rever_titulo"), corpo: t("tutorial.rever_corpo"), prim: t("tutorial.rever_sim"), sec: t("tutorial.rever_nao"), primFalso: false });
}
function dialogoFolha({ titulo, corpo: texto, prim: tPrim, sec: tSec, primFalso }) {
  return new Promise((resolve) => {
    const fundo = criar("div", { class: "folha-fundo" });
    const folha = criar("div", { class: "folha", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "folha-titulo", "aria-describedby": "folha-corpo" });
    const tit = criar("h2", { id: "folha-titulo", class: "folha-titulo" }, titulo);
    const corpo = criar("p", { id: "folha-corpo", class: "folha-corpo" }, texto);
    const prim = criar("button", { type: "button", class: "folha-btn-prim" }, tPrim);
    const sec = criar("button", { type: "button", class: "folha-btn-sec" }, tSec);
    const fim = (v) => {
      document.removeEventListener("keydown", tecla, true);
      fundo.remove();
      resolve(v);
    };
    const tecla = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        fim(false);
      } else if (e.key === "Tab") {
        e.preventDefault();
        (document.activeElement === prim ? sec : prim).focus();
      }
    };
    fundo.addEventListener("click", (e) => {
      if (e.target === fundo) fim(false);
    });
    prim.addEventListener("click", () => fim(!primFalso));
    sec.addEventListener("click", () => fim(primFalso));
    document.addEventListener("keydown", tecla, true);
    folha.append(tit, corpo, prim, sec);
    fundo.append(folha);
    document.body.append(fundo);
    prim.focus();
  });
}
let tut = null;
let tutRelogio = null;
ui.tutorial = criar("p", { id: "tutorial-dica", class: "tutorial-dica", role: "status", "aria-live": "polite", hidden: true });
ui.tutorialSair = criar("button", { id: "btn-tutorial-sair", type: "button", hidden: true }, t("comum.voltar"));
el.regra.before(ui.tutorial);
ui.fitaTut = criar("div", { id: "fita-tut", class: "fita-caixa", hidden: true });
ui.tutorial.before(ui.fitaTut);
let tutT0 = 0, tutPassoId = null, tutMetaAntes = null, tutTempoP3 = 0, tutP3Em = 0, tutFita = null;
const longasRumo = (longo) => {
  const l = longo.filter((o) => o.id !== "OBJ-L1");
  const v3 = l.filter((o) => temTexto(`${o.texto}_curto`));
  return v3.length ? v3 : l;
};
const metaDoRumo = () => objetivosCat.length ? metaRumo(longasRumo(vistaMetas().longo)) : null;
function renderFitaTut() {
  const pf = tut && tut.modo === "primeira" ? passoFita(tut) : null;
  ui.fitaTut.hidden = !pf;
  if (!pf) {
    ui.fitaTut.replaceChildren();
    tutFita = null;
    return;
  }
  const meta = metaDoRumo();
  if (pf.id === "T5" && tutMetaAntes === null) {
    tutMetaAntes = meta ? { id: meta.id, atual: meta.atual } : { id: null, atual: 0 };
    tutP3Em = performance.now();
  }
  tutFita = fitaRumo({ t, temTexto }, { id: "fita-tut-rumo", passo: pf.id === "T6" ? null : pf.i, objetivo: t(pf.objetivo), meta });
  ui.fitaTut.replaceChildren(tutFita.el);
  const novo = pf.id !== tutPassoId;
  if (novo) {
    tutPassoId = pf.id;
    emitir("cartao_tutorial:passo", { id: pf.id, ms: Math.round(performance.now() - tutT0) });
  }
  if (pf.id === "T6") {
    const semPista = !(jogo && jogo.pistasUsadas > 0);
    const subiu = !!meta && !!tutMetaAntes && meta.id === tutMetaAntes.id && meta.atual > tutMetaAntes.atual;
    ui.tutorial.textContent = t(linhaT6({ semPista, subiu }));
    ui.tutorial.hidden = false;
    if (novo && subiu) tutFita.pulsar();
  }
}
ui.avisoGravacao = criar("p", { id: "aviso-gravacao", class: "aviso-gravacao", role: "alert", hidden: true });
ui.avisoGravacao.addEventListener("click", () => {
  ui.avisoGravacao.hidden = true;
});
el.regra.before(ui.avisoGravacao);
el.recomecar.after(ui.tutorialSair);
ui.tutorialSair.addEventListener("click", async () => {
  if (tut && tut.modo === "primeira") {
    if (!await dialogoSaltarTutorial()) return;
    const r = tutorial.saltar(documento(), hoje());
    try {
      await gravarDocumento(documento());
    } catch (e) {
      console.warn("[main] saltar tutorial n\xE3o gravou:", e);
    }
    for (const [n, d] of r.eventos) emitir(n, d);
    const TC = tutorial.saltarParaCartoes(tut, performance.now());
    terminarTutorial();
    mostrarCartoesV3(false, TC);
    return;
  }
  terminarTutorial();
});
def.rever = criar("button", { id: "btn-def-tutorial", type: "button", class: "def-restaurar" }, t("definicoes.rever_tutorial"));
def.rever.addEventListener("click", async () => {
  if (!await dialogoReverTutorial()) return;
  def.painel.open = false;
  iniciarTutorial("rever");
});
def.corpo.append(def.rever);
function iniciarTutorial(modo = "primeira") {
  appEl.classList.add("em-tutorial");
  tut = tutorial.criarTutorial(documento(), { modo, agoraMs: performance.now() });
  tutT0 = performance.now();
  tutPassoId = null;
  tutMetaAntes = null;
  tutTempoP3 = 0;
  tutP3Em = 0;
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
  ui.fitaTut.hidden = true;
  ui.fitaTut.replaceChildren();
  el.regra.hidden = false;
  abrirDia(hoje());
  ir("menu");
}
function emitirPasso3(antes, depois) {
  if (!antes || !depois || antes.passo3 === depois.passo3 || !antes.passo3) return depois;
  const agora = performance.now();
  const [n, d] = tutorial.passoEvento(antes, agora);
  emitir(n, d);
  depois.passoMs = agora;
  return depois;
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
  renderFitaTut();
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
  if (tut && tut.indice === 2 && tutP3Em) tutTempoP3 = performance.now() - tutP3Em;
  const antes = tut, agora = performance.now();
  const r = tutorial.aoResolver(tut, documento(), hoje(), { pistasIniciais: CONFIG.PISTAS_INICIAIS, semPista: !(jogo && jogo.pistasUsadas > 0), agoraMs: agora });
  if (antes.indice === 2) {
    const [n, d] = tutorial.passoEvento(antes, agora);
    emitir(n, d);
  } else if (r.T.passo === "resultado") {
    const [n, d] = tutorial.passoEvento(antes, agora);
    emitir(n, d);
  }
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
ui.tut3 = criar("section", { id: "ecra-tutorial3", class: "ecra tutorial-cartoes", hidden: true, "aria-label": t("tutorial3.rumo_titulo") });
appEl.append(ui.tut3);
let tut3Em = 0;
const tut3Fechar = (cartao, ms) => emitir("cartao_tutorial:visto", { cartao, ms: Math.round(ms) });
function mostrarCartoesV3(migracao, TC = null) {
  const doc = documento(), t0 = performance.now();
  const avancar = () => {
    if (!TC) return;
    const r = tutorial.avancarCartoes(TC, performance.now());
    TC = r.T;
    for (const [n, d] of r.eventos) emitir(n, d);
  };
  doc.tutorialV3Visto = true;
  gravarSocial();
  if (migracao) emitir("cartao_tutorial:migracao", {});
  const fim = () => {
    ui.tut3.hidden = true;
    ui.tut3.replaceChildren();
    emitir("cartao_tutorial:fim", { total_ms: Math.round(performance.now() - t0) });
    ir("menu");
    abrirDia(hoje());
  };
  const B = () => {
    avancar();
    tut3Em = performance.now();
    const s = Math.ceil(tutTempoP3 / 1e3), tempo = !migracao && s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null;
    ui.tut3.replaceChildren(cartaoAmigo({ t }, {
      ir: () => {
        tut3Fechar("B", performance.now() - tut3Em);
        avancar();
        fim();
      },
      saltar: () => {
        emitir("cartao_tutorial:saltado", { cartao: "B" });
        tut3Fechar("B", performance.now() - tut3Em);
        avancar();
        fim();
      }
    }, { tempo }));
  };
  const lv = vistaMetas().longo, rumo = escolherRumo([...lv.filter((o) => o.id === "OBJ-L1"), ...longasRumo(lv)]);
  if (TC && TC.passo3 === "T6") avancar();
  else if (TC) TC = { ...TC, passoMs: performance.now() };
  tut3Em = performance.now();
  ui.tut3.hidden = false;
  ui.tut3.replaceChildren(cartaoRumo({ t }, rumo, { seguinte: () => {
    tut3Fechar("A", performance.now() - tut3Em);
    B();
  } }));
}
function continuarTutorial() {
  tut = tutorial.continuar(tut, performance.now());
  if (tut.passo === "saiu") {
    const primeira = tut.modo === "primeira", TC = tut;
    terminarTutorial();
    if (primeira) mostrarCartoesV3(false, TC);
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
  if (tut && jogo.puzzle.id === tutorial.puzzleAtual(tut)) {
    continuarTutorial();
    return;
  }
  transicaoIntersticial();
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
  if (nome === "puzzle:pedra" && !tut) retorno.marcarAberto(documento(), hoje());
  if (nome === "puzzle:resolvido" && !tut) feedbackFim.disparar("puzzle");
  if (nome === "meta:cumprida" && dados) {
    const o = objetivosCat.find((x) => x.id === dados.id);
    feedbackFim.disparar("meta", o && o.texto_id ? t(o.texto_id) : t("feedback.meta"));
  }
  if (nome === "app:retoma") reagendarLembrete().catch((e) => console.warn("[main] lembrete:", e));
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
  if (["compras:direitos", "compras:restauro", "compras:compra", "item:obtido", "item:perdido"].includes(nome)) renderSemAnuncios();
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
    queueMicrotask(() => {
      try {
        concederSaz();
      } catch (e) {
        console.warn("[main] sazonal:", e);
      }
    });
    mesPraca = dados.praca;
    renderPraca();
    acenderMotivo(ui.pracaCorpo.querySelector(".praca"));
    el.mensagem.textContent = t("resultado.praca_completa", { mes: t(`mes.${Number(dados.praca.slice(5))}`), lascas: dados.lascas });
  }
  if (nome === "praca:completa" && dados && pacoteDoId(`${dados.praca}-01`)) {
    pacoteAberto = dados.praca;
    renderPacotes();
    acenderMotivo(ui.pacotesCorpo.querySelector(".praca"));
    el.mensagem.textContent = t("resultado.largo_completo", { pacote: nomePacote(dados.praca) });
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
    const r = await buscar(url);
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
  pedirDadosArranque();
  ligarCicloDeVida();
  try {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    audio.definirMovimentoReduzido(!!mq.matches);
    if (mq.addEventListener) mq.addEventListener("change", (e) => audio.definirMovimentoReduzido(!!e.matches));
  } catch (e) {
  }
  try {
    audio.ligar();
    audio.ligarGesto();
  } catch (e) {
    console.warn("[main] \xE1udio n\xE3o ligou:", e);
  }
  lista = await lerPuzzles("data/puzzles.json");
  for (const o of lista) el.escolha.add(new Option(o.id, o.id));
  tabela = await lerTabela("data/diarios.json");
  curados = await lerPuzzles("data/curados.json", true).catch((e) => {
    console.warn("[main] curados indispon\xEDveis:", e);
    return [];
  });
  const saz = await lerPuzzles("data/sazonais.json", true).catch((e) => {
    console.warn("[main] sazonais indispon\xEDveis:", e);
    return [];
  });
  trimestresSaz = new Set(saz.map((o) => {
    var _a2, _b2;
    return (_b2 = (_a2 = o.origem) == null ? void 0 : _a2.pacote) == null ? void 0 : _b2.slice(8);
  }).filter(Boolean));
  curados = [...curados, ...saz];
  objetivosCat = await buscar("data/objetivos.json").then((r) => r.json()).then((d) => d.objetivos || []).catch((e) => {
    console.warn("[main] objetivos indispon\xEDveis:", e);
    return [];
  });
  const porId = new Map([...lista, ...curados, ...tabela].map((o) => [o.id, o]));
  const [camTabela, camReserva] = await Promise.all(["data/caminho.json", "data/caminho-reserva.json"].map((u) => buscar(u).then((r) => r.json()).catch((e) => {
    console.warn(`[main] ${u} indispon\xEDvel:`, e);
    return null;
  })));
  if (camTabela) caminho.configurarCaminho({ tabela: camTabela, reserva: camReserva });
  marca("dados");
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
  puzzleInfo = puzzlePorId;
  const meta = await iniciarMeta({ puzzlePorId, catalogoObjetivos: () => objetivosCat, jogoAtual: () => jogo ? estadoParaGravar(jogo) : null }).catch((e) => {
    console.warn("[main] meta n\xE3o arrancou:", e);
    return {};
  });
  marca("meta");
  carregarContas().then((c) => {
    contasAtual = c;
    return ligarProgressoConta({
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
    });
  }).catch((e) => console.warn("[main] progresso/contas:", e)).finally(() => contasIniciadas());
  aplicarDefinicoes();
  definirEquipado((_a = documento().inventario) == null ? void 0 : _a.equipado);
  audio.definirSom((_c = (_b = documento().inventario) == null ? void 0 : _b.equipado) == null ? void 0 : _c.som);
  renderOficio();
  try {
    concederSaz();
  } catch (e) {
    console.warn("[main] sazonal:", e);
  }
  painelPronto = true;
  marca("painel");
  iniciarRetorno();
  renderSemAnuncios();
  ouvir((nome) => {
    if (nome === "consentimento:mudou") ui.privacidade.hidden = !anuncios.opcoesPrivacidade();
  });
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
  marca("aberto");
  if (params.get("tutorial") !== "0" && !tut && !tutorial.tutorialPorFazer(documento()) && !documento().tutorialV3Visto && !params.get("p") && !params.get("data") && !params.get("seed") && !params.get("dia")) mostrarCartoesV3(true);
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
      // pacote sazonal (T-1771): sazonais() = { visiveis, comDados } · concederSazonais([MOLD-AAAA-MM…]) junta as molduras
      // dadas ao inventário (só debug) e corre a concessão → eventos
      sazonais: () => ({ visiveis: sazonaisVisiveis(), comDados: [...trimestresSaz].sort() }),
      concederSazonais: (molduras = []) => {
        const inv = documento().inventario;
        for (const id of molduras) if (!inv.itens.includes(id)) inv.itens.push(id);
        const r = concederSaz();
        renderPacotes();
        return r.eventos;
      },
      trocarPacote: (id) => loja.trocar(id).then((r) => {
        renderPacotes();
        return r;
      }),
      comprarPacote: (id) => comprarPacote({ id }),
      abaPacote: (id) => {
        pacoteAberto = id;
        renderPacotes(true);
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
      tutorialCartoes: () => {
        mostrarCartoesV3(false);
        return !ui.tut3.hidden;
      },
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
        return renderPacotes(true), {
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
  marca("pronto");
  marcarMenu();
  setTimeout(() => {
    try {
      validarAdiados();
    } catch (e) {
      console.warn("[main] valida\xE7\xE3o dos curados:", e);
    }
  }, 0);
  setTimeout(() => {
    carregarMotivosMes().then((n) => {
      if (n) {
        renderPacotes();
        renderPraca();
        if (lojaUI.aberta()) lojaUI.render();
      }
    }).catch(() => {
    });
  }, 1500);
}
arrancar().then(() => fecharNeutro("jogo")).catch((e) => {
  fecharNeutro();
  el.mensagem.textContent = `${t("comum.erro_arranque")} (${e.message})`;
  document.body.dataset.erro = e.message;
  console.error(e);
});
