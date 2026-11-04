const LIMITE_BYTES = 51200;
const BACKOFF_MS = [5e3, 15e3, 6e4, 3e5];
const chaveDoc = (jogoId) => "contas:" + jogoId;
const ler = (a, k) => {
  try {
    const v = a.get(k);
    return v == null ? null : JSON.parse(v);
  } catch {
    return null;
  }
};
function lerDoc(a, jogoId) {
  return ler(a, chaveDoc(jogoId)) || { schema: 1, rev: 0, base: 0, sujo: false, updatedAt: 0, dados: null };
}
function gravarDoc(a, jogoId, doc) {
  a.set(chaveDoc(jogoId), JSON.stringify(doc));
}
function lerCopia(a, jogoId) {
  return ler(a, chaveDoc(jogoId) + ":copia");
}
function gravarCopia(a, jogoId, c) {
  a.set(chaveDoc(jogoId) + ":copia", JSON.stringify(c));
}
function uuid() {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = Math.random() * 16 | 0;
    return (ch === "x" ? r : r & 3 | 8).toString(16);
  });
}
function deviceId(a) {
  let id = a.get("contas:deviceId");
  if (!id) {
    id = uuid();
    a.set("contas:deviceId", id);
  }
  return id;
}
function tamanho(dados) {
  return new TextEncoder().encode(JSON.stringify(dados != null ? dados : null)).length;
}
const mergePorDefeito = () => null;
const cod = (e) => e && e.codigo || "desconhecido";
async function reconciliar({ adaptador, armazem, jogoId, schema, merge = mergePorDefeito, device }) {
  var _a;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    let remoto;
    try {
      remoto = await adaptador.obter(jogoId);
    } catch (e) {
      return { resultado: "erro", erro: { codigo: cod(e) } };
    }
    const local = lerDoc(armazem, jogoId);
    if (remoto && remoto.schema > schema) return { resultado: "erro", erro: { codigo: "desconhecido", motivo: "schema_novo" } };
    const temLocal = local.rev > 0;
    const enviar = async (dados, base) => {
      try {
        const nova = await adaptador.guardar(jogoId, schema, base, device, dados);
        if (nova == null) return "perdido";
        const atual = lerDoc(armazem, jogoId);
        const mudou = atual.rev !== local.rev;
        gravarDoc(armazem, jogoId, { ...atual, schema: mudou ? atual.schema : schema, base: nova, rev: Math.max(atual.rev, 1), sujo: mudou ? true : false, ...mudou ? {} : { dados } });
        return mudou ? "ok_sujo" : "ok";
      } catch (e) {
        return { erro: { codigo: cod(e) } };
      }
    };
    const fim = (r2) => typeof r2 === "object" ? { resultado: "erro", erro: r2.erro } : r2;
    if (!remoto) {
      if (!temLocal || local.dados == null) return { resultado: "sem_alteracao" };
      const r2 = await enviar(local.dados, 0);
      if (r2 === "perdido") continue;
      return typeof r2 === "object" ? fim(r2) : { resultado: "ok" };
    }
    const remotoMudou = remoto.rev !== local.base;
    const localMudou = local.sujo || temLocal && local.base === 0;
    if (!remotoMudou && !localMudou) return { resultado: "sem_alteracao" };
    if (!remotoMudou && localMudou) {
      const r2 = await enviar(local.dados, remoto.rev);
      if (r2 === "perdido") continue;
      return typeof r2 === "object" ? fim(r2) : { resultado: "ok" };
    }
    if (remotoMudou && (!localMudou || local.dados == null)) {
      gravarDoc(armazem, jogoId, { ...local, schema: Math.max(schema, remoto.schema), dados: remoto.dados, base: remoto.rev, rev: Math.max(local.rev, 1), sujo: false, updatedAt: remoto.updatedAt });
      return { resultado: "ok", aplicar: remoto.dados };
    }
    if (JSON.stringify(local.dados) === JSON.stringify(remoto.dados)) {
      gravarDoc(armazem, jogoId, { ...local, base: remoto.rev, sujo: false });
      return { resultado: "sem_alteracao" };
    }
    let fundido = null;
    try {
      fundido = (_a = merge(local.dados, remoto.dados, local.base)) != null ? _a : null;
    } catch {
      fundido = null;
    }
    if (fundido == null) return { resultado: "conflito", conflito: { local: local.dados, remoto: remoto.dados, remotoRev: remoto.rev, remotoUpdatedAt: remoto.updatedAt } };
    gravarDoc(armazem, jogoId, { ...local, dados: fundido, base: remoto.rev, sujo: true });
    const r = await enviar(fundido, remoto.rev);
    if (r === "perdido") continue;
    if (typeof r === "object") return fim(r);
    return r === "ok_sujo" ? { resultado: "ok" } : { resultado: "ok", aplicar: fundido };
  }
  return { resultado: "erro", erro: { codigo: "conflito" } };
}
export {
  BACKOFF_MS,
  LIMITE_BYTES,
  deviceId,
  gravarCopia,
  gravarDoc,
  lerCopia,
  lerDoc,
  mergePorDefeito,
  reconciliar,
  tamanho
};
