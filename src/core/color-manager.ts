import { Color, ColorAssignment } from '../types/index.js';

/**
 * ANSI color codes for terminal output
 */
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

/**
 * Reset ANSI code to clear formatting
 */
const ANSI_RESET = '\x1b[0m';

/**
 * Default color cycle for automatic assignment
 */
const DEFAULT_COLORS: Color[] = [
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'brightRed',
  'brightGreen',
  'brightYellow',
  'brightBlue',
  'brightMagenta',
  'brightCyan',
];

/**
 * ColorManager handles color assignment and ANSI code generation for task output
 */
export class ColorManager {
  private assignments: Map<string, ColorAssignment> = new Map();
  private colorIndex = 0;
  private availableColors: Color[];

  constructor(customColors?: (Color | string)[]) {
    this.availableColors = (customColors?.filter(
      color => typeof color === 'string' && color in ANSI_COLORS
    ) as Color[]) || [...DEFAULT_COLORS];
  }

  /**
   * Assigns a color to a task identifier
   */
  assignColor(
    identifier: string,
    customColor?: Color | string
  ): ColorAssignment {
    // Check if already assigned
    const existing = this.assignments.get(identifier);
    if (existing) {
      return existing;
    }

    let color: Color | string;
    let ansiCode: string;

    if (customColor) {
      // Use custom color if provided
      color = customColor;
      ansiCode = this.getAnsiCode(customColor);
    } else {
      // Auto-assign from available colors
      color =
        this.availableColors[this.colorIndex % this.availableColors.length];
      ansiCode = ANSI_COLORS[color as Color];
      this.colorIndex++;
    }

    const assignment: ColorAssignment = {
      identifier,
      color,
      ansiCode,
    };

    this.assignments.set(identifier, assignment);
    return assignment;
  }

  /**
   * Gets the color assignment for a task identifier
   */
  getAssignment(identifier: string): ColorAssignment | undefined {
    return this.assignments.get(identifier);
  }

  /**
   * Formats text with the assigned color for a task
   */
  formatText(identifier: string, text: string): string {
    const assignment = this.assignments.get(identifier);
    if (!assignment) {
      return text;
    }

    return `${assignment.ansiCode}${text}${ANSI_RESET}`;
  }

  /**
   * Formats a complete output line with color and prefix
   */
  formatOutputLine(
    identifier: string,
    content: string,
    prefix?: string
  ): string {
    const assignment = this.assignments.get(identifier);
    if (!assignment) {
      return content;
    }

    const displayPrefix = prefix || identifier;
    const coloredPrefix = `${assignment.ansiCode}[${displayPrefix}]${ANSI_RESET}`;

    return `${coloredPrefix} ${content}`;
  }

  /**
   * Gets ANSI code for a color (supports predefined colors and hex/rgb)
   */
  private getAnsiCode(color: Color | string): string {
    // Check if it's a predefined color
    if (color in ANSI_COLORS) {
      return ANSI_COLORS[color as Color];
    }

    // Handle hex colors (#RRGGBB)
    if (
      typeof color === 'string' &&
      color.startsWith('#') &&
      color.length === 7
    ) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `\x1b[38;2;${r};${g};${b}m`;
    }

    // Handle rgb colors (rgb(r,g,b))
    if (
      typeof color === 'string' &&
      color.startsWith('rgb(') &&
      color.endsWith(')')
    ) {
      const values = color
        .slice(4, -1)
        .split(',')
        .map(v => parseInt(v.trim()));
      if (values.length === 3 && values.every(v => v >= 0 && v <= 255)) {
        return `\x1b[38;2;${values[0]};${values[1]};${values[2]}m`;
      }
    }

    // Fallback to white if color is not recognized
    return ANSI_COLORS.white;
  }

  /**
   * Resets all color assignments
   */
  reset(): void {
    this.assignments.clear();
    this.colorIndex = 0;
  }

  /**
   * Gets all current assignments
   */
  getAllAssignments(): ColorAssignment[] {
    return Array.from(this.assignments.values());
  }

  /**
   * Validates and assigns a custom color to a task
   */
  assignCustomColor(identifier: string, color: string): ColorAssignment {
    if (!ColorManager.isValidColor(color)) {
      throw new Error(
        `Invalid color format: ${color}. Use predefined color names, hex (#RRGGBB), or rgb(r,g,b) format.`
      );
    }

    const ansiCode = this.getAnsiCode(color);
    const assignment: ColorAssignment = {
      identifier,
      color,
      ansiCode,
    };

    this.assignments.set(identifier, assignment);
    return assignment;
  }

  /**
   * Gets a mapping of all predefined color names to their ANSI codes
   */
  static getColorNameMapping(): Record<Color, string> {
    return { ...ANSI_COLORS };
  }

  /**
   * Converts a color name to its ANSI code
   */
  static colorNameToAnsi(colorName: Color): string {
    return ANSI_COLORS[colorName] || ANSI_COLORS.white;
  }

  /**
   * Gets all available predefined color names
   */
  static getAvailableColors(): Color[] {
    return Object.keys(ANSI_COLORS) as Color[];
  }

  /**
   * Validates a hex color format
   */
  static isValidHexColor(color: string): boolean {
    if (!color.startsWith('#') || color.length !== 7) {
      return false;
    }
    const hex = color.slice(1);
    return /^[0-9A-Fa-f]{6}$/.test(hex);
  }

  /**
   * Validates an RGB color format
   */
  static isValidRgbColor(color: string): boolean {
    if (!color.startsWith('rgb(') || !color.endsWith(')')) {
      return false;
    }
    const values = color
      .slice(4, -1)
      .split(',')
      .map(v => parseInt(v.trim()));
    return (
      values.length === 3 && values.every(v => !isNaN(v) && v >= 0 && v <= 255)
    );
  }

  /**
   * Parses RGB values from an rgb() color string
   */
  static parseRgbColor(color: string): [number, number, number] | null {
    if (!ColorManager.isValidRgbColor(color)) {
      return null;
    }
    const values = color
      .slice(4, -1)
      .split(',')
      .map(v => parseInt(v.trim()));
    return [values[0], values[1], values[2]];
  }

  /**
   * Parses hex values from a hex color string
   */
  static parseHexColor(color: string): [number, number, number] | null {
    if (!ColorManager.isValidHexColor(color)) {
      return null;
    }
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b];
  }

  /**
   * Checks if a color is valid (predefined, hex, or rgb format)
   */
  static isValidColor(color: string): boolean {
    // Check predefined colors
    if (color in ANSI_COLORS) {
      return true;
    }

    // Check hex format
    if (ColorManager.isValidHexColor(color)) {
      return true;
    }

    // Check rgb format
    if (ColorManager.isValidRgbColor(color)) {
      return true;
    }

    return false;
  }
}
