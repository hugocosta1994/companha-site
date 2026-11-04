const PROIBIDOS = /(service_role|sb_secret_)/;
function lerConfig(alvo = globalThis) {
  const c = alvo && alvo.CONTAS_CONFIG;
  if (!c || typeof c !== "object") return { fornecedor: "inativo" };
  if (c.fornecedor === "simulado") return { fornecedor: "simulado", redirectUrl: c.redirectUrl || "" };
  if (c.fornecedor === "supabase") {
    const { url, chavePublica } = c;
    const valida = typeof url === "string" && /^https:\/\/[^\s/]+/.test(url) && typeof chavePublica === "string" && chavePublica.length > 10 && !PROIBIDOS.test(chavePublica) && !/exemplo/i.test(url + chavePublica);
    if (valida) return { ...c, fornecedor: "supabase", url, chavePublica, redirectUrl: c.redirectUrl || "" };
  }
  return { fornecedor: "inativo" };
}
export {
  lerConfig
};
