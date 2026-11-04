const FEEDBACK_MAX_MS = 600;
function criarFeedback({ app, criar, duracaoMs = 500, reduzir = () => false, agendar = setTimeout }) {
  const ms = Math.min(FEEDBACK_MAX_MS, Math.max(0, duracaoMs));
  const aviso = criar("p", { id: "feedback-fim", class: "feedback-fim", role: "status", "aria-live": "polite", hidden: true });
  app.append(aviso);
  let fim = null;
  return {
    el: aviso,
    ms,
    disparar(tipo, texto = "") {
      if (tipo !== "puzzle" && tipo !== "meta") return false;
      if (fim) {
        fim();
        fim = null;
      }
      const cls = `fb-${tipo}`;
      if (!reduzir()) app.classList.add(cls);
      if (texto) {
        aviso.textContent = texto;
        aviso.hidden = false;
      }
      const id = agendar(() => {
        app.classList.remove(cls);
        aviso.hidden = true;
        fim = null;
      }, ms);
      fim = () => {
        try {
          clearTimeout(id);
        } catch {
        }
        app.classList.remove(cls);
        aviso.hidden = true;
      };
      return true;
    }
  };
}
export {
  FEEDBACK_MAX_MS,
  criarFeedback
};
