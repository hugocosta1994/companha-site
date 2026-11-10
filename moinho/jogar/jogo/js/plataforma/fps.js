const LIMIAR_MS = 33;
function novoAcumulador() {
  return { n: 0, soma: 0, lentos: 0, max: 0, ultimo: 0 };
}
function registarFotograma(a, dt) {
  if (!(dt > 0) || dt > 5e3) return a;
  a.n++;
  a.soma += dt;
  a.ultimo = dt;
  if (dt > a.max) a.max = dt;
  if (dt > LIMIAR_MS) a.lentos++;
  return a;
}
function resumo(a) {
  if (!a.n) return { atual: 0, min: 0, medio: 0, pctLentos: 0 };
  return { atual: Math.round(1e3 / a.ultimo), min: Math.round(1e3 / a.max), medio: Math.round(1e3 / (a.soma / a.n)), pctLentos: Math.round(a.lentos / a.n * 1e3) / 10 };
}
function criarToques(alvo = 5, janela = 2e3, agora = () => Date.now()) {
  let n = 0, ult = 0;
  return () => {
    const t = agora();
    n = t - ult > janela ? 1 : n + 1;
    ult = t;
    if (n >= alvo) {
      n = 0;
      return true;
    }
    return false;
  };
}
function alternarContador(t, fmt, raf = globalThis.requestAnimationFrame, caf = globalThis.cancelAnimationFrame) {
  const doc = globalThis.document;
  let el = doc.getElementById("contador-fps");
  if (el) {
    el._parar();
    el.remove();
    return false;
  }
  el = doc.createElement("div");
  el.id = "contador-fps";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = "position:fixed;left:4px;bottom:4px;z-index:99999;background:rgba(0,0,0,.75);color:#0f0;font:11px monospace;padding:3px 5px;pointer-events:none;white-space:pre";
  const a = novoAcumulador();
  let id = 0, antes = 0, pinta = 0;
  const volta = (ts) => {
    if (antes) registarFotograma(a, ts - antes);
    antes = ts;
    if (ts - pinta > 500) {
      pinta = ts;
      const r = resumo(a);
      el.textContent = fmt("fps.linha", { a: r.atual, min: r.min, med: r.medio, p: r.pctLentos });
    }
    id = raf(volta);
  };
  el._parar = () => caf(id);
  doc.body.append(el);
  id = raf(volta);
  return true;
}
export {
  LIMIAR_MS,
  alternarContador,
  criarToques,
  novoAcumulador,
  registarFotograma,
  resumo
};
