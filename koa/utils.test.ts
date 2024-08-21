import assert from 'assert';
import {getKoaCtx} from './utils';

export async function testGetKoaCtx() {
  const ctx = getKoaCtx({
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
