import { describe, expect, it } from 'vitest';

describe('CLI shell option', () => {
  it('supports --shell=sh on non-Windows', async () => {
    if (process.platform === 'win32') return; // skip on Windows
    process.env.TASKLY_TEST = '1';
    const { cliEntry } = await import('../src/cli');
    const code = await cliEntry([
      'node',
      'taskly',
      '--shell=sh',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });

  it('supports --shell cmd on Windows', async () => {
    if (process.platform !== 'win32') return; // skip on non-Windows
    process.env.TASKLY_TEST = '1';
    const { cliEntry } = await import('../src/cli');
    const code = await cliEntry([
      'node',
      'taskly',
      '--shell',
      'cmd',
      'node -e "process.exit(0)"',
    ]);
    expect(code).toBe(0);
  });
});

