import type { ILayer } from './LayerManager';

// Define types of actions for more structured history states
export type ActionType =
  | 'stroke'
  | 'clearLayer'
  | 'addLayer'
  | 'deleteLayer'
  | 'toggleLayerVisibility'
  | 'reorderLayer' // Ensure this is present
  | 'renameLayer'; // For future use

export interface IHistoryAction {
  type: ActionType;
  layerId: string; // Often the primary subject layer
  imageDataBefore?: string;
  imageDataAfter?: string;
  deletedLayerData?: ILayer;
  deletedLayerIndex?: number;
  visibilityBefore?: boolean;
  meta?: { // Used for reorderLayer and potentially others
    oldVisualIndex?: number;
    newVisualIndex?: number;
    targetLayerId?: string; // ID of the layer that was moved
    // other specific data
  };
}

export class HistoryManager {
  private undoStack: IHistoryAction[] = [];
  private redoStack: IHistoryAction[] = [];
  private readonly maxHistorySize = 100; // Limit history size

  constructor() {}

  addHistory(action: IHistoryAction): void {
    if (this.undoStack.length >= this.maxHistorySize) {
      this.undoStack.shift(); // Remove the oldest item
    }
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack whenever a new action is added
    // TODO: Emit event: historyChanged (e.g., to enable/disable undo/redo buttons)
    console.log('History added:', action, this.undoStack.length);
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
    // TODO: Emit event: historyChanged
  }
}

// Helper function (to be used in Canvas.svelte or LayerManager)
// to capture canvas state. This is a simplified version.
export function captureCanvasState(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL(); // For pixel-based history.
}
