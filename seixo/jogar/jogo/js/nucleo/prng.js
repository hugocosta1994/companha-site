function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function criarPrng(semente) {
  const h = fnv1a(String(semente));
  let a = h | 0, b = h ^ 2654435769 | 0, c = h ^ 608135816 | 0, d = 1;
  function proximo() {
    const t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11;
    c = c + t | 0;
    return t >>> 0;
  }
  for (let i = 0; i < 12; i++) proximo();
  return {
    semente: String(semente),
    proximo,
    // inteiro em [0, 2^32)
    int(n) {
      if (!(n > 0)) throw new Error("int(n) com n \u2264 0");
      const limite = 4294967296 - 4294967296 % n;
      for (; ; ) {
        const x = proximo();
        if (x < limite) return x % n;
      }
    },
    baralhar(lista) {
      for (let i = lista.length - 1; i > 0; i--) {
        const k = this.int(i + 1);
        const t = lista[i];
        lista[i] = lista[k];
        lista[k] = t;
      }
      return lista;
    }
  };
}
export {
  criarPrng,
  fnv1a
};
