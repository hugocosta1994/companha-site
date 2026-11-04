import { escolherJogada } from "./ia.js";
import { mulberry32 } from "./prng.js";
const rngApos1 = (s) => {
  const r = mulberry32(s);
  r();
  return r;
};
const URL_WORKER = new URL("./ia-worker.js", import.meta.url).href;
let w = null, falhou = false, seq = 0;
const pend = /* @__PURE__ */ new Map();
function criar() {
  if (typeof Worker === "undefined") return null;
  for (const tipo of [void 0, "module"]) {
    try {
      const x = tipo ? new Worker(URL_WORKER, { type: tipo }) : new Worker(URL_WORKER);
      x.onmessage = (ev) => {
        const r = pend.get(ev.data.id);
        if (r) {
          pend.delete(ev.data.id);
          r(ev.data);
        }
      };
      x.onerror = () => {
        if (w === x) {
          w = null;
          falhou = true;
        }
        x.terminate();
        for (const [, r] of pend) r({ erro: "worker" });
        pend.clear();
      };
      return x;
    } catch {
    }
  }
  return null;
}
function escolherJogadaAsync(e, opcoes) {
  const sinc = () => escolherJogada(e, { nivel: opcoes.nivel, personalidade: opcoes.personalidade, rng: rngApos1(opcoes.semente) });
  if (falhou) return Promise.resolve(sinc());
  if (!w) w = criar();
  if (!w) {
    falhou = true;
    return Promise.resolve(sinc());
  }
  const id = ++seq;
  return new Promise((res) => {
    pend.set(id, (r) => res(r.erro ? sinc() : r.m));
    try {
      w.postMessage({ id, e, opcoes });
    } catch {
      pend.delete(id);
      res(sinc());
    }
  });
}
function aquecerIA(e) {
  try {
    escolherJogadaAsync(e, { nivel: "aprendiz", semente: 1 });
  } catch {
  }
}
export {
  aquecerIA,
  escolherJogadaAsync
};
