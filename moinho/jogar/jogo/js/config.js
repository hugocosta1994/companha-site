const NOME_JOGO = "MOINHO";
const VERSAO = "0.1.0";
const PECAS = 9;
const SEM_CAPTURA_MAX = 50;
const REPETICOES = 3;
const AVALIACAO = { pecas: 100, moinhos: 40, quase: 25, mobilidade: 5, bloqueadas: -15, bonusVoo: 30 };
const NIVEIS = {
  aprendiz: { profundidade: 1, acaso: 0.4, ignoraMoinho: 1 / 3, pensa: [300, 600], limiteMs: 50 },
  facil: { profundidade: 2, acaso: 0.25, pensa: [400, 700], limiteMs: 150 },
  media: { profundidade: 3, acaso: 0, pensa: [400, 700], limiteMs: 300, abertura: { margem: 15 } },
  atenta: { profundidade: 4, acaso: 0.05, acasoSeguro: true, pensa: [450, 800], limiteMs: 300, abertura: { margem: 15 } },
  dificil: { profundidade: 5, acaso: 0.1, acasoSeguro: true, pensa: [500, 900], limiteMs: 300, abertura: { margem: 10 } },
  mestre: { profundidade: 5, profundidadeMax: 7, acaso: 0, pensa: [600, 1e3], limiteMs: 360, abertura: { margem: 10 } }
};
const ABERTURA = { meias: 6, profMax: 4 };
const NIVEIS_ORDEM = ["aprendiz", "facil", "media", "atenta", "dificil", "mestre"];
const PONTOS_NIVEL = { aprendiz: 1, facil: 2, media: 4, atenta: 6, dificil: 9, mestre: 14 };
const PONTOS_MOINHO = { bonusSemPerder: 2, bonusRapida: 1, jogadasRapida: 25, maxDia: 40, desafioDiario: 5 };
const MULTI = { maxJogadas: 200, maxCodigo: 800, maxPartidas: 10, maxAmigos: 50, esquecidaDias: 30, alcunha: [3, 16] };
const IA_MAX_MS = 300;
const MOINHO = { pausa: 600, pulso: 400, remocao: 250, mover: 200, fimApos: 500, iaVermelho: 300 };
const VIBRACAO_MS = 40;
const PERSONALIDADES = {
  equilibrada: { id: "equilibrada", pesos: { pecas: 100, moinhos: 40, quase: 25, mobilidade: 5, bloqueadas: -15 }, desempate: null },
  prudente: { id: "prudente", pesos: { pecas: 100, moinhos: 25, quase: 10, mobilidade: 10, bloqueadas: -30 }, desempate: "ameacas" },
  agressiva: { id: "agressiva", pesos: { pecas: 100, moinhos: 70, quase: 60, mobilidade: 8, bloqueadas: -20 }, desempate: "quase" },
  mobilidade: { id: "mobilidade", pesos: { pecas: 80, moinhos: 30, quase: 20, mobilidade: 15, bloqueadas: -25 }, desempate: "destinos" }
};
const PERSONALIDADE_PADRAO = "equilibrada";
const PUZZLES = { dicasMax: 3, desbloqueioResolvidos: 2, tipos: ["P1", "P2", "P3", "P4"], porTipo: 3 };
const MODOS_STATS = ["ia_aprendiz", "ia_facil", "ia_media", "ia_atenta", "ia_dificil", "ia_mestre", "dois", "codigo", "alq_facil", "alq_media", "alq_dificil"];
const MODOS_STATS_ATIVOS = MODOS_STATS.filter((k) => !k.startsWith("alq_"));
const ANUNCIOS = {
  RELEASE: false,
  // T-1342: true só no build de release (ferramentas/modo-anuncios.mjs); em dev usa sempre IDs de teste
  IDS_REAIS: { appId: "ca-app-pub-7114748739096443~7526448751", recompensa: "ca-app-pub-7114748739096443/9909069518" },
  UMP_TEMPO_MS: 3e3,
  INTERSTICIAIS: false,
  SLOTS: { A1: "dobrar_moedas", A2: "segunda_tentativa", A3: "mais_dica", A4: "ganhar_moedas" }
};
const AD = { A1_DIA: 5, A4_MOEDAS: 20, A4_DIA: 3, A3_POR_PUZZLE: 2, PRIMEIROS_MIN: 10, TETO_MOEDAS_DIA: 150 };
export {
  ABERTURA,
  AD,
  ANUNCIOS,
  AVALIACAO,
  IA_MAX_MS,
  MODOS_STATS,
  MODOS_STATS_ATIVOS,
  MOINHO,
  MULTI,
  NIVEIS,
  NIVEIS_ORDEM,
  NOME_JOGO,
  PECAS,
  PERSONALIDADES,
  PERSONALIDADE_PADRAO,
  PONTOS_MOINHO,
  PONTOS_NIVEL,
  PUZZLES,
  REPETICOES,
  SEM_CAPTURA_MAX,
  VERSAO,
  VIBRACAO_MS
};
