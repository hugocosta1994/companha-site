import { VAZIA, PRETA } from "../nucleo/formato.js";
import { violacoes } from "../nucleo/regras.js";
import { emitir } from "../eventos.js";
import { extensaoDebug } from "./depuracao.js";
import { coresTabuleiro } from "./cosmeticos.js";
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
function geometria(largura, n, cfg) {
  const oito = n >= 8;
  const margemInt = oito ? cfg.TABULEIRO_MARGEM_8 : cfg.TABULEIRO_MARGEM;
  const margemExt = oito ? limitar((largura - 2 * margemInt - n * cfg.CASA_ALVO_DP) / 2, cfg.TABULEIRO_MARGEM_EXT_MIN, cfg.TABULEIRO_MARGEM_EXT) : cfg.TABULEIRO_MARGEM_EXT;
  const casa = (largura - 2 * margemExt - 2 * margemInt) / n;
  const borda = margemInt > 0 ? margemInt : Math.min(margemExt, cfg.TOQUE_FOLGA_DP);
  const grelha = n * casa;
  return {
    n,
    w: largura,
    h: grelha + 2 * borda,
    margemExt,
    margemInt,
    borda,
    casa,
    lado: largura - 2 * margemExt,
    // tabuleiro com o rebordo interior (o "leito")
    gx0: margemExt + margemInt,
    gy0: borda
  };
}
function casaNoPonto(geo, x, y, folga) {
  const { n, casa, gx0, gy0 } = geo;
  const rx = x - gx0, ry = y - gy0, lado = n * casa;
  if (rx < -folga || ry < -folga || rx > lado + folga || ry > lado + folga) return null;
  const c = limitar(Math.floor(rx / casa), 0, n - 1);
  const l = limitar(Math.floor(ry / casa), 0, n - 1);
  return { l, c };
}
const COR = [".", "P", "B"];
const cor = (v) => {
  var _a;
  return (_a = COR[v]) != null ? _a : ".";
};
function conflitosDe(v) {
  var _a, _b, _c, _d, _e;
  const lista = [];
  for (const regra of [...v.regras].sort()) {
    const casas = (_e = (_d = (_b = (_a = v.porRegra) == null ? void 0 : _a.get) == null ? void 0 : _b.call(_a, regra)) != null ? _d : (_c = v.porRegra) == null ? void 0 : _c[regra]) != null ? _e : v.celulas;
    lista.push({ regra, casas: [...casas].sort((a, b) => a - b) });
  }
  return lista;
}
class Tabuleiro {
  constructor(canvas, config, aoTocar) {
    var _a;
    this.canvas = canvas;
    this.cfg = config;
    this.aoTocar = aoTocar;
    this.jogo = null;
    this.anims = /* @__PURE__ */ new Map();
    this.resolvidoT0 = null;
    this.aoFimResolvido = null;
    this.mudancaT0 = 0;
    this.avisos = { celulas: /* @__PURE__ */ new Set(), regras: /* @__PURE__ */ new Set() };
    this.pedidoFrame = 0;
    this.temporizadorAviso = 0;
    this.ctx = canvas.getContext("2d");
    this.geo = null;
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const casa = this.casaEm(e.clientX - r.left, e.clientY - r.top);
      if (casa) this.aoTocar(casa.l, casa.c);
    });
    (_a = globalThis.addEventListener) == null ? void 0 : _a.call(globalThis, "resize", () => {
      if (this.jogo && this.medir()) this.pedirDesenho();
    });
    extensaoDebug("tabuleiro", () => ({ ...this.geo }));
  }
  // Largura útil = a do contentor da app (360 dp no mockup), em px CSS (= dp).
  largura() {
    const pai = this.canvas.parentElement;
    if (!pai || !pai.clientWidth) return Math.round(this.cfg.ECRA_LARGURA);
    let util = pai.clientWidth;
    try {
      const cs = getComputedStyle(pai);
      util -= (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    } catch {
    }
    return Math.round(util > 0 ? util : pai.clientWidth);
  }
  // Recalcula a geometria para o puzzle atual; devolve true se mudou.
  medir() {
    const g = geometria(this.largura(), this.jogo.puzzle.n, this.cfg);
    if (this.geo && this.geo.w === g.w && this.geo.n === g.n) return false;
    this.geo = g;
    const dpr = Math.max(1, Math.min(3, globalThis.devicePixelRatio || 1));
    this.canvas.width = Math.round(g.w * dpr);
    this.canvas.height = Math.round(g.h * dpr);
    this.canvas.style.width = g.w + "px";
    this.canvas.style.height = g.h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }
  get passo() {
    return this.geo.casa;
  }
  casaEm(x, y) {
    if (!this.jogo || !this.geo) return null;
    return casaNoPonto(this.geo, x, y, this.cfg.TOQUE_FOLGA_DP);
  }
  // Abre um puzzle (puzzle:aberto) ou, com o mesmo jogo e histórico vazio, um recomeço (puzzle:recomecado).
  definirJogo(jogo) {
    var _a, _b, _c;
    const recomeco = jogo === this.jogo && jogo.historico.length === 0;
    this.jogo = jogo;
    this.medir();
    this.anims.clear();
    this.resolvidoT0 = null;
    this.revela = false;
    this.aoFimResolvido = null;
    this.histVisto = jogo.historico.length;
    this.grelhaVista = Int8Array.from(jogo.grelha);
    this.resolvidoEmitido = jogo.resolvido;
    const p = jogo.puzzle;
    if (recomeco) emitir("puzzle:recomecado", { id: p.id });
    else {
      this.avisosEmitidos = "[]";
      emitir("puzzle:aberto", {
        id: p.id,
        n: p.n,
        variante: p.variante,
        dificuldade: (_a = p.dificuldade) != null ? _a : null,
        origem: (_c = (_b = p.origem) == null ? void 0 : _b.tipo) != null ? _c : null,
        retomado: jogo.historico.length > 0
      });
    }
    this.atualizarAvisos();
    this.pedirDesenho();
  }
  // Chamado depois de cada jogada ou desfazer. Emite puzzle:pedra / puzzle:desfeito pela diferença
  // para o último estado visto, e agenda puzzle:avisos para AVISO_ATRASO_MS depois.
  atualizarAvisos() {
    this.emitirMudancas();
    this.avisos = violacoes(this.jogo.puzzle, this.jogo.grelha);
    this.mudancaT0 = performance.now();
    clearTimeout(this.temporizadorAviso);
    this.temporizadorAviso = setTimeout(() => {
      if (this.avisos.regras.size) this.pedirDesenho();
      this.emitirAvisos();
    }, this.cfg.AVISO_ATRASO_MS + 5);
  }
  emitirMudancas() {
    const { jogo } = this;
    const p = jogo.puzzle, n = p.n, g = jogo.grelha;
    const h = jogo.historico.length;
    if (h !== this.histVisto) {
      const tocou = h > this.histVisto;
      const casas = tocou ? [jogo.historico[h - 1].i] : [];
      if (!casas.length) {
        for (let i = 0; i < g.length; i++) if (g[i] !== this.grelhaVista[i]) casas.push(i);
      }
      for (const i of casas) {
        const dados = { id: p.id, i, l: Math.floor(i / n), c: i % n, antes: cor(this.grelhaVista[i]), depois: cor(g[i]) };
        if (tocou) emitir("puzzle:pedra", dados);
        else emitir("puzzle:desfeito", dados);
      }
    }
    this.histVisto = h;
    this.grelhaVista = Int8Array.from(g);
  }
  emitirAvisos() {
    if (!this.cfg.AVISOS_LIGADOS || !this.jogo || this.guiaSilencia()) return;
    const conflitos = conflitosDe(this.avisos);
    const chave = JSON.stringify(conflitos);
    if (chave === this.avisosEmitidos) return;
    this.avisosEmitidos = chave;
    emitir("puzzle:avisos", { id: this.jogo.puzzle.id, conflitos });
  }
  avisosVisiveis() {
    if (!this.cfg.AVISOS_LIGADOS || this.resolvidoT0 !== null || this.guiaSilencia()) return false;
    return performance.now() - this.mudancaT0 >= this.cfg.AVISO_ATRASO_MS;
  }
  animarAssentar(i) {
    this.anims.set(i, { tipo: "assentar", t0: performance.now() });
    this.pedirDesenho();
  }
  // tipo = 'dada' | 'revelada' (eventos.md §2: puzzle:toque_fixa)
  animarAbanar(i, tipo = "dada") {
    const n = this.jogo.puzzle.n;
    emitir("puzzle:toque_fixa", { id: this.jogo.puzzle.id, i, l: Math.floor(i / n), c: i % n, tipo: tipo === "revelada" ? "revelada" : "dada" });
    this.anims.set(i, { tipo: "abanar", t0: performance.now() });
    this.pedirDesenho();
  }
  // Pista (GDD §5.4, eventos.md puzzle:pista): a casa pisca. Chamado depois de main aplicar a pista ao jogo
  // (revelar() tira a casa do histórico: aceita-se essa mudança aqui para não sair um puzzle:desfeito falso).
  // r = resultado de nucleo/pista.js; extra = { gratis }.
  // Tutorial (T-393): a casa i pisca como a da pista, sem evento nem custo.
  destacar(i) {
    if (!Number.isInteger(i)) return;
    this.anims.set(i, { tipo: "pista", t0: performance.now() });
    this.pedirDesenho();
  }
  // Tutorial (T-424; GDD §4.7, V1-09): guia persistente na casa-alvo — anel a pulsar e mão a apontar — até o
  // tutorial a tirar (toque certo). guia = { i, cor (PRETA|BRANCA da solução), mao } ou null.
  // Enquanto se toca na própria casa-alvo e ela ainda não tem a cor certa, não há aviso vermelho (o 1.º toque nunca
  // dá erro: é o caminho para a cor certa).
  definirGuia(guia) {
    var _a;
    const novo = guia && Number.isInteger(guia.i) ? { i: guia.i, cor: (_a = guia.cor) != null ? _a : null, mao: !!guia.mao } : null;
    const antes = this.guia;
    this.guia = novo;
    if (novo && (!antes || antes.i !== novo.i)) this.guiaT0 = performance.now();
    if (!novo !== !antes || novo && antes && (novo.i !== antes.i || novo.mao !== antes.mao)) this.pedirDesenho();
    if (!novo && antes) this.atualizarAvisosSemMudanca();
  }
  guiaSilencia() {
    const gd = this.guia, j = this.jogo;
    if (!gd || !j) return false;
    const h = j.historico.length;
    const ultima = h ? j.historico[h - 1].i : null;
    return ultima === gd.i && (gd.cor == null || j.grelha[gd.i] !== gd.cor);
  }
  // Recalcula a visibilidade dos avisos sem emitir pedras (quando a guia sai).
  atualizarAvisosSemMudanca() {
    if (!this.jogo) return;
    this.pedirDesenho();
    this.emitirAvisos();
  }
  mostrarPista(r, { gratis = false } = {}) {
    const p = this.jogo.puzzle, conflito = r.regra === "conflito";
    const i = conflito ? r.conflito : r.i;
    this.histVisto = this.jogo.historico.length;
    this.grelhaVista = Int8Array.from(this.jogo.grelha);
    this.anims.set(i, { tipo: "pista", t0: performance.now() });
    emitir("puzzle:pista", {
      id: p.id,
      tipo: conflito ? "conflito" : "revela",
      i,
      l: r.l,
      c: r.c,
      cor: conflito ? null : cor(r.cor),
      tecnica: conflito ? null : r.tecnica,
      regra: r.regra,
      gratis: !!gratis,
      pistasUsadas: this.jogo.pistasUsadas
    });
    this.atualizarAvisos();
    this.pedirDesenho();
  }
  animarResolvido(aoFim, { revela = false } = {}) {
    var _a, _b, _c, _d, _e, _f;
    this.resolvidoT0 = performance.now();
    this.revela = !!revela;
    const total = this.cfg.ANIM_RESOLVIDO_MS + (this.revela ? (_a = this.cfg.ANIM_REVELA_MS) != null ? _a : 600 : 0);
    this.aoFimResolvido = aoFim;
    if (!this.resolvidoEmitido) {
      this.resolvidoEmitido = true;
      const p = this.jogo.puzzle;
      emitir("puzzle:resolvido", {
        id: p.id,
        n: p.n,
        variante: p.variante,
        dificuldade: (_b = p.dificuldade) != null ? _b : null,
        origem: (_d = (_c = p.origem) == null ? void 0 : _c.tipo) != null ? _d : null,
        pistasUsadas: (_e = this.jogo.pistasUsadas) != null ? _e : 0,
        primeiraVez: true,
        noProprioDia: ((_f = p.origem) == null ? void 0 : _f.tipo) === "diario" ? true : null
      });
    }
    clearTimeout(this.temporizadorResolvido);
    this.temporizadorResolvido = setTimeout(() => this.terminarResolvido(), total + 20);
    this.pedirDesenho();
  }
  terminarResolvido() {
    if (!this.aoFimResolvido) return;
    const f = this.aoFimResolvido;
    this.aoFimResolvido = null;
    clearTimeout(this.temporizadorResolvido);
    emitir("puzzle:assentado", { id: this.jogo.puzzle.id });
    f();
  }
  pedirDesenho() {
    if (this.pedidoFrame) return;
    this.pedidoFrame = requestAnimationFrame(() => {
      this.pedidoFrame = 0;
      this.desenhar();
    });
  }
  desenhar() {
    var _a, _b, _c, _d, _e, _f;
    if (!this.jogo) return;
    const { ctx, cfg } = this;
    const C = coresTabuleiro(cfg.CORES);
    const p = this.jogo.puzzle, g = this.jogo.grelha, n = p.n;
    const { gx0, gy0, borda, w, h } = this.geo, s = this.passo, grelha = n * s;
    const agora = performance.now();
    let continuar = false, soGuia = false;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = C.argamassa;
    arredondado(ctx, gx0 - borda, gy0 - borda, grelha + 2 * borda, grelha + 2 * borda, 10);
    ctx.fill();
    const mostrarAvisos = this.avisosVisiveis();
    const T = cfg.ANIM_RESOLVIDO_MS;
    const tRes = this.resolvidoT0 === null ? -1 : agora - this.resolvidoT0;
    for (let l = 0; l < n; l++) {
      for (let c = 0; c < n; c++) {
        const i = l * n + c;
        const x = gx0 + c * s, y = gy0 + l * s;
        ctx.fillStyle = C.casa;
        arredondado(ctx, x + 1.5, y + 1.5, s - 3, s - 3, s * 0.12);
        ctx.fill();
        const v = g[i];
        if (v === VAZIA) continue;
        let escala = 1, dx = 0, afundar = 0, piscar = false;
        const a = this.anims.get(i);
        if (a) {
          const t = agora - a.t0;
          if (a.tipo === "assentar") {
            const k = Math.min(1, t / cfg.ANIM_ASSENTAR_MS);
            escala = cfg.ASSENTAR_ESCALA_INICIAL + (1 - cfg.ASSENTAR_ESCALA_INICIAL) * (1 - (1 - k) * (1 - k));
            if (k >= 1) this.anims.delete(i);
            else continuar = true;
          } else if (a.tipo === "abanar") {
            const k = Math.min(1, t / cfg.ANIM_ABANAR_MS);
            dx = Math.sin(k * Math.PI * 4) * cfg.ABANAR_AMPLITUDE_PX * (1 - k);
            if (k >= 1) this.anims.delete(i);
            else continuar = true;
          } else if (a.tipo === "pista") {
            const dur = (_a = cfg.ANIM_PISTA_MS) != null ? _a : 1200, vezes = (_b = cfg.PISTA_PISCAR) != null ? _b : 3;
            const k = Math.min(1, t / dur);
            escala = 1 - 0.18 * Math.abs(Math.sin(k * Math.PI * vezes));
            piscar = Math.sin(k * Math.PI * vezes * 2) > 0;
            if (k >= 1) this.anims.delete(i);
            else continuar = true;
          }
        }
        if (tRes >= 0) {
          const atraso = (l + c) / Math.max(1, 2 * n - 2) * T * 0.6;
          afundar = Math.max(0, Math.min(1, (tRes - atraso) / (T * 0.4)));
          escala *= 1 - (1 - cfg.RESOLVIDO_AFUNDAR) * afundar;
        }
        const dada = p.dadas[i] !== VAZIA;
        const aviso = piscar || mostrarAvisos && this.avisos.celulas.has(i);
        desenharPedra(ctx, C, x + dx, y, s, v, escala, dada, aviso, afundar);
      }
    }
    const TR = (_c = cfg.ANIM_REVELA_MS) != null ? _c : 600;
    const tRev = this.revela && tRes >= 0 ? tRes - T : -1;
    if (tRev >= 0) {
      const larg = 0.4;
      for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) {
        if (g[l * n + c] !== PRETA) continue;
        const fase = tRev / TR * (1 + larg) - (l + c) / Math.max(1, 2 * n - 2);
        if (fase < 0 || fase > larg) continue;
        ctx.save();
        ctx.globalAlpha = 0.85 * Math.sin(fase / larg * Math.PI);
        ctx.fillStyle = (_e = (_d = C.revela) != null ? _d : cfg.REVELA_COR) != null ? _e : "#e8b04a";
        arredondado(ctx, gx0 + c * s + s * 0.1, gy0 + l * s + s * 0.1, s * 0.8, s * 0.8, s * 0.14);
        ctx.fill();
        ctx.restore();
      }
    }
    this.desenharJuntas(ctx, C, p, gx0, gy0, s);
    if (p.variante === "contra_espelho") {
      ctx.save();
      ctx.strokeStyle = C.eixo;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(gx0 + grelha / 2, gy0 - borda + 2);
      ctx.lineTo(gx0 + grelha / 2, gy0 + grelha + borda - 2);
      ctx.stroke();
      ctx.restore();
    }
    if (p.variante === "orla") {
      const piscaOrla = this.avisosVisiveis() && this.avisos.regras.has("orla") && Math.floor(agora / 350) % 2 === 0;
      ctx.save();
      ctx.strokeStyle = piscaOrla ? C.aviso : C.eixo;
      ctx.lineWidth = piscaOrla ? 4 : 2.5;
      ctx.setLineDash([]);
      ctx.globalAlpha = piscaOrla ? 1 : 0.75;
      arredondado(ctx, gx0 + 1, gy0 + 1, grelha - 2, grelha - 2, 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(gx0 + s + 1, gy0 + s + 1, grelha - 2 * s - 2, grelha - 2 * s - 2);
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      if (this.avisos.regras.has("orla") && this.avisosVisiveis()) continuar = true;
    }
    if (this.guia && tRes < 0 && this.guia.i < n * n) {
      const gl = Math.floor(this.guia.i / n), gc = this.guia.i % n;
      const k = (agora - (this.guiaT0 || 0)) % cfg.GUIA_PULSO_MS / cfg.GUIA_PULSO_MS;
      desenharGuia(ctx, (_f = C.guia) != null ? _f : cfg.GUIA_COR, gx0 + gc * s, gy0 + gl * s, s, k, this.guia.mao);
      soGuia = true;
    }
    if (tRes >= 0) {
      if (tRes < T + (this.revela ? TR : 0)) continuar = true;
      else this.terminarResolvido();
    }
    if (continuar) this.pedirDesenho();
    else if (soGuia) this.pedirDesenhoGuia();
  }
  // T-437: a pulsação da guia limita-se a ~25 fps (setTimeout + rAF) em vez de redesenhar o tabuleiro a cada frame.
  pedirDesenhoGuia() {
    var _a;
    if (this.pedidoFrame || this.temporizadorGuia) return;
    this.temporizadorGuia = setTimeout(() => {
      this.temporizadorGuia = 0;
      this.pedirDesenho();
    }, (_a = this.cfg.GUIA_INTERVALO_MS) != null ? _a : 40);
  }
  desenharJuntas(ctx, C, p, gx0, gy0, s) {
    const n = p.n;
    const r = Math.max(7, s * 0.17);
    ctx.save();
    ctx.font = `bold ${Math.round(r * 1.5)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const j of p.juntas) {
      const la = Math.floor(j.a / n), ca = j.a % n, lb = Math.floor(j.b / n), cb = j.b % n;
      const x = gx0 + ((ca + cb) / 2 + 0.5) * s, y = gy0 + ((la + lb) / 2 + 0.5) * s;
      ctx.fillStyle = C.juntaFundo;
      ctx.strokeStyle = C.junta;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C.junta;
      ctx.fillText(j.igual ? "=" : "\xD7", x, y + 1);
    }
    ctx.restore();
  }
}
function desenharPedra(ctx, C, x, y, s, v, escala, dada, aviso, afundar) {
  const inset = s * 0.1;
  const lado = (s - 2 * inset) * escala;
  const cx = x + s / 2, cy = y + s / 2;
  const px = cx - lado / 2, py = cy - lado / 2, raio = lado * 0.2;
  const preta = v === PRETA;
  ctx.save();
  if (afundar < 1) {
    ctx.globalAlpha = 1 - afundar;
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    arredondado(ctx, px + 1.5, py + 2.5, lado, lado, raio);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = preta ? C.preta : C.branca;
  arredondado(ctx, px, py, lado, lado, raio);
  ctx.fill();
  if (!preta) {
    ctx.strokeStyle = C.brancaContorno;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  if (dada) {
    const k = lado * 0.22;
    ctx.strokeStyle = preta ? C.pretaRelevo : C.brancaRelevo;
    ctx.lineWidth = 2;
    arredondado(ctx, px + k, py + k, lado - 2 * k, lado - 2 * k, raio * 0.6);
    ctx.stroke();
  }
  if (aviso) {
    ctx.strokeStyle = C.aviso;
    ctx.lineWidth = 3;
    arredondado(ctx, px - 1, py - 1, lado + 2, lado + 2, raio);
    ctx.stroke();
  }
  ctx.restore();
}
function desenharGuia(ctx, cor2, x, y, s, k, mao) {
  const onda = 0.5 - 0.5 * Math.cos(k * Math.PI * 2);
  ctx.save();
  ctx.strokeStyle = cor2;
  ctx.lineWidth = 3 + 2 * onda;
  ctx.globalAlpha = 0.65 + 0.35 * onda;
  const m = 1 - 3 * onda;
  arredondado(ctx, x + m, y + m, s - 2 * m, s - 2 * m, s * 0.16);
  ctx.stroke();
  ctx.globalAlpha = 1;
  if (mao) {
    const u = s / 48, d = 4 * u * onda;
    const px = x + s * 0.55 + d, py = y + s * 0.55 + d;
    ctx.translate(px, py);
    ctx.rotate(-Math.PI / 6);
    ctx.lineJoin = "round";
    ctx.fillStyle = "#fffaf0";
    ctx.strokeStyle = "#3a2f22";
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.moveTo(-4 * u, 2 * u);
    ctx.lineTo(-4 * u, -14 * u);
    ctx.arc(0, -14 * u, 4 * u, Math.PI, 0);
    ctx.lineTo(4 * u, 4 * u);
    ctx.quadraticCurveTo(12 * u, 2 * u, 13 * u, 8 * u);
    ctx.lineTo(13 * u, 18 * u);
    ctx.quadraticCurveTo(12 * u, 26 * u, 2 * u, 26 * u);
    ctx.lineTo(-6 * u, 26 * u);
    ctx.quadraticCurveTo(-13 * u, 24 * u, -13 * u, 14 * u);
    ctx.lineTo(-13 * u, 8 * u);
    ctx.quadraticCurveTo(-12 * u, 2 * u, -4 * u, 2 * u);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4 * u, 9 * u);
    ctx.lineTo(4 * u, 14 * u);
    ctx.moveTo(-4 * u, 9 * u);
    ctx.lineTo(-4 * u, 14 * u);
    ctx.stroke();
  }
  ctx.restore();
}
function arredondado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export {
  Tabuleiro,
  casaNoPonto,
  geometria
};
