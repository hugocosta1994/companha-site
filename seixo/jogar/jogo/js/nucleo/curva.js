const faixaDe = (p) => {
  const f = p.faixa || p.dificuldade;
  return f === "F" || f === "facil" ? "F" : f === "D" || f === "dificil" ? "D" : "M";
};
const n2De = (p) => p.classificacao && p.classificacao.passos && p.classificacao.passos.N2 || 0;
const nivelDe = (p) => ({ N1: 1, N2: 2, N3: 3 })[p.classificacao && p.classificacao.nivelMax] || 1;
function violacoesDaCurva(puzzles) {
  const ps = [...puzzles].sort((a, b) => a.ordem - b.ordem), v = [];
  for (let i = 0; i < ps.length; i += 5) {
    const d = ps.slice(i, i + 5).filter((p) => faixaDe(p) === "D").length;
    if (d > 1) v.push({ regra: "a", ordem: ps[i].ordem, texto: `bloco ${i / 5 + 1} com ${d} Dif\xEDceis` });
  }
  for (let i = 0; i + 1 < ps.length; i++) {
    if (faixaDe(ps[i]) !== "D") continue;
    const s = ps[i + 1];
    if (faixaDe(s) === "D" || faixaDe(s) === "M" && n2De(s) > 6) v.push({ regra: "b", ordem: s.ordem, texto: "a seguir a Dif\xEDcil" });
  }
  const vistas = /* @__PURE__ */ new Set(["equilibrio"]);
  let base = 0;
  for (const p of ps) {
    const va = p.variante || "equilibrio";
    if (va === "equilibrio") {
      base++;
      continue;
    }
    if (!vistas.has(va)) {
      if (base < 2) v.push({ regra: "c", ordem: p.ordem, texto: `${va} antes de 2 puzzles da base` });
      if (faixaDe(p) === "D") v.push({ regra: "c", ordem: p.ordem, texto: `${va} novo como Dif\xEDcil` });
      vistas.add(va);
    }
  }
  return v;
}
const ALIVIO_APOS = 3;
function sugerido(candidatos, { resolvidos = /* @__PURE__ */ new Set(), ultimos = [], tecnicaMax = 1 } = {}) {
  const por = candidatos.filter((p) => !resolvidos.has(p.id));
  const aperto = ultimos.slice(0, ALIVIO_APOS).length === ALIVIO_APOS && ultimos.slice(0, ALIVIO_APOS).every((p) => nivelDe(p) > tecnicaMax);
  if (aperto) {
    const alivio = por.find((p) => faixaDe(p) !== "D" && nivelDe(p) <= tecnicaMax + 1);
    if (alivio) return alivio;
  }
  return por.find((p) => nivelDe(p) <= tecnicaMax + 1 && !(aperto && faixaDe(p) === "D")) || null;
}
function tecnicaMaxDe(doc, infoDe) {
  let t = 1;
  for (const [id, reg] of Object.entries(doc.puzzles || {})) {
    if (reg && reg.estado === "resolvido") {
      const p = infoDe(id);
      if (p) t = Math.max(t, nivelDe(p));
    }
  }
  return t;
}
const TEMPO_ALVO_MIN = Object.freeze({ F: [1, 2], M: [2, 4], D: [4, 7] });
function faixaMedida(p) {
  const s = p.classificacao && p.classificacao.passos || {};
  if ((s.N3 || 0) >= 1) return "D";
  if ((s.N2 || 0) >= 1) return "M";
  return "F";
}
function tempoEstimadoMin(p) {
  const s = p.classificacao && p.classificacao.passos || {}, f = faixaMedida(p), [lo, hi] = TEMPO_ALVO_MIN[f];
  return Math.min(hi, Math.max(lo, lo + 0.15 * (s.N2 || 0) + 0.6 * (s.N3 || 0)));
}
const faixaEtiquetada = faixaDe;
function violacoesDeTempo(puzzles) {
  const ps = [...puzzles].sort((a, b) => a.ordem - b.ordem), v = [];
  let soma = 0;
  for (const p of ps) {
    const f = faixaDe(p), t = tempoEstimadoMin(p), [lo, hi] = TEMPO_ALVO_MIN[f];
    soma += t;
    if (faixaMedida(p) !== f) v.push({ regra: "t", ordem: p.ordem, texto: `faixa medida ${faixaMedida(p)} \u2260 etiqueta ${f}` });
    if (t < lo || t > hi) v.push({ regra: "t", ordem: p.ordem, texto: `tempo ${t} fora de ${lo}-${hi}` });
  }
  if (ps.length === 20 && (soma < 40 || soma > 70)) v.push({ regra: "t", ordem: 0, texto: `pacote soma ${soma.toFixed(1)} min fora de 40-70` });
  return v;
}
function violacoesDeDiarios(dias, diaDaSemana) {
  const v = [];
  let anterior = null;
  for (const d of [...dias].sort((a, b) => a.data < b.data ? -1 : 1)) {
    const f = faixaDe(d), w = diaDaSemana(d.data);
    if (f === "D" && w !== 4 && w !== 5) v.push({ regra: "dia", data: d.data, texto: "Dif\xEDcil fora de Sex/S\xE1b" });
    if (f === "D" && d.fase !== void 0 && d.fase < 3) v.push({ regra: "dia", data: d.data, texto: "Dif\xEDcil antes da fase 3" });
    if (w === 6 && f !== "M") v.push({ regra: "dia", data: d.data, texto: "domingo deve ser M\xE9dio" });
    if (f === "D" && anterior && anterior.f === "D" && diasEntre(anterior.data, d.data) === 1) v.push({ regra: "dia", data: d.data, texto: "dois Dif\xEDceis seguidos" });
    anterior = { data: d.data, f };
  }
  return v;
}
const diasEntre = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
export {
  ALIVIO_APOS,
  TEMPO_ALVO_MIN,
  faixaEtiquetada,
  faixaMedida,
  sugerido,
  tecnicaMaxDe,
  tempoEstimadoMin,
  violacoesDaCurva,
  violacoesDeDiarios,
  violacoesDeTempo
};
