import assert from 'assert';
import {generateKoaCtx} from './service';

export async function testGenerateKoaCtx() {
  const ctx = generateKoaCtx({
    requestHeaders: {
      'trace-id': 'aabbcc',
    },
    state: {
      customerId: 'xxff',
    },
  });
  assert.strictEqual(ctx.get('trace-id'), 'aabbcc');
  assert.strictEqual(ctx.state.customerId, 'xxff');
}
