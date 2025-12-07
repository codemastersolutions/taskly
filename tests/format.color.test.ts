import { describe, expect, it } from 'vitest';
import { colorize } from '../src/utils/format';

describe('colorize', () => {
  it('returns text unchanged for unknown color', () => {
    const text = 'hello';
    const res = colorize(text, 'orange');
    expect(res).toBe(text);
  });

  it('applies ANSI named color and reset', () => {
    const res = colorize('hi', 'blue');
    // ANSI blue is \u001b[34m, and ends with reset \u001b[0m
    expect(res.startsWith('\u001b[34m')).toBe(true);
    expect(res.endsWith('\u001b[0m')).toBe(true);
  });

  it('applies truecolor for hex #RRGGBB', () => {
    const res = colorize('hex', '#1E90FF');
    // 1E=30, 90=144, FF=255 -> 38;2;30;144;255
    expect(res).toContain('\u001b[38;2;30;144;255m');
    expect(res.endsWith('\u001b[0m')).toBe(true);
  });

  it('applies truecolor for rgb(r,g,b)', () => {
    const res = colorize('rgb', 'rgb(255,200,0)');
    expect(res).toContain('\u001b[38;2;255;200;0m');
    expect(res.endsWith('\u001b[0m')).toBe(true);
  });
});
