import { describe, expect, it } from 'vitest';
import { runConcurrently } from '../src';

const okCmd = `node -e "console.log('A');"`;
const failCmd = `node -e "process.exit(2)"`;

describe('runConcurrently', () => {
  it('runs commands concurrently and succeeds when all succeed', async () => {
    const res = await runConcurrently(
      [
        { command: okCmd, name: 'ok1', shell: true },
        { command: okCmd, name: 'ok2', shell: true },
      ],
      {
        prefix: 'name',
        maxProcesses: 2,
        successCondition: 'all',
      }
    );
    expect(res.success).toBe(true);
    expect(res.results.length).toBe(2);
    expect(res.results.every((r) => r.exitCode === 0)).toBe(true);
  });

  it('kills others on failure when configured', async () => {
    const res = await runConcurrently(
      [
        { command: failCmd, name: 'fail', shell: true },
        { command: okCmd, name: 'ok', shell: true },
      ],
      {
        killOthersOn: ['failure'],
        successCondition: 'all',
      }
    );
    expect(res.success).toBe(false);
    expect(res.results.some((r) => r.exitCode !== 0)).toBe(true);
  });

  it('kills others on success with successCondition=first', async () => {
    const res = await runConcurrently(
      [
        { command: okCmd, name: 'ok1', shell: true },
        {
          command: 'node -e "setInterval(()=>{}, 10000)"',
          name: 'slow',
          shell: true,
        },
      ],
      {
        killOthersOn: ['success'],
        successCondition: 'first',
        maxProcesses: 2,
      }
    );
    expect(res.success).toBe(true);
  });

  it('supports successCondition=first', async () => {
    const res = await runConcurrently(
      [
        { command: okCmd, shell: true },
        { command: failCmd, shell: true },
      ],
      { successCondition: 'first', maxProcesses: 1 }
    );
    expect(res.success).toBe(true);
  });

  it('handles template prefix without throwing', async () => {
    const res = await runConcurrently(
      [
        { command: okCmd, shell: true },
        { command: okCmd, shell: true },
      ],
      { prefix: '[{time} {pid}]', successCondition: 'all' }
    );
    expect(res.success).toBe(true);
  });

  it('supports prefix=pid and prefix=command', async () => {
    const res1 = await runConcurrently(
      [
        { command: okCmd, shell: true },
        { command: okCmd, shell: true },
      ],
      { prefix: 'pid', successCondition: 'all' }
    );
    expect(res1.success).toBe(true);

    const res2 = await runConcurrently([{ command: okCmd, shell: true }], {
      prefix: 'command',
      successCondition: 'all',
    });
    expect(res2.success).toBe(true);
  });

  it('raw mode disables prefix and still succeeds', async () => {
    const res = await runConcurrently(
      [
        { command: okCmd, shell: true },
        { command: okCmd, shell: true },
      ],
      { raw: true, successCondition: 'all' }
    );
    expect(res.success).toBe(true);
  });

  it('supports prefix=time', async () => {
    const res = await runConcurrently([{ command: okCmd, shell: true }], {
      prefix: 'time',
      successCondition: 'all',
    });
    expect(res.success).toBe(true);
  });

  it('handles stderr output without failing', async () => {
    const res = await runConcurrently(
      [
        {
          command: 'node -e "console.error(\'ERR\');process.exit(0)"',
          shell: true,
        },
      ],
      { successCondition: 'all', prefix: 'none' }
    );
    expect(res.success).toBe(true);
  });

  it('successCondition=last respects last exit code', async () => {
    const resFailLast = await runConcurrently(
      [
        { command: okCmd, shell: true },
        { command: failCmd, shell: true },
      ],
      { successCondition: 'last', maxProcesses: 1 }
    );
    expect(resFailLast.success).toBe(false);

    const resOkLast = await runConcurrently(
      [
        { command: failCmd, shell: true },
        { command: okCmd, shell: true },
      ],
      { successCondition: 'last', maxProcesses: 1 }
    );
    expect(resOkLast.success).toBe(true);
  });

  it('restarts on failure when configured', async () => {
    const res = await runConcurrently(
      [{ command: failCmd, shell: true, restartTries: 1, restartDelay: 10 }],
      { successCondition: 'all' }
    );
    expect(res.success).toBe(false);
    expect(res.results.length).toBeGreaterThanOrEqual(2);
    expect(res.results.every((r) => r.exitCode !== 0)).toBe(true);
  });

  it('supports prefix=none and prefix=index', async () => {
    const resNone = await runConcurrently([{ command: okCmd, shell: true }], {
      prefix: 'none',
      successCondition: 'all',
    });
    expect(resNone.success).toBe(true);

    const resIndex = await runConcurrently(
      [
        { command: okCmd, shell: true },
        { command: okCmd, shell: true },
      ],
      { prefix: 'index', successCondition: 'all' }
    );
    expect(resIndex.success).toBe(true);
  });

  it('supports string command input path', async () => {
    const res = await runConcurrently(["node -e \"process.exit(0)\""], {
      successCondition: 'all',
      prefix: 'none',
    });
    expect(res.success).toBe(true);
  });

  it('uses name in prefix when provided', async () => {
    const res = await runConcurrently(
      [{ command: okCmd, name: 'node', shell: true }],
      { successCondition: 'all', prefix: 'name' }
    );
    expect(res.success).toBe(true);
  });
});
