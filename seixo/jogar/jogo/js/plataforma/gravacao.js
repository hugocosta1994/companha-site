import { emitir } from "../eventos.js";
import { VERSAO_ATUAL, MIGRACOES, migrar } from "../nucleo/migrar.js";
import { oficioInicial } from "../nucleo/oficio.js";
import { objetivosInicial } from "../nucleo/objetivos.js";
const CHAVE = "seixo.gravacao";
const CHAVE_ANTERIOR = "seixo.gravacao.anterior";
const CHAVE_CORROMPIDA = "seixo.gravacao.corrompida";
const chaveVersao = (v) => `seixo.gravacao.v${v}`;
const GRAVACAO_DEBOUNCE_MS = 300;
const APP_VERSAO = "0.1.0";
const TEXTO_AVISO = Object.freeze({
  versao_nova: "gravacao.versao_nova",
  recuperada_anterior: "gravacao.recuperada",
  reposta: "gravacao.perdida",
  seccao_reposta: "gravacao.parcial"
});
const ITENS_INICIAIS = Object.freeze(["PEDRA-BASALTO", "PAL-LISBOA", "PAL-ALTO-CONTRASTE", "PAL-DALTONISMO", "PAC-ROSSIO"]);
const SECCOES_INICIAIS = {
  tutorial: () => ({ concluido: false, concluidoEm: null, introsVistas: [] }),
  puzzles: () => ({}),
  sequencia: () => ({ atual: 0, recorde: 0, ultimoDiaMantido: null, diaMaisAltoVisto: null }),
  lascas: () => ({ saldo: 0, ganhasTotal: 0 }),
  pracas: () => ({}),
  inventario: () => ({
    pistas: 0,
    itens: [...ITENS_INICIAIS],
    equipado: { pedra: "PEDRA-BASALTO", paleta: "PAL-LISBOA", moldura: null },
    loja: { direitos: [], atualizadoEm: null, consumiveisCreditados: [] }
  }),
  definicoes: () => ({ avisos: true, som: true, vibracao: true }),
  oficio: oficioInicial,
  // v2 (progressao-v2.md §7)
  objetivos: objetivosInicial,
  // v2
  caminho: () => ({ nivel: 1, resolvidos: [], saltados: [], "tro\xE7osPagos": [], hoje: { dia: null, lascas: 0 } })
  // v3 (T-1112)
};
const SECCOES = Object.freeze(Object.keys(SECCOES_INICIAIS));
function estadoInicial(agora = /* @__PURE__ */ new Date(), versao = VERSAO_ATUAL) {
  const iso = isoLocal(agora);
  const doc = { versao, criadoEm: iso, atualizadoEm: iso, appVersao: APP_VERSAO };
  for (const s of SECCOES) doc[s] = SECCOES_INICIAIS[s]();
  return doc;
}
function isoLocal(d = /* @__PURE__ */ new Date()) {
  const p = (x) => String(Math.abs(x)).padStart(2, "0");
  const off = -d.getTimezoneOffset();
  const sinal = off >= 0 ? "+" : "-";
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${sinal}${p(Math.trunc(off / 60))}:${p(off % 60)}`;
}
const eObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const eInt0 = (x) => Number.isInteger(x) && x >= 0;
const eBool = (x) => typeof x === "boolean";
const eStr = (x) => typeof x === "string";
const eData = (x) => eStr(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);
const eDataOuNull = (x) => x === null || eData(x);
const eListaStr = (x) => Array.isArray(x) && x.every(eStr);
const ESTADOS_PUZZLE = /* @__PURE__ */ new Set(["a_meio", "resolvido", "resolvido_com_pistas"]);
const VARIANTES_INTRO = /* @__PURE__ */ new Set(["juntas", "contra_espelho", "orla"]);
const TAMANHOS = /* @__PURE__ */ new Set([16, 36, 64]);
function registoPuzzleValido(r) {
  if (!eObj(r) || !ESTADOS_PUZZLE.has(r.estado)) return false;
  if (!eStr(r.grelha) || !TAMANHOS.has(r.grelha.length) || !/^[.PB]*$/.test(r.grelha)) return false;
  const n2 = r.grelha.length;
  if (!Array.isArray(r.reveladas) || !r.reveladas.every((i) => Number.isInteger(i) && i >= 0 && i < n2)) return false;
  if (!Array.isArray(r.historico) || !r.historico.every((h) => Array.isArray(h) && h.length === 2 && Number.isInteger(h[0]) && h[0] >= 0 && h[0] < n2 && (h[1] === "." || h[1] === "P" || h[1] === "B"))) return false;
  if (!eInt0(r.pistasUsadas) || !eDataOuNull(r.resolvidoEm) || !eBool(r.lascasDadas)) return false;
  if (!(r.noProprioDia === null || eBool(r.noProprioDia))) return false;
  if (!(typeof r.tempoMs === "number" && Number.isFinite(r.tempoMs) && r.tempoMs >= 0)) return false;
  if (r.estado === "resolvido" && r.pistasUsadas !== 0) return false;
  if (r.estado === "resolvido_com_pistas" && r.pistasUsadas === 0) return false;
  if (r.estado !== "a_meio" && r.resolvidoEm === null) return false;
  return true;
}
const VALIDADORES = {
  tutorial: (t) => eObj(t) && eBool(t.concluido) && eDataOuNull(t.concluidoEm) && Array.isArray(t.introsVistas) && t.introsVistas.every((v) => VARIANTES_INTRO.has(v)),
  sequencia: (s) => eObj(s) && eInt0(s.atual) && eInt0(s.recorde) && eDataOuNull(s.ultimoDiaMantido) && eDataOuNull(s.diaMaisAltoVisto),
  lascas: (l) => eObj(l) && eInt0(l.saldo) && eInt0(l.ganhasTotal),
  pracas: (p) => eObj(p) && Object.entries(p).every(([k, v]) => (/^\d{4}-\d{2}$/.test(k) || /^PAC-[A-Z0-9-]+$/.test(k)) && eObj(v) && eDataOuNull(v.completaEm) && eBool(v.recompensaDada)),
  inventario: (i) => eObj(i) && eInt0(i.pistas) && eListaStr(i.itens) && eObj(i.equipado) && eStr(i.equipado.pedra) && eStr(i.equipado.paleta) && (i.equipado.moldura === null || eStr(i.equipado.moldura)) && eObj(i.loja) && eListaStr(i.loja.direitos) && (i.loja.atualizadoEm === null || eStr(i.loja.atualizadoEm)) && eListaStr(i.loja.consumiveisCreditados),
  definicoes: (d) => eObj(d) && eBool(d.avisos) && eBool(d.som) && eBool(d.vibracao),
  oficio: (o) => eObj(o) && eInt0(o.po) && Number.isInteger(o.nivel) && o.nivel >= 1 && o.nivel <= 5 && eListaStr(o.descobertas),
  objetivos: (o) => eObj(o) && eObj(o.cumpridos) && Object.values(o.cumpridos).every(eData) && eObj(o.hoje) && eObj(o.semana) && Array.isArray(o.semana.ids) && eObj(o.progresso),
  caminho: (c) => eObj(c) && Number.isInteger(c.nivel) && c.nivel >= 1 && ["resolvidos", "saltados", "tro\xE7osPagos"].every((k) => Array.isArray(c[k]) && c[k].every((x) => Number.isInteger(x) && x >= 1)) && eObj(c.hoje) && (c.hoje.dia === null || eData(c.hoje.dia)) && eInt0(c.hoje.lascas)
};
function validar(entrada, agora = /* @__PURE__ */ new Date()) {
  const doc = structuredClone(entrada);
  let reposto = false;
  for (const s of SECCOES) {
    if (s === "puzzles") {
      if (!eObj(doc.puzzles)) {
        doc.puzzles = {};
        reposto = true;
        continue;
      }
      for (const [id, r] of Object.entries(doc.puzzles)) {
        if (!registoPuzzleValido(r)) {
          delete doc.puzzles[id];
          reposto = true;
        }
      }
      continue;
    }
    let ok = false;
    try {
      ok = VALIDADORES[s](doc[s]);
    } catch {
      ok = false;
    }
    if (!ok) {
      doc[s] = SECCOES_INICIAIS[s]();
      reposto = true;
    }
  }
  const iso = isoLocal(agora);
  if (!eStr(doc.criadoEm)) doc.criadoEm = iso;
  if (!eStr(doc.atualizadoEm)) doc.atualizadoEm = iso;
  if (!eStr(doc.appVersao)) doc.appVersao = APP_VERSAO;
  return { doc, reposto };
}
function armazemMemoria(inicial = {}) {
  const m = new Map(Object.entries(inicial));
  return {
    tipo: "memoria",
    mapa: m,
    async obter(k) {
      return m.has(k) ? m.get(k) : null;
    },
    async definir(k, v) {
      m.set(k, String(v));
    }
  };
}
function armazemLocalStorage(ls = globalThis.localStorage) {
  return {
    tipo: "localStorage",
    async obter(k) {
      try {
        return ls.getItem(k);
      } catch {
        return null;
      }
    },
    async definir(k, v) {
      ls.setItem(k, v);
    }
    // um erro (quota, modo privado) sobe para escrever(), que o apanha
  };
}
function armazemPreferences(prefs) {
  return {
    tipo: "preferences",
    async obter(k) {
      const r = await prefs.get({ key: k });
      return r && r.value != null ? r.value : null;
    },
    async definir(k, v) {
      await prefs.set({ key: k, value: v });
    }
  };
}
function armazemPorOmissao() {
  const cap = globalThis.Capacitor;
  try {
    if (cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Preferences) {
      return armazemPreferences(cap.Plugins.Preferences);
    }
  } catch {
  }
  try {
    if (globalThis.localStorage) {
      const t = "__seixo_teste__";
      globalThis.localStorage.setItem(t, "1");
      globalThis.localStorage.removeItem(t);
      return armazemLocalStorage(globalThis.localStorage);
    }
  } catch {
  }
  return armazemMemoria();
}
function interpretar(texto, migracoes, agora, versaoAtual) {
  let bruto;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { tipo: "corrompida" };
  }
  if (!eObj(bruto) || !Number.isInteger(bruto.versao) || bruto.versao < 1) return { tipo: "corrompida" };
  if (bruto.versao > versaoAtual) return { tipo: "futura" };
  let doc;
  try {
    doc = migrar(bruto, { migracoes, ate: versaoAtual });
  } catch {
    return { tipo: "corrompida" };
  }
  const v = validar(doc, agora);
  return { tipo: "ok", doc: v.doc, versaoOriginal: bruto.versao, reposto: v.reposto };
}
function criarGravacao(opcoes = {}) {
  var _a;
  const armazem = opcoes.armazem || armazemPorOmissao();
  const migracoes = opcoes.migracoes || MIGRACOES;
  const versaoAtual = opcoes.versaoAtual || VERSAO_ATUAL;
  const relogio = opcoes.relogio || (() => /* @__PURE__ */ new Date());
  const emitirEv = opcoes.emitir || emitir;
  const debounceMs = (_a = opcoes.debounceMs) != null ? _a : GRAVACAO_DEBOUNCE_MS;
  const tempo = opcoes.temporizador || { definir: (f, ms) => setTimeout(f, ms), limpar: (h) => clearTimeout(h) };
  let bloqueada = false;
  let pendente = null;
  let temporizador = null;
  let fila = Promise.resolve();
  function avisar(tipo) {
    try {
      emitirEv("gravacao:aviso", { tipo });
    } catch {
    }
  }
  function cancelar() {
    if (temporizador !== null) {
      tempo.limpar(temporizador);
      temporizador = null;
    }
  }
  async function guardar(k, v) {
    try {
      await armazem.definir(k, v);
      return true;
    } catch (e) {
      console.warn(`[gravacao] n\xE3o gravei ${k}:`, e);
      return false;
    }
  }
  async function lerInterno() {
    const agora = relogio();
    let texto = null;
    try {
      texto = await armazem.obter(CHAVE);
    } catch {
      texto = null;
    }
    if (texto === null || texto === void 0) {
      return { dados: estadoInicial(agora, versaoAtual), aviso: null };
    }
    const r = interpretar(texto, migracoes, agora, versaoAtual);
    if (r.tipo === "futura") {
      bloqueada = true;
      return { dados: estadoInicial(agora, versaoAtual), aviso: "versao_nova" };
    }
    if (r.tipo === "ok") {
      if (r.versaoOriginal < versaoAtual) {
        await guardar(chaveVersao(r.versaoOriginal), texto);
        await escreverInterno(r.doc);
      }
      return { dados: r.doc, aviso: r.reposto ? "seccao_reposta" : null };
    }
    await guardar(CHAVE_CORROMPIDA, texto);
    let anterior = null;
    try {
      anterior = await armazem.obter(CHAVE_ANTERIOR);
    } catch {
      anterior = null;
    }
    if (anterior !== null && anterior !== void 0) {
      const ra = interpretar(anterior, migracoes, agora, versaoAtual);
      if (ra.tipo === "ok") {
        if (ra.versaoOriginal < versaoAtual) await guardar(chaveVersao(ra.versaoOriginal), anterior);
        await escreverInterno(ra.doc);
        return { dados: ra.doc, aviso: "recuperada_anterior" };
      }
    }
    return { dados: estadoInicial(agora, versaoAtual), aviso: "reposta" };
  }
  async function escreverInterno(dados) {
    if (bloqueada) return false;
    try {
      dados.atualizadoEm = isoLocal(relogio());
      const texto = JSON.stringify(dados);
      const relido = JSON.parse(texto);
      if (!eObj(relido) || relido.versao !== versaoAtual) return false;
      let atual = null;
      try {
        atual = await armazem.obter(CHAVE);
      } catch {
        atual = null;
      }
      if (atual !== null && atual !== void 0 && atual !== texto) {
        let valida = false;
        try {
          const a = JSON.parse(atual);
          valida = eObj(a) && Number.isInteger(a.versao) && a.versao >= 1;
        } catch {
          valida = false;
        }
        if (valida) await guardar(CHAVE_ANTERIOR, atual);
      }
      return await guardar(CHAVE, texto);
    } catch (e) {
      console.warn("[gravacao] escrita falhou:", e);
      return false;
    }
  }
  function emFila(f) {
    const p = fila.then(f, f);
    fila = p.then(() => void 0, () => void 0);
    return p;
  }
  return {
    armazem,
    get bloqueada() {
      return bloqueada;
    },
    // Lê no arranque. Devolve { dados, aviso, textoAviso } (aviso = tipo de gravacao:aviso ou null) e emite o aviso uma vez.
    async ler() {
      let res;
      try {
        res = await emFila(lerInterno);
      } catch (e) {
        console.warn("[gravacao] leitura falhou:", e);
        res = { dados: estadoInicial(relogio(), versaoAtual), aviso: "reposta" };
      }
      if (res.aviso) avisar(res.aviso);
      return { ...res, textoAviso: res.aviso ? TEXTO_AVISO[res.aviso] : null };
    },
    // Escreve já (cancela o debounce pendente). Devolve true se gravou.
    escrever(dados) {
      cancelar();
      pendente = null;
      return emFila(() => escreverInterno(dados));
    },
    // Agenda uma escrita com debounce (a cada jogada). Várias chamadas seguidas → uma escrita, a do último documento.
    agendar(dados) {
      pendente = dados;
      cancelar();
      temporizador = tempo.definir(() => {
        temporizador = null;
        const d = pendente;
        pendente = null;
        if (d) emFila(() => escreverInterno(d));
      }, debounceMs);
    },
    // Grava de imediato o que estiver pendente (app:pausa, puzzle:resolvido, trocas, direitos).
    gravarJa(dados) {
      const d = dados || pendente;
      cancelar();
      pendente = null;
      return d ? emFila(() => escreverInterno(d)) : emFila(async () => false);
    },
    temPendente() {
      return pendente !== null;
    }
  };
}
const EVENTOS_DEBOUNCE = Object.freeze(["puzzle:pedra", "puzzle:desfeito", "puzzle:recomecado", "puzzle:pista"]);
const EVENTOS_IMEDIATOS = Object.freeze(["app:pausa", "puzzle:resolvido", "loja:troca", "compras:direitos"]);
function ligarAosEventos(gravacao2, ouvir, documento) {
  return ouvir((nome) => {
    if (EVENTOS_DEBOUNCE.includes(nome)) gravacao2.agendar(documento());
    else if (EVENTOS_IMEDIATOS.includes(nome)) gravacao2.gravarJa(documento());
  });
}
let instancia = null;
function gravacao() {
  if (!instancia) instancia = criarGravacao();
  return instancia;
}
const ler = () => gravacao().ler();
const escrever = (dados) => gravacao().escrever(dados);
const agendar = (dados) => gravacao().agendar(dados);
const gravarJa = (dados) => gravacao().gravarJa(dados);
export {
  APP_VERSAO,
  CHAVE,
  CHAVE_ANTERIOR,
  CHAVE_CORROMPIDA,
  EVENTOS_DEBOUNCE,
  EVENTOS_IMEDIATOS,
  GRAVACAO_DEBOUNCE_MS,
  ITENS_INICIAIS,
  SECCOES,
  TEXTO_AVISO,
  agendar,
  armazemLocalStorage,
  armazemMemoria,
  armazemPorOmissao,
  armazemPreferences,
  chaveVersao,
  criarGravacao,
  escrever,
  estadoInicial,
  gravacao,
  gravarJa,
  isoLocal,
  ler,
  ligarAosEventos,
  registoPuzzleValido,
  validar
};
