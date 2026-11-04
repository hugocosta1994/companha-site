const VERSAO_ATUAL = 3;
import { recalcularPo, nivelDePo, dificuldadeConfigurada } from "./oficio.js";
import { objetivosDeV1 } from "./objetivos.js";
const MIGRACOES = Object.freeze({
  // v1 → v2: acrescenta `oficio` e `objetivos`; tudo o resto fica idêntico; sem prémios retroativos.
  1: (doc) => {
    const po = recalcularPo(doc.puzzles, dificuldadeConfigurada());
    return { ...doc, versao: 2, oficio: { po, nivel: nivelDePo(po), descobertas: [] }, objetivos: objetivosDeV1(doc) };
  },
  // v2 → v3 (T-1112, BS-6): acrescenta `caminho` no nível 1; tudo o resto fica idêntico (sem perdas, sem prémios retroativos).
  2: (doc) => ({ ...doc, versao: 3, caminho: { nivel: 1, resolvidos: [], saltados: [], "tro\xE7osPagos": [], hoje: { dia: null, lascas: 0 } } })
});
class ErroMigracao extends Error {
  constructor(mensagem, versao) {
    super(mensagem);
    this.name = "ErroMigracao";
    this.versao = versao;
  }
}
function migrar(doc, { migracoes = MIGRACOES, ate = VERSAO_ATUAL } = {}) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) throw new ErroMigracao("documento inv\xE1lido", null);
  let v = doc.versao;
  if (!Number.isInteger(v) || v < 1) throw new ErroMigracao("versao inv\xE1lida", v);
  if (v > ate) throw new ErroMigracao(`versao ${v} mais nova do que ${ate}`, v);
  let atual = structuredClone(doc);
  while (v < ate) {
    const f = migracoes[v];
    if (typeof f !== "function") throw new ErroMigracao(`falta a migra\xE7\xE3o ${v} \u2192 ${v + 1}`, v);
    let novo;
    try {
      novo = f(structuredClone(atual));
    } catch (e) {
      throw new ErroMigracao(`a migra\xE7\xE3o ${v} \u2192 ${v + 1} falhou: ${e && e.message}`, v);
    }
    if (!novo || typeof novo !== "object" || novo.versao !== v + 1) {
      throw new ErroMigracao(`a migra\xE7\xE3o ${v} \u2192 ${v + 1} n\xE3o devolveu versao ${v + 1}`, v);
    }
    atual = novo;
    v += 1;
  }
  return atual;
}
export {
  ErroMigracao,
  MIGRACOES,
  VERSAO_ATUAL,
  migrar
};
