/**
 * Minimal argv splitter that respects quotes (", ') and escapes (\\).
 * No dependencies.
 */
export function splitCommand(command: string): { cmd: string; args: string[] } {
  const argv: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escape = false;
  for (const ch of command) {
    if (escape) {
      current += ch;
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch as '"' | "'";
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      if (current.length) {
        argv.push(current);
        current = '';
      }
      continue;
    }
    current += ch;
  }
  if (current.length) argv.push(current);
  const [cmd, ...args] = argv;
  if (!cmd) throw new Error('Empty command string');
  return { cmd, args };
}

export type PrefixType = 'index' | 'pid' | 'time' | 'command' | 'name' | 'none';

export function parseKillOthersOn(v?: string): Array<'success' | 'failure'> {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s === 'success' || s === 'failure') as Array<'success' | 'failure'>;
}

export function parseSuccessCondition(v?: string): 'all' | 'first' | 'last' {
  if (v === 'first' || v === 'last') return v;
  return 'all';
}

export function parsePrefix(v?: string): PrefixType {
  const allowed: PrefixType[] = ['index', 'pid', 'time', 'command', 'name', 'none'];
  if (!v) return 'name';
  return allowed.includes(v as PrefixType) ? (v as PrefixType) : 'name';
}

