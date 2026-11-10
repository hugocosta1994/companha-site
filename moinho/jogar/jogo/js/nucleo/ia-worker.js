(() => {
  // jogo/js/config.js
  var PECAS = 9;
  var SEM_CAPTURA_MAX = 50;
  var AVALIACAO = { pecas: 100, moinhos: 40, quase: 25, mobilidade: 5, bloqueadas: -15, bonusVoo: 30 };
  var NIVEIS = {
    aprendiz: { profundidade: 1, acaso: 0.4, ignoraMoinho: 1 / 3, pensa: [300, 600], limiteMs: 50 },
    facil: { profundidade: 2, acaso: 0.25, pensa: [400, 700], limiteMs: 150 },
    media: { profundidade: 3, acaso: 0, pensa: [400, 700], limiteMs: 300, abertura: { margem: 15 } },
    atenta: { profundidade: 4, acaso: 0.05, acasoSeguro: true, pensa: [450, 800], limiteMs: 300, abertura: { margem: 15 } },
    dificil: { profundidade: 5, acaso: 0.1, acasoSeguro: true, pensa: [500, 900], limiteMs: 300, abertura: { margem: 10 } },
    mestre: { profundidade: 5, profundidadeMax: 7, acaso: 0, pensa: [600, 1e3], limiteMs: 360, abertura: { margem: 10 } }
  };
  var ABERTURA = { meias: 6, profMax: 4 };
  var IA_MAX_MS = 300;
  var PERSONALIDADES = {
    equilibrada: { id: "equilibrada", pesos: { pecas: 100, moinhos: 40, quase: 25, mobilidade: 5, bloqueadas: -15 }, desempate: null },
    prudente: { id: "prudente", pesos: { pecas: 100, moinhos: 25, quase: 10, mobilidade: 10, bloqueadas: -30 }, desempate: "ameacas" },
    agressiva: { id: "agressiva", pesos: { pecas: 100, moinhos: 70, quase: 60, mobilidade: 8, bloqueadas: -20 }, desempate: "quase" },
    mobilidade: { id: "mobilidade", pesos: { pecas: 80, moinhos: 30, quase: 20, mobilidade: 15, bloqueadas: -25 }, desempate: "destinos" }
  };
  var PERSONALIDADE_PADRAO = "equilibrada";
  var MODOS_STATS = ["ia_aprendiz", "ia_facil", "ia_media", "ia_atenta", "ia_dificil", "ia_mestre", "dois", "codigo", "alq_facil", "alq_media", "alq_dificil"];
  var MODOS_STATS_ATIVOS = MODOS_STATS.filter((k) => !k.startsWith("alq_"));

  // jogo/js/nucleo/tabuleiro.js
  var N = 24;
  var ADJ = Array.from({ length: N }, (_, p) => {
    const s = Math.floor(p / 8), i = p % 8, v = [s * 8 + (i + 1) % 8, s * 8 + (i + 7) % 8];
    if (i % 2 === 1) {
      if (s > 0) v.push(p - 8);
      if (s < 2) v.push(p + 8);
    }
    return v.sort((a, b) => a - b);
  });
  var MOINHOS = (() => {
    const l = [];
    for (let s = 0; s < 3; s++) for (const k of [0, 2, 4, 6]) l.push([s * 8 + k, s * 8 + k + 1, s * 8 + (k + 2) % 8]);
    for (const i of [1, 3, 5, 7]) l.push([i, 8 + i, 16 + i]);
    return l;
  })();
  var MOINHOS_DO_PONTO = Array.from({ length: N }, (_, p) => MOINHOS.filter((m) => m.includes(p)));

  // jogo/js/nucleo/regras.js
  var outro = (j) => 3 - j;
  var noTabuleiro = (e, j) => {
    let n = 0;
    for (let p = 0; p < N; p++) if (e.celas[p] === j) n++;
    return n;
  };
  var totalPecas = (e, j) => noTabuleiro(e, j) + e.porColocar[j];
  function fase(e, j = e.vez) {
    if (e.porColocar[j] > 0) return "colocar";
    return noTabuleiro(e, j) === 3 ? "voar" : "mover";
  }
  var emMoinho = (celas, p) => MOINHOS_DO_PONTO[p].some((m) => m.every((q) => celas[q] === celas[p]));
  function removiveis(e, j = e.vez) {
    const adv = outro(j), todas = [];
    for (let p = 0; p < N; p++) if (e.celas[p] === adv) todas.push(p);
    const fora = todas.filter((p) => !emMoinho(e.celas, p));
    return fora.length ? fora : todas;
  }
  function livres(e) {
    const r = [];
    for (let p = 0; p < N; p++) if (e.celas[p] === 0) r.push(p);
    return r;
  }
  function destinos(e, de) {
    if (e.fim || e.remover) return [];
    const f = fase(e);
    if (f === "colocar") return de === void 0 ? livres(e) : [];
    if (de === void 0 || e.celas[de] !== e.vez) return [];
    return f === "voar" ? livres(e) : ADJ[de].filter((q) => e.celas[q] === 0);
  }
  function jogadasSimples(e) {
    if (e.fim || e.remover) return [];
    if (fase(e) === "colocar") return livres(e).map((para) => ({ para }));
    const r = [];
    for (let de = 0; de < N; de++) if (e.celas[de] === e.vez) for (const para of destinos(e, de)) r.push({ de, para });
    return r;
  }
  function legal(e, m) {
    if (e.fim || e.remover) return false;
    return m.de === void 0 ? fase(e) === "colocar" && e.celas[m.para] === 0 : destinos(e, m.de).includes(m.para);
  }
  function jogar(e, m) {
    if (!legal(e, m)) throw new Error("jogada ilegal");
    return passo(e, m);
  }
  function passo(e, m) {
    const celas = e.celas.slice(), por = e.porColocar.slice(), j = e.vez;
    const f = fase(e);
    if (m.de === void 0) por[j]--;
    else celas[m.de] = 0;
    celas[m.para] = j;
    const mills = MOINHOS_DO_PONTO[m.para].filter((l) => l.every((q) => celas[q] === j));
    const n = { celas, porColocar: por, vez: j, remover: mills.length > 0, semCaptura: f === "colocar" ? 0 : e.semCaptura + 1, fim: null, ultimoMoinho: mills.length ? mills : null };
    return n.remover ? n : passarVez(n);
  }
  function remover(e, p) {
    if (!e.remover || !removiveis(e).includes(p)) throw new Error("remo\xE7\xE3o ilegal");
    return tirar(e, p);
  }
  function tirar(e, p) {
    const celas = e.celas.slice();
    celas[p] = 0;
    const n = { celas, porColocar: e.porColocar, vez: e.vez, remover: false, semCaptura: 0, fim: null, ultimoMoinho: null };
    if (totalPecas(n, outro(e.vez)) < 3) {
      n.fim = { resultado: e.vez, motivo: "duas_pecas" };
      return n;
    }
    return passarVez(n);
  }
  function temMovimento(n) {
    const c = n.celas, j = n.vez;
    for (let p = 0; p < N; p++) if (c[p] === j) {
      for (const q of ADJ[p]) if (c[q] === 0) return true;
    }
    return false;
  }
  function passarVez(n) {
    n.vez = outro(n.vez);
    if (n.semCaptura >= SEM_CAPTURA_MAX) n.fim = { resultado: 0, motivo: "cinquenta" };
    else if (fase(n) === "mover" && !temMovimento(n)) n.fim = { resultado: outro(n.vez), motivo: "sem_movimentos" };
    return n;
  }
  function aplicar(e, m) {
    const n = jogar(e, m);
    return n.remover ? remover(n, m.tirar) : n;
  }
  function jogadasCompletas(e) {
    const r = [];
    for (const m of jogadasSimples(e)) {
      const n = jogar(e, m);
      if (n.remover) for (const t of removiveis(n)) r.push({ ...m, tirar: t });
      else r.push(m);
    }
    return r;
  }
  function filhosCompletos(e) {
    const r = [];
    for (const m of jogadasSimples(e)) {
      const n = passo(e, m);
      if (n.remover) for (const t of removiveis(n)) r.push({ m: { ...m, tirar: t }, n: tirar(n, t) });
      else r.push({ m, n });
    }
    return r;
  }

  // jogo/js/nucleo/ia.js
  var VITORIA = 1e5;
  function lado(e, j) {
    const c = e.celas;
    let moinhos = 0, quase = 0, bloq = 0, mob = 0;
    for (const m of MOINHOS) {
      let a = 0, v = 0;
      for (const p of m) {
        if (c[p] === j) a++;
        else if (c[p] === 0) v++;
      }
      if (a === 3) moinhos++;
      else if (a === 2 && v === 1) quase++;
    }
    for (let p = 0; p < N; p++) if (c[p] === j) {
      let l = 0;
      for (const q of ADJ[p]) if (c[q] === 0) l++;
      if (l === 0) bloq++;
      mob += l;
    }
    return { moinhos, quase, bloq, mob, voa: e.porColocar[j] === 0 && noTabuleiro(e, j) === 3 };
  }
  function avaliar(e, j, W = AVALIACAO) {
    const a = lado(e, j), b = lado(e, outro(j));
    let v = (totalPecas(e, j) - totalPecas(e, outro(j))) * W.pecas + (a.moinhos - b.moinhos) * W.moinhos + (a.quase - b.quase) * W.quase + (a.mob - b.mob) * W.mobilidade + (a.bloq - b.bloq) * W.bloqueadas;
    if (a.voa && !b.voa) v += W.bonusVoo;
    if (b.voa && !a.voa) v -= W.bonusVoo;
    return v;
  }
  var ordenar = (ms) => ms.sort((x, y) => (y.tirar !== void 0) - (x.tirar !== void 0));
  var Tempo = class extends Error {
  };
  function pesquisa(e, prof, alfa, beta, raiz, ctx) {
    const W = ctx.W;
    if ((++ctx.nos & 7) === 0 && ctx.limite && Date.now() > ctx.limite) throw new Tempo();
    if (e.fim) return e.fim.resultado === 0 ? 0 : e.fim.resultado === raiz ? VITORIA + prof : -VITORIA - prof;
    if (prof === 0) return avaliar(e, raiz, W);
    const fs = filhosCompletos(e);
    fs.sort((x, y) => (y.m.tirar !== void 0) - (x.m.tirar !== void 0));
    if (e.vez === raiz) {
      let melhor2 = -Infinity;
      for (const f of fs) {
        melhor2 = Math.max(melhor2, pesquisa(f.n, prof - 1, alfa, beta, raiz, ctx));
        alfa = Math.max(alfa, melhor2);
        if (alfa >= beta) break;
      }
      return melhor2;
    }
    let melhor = Infinity;
    for (const f of fs) {
      melhor = Math.min(melhor, pesquisa(f.n, prof - 1, alfa, beta, raiz, ctx));
      beta = Math.min(beta, melhor);
      if (alfa >= beta) break;
    }
    return melhor;
  }
  function momentoCritico(e, ms) {
    if (ms.some((m) => m.tirar !== void 0)) return true;
    return jogadasCompletas({ ...e, vez: outro(e.vez) }).some((m) => m.tirar !== void 0);
  }
  function ameacasAdversarias(n, j) {
    const adv = { ...n, vez: outro(j), remover: false };
    if (n.fim) return 0;
    let c = 0;
    for (const m of jogadasSimples(adv)) if (jogar(adv, m).remover) c++;
    return c;
  }
  var METRICAS = {
    ameacas: (n, j) => -ameacasAdversarias(n, j),
    quase: (n, j) => lado(n, j).quase,
    destinos: (n, j) => lado(n, j).mob
  };
  var meiasJogadas = (e) => 2 * PECAS - e.porColocar[1] - e.porColocar[2];
  function variarAbertura(e, ms, P, margem, rng, ctx) {
    let vals = null;
    for (let d = 1; d <= P; d++) {
      const v = new Array(ms.length);
      let melhor = -Infinity;
      try {
        for (let k = 0; k < ms.length; k++) {
          if (ctx.limite && Date.now() > ctx.limite) throw new Tempo();
          v[k] = pesquisa(aplicar(e, ms[k]), d - 1, melhor === -Infinity ? -Infinity : melhor - margem - 1, Infinity, e.vez, ctx);
          if (v[k] > melhor) melhor = v[k];
        }
      } catch (x) {
        if (x instanceof Tempo) break;
        throw x;
      }
      vals = { v, melhor, d };
    }
    if (!vals) return null;
    const cand = ms.filter((_, k) => vals.v[k] >= vals.melhor - margem);
    return { m: cand[Math.floor(rng() * cand.length)], d: vals.d };
  }
  function escolherJogada(e, { nivel = "media", rng = Math.random, semLimite = false, profundidade, personalidade = PERSONALIDADE_PADRAO, info = null, variar = true } = {}) {
    const t0 = Date.now();
    const cfg = NIVEIS[nivel];
    const pers = PERSONALIDADES[personalidade] || PERSONALIDADES[PERSONALIDADE_PADRAO];
    const W = { ...AVALIACAO, ...pers.pesos };
    const ms = ordenar(jogadasCompletas(e));
    if (!ms.length) return null;
    if (cfg.ignoraMoinho && ms.some((m) => m.tirar !== void 0) && rng() < cfg.ignoraMoinho) {
      const sem = ms.filter((m) => m.tirar === void 0);
      if (sem.length) return sem[Math.floor(rng() * sem.length)];
    }
    const livre = !cfg.acasoSeguro || fase(e) !== "voar" && !momentoCritico(e, ms);
    if (cfg.acaso && livre && rng() < cfg.acaso) return ms[Math.floor(rng() * ms.length)];
    const D = profundidade || cfg.profundidadeMax || cfg.profundidade;
    const ctx = { W, nos: 0, limite: semLimite ? 0 : t0 + Math.round((cfg.limiteMs || IA_MAX_MS) * 0.65) };
    if (cfg.abertura && variar && meiasJogadas(e) < ABERTURA.meias && !momentoCritico(e, ms)) {
      const r = variarAbertura(e, ms.slice(), Math.min(cfg.profundidade, ABERTURA.profMax), cfg.abertura.margem, rng, ctx);
      if (r) {
        if (info) {
          info.profundidade = r.d;
          info.degradou = r.d < Math.min(cfg.profundidade, ABERTURA.profMax);
          info.abertura = true;
        }
        return r.m;
      }
    }
    let escolhida = ms[0];
    let melhorFinal = -Infinity, dFeito = 0;
    for (let d = 1; d <= D; d++) {
      let melhorV = -Infinity, melhor = null;
      try {
        for (const m of ms) {
          if (ctx.limite && Date.now() > ctx.limite) throw new Tempo();
          const v = pesquisa(aplicar(e, m), d - 1, melhorV, Infinity, e.vez, ctx);
          if (v > melhorV) {
            melhorV = v;
            melhor = m;
          }
        }
      } catch (x) {
        if (x instanceof Tempo) break;
        throw x;
      }
      escolhida = melhor;
      melhorFinal = melhorV;
      dFeito = d;
      ms.splice(ms.indexOf(melhor), 1);
      ms.unshift(melhor);
      if (melhorV >= VITORIA) break;
    }
    if (info) {
      info.profundidade = dFeito;
      info.degradou = dFeito < D;
    }
    if (pers.desempate && ms.length > 1 && dFeito > 0 && melhorFinal < VITORIA) {
      try {
        const empatadas = [escolhida];
        for (const m of ms) {
          if (m === escolhida) continue;
          if (ctx.limite && Date.now() > ctx.limite) throw new Tempo();
          const v = pesquisa(aplicar(e, m), dFeito - 1, melhorFinal - 1, Infinity, e.vez, ctx);
          if (v >= melhorFinal) empatadas.push(m);
        }
        if (empatadas.length > 1) {
          const f = METRICAS[pers.desempate];
          let melhorM = escolhida, melhorS = f(aplicar(e, escolhida), e.vez);
          for (const m of empatadas) {
            const sc = f(aplicar(e, m), e.vez);
            if (sc > melhorS) {
              melhorS = sc;
              melhorM = m;
            }
          }
          escolhida = melhorM;
        }
      } catch (x) {
        if (!(x instanceof Tempo)) throw x;
      }
    }
    return escolhida;
  }

  // jogo/js/nucleo/prng.js
  function mulberry32(a) {
    return function() {
      a |= 0;
      a = a + 1831565813 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // jogo/js/nucleo/ia-worker.js
  var rngApos1 = (s) => {
    const r = mulberry32(s);
    r();
    return r;
  };
  self.onmessage = (ev) => {
    const { id, e, opcoes } = ev.data;
    try {
      self.postMessage({ id, m: escolherJogada(e, { ...opcoes, rng: rngApos1(opcoes.semente) }) });
    } catch (x) {
      self.postMessage({ id, erro: String(x && x.message || x) });
    }
  };
})();
