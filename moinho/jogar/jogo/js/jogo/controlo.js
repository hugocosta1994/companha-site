import { t } from "../textos.js";
import { emitir, ouvir } from "../eventos.js";
import { MOINHO, NIVEIS, VIBRACAO_MS } from "../config.js";
import { fase, destinos, removiveis, jogar, remover, noTabuleiro, totalPecas, outro } from "../nucleo/regras.js";
import { novaPartida, jogarCompleta, desfazer, reconstruir } from "../nucleo/partida.js";
import { mulberry32 } from "../nucleo/prng.js";
import { aquecerIA, escolherJogadaAsync } from "../nucleo/ia-async.js";
import { criarTabuleiro, desenhar, marcarMoinho, limparMoinho, iconePeca, pos, formaPeca, ns } from "./vista.js";
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
function el(tag, cls, txt) {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  if (txt !== void 0) x.textContent = txt;
  return x;
}
function iniciarPartida(raiz, cfg, ganchos) {
  const opcoes = () => ganchos.opcoes();
  let p = cfg.historico ? reconstruir(cfg, cfg.historico) : novaPartida(cfg);
  let vista = null;
  let sel = null;
  let bloqueado = false;
  let pausado = false;
  let aguardaRemocao = null;
  let vivo = true;
  let pausaPromessa = null, retomaFn = null;
  const humano = (j) => cfg.modo === "2j" || j === cfg.cor;
  raiz.replaceChildren();
  const topo = el("div", "topo");
  const bPausa = el("button", "pausa", "II");
  bPausa.setAttribute("aria-label", t("e3.pausa"));
  const estadoTxt = el("div", "estado");
  topo.append(bPausa, estadoTxt);
  {
    const av = cfg.avatar && cfg.avatar();
    if (av) topo.append(av);
  }
  const cima = faixa(cfg.modo === "2j" ? 2 : outro(cfg.cor), true);
  const baixo = faixa(cfg.modo === "2j" ? 1 : cfg.cor, false);
  const meio = el("div", "meio");
  const tab = criarTabuleiro({ aoPonto: tocar });
  tab.svg.setAttribute("aria-label", t("titulo"));
  meio.append(tab.svg);
  const obj = el("div", "objetivo", t("mo.tut.objetivo"));
  const faixaMP = cfg.modo === "mp" ? el("div", "faixa-mp") : null;
  if (faixaMP) {
    const h = el("h2", "mp-titulo", cfg.titulo || "");
    faixaMP.append(h, el("p", "mp-cor", cfg.corTexto || ""), el("p", "mp-espera"));
    raiz.append(topo, faixaMP, obj, cima.el, meio, baixo.el);
  } else raiz.append(topo, obj, cima.el, meio, baixo.el);
  raiz.classList.toggle("sem-destaques", !opcoes().destaques);
  function faixa(jogador, emCima) {
    const f = el("div", `faixa ${emCima ? "cima" : "baixo"}`);
    if (emCima && cfg.modo === "2j") f.classList.add("espelhada");
    const por = el("div", "grupo-c");
    por.setAttribute("aria-label", t("e3.por_colocar"));
    por.append(iconePeca(jogador));
    const nPor = el("span");
    por.append(nPor);
    const tir = el("div", "grupo-c");
    tir.setAttribute("aria-label", t("e3.tiradas"));
    tir.append(iconePeca(outro(jogador), true));
    const nTir = el("span");
    tir.append(nTir);
    f.append(por, tir);
    let desf = null;
    if (cfg.modo === "2j") {
      desf = el("button", "desfazer", t("e3.desfazer"));
      desf.addEventListener("click", desfazerJogada);
      f.append(desf);
    }
    return { el: f, jogador, nPor, nTir, desf, tir };
  }
  bPausa.addEventListener("click", () => emitir("app:pausa"));
  function aoPausa() {
    if (!vivo || pausado) return;
    pausado = true;
    pausaPromessa = new Promise((r) => {
      retomaFn = r;
    });
    ganchos.guardar(p);
    ganchos.aoPausar(() => {
      pausado = false;
      retomaFn();
      emitir("app:retoma");
    });
  }
  const offPausa = ouvir("app:pausa", aoPausa);
  async function livre() {
    while (pausado && vivo) await pausaPromessa;
    return vivo;
  }
  async function espera(ms) {
    await dormir(ms);
    return livre();
  }
  function estadoVisivel() {
    return vista || p.estado;
  }
  function pintar(extra = {}) {
    const e = estadoVisivel();
    const dest = sel !== null ? destinos(e, sel) : !e.remover && !e.fim && !bloqueado && humano(e.vez) && fase(e) === "colocar" ? destinos(e) : [];
    desenhar(tab, e.celas, { destinos: dest, selecionado: sel, daltonico: opcoes().daltonico, ...extra });
    for (const f2 of [cima, baixo]) {
      f2.nPor.textContent = e.porColocar[f2.jogador];
      const tiradas = 9 - totalPecas(e, outro(f2.jogador));
      if (f2.nTir.textContent !== String(tiradas)) {
        f2.nTir.textContent = tiradas;
        f2.tir.classList.remove("pulso");
        void f2.tir.offsetWidth;
        if (tiradas) f2.tir.classList.add("pulso");
      }
      f2.el.classList.toggle("ativa", !e.fim && e.vez === f2.jogador);
      if (f2.desf) f2.desf.hidden = !(p.historico.length && quemJogouPorUltimo() === f2.jogador);
      if (f2.desf) f2.desf.disabled = bloqueado || !!e.fim;
    }
    const f = fase(e);
    const fp = cfg.modo === "2j" || cfg.cor === void 0 ? f : fase(e, cfg.cor);
    obj.textContent = e.fim ? t("mo.tut.objetivo") : `${t("mo.tut.objetivo")} ${t("mo.fase." + fp)}.`;
    obj.dataset.fase = fp;
    if (faixaMP) {
      const w = faixaMP.querySelector(".mp-espera");
      w.textContent = e.fim ? "" : humano(e.vez) ? t("tab.async.e12.tua_vez") : t("tab.async.e12.espera");
      w.dataset.estado = e.fim ? "fim" : humano(e.vez) ? "minha" : "espera";
    }
    estadoTxt.textContent = e.fim ? "" : cfg.modo === "2j" ? t(`e3.fase.${f === "colocar" ? "colocar" : f === "voar" ? "voar" : "mover"}`) : `${t(humano(e.vez) ? "e3.vez.tua" : "e3.vez.adversario")} \xB7 ${t(`e3.fase.${f}`)}`;
    if (window.TABULEIRO_DEBUG) window.TABULEIRO_DEBUG.partida = { estado: e, historico: p.historico, bloqueado, sel };
  }
  function quemJogouPorUltimo() {
    return p.historico.length ? outro(p.estado.vez) : null;
  }
  function recusar(ponto) {
    emitir("jogada:recusada", { ponto });
  }
  let inicioToque = null;
  function tocar(ponto, acao) {
    if (!vivo || pausado) return;
    if (acao === "down") {
      inicioToque = ponto;
      return;
    }
    const de = inicioToque;
    inicioToque = null;
    if (de === null) return;
    if (de !== ponto) {
      const e = estadoVisivel();
      if (!bloqueado && !e.remover && !e.fim && humano(e.vez) && e.celas[de] === e.vez && fase(e) !== "colocar") {
        sel = de;
        pintar();
        acionar(ponto);
      }
      return;
    }
    acionar(ponto);
  }
  function acionar(ponto) {
    if (bloqueado) return;
    const e = estadoVisivel();
    if (e.fim) return;
    if (e.remover) {
      if (aguardaRemocao && removiveis(e).includes(ponto)) {
        const r = aguardaRemocao;
        aguardaRemocao = null;
        r(ponto);
      }
      return;
    }
    if (!humano(e.vez)) return;
    const f = fase(e);
    if (f === "colocar") {
      if (e.celas[ponto] === 0) executar({ para: ponto });
      else recusar(ponto);
      return;
    }
    if (sel !== null && destinos(e, sel).includes(ponto)) {
      const de = sel;
      sel = null;
      executar({ de, para: ponto });
      return;
    }
    if (e.celas[ponto] === e.vez && destinos(e, ponto).length) {
      sel = sel === ponto ? null : ponto;
      pintar();
      return;
    }
    if (sel !== null) {
      sel = null;
      pintar();
    } else recusar(ponto);
  }
  function vibrar() {
    var _a;
    if (opcoes().vibrar && navigator.vibrate && ((_a = navigator.userActivation) == null ? void 0 : _a.hasBeenActive) !== false) {
      try {
        navigator.vibrate(VIBRACAO_MS);
      } catch {
      }
    }
  }
  async function animarMovimento(e, m) {
    const [x1, y1] = pos(m.de), [x2, y2] = pos(m.para);
    const g = document.createElementNS(ns, "g");
    g.setAttribute("class", "voa");
    g.setAttribute("transform", `translate(${x1} ${y1})`);
    formaPeca(g, e.vez);
    tab.svg.append(g);
    const base = e.celas.slice();
    base[m.de] = 0;
    base[m.para] = 0;
    desenhar(tab, base, { daltonico: opcoes().daltonico });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    g.setAttribute("transform", `translate(${x2} ${y2})`);
    await dormir(MOINHO.mover);
    g.remove();
  }
  async function executar(m, tirarIA) {
    bloqueado = true;
    sel = null;
    const e = p.estado, j = e.vez, f = fase(e);
    const n = jogar(e, m);
    if (m.de !== void 0) {
      await animarMovimento(e, m);
      if (!await livre()) return;
    }
    vista = n;
    pintar();
    if (m.de === void 0) emitir("peca:colocada", { jogador: j, ponto: m.para });
    else emitir("peca:movida", { jogador: j, de: m.de, para: m.para, voo: f === "voar" });
    let ultimo = n;
    if (n.remover) {
      const linha = n.ultimoMoinho[0], rem = removiveis(n);
      emitir("moinho:fechado", { jogador: j, linha, removiveis: rem });
      marcarMoinho(tab, [...new Set(n.ultimoMoinho.flat())]);
      vibrar();
      if (!await espera(MOINHO.pausa)) return;
      limparMoinho(tab);
      pintar({ removiveis: rem });
      let alvo;
      if (humano(j)) {
        bloqueado = false;
        alvo = await new Promise((r) => {
          aguardaRemocao = r;
        });
        bloqueado = true;
        if (!vivo) return;
      } else {
        const [a, b] = NIVEIS[cfg.nivel].pensa;
        await espera(a + (b - a) * 0.5);
        alvo = tirarIA;
        tab.g[alvo].classList.add("vermelha");
        if (!await espera(MOINHO.iaVermelho)) return;
      }
      if (!await livre()) return;
      tab.g[alvo].classList.add("sai");
      await dormir(MOINHO.remocao);
      ultimo = remover(n, alvo);
      emitir("peca:removida", { jogador: j, ponto: alvo });
      m = { ...m, tirar: alvo };
    }
    vista = null;
    p = jogarCompleta(p, m);
    ganchos.guardar(p);
    if (cfg.modo === "mp" && ganchos.aoJogadaMP) {
      vivo = false;
      ganchos.aoJogadaMP(p, m);
      return;
    }
    if (p.estado.fim) {
      await finalizar();
      return;
    }
    emitir("vez:mudou", { jogador: p.estado.vez, fase: fase(p.estado) });
    bloqueado = false;
    pintar();
    seguinte();
  }
  async function finalizar() {
    pintar();
    const fim = p.estado.fim;
    const res = fim.resultado === 1 ? "brancas" : fim.resultado === 2 ? "pretas" : "empate";
    emitir("partida:fim", { resultado: res, motivo: fim.motivo });
    bloqueado = true;
    if (!await espera(MOINHO.fimApos)) return;
    ganchos.aoFim(p);
  }
  async function seguinte() {
    if (!vivo || p.estado.fim || cfg.modo === "2j" || cfg.modo === "mp" || humano(p.estado.vez)) return;
    bloqueado = true;
    pintar();
    const e = p.estado, semente = cfg.semente + p.historico.length * 7919 >>> 0, rng = mulberry32(semente);
    const [a, b] = NIVEIS[cfg.nivel].pensa;
    const alvoMs = a + rng() * (b - a);
    const t0 = Date.now();
    await dormir(20);
    if (!await livre()) return;
    const m = await escolherJogadaAsync(e, { nivel: cfg.nivel, semente, personalidade: cfg.personalidade, variar: !cfg.desafio });
    const resto = alvoMs - (Date.now() - t0);
    if (resto > 0 && !await espera(resto)) return;
    if (!await livre()) return;
    executar({ para: m.para, de: m.de }, m.tirar);
  }
  function desfazerJogada() {
    if (bloqueado || !p.historico.length || p.estado.fim) return;
    p = desfazer(p);
    vista = null;
    sel = null;
    ganchos.guardar(p);
    emitir("vez:mudou", { jogador: p.estado.vez, fase: fase(p.estado) });
    pintar();
  }
  emitir("partida:iniciada", { modo: cfg.modo, nivel: cfg.nivel, cor: cfg.cor, semente: cfg.semente, tema: cfg.tema || "madeira" });
  if (cfg.modo === "ia") aquecerIA(p.estado);
  pintar();
  if (cfg.ultima) {
    for (const pt of [cfg.ultima.de, cfg.ultima.para]) if (pt !== void 0) {
      const [x, y] = pos(pt);
      const c = document.createElementNS(ns, "circle");
      c.setAttribute("cx", x);
      c.setAttribute("cy", y);
      c.setAttribute("r", 20);
      c.setAttribute("class", "ult-anel");
      tab.svg.append(c);
      setTimeout(() => c.remove(), 1800);
    }
  }
  if (window.TABULEIRO_DEBUG) Object.assign(window.TABULEIRO_DEBUG, { tocar: (pt) => {
    tocar(pt, "down");
    tocar(pt, "up");
  }, noTabuleiro: (j) => noTabuleiro(estadoVisivel(), j) });
  seguinte();
  return { parar() {
    vivo = false;
    if (retomaFn) retomaFn();
    offPausa();
  }, partida: () => p };
}
export {
  iniciarPartida
};
