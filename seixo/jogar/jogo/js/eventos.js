const EVENTOS = Object.freeze([
  // 2.1 puzzle (área B)
  "puzzle:aberto",
  "puzzle:pedra",
  "puzzle:desfeito",
  "puzzle:toque_fixa",
  "puzzle:avisos",
  "puzzle:pista",
  "puzzle:sem_pistas",
  "puzzle:recomecado",
  "puzzle:resolvido",
  "puzzle:assentado",
  // 2.2 progresso e economia (C)
  "lascas:alteradas",
  "pistas:alteradas",
  "sequencia:alterada",
  "praca:quadrado",
  "praca:completa",
  "item:obtido",
  "item:perdido",
  "item:equipado",
  "tutorial:concluido",
  // 2.3 aplicação, dia, definições e gravação (C)
  "app:pausa",
  "app:retoma",
  "dia:verificado",
  "ecra:aberto",
  "ui:toque",
  "definicoes:alteradas",
  "partilha:feita",
  "gravacao:aviso",
  // 2.4 loja (C)
  // 2.5 v2 (T-872, contrato 1.1): derivados de oficio:nivel e objetivo:cumprido, para o Áudio
  "nivel:subiu",
  "meta:cumprida",
  // 2.6 progressão v2 (contrato 1.2, T-954; dados em contratos/progressao-v2.md §6)
  "oficio:pontos",
  "oficio:nivel",
  "objetivo:cumprido",
  "colecao:alterada",
  // 2.7 calceteiros (contrato 1.3, T-1048; GDD §12.8)
  "amigo:adicionado",
  "amigo:atualizado",
  "recorde:novo",
  "codigo:gerado",
  "desafio:codigo",
  "desafio:recebido",
  "desafio:resultado",
  "desafio:erro",
  // 2.8 modo Caminho (contrato 1.4, T-1112; GDD §13)
  "caminho:nivel",
  "caminho:resolvido",
  "caminho:troco",
  "caminho:saltado",
  "caminho:teto",
  // 2.9 retenção v3 (contrato 1.5, T-1321; contratos/retencao-v3.md)
  "regresso:mostrado",
  "regresso:aceite",
  "regresso:dispensado",
  "semana:resumo",
  "lembrete:ativado",
  "lembrete:desativado",
  "lembrete:disparado",
  // 2.10 coleção v3 (contrato 1.6, T-1322)
  "colecao:aberta",
  // 2.11 anúncios (contrato 1.7, T-1335; plataforma/anuncios.js)
  "anuncio:pedido",
  "anuncio:mostrado",
  "anuncio:recompensa",
  "anuncio:falhou",
  "consentimento:mudou",
  "compras:estado",
  "compras:produtos",
  "compras:compra",
  "compras:direitos",
  "compras:restauro",
  "loja:troca"
]);
const VERSAO_CONTRATO = "1.7";
const CONHECIDOS = new Set(EVENTOS);
const ouvintes = [];
const REGISTO_MAX = 200;
const registo = [];
const agora = () => globalThis.performance ? performance.now() : Date.now();
const T0 = globalThis.document ? 0 : agora();
function copia(dados) {
  return dados === void 0 ? {} : JSON.parse(JSON.stringify(dados));
}
function emitir(nome, dados) {
  if (!CONHECIDOS.has(nome)) console.warn(`[eventos] '${nome}' n\xE3o est\xE1 em contratos/eventos.md`);
  const plano = copia(dados);
  registo.push({ t: Math.round(agora() - T0), nome, dados: copia(plano) });
  if (registo.length > REGISTO_MAX) registo.splice(0, registo.length - REGISTO_MAX);
  for (const fn of [...ouvintes]) {
    try {
      fn(nome, copia(plano));
    } catch (e) {
      console.warn(`[eventos] ouvinte de '${nome}' falhou:`, e);
    }
  }
  if (nome === "oficio:nivel") emitir("nivel:subiu", { nivel: plano.nivel });
  else if (nome === "objetivo:cumprido") emitir("meta:cumprida", { id: plano.id });
}
function ouvir(fn) {
  ouvintes.push(fn);
  return () => {
    const k = ouvintes.indexOf(fn);
    if (k >= 0) ouvintes.splice(k, 1);
  };
}
function registoEventos() {
  return registo.map((e) => copia(e));
}
function limparEventos() {
  registo.length = 0;
}
export {
  EVENTOS,
  REGISTO_MAX,
  VERSAO_CONTRATO,
  emitir,
  limparEventos,
  ouvir,
  registoEventos
};
