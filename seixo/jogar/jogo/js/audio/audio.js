import { CONFIG } from "../config.js";
import { ouvir as ouvirEventos } from "../eventos.js";
const VOLUME_OMISSAO = 0.8;
const SILENCIO = 1e-4;
let fabrica = () => {
  const C = globalThis.AudioContext || globalThis.webkitAudioContext;
  return C ? new C() : null;
};
let ctx = null;
let mestre = null;
let sfx = null;
let amb = null;
let ruidoBuf = null;
let volume = VOLUME_OMISSAO;
let silenciado = false;
let pausado = false;
let avisosAtivos = false;
let ronda = 0;
let musica = null;
let ambiente = null;
let semente = 385472;
function ligarMestre(ctx2, mestre2) {
  const c = ctx2.createDynamicsCompressor ? ctx2.createDynamicsCompressor() : null;
  if (c && c.threshold) {
    c.threshold.value = -14;
    c.knee.value = 12;
    c.ratio.value = 6;
    c.attack.value = 3e-3;
    c.release.value = 0.2;
    mestre2.connect(c);
    c.connect(ctx2.destination);
  } else mestre2.connect(ctx2.destination);
}
function aleatorio() {
  semente ^= semente << 13;
  semente >>>= 0;
  semente ^= semente >>> 17;
  semente ^= semente << 5;
  semente >>>= 0;
  return semente / 4294967296;
}
const variar = (x, pct) => x * (1 + (aleatorio() * 2 - 1) * pct);
function configurar({ criarContexto } = {}) {
  if (criarContexto) fabrica = criarContexto;
  pararAmbiente();
  pararMusica();
  musicaPedida = false;
  ctx = mestre = sfx = amb = ruidoBuf = null;
  movimentoReduzido = false;
  volume = VOLUME_OMISSAO;
  silenciado = false;
  pausado = false;
  avisosAtivos = false;
  ronda = 0;
  motivoTocado = false;
  ultimoMartelo = -1;
  semente = 385472;
}
function iniciar() {
  if (ctx) {
    retomarContexto();
    return true;
  }
  try {
    ctx = fabrica();
  } catch (e) {
    ctx = null;
  }
  if (!ctx) return false;
  mestre = ctx.createGain();
  mestre.gain.value = silenciado ? 0 : volume;
  ligarMestre(ctx, mestre);
  sfx = ctx.createGain();
  sfx.gain.value = 1;
  sfx.connect(mestre);
  amb = ctx.createGain();
  amb.gain.value = 1;
  amb.connect(mestre);
  const len = Math.floor(ctx.sampleRate || 44100);
  ruidoBuf = ctx.createBuffer(1, len, ctx.sampleRate || 44100);
  const d = ruidoBuf.getChannelData(0);
  for (let k = 0; k < len; k++) d[k] = aleatorio() * 2 - 1;
  retomarContexto();
  return true;
}
const estaPronto = () => !!ctx;
function ligarGesto(alvo = globalThis.document) {
  if (!alvo || !alvo.addEventListener) return () => {
  };
  const tipos = ["pointerdown", "touchend", "keydown"];
  const fn = () => {
    iniciar();
    desligar();
  };
  const desligar = () => tipos.forEach((t) => alvo.removeEventListener(t, fn, true));
  tipos.forEach((t) => alvo.addEventListener(t, fn, true));
  return desligar;
}
function ligar(ouvir = ouvirEventos) {
  return ouvir((nome, dados) => evento(nome, dados));
}
function retomarContexto() {
  if (ctx && !pausado && !silenciado && ctx.state === "suspended" && ctx.resume) ctx.resume().catch(() => {
  });
}
function definirVolume(v) {
  volume = Math.min(1, Math.max(0, Number(v) || 0));
  if (mestre && !silenciado) rampa(mestre.gain, volume, 0.03);
  return volume;
}
const obterVolume = () => volume;
function silenciar(sim = true) {
  silenciado = !!sim;
  if (!mestre) return silenciado;
  if (silenciado) {
    mestre.gain.cancelScheduledValues(ctx.currentTime);
    mestre.gain.setValueAtTime(0, ctx.currentTime);
    pararAmbiente();
    pararMusica();
  } else {
    rampa(mestre.gain, volume, 0.05);
    retomarContexto();
    if (musicaPedida) iniciarMusica();
  }
  return silenciado;
}
const estaSilenciado = () => silenciado;
function rampa(param, valor, tau) {
  const t = ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.setTargetAtTime(valor, t, tau);
}
function evento(nome, dados = {}) {
  switch (nome) {
    case "definicoes:alteradas":
      if (dados.chave === "som") silenciar(!dados.valor);
      return null;
    case "app:pausa":
      pausado = true;
      pararAmbiente();
      pararMusica();
      if (ctx && ctx.suspend) ctx.suspend().catch(() => {
      });
      return null;
    case "app:retoma":
      pausado = false;
      retomarContexto();
      if (musicaPedida) iniciarMusica();
      return null;
    case "puzzle:aberto":
    case "puzzle:recomecado":
      avisosAtivos = false;
      break;
    case "puzzle:avisos": {
      const tem = Array.isArray(dados.conflitos) && dados.conflitos.length > 0;
      const novo = tem && !avisosAtivos;
      avisosAtivos = tem;
      return novo ? tocar("erro", erro) : null;
    }
    case "ecra:aberto":
      if (dados.ecra === "praca") iniciarAmbiente();
      else pararAmbiente();
      if (dados.ecra === "puzzle" || dados.ecra === "inicio") iniciarMusica();
      else {
        musicaPedida = false;
        pararMusica();
      }
      if (dados.ecra === "inicio" && !motivoTocado) {
        motivoTocado = true;
        tocar("abertura", motivoAbertura);
      }
      break;
  }
  switch (nome) {
    case "puzzle:pedra":
      return tocar("martelo", () => {
        martelo(dados.depois);
        camadaSom(somEquipado, dados.depois);
      });
    case "puzzle:resolvido":
      return tocar("assentar", () => assentar(dados.n));
    case "puzzle:assentado":
      return tocar("conclusao", conclusao);
    case "puzzle:toque_fixa":
      return tocar("toque_seco", toqueSeco);
    case "puzzle:desfeito":
      return tocar("desfazer", desfazer);
    case "puzzle:recomecado":
      return tocar("recomecar", recomecar);
    case "puzzle:pista":
      return tocar("pista", pista);
    case "ui:toque":
      return tocar("clique", clique);
    case "ecra:aberto":
      return tocar("transicao", transicao);
    case "lascas:alteradas":
      return dados.delta > 0 ? tocar("lascas", () => lascas(dados.delta)) : null;
    case "sequencia:alterada":
      return dados.motivo === "subiu" ? tocar("sequencia", sequencia) : null;
    case "praca:quadrado":
      return tocar("quadrado", quadrado);
    case "praca:completa":
      return tocar("praca", pracaCompleta);
    case "item:obtido":
      return tocar("item", item);
    case "nivel:subiu":
      return tocar("nivel", nivelSobe);
    case "meta:cumprida":
      return dados.horizonte === "longo" ? tocar("meta_longa", metaLonga) : tocar("meta", metaCumprida);
    case "desafio:resultado": {
      const r = DESAFIO[dados.resultado];
      return r ? tocar(r[0], r[1]) : null;
    }
    case "desafio:erro":
      return tocar("erro", erro);
    case "item:equipado":
      if (dados.tipo === "som") {
        somEquipado = String(dados.id || "SOM-PEDRA");
        return tocar("assentar_som", () => assentarSom(somEquipado));
      }
      return dados.tipo === "pedra" ? tocar("assentar_cosmetico", () => assentarCosmetico(dados.id)) : null;
    case "loja:troca":
      return tocar("loja", loja);
    case "dia:verificado":
      return dados.antes && dados.hoje !== dados.antes && !dados.relogioParaTras ? tocar("fim_dia", fimDeDia) : null;
    default:
      return null;
  }
}
function tocar(id, fn) {
  if (!ctx || silenciado || pausado) return null;
  try {
    fn();
  } catch (e) {
    console.warn(`[audio] '${id}' falhou:`, e);
    return null;
  }
  return id;
}
function envelope(g, t, ataque, queda, pico) {
  g.gain.setValueAtTime(SILENCIO, t);
  g.gain.linearRampToValueAtTime(pico, t + ataque);
  g.gain.exponentialRampToValueAtTime(SILENCIO, t + ataque + queda);
}
function tom({ tipo = "sine", f, fFim, t = ctx.currentTime, ataque = 3e-3, queda = 0.1, vol = 0.3, destino = sfx }) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(f, t);
  if (fFim) o.frequency.exponentialRampToValueAtTime(fFim, t + ataque + queda);
  envelope(g, t, ataque, queda, vol);
  o.connect(g);
  g.connect(destino);
  o.start(t);
  o.stop(t + ataque + queda + 0.02);
  return o;
}
function ruido({ t = ctx.currentTime, ataque = 2e-3, queda = 0.05, vol = 0.3, filtro = "bandpass", f = 2e3, fFim, q = 1, destino = sfx }) {
  const s = ctx.createBufferSource();
  const b = ctx.createBiquadFilter();
  const g = ctx.createGain();
  s.buffer = ruidoBuf;
  b.type = filtro;
  b.Q.value = q;
  b.frequency.setValueAtTime(f, t);
  if (fFim) b.frequency.exponentialRampToValueAtTime(fFim, t + ataque + queda);
  envelope(g, t, ataque, queda, vol);
  s.connect(b);
  b.connect(g);
  g.connect(destino);
  s.start(t, aleatorio() * 0.5);
  s.stop(t + ataque + queda + 0.02);
  return s;
}
const RODIZIO = [1, 1.06, 0.95];
const RAJADA_S = 0.09;
let ultimoMartelo = -1;
function martelo(depois, t = ctx.currentTime, vol = 1, destino = sfx) {
  const r = RODIZIO[ronda++ % RODIZIO.length];
  if (destino === sfx) {
    if (ultimoMartelo >= 0 && t - ultimoMartelo < RAJADA_S) vol *= 0.4 + 0.6 * ((t - ultimoMartelo) / RAJADA_S);
    ultimoMartelo = t;
  }
  if (depois === ".") {
    ruido({ t, queda: 0.07, vol: 0.12 * vol, filtro: "bandpass", f: variar(1400, 0.05), fFim: 700, q: 1.5, destino });
    tom({ f: variar(180, 0.04), fFim: 120, t, queda: 0.05, vol: 0.08 * vol, destino });
    return;
  }
  const claro = depois === "B";
  const corpo = (claro ? 1250 : 820) * r;
  ruido({ t, queda: 0.035, vol: 0.32 * vol, f: variar(claro ? 3600 : 2400, 0.05) * r, q: 2.5, destino });
  tom({ tipo: "triangle", f: variar(corpo, 0.04), fFim: corpo * 0.8, t, queda: claro ? 0.09 : 0.06, vol: 0.22 * vol, destino });
  tom({ f: variar(claro ? 170 : 130, 0.04), fFim: 70, t, ataque: 2e-3, queda: 0.09, vol: 0.3 * vol, destino });
}
function assentar(n = 6) {
  const t0 = ctx.currentTime;
  const dur = (CONFIG.ANIM_RESOLVIDO_MS || 1200) / 1e3;
  const passos = Math.max(4, Math.min(10, n | 0 || 6));
  const fim = dur * 0.85;
  for (let k = 0; k < passos; k++) {
    const t2 = t0 + k / passos * fim;
    const f = variar(320 - k * 14, 0.03);
    ruido({ t: t2, queda: 0.12, vol: 0.06, filtro: "lowpass", f: 900, fFim: 300, q: 0.7 });
    tom({ f, fFim: f * 0.7, t: t2, ataque: 0.01, queda: 0.16, vol: 0.12 });
  }
  const t = t0 + fim;
  ruido({ t, ataque: 0.02, queda: 0.5, vol: 0.08, filtro: "lowpass", f: 600, fFim: 150, q: 0.5 });
  tom({ f: 98, t, ataque: 0.02, queda: 0.9, vol: 0.22 });
  tom({ f: 146.8, t: t + 0.02, ataque: 0.03, queda: 0.8, vol: 0.12 });
  tom({ tipo: "triangle", f: 587.3, t: t + 0.05, ataque: 0.01, queda: 0.6, vol: 0.04 });
}
function erro() {
  const t = ctx.currentTime;
  tom({ f: 233, t, ataque: 0.01, queda: 0.12, vol: 0.1 });
  tom({ f: 220, t: t + 0.11, ataque: 0.01, queda: 0.18, vol: 0.09 });
}
function toqueSeco() {
  const t = ctx.currentTime;
  ruido({ t, queda: 0.025, vol: 0.12, f: variar(1800, 0.05), q: 3 });
  tom({ f: variar(420, 0.03), fFim: 300, t, queda: 0.03, vol: 0.08 });
}
function clique() {
  const t = ctx.currentTime;
  tom({ tipo: "triangle", f: variar(1500, 0.03), fFim: 1100, t, queda: 0.03, vol: 0.07 });
}
function desfazer() {
  ruido({ queda: 0.09, vol: 0.1, f: 2200, fFim: 800, q: 2 });
}
function recomecar() {
  const t = ctx.currentTime;
  ruido({ t, ataque: 0.05, queda: 0.25, vol: 0.09, filtro: "bandpass", f: 3e3, fFim: 600, q: 0.8 });
  ruido({ t: t + 0.18, ataque: 0.04, queda: 0.22, vol: 0.07, filtro: "bandpass", f: 2600, fFim: 500, q: 0.8 });
}
function transicao() {
  ruido({ ataque: 0.06, queda: 0.18, vol: 0.03, filtro: "lowpass", f: 1200, fFim: 400, q: 0.5 });
}
function pista() {
  const t = ctx.currentTime;
  tom({ tipo: "triangle", f: 1318.5, t, ataque: 5e-3, queda: 0.35, vol: 0.09 });
  tom({ f: 1975.5, t: t + 0.06, ataque: 5e-3, queda: 0.3, vol: 0.04 });
}
const PENTA = [587.3, 659.3, 784, 880, 987.8, 1174.7];
function lascas(delta) {
  const t = ctx.currentTime;
  const k = Math.max(2, Math.min(4, Math.ceil(delta / 5)));
  for (let j = 0; j < k; j++) tom({ tipo: "triangle", f: variar(2200 + j * 300, 0.06), t: t + j * 0.055, queda: 0.12, vol: 0.06 });
}
function sequencia() {
  const t = ctx.currentTime;
  tom({ tipo: "triangle", f: PENTA[0], t, queda: 0.25, vol: 0.1 });
  tom({ tipo: "triangle", f: PENTA[3], t: t + 0.12, queda: 0.4, vol: 0.1 });
}
function quadrado() {
  martelo("P", ctx.currentTime, 0.9);
}
function pracaCompleta() {
  const t = ctx.currentTime;
  const r = movimentoReduzido ? 0.65 : 1;
  PENTA.forEach((f, j) => tom({ tipo: "triangle", f, t: t + j * 0.06, ataque: 5e-3, queda: 0.26, vol: 0.08 * r }));
  if (!movimentoReduzido) tom({ f: 146.8, t, ataque: 0.04, queda: 0.5, vol: 0.1 });
}
let motivoTocado = false;
function motivoAbertura() {
  const t = ctx.currentTime;
  [0, 2, 3, 5].forEach((i, j) => tom({ tipo: "triangle", f: PENTA[i] / 2, t: t + j * 0.28, ataque: 0.02, queda: j === 3 ? 0.9 : 0.35, vol: 0.09 }));
}
function fimDeDia() {
  const t = ctx.currentTime;
  [440, 329.6, 293.7].forEach((f, j) => tom({ tipo: "sine", f, t: t + j * 0.4, ataque: 0.03, queda: 0.8, vol: 0.07 }));
}
function loja() {
  const t = ctx.currentTime;
  tom({ tipo: "triangle", f: 330, fFim: 250, t, queda: 0.07, vol: 0.12 });
  tom({ tipo: "triangle", f: 330, fFim: 250, t: t + 0.09, queda: 0.07, vol: 0.1 });
  tom({ tipo: "sine", f: PENTA[4], t: t + 0.2, queda: 0.3, vol: 0.06 });
}
function nivelSobe() {
  const t = ctx.currentTime;
  const r = movimentoReduzido ? 0.65 : 1;
  [PENTA[0], PENTA[3], PENTA[0] * 2].forEach((f, j) => tom({ tipo: "triangle", f, t: t + j * 0.12, ataque: 0.01, queda: 0.32, vol: 0.09 * r }));
  if (!movimentoReduzido) tom({ f: 146.8, t, ataque: 0.03, queda: 0.5, vol: 0.07 });
}
function conclusao() {
  const t = ctx.currentTime;
  const r = movimentoReduzido ? 0.6 : 1;
  if (!movimentoReduzido) tom({ f: 110, t, ataque: 0.01, queda: 0.25, vol: 0.09 });
  tom({ tipo: "triangle", f: PENTA[0], t: t + 0.03, ataque: 0.01, queda: 0.22 * (movimentoReduzido ? 0.8 : 1), vol: 0.07 * r });
  tom({ tipo: "triangle", f: PENTA[3], t: t + 0.13, ataque: 0.01, queda: 0.3 * (movimentoReduzido ? 0.7 : 1), vol: 0.06 * r });
}
let movimentoReduzido = false;
const definirMovimentoReduzido = (sim) => {
  movimentoReduzido = !!sim;
  return movimentoReduzido;
};
const movimentoReduzidoAtivo = () => movimentoReduzido;
function metaCumprida() {
  const t = ctx.currentTime;
  const r = movimentoReduzido ? 0.65 : 1;
  tom({ tipo: "sine", f: PENTA[2], t, ataque: 0.01, queda: 0.25, vol: 0.08 * r });
  tom({ tipo: "sine", f: PENTA[4], t: t + 0.1, ataque: 0.01, queda: movimentoReduzido ? 0.3 : 0.4, vol: 0.07 * r });
}
function metaLonga() {
  const t = ctx.currentTime;
  const r = movimentoReduzido ? 0.65 : 1;
  [PENTA[2], PENTA[4], PENTA[5]].forEach((f, j) => tom({ tipo: "sine", f, t: t + j * 0.09, ataque: 0.01, queda: 0.38, vol: 0.08 * r }));
  if (!movimentoReduzido) tom({ f: 146.8, t, ataque: 0.03, queda: 0.45, vol: 0.06 });
}
function desafioBateste() {
  const t = ctx.currentTime;
  const r = movimentoReduzido ? 0.65 : 1;
  tom({ tipo: "triangle", f: PENTA[3], t, ataque: 0.01, queda: 0.22, vol: 0.08 * r });
  tom({ tipo: "triangle", f: PENTA[5], t: t + 0.1, ataque: 0.01, queda: 0.36, vol: 0.08 * r });
}
function desafioEmpate() {
  const t = ctx.currentTime;
  const r = movimentoReduzido ? 0.65 : 1;
  tom({ tipo: "triangle", f: PENTA[3], t, ataque: 0.01, queda: 0.2, vol: 0.07 * r });
  tom({ tipo: "triangle", f: PENTA[3], t: t + 0.12, ataque: 0.01, queda: 0.26, vol: 0.06 * r });
}
function desafioNaoBateste() {
  const t = ctx.currentTime;
  const r = movimentoReduzido ? 0.65 : 1;
  tom({ tipo: "sine", f: PENTA[1], t, ataque: 0.015, queda: 0.22, vol: 0.06 * r });
  tom({ tipo: "sine", f: PENTA[0], t: t + 0.13, ataque: 0.015, queda: 0.3, vol: 0.05 * r });
}
const DESAFIO = {
  bateste: ["desafio_bateste", desafioBateste],
  empataste: ["desafio_empate", desafioEmpate],
  nao_bateste: ["desafio_nao_bateste", desafioNaoBateste]
};
const SONS_CONCLUSAO = ["conclusao", "meta", "meta_longa", "nivel", "praca", "desafio_bateste", "desafio_empate", "desafio_nao_bateste"];
let somEquipado = "SOM-PEDRA";
const definirSom = (id) => {
  somEquipado = String(id || "SOM-PEDRA");
  return somEquipado;
};
const obterSom = () => somEquipado;
function camadaSom(id, depois, t = ctx.currentTime) {
  if (depois === "." || id === "SOM-PEDRA") return;
  const claro = depois === "B";
  switch (id) {
    case "SOM-MADEIRA":
      tom({ tipo: "triangle", f: variar(claro ? 300 : 220, 0.04), fFim: 150, t, queda: 0.12, vol: 0.14 });
      break;
    case "SOM-SINO":
      tom({ tipo: "sine", f: variar(claro ? 1568 : 1175, 0.02), t, queda: 0.22, vol: 0.06 });
      tom({ tipo: "sine", f: (claro ? 1568 : 1175) * 2.4, t, queda: 0.1, vol: 0.025 });
      break;
    case "SOM-AGUA":
      tom({ tipo: "sine", f: variar(claro ? 900 : 700, 0.04), fFim: 300, t: t + 0.01, queda: 0.15, vol: 0.09 });
      ruido({ t: t + 0.02, queda: 0.14, vol: 0.05, filtro: "bandpass", f: 1800, fFim: 600, q: 1.2 });
      break;
  }
}
function assentarSom(id) {
  const t = ctx.currentTime;
  martelo("B", t, 0.7);
  camadaSom(id, "B", t);
}
const previsualizarSom = (id) => tocar("assentar_som", () => assentarSom(String(id || "SOM-PEDRA")));
function assentarCosmetico(id) {
  const t = ctx.currentTime;
  let h = 0;
  for (const c of String(id || "")) h = h * 31 + c.charCodeAt(0) >>> 0;
  const f = 98 * (1 + h % 5 * 0.06);
  martelo("B", t, 0.7);
  tom({ f, t: t + 0.03, ataque: 0.01, queda: 0.35, vol: 0.09 });
}
function item() {
  const t = ctx.currentTime;
  tom({ tipo: "triangle", f: PENTA[2], t, queda: 0.2, vol: 0.08 });
  tom({ tipo: "triangle", f: PENTA[5], t: t + 0.08, queda: 0.3, vol: 0.07 });
}
const AMB_VOL = 0.035;
const ambienteAtivo = () => !!ambiente;
function iniciarAmbiente() {
  if (ambiente || !ctx || silenciado || pausado) return;
  const s = ctx.createBufferSource();
  const b = ctx.createBiquadFilter();
  const g = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  s.buffer = ruidoBuf;
  s.loop = true;
  b.type = "lowpass";
  b.frequency.value = 420;
  b.Q.value = 0.4;
  lfo.frequency.value = 0.07;
  lfoG.gain.value = 140;
  lfo.connect(lfoG);
  lfoG.connect(b.frequency);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(SILENCIO, t);
  g.gain.exponentialRampToValueAtTime(AMB_VOL, t + 1.5);
  s.connect(b);
  b.connect(g);
  g.connect(amb);
  s.start(t);
  lfo.start(t);
  ambiente = { fontes: [s, lfo], ganho: g, temporizador: null };
  agendarLonge();
}
function agendarLonge() {
  if (!ambiente || typeof setTimeout !== "function") return;
  ambiente.temporizador = setTimeout(() => {
    if (!ambiente || !ctx || silenciado || pausado) return;
    const longe = ctx.createBiquadFilter();
    longe.type = "lowpass";
    longe.frequency.value = 900;
    longe.connect(amb);
    const golpes = 2 + Math.floor(aleatorio() * 3);
    for (let k = 0; k < golpes; k++) martelo(aleatorio() < 0.5 ? "P" : "B", ctx.currentTime + k * variar(0.42, 0.1), 0.12, longe);
    agendarLonge();
  }, 4e3 + aleatorio() * 6e3);
}
function pararAmbiente() {
  if (!ambiente) return;
  const { fontes, ganho, temporizador } = ambiente;
  ambiente = null;
  if (temporizador) clearTimeout(temporizador);
  try {
    const t = ctx.currentTime;
    ganho.gain.cancelScheduledValues(t);
    ganho.gain.setTargetAtTime(0, t, 0.15);
    fontes.forEach((f) => f.stop(t + 0.8));
  } catch (e) {
  }
}
const MUS_VOL = 0.03;
const MUS_NOTAS = [293.7, 330, 392, 440, 493.9, 587.3, 659.3];
let musicaPedida = false;
let ultimaNota = -1;
const musicaAtiva = () => !!musica;
function iniciarMusica() {
  musicaPedida = true;
  if (musica || !ctx || silenciado || pausado) return;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(SILENCIO, t);
  g.gain.exponentialRampToValueAtTime(1, t + 2);
  g.connect(amb);
  musica = { ganho: g, temporizador: null };
  agendarNota(2500);
}
function agendarNota(atraso) {
  if (!musica || typeof setTimeout !== "function") return;
  musica.temporizador = setTimeout(() => {
    if (!musica || !ctx || silenciado || pausado) return;
    let k;
    do {
      k = Math.floor(aleatorio() * MUS_NOTAS.length);
    } while (k === ultimaNota);
    ultimaNota = k;
    const t = ctx.currentTime;
    const f = variar(MUS_NOTAS[k], 2e-3);
    tom({ tipo: "sine", f, t, ataque: 0.8, queda: 3.2, vol: MUS_VOL, destino: musica.ganho });
    tom({ tipo: "sine", f: f / 2, t, ataque: 1.2, queda: 3.6, vol: MUS_VOL * 0.5, destino: musica.ganho });
    agendarNota(7e3 + aleatorio() * 7e3);
  }, atraso);
}
function pararMusica() {
  if (!musica) return;
  const { ganho, temporizador } = musica;
  musica = null;
  if (temporizador) clearTimeout(temporizador);
  try {
    const t = ctx.currentTime;
    ganho.gain.cancelScheduledValues(t);
    ganho.gain.setTargetAtTime(0, t, 0.2);
  } catch (e) {
  }
}
export {
  SONS_CONCLUSAO,
  ambienteAtivo,
  configurar,
  definirMovimentoReduzido,
  definirSom,
  definirVolume,
  estaPronto,
  estaSilenciado,
  evento,
  iniciar,
  ligar,
  ligarGesto,
  movimentoReduzidoAtivo,
  musicaAtiva,
  obterSom,
  obterVolume,
  previsualizarSom,
  silenciar
};
