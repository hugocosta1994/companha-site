const CONFIG = {
  ANIM_ASSENTAR_MS: 120,
  ANIM_ABANAR_MS: 150,
  AVISO_ATRASO_MS: 400,
  ANIM_RESOLVIDO_MS: 1200,
  FEEDBACK_FIM_MS: 500,
  // T-1322 (S3-10): pulso/aviso de conclusão, nunca > 600 ms
  ANIM_REVELA_MS: 600,
  // T-565 (G-07d3): onda por diagonais que acende o motivo no fim do P1 e do P2
  ANIM_PISTA_MS: 1200,
  // pista (GDD §5.4): duração do piscar da casa
  PISTA_PISCAR: 3,
  // quantas vezes a casa pisca
  AVISOS_LIGADOS: true,
  // economia (GDD §5.2, §4.5): lascas por diário no próprio dia e por praça do mês completa (uma vez, CA-14)
  LASCAS_DIARIO: 10,
  LASCAS_ARQ_F: 3,
  // puzzle do arquivo (diário noutro dia) ou curado, por dificuldade (T-412)
  LASCAS_ARQ_M: 5,
  LASCAS_ARQ_D: 8,
  LASCAS_SEQ7: 20,
  // a cada 7 dias de sequência, com PISTAS_SEQ7 pista (puzzle-formato §3.4)
  PISTAS_SEQ7: 1,
  LASCAS_PRACA: 50,
  // pacote sazonal (T-1771; catalogo-v3.md §4.1): 1.º trimestre que aparece na app (a CEO fixa-o na release da v3)
  SAZ_PRIMEIRO: "2026-Q4",
  // modo Caminho (T-1112; contratos/caminho.md §3, GDD §13.4): lascas por nível novo (F/M/D), bónus de troço, teto diário
  CAMINHO_LASCAS_F: 1,
  CAMINHO_LASCAS_M: 2,
  CAMINHO_LASCAS_D: 3,
  CAMINHO_LASCAS_TROCO: 10,
  CAMINHO_TETO_DIA: 10,
  CAMINHO_SALTAR_S: 180,
  // «Saltar nível» só depois de tanto tempo no mesmo nível
  CAMINHO_TROCO_N: 10,
  // níveis por troço
  ASSENTAR_PRACA_MS: 3200,
  // T-426: quanto tempo a praça pequena fica por cima do tabuleiro depois de resolver
  // anúncios com recompensa (GDD §14, T-1335): IDs de teste da Google em plataforma/anuncios.js
  AD_PISTA_DIA: 3,
  AD_LASCAS_BONUS: 5,
  AD_SEM_ANUNCIO_PRIMEIRAS: 5,
  ANUNCIOS: {
    RELEASE: false,
    // T-1342: true só no build de release (ferramentas/modo-anuncios.mjs); em dev usa sempre IDs de teste
    IDS_REAIS: {
      appId: "ca-app-pub-7114748739096443~2118421430",
      recompensa: "ca-app-pub-7114748739096443/3958116716",
      intersticial: "ca-app-pub-7114748739096443/5346081936"
      /* T-1501: bloco criado no AdMob a 8 nov 2026 */
    },
    UMP_TEMPO_MS: 3e3,
    INTERSTICIAIS: true,
    INTERSTICIAL_CADA: 3,
    INT_A_CADA_N_JOGOS: 3,
    INT_INTERVALO_MIN_S: 180,
    INT_MAX_SESSAO: 3,
    INT_MAX_DIA: 8,
    INT_CARGA_MAX_MS: 0,
    // T-1459: 1 intersticial a cada N partidas (proposta do Fundador; ajustável)
    SLOTS: { AD1: "pista", AD2: "lascas_diario", AD3: "caminho_troco" }
  },
  // tutorial (GDD §4.7, §5.3): pista grátis no P3 ao fim de N s sem tocar; pistas oferecidas no fim do tutorial
  TUTORIAL_AJUDA_S: 30,
  PISTAS_INICIAIS: 3,
  // tutorial v3.1 (contratos/tutorial-v3.md §9.5, §9.6; T-1816): ordem de desempate da meta do rumo, alvo com cartões,
  // altura da fita, pulso do chip no T6 e duração do T6
  TUTORIAL_V3_META_ORDEM: ["OBJ-L19", "OBJ-L13", "OBJ-L22"],
  TUTORIAL_V3_ALVO_S: 60,
  TUTORIAL_V3_FITA_ALTURA_DP: 44,
  TUTORIAL_V3_PULSO_MS: 800,
  TUTORIAL_V3_T6_MS: 1200,
  TUTORIAL_V3_P3_CONTA_L19: true,
  // calceteiros (GDD §12.7, T-1048)
  AMIGOS_MAX: 20,
  CODIGO_VALIDADE_DIAS: 90,
  GUIA_PULSO_MS: 1100,
  // tutorial (T-424): período do pulso do anel da casa-alvo (persistente até ao toque certo)
  GUIA_INTERVALO_MS: 40,
  // T-437: intervalo mínimo entre desenhos da pulsação da guia (~25 fps)
  GUIA_COR: "#d08a1e",
  // anel e mão da casa-alvo (âmbar; distinto do vermelho dos avisos)
  // tabuleiro (protótipo; a Arte substitui a paleta)
  ECRA_LARGURA: 360,
  ECRA_ALTURA: 640,
  // GDD §2.8 (CA-27): casa = (largura − 2·margemExt − 2·margemInt) / n
  TABULEIRO_MARGEM_EXT: 16,
  // margem exterior em 4×4 e 6×6 (e máximo em 8×8)
  TABULEIRO_MARGEM_EXT_MIN: 4,
  // em 8×8 a margem exterior encolhe até aqui para a casa chegar a CASA_ALVO_DP
  TABULEIRO_MARGEM: 8,
  // margem interior (rebordo do leito) em 4×4 e 6×6
  TABULEIRO_MARGEM_8: 0,
  // margem interior em 8×8 (o rebordo desenha-se na margem exterior)
  CASA_ALVO_DP: 48,
  TOQUE_FOLGA_DP: 4,
  // um toque até 4 dp fora da grelha conta para a casa mais próxima
  ASSENTAR_ESCALA_INICIAL: 1.18,
  ABANAR_AMPLITUDE_PX: 3,
  RESOLVIDO_AFUNDAR: 0.9,
  CORES: {
    fundo: "#efe9dc",
    argamassa: "#c9bfa9",
    casa: "#e2dac8",
    preta: "#2d2a26",
    pretaRelevo: "#4a4640",
    branca: "#f7f3ea",
    brancaContorno: "#b3a993",
    brancaRelevo: "#d8d0bd",
    aviso: "#c0392b",
    junta: "#5c5446",
    juntaFundo: "#f7f3ea",
    eixo: "#8a7f6a"
  },
  PUZZLE_INICIAL: "GDD-P2",
  // dia e numeração (tecnico.md §2.3). DIA_LANCAMENTO é stub até o Fundador fixar a data de publicação.
  DIA_LANCAMENTO: "2026-12-01",
  // n.º 1 da partilha
  EPOCA_TABELA: "2026-01-01"
  // índice 0 de diarios.json e base da seed (interno)
};
const { DIA_LANCAMENTO, EPOCA_TABELA } = CONFIG;
export {
  CONFIG,
  DIA_LANCAMENTO,
  EPOCA_TABELA
};
