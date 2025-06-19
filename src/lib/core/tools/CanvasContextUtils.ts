/**
 * Utility functions for setting up canvas context for drawing operations
 */

export interface StrokeContextOptions {
  color?: string;
  lineWidth?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
}

/**
 * Composite operation types used by drawing tools
 */
export type CompositeOperation = 'source-over' | 'destination-out';

/**
 * Sets the global composite operation for a canvas context
 */
export function setCompositeOperation(context: CanvasRenderingContext2D, operation: CompositeOperation): void {
  context.globalCompositeOperation = operation;
}

/**
 * Resets the global composite operation to the default (source-over)
 */
export function resetCompositeOperation(context: CanvasRenderingContext2D): void {
  context.globalCompositeOperation = 'source-over';
}

/**
 * Sets up canvas context for stroke-based drawing operations
 * @param context The canvas rendering context
 * @param options Configuration options for the stroke
 */
export function setupStrokeContext(
  context: CanvasRenderingContext2D, 
  options: StrokeContextOptions
): void {
  context.beginPath();
  
  if (options.color !== undefined) {
    context.strokeStyle = options.color;
  }
  
  context.lineWidth = options.lineWidth || 1;
  context.lineCap = options.lineCap || 'round';
  context.lineJoin = options.lineJoin || 'round';
}

/**
 * Sets up canvas context and moves to starting position for stroke-based drawing
 * @param context The canvas rendering context
 * @param options Configuration options for the stroke
 * @param x Starting X coordinate
 * @param y Starting Y coordinate
 */
export function setupStrokeContextWithPosition(
  context: CanvasRenderingContext2D,
  options: StrokeContextOptions,
  x: number,
  y: number
): void {
  setupStrokeContext(context, options);
  context.moveTo(x, y);
}

/**
 * Creates a new stroke path segment by finishing the current path and starting a new one
 * @param context The canvas rendering context
 * @param options Configuration options for the new stroke
 * @param fromX Starting X coordinate for the new path
 * @param fromY Starting Y coordinate for the new path
 * @param toX Ending X coordinate to draw to
 * @param toY Ending Y coordinate to draw to
 */
export function createNewStrokeSegment(
  context: CanvasRenderingContext2D,
  options: StrokeContextOptions,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void {
  // Finish current path
  context.lineTo(toX, toY);
  context.stroke();
  
  // Start new path segment
  setupStrokeContextWithPosition(context, options, fromX, fromY);
} 