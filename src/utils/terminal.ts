/**
 * Terminal utilities for Taskly library
 * Provides ANSI color codes, output formatting, and stream handling
 */

import { Color, OutputLine } from '../types/index.js';

// ANSI color codes mapping
const ANSI_COLORS: Record<Color, string> = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  black: '\x1b[30m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
};

// ANSI control codes
const ANSI_RESET = '\x1b[0m';
const ANSI_BOLD = '\x1b[1m';
const ANSI_DIM = '\x1b[2m';
const ANSI_CLEAR_LINE = '\x1b[2K';
// const ANSI_CURSOR_UP = '\x1b[1A'; // Reserved for future use

// Default color cycle for automatic assignment
export const DEFAULT_COLORS: Color[] = [
  'blue',
  'green',
  'yellow',
  'red',
  'magenta',
  'cyan',
  'brightBlue',
  'brightGreen',
  'brightYellow',
  'brightRed',
  'brightMagenta',
  'brightCyan',
];

/**
 * Checks if the current terminal supports colors
 */
export function supportsColor(): boolean {
  // Check common environment variables
  if (process.env.NO_COLOR || process.env.NODE_DISABLE_COLORS) {
    return false;
  }

  if (process.env.FORCE_COLOR) {
    return true;
  }

  // Check if we're in a TTY
  if (!process.stdout.isTTY) {
    return false;
  }

  // Check TERM environment variable
  const term = process.env.TERM?.toLowerCase();
  if (!term) {
    return false;
  }

  // Common terminals that support color
  const colorTerms = [
    'xterm',
    'xterm-color',
    'xterm-256color',
    'screen',
    'screen-256color',
    'tmux',
    'tmux-256color',
    'rxvt',
    'ansi',
    'cygwin',
  ];

  return colorTerms.some(colorTerm => term.includes(colorTerm));
}

/**
 * Gets ANSI color code for a color name
 */
export function getAnsiColorCode(color: Color | string): string {
  // Check if it's a predefined color
  if (color in ANSI_COLORS) {
    return ANSI_COLORS[color as Color];
  }

  // Handle hex colors (#RRGGBB)
  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `\x1b[38;2;${r};${g};${b}m`;
  }

  // Handle RGB colors (rgb(r, g, b))
  const rgbMatch = color.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  );
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return `\x1b[38;2;${r};${g};${b}m`;
  }

  // Fallback to white if color is not recognized
  return ANSI_COLORS.white;
}

/**
 * Applies color to text
 */
export function colorize(text: string, color: Color | string): string {
  if (!supportsColor()) {
    return text;
  }

  const colorCode = getAnsiColorCode(color);
  return `${colorCode}${text}${ANSI_RESET}`;
}

/**
 * Makes text bold
 */
export function bold(text: string): string {
  if (!supportsColor()) {
    return text;
  }
  return `${ANSI_BOLD}${text}${ANSI_RESET}`;
}

/**
 * Makes text dim/faded
 */
export function dim(text: string): string {
  if (!supportsColor()) {
    return text;
  }
  return `${ANSI_DIM}${text}${ANSI_RESET}`;
}

/**
 * Strips ANSI color codes from text
 */
export function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Gets the display width of text (excluding ANSI codes)
 */
export function getTextWidth(text: string): number {
  return stripAnsi(text).length;
}

/**
 * Pads text to a specific width
 */
export function padText(
  text: string,
  width: number,
  align: 'left' | 'right' | 'center' = 'left'
): string {
  const textWidth = getTextWidth(text);
  const padding = Math.max(0, width - textWidth);

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + text;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
    default:
      return text + ' '.repeat(padding);
  }
}

/**
 * Truncates text to a maximum width
 */
