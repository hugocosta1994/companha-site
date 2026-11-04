(function(global) {
  "use strict";
  var ctx = null, master = null, ligado = true, vol = 0.8, cena = [];
  function init() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    master.gain.value = ligado ? vol : 0;
    var comp = ctx.createDynamicsCompressor();
    if (comp.threshold) {
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.attack.value = 3e-3;
      comp.release.value = 0.2;
    }
    master.connect(comp);
    comp.connect(ctx.destination);
    if (!comp.threshold) {
      master.disconnect();
      master.connect(ctx.destination);
    }
    return ctx;
  }
  function desbloquear() {
    if (init() && ctx.state === "suspended") ctx.resume();
  }
  function noiseBuf() {
    if (noiseBuf.b) return noiseBuf.b;
    var n = ctx.sampleRate * 2, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf.b = b;
  }
  function tom(f, dur, tipo, v, at, f2, atq) {
    if (!init() || !ligado) return;
    var t = ctx.currentTime + (at || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo || "sine";
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    atq = atq || 5e-3;
    g.gain.setValueAtTime(1e-4, t);
    g.gain.linearRampToValueAtTime(v || 0.2, t + atq);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  function ruido(tipo, f, q, dur, v, at, f2, atq) {
    if (!init() || !ligado) return null;
    var t = ctx.currentTime + (at || 0), s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf();
    s.loop = true;
    fl.type = tipo;
    fl.frequency.setValueAtTime(f, t);
    fl.Q.value = q || 1;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(1e-4, t);
    g.gain.linearRampToValueAtTime(v || 0.2, t + (atq || 0.01));
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    s.connect(fl);
    fl.connect(g);
    g.connect(master);
    s.start(t);
    s.stop(t + dur + 0.05);
    return s;
  }
  function camada(tipo, f, q, v, lfoHz, lfoProf) {
    if (!init() || !ligado) return null;
    var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
    s.buffer = noiseBuf();
    s.loop = true;
    fl.type = tipo;
    fl.frequency.value = f;
    fl.Q.value = q || 0.7;
    g.gain.value = 1e-4;
    g.gain.linearRampToValueAtTime(v, ctx.currentTime + 2);
    l.frequency.value = lfoHz || 0.1;
    lg.gain.value = lfoProf || 0;
    l.connect(lg);
    lg.connect(g.gain);
    s.connect(fl);
    fl.connect(g);
    g.connect(master);
    s.start();
    l.start();
    var c = { parar: function() {
      try {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.linearRampToValueAtTime(1e-4, ctx.currentTime + 0.6);
        s.stop(ctx.currentTime + 0.7);
        l.stop(ctx.currentTime + 0.7);
      } catch (e) {
      }
    } };
    cena.push(c);
    return c;
  }
  function pararCena() {
    cena.forEach(function(c) {
      c.parar();
    });
    cena = [];
  }
  function suave(x) {
    if (!master) return;
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.setTargetAtTime(x, t, 0.015);
  }
  function setLigado(b) {
    ligado = !!b;
    suave(ligado ? vol : 0);
    if (!ligado) {
      pararCena();
      musicaParar();
    }
  }
  function setVolume(v) {
    vol = Math.max(0, Math.min(1, v));
    if (master && ligado) suave(vol);
  }
  function pausa() {
    musicaParar();
    pararCena();
    if (ctx && ctx.state === "running") {
      suave(0);
      setTimeout(function() {
        if (ctx.state === "running") ctx.suspend();
      }, 80);
    }
  }
  function retoma() {
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
      suave(ligado ? vol : 0);
    }
    if (emPartida && ligado && !mus) musicaIniciar();
  }
  var ultimo = {};
  function ouvir(bus, nome, fn) {
    var f = nome === "nota:tocada" ? fn : function(e) {
      var t = Date.now();
      if (t - (ultimo[nome] || 0) < 35) return;
      ultimo[nome] = t;
      fn(e);
    };
    if (bus && bus.on) bus.on(nome, f);
    else window.addEventListener(nome, function(e) {
      f(e.detail || {});
    });
  }
  var TEMAS = {
    madeira: { f: 1, brilho: 1, corpo: "triangle", vit: [262, 330, 392, 523] },
    pedra: { f: 0.7, brilho: 0.5, corpo: "sine", vit: [196, 262, 330, 392] },
    // ardósia: mais grave e surdo
    cer\u00E2mica: { f: 1.25, brilho: 1.6, corpo: "sine", vit: [330, 392, 494, 659] }
    // azulejo: mais claro, com tin
  };
  var tema = TEMAS.madeira;
  function definirTema(n) {
    tema = TEMAS[n] || TEMAS.madeira;
    return tema === TEMAS[n] ? n : "madeira";
  }
  function clack(f, v) {
    f *= tema.f * (1 + (Math.random() - 0.5) * 0.06);
    v = v || 0.2;
    tom(f, 0.09, tema.corpo, v, 0, f * 0.6);
    tom(f * 2.3, 0.04, "sine", v * 0.25 * tema.brilho, 0, f * 1.8);
    ruido("bandpass", 1800 * tema.brilho, 2, 0.04, 0.12 * Math.min(1, tema.brilho));
    if (tema.brilho > 1.3) tom(2637, 0.12, "sine", v * 0.06, 0.01);
  }
  function pedra(f, v) {
    tom(f, 0.35, "sine", v, 0, f * 0.7);
    tom(f * 1.5, 0.2, "sine", v * 0.3);
    ruido("lowpass", 500, 1, 0.08, 0.1);
  }
  var mus = null, emPartida = false, PENTA = [196, 220, 262, 294, 330, 392];
  function musicaIniciar() {
    musicaParar();
    mus = setInterval(function() {
      if (!ligado || !ctx || ctx.state !== "running") return;
      if (Math.random() < 0.6) {
        var f = PENTA[Math.floor(Math.random() * PENTA.length)] * tema.f;
        tom(f, 2.2, "sine", 0.018, 0, null, 0.4);
      }
    }, 2600);
  }
  function musicaParar() {
    if (mus) {
      clearInterval(mus);
      mus = null;
    }
  }
  function ligar(bus) {
    var cor = function(j) {
      return j === "brancas" || j === 0 ? 1 : 0.8;
    };
    ouvir(bus, "partida:iniciada", function(e) {
      desbloquear();
      if (e && e.tema) definirTema(e.tema);
      tom(392, 0.5, "sine", 0.08);
      tom(523, 0.6, "sine", 0.08, 0.12);
      emPartida = true;
      musicaIniciar();
    });
    ouvir(bus, "peca:colocada", function(e) {
      clack(260 * cor(e.jogador));
    });
    ouvir(bus, "peca:movida", function(e) {
      if (e.voo) {
        tom(500, 0.3, "sine", 0.12, 0, 1400);
        clack(300, 0.14);
      } else {
        ruido("lowpass", 700, 1, 0.12, 0.08, 0, 400);
        clack(250 * cor(e.jogador), 0.16);
      }
    });
    ouvir(bus, "moinho:fechado", function() {
      pedra(110, 0.22);
      clack(200, 0.2);
      [330, 440, 554].forEach(function(f, i) {
        tom(f, 0.6, "sine", 0.14, 0.08 + i * 0.09);
      });
    });
    ouvir(bus, "peca:removida", function() {
      ruido("highpass", 2500, 1, 0.14, 0.14);
      tom(700, 0.25, "triangle", 0.1, 0.02, 180);
    });
    ouvir(bus, "jogada:recusada", function() {
      tom(120, 0.07, "sine", 0.1);
    });
    ouvir(bus, "vez:mudou", function() {
      tom(1200, 0.04, "sine", 0.03);
    });
    ouvir(bus, "partida:fim", function(e) {
      emPartida = false;
      musicaParar();
      if (e.resultado === "empate") {
        tom(440, 1, "sine", 0.12);
        tom(660, 1, "sine", 0.1, 0.1);
      } else tema.vit.forEach(function(f, i) {
        tom(f, 1, "sine", 0.14, i * 0.15);
      });
    });
    ouvir(bus, "app:pausa", pausa);
    ouvir(bus, "app:retoma", retoma);
    ouvir(bus, "som:mudou", function(e) {
      setLigado(e.ligado);
    });
  }
  global.JogoAudio = { ligar, desbloquear, setLigado, setVolume, tema: definirTema };
})(window);
