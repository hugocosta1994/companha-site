const CONFIG = {
  ANIM_ASSENTAR_MS: 120,
  ANIM_ABANAR_MS: 150,
  AVISO_ATRASO_MS: 400,
  ANIM_RESOLVIDO_MS: 1200,
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
  // tutorial (GDD §4.7, §5.3): pista grátis no P3 ao fim de N s sem tocar; pistas oferecidas no fim do tutorial
  TUTORIAL_AJUDA_S: 30,
  PISTAS_INICIAIS: 3,
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
