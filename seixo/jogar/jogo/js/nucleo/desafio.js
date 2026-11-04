import { ALFABETO } from "./amigos.js";
import { TEMPO_MIN_MS } from "./objetivos.js";
const VERSAO = "SEX1", MAX_CARS = 40, TEMPO_MAX_S = 3 * 3600, HISTORICO_MAX = 20;
const FAIXAS = ["F", "M", "D"];
const PACOTE_SIGLA = { "PAC-ROSSIO": "RO", "PAC-CHIADO": "CH", "PAC-RIBEIRA": "RB", "PAC-RIA": "RI", "PAC-MOSTEIRO": "MO", "PAC-AZULEJO-CALCADA": "AZ" };
const ID_VAZIO = "--------";
const RE_REF = /^(?:D\d{8}|E[1-6]\d{2}|C\d{1,4}|P[A-Z]{2}\d{1,3})$/;
const RE_ID = new RegExp(`^(?:[${ALFABETO}]{8}|-{8})$`);
const b32 = (n) => {
  if (n === 0) return "0";
  let s = "";
  while (n > 0) {
    s = ALFABETO[n % 32] + s;
    n = Math.floor(n / 32);
  }
  return s;
};
const deB32 = (s) => {
  if (s === "0") return 0;
  let v = 0;
  for (const c of s) {
    const i = ALFABETO.indexOf(c);
    if (i < 0) return NaN;
    v = v * 32 + i;
  }
  return v;
};
function crc16(texto) {
  let c = 65535;
  const dados = "SEX1|" + texto;
  for (let i = 0; i < dados.length; i++) {
    c ^= (dados.charCodeAt(i) & 255) << 8;
    for (let k = 0; k < 8; k++) c = c & 32768 ? (c << 1 ^ 4129) & 65535 : c << 1 & 65535;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
function refDeId(id) {
  const s = String(id || "");
  let m;
  if (m = /^D-(\d{4})-(\d{2})-(\d{2})$/.exec(s)) return `D${m[1]}${m[2]}${m[3]}`;
  if (m = /^EST-([1-6])-(\d{1,2})$/.exec(s)) return `E${m[1]}${String(m[2]).padStart(2, "0")}`;
  if (m = /^CAM-(\d{1,4})$/.exec(s)) return `C${m[1]}`;
  if ((m = /^(PAC-[A-Z-]+)-(\d{1,3})$/.exec(s)) && PACOTE_SIGLA[m[1]]) return `P${PACOTE_SIGLA[m[1]]}${Number(m[2])}`;
  return null;
}
function idDeRef(ref) {
  const r = String(ref || "");
  let m;
  if (m = /^D(\d{4})(\d{2})(\d{2})$/.exec(r)) return `D-${m[1]}-${m[2]}-${m[3]}`;
  if (m = /^E([1-6])(\d{2})$/.exec(r)) return `EST-${m[1]}-${m[2]}`;
  if (m = /^C(\d{1,4})$/.exec(r)) return `CAM-${m[1]}`;
  if (m = /^P([A-Z]{2})(\d{1,3})$/.exec(r)) {
    const p = Object.keys(PACOTE_SIGLA).find((k) => PACOTE_SIGLA[k] === m[1]);
    return p ? `${p}-${String(m[2]).padStart(2, "0")}` : null;
  }
  return null;
}
const faixaDe = (dificuldade) => ({ facil: "F", medio: "M", dificil: "D" })[dificuldade] || null;
function gerarCodigo({ ref, faixa, tempoMs = 0, semPista = true, idLocal = null }) {
  if (!RE_REF.test(ref || "") || !FAIXAS.includes(faixa)) return null;
  let s = 0;
  if (semPista && tempoMs > 0) {
    s = Math.max(Math.round(tempoMs / 1e3), 0);
    if (tempoMs < TEMPO_MIN_MS[faixa] || s > TEMPO_MAX_S) s = 0;
  }
  const id = RE_ID.test(idLocal || "") ? idLocal : ID_VAZIO;
  const corpo = `${VERSAO}-${ref}-${faixa}-${b32(s)}-${id}`;
  const cod = `${corpo}-${crc16(corpo)}`;
  return cod.length <= MAX_CARS ? cod : null;
}
function extrair(texto) {
  const m = /SEX1-[0-9A-Z-]{6,40}/i.exec(String(texto == null ? "" : texto).slice(0, 2e3));
  return m ? m[0].toUpperCase() : null;
}
function lerCodigo(texto) {
  try {
    const cod = extrair(texto);
    const bruto = String(texto == null ? "" : texto).trim();
    if (!cod) return { ok: false, erro: /^SEX\d/i.test(bruto) || /^SEIXO-D-/i.test(bruto) ? "versao" : "invalido" };
    if (cod.length > MAX_CARS) return { ok: false, erro: "invalido" };
    const m = /^SEX1-([A-Z0-9]+)-([A-Z])-([0-9A-Z]+)-([0-9A-Z]{8}|-{8})-([0-9A-F]{4})$/.exec(cod);
    if (!m) return { ok: false, erro: "invalido" };
    const [, ref, faixa, t, id, c] = m;
    if (c !== crc16(cod.slice(0, cod.length - 5))) return { ok: false, erro: "invalido" };
    const tempoS = deB32(t);
    if (!RE_REF.test(ref) || !FAIXAS.includes(faixa) || !Number.isInteger(tempoS) || !RE_ID.test(id)) return { ok: false, erro: "invalido" };
    if (tempoS !== 0 && (tempoS * 1e3 < TEMPO_MIN_MS[faixa] || tempoS > TEMPO_MAX_S)) return { ok: false, erro: "invalido" };
    return { ok: true, ref, faixa, tempoS, idLocal: id === ID_VAZIO ? null : id };
  } catch {
    return { ok: false, erro: "invalido" };
  }
}
const compararTempos = (meuS, delaS) => meuS < delaS ? "bateste" : meuS === delaS ? "empataste" : "nao_bateste";
function registarResultado(doc, { ref, de = null, tempoDele, meuTempo, resultado, data }) {
  if (!Array.isArray(doc.desafios)) doc.desafios = [];
  doc.desafios = doc.desafios.filter((d) => !(d.ref === ref && d.tempoDele === tempoDele));
  doc.desafios.unshift({ ref, de, tempoDele, meuTempo, resultado, data });
  doc.desafios.length = Math.min(doc.desafios.length, HISTORICO_MAX);
  return doc.desafios[0];
}
const respondido = (doc, ref, tempoDele) => (Array.isArray(doc.desafios) ? doc.desafios : []).find((d) => d.ref === ref && d.tempoDele === tempoDele) || null;
export {
  HISTORICO_MAX,
  MAX_CARS,
  TEMPO_MAX_S,
  VERSAO,
  compararTempos,
  crc16,
  extrair,
  faixaDe,
  gerarCodigo,
  idDeRef,
  lerCodigo,
  refDeId,
  registarResultado,
  respondido
};
