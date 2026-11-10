const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const PREFIXO = "SEIXO-";
const AMIGOS_MAX = 20;
const CODIGO_VALIDADE_DIAS = 90;
const NOME_MIN = 3, NOME_MAX = 16, NOME_OMISSAO = "Calceteiro";
const EPOCA = Date.UTC(2026, 0, 1);
const RE_ID = new RegExp(`^[${ALFABETO}]{8}$`);
const dias = (iso) => Math.floor((Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) - EPOCA) / 864e5);
const deDias = (n) => new Date(EPOCA + n * 864e5).toISOString().slice(0, 10);
const num = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const enc = (v, k) => {
  let s = "";
  for (let i = 0; i < k; i++) {
    s = ALFABETO[v % 32] + s;
    v = Math.floor(v / 32);
  }
  return s;
};
const dec = (s) => {
  let v = 0;
  for (const c of s) {
    const i = ALFABETO.indexOf(c);
    if (i < 0) return NaN;
    v = v * 32 + i;
  }
  return v;
};
function crc(texto) {
  let h = 7;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) % 1021;
  return enc(h, 2);
}
function gerarIdLocal(rand = Math.random) {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFABETO[Math.floor(rand() * 32) % 32];
  return s;
}
function nomeValido(n) {
  const s = String(n != null ? n : "").trim();
  return s.length >= NOME_MIN && s.length <= NOME_MAX ? s : null;
}
function garantirSocial(doc, rand = Math.random) {
  if (!doc.social || typeof doc.social !== "object") doc.social = {};
  const s = doc.social;
  if (!RE_ID.test(s.idLocal || "")) s.idLocal = gerarIdLocal(rand);
  if (typeof s.nome !== "string") s.nome = "";
  if (!Array.isArray(s.amigos)) s.amigos = [];
  return s;
}
const resolvido = (r) => !!r && (r.estado === "resolvido" || r.estado === "resolvido_com_pistas");
const FAIXA = { facil: "F", medio: "M", dificil: "D" };
function melhoresTempos(doc, dificuldadeDe) {
  const r = { F: 0, M: 0, D: 0 };
  for (const [id, reg] of Object.entries(doc && doc.puzzles || {})) {
    if (!reg || reg.estado !== "resolvido" || !(reg.tempoMs > 0)) continue;
    const f = FAIXA[dificuldadeDe && dificuldadeDe(id) || "medio"] || "M";
    const s = Math.max(1, Math.round(reg.tempoMs / 1e3));
    if (!r[f] || s < r[f]) r[f] = s;
  }
  return r;
}
function cartaoDe(doc, hoje, dificuldadeDe) {
  const s = garantirSocial(doc);
  const puz = doc && doc.puzzles || {};
  const diarios = Object.keys(puz).filter((id) => /^D-\d{4}-\d{2}-\d{2}$/.test(id) && resolvido(puz[id])).length;
  const mes = hoje.slice(0, 7);
  const diariosMes = Object.entries(puz).filter(([id, r]) => /^D-/.test(id) && resolvido(r) && String(r.resolvidoEm || "").slice(0, 7) === mes).length;
  const pracas = Object.values(doc && doc.pracas || {}).filter((p) => p && p.completaEm).length;
  const seq = doc && doc.sequencia || {};
  return {
    id: s.idLocal,
    nome: nomeValido(s.nome) || NOME_OMISSAO,
    nivel: doc.oficio && doc.oficio.nivel || 1,
    po: doc.oficio && doc.oficio.po || 0,
    seq: seq.atual || 0,
    recorde: seq.recorde || 0,
    diarios,
    diariosMes,
    pracas,
    tempos: melhoresTempos(doc, dificuldadeDe),
    data: hoje
  };
}
function gerarCodigo(c) {
  const corpo = enc(num(c.nivel, 5), 1) + enc(num(c.po, 1023), 2) + enc(num(c.seq, 1023), 2) + enc(num(c.recorde, 1023), 2) + enc(num(c.diarios, 1023), 2) + enc(num(c.pracas, 1023), 2) + enc(num(c.tempos.F, 32767), 3) + enc(num(c.tempos.M, 32767), 3) + enc(num(c.tempos.D, 32767), 3) + enc(num(dias(c.data), 32767), 3);
  const base = `${PREFIXO}${c.id}-${corpo}`;
  return base + crc(base);
}
function lerCodigo(texto, hoje) {
  const s = String(texto != null ? texto : "").trim().toUpperCase().replace(/\s+/g, "");
  const m = /^SEIXO-([2-9A-HJ-NP-Z]{8})-([2-9A-HJ-NP-Z]{23})([2-9A-HJ-NP-Z]{2})$/.exec(s);
  if (!m || s.length > 64) return { ok: false, erro: "formato" };
  if (crc(s.slice(0, -2)) !== m[3]) return { ok: false, erro: "crc" };
  const d = m[2], v = (a, k) => dec(d.slice(a, a + k));
  const data = deDias(v(20, 3));
  if (!(dias(data) >= 0) || dias(data) > dias(hoje) + CODIGO_VALIDADE_DIAS) return { ok: false, erro: "data" };
  const nivel = v(0, 1);
  if (nivel < 1 || nivel > 5) return { ok: false, erro: "formato" };
  return { ok: true, cartao: {
    id: m[1],
    nivel,
    po: v(1, 2),
    seq: v(3, 2),
    recorde: v(5, 2),
    diarios: v(7, 2),
    pracas: v(9, 2),
    tempos: { F: v(11, 3) || 0, M: v(14, 3) || 0, D: v(17, 3) || 0 },
    data
  } };
}
function adicionarAmigo(doc, texto, hoje, { nome = "" } = {}) {
  const s = garantirSocial(doc);
  const r = lerCodigo(texto, hoje);
  if (!r.ok) return r;
  const c = r.cartao;
  if (c.id === s.idLocal) return { ok: false, erro: "propria" };
  const i = s.amigos.findIndex((a2) => a2.id === c.id);
  if (i >= 0) {
    if (c.data < s.amigos[i].cartao.data) return { ok: false, erro: "antigo" };
    s.amigos[i] = { ...s.amigos[i], cartao: c, atualizadoEm: hoje };
    return { ok: true, amigo: s.amigos[i], evento: ["amigo:atualizado", { id_local: c.id }] };
  }
  if (s.amigos.length >= AMIGOS_MAX) return { ok: false, erro: "cheia" };
  const a = { id: c.id, nome: nomeValido(nome) || `${NOME_OMISSAO} ${c.id.slice(0, 4)}`, cartao: c, atualizadoEm: hoje };
  s.amigos.push(a);
  return { ok: true, amigo: a, evento: ["amigo:adicionado", { id_local: c.id }] };
}
function removerAmigo(doc, id) {
  const s = garantirSocial(doc);
  const n = s.amigos.length;
  s.amigos = s.amigos.filter((a) => a.id !== id);
  return s.amigos.length < n;
}
const COLUNAS = Object.freeze(["seq", "recorde", "po", "diarios", "tF", "tM", "tD"]);
const valorDe = (c, col) => col[0] === "t" ? c.tempos[col[1]] : c[col];
const tempoTexto = (s) => s > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "\u2013";
function tabelaCalceteiros(doc, hoje, dificuldadeDe, coluna = "seq") {
  const col = COLUNAS.includes(coluna) ? coluna : "seq";
  const eu = cartaoDe(doc, hoje, dificuldadeDe);
  const fmt = (c) => {
    const v = valorDe(c, col);
    return col[0] === "t" ? tempoTexto(v) : String(v);
  };
  const amigos = [...doc.social.amigos].sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
  return {
    coluna: col,
    linhas: [
      { id: eu.id, nome: eu.nome, proprio: true, valor: valorDe(eu, col), texto: fmt(eu), nivel: eu.nivel },
      ...amigos.map((a) => ({ id: a.id, nome: a.nome, proprio: false, valor: valorDe(a.cartao, col), texto: fmt(a.cartao), nivel: a.cartao.nivel }))
    ]
  };
}
function meusRecordes(doc, hoje, dificuldadeDe) {
  const c = cartaoDe(doc, hoje, dificuldadeDe);
  const porMes = {};
  for (const [id, r] of Object.entries(doc.puzzles || {})) {
    if (/^D-/.test(id) && resolvido(r) && r.resolvidoEm) {
      const k = String(r.resolvidoEm).slice(0, 7);
      porMes[k] = (porMes[k] || 0) + 1;
    }
  }
  const meses = [];
  let a = +hoje.slice(0, 4), m = +hoje.slice(5, 7);
  for (let i = 0; i < 12; i++) {
    const k = `${a}-${String(m).padStart(2, "0")}`;
    meses.unshift({ mes: k, n: porMes[k] || 0 });
    m--;
    if (m === 0) {
      m = 12;
      a--;
    }
  }
  return { recorde: c.recorde, tempos: c.tempos, diariosMes: c.diariosMes, diarios: c.diarios, pracas: c.pracas, meses };
}
function recordesNovos(antes, depois) {
  const r = [];
  for (const f of ["F", "M", "D"]) if (depois[f] > 0 && (!antes[f] || depois[f] < antes[f])) r.push({ tipo: "tempo", faixa: f, valor: depois[f] });
  return r;
}
export {
  ALFABETO,
  AMIGOS_MAX,
  CODIGO_VALIDADE_DIAS,
  COLUNAS,
  NOME_MAX,
  NOME_MIN,
  NOME_OMISSAO,
  PREFIXO,
  adicionarAmigo,
  cartaoDe,
  crc,
  garantirSocial,
  gerarCodigo,
  gerarIdLocal,
  lerCodigo,
  melhoresTempos,
  meusRecordes,
  nomeValido,
  recordesNovos,
  removerAmigo,
  tabelaCalceteiros,
  tempoTexto
};
