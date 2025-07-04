import type { ILayer } from './LayerManager';

// Define types of actions for more structured history states
export type ActionType =
  | 'stroke'
  | 'clearLayer'
  | 'addLayer'
  | 'deleteLayer'
  | 'toggleLayerVisibility'
  | 'reorderLayer'
  | 'renameLayer';

export interface IHistoryAction {
  type: ActionType;
  layerId: string;
  imageDataBefore?: Uint8Array; // Changed from string
  imageDataAfter?: Uint8Array;  // Changed from string
  canvasSize?: { width: number; height: number }; // Add canvas dimensions
  deletedLayerData?: ILayer;
  deletedLayerIndex?: number;
  visibilityBefore?: boolean;
  meta?: {
    oldVisualIndex?: number;
    newVisualIndex?: number;
    targetLayerId?: string;
    oldName?: string; // For renameLayer
    newName?: string; // For renameLayer
  };
}

export class HistoryManager {
  private undoStack: IHistoryAction[] = [];
  private redoStack: IHistoryAction[] = [];
  private readonly maxHistorySize = 50; // Reduced from 100
  private readonly maxMemoryMB = 100; // Memory limit
  private currentMemoryUsage = 0;

  constructor() {}

  addHistory(action: IHistoryAction): void {
    // Calculate memory usage
    const actionSize = this.calculateActionSize(action);
    
    // Clean old history if memory limit exceeded
    while (this.currentMemoryUsage + actionSize > this.maxMemoryMB * 1024 * 1024) {
      const removed = this.undoStack.shift();
      if (removed) {
        this.currentMemoryUsage -= this.calculateActionSize(removed);
      } else {
        break;
      }
    }
    
    // Also enforce max history size
    if (this.undoStack.length >= this.maxHistorySize) {
      const removed = this.undoStack.shift();
      if (removed) {
        this.currentMemoryUsage -= this.calculateActionSize(removed);
      }
    }
    
    this.undoStack.push(action);
    this.currentMemoryUsage += actionSize;
    this.redoStack = [];
    // TODO: Emit event: historyChanged (e.g., to enable/disable undo/redo buttons)
    // console.log('History added:', action, this.undoStack.length);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(applyAction: (action: IHistoryAction, isUndo: boolean) => void): void {
    if (!this.canUndo()) return;

    const actionToUndo = this.undoStack.pop();
    if (actionToUndo) {
      applyAction(actionToUndo, true); // True indicates it's an undo operation
      this.redoStack.push(actionToUndo);
      // TODO: Emit event: historyChanged
      console.log('Undone:', actionToUndo);
    }
  }

  redo(applyAction: (action: IHistoryAction, isUndo: boolean) => void): void {
    if (!this.canRedo()) return;

    const actionToRedo = this.redoStack.pop();
    if (actionToRedo) {
      applyAction(actionToRedo, false); // False indicates it's a redo operation
      this.undoStack.push(actionToRedo);
      // TODO: Emit event: historyChanged
      console.log('Redone:', actionToRedo);
    }
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.currentMemoryUsage = 0;
    // TODO: Emit event: historyChanged
  }

  private calculateActionSize(action: IHistoryAction): number {
    // Estimate memory usage of action
    let size = 0;
    if (action.imageDataBefore) size += action.imageDataBefore.length;
    if (action.imageDataAfter) size += action.imageDataAfter.length;
    return size;
  }
}

// Helper function (to be used in Canvas.svelte or LayerManager)
// to capture canvas state. This is a simplified version.
export function captureCanvasState(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL(); // For pixel-based history.
}

// New optimized function for capturing compressed image data
export function captureCanvasStateOptimized(canvas: HTMLCanvasElement): { data: Uint8Array; size: { width: number; height: number } } {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Simple compression - store only non-transparent pixels with coordinates
  const compressed: number[] = [];
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Non-transparent pixel
      const pixelIndex = i / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      compressed.push(x, y, data[i], data[i + 1], data[i + 2], data[i + 3]);
    }
  }
  
  return {
    data: new Uint8Array(compressed),
    size: { width: canvas.width, height: canvas.height }
  };
}
