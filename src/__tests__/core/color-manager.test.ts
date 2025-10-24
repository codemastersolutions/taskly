import { describe, it, expect, beforeEach } from 'vitest';
import { ColorManager } from '../../core/color-manager.js';
import { Color } from '../../types/index.js';

describe('ColorManager', () => {
  let colorManager: ColorManager;

  beforeEach(() => {
    colorManager = new ColorManager();
  });

  describe('constructor', () => {
    it('should initialize with default colors', () => {
      const manager = new ColorManager();
      expect(manager).toBeInstanceOf(ColorManager);
    });

    it('should initialize with custom colors', () => {
      const customColors: Color[] = ['red', 'blue', 'green'];
      const manager = new ColorManager(customColors);

      const assignment1 = manager.assignColor('task1');
      const assignment2 = manager.assignColor('task2');
      const assignment3 = manager.assignColor('task3');
      const assignment4 = manager.assignColor('task4');

      expect(assignment1.color).toBe('red');
      expect(assignment2.color).toBe('blue');
      expect(assignment3.color).toBe('green');
      expect(assignment4.color).toBe('red'); // Should cycle back
    });

    it('should filter out invalid custom colors', () => {
      const mixedColors = ['red', 'invalid-color', 'blue', 'another-invalid'];
      const manager = new ColorManager(mixedColors);

      const assignment1 = manager.assignColor('task1');
      const assignment2 = manager.assignColor('task2');
      const assignment3 = manager.assignColor('task3');

      expect(assignment1.color).toBe('red');
      expect(assignment2.color).toBe('blue');
      expect(assignment3.color).toBe('red'); // Should cycle back to valid colors only
    });
  });

  describe('assignColor', () => {
    it('should assign colors automatically in sequence', () => {
      const assignment1 = colorManager.assignColor('task1');
      const assignment2 = colorManager.assignColor('task2');
      const assignment3 = colorManager.assignColor('task3');

      expect(assignment1.identifier).toBe('task1');
      expect(assignment2.identifier).toBe('task2');
      expect(assignment3.identifier).toBe('task3');

      expect(assignment1.color).toBe('red');
      expect(assignment2.color).toBe('green');
      expect(assignment3.color).toBe('yellow');

      expect(assignment1.ansiCode).toBe('\x1b[31m');
      expect(assignment2.ansiCode).toBe('\x1b[32m');
      expect(assignment3.ansiCode).toBe('\x1b[33m');
    });

    it('should cycle through colors when more tasks than colors', () => {
      const customManager = new ColorManager(['red', 'blue']);

      const assignment1 = customManager.assignColor('task1');
      const assignment2 = customManager.assignColor('task2');
      const assignment3 = customManager.assignColor('task3');

      expect(assignment1.color).toBe('red');
      expect(assignment2.color).toBe('blue');
      expect(assignment3.color).toBe('red'); // Cycles back
    });

    it('should use custom color when provided', () => {
      const assignment = colorManager.assignColor('task1', 'brightMagenta');

      expect(assignment.identifier).toBe('task1');
      expect(assignment.color).toBe('brightMagenta');
      expect(assignment.ansiCode).toBe('\x1b[95m');
    });

    it('should use hex color when provided', () => {
      const assignment = colorManager.assignColor('task1', '#FF5733');

      expect(assignment.identifier).toBe('task1');
      expect(assignment.color).toBe('#FF5733');
      expect(assignment.ansiCode).toBe('\x1b[38;2;255;87;51m');
    });

    it('should use rgb color when provided', () => {
      const assignment = colorManager.assignColor('task1', 'rgb(255,87,51)');

      expect(assignment.identifier).toBe('task1');
      expect(assignment.color).toBe('rgb(255,87,51)');
      expect(assignment.ansiCode).toBe('\x1b[38;2;255;87;51m');
    });

    it('should return existing assignment for same identifier', () => {
      const assignment1 = colorManager.assignColor('task1', 'red');
      const assignment2 = colorManager.assignColor('task1', 'blue'); // Should ignore blue

      expect(assignment1).toBe(assignment2);
      expect(assignment2.color).toBe('red');
    });
  });

  describe('getAssignment', () => {
    it('should return assignment for existing identifier', () => {
      const original = colorManager.assignColor('task1', 'blue');
      const retrieved = colorManager.getAssignment('task1');

      expect(retrieved).toBe(original);
      expect(retrieved?.identifier).toBe('task1');
      expect(retrieved?.color).toBe('blue');
    });

    it('should return undefined for non-existing identifier', () => {
      const assignment = colorManager.getAssignment('nonexistent');
      expect(assignment).toBeUndefined();
    });
  });

  describe('formatText', () => {
    it('should format text with assigned color', () => {
      colorManager.assignColor('task1', 'red');
      const formatted = colorManager.formatText('task1', 'Hello World');

      expect(formatted).toBe('\x1b[31mHello World\x1b[0m');
    });

    it('should return unformatted text for unassigned identifier', () => {
      const formatted = colorManager.formatText('nonexistent', 'Hello World');
      expect(formatted).toBe('Hello World');
    });
  });

  describe('formatOutputLine', () => {
    it('should format output line with color and default prefix', () => {
      colorManager.assignColor('task1', 'green');
      const formatted = colorManager.formatOutputLine(
        'task1',
        'Output message'
      );

      expect(formatted).toBe('\x1b[32m[task1]\x1b[0m Output message');
    });

    it('should format output line with custom prefix', () => {
      colorManager.assignColor('task1', 'blue');
      const formatted = colorManager.formatOutputLine(
        'task1',
        'Output message',
        'custom-prefix'
      );

      expect(formatted).toBe('\x1b[34m[custom-prefix]\x1b[0m Output message');
    });

    it('should return unformatted line for unassigned identifier', () => {
      const formatted = colorManager.formatOutputLine(
        'nonexistent',
        'Output message'
      );
      expect(formatted).toBe('Output message');
    });
  });

  describe('assignCustomColor', () => {
    it('should assign valid predefined color', () => {
      const assignment = colorManager.assignCustomColor('task1', 'brightCyan');

      expect(assignment.identifier).toBe('task1');
      expect(assignment.color).toBe('brightCyan');
      expect(assignment.ansiCode).toBe('\x1b[96m');
    });

    it('should assign valid hex color', () => {
      const assignment = colorManager.assignCustomColor('task1', '#FF0000');

      expect(assignment.identifier).toBe('task1');
      expect(assignment.color).toBe('#FF0000');
      expect(assignment.ansiCode).toBe('\x1b[38;2;255;0;0m');
    });

    it('should assign valid rgb color', () => {
      const assignment = colorManager.assignCustomColor(
        'task1',
        'rgb(0,255,0)'
      );

      expect(assignment.identifier).toBe('task1');
      expect(assignment.color).toBe('rgb(0,255,0)');
      expect(assignment.ansiCode).toBe('\x1b[38;2;0;255;0m');
    });

    it('should throw error for invalid color', () => {
      expect(() =>
        colorManager.assignCustomColor('task1', 'invalid-color')
      ).toThrow('Invalid color format: invalid-color');
    });

    it('should throw error for invalid hex color', () => {
      expect(() => colorManager.assignCustomColor('task1', '#GGGGGG')).toThrow(
        'Invalid color format: #GGGGGG'
      );
    });

    it('should throw error for invalid rgb color', () => {
      expect(() =>
        colorManager.assignCustomColor('task1', 'rgb(256,0,0)')
      ).toThrow('Invalid color format: rgb(256,0,0)');
    });
  });

  describe('reset', () => {
    it('should clear all assignments and reset color index', () => {
      colorManager.assignColor('task1');
      colorManager.assignColor('task2');

      expect(colorManager.getAssignment('task1')).toBeDefined();
      expect(colorManager.getAssignment('task2')).toBeDefined();

      colorManager.reset();

      expect(colorManager.getAssignment('task1')).toBeUndefined();
      expect(colorManager.getAssignment('task2')).toBeUndefined();

      // Should start from first color again
      const newAssignment = colorManager.assignColor('task3');
      expect(newAssignment.color).toBe('red');
    });
  });

  describe('getAllAssignments', () => {
    it('should return all current assignments', () => {
      colorManager.assignColor('task1', 'red');
      colorManager.assignColor('task2', 'blue');

      const assignments = colorManager.getAllAssignments();

      expect(assignments).toHaveLength(2);
      expect(assignments.find(a => a.identifier === 'task1')?.color).toBe(
        'red'
      );
      expect(assignments.find(a => a.identifier === 'task2')?.color).toBe(
        'blue'
      );
    });

    it('should return empty array when no assignments', () => {
      const assignments = colorManager.getAllAssignments();
      expect(assignments).toEqual([]);
    });
  });

  describe('static methods', () => {
    describe('isValidColor', () => {
      it('should validate predefined colors', () => {
        expect(ColorManager.isValidColor('red')).toBe(true);
        expect(ColorManager.isValidColor('brightBlue')).toBe(true);
        expect(ColorManager.isValidColor('invalid')).toBe(false);
      });

      it('should validate hex colors', () => {
        expect(ColorManager.isValidColor('#FF0000')).toBe(true);
        expect(ColorManager.isValidColor('#123ABC')).toBe(true);
        expect(ColorManager.isValidColor('#GGGGGG')).toBe(false);
        expect(ColorManager.isValidColor('#FF00')).toBe(false);
        expect(ColorManager.isValidColor('FF0000')).toBe(false);
      });

      it('should validate rgb colors', () => {
        expect(ColorManager.isValidColor('rgb(255,0,0)')).toBe(true);
        expect(ColorManager.isValidColor('rgb(0,255,0)')).toBe(true);
        expect(ColorManager.isValidColor('rgb(0,0,255)')).toBe(true);
        expect(ColorManager.isValidColor('rgb(256,0,0)')).toBe(false);
        expect(ColorManager.isValidColor('rgb(-1,0,0)')).toBe(false);
        expect(ColorManager.isValidColor('rgb(255,0)')).toBe(false);
        expect(ColorManager.isValidColor('rgb(255,0,0,0)')).toBe(false);
      });
    });

    describe('isValidHexColor', () => {
      it('should validate hex color format', () => {
        expect(ColorManager.isValidHexColor('#FF0000')).toBe(true);
        expect(ColorManager.isValidHexColor('#123abc')).toBe(true);
        expect(ColorManager.isValidHexColor('#GGGGGG')).toBe(false);
        expect(ColorManager.isValidHexColor('#FF00')).toBe(false);
        expect(ColorManager.isValidHexColor('FF0000')).toBe(false);
      });
    });

    describe('isValidRgbColor', () => {
      it('should validate rgb color format', () => {
        expect(ColorManager.isValidRgbColor('rgb(255,0,0)')).toBe(true);
        expect(ColorManager.isValidRgbColor('rgb(0, 255, 0)')).toBe(true);
        expect(ColorManager.isValidRgbColor('rgb(256,0,0)')).toBe(false);
        expect(ColorManager.isValidRgbColor('rgb(-1,0,0)')).toBe(false);
        expect(ColorManager.isValidRgbColor('rgb(255,0)')).toBe(false);
      });
    });

    describe('parseRgbColor', () => {
      it('should parse valid rgb colors', () => {
        expect(ColorManager.parseRgbColor('rgb(255,0,0)')).toEqual([255, 0, 0]);
        expect(ColorManager.parseRgbColor('rgb(0, 255, 0)')).toEqual([
          0, 255, 0,
        ]);
        expect(ColorManager.parseRgbColor('rgb(100, 150, 200)')).toEqual([
          100, 150, 200,
        ]);
      });

      it('should return null for invalid rgb colors', () => {
        expect(ColorManager.parseRgbColor('rgb(256,0,0)')).toBeNull();
        expect(ColorManager.parseRgbColor('invalid')).toBeNull();
        expect(ColorManager.parseRgbColor('rgb(255,0)')).toBeNull();
      });
    });

    describe('parseHexColor', () => {
      it('should parse valid hex colors', () => {
        expect(ColorManager.parseHexColor('#FF0000')).toEqual([255, 0, 0]);
        expect(ColorManager.parseHexColor('#00FF00')).toEqual([0, 255, 0]);
        expect(ColorManager.parseHexColor('#123ABC')).toEqual([18, 58, 188]);
      });

      it('should return null for invalid hex colors', () => {
        expect(ColorManager.parseHexColor('#GGGGGG')).toBeNull();
        expect(ColorManager.parseHexColor('invalid')).toBeNull();
        expect(ColorManager.parseHexColor('#FF00')).toBeNull();
      });
    });

    describe('getColorNameMapping', () => {
      it('should return all predefined color mappings', () => {
        const mapping = ColorManager.getColorNameMapping();

        expect(mapping.red).toBe('\x1b[31m');
        expect(mapping.green).toBe('\x1b[32m');
        expect(mapping.brightRed).toBe('\x1b[91m');
        expect(Object.keys(mapping)).toContain('red');
        expect(Object.keys(mapping)).toContain('brightCyan');
      });
    });

    describe('colorNameToAnsi', () => {
      it('should convert color names to ANSI codes', () => {
        expect(ColorManager.colorNameToAnsi('red')).toBe('\x1b[31m');
        expect(ColorManager.colorNameToAnsi('brightBlue')).toBe('\x1b[94m');
      });
    });

    describe('getAvailableColors', () => {
      it('should return all available color names', () => {
        const colors = ColorManager.getAvailableColors();

        expect(colors).toContain('red');
        expect(colors).toContain('green');
        expect(colors).toContain('brightMagenta');
        expect(colors.length).toBeGreaterThan(10);
      });
    });
  });
});
