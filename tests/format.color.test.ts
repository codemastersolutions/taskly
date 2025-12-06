import { describe, expect, it } from 'vitest';
import { colorize } from '../src/utils/format';

describe('colorize', () => {
  it('returns text unchanged for unknown color', () => {
    const text = 'hello';
    const res = colorize(text, 'orange');
    expect(res).toBe(text);
  });
});

