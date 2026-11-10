import { MULTI, NIVEIS_ORDEM, PONTOS_MOINHO, PONTOS_NIVEL } from "../config.js";
import { novaPartida, jogarCompleta } from "./partida.js";
import { fase, removiveis, jogar, jogadasCompletas } from "./regras.js";
import { mulberry32 } from "./prng.js";
const VERSAO_CODIGO = "MOI1";
const B32 = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
const SAL = "moinho-v1";
const b32 = (n) => B32[n];
const deB32 = (c) => B32.indexOf(c);
const erro = (e) => ({ ok: false, erro: e });
function crc16(texto) {
  let c = 65535;
  for (const ch of texto + SAL) {
    c ^= (ch.charCodeAt(0) & 255) << 8;
    for (let i = 0; i < 8; i++) c = c & 32768 ? (c << 1 ^ 4129) & 65535 : c << 1 & 65535;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}
function sementeParaTexto(s) {
  let t = "";
  for (let i = 0; i < 6; i++) {
    t = b32(s % 32) + t;
    s = Math.floor(s / 32);
  }
  return t;
}
function textoParaSemente(t) {
  if (!/^[0-9A-V]{6}$/.test(t)) return null;
  let s = 0;
  for (const c of t) s = s * 32 + deB32(c);
  return s;
}
const SEMENTE_MAX = 2 ** 30 - 1;
const corInicialA = (semente) => Math.floor(semente / 8) % 2 + 1;
function codificarJogada(m, noColocar) {
  if (m === "X" || m === "W") return m;
  return (noColocar ? "" : b32(m.de)) + b32(m.para) + (m.tirar === void 0 ? "-" : b32(m.tirar));
}
function gerarCodigo(semente, corA, jogadas) {
  let p = novaPartida({ modo: "2j", semente }), t = "";
  for (const m of jogadas) {
    t += codificarJogada(m, m !== "X" && m !== "W" && fase(p.estado) === "colocar");
    if (m !== "X" && m !== "W") p = jogarCompleta(p, m);
  }
  const base = `${VERSAO_CODIGO}-${sementeParaTexto(semente)}-${corA}-${t}`;
  return `${base}-${crc16(base)}`;
}
function jogarCompletaOuNada(p, m) {
  try {
    const mid = jogar(p.estado, m);
    if (mid.remover) {
      if (m.tirar === void 0 || !removiveis(mid).includes(m.tirar)) return null;
    } else if (m.tirar !== void 0) return null;
    return jogarCompleta(p, m);
  } catch {
    return null;
  }
}
function lerCodigo(texto) {
  if (typeof texto !== "string") return erro("invalido");
  const t = texto.trim();
  if (t.length > MULTI.maxCodigo) return erro("limite");
  const partes = t.split("-");
  if (partes.length < 5) return erro("invalido");
  if (partes[0] !== VERSAO_CODIGO) return erro(/^MOI\d+$/.test(partes[0]) ? "versao" : "invalido");
  const crc = partes[partes.length - 1];
  const base = t.slice(0, t.length - crc.length - 1);
  if (!/^[0-9A-F]{4}$/.test(crc) || crc !== crc16(base)) return erro("crc");
  const semente = textoParaSemente(partes[1]);
  const corA = Number(partes[2]);
  if (semente === null || corA !== 1 && corA !== 2) return erro("invalido");
  const corpo = partes.slice(3, -1).join("-");
  let p = novaPartida({ modo: "2j", semente }), i = 0, desistiu = null;
  const jogadas = [];
  while (i < corpo.length) {
    if (desistiu || p.estado.fim) return erro("ilegal");
    if (jogadas.length >= MULTI.maxJogadas + 1) return erro("limite");
    if (corpo[i] === "X") {
      desistiu = p.estado.vez;
      jogadas.push("X");
      i++;
      continue;
    }
    if (corpo[i] === "W") {
      desistiu = 3 - p.estado.vez;
      jogadas.push("W");
      i++;
      continue;
    }
    const colocar = fase(p.estado) === "colocar";
    const tam = colocar ? 2 : 3;
    if (i + tam > corpo.length) return erro("invalido");
    const s = corpo.slice(i, i + tam);
    i += tam;
    const m = {};
    let k = 0;
    if (!colocar) m.de = deB32(s[k++]);
    m.para = deB32(s[k++]);
    if (s[k] !== "-") m.tirar = deB32(s[k]);
    for (const v of [m.de, m.para, m.tirar]) if (v !== void 0 && (v < 0 || v > 23)) return erro("ilegal");
    const q = jogarCompletaOuNada(p, m);
    if (!q) return erro("ilegal");
    p = q;
    jogadas.push(m);
  }
  if (jogadas.filter((m) => m !== "X" && m !== "W").length > MULTI.maxJogadas) return erro("limite");
  return { ok: true, semente, corA, jogadas, partida: p, desistiu };
}
function situacao(r) {
  const e = r.partida.estado;
  if (r.desistiu) return { fim: true, vencedor: 3 - r.desistiu, motivo: "desistiu" };
  if (e.fim) return { fim: true, vencedor: e.fim.resultado, motivo: e.fim.motivo };
  return { fim: false, vez: e.vez };
}
const corDe = (g) => g.euSou === "A" ? g.corA : 3 - g.corA;
function estadoDaPartida(g, agora = Date.now()) {
  const r = lerCodigo(g.codigo);
  if (!r.ok) return "invalida";
  const s = situacao(r);
  if (s.fim) return "terminada";
  if (agora - g.atualizada > MULTI.esquecidaDias * 864e5) return "esquecida";
  return s.vez === corDe(g) ? "minha_vez" : "a_espera";
}
const igualJogada = (a, b) => typeof a === "string" || typeof b === "string" ? a === b : a.de === b.de && a.para === b.para && a.tirar === b.tirar;
function importarCodigo(lista, texto, { agora = Date.now(), euSou = "B" } = {}) {
  const r = lerCodigo(texto);
  if (!r.ok) return r;
  const codigo = texto.trim();
  const i = lista.findIndex((g2) => g2.semente === r.semente);
  if (i < 0) {
    if (lista.length >= MULTI.maxPartidas) return erro("cheia");
    const g2 = { semente: r.semente, corA: r.corA, euSou, codigo, jogadas: r.jogadas.length, atualizada: agora };
    return { ok: true, lista: [...lista, g2], partida: g2, nova: true };
  }
  const g = lista[i], ant = lerCodigo(g.codigo);
  if (ant.ok) {
    if (r.jogadas.length < ant.jogadas.length) return erro("antigo");
    for (let k = 0; k < ant.jogadas.length; k++) if (!igualJogada(ant.jogadas[k], r.jogadas[k])) return erro("alterada");
    if (r.jogadas.length === ant.jogadas.length) return erro("antigo");
  }
  const ng = { ...g, codigo, jogadas: r.jogadas.length, atualizada: agora };
  const nl = lista.slice();
  nl[i] = ng;
  return { ok: true, lista: nl, partida: ng, nova: false };
}
function criarConvite(lista, semente, { agora = Date.now() } = {}) {
  if (lista.length >= MULTI.maxPartidas) return erro("cheia");
  const corA = corInicialA(semente);
  const g = { semente, corA, euSou: "A", codigo: gerarCodigo(semente, corA, []), jogadas: 0, atualizada: agora };
  return { ok: true, lista: [...lista, g], partida: g, codigo: g.codigo };
}
function jogarNaPartida(lista, semente, jogada, { agora = Date.now() } = {}) {
  const i = lista.findIndex((g2) => g2.semente === semente);
  if (i < 0) return erro("invalido");
  const g = lista[i], r = lerCodigo(g.codigo);
  if (!r.ok || situacao(r).fim) return erro("ilegal");
  const minhaVez = r.partida.estado.vez === corDe(g);
  if (minhaVez === (jogada === "W")) return erro("ilegal");
  const codigo = gerarCodigo(semente, g.corA, [...r.jogadas, jogada]);
  const v = lerCodigo(codigo);
  if (!v.ok) return erro("ilegal");
  const ng = { ...g, codigo, jogadas: v.jogadas.length, atualizada: agora };
  const nl = lista.slice();
  nl[i] = ng;
  return { ok: true, lista: nl, partida: ng, codigo };
}
function sementeDoDia(data) {
  const d = typeof data === "string" ? data : new Date(data).toISOString().slice(0, 10);
  let h = 2166136261;
  for (const c of d) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % (SEMENTE_MAX + 1);
}
function posicaoDoDia(data, jogadasIniciais = 6) {
  const rng = mulberry32(sementeDoDia(data));
  let p = novaPartida({ modo: "ia", nivel: "media", semente: sementeDoDia(data) });
  for (let i = 0; i < jogadasIniciais && !p.estado.fim; i++) {
    const ms = jogadasCompletas(p.estado);
    p = jogarCompleta(p, ms[Math.floor(rng() * ms.length)]);
  }
  return p;
}
const podeJogarDesafio = (ultimoDia, hoje) => ultimoDia !== hoje;
function pontosPartida(nivel, resultado, { semPerder = false, jogadas = 99, desafio = false } = {}, jaHoje = 0) {
  if (!desafio && !NIVEIS_ORDEM.includes(nivel)) return { ganhos: 0, total: jaHoje };
  const base = desafio ? 0 : PONTOS_NIVEL[nivel];
  let p = 0;
  if (resultado === "v") {
    p = base + (semPerder ? PONTOS_MOINHO.bonusSemPerder : 0) + (jogadas <= PONTOS_MOINHO.jogadasRapida ? PONTOS_MOINHO.bonusRapida : 0);
    if (desafio) p += PONTOS_MOINHO.desafioDiario;
  } else if (resultado === "e") p = Math.floor(base / 2);
  const ganhos = Math.max(0, Math.min(p, PONTOS_MOINHO.maxDia - jaHoje));
  return { ganhos, total: jaHoje + ganhos };
}
const IMPROPRIAS = ["merda", "caralho", "puta", "foda", "cona", "cabrao", "porra"];
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function validarAlcunha(a) {
  if (typeof a !== "string") return erro("invalida");
  const t = a.trim();
  if (t.length < MULTI.alcunha[0] || t.length > MULTI.alcunha[1] || !/^[\p{L}\p{N}_.]+$/u.test(t)) return erro("invalida");
  const n = norm(t).replace(/[_.]/g, "").replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s");
  if (IMPROPRIAS.some((w) => n.includes(w))) return erro("impropria");
  return { ok: true, alcunha: t };
}
function novoPerfil(alcunha, avatar = 0, rng = Math.random) {
  const v = validarAlcunha(alcunha);
  if (!v.ok) return v;
  let id = "";
  for (let i = 0; i < 6; i++) id += b32(Math.floor(rng() * 32));
  return { ok: true, perfil: { alcunha: v.alcunha, avatar, id } };
}
function gerarCartao(perfil, pontos) {
  const base = `MOIP1-${perfil.alcunha}-${perfil.id}-${Math.max(0, Math.floor(pontos))}`;
  return `${base}-${crc16(base)}`;
}
function lerCartao(texto) {
  if (typeof texto !== "string") return erro("invalido");
  const p = texto.trim().split("-");
  if (p.length !== 5 || p[0] !== "MOIP1") return erro("invalido");
  if (p[4] !== crc16(p.slice(0, 4).join("-"))) return erro("crc");
  if (!validarAlcunha(p[1]).ok || !/^[0-9A-V]{6}$/.test(p[2]) || !/^\d{1,9}$/.test(p[3])) return erro("invalido");
  return { ok: true, alcunha: p[1], id: p[2], pontos: Number(p[3]), verificado: false };
}
function adicionarAmigo(tabela, texto, meuId = null) {
  const c = lerCartao(texto);
  if (!c.ok) return c;
  if (c.id === meuId) return erro("proprio");
  const i = tabela.findIndex((a) => a.id === c.id);
  if (i >= 0) {
    const t = tabela.slice();
    t[i] = c;
    return { ok: true, tabela: t };
  }
  if (tabela.length >= MULTI.maxAmigos) return erro("cheia");
  return { ok: true, tabela: [...tabela, c] };
}
const ordenarTabela = (tabela) => tabela.slice().sort((a, b) => b.pontos - a.pontos || a.alcunha.localeCompare(b.alcunha));
function sugerirNivel(nivel, resultados) {
  const i = NIVEIS_ORDEM.indexOf(nivel), u = resultados.slice(-3);
  if (i < 0 || u.length < 3) return null;
  if (u.every((r) => r === "v") && i < NIVEIS_ORDEM.length - 1) return { tipo: "subir", para: NIVEIS_ORDEM[i + 1] };
  if (u.every((r) => r === "d") && i > 0) return { tipo: "descer", para: NIVEIS_ORDEM[i - 1] };
  return null;
}
export {
  SEMENTE_MAX,
  VERSAO_CODIGO,
  adicionarAmigo,
  codificarJogada,
  corDe,
  corInicialA,
  crc16,
  criarConvite,
  estadoDaPartida,
  gerarCartao,
  gerarCodigo,
  importarCodigo,
  jogarNaPartida,
  lerCartao,
  lerCodigo,
  novoPerfil,
  ordenarTabela,
  podeJogarDesafio,
  pontosPartida,
  posicaoDoDia,
  sementeDoDia,
  sementeParaTexto,
  situacao,
  sugerirNivel,
  textoParaSemente,
  validarAlcunha
};
