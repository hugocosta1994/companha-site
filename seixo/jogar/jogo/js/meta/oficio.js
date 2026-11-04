import { aoResolver } from "../nucleo/oficio.js";
import { verificar } from "../nucleo/objetivos.js";
import { eResolvido } from "../nucleo/praca.js";
function ligarOficio({ documento, gravarJa, ouvir, emitir, hoje, puzzlePorId = () => null, catalogoObjetivos = () => [] }) {
  return ouvir((nome, d) => {
    if (nome !== "puzzle:resolvido" || !d || !d.id) return;
    const ja = eResolvido((documento().puzzles || {})[d.id]);
    queueMicrotask(() => {
      var _a, _b, _c;
      try {
        const doc = documento();
        const eventos = [];
        let mudou = false;
        if (!ja) {
          const base = puzzlePorId(d.id) || {};
          const puzzle = { ...base, dificuldade: (_b = (_a = base.dificuldade) != null ? _a : d.dificuldade) != null ? _b : "medio", variante: (_c = base.variante) != null ? _c : d.variante };
          const r = aoResolver(doc, puzzle, { semPista: !(d.pistasUsadas > 0) });
          mudou = r.mudou;
          eventos.push(...r.eventos);
        }
        const cat = catalogoObjetivos();
        if (cat && cat.length) {
          const v = verificar(doc, cat, { hoje: hoje(), infoDe: puzzlePorId });
          mudou = mudou || v.mudou;
          eventos.push(...v.eventos);
        }
        if (mudou) {
          try {
            gravarJa(doc);
          } catch (e) {
            console.warn("[oficio] gravar falhou:", e);
          }
        }
        for (const [n, dados] of eventos) emitir(n, dados);
      } catch (e) {
        console.warn("[oficio] falhou:", e);
      }
    });
  });
}
export {
  ligarOficio
};
