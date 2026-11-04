import { reconstruir } from "./partida.js";
import { PERSONALIDADES, PERSONALIDADE_PADRAO } from "../config.js";
const VERSAO_GRAVACAO = 0;
import { NIVEIS_ORDEM as NIVEIS } from "../config.js";
const padrao = () => ({ versao: 0, partida: null, opcoes: { som: true, destaques: true, daltonico: false, vibrar: true }, tutorialVisto: false });
function partidaValida(s) {
  try {
    if (!s || typeof s !== "object" || !["ia", "2j"].includes(s.modo) || !NIVEIS.includes(s.nivel)) return null;
    if (![1, 2].includes(s.cor) || !Number.isInteger(s.semente) || !Array.isArray(s.historico)) return null;
    const p = reconstruir({ modo: s.modo, nivel: s.nivel, cor: s.cor, semente: s.semente }, s.historico);
    if (p.estado.fim || p.historico.length !== s.historico.length) return null;
    return { modo: s.modo, nivel: s.nivel, personalidade: PERSONALIDADES[s.personalidade] ? s.personalidade : PERSONALIDADE_PADRAO, cor: s.cor, semente: s.semente, posicao: p.estado.celas, vez: p.estado.vez, fase: s.fase, historico: s.historico };
  } catch {
    return null;
  }
}
function validarGravacao(texto) {
  const d = padrao();
  if (texto === null || texto === void 0 || texto === "") return { dados: d, aviso: false };
  let g;
  try {
    g = typeof texto === "string" ? JSON.parse(texto) : texto;
  } catch {
    return { dados: d, aviso: true };
  }
  if (!g || typeof g !== "object" || g.versao !== VERSAO_GRAVACAO) return { dados: d, aviso: true };
  let aviso = false;
  const o = g.opcoes && typeof g.opcoes === "object" ? g.opcoes : null;
  if (o) {
    for (const k of Object.keys(d.opcoes)) if (typeof o[k] === "boolean") d.opcoes[k] = o[k];
  }
  if (typeof g.tutorialVisto === "boolean") d.tutorialVisto = g.tutorialVisto;
  if (g.partida !== null && g.partida !== void 0) {
    d.partida = partidaValida(g.partida);
    if (!d.partida) aviso = true;
  }
  return { dados: d, aviso };
}
export {
  VERSAO_GRAVACAO,
  validarGravacao
};
