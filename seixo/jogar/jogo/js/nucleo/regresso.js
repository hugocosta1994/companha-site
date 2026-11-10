import { diasEntre } from "./dia.js";
const REGRESSO_NIVEIS = Object.freeze([3, 7, 30]);
const ESTADOS_REGRESSO = Object.freeze(["normal", "discreto", "regresso", "regresso"]);
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;
function ausenciaEmDias(ultimoDia, hoje) {
  if (!RE_DATA.test(ultimoDia || "") || !RE_DATA.test(hoje || "")) return 0;
  const d = diasEntre(ultimoDia, hoje);
  return Number.isFinite(d) && d > 0 ? d : 0;
}
function nivelDeAusencia(dias, niveis = REGRESSO_NIVEIS) {
  let n = 0;
  niveis.forEach((m, i) => {
    if (dias >= m) n = i + 1;
  });
  return n;
}
const melhorSerie = (sequencia) => Math.max(sequencia && sequencia.recorde || 0, sequencia && sequencia.atual || 0);
function estadoDeRegresso(ultimoDia, hoje, { sequencia = null, po = 0, niveis = REGRESSO_NIVEIS } = {}) {
  const ausencia = ausenciaEmDias(ultimoDia, hoje);
  const nivel = nivelDeAusencia(ausencia, niveis);
  const melhor = melhorSerie(sequencia);
  return {
    estado: ESTADOS_REGRESSO[nivel],
    nivel,
    ausencia,
    melhorSerie: melhor,
    mostrarSerie: nivel >= 1 && melhor > 0,
    // «Melhor série: N dias» (nunca a série perdida)
    recomecar: nivel >= 2,
    // botão Recomeçar → diário de hoje
    cartao: nivel >= 2,
    // cartão no topo do Início, dispensável, nunca modal
    tensCa: nivel >= 3,
    // «O que tens cá» (nível, praça, itens)
    aquecer: nivel >= 3 && (po || 0) > 0
    // 3 Fáceis seguidos
  };
}
export {
  ESTADOS_REGRESSO,
  REGRESSO_NIVEIS,
  ausenciaEmDias,
  estadoDeRegresso,
  melhorSerie,
  nivelDeAusencia
};
