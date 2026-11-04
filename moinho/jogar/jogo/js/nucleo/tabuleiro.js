const N = 24;
const COORD = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
const ADJ = Array.from({ length: N }, (_, p) => {
  const s = Math.floor(p / 8), i = p % 8, v = [s * 8 + (i + 1) % 8, s * 8 + (i + 7) % 8];
  if (i % 2 === 1) {
    if (s > 0) v.push(p - 8);
    if (s < 2) v.push(p + 8);
  }
  return v.sort((a, b) => a - b);
});
const MOINHOS = (() => {
  const l = [];
  for (let s = 0; s < 3; s++) for (const k of [0, 2, 4, 6]) l.push([s * 8 + k, s * 8 + k + 1, s * 8 + (k + 2) % 8]);
  for (const i of [1, 3, 5, 7]) l.push([i, 8 + i, 16 + i]);
  return l;
})();
const MOINHOS_DO_PONTO = Array.from({ length: N }, (_, p) => MOINHOS.filter((m) => m.includes(p)));
export {
  ADJ,
  COORD,
  MOINHOS,
  MOINHOS_DO_PONTO,
  N
};
