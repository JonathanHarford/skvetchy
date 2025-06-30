/**
 * Canvas utilities for common temporary canvas operations and clearing patterns
 */

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasWithContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

/**
 * Creates a temporary canvas with the specified dimensions
 * @param width Canvas width
 * @param height Canvas height
 * @returns Object containing the canvas and its 2D context
 * @throws Error if unable to get 2D context
 */
export function createTempCanvas(width: number, height: number): CanvasWithContext {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Failed to get 2D context for temporary canvas');
  }
  
  return { canvas, context };
}

/**
 * Creates a temporary canvas and copies content from source canvas
 * @param sourceCanvas Source canvas to copy from
 * @returns Object containing the temporary canvas and its 2D context
 */
export function createTempCanvasFromSource(sourceCanvas: HTMLCanvasElement): CanvasWithContext {
  const { canvas: tempCanvas, context: tempContext } = createTempCanvas(
    sourceCanvas.width, 
    sourceCanvas.height
  );
  
  tempContext.drawImage(sourceCanvas, 0, 0);
  return { canvas: tempCanvas, context: tempContext };
}

/**
 * Creates a temporary canvas for export with scaling
 * @param layers Array of layer canvases to composite
 * @param currentSize Current canvas dimensions
 * @param exportSize Target export dimensions
 * @returns Object containing the export canvas and its 2D context
 */
export function createExportCanvas(
  layers: HTMLCanvasElement[], 
  currentSize: CanvasSize, 
  exportSize: CanvasSize
): CanvasWithContext {
  const { canvas: exportCanvas, context: exportContext } = createTempCanvas(
    exportSize.width, 
    exportSize.height
  );
  
  const scaleX = exportSize.width / currentSize.width;
  const scaleY = exportSize.height / currentSize.height;
  exportContext.scale(scaleX, scaleY);
  
  // Composite all layers
  for (const layer of layers) {
    exportContext.drawImage(layer, 0, 0);
  }
  
  return { canvas: exportCanvas, context: exportContext };
}

/**
 * Creates a temporary canvas for layer backup during operations
 * @param sourceCanvas Source layer canvas to backup
 * @returns Object containing layer data for restoration
 */
export function createLayerBackup(sourceCanvas: HTMLCanvasElement): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
} {
  const { canvas: backupCanvas, context: backupContext } = createTempCanvasFromSource(sourceCanvas);
  
  return {
    canvas: backupCanvas,
    context: backupContext,
    width: sourceCanvas.width,
    height: sourceCanvas.height
  };
}

/**
 * Resizes a canvas while preserving its content
 * @param canvas Canvas to resize
 * @param context Canvas 2D context
 * @param newSize New dimensions
 */
export function resizeCanvasWithContent(
  canvas: HTMLCanvasElement, 
  context: CanvasRenderingContext2D, 
  newSize: CanvasSize
): void {
  // Create temporary backup of current content
  const { canvas: tempCanvas } = createTempCanvasFromSource(canvas);
  
  // Resize the original canvas
  canvas.width = newSize.width;
  canvas.height = newSize.height;
  
  // Restore content from backup
  context.drawImage(tempCanvas, 0, 0);
}

/**
 * Clears a canvas completely
 * @param canvas Canvas to clear
 * @param context Canvas 2D context
 */
export function clearCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Clears a rectangular area of a canvas
 * @param context Canvas 2D context
 * @param x X coordinate
 * @param y Y coordinate
 * @param width Width of area to clear
 * @param height Height of area to clear
 */
export function clearCanvasArea(
  context: CanvasRenderingContext2D, 
  x: number, 
  y: number, 
  width: number, 
  height: number
): void {
  context.clearRect(x, y, width, height);
}

/**
 * Copies content from one canvas to another
 * @param sourceCanvas Source canvas
 * @param targetContext Target canvas context
 * @param dx Destination X coordinate (default: 0)
 * @param dy Destination Y coordinate (default: 0)
 */
export function copyCanvasContent(
  sourceCanvas: HTMLCanvasElement, 
  targetContext: CanvasRenderingContext2D,
  dx: number = 0,
  dy: number = 0
): void {
  targetContext.drawImage(sourceCanvas, dx, dy);
}

/**
 * Creates a canvas blob for export
 * @param canvas Canvas to export
 * @param mimeType MIME type for export (default: 'image/png')
 * @param quality Quality for lossy formats (0-1)
 * @returns Promise resolving to Blob or null
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement, 
  mimeType: string = 'image/png',
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
}

/**
 * Creates a File from canvas for download
 * @param canvas Canvas to export
 * @param filename Filename for the file
 * @param mimeType MIME type for export (default: 'image/png')
 * @param quality Quality for lossy formats (0-1)
 * @returns Promise resolving to File or null
 */
export async function canvasToFile(
  canvas: HTMLCanvasElement,
  filename: string,
  mimeType: string = 'image/png',
  quality?: number
): Promise<File | null> {
  const blob = await canvasToBlob(canvas, mimeType, quality);
  if (!blob) return null;
  
  return new File([blob], filename, { type: mimeType });
} 