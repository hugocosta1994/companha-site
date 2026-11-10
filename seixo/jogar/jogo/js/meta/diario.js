import { dataLocal, diasEntre, indiceTabela, naTabela, numeroPartilha, verDia, eFuturo } from "../nucleo/dia.js";
import { creditarResolucao, recompensaSequencia } from "./lascas.js";
const RE_DIARIO = /^D-(\d{4}-\d{2}-\d{2})$/;
const RE_CURADO = /^(PAC-(?:[A-Z]+(?:-[A-Z]+)*|SAZ-\d{4}-Q[1-4]))-(\d{2})$/;
const dataDoId = (id) => (RE_DIARIO.exec(id || "") || [])[1] || null;
const idDoDia = (data) => `D-${data}`;
function puzzleDoDia(data, { tabela = [], epoca, carregar = (o) => o, reserva }) {
  const id = idDoDia(data);
  const i = indiceTabela(data, epoca);
  let obj = naTabela(i, tabela.length) && tabela[i] && tabela[i].id === id ? tabela[i] : null;
  if (!obj) obj = tabela.find((o) => o && o.id === id) || null;
  if (obj) {
    try {
      return { puzzle: carregar(obj), fonte: "tabela" };
    } catch (e) {
      console.warn(`[diario] ${id} inv\xE1lido na tabela; uso a reserva:`, e && e.message);
    }
  }
  return { puzzle: carregar(reserva(data)), fonte: "reserva" };
}
function sequenciaDe(doc) {
  if (!doc.sequencia) doc.sequencia = { atual: 0, recorde: 0, ultimoDiaMantido: null, diaMaisAltoVisto: null };
  return doc.sequencia;
}
function estadoDe(doc, id) {
  const r = doc.puzzles && doc.puzzles[id];
  return r && r.estado ? r.estado : "por_jogar";
}
const resolvido = (r) => !!r && (r.estado === "resolvido" || r.estado === "resolvido_com_pistas");
function registarResolucao(doc, { id, n = 0, pistasUsadas = 0 }, hoje, jogo = null) {
  var _a;
  if (!doc.puzzles) doc.puzzles = {};
  const antes = doc.puzzles[id];
  const data = dataDoId(id);
  const eventos = [];
  const grelhaDoJogo = jogo && typeof jogo.grelha === "string" ? {
    grelha: jogo.grelha,
    reveladas: Array.isArray(jogo.reveladas) ? [...jogo.reveladas] : [],
    historico: Array.isArray(jogo.historico) ? jogo.historico.map((h) => [...h]) : []
  } : null;
  if (resolvido(antes)) {
    if (grelhaDoJogo) Object.assign(antes, grelhaDoJogo);
    return { primeiraVez: false, noProprioDia: (_a = antes.noProprioDia) != null ? _a : null, eventos };
  }
  const pistas = Math.max(antes ? antes.pistasUsadas || 0 : 0, pistasUsadas || 0);
  const noProprioDia = data ? data === hoje : null;
  doc.puzzles[id] = {
    estado: pistas > 0 ? "resolvido_com_pistas" : "resolvido",
    grelha: grelhaDoJogo ? grelhaDoJogo.grelha : antes && antes.grelha || ".".repeat(n * n),
    reveladas: grelhaDoJogo ? grelhaDoJogo.reveladas : antes && antes.reveladas || [],
    historico: grelhaDoJogo ? grelhaDoJogo.historico : antes && antes.historico || [],
    pistasUsadas: pistas,
    resolvidoEm: hoje,
    noProprioDia,
    lascasDadas: antes ? !!antes.lascasDadas : false,
    tempoMs: antes && Number.isFinite(antes.tempoMs) ? antes.tempoMs : 0
  };
  const seq = sequenciaDe(doc);
  const relogioAtras = seq.diaMaisAltoVisto != null && diasEntre(seq.diaMaisAltoVisto, hoje) < 0;
  const posterior = seq.ultimoDiaMantido == null || diasEntre(seq.ultimoDiaMantido, data || hoje) > 0;
  if (noProprioDia && !relogioAtras && posterior) {
    const a = seq.atual;
    if (pistas === 0) {
      seq.atual += 1;
      seq.recorde = Math.max(seq.recorde, seq.atual);
    }
    seq.ultimoDiaMantido = data;
    eventos.push(["sequencia:alterada", { antes: a, atual: seq.atual, recorde: seq.recorde, motivo: pistas === 0 ? "subiu" : "neutro" }]);
  }
  return { primeiraVez: true, noProprioDia, eventos };
}
function verificarDia(doc, hoje) {
  var _a;
  const seq = sequenciaDe(doc);
  const antes = (_a = seq.diaMaisAltoVisto) != null ? _a : null;
  const { diaMaisAltoVisto, relogioAtras } = verDia(antes, hoje);
  seq.diaMaisAltoVisto = diaMaisAltoVisto;
  const eventos = [];
  if (!relogioAtras && seq.ultimoDiaMantido && diasEntre(seq.ultimoDiaMantido, hoje) > 1 && seq.atual > 0) {
    const a = seq.atual;
    seq.atual = 0;
    eventos.push(["sequencia:alterada", { antes: a, atual: 0, recorde: seq.recorde, motivo: "quebrou" }]);
  }
  eventos.push(["dia:verificado", { hoje, antes, relogioParaTras: relogioAtras }]);
  return { hoje, antes, relogioParaTras: relogioAtras, eventos };
}
function diasDoMes(mes) {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}
function arquivoDoMes(doc, mes, hoje, temItem = () => false) {
  const total = diasDoMes(mes);
  const dias = [];
  for (let d = 1; d <= total; d++) {
    const data = `${mes}-${String(d).padStart(2, "0")}`;
    const id = idDoDia(data);
    dias.push({ data, id, dia: d, estado: estadoDe(doc, id), hoje: data === hoje, futuro: eFuturo(data, hoje) });
  }
  return { mes, desbloqueado: !!temItem(`ARQ-${mes}`), dias };
}
function pracaDoMes(doc, mes) {
  const total = diasDoMes(mes);
  let feitos = 0;
  for (let d = 1; d <= total; d++) if (resolvido(doc.puzzles && doc.puzzles[idDoDia(`${mes}-${String(d).padStart(2, "0")}`)])) feitos++;
  return { feitos, total };
}
function textoPartilha(doc, puzzle, { t, tn, diaLancamento, nomePacote = (id) => id }) {
  const reg = doc.puzzles && doc.puzzles[puzzle.id];
  if (!resolvido(reg)) return null;
  const dif = t(`dif.${puzzle.dificuldade || "medio"}`);
  const data = dataDoId(puzzle.id);
  const curado = RE_CURADO.exec(puzzle.id);
  const linhas = [];
  if (curado) {
    linhas.push(t("partilha.cabecalho_pacote", { pacote: nomePacote(curado[1]), i: Number(curado[2]), dif }));
  } else {
    const num = data ? numeroPartilha(data, diaLancamento) : 0;
    linhas.push(t("partilha.cabecalho", { num: num > 0 ? num : data || puzzle.id, dif }));
  }
  const seq = sequenciaDe(doc);
  if (reg.pistasUsadas > 0) linhas.push(tn("partilha.com_pistas", reg.pistasUsadas, { n: reg.pistasUsadas }));
  else if (data && reg.noProprioDia && seq.ultimoDiaMantido === data && seq.atual > 0) linhas.push(tn("partilha.sem_pistas", seq.atual, { n: seq.atual }));
  else linhas.push(t("partilha.sem_pistas_sem_seq"));
  if (data) {
    const mes = data.slice(0, 7);
    const { feitos, total } = pracaDoMes(doc, mes);
    const blocos = t("partilha.cheio").repeat(feitos) + t("partilha.vazio").repeat(total - feitos);
    linhas.push(t("partilha.praca", { mes: t(`mes.${Number(mes.slice(5))}`), blocos, feitos, total }));
  }
  return linhas.join("\n");
}
function ligarDiario(opcoes) {
  const { documento, gravarJa, ouvir, emitir } = opcoes;
  const relogio = opcoes.relogio || (() => /* @__PURE__ */ new Date());
  const jogoAtual = opcoes.jogoAtual || (() => null);
  const agendar = opcoes.agendar || ((fn, ms) => {
    const h = setTimeout(fn, ms);
    if (h && typeof h.unref === "function") h.unref();
    return h;
  });
  const cancelar = opcoes.cancelar || ((h) => clearTimeout(h));
  const hoje = () => dataLocal(relogio());
  const despachar = (eventos) => {
    for (const [nome, dados] of eventos) emitir(nome, dados);
  };
  let pega = null;
  function verificar() {
    const r = verificarDia(documento(), hoje());
    try {
      gravarJa(documento());
    } catch (e) {
      console.warn("[diario] gravar falhou:", e);
    }
    despachar(r.eventos);
    return r;
  }
  function armarMeiaNoite() {
    cancelar(pega);
    const agora = relogio();
    const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1, 0, 0, 1);
    pega = agendar(() => {
      verificar();
      armarMeiaNoite();
    }, Math.max(1e3, amanha - agora));
  }
  const desligar = ouvir((nome, d) => {
    if (nome === "app:retoma") {
      verificar();
      armarMeiaNoite();
      return;
    }
    if (nome !== "puzzle:resolvido" || !d || !d.id) return;
    const doc = documento();
    const dia = hoje();
    const r = registarResolucao(doc, d, dia, jogoAtual());
    const lascas = r.primeiraVez ? creditarResolucao(doc, d, dia) : [];
    const seq7 = r.primeiraVez ? recompensaSequencia(doc, r.eventos) : [];
    if (r.primeiraVez) {
      try {
        gravarJa(doc);
      } catch (e) {
        console.warn("[diario] gravar falhou:", e);
      }
    }
    despachar([...lascas, ...r.eventos, ...seq7]);
  });
  verificar();
  armarMeiaNoite();
  return {
    hoje,
    verificar,
    parar() {
      cancelar(pega);
      if (typeof desligar === "function") desligar();
    }
  };
}
export {
  arquivoDoMes,
  dataDoId,
  diasDoMes,
  estadoDe,
  idDoDia,
  ligarDiario,
  pracaDoMes,
  puzzleDoDia,
  registarResolucao,
  sequenciaDe,
  textoPartilha,
  verificarDia
};
