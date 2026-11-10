import { CHAVE_META, validarMeta, CONQUISTAS } from "./meta.js";
import { validarStats } from "./estatisticas.js";
const VERSAO_META = 2;
const CHAVE_META_BAK = "moinho_meta_bak";
const seguro = (f, d = null) => {
  try {
    return f();
  } catch {
    return d;
  }
};
const json = (t) => seguro(() => JSON.parse(t));
function conquistasRetroativas(stats, nPuzzles) {
  const modos = Object.entries(stats).filter(([k]) => k !== "_g").map(([, m]) => m);
  const ia = Object.entries(stats).filter(([k]) => k.startsWith("ia_") || k.startsWith("alq_")).reduce((s, [, m]) => s + m.v, 0);
  const partidas = modos.reduce((s, m) => s + m.partidas, 0), vitorias = modos.reduce((s, m) => s + m.v, 0);
  return {
    primeira_vitoria: ia >= 1,
    dez: partidas >= 10,
    cem: partidas >= 100,
    cinquenta: vitorias >= 50,
    voar: modos.some((m) => m.fase3 > 0),
    primeiro_puzzle: nPuzzles >= 1,
    puzzles: nPuzzles >= 10
  };
}
function migrarSaves(ar) {
  var _a;
  const out = { novas: [], erro: false };
  try {
    const bruto = seguro(() => ar.get(CHAVE_META));
    if (bruto === null || bruto === void 0) return out;
    let x = json(bruto);
    if (!x || typeof x !== "object" || Array.isArray(x)) {
      seguro(() => ar.set(CHAVE_META_BAK, bruto));
      seguro(() => ar.set(CHAVE_META, JSON.stringify(validarMeta(null))));
      return out;
    }
    if (Number.isFinite(x.v) && x.v > VERSAO_META) return out;
    const m = validarMeta(x);
    for (const [k, ch] of [["tema", "tab_tema"], ["peca", "tab_peca"], ["moldura", "tab_moldura"]]) {
      if (x[k] === void 0 || x[k] === "" || k === "tema" && m.tema === "madeira") {
        const t = seguro(() => ar.get(ch));
        const v = typeof t === "string" ? (_a = json(t)) != null ? _a : t : null;
        const t2 = validarMeta({ ...x, [k]: v })[k];
        if (typeof v === "string" && t2 === v && v !== "" && m[k] !== v) m[k] = v;
      }
    }
    const stats = validarStats(json(seguro(() => ar.get("tab_stats"))));
    const puz = json(seguro(() => ar.get("tab_puzzles")));
    const nP = puz && typeof puz === "object" ? Object.keys(puz).filter((k) => /^p[1-4]-[1-3]$/.test(k) && puz[k] === true).length : 0;
    if (x.v === void 0) {
      for (const [k, ok] of Object.entries(conquistasRetroativas(stats, nP))) if (ok && CONQUISTAS.includes(k) && !m.conquistas[k]) {
        m.conquistas[k] = true;
        out.novas.push(k);
      }
    }
    m.v = VERSAO_META;
    const novo = JSON.stringify(m);
    if (novo !== bruto) seguro(() => ar.set(CHAVE_META, novo));
  } catch {
    out.erro = true;
  }
  return out;
}
export {
  CHAVE_META_BAK,
  VERSAO_META,
  conquistasRetroativas,
  migrarSaves
};
