const EVENTOS = Object.freeze([
  "app:pausa",
  "app:retoma",
  "anuncio:pedido",
  "anuncio:mostrado",
  "anuncio:recompensa",
  "anuncio:falhou",
  "consentimento:mudou",
  "jogada:recusada",
  "moinho:fechado",
  "partida:fim",
  "partida:iniciada",
  "peca:colocada",
  "peca:movida",
  "peca:removida",
  "vez:mudou",
  "som:mudou",
  "puzzle:certo",
  "puzzle:errado",
  "async:convite",
  "async:importado",
  "async:jogada",
  "async:enviado",
  "async:erro",
  "async:desistiu",
  "async:fim",
  "xp:ganho",
  "cosmetico:desbloqueado",
  "cosmetico:aplicado",
  "tutorial:passo",
  "tutorial:fim",
  "nivel:subiu",
  "conquista:ganha",
  "desafio:iniciado",
  "desafio:fim",
  "cartao:partilhado",
  "cartao:importado",
  "cartao:erro"
]);
const ouvintes = /* @__PURE__ */ new Map();
function ouvir(nome, f) {
  if (!EVENTOS.includes(nome)) throw new Error(`evento desconhecido: ${nome}`);
  if (!ouvintes.has(nome)) ouvintes.set(nome, /* @__PURE__ */ new Set());
  ouvintes.get(nome).add(f);
  return () => ouvintes.get(nome).delete(f);
}
function emitir(nome, payload = {}) {
  if (!EVENTOS.includes(nome)) throw new Error(`evento desconhecido: ${nome}`);
  for (const f of [...ouvintes.get(nome) || []]) f(payload);
}
export {
  EVENTOS,
  emitir,
  ouvir
};
