// SEIXO — testes LENTOS do gerador (T-1979): mod 728, p95, CA-07 e CA-C-02. Correr: npm run test:lento
// (fora de `npm test`, que fica rápido). SEIXO_SEEDS, SEIXO_SEEDS_POR_TIPO e SEIXO_P95 como em gerador.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarPuzzle, validarPuzzle, escreverGrelha } from '../js/nucleo/formato.js';
import { contarSolucoes } from '../js/nucleo/verificador.js';
import { resolver } from '../js/nucleo/resolver.js';
import { classificar } from '../js/nucleo/dificuldade.js';
import { gerar, gerarDiario, reutilizarDaTabela, SemPuzzleError, CALENDARIO_SEMANAL, TAMANHO_TABELA } from '../js/nucleo/gerador.js';
import * as C from '../js/meta/caminho.js';
import fs from 'node:fs';

const lerJson = (f) => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
C.configurarCaminho({ tabela: lerJson('caminho.json'), reserva: lerJson('caminho-reserva.json') });

function validarGerado(json) {
  const erros = validarPuzzle(json);
  if (erros.length) return `contrato: ${erros.join('; ')}`;
  const p = carregarPuzzle(json);
  const v = contarSolucoes(p, 2);
  if (v.total !== 1) return `${v.total} soluções`;
  if (escreverGrelha(v.solucoes[0]) !== json.solucao) return 'solução do verificador ≠ solução gravada';
  const r = resolver(p);
  if (!r.resolvido) return 'não se resolve só com N1–N3';
  if (escreverGrelha(r.grelha) !== json.solucao) return 'resolvedor chegou a outra grelha';
  if (classificar(r.passos) !== json.dificuldade) return `classificação ${classificar(r.passos)} ≠ ${json.dificuldade}`;
  if (r.passos.N3 !== json.classificacao.passos.N3 || r.passos.N2 !== json.classificacao.passos.N2) return 'passos diferentes';
  return null;
}

test('§2.3: sem puzzle válido, gerarDiario reutiliza a tabela no índice mod 728', () => {
  assert.throws(() => gerarDiario('2026-11-06', null, { maxNos: 1 }), SemPuzzleError);
  const tabela = Array.from({ length: TAMANHO_TABELA }, (_, i) => ({ ...gerarDiario('2026-11-06').puzzle, id: `T-${i}` }));
  tabela[4] = gerarDiario('2026-11-06').puzzle; // sexta-feira, Médio 8×8
  const r = gerarDiario('2028-11-03', { tabela, indice: TAMANHO_TABELA + 4 }, { maxNos: 1 });
  assert.equal(r.reutilizado, true);
  assert.equal(r.alvoAtingido, false);
  assert.equal(r.puzzle.id, 'D-2028-11-03');
  assert.equal(r.puzzle.origem.data, '2028-11-03');
  assert.equal(r.puzzle.origem.indice, 4);
  assert.equal(r.puzzle.dadas, tabela[4].dadas);
  assert.deepEqual(validarPuzzle(r.puzzle), []);
  assert.throws(() => reutilizarDaTabela(tabela.slice(1), 0, '2028-11-03'));
});

// p95 de 100 seeds (V1-07). Lento (~15 s): SEIXO_P95=1. Fator 6× para o telemóvel de gama baixa (§3).
const P95 = Number(process.env.SEIXO_P95 || 0);
test('V1-07: p95 de gerar 8×8 Difícil e do verificador 8×8 (100 seeds, × 6)', { skip: !P95 && 'definir SEIXO_P95=1' }, () => {
  const pct = (a, q) => [...a].sort((x, y) => x - y)[Math.ceil(q * a.length) - 1];
  const tg = [], tv = [];
  let fora = 0;
  for (let s = 0; s < 100; s++) {
    let t0 = performance.now();
    const { puzzle, alvoAtingido } = gerar({ variante: 'equilibrio', n: 8, dificuldade: 'dificil', seed: `p95:${s}` });
    tg.push(performance.now() - t0);
    if (!alvoAtingido) fora++;
    const p = carregarPuzzle(puzzle);
    t0 = performance.now();
    contarSolucoes(p, 2);
    tv.push(performance.now() - t0);
  }
  const g95 = pct(tg, 0.95), v95 = pct(tv, 0.95);
  console.log(`# p95 gerar 8×8 Difícil ${g95.toFixed(0)} ms (× 6 = ${(6 * g95).toFixed(0)}); p95 verificador ${v95.toFixed(2)} ms (× 6 = ${(6 * v95).toFixed(1)}); fora da faixa ${fora}/100`);
  assert.ok(6 * g95 <= 2000, `gerar p95 × 6 = ${6 * g95}`);
  assert.ok(6 * v95 <= 200, `verificador p95 × 6 = ${6 * v95}`);
});

