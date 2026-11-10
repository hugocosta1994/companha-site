import { prepararCaptura, descartarCaptura, temCaptura, miniaturaCaptura, enviarFeedback } from "../plataforma/feedbackTester.js";
const ERROS = { rede: "feedback.sem_rede", limite: "feedback.limite", invalido: "feedback.invalido", inativo: "feedback.erro" };
function criarFeedbackUI({ t, criar, lerConfig, ecraAtual = () => "", enviar = enviarFeedback }) {
  const botao = criar("button", { id: "btn-def-feedback", type: "button", class: "def-restaurar" }, t("feedback.botao"));
  const visivel = () => lerConfig().fornecedor === "supabase";
  botao.hidden = !visivel();
  const texto = criar("textarea", { id: "fb-texto", maxlength: "2000", rows: "5", "aria-label": t("feedback.texto_rotulo") });
  const contador = criar("span", { class: "of-suave", id: "fb-contador" }, t("feedback.contador", { n: 0 }));
  const caixa = criar("input", { id: "fb-captura", type: "checkbox" });
  caixa.checked = true;
  const miniatura = criar("img", { id: "fb-miniatura", alt: t("feedback.captura_alt") });
  const linhaCaptura = criar("label", { class: "def-linha" }, caixa, " ", t("feedback.captura"));
  const dados = criar("details", { class: "fb-dados" }, criar("summary", {}, t("feedback.dados_aviso")), criar("p", { class: "of-suave" }, t("feedback.dados_lista")));
  const estado = criar("p", { id: "fb-estado", class: "of-suave", role: "status" });
  const enviarB = criar("button", { type: "button", id: "fb-enviar", class: "def-restaurar" }, t("feedback.enviar"));
  const cancelarB = criar("button", { type: "button", id: "fb-cancelar", class: "def-restaurar" }, t("feedback.cancelar"));
  const caixaDlg = criar("div", { class: "fb-caixa" }, criar("h2", { class: "ec-sub" }, t("feedback.titulo")), texto, contador, linhaCaptura, miniatura, dados, estado, enviarB, cancelarB);
  const dlg = criar("div", { id: "feedback-form", class: "fb-fundo", role: "dialog", "aria-modal": "true", hidden: true }, caixaDlg);
  function atualizarCaptura() {
    const tem = temCaptura();
    linhaCaptura.hidden = !tem;
    miniatura.hidden = !tem || !caixa.checked;
    if (tem) miniatura.src = miniaturaCaptura();
  }
  const fechar = () => {
    dlg.hidden = true;
  };
  texto.addEventListener("input", () => {
    contador.textContent = t("feedback.contador", { n: texto.value.length });
  });
  caixa.addEventListener("change", atualizarCaptura);
  botao.addEventListener("click", () => {
    estado.textContent = "";
    enviarB.disabled = false;
    atualizarCaptura();
    dlg.hidden = false;
    texto.focus();
  });
  cancelarB.addEventListener("click", fechar);
  enviarB.addEventListener("click", async () => {
    if (!texto.value.trim()) {
      estado.textContent = t("feedback.invalido");
      return;
    }
    enviarB.disabled = true;
    estado.textContent = t("feedback.a_enviar");
    let r;
    try {
      r = await enviar({ texto: texto.value, comCaptura: caixa.checked && temCaptura() }, { ecraJogo: ecraAtual() });
    } catch {
      r = { ok: false, erro: "rede" };
    }
    if (r.ok) {
      estado.textContent = t("feedback.ok");
      texto.value = "";
      contador.textContent = t("feedback.contador", { n: 0 });
      atualizarCaptura();
      setTimeout(fechar, 1800);
      return;
    }
    estado.textContent = t(ERROS[r.erro] || "feedback.erro");
    enviarB.disabled = false;
  });
  return {
    botao,
    dlg,
    visivel,
    // Chamar ao abrir as Definições (antes de o painel aparecer): tira a captura do ecrã ainda intacto.
    aoAbrirDefinicoes() {
      botao.hidden = !visivel();
      if (visivel()) return prepararCaptura();
      return null;
    },
    // Ao fechar as Definições: deita fora a captura e o formulário (o texto fica).
    aoFecharDefinicoes() {
      descartarCaptura();
      fechar();
    }
  };
}
export {
  criarFeedbackUI
};
