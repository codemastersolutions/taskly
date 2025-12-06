import { describe, expect, it } from 'vitest';
import { colorize, timestamp } from '../src/utils/format';

describe('format utils', () => {
  it('timestamp formats correctly', () => {
    const t = timestamp('yyyy-MM-dd');
    expect(t).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
  it('colorize applies auto color and reset', () => {
    const s = colorize('test', 'auto', 1);
    expect(s).toContain('\u001b');
    expect(s.endsWith('\u001b[0m')).toBe(true);
  });
  it('colorize ignores unknown colors', () => {
    expect(colorize('x', 'unknown', 0)).toBe('x');
  });

  it('colorize returns text when color undefined', () => {
    expect(colorize('plain')).toBe('plain');
  });
});
