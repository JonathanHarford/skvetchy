import type { IHistoryAction } from '../../core/HistoryManager';
import type { LayerManager } from '../../core/LayerManager';
import { clearCanvas } from '../../core/CanvasUtils';

export interface HistoryActionContext {
  layerManager: LayerManager | null;
  width: number;
  height: number;
  requestRedraw: () => void;
  updateExternalState: (dispatchHistoryChange?: boolean) => void;
  updateExternalStatePartial: (updateLayers?: boolean, updateActiveId?: boolean, updateHistory?: boolean) => void;
}

export class CanvasHistoryActions {
  private context: HistoryActionContext;

  constructor(context: HistoryActionContext) {
    this.context = context;
  }

  updateContext(context: HistoryActionContext) {
    this.context = context;
  }

  applyHistoryAction = (action: IHistoryAction, isUndo: boolean): void => {
    const { layerManager, width, height, requestRedraw, updateExternalStatePartial } = this.context;
    
    if (!layerManager) return;
    
    const layerToActOn = action.layerId ? layerManager.findLayerById(action.layerId) : null;

    if (!layerToActOn && action.type !== 'addLayer' && action.type !== 'deleteLayer' && action.type !== 'reorderLayer') {
      console.warn('Layer not found for history action:', action);
      return;
    }

    switch (action.type) {
      case 'stroke':
      case 'clearLayer':
        this.handleStrokeOrClearAction(action, isUndo, layerToActOn, requestRedraw);
        updateExternalStatePartial(true, false, false);
        break;
      case 'addLayer':
        this.handleAddLayerAction(action, isUndo, layerManager, width, height);
        updateExternalStatePartial(true, true, false);
        break;
      case 'deleteLayer':
        this.handleDeleteLayerAction(action, isUndo, layerManager);
        updateExternalStatePartial(true, true, false);
        break;
      case 'toggleLayerVisibility':
        this.handleToggleVisibilityAction(action, isUndo, layerToActOn);
        updateExternalStatePartial(true, false, false);
        break;
      case 'reorderLayer':
        this.handleReorderLayerAction(action, isUndo, layerManager);
        updateExternalStatePartial(true, false, false);
        break;
      case 'renameLayer':
        this.handleRenameLayerAction(action, isUndo, layerToActOn);
        updateExternalStatePartial(true, false, false);
        break;
    }
    
    requestRedraw();
  };

  private handleStrokeOrClearAction(action: IHistoryAction, isUndo: boolean, layerToActOn: any, requestRedraw: () => void) {
    if (layerToActOn) {
      const imageDataToRestore = isUndo ? action.imageDataBefore : action.imageDataAfter;
      if (imageDataToRestore) {
        const img = new Image();
        img.onload = () => {
          clearCanvas(layerToActOn.canvas, layerToActOn.context);
          layerToActOn.context.drawImage(img, 0, 0);
          requestRedraw();
        };
        img.src = imageDataToRestore;
      }
    }
  }

  private handleAddLayerAction(action: IHistoryAction, isUndo: boolean, layerManager: LayerManager, width: number, height: number) {
    if (isUndo) {
      if (action.layerId) layerManager.deleteLayer(action.layerId);
    } else {
      layerManager.addLayer(undefined, width, height);
    }
  }

  private handleDeleteLayerAction(action: IHistoryAction, isUndo: boolean, layerManager: LayerManager) {
    if (isUndo) {
      if (action.deletedLayerData) {
        layerManager.addLayerWithData(action.deletedLayerData, action.deletedLayerIndex);
      }
    } else {
      if (action.layerId) layerManager.deleteLayer(action.layerId);
    }
  }

  private handleToggleVisibilityAction(action: IHistoryAction, isUndo: boolean, layerToActOn: any) {
    if (layerToActOn && action.visibilityBefore !== undefined) {
      layerToActOn.isVisible = isUndo ? action.visibilityBefore : !action.visibilityBefore;
    }
  }

  private handleReorderLayerAction(action: IHistoryAction, isUndo: boolean, layerManager: LayerManager) {
    if (action.meta && action.meta.targetLayerId && action.meta.oldVisualIndex !== undefined && action.meta.newVisualIndex !== undefined) {
      const targetId = action.meta.targetLayerId as string;
      const newIndex = (isUndo ? action.meta.oldVisualIndex : action.meta.newVisualIndex) as number;
      layerManager.reorderLayer(targetId, newIndex);
    }
  }

  private handleRenameLayerAction(action: IHistoryAction, isUndo: boolean, layerToActOn: any) {
    if (layerToActOn && action.meta && action.meta.oldName !== undefined && action.meta.newName !== undefined) {
      const nameToSet = (isUndo ? action.meta.oldName : action.meta.newName) as string;
      layerToActOn.name = nameToSet;
    }
  }
} 