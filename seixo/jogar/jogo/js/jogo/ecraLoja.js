import { aspeto, equipadoAtual, imagemCosmetico, imagemPacote } from "./cosmeticos.js";
import { desenharMiniatura } from "./praca.js";
import { desenharMoldura } from "./padroes.js";
import { eSazonal, textoSazonal } from "../meta/sazonal.js";
const AMOSTRA = "PBPBBPBPPBBPBPPB";
const LIMITE_FATURACAO_MS = 2e4;
function comLimite(p, aoExpirar, ms = LIMITE_FATURACAO_MS) {
  let h;
  const tempo = new Promise((res) => {
    h = setTimeout(() => res(aoExpirar), ms);
  });
  return Promise.race([Promise.resolve(p), tempo]).finally(() => clearTimeout(h));
}
function desenharAmostra(canvas, a) {
  const g = canvas && canvas.getContext && canvas.getContext("2d");
  if (!g) return false;
  const eq = equipadoAtual();
  if (a.categoria === "moldura") {
    const { cores: cores2 } = aspeto({ ...eq, moldura: null });
    desenharMoldura(canvas, a.id, cores2);
    const k = canvas.width / 3, sub = document.createElement("canvas");
    sub.width = Math.round(k);
    sub.height = Math.round(k);
    desenharMiniatura(sub, { n: 4, solucao: AMOSTRA });
    g.drawImage(sub, k, k);
    return true;
  }
  const cfg = a.categoria === "pedra" ? { ...eq, pedra: a.id } : { ...eq, pedra: "PEDRA-BASALTO", paleta: a.id };
  const { cores } = aspeto(cfg);
  const c = canvas.width / 4;
  g.fillStyle = cores.junta;
  g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 16; i++) {
    g.fillStyle = AMOSTRA[i] === "P" ? cores.preta : cores.branca;
    g.fillRect(i % 4 * c + 2, Math.floor(i / 4) * c + 2, c - 4, c - 4);
  }
  return true;
}
const SEPARADORES = Object.freeze({
  cosmeticos: ["pedra", "paleta", "moldura"],
  puzzles: ["pacote", "arquivo", "kit", "apoio"],
  // T-1493: «Sem anúncios» (categoria 'servico') tem cartão fixo no topo da Loja
  pistas: ["pista"],
  sons: ["som"],
  lascas: ["lascas"]
  // T-1466: pacotes de lascas (GDD §5.6); só abre com a conta sincronizada
});
const RE_MOLD_MES = /^MOLD-(\d{4})-(\d{2})$/;
function artigosDe(sep, catalogo, itens = [], sazonais = []) {
  const cats = SEPARADORES[sep] || [];
  const lista = (catalogo || []).filter((a) => cats.includes(a.categoria) && !a.modelo && !a.reservado);
  if (sep === "cosmeticos") {
    for (const id of itens) if (RE_MOLD_MES.test(id)) lista.push({ id, categoria: "moldura", gratis: false, eur: null, lascas: null, ganha: true });
  }
  const modelo = (catalogo || []).find((a) => a.id === "PAC-SAZ-AAAA-Q");
  if (cats.includes("pacote") && modelo) {
    for (const id of sazonais) if (eSazonal(id)) {
      const { modelo: _m, ...resto } = modelo;
      lista.push({ ...resto, id, eur: null, play_id: null });
    }
  }
  return lista;
}
function puzzleEmCurso(jogo) {
  var _a, _b;
  if (!jogo || jogo.resolvido) return false;
  return (((_a = jogo.historico) == null ? void 0 : _a.length) || 0) > 0 || (jogo.pistasUsadas || 0) > 0 || (((_b = jogo.reveladas) == null ? void 0 : _b.length) || 0) > 0;
}
const lojaVisivel = (jogo) => !puzzleEmCurso(jogo);
function criarEcraLoja(dep) {
  const { t, tn } = dep;
  const criar = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k === "hidden") e.hidden = !!v;
      else if (k === "disabled") e.disabled = !!v;
      else e.setAttribute(k, v);
    }
    e.append(...filhos);
    return e;
  };
  let sep = "cosmeticos";
  let ocupado = null;
  let restauro = false;
  let reconciliando = false;
  const raiz = criar("section", { id: "loja", class: "loja", role: "dialog", "aria-label": t("loja.titulo"), hidden: true });
  const titulo = criar("h2", { class: "loja-titulo" }, t("loja.titulo"));
  const fechar = criar("button", { id: "btn-loja-fechar", type: "button", class: "loja-fechar", "aria-label": t("comum.voltar") }, `\u2039 ${t("comum.voltar")}`);
  const restaurar = criar("button", { id: "btn-loja-restaurar", type: "button", class: "loja-restaurar" }, t("loja.restaurar"));
  const saldo = criar("p", { id: "loja-saldo", class: "loja-saldo" });
  const abas = criar("div", { class: "loja-abas", role: "tablist" });
  const msg = criar("p", { id: "loja-msg", class: "loja-msg", role: "status", "aria-live": "polite" });
  const lista = criar("div", { id: "loja-lista", class: "loja-lista", role: "list" });
  const saTexto = criar("div", { class: "loja-sa-texto" });
  const saBotao = criar("button", { id: "btn-loja-sem-anuncios", type: "button", class: "loja-eur" });
  const cartaoSA = criar("div", { id: "loja-sem-anuncios", class: "loja-sa" }, saTexto, saBotao);
  const versao = criar("p", { id: "loja-versao", class: "loja-versao" });
  saBotao.addEventListener("click", () => {
    api.comprar("SEM-ANUNCIOS").catch((e) => console.warn("[loja] compra falhou:", e));
  });
  raiz.append(criar("div", { class: "loja-topo" }, criar("div", { class: "loja-cab" }, fechar, titulo, saldo), restaurar, cartaoSA, abas, msg), lista, versao);
  for (const s of Object.keys(SEPARADORES)) {
    if (s === "sons" && !(dep.catalogo() || []).some((a) => a.categoria === "som")) continue;
    if (s === "lascas" && !((dep.catalogo() || []).some((a) => a.categoria === "lascas") && (!dep.eurVisivel || dep.eurVisivel()))) continue;
    const b = criar("button", { id: `btn-loja-sep-${s}`, type: "button", role: "tab", class: "loja-aba" }, t(`loja.sep_${s}`));
    b.addEventListener("click", () => {
      sep = s;
      render();
    });
    abas.append(b);
  }
  fechar.addEventListener("click", () => api.fechar());
  restaurar.addEventListener("click", () => {
    api.restaurar().catch((e) => console.warn("[loja] restaurar falhou:", e));
  });
  const saldoLascas = () => {
    var _a, _b;
    return (_b = (_a = dep.documento().lascas) == null ? void 0 : _a.saldo) != null ? _b : 0;
  };
  const nome = (a) => {
    var _a;
    const m = RE_MOLD_MES.exec(a.id);
    if (m) return t("artigo.MOLD-AAAA-MM.nome", { mes: t(`mes.titulo.${Number(m[2])}`), ano: m[1] });
    return (_a = textoSazonal(t, a.id, "nome")) != null ? _a : t(`artigo.${a.id}.nome`);
  };
  const desc = (a) => {
    var _a;
    const m = RE_MOLD_MES.exec(a.id);
    if (m) return t("artigo.MOLD-AAAA-MM.desc", { mes: t(`mes.${Number(m[2])}`), ano: m[1] });
    return (_a = textoSazonal(t, a.id, "desc")) != null ? _a : t(`artigo.${a.id}.desc`);
  };
  const precoEur = (id) => {
    try {
      const p = dep.produtos().find((x) => x.id === id);
      return p && p.disponivel ? p.preco : null;
    } catch {
      return null;
    }
  };
  function linha(a) {
    var _a, _b, _c, _d, _e;
    const doc = dep.documento();
    const eq = ((_a = doc.inventario) == null ? void 0 : _a.equipado) || {};
    const tipo = dep.tipoDe(a.id);
    const tem = !!a.gratis || dep.temItem(a.id);
    const acoes = criar("div", { class: "loja-acoes" });
    const extra = [];
    if (a.categoria === "pista") {
      extra.push(criar("p", { class: "loja-info" }, t("loja.pistas_info")));
      extra.push(criar("p", { class: "loja-info", id: "loja-pistas" }, tn("comum.pistas", (_c = (_b = doc.inventario) == null ? void 0 : _b.pistas) != null ? _c : 0, { n: (_e = (_d = doc.inventario) == null ? void 0 : _d.pistas) != null ? _e : 0 })));
      if (dep.extraPistas) {
        const x = dep.extraPistas();
        if (x) extra.push(x);
      }
    }
    if (a.categoria === "lascas") {
      const preco = precoEur(a.id);
      const b = criar("button", { id: `btn-eur-${a.id}`, type: "button", class: "loja-eur", disabled: preco == null || !!ocupado }, preco != null ? preco : t("loja.eur_sem_rede"));
      b.addEventListener("click", () => {
        api.comprar(a.id).catch((e) => console.warn("[loja] compra falhou:", e));
      });
      acoes.append(b);
    } else if (tem && !a.consumivel) {
      if (tipo) {
        const usado = eq[tipo] === a.id;
        const b = criar("button", { id: `btn-usar-${a.id}`, type: "button", class: usado ? "em-uso" : "", disabled: usado || !!ocupado }, t(usado ? "loja.em_uso" : "loja.usar"));
        b.addEventListener("click", () => {
          api.usar(a.id).catch((e) => console.warn("[loja] usar falhou:", e));
        });
        acoes.append(b);
      } else {
        acoes.append(criar("span", { class: "loja-tem", id: `loja-tem-${a.id}` }, t(a.gratis ? "loja.incluida" : "loja.possuido")));
        if (a.categoria === "apoio") extra.push(criar("p", { class: "loja-info" }, t("loja.apoio_obrigado")));
      }
    } else {
      if (Number.isInteger(a.lascas) && a.lascas > 0) {
        const faltam = a.lascas - saldoLascas();
        const b = criar("button", { id: `btn-lascas-${a.id}`, type: "button", disabled: !!ocupado }, tn("comum.lascas", a.lascas, { n: a.lascas }));
        if (faltam > 0) b.append(criar("small", { class: "loja-faltam" }, " \xB7 " + t("loja.faltam", { n: faltam })));
        b.addEventListener("click", () => {
          api.trocar(a.id).catch((e) => console.warn("[loja] troca falhou:", e));
        });
        acoes.append(b);
      }
      if (a.eur != null && (!dep.eurVisivel || dep.eurVisivel())) {
        const preco = precoEur(a.id);
        const b = criar("button", { id: `btn-eur-${a.id}`, type: "button", class: "loja-eur", disabled: preco == null || !!ocupado }, preco != null ? preco : t("loja.eur_sem_rede"));
        b.addEventListener("click", () => {
          api.comprar(a.id).catch((e) => console.warn("[loja] compra falhou:", e));
        });
        acoes.append(b);
      }
      if (Array.isArray(a.partes)) {
        const tenho = a.partes.filter((p) => dep.temItem(p));
        if (tenho.length) extra.push(criar("p", { class: "loja-info" }, t("loja.kit_aviso", { partes: tenho.map((p) => t(`artigo.${p}.nome`)).join(", ") })));
      }
    }
    if (dep.previsualizar && ["pedra", "paleta", "moldura", "som"].includes(a.categoria) && !RE_MOLD_MES.test(a.id)) {
      const e = criar("button", { id: `btn-ver-${a.id}`, type: "button", class: "loja-ver", disabled: !!ocupado }, t("loja.ver"));
      e.addEventListener("click", () => dep.previsualizar(a));
      acoes.append(e);
    }
    if (a.nivel) extra.push(criar("p", { class: "loja-info" }, t("loja.ganho_oficio_desc", { nivel: t(`oficio.nivel.${a.nivel}`) })));
    if (a.nao_vende) extra.push(criar("p", { class: "loja-info" }, t("loja.nao_vende")));
    const amostra = [];
    const srcPac = imagemPacote(a.id);
    const src = imagemCosmetico(a.id);
    if (srcPac) {
      amostra.push(criar("img", { class: "loja-amostra loja-amostra-pac", src: srcPac, width: "80", height: "50", alt: "", "aria-hidden": "true", draggable: "false" }));
    } else if (src) {
      amostra.push(criar("img", { class: "loja-amostra", src, width: "48", height: "48", alt: "", "aria-hidden": "true", draggable: "false" }));
    } else if (["pedra", "paleta", "moldura", "som"].includes(a.categoria)) {
      const cv = criar("canvas", { class: "loja-amostra", "aria-hidden": "true" });
      cv.width = 96;
      cv.height = 96;
      try {
        desenharAmostra(cv, a);
      } catch (e) {
      }
      amostra.push(cv);
    }
    return criar(
      "div",
      { class: "loja-artigo", role: "listitem", id: `loja-art-${a.id}`, "data-categoria": a.categoria },
      ...amostra,
      criar("div", { class: "loja-texto" }, criar("strong", {}, nome(a)), criar("span", { class: "loja-desc" }, desc(a)), ...extra),
      acoes
    );
  }
  function renderSemAnuncios() {
    let tem = false;
    try {
      tem = !!(dep.semAnuncios && dep.semAnuncios());
    } catch {
      tem = false;
    }
    const preco = precoEur("SEM-ANUNCIOS");
    const play = !dep.eurVisivel || dep.eurVisivel();
    const nomeSA = t("artigo.SEM-ANUNCIOS.nome");
    saTexto.replaceChildren(criar("strong", {}, nomeSA), criar(
      "span",
      { class: "loja-desc", id: "loja-sa-estado" },
      tem ? t("loja.sa_ativo") : preco != null ? t("artigo.SEM-ANUNCIOS.desc") : t(play ? "loja.sa_sem_preco" : "loja.sa_sem_play")
    ));
    saBotao.hidden = tem;
    saBotao.disabled = preco == null || !!ocupado;
    saBotao.textContent = preco != null ? preco : t("loja.eur_sem_rede");
  }
  function render() {
    var _a;
    if (raiz.hidden) return;
    renderSemAnuncios();
    try {
      versao.textContent = dep.versao ? dep.versao() : "";
    } catch {
      versao.textContent = "";
    }
    saldo.textContent = t("loja.saldo", { n: saldoLascas() });
    for (const b of abas.children) b.setAttribute("aria-selected", String(b.id === `btn-loja-sep-${sep}`));
    restaurar.disabled = restauro;
    const itens = ((_a = dep.documento().inventario) == null ? void 0 : _a.itens) || [];
    let artigos = artigosDe(sep, dep.catalogo(), itens, dep.sazonais ? dep.sazonais() : []);
    if (sep === "lascas") {
      const aberta = vendaLascasAberta();
      lista.dataset.sep = sep;
      const topo = criar("p", { class: "loja-info", id: "loja-lascas-intro" }, t(aberta ? "loja.lascas_intro" : vendaLascasEstado() === "a_sincronizar" ? "loja.lascas_a_sincronizar" : "loja.lascas_fechadas"));
      if (!aberta) {
        lista.replaceChildren(topo);
        return;
      }
      lista.replaceChildren(topo, ...artigos.map(linha), criar("p", { class: "loja-info", id: "loja-lascas-nota" }, t("loja.lascas_guardadas")));
      return;
    }
    lista.dataset.sep = sep;
    lista.replaceChildren(...artigos.map(linha));
    const pacSaz = artigos.find((x) => imagemPacote(x.id));
    if (pacSaz) lista.prepend(criar("img", { id: "loja-cab-saz", class: "loja-cab-saz", src: imagemPacote(pacSaz.id), width: "160", height: "100", alt: "", "aria-hidden": "true", draggable: "false" }));
    const faltas = artigos.filter((a) => Number.isInteger(a.lascas) && a.lascas > 0 && !a.gratis && !a.consumivel && !dep.temItem(a.id)).map((a) => a.lascas - saldoLascas()).filter((n) => n > 0);
    if (dep.caminho && faltas.length) lista.prepend(avisoCaminho(Math.min(...faltas)));
    if (faltas.length && abas.querySelector("#btn-loja-sep-lascas") && vendaLascasAberta()) {
      const ir = criar("button", { id: "btn-loja-ir-lascas", type: "button", class: "loja-caminho-btn" }, t("loja.sep_lascas"));
      ir.addEventListener("click", () => {
        sep = "lascas";
        render();
      });
      lista.prepend(ir);
    }
  }
  const vendaLascasEstado = () => {
    try {
      return dep.lascasVenda ? dep.lascasVenda() : "fechada";
    } catch {
      return "fechada";
    }
  };
  const vendaLascasAberta = () => vendaLascasEstado() === "aberta";
  function avisoCaminho(n) {
    const b = criar("button", { id: "btn-loja-caminho", type: "button", class: "loja-caminho-btn" }, t("caminho.loja_botao"));
    b.addEventListener("click", () => dep.caminho());
    return criar("div", { id: "loja-caminho", class: "loja-caminho" }, criar("p", { class: "loja-info" }, t("caminho.loja_faltam", { n, teto: dep.caminhoTeto })), b);
  }
  const api = {
    el: raiz,
    abrir(s = sep) {
      if (SEPARADORES[s]) sep = s;
      raiz.hidden = false;
      msg.textContent = "";
      render();
      api.reconciliar().catch(() => {
      });
      return api.estado();
    },
    // T-1370: uma compra que terminou depois do limite de 20 s não se perde: ao abrir (e depois de um tempo limite)
    // consulta-se em silêncio a Play; o que lá estiver e ainda não for nosso entra e avisa-se. Nunca prende o ecrã.
    async reconciliar() {
      if (reconciliando || restauro || ocupado || !dep.restaurar) return null;
      reconciliando = true;
      try {
        const r = await comLimite(dep.restaurar(), { resultado: "erro", novos: [] });
        if (r && r.resultado === "ok" && (r.novos || []).length && !raiz.hidden) {
          msg.textContent = t("loja.restaurar_ok");
          render();
        }
        return r;
      } catch (e) {
        return null;
      } finally {
        reconciliando = false;
      }
    },
    fechar() {
      raiz.hidden = true;
    },
    aberta: () => !raiz.hidden,
    render,
    mensagem: (m) => {
      msg.textContent = m;
    },
    // Lascas: confirma, troca (atómica). Saldo insuficiente → quantas faltam e como se ganham; nunca empurra para €.
    async trocar(id, { confirmar = true } = {}) {
      const a = dep.catalogo().find((x) => x.id === id) || { id, lascas: 0 };
      const faltam = (a.lascas || 0) - saldoLascas();
      if (faltam > 0) {
        msg.textContent = dep.caminho ? t("caminho.loja_faltam", { n: faltam, teto: dep.caminhoTeto }) : t("loja.lascas_insuficientes", { n: faltam, diario: dep.lascasDiario });
        return { resultado: "saldo_insuficiente", faltam };
      }
      if (confirmar && !await dep.confirmar(t("loja.confirmar_lascas", { preco: a.lascas, artigo: nome(a) }))) return { resultado: "cancelada" };
      ocupado = id;
      render();
      let r;
      try {
        r = await dep.trocar(id);
      } finally {
        ocupado = null;
      }
      msg.textContent = r.resultado === "concluida" || r.resultado === "ja_tem" ? t("loja.comprado", { artigo: nome(a) }) : r.resultado === "saldo_insuficiente" ? dep.caminho ? t("caminho.loja_faltam", { n: r.faltam, teto: dep.caminhoTeto }) : t("loja.lascas_insuficientes", { n: r.faltam, diario: dep.lascasDiario }) : t("loja.erro");
      render();
      return r;
    },
    // €: a_comprar → concluida | cancelada (sem mensagem) | pendente | erro (sem culpa). Nunca concede antecipado.
    async comprar(id) {
      var _a;
      const a = dep.catalogo().find((x) => x.id === id) || { id };
      const antes = saldoLascas();
      if (a.categoria === "lascas") {
        if (!vendaLascasAberta()) {
          msg.textContent = t("loja.lascas_fechadas");
          return { resultado: "fechada" };
        }
        if (!await dep.confirmar(t("loja.lascas_credito", { antes, depois: antes + (a.lascas || 0) }))) return { resultado: "cancelada" };
      }
      ocupado = id;
      msg.textContent = t("loja.a_comprar");
      render();
      let r;
      try {
        r = await comLimite(dep.comprar(id), { resultado: "erro", erro: "tempo" });
      } catch (e) {
        r = { resultado: "erro", erro: "desconhecido" };
      } finally {
        ocupado = null;
      }
      const textos = {
        concluida: t("loja.comprado", { artigo: nome(a) }),
        ja_tem: t("loja.comprado", { artigo: nome(a) }),
        pendente: t("loja.pendente"),
        erro: r.erro === "sem_rede" ? t("loja.sem_rede") : r.erro === "tempo" ? t("loja.tempo_limite") : t("loja.erro"),
        cancelada: "",
        em_curso: t("loja.a_comprar")
      };
      msg.textContent = (_a = textos[r.resultado]) != null ? _a : "";
      if (r.resultado === "concluida" && a.categoria === "apoio") msg.textContent = t("loja.apoio_obrigado");
      if (r.resultado === "concluida" && a.categoria === "lascas") msg.textContent = t("loja.lascas_creditadas", { antes, depois: saldoLascas() });
      render();
      if (r.resultado === "erro" && r.erro === "tempo") setTimeout(() => {
        api.reconciliar().catch(() => {
        });
      }, 3e3);
      return r;
    },
    async usar(id) {
      const r = await dep.equipar(id);
      render();
      return r;
    },
    async restaurar() {
      restauro = true;
      msg.textContent = t("loja.restaurar_a_procurar");
      render();
      let r;
      try {
        r = await comLimite(dep.restaurar(), { resultado: "erro", novos: [], removidos: [] });
      } catch (e) {
        r = { resultado: "erro", novos: [], removidos: [] };
      } finally {
        restauro = false;
      }
      msg.textContent = r.resultado === "ok" ? t((r.novos || []).length ? "loja.restaurar_ok" : "loja.restaurar_nada") : r.resultado === "sem-rede" ? t("loja.restaurar_sem_rede") : t("loja.erro");
      render();
      return r;
    },
    // Para o debug e os testes: o que o ecrã mostra agora.
    estado() {
      return {
        aberta: !raiz.hidden,
        separador: sep,
        saldo: saldo.textContent,
        mensagem: msg.textContent,
        restaurar: { visivel: !restaurar.hidden, ativo: !restaurar.disabled },
        artigos: [...lista.querySelectorAll(".loja-artigo")].map((e) => {
          var _a, _b;
          return {
            id: e.id.replace("loja-art-", ""),
            botoes: [...e.querySelectorAll("button")].map((b) => ({ id: b.id, texto: b.textContent, ativo: !b.disabled })),
            tem: (_b = (_a = e.querySelector(".loja-tem")) == null ? void 0 : _a.textContent) != null ? _b : null,
            amostra: !!e.querySelector(".loja-amostra")
            // T-427: tem amostra visual desenhada
          };
        })
      };
    }
  };
  return api;
}
export {
  LIMITE_FATURACAO_MS,
  SEPARADORES,
  artigosDe,
  criarEcraLoja,
  desenharAmostra,
  lojaVisivel,
  puzzleEmCurso
};
