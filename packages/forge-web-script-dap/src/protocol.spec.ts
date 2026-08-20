import { describe, expect, it } from 'vitest';

import { DapFrameParser, encodeDapMessage, RuntimeLineParser } from './protocol.js';

describe('Forge Web Script DAP framing', () => {
  it('parses fragmented UTF-8 DAP frames and multiple messages', () => {
    const parser = new DapFrameParser();
    const first = encodeDapMessage({ seq: 1, type: 'event', event: 'output', body: { output: 'héllo' } });
    const second = encodeDapMessage({ seq: 2, type: 'event', event: 'terminated' });
    const joined = Buffer.concat([first, second]);
    expect(parser.push(joined.subarray(0, 19))).toEqual([]);
    expect(parser.push(joined.subarray(19))).toEqual([
      { seq: 1, type: 'event', event: 'output', body: { output: 'héllo' } },
      { seq: 2, type: 'event', event: 'terminated' },
    ]);
  });

  it('buffers incomplete runtime lines and rejects malformed runtime JSON', () => {
    const parser = new RuntimeLineParser();
    expect(parser.push('{"type":"output","output":"ok')).toEqual([]);
    expect(parser.push('"}\n')).toEqual([{ type: 'output', output: 'ok' }]);
    expect(() => parser.push('{broken}\n')).toThrow(/Unexpected token|JSON/u);
  });
});
