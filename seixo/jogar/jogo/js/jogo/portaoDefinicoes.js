function criarPortaoDefinicoes({ capturar, aoFechar, timeoutMs = 1500, esperar = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  let aCapturar = false, reentrada = false, abertas = false;
  return {
    // Devolve true se o chamador deve sair já (captura em curso); false se deve abrir agora.
    interceptar(abrir, aoIniciar = () => {
    }) {
      if (reentrada) return false;
      if (aCapturar) return true;
      aCapturar = true;
      aoIniciar();
      const captura = (async () => {
        try {
          await capturar();
        } catch {
        }
      })();
      this.pendente = Promise.race([captura, esperar(timeoutMs)]).then(() => {
        aCapturar = false;
        reentrada = true;
        try {
          abrir();
        } finally {
          reentrada = false;
        }
      });
      return true;
    },
    pendente: Promise.resolve(),
    // para testes: resolve depois da abertura
    marcarAbertas() {
      abertas = true;
    },
    fechar() {
      if (!abertas) return;
      abertas = false;
      aoFechar();
    },
    get aCapturar() {
      return aCapturar;
    }
  };
}
export {
  criarPortaoDefinicoes
};
