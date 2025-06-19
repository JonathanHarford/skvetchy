import { describe, it, expect } from 'vitest';
import { 
  normalizePressure, 
  smoothPressure, 
  processPressureInitial, 
  processPressureWithSmoothing, 
  hasSignificantPressureChange,
  type PressureState 
} from './PressureUtils';

describe('PressureUtils', () => {
  describe('normalizePressure', () => {
    it('should clamp pressure values to reasonable bounds', () => {
      expect(normalizePressure(0.05)).toBe(0.1); // Below minimum
      expect(normalizePressure(1.5)).toBe(1.0);  // Above maximum
      expect(normalizePressure(-0.2)).toBe(0.1); // Negative
      expect(normalizePressure(0.5)).toBe(0.5);  // Normal value
      expect(normalizePressure(undefined)).toBe(1.0); // Default
    });
  });

  describe('smoothPressure', () => {
    it('should limit large pressure changes', () => {
      expect(smoothPressure(1.0, 0.2, 0.3)).toBe(0.5); // Limited increase
      expect(smoothPressure(0.1, 0.8, 0.3)).toBe(0.5); // Limited decrease
      expect(smoothPressure(0.7, 0.5, 0.3)).toBe(0.7); // Small change, no limit
    });

    it('should use default max change of 0.3', () => {
      expect(smoothPressure(1.0, 0.2)).toBe(0.5); // 0.2 + 0.3
      expect(smoothPressure(0.1, 0.8)).toBe(0.5); // 0.8 - 0.3
    });
  });

  describe('processPressureInitial', () => {
    it('should only normalize pressure without smoothing', () => {
      expect(processPressureInitial(0.05)).toBe(0.1);
      expect(processPressureInitial(1.5)).toBe(1.0);
      expect(processPressureInitial(0.7)).toBe(0.7);
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