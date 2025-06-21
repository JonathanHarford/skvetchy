import { describe, it, expect } from 'vitest';
import { 
  normalizePressure, 
  smoothPressure, 
  processPressureInitial, 
  processPressureWithSmoothing, 
  hasSignificantPressureChange,
  calculatePressureLineWidth,
  type PressureState 
} from './PressureUtils';

describe('PressureUtils', () => {
  describe('normalizePressure', () => {
    it('should clamp pressure to 0.1-1.0 range', () => {
      expect(normalizePressure(0.05)).toBe(0.1);
      expect(normalizePressure(1.5)).toBe(1.0);
      expect(normalizePressure(0.5)).toBe(0.5);
      expect(normalizePressure(-0.2)).toBe(0.1);
    });

    it('should default to 1.0 for undefined pressure', () => {
      expect(normalizePressure(undefined)).toBe(1.0);
    });
  });

  describe('smoothPressure', () => {
    it('should limit large pressure changes', () => {
      expect(smoothPressure(1.0, 0.2)).toBe(0.5); // 0.2 + 0.3 max change
      expect(smoothPressure(0.1, 0.8)).toBe(0.5); // 0.8 - 0.3 max change
    });

    it('should allow small pressure changes', () => {
      expect(smoothPressure(0.6, 0.5)).toBe(0.6);
      expect(smoothPressure(0.4, 0.5)).toBe(0.4);
    });

    it('should use custom max change parameter', () => {
      expect(smoothPressure(1.0, 0.2, 0.1)).toBeCloseTo(0.3, 5); // 0.2 + 0.1 max change
    });
  });

  describe('calculatePressureLineWidth', () => {
    it('should always return 1px for minimum pressure regardless of brush size', () => {
      expect(calculatePressureLineWidth(0.1, 5)).toBe(1);
      expect(calculatePressureLineWidth(0.1, 20)).toBe(1);
      expect(calculatePressureLineWidth(0.1, 100)).toBe(1);
    });

    it('should return full brush size for maximum pressure', () => {
      expect(calculatePressureLineWidth(1.0, 5)).toBe(5);
      expect(calculatePressureLineWidth(1.0, 20)).toBe(20);
      expect(calculatePressureLineWidth(1.0, 100)).toBe(100);
    });

    it('should interpolate correctly between minimum and maximum', () => {
      // For a 10px brush:
      // - 0.1 pressure = 1px
      // - 0.55 pressure (middle) = 5.5px
      // - 1.0 pressure = 10px
      expect(calculatePressureLineWidth(0.55, 10)).toBeCloseTo(5.5, 1);
      
      // For a 20px brush:
      // - 0.1 pressure = 1px
      // - 0.55 pressure (middle) = 10.5px
      // - 1.0 pressure = 20px
      expect(calculatePressureLineWidth(0.55, 20)).toBeCloseTo(10.5, 1);
    });

    it('should handle edge case of 1px brush size', () => {
      expect(calculatePressureLineWidth(0.1, 1)).toBe(1);
      expect(calculatePressureLineWidth(0.5, 1)).toBe(1);
      expect(calculatePressureLineWidth(1.0, 1)).toBe(1);
    });

    it('should handle small brush sizes correctly', () => {
      // For a 2px brush: 0.1 -> 1px, 1.0 -> 2px
      expect(calculatePressureLineWidth(0.1, 2)).toBe(1);
      expect(calculatePressureLineWidth(1.0, 2)).toBe(2);
      expect(calculatePressureLineWidth(0.55, 2)).toBeCloseTo(1.5, 1);
    });
  });

  describe('processPressureInitial', () => {
    it('should normalize pressure', () => {
      expect(processPressureInitial(0.05)).toBe(0.1);
      expect(processPressureInitial(1.5)).toBe(1.0);
      expect(processPressureInitial(0.5)).toBe(0.5);
      expect(processPressureInitial(undefined)).toBe(1.0);
    });
  });

  describe('processPressureWithSmoothing', () => {
    it('should normalize and smooth pressure', () => {
      const pressureState: PressureState = { lastPressure: 0.2 };
      
      // Large jump should be smoothed
      expect(processPressureWithSmoothing(1.0, pressureState)).toBe(0.5);
      
      // Small change should pass through
      pressureState.lastPressure = 0.5;
      expect(processPressureWithSmoothing(0.6, pressureState)).toBe(0.6);
      
      // Out of bounds values should be normalized then smoothed
      pressureState.lastPressure = 0.2;
      expect(processPressureWithSmoothing(1.5, pressureState)).toBe(0.5); // 1.5 -> 1.0 -> 0.5
    });
  });

  describe('hasSignificantPressureChange', () => {
    it('should detect significant pressure changes', () => {
      expect(hasSignificantPressureChange(0.6, 0.5)).toBe(true);  // 0.1 > 0.05
      expect(hasSignificantPressureChange(0.54, 0.5)).toBe(false); // 0.04 < 0.05
      expect(hasSignificantPressureChange(0.4, 0.5)).toBe(true);  // 0.1 > 0.05
    });

    it('should use custom threshold', () => {
      expect(hasSignificantPressureChange(0.52, 0.5, 0.01)).toBe(true);  // 0.02 > 0.01
      expect(hasSignificantPressureChange(0.52, 0.5, 0.05)).toBe(false); // 0.02 < 0.05
    });
  });
}); 