const TOTAL = Number(process.env.SEIXO_SEEDS || 1000);
test(`CA-07: ${TOTAL} seeds sem inválidos (calendário semanal, todas as variantes)`, () => {
  const invalidos = [];
  let foraDaFaixa = 0;
  for (let s = 0; s < TOTAL; s++) {
    const alvo = CALENDARIO_SEMANAL[s % 7];
    const { puzzle, alvoAtingido } = gerar({ ...alvo, seed: `seixo:teste:${s}` });
    const erro = validarGerado(puzzle);
    if (erro) invalidos.push(`${puzzle.id}: ${erro}`);
    if (!alvoAtingido) foraDaFaixa++;
  }
  assert.deepEqual(invalidos, []);
  console.log(`# ${TOTAL} seeds: 0 inválidos, ${foraDaFaixa} fora da faixa-alvo (válidos, com a dificuldade real)`);
});

const POR_TIPO = Number(process.env.SEIXO_SEEDS_POR_TIPO || 0);
test(`CA-07 completo: ${POR_TIPO} seeds por variante/tamanho/dificuldade`, { skip: !POR_TIPO && 'definir SEIXO_SEEDS_POR_TIPO' }, () => {
  for (const alvo of CALENDARIO_SEMANAL) {
    const invalidos = [];
    let fora = 0;
    for (let s = 0; s < POR_TIPO; s++) {
      const { puzzle, alvoAtingido } = gerar({ ...alvo, seed: `ca07:${s}` });
      const erro = validarGerado(puzzle);
      if (erro) invalidos.push(`${s}: ${erro}`);
      if (!alvoAtingido) fora++;
    }
    assert.deepEqual(invalidos, [], `${alvo.variante} ${alvo.n} ${alvo.dificuldade}`);
    console.log(`# ${alvo.variante} ${alvo.n}×${alvo.n} ${alvo.dificuldade}: 0 inválidos, ${fora}/${POR_TIPO} fora da faixa`);
  }
});

// ---- CA-C-02: níveis 1-100 ------------------------------------------------------------------------------------
test('CA-C-02: níveis 1-100 cumprem a faixa, a variante e o tamanho; solução única; sem dois D seguidos, <= 1 D por 5', () => {
  const faixas = [];
  let reservas = 0, maxMs = 0;
  for (let n = 1; n <= 100; n++) {
    const p = C.parametrosCaminho(n);
    const t0 = Date.now();
    const o = C.gerarNivelCaminho(n);
    maxMs = Math.max(maxMs, Date.now() - t0);
    const pz = carregarPuzzle(o);
    assert.equal(o.id, `CAM-${n}`);
    assert.equal(o.origem.tipo, 'caminho');
    assert.equal(o.origem.indice, n);
    assert.equal(pz.dificuldade, { F: 'facil', M: 'medio', D: 'dificil' }[p.faixa], `n=${n} faixa`);
    assert.ok(C.cumpreFaixa(o, p.faixa, n > 1 && C.faixaDe(n - 1) === 'D'), `n=${n} não cumpre a faixa`);
    if (o.origem.reserva) reservas++;
    else { assert.equal(pz.variante, p.variante, `n=${n} variante`); assert.equal(pz.n, p.tamanho, `n=${n} tamanho`); }
    assert.equal(contarSolucoes(pz, 2).total, 1, `n=${n} sem solução única`);
    faixas.push(p.faixa);
    assert.deepEqual(C.gerarNivelCaminho(n), o, `n=${n} não é determinístico`);
  }
  for (let i = 1; i < faixas.length; i++) assert.ok(!(faixas[i] === 'D' && faixas[i - 1] === 'D'), `dois D seguidos em ${i}`);
  for (let i = 0; i + 5 <= faixas.length; i++) assert.ok(faixas.slice(i, i + 5).filter((f) => f === 'D').length <= 1, `mais de 1 D em 5 a partir de ${i + 1}`);
  assert.ok(reservas <= 15, `a reserva serviu ${reservas} níveis de 100: o gerador devia chegar quase sempre`);
  assert.ok(maxMs < 6000, `um nível demorou ${maxMs} ms`);
});