export function truncateText(
  text: string,
  maxWidth: number,
  suffix: string = '...'
): string {
  const textWidth = getTextWidth(text);

  if (textWidth <= maxWidth) {
    return text;
  }

  const suffixWidth = getTextWidth(suffix);
  const targetWidth = maxWidth - suffixWidth;

  if (targetWidth <= 0) {
    return suffix.substring(0, maxWidth);
  }

  // Handle ANSI codes properly when truncating
  const stripped = stripAnsi(text);
  const truncated = stripped.substring(0, targetWidth);

  // Try to preserve color codes if the original text had them
  const hasAnsi = text !== stripped;
  if (hasAnsi) {
    // Extract color codes from the beginning of the original text
    const colorMatch = text.match(/^(\x1b\[[0-9;]*m)*/);
    const colorPrefix = colorMatch ? colorMatch[0] : '';
    return colorPrefix + truncated + suffix + ANSI_RESET;
  }

  return truncated + suffix;
}

/**
 * Formats a timestamp
 */
export function formatTimestamp(
  date: Date = new Date(),
  format: string = 'HH:mm:ss'
): string {
  const pad = (num: number) => num.toString().padStart(2, '0');

  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

  return format
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('SSS', milliseconds);
}

/**
 * Creates a formatted prefix for task output
 */
export function createPrefix(
  identifier: string,
  color: Color | string,
  timestamp?: Date,
  maxWidth: number = 12
): string {
  const coloredId = colorize(padText(identifier, maxWidth), color);

  if (timestamp) {
    const time = dim(formatTimestamp(timestamp));
    return `${time} ${coloredId}`;
  }

  return coloredId;
}

/**
 * Formats an output line with prefix and color
 */
export function formatOutputLine(
  content: string,
  identifier: string,
  color: Color | string,
  type: 'stdout' | 'stderr' = 'stdout',
  timestamp?: Date,
  prefixWidth: number = 12
): OutputLine {
  const now = timestamp || new Date();
  const prefix = createPrefix(identifier, color, now, prefixWidth);
  const separator =
    type === 'stderr' ? colorize('│', 'red') : colorize('│', 'gray');
  const formatted = `${prefix} ${separator} ${content}`;

  return {
    identifier,
    content,
    type,
    timestamp: now.getTime(),
    formatted,
  };
}

/**
 * Creates a separator line
 */
export function createSeparator(
  width: number = 80,
  char: string = '─',
  color?: Color | string
): string {
  const line = char.repeat(width);
  return color ? colorize(line, color) : dim(line);
}

/**
 * Creates a header with title
 */
export function createHeader(
  title: string,
  width: number = 80,
  color: Color | string = 'blue'
): string {
  const titleWidth = getTextWidth(title);
  const padding = Math.max(0, width - titleWidth - 4); // 4 for spaces and borders
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  const line = '─'.repeat(width);
  const header = `  ${' '.repeat(leftPad)}${title}${' '.repeat(rightPad)}  `;

  return [
    colorize(line, color),
    colorize(header, color),
    colorize(line, color),
  ].join('\n');
}

/**
 * Clears the current line
 */
export function clearLine(): string {
  return supportsColor() ? ANSI_CLEAR_LINE : '';
}

/**
 * Moves cursor up by specified lines
 */
export function cursorUp(lines: number = 1): string {
  return supportsColor() ? `\x1b[${lines}A` : '';
}

/**
 * Creates a progress indicator
 */
export function createProgressIndicator(
  current: number,
  total: number,
  width: number = 20,
  color: Color | string = 'blue'
): string {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const coloredBar = colorize(bar, color);
  const percentText = `${percentage.toFixed(1)}%`;

  return `${coloredBar} ${percentText}`;
}

/**
 * Handles stream data and splits into lines
 */
export function processStreamData(
  data: Buffer | string,
  identifier: string,
  color: Color | string,
  type: 'stdout' | 'stderr' = 'stdout',
  prefixWidth: number = 12
): OutputLine[] {
  const text = data.toString();
  const lines = text.split(/\r?\n/);
  const outputLines: OutputLine[] = [];

  // Process each line (except the last one if it's empty, as it's usually just the newline)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines at the end
    if (i === lines.length - 1 && line === '') {
      continue;
    }

    outputLines.push(
      formatOutputLine(line, identifier, color, type, undefined, prefixWidth)
    );
  }

  return outputLines;
}

/**
 * Merges multiple output streams into a single stream
 */
export function mergeOutputStreams(streams: OutputLine[][]): OutputLine[] {
  const merged: OutputLine[] = [];

  // Flatten all streams
  for (const stream of streams) {
    merged.push(...stream);
  }

  // Sort by timestamp to maintain chronological order
  merged.sort((a, b) => a.timestamp - b.timestamp);

  return merged;
}

/**
 * Gets terminal width
 */
export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

/**
 * Gets terminal height
 */
export function getTerminalHeight(): number {
  return process.stdout.rows || 24;
}

/**
 * Checks if we're running in a CI environment
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.BUILD_NUMBER ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.JENKINS_URL
  );
}
