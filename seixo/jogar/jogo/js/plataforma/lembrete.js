import { lembreteDe, LEMBRETE_SILENCIO_DIAS } from "../meta/retorno.js";
const ID_BASE = 4100;
function planoDeLembretes(doc, agora = /* @__PURE__ */ new Date(), dias = LEMBRETE_SILENCIO_DIAS) {
  const l = lembreteDe(doc);
  if (!l.ligado) return [];
  const [h, m] = String(l.hora).split(":").map(Number);
  const out = [];
  for (let d = 0; d < dias; d++) {
    const em = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + d, h, m, 0, 0);
    if (em.getTime() <= agora.getTime()) continue;
    out.push({ id: ID_BASE + d, em });
  }
  return out;
}
const idsPossiveis = (dias = LEMBRETE_SILENCIO_DIAS) => Array.from({ length: dias }, (_, d) => ({ id: ID_BASE + d }));
async function aplicar(LN, doc, { agora = /* @__PURE__ */ new Date(), titulo, texto } = {}) {
  if (!LN) return { agendados: 0 };
  try {
    await LN.cancel({ notifications: idsPossiveis() });
    const plano = planoDeLembretes(doc, agora);
    if (!plano.length) return { agendados: 0 };
    await LN.schedule({ notifications: plano.map(({ id, em }) => ({ id, title: titulo, body: texto, schedule: { at: em, allowWhileIdle: false } })) });
    return { agendados: plano.length };
  } catch (e) {
    console.warn("[lembrete] n\xE3o agendou:", e);
    return { agendados: 0, erro: String(e && e.message || e) };
  }
}
async function cancelar(LN) {
  if (!LN) return;
  try {
    await LN.cancel({ notifications: idsPossiveis() });
  } catch (e) {
    console.warn("[lembrete] n\xE3o cancelou:", e);
  }
}
export {
  ID_BASE,
  aplicar,
  cancelar,
  idsPossiveis,
  planoDeLembretes
};
