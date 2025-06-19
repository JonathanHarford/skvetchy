/**
 * Utility functions for handling pressure-sensitive input across drawing tools
 */

export interface PressureState {
  lastPressure: number;
}

/**
 * Processes raw pressure input with bounds checking and validation
 * @param pressure Raw pressure value (may be undefined or outside 0-1 range)
 * @returns Normalized pressure value between 0.1 and 1.0
 */
export function normalizePressure(pressure?: number): number {
  let currentPressure = pressure || 1.0;
  // Clamp pressure to reasonable bounds (Apple Pencil can sometimes report values outside 0-1)
  return Math.max(0.1, Math.min(1.0, currentPressure));
}

/**
 * Smooths pressure transitions to prevent jarring changes in line width
 * @param currentPressure The current normalized pressure value
 * @param lastPressure The previous pressure value
 * @param maxChange Maximum allowed pressure change per frame (default: 0.3)
 * @returns Smoothed pressure value
 */
export function smoothPressure(currentPressure: number, lastPressure: number, maxChange: number = 0.3): number {
  const pressureDiff = currentPressure - lastPressure;
  if (Math.abs(pressureDiff) > maxChange) {
    // Limit pressure change to prevent sudden jumps
    return lastPressure + (pressureDiff > 0 ? maxChange : -maxChange);
  }
  return currentPressure;
}

/**
 * Processes raw pressure input with normalization only (for initial pointer down)
 * @param pressure Raw pressure value
 * @returns Normalized pressure value ready for use
 */
export function processPressureInitial(pressure: number | undefined): number {
  return normalizePressure(pressure);
}

/**
 * Processes raw pressure input with normalization and smoothing (for pointer move)
 * @param pressure Raw pressure value
 * @param pressureState State object containing lastPressure
 * @returns Processed pressure value ready for use
 */
export function processPressureWithSmoothing(pressure: number | undefined, pressureState: PressureState): number {
  const normalized = normalizePressure(pressure);
  return smoothPressure(normalized, pressureState.lastPressure);
}

/**
 * Determines if pressure has changed significantly enough to warrant starting a new path segment
 * @param currentPressure Current pressure value
 * @param lastPressure Previous pressure value
 * @param threshold Minimum change threshold (default: 0.05)
 * @returns True if pressure change is significant
 */
export function hasSignificantPressureChange(currentPressure: number, lastPressure: number, threshold: number = 0.05): boolean {
  return Math.abs(currentPressure - lastPressure) > threshold;
} 