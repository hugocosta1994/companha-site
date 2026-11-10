// T-1668: fumo da simulação de sessões (poucas sessões; as 200 correm com `node jogo/ferramentas/simular-sessoes.mjs`).
import test from 'node:test'; import assert from 'node:assert/strict';
import { simular, encontrarNavegador } from '../ferramentas/simular-sessoes.mjs';
test('simulação de 6 sessões sem erros e com primeiro toque medido', { skip: !encontrarNavegador() && 'sem Edge/Chrome', timeout: 120000 }, async () => {
  const r = await simular({ n: 6, porta: 8451, maxMs: 60000 });
  assert.equal(r.falhas, 0, JSON.stringify(r.detalhe));
  assert.equal(r.primeiroToqueMs.n, 6);
});
