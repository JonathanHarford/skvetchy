import type { IHistoryAction } from '../../core/HistoryManager';
import type { LayerManager } from '../../core/LayerManager';
import { clearCanvas } from '../../core/CanvasUtils';
import { decompressImageData } from '../../core/HistoryUtils';

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
        this.handleStrokeOrClearAction(action, isUndo, layerToActOn, requestRedraw, layerManager);
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
        this.handleToggleVisibilityAction(action, isUndo, layerToActOn, layerManager);
        updateExternalStatePartial(true, false, false);
        break;
      case 'reorderLayer':
        this.handleReorderLayerAction(action, isUndo, layerManager);
        // Mark all layers as dirty to force redraw with new order
        layerManager.getLayers().forEach(layer => layerManager.markLayerDirty(layer.id));
        updateExternalStatePartial(true, false, false);
        break;
      case 'renameLayer':
        this.handleRenameLayerAction(action, isUndo, layerToActOn);
        updateExternalStatePartial(true, false, false);
        break;
    }
    
    requestRedraw();
  };

  private handleStrokeOrClearAction(action: IHistoryAction, isUndo: boolean, layerToActOn: any, requestRedraw: () => void, layerManager: LayerManager) {
    if (layerToActOn) {
      const imageDataToRestore = isUndo ? action.imageDataBefore : action.imageDataAfter;
      if (imageDataToRestore && action.canvasSize) {
        // Clear the canvas first
        clearCanvas(layerToActOn.canvas, layerToActOn.context);
        
        // Decompress and restore the image data
        const imageData = decompressImageData(imageDataToRestore, action.canvasSize.width, action.canvasSize.height);
        layerToActOn.context.putImageData(imageData, 0, 0);
        layerManager.markLayerDirty(layerToActOn.id);
        requestRedraw();
      }
    }
  }

  private handleAddLayerAction(action: IHistoryAction, isUndo: boolean, layerManager: LayerManager, width: number, height: number) {
    if (isUndo) {
      if (action.layerId) {
        layerManager.deleteLayer(action.layerId);
      }
    } else {
      layerManager.addLayer(undefined, width, height);
    }
  }

  private handleDeleteLayerAction(action: IHistoryAction, isUndo: boolean, layerManager: LayerManager) {
    if (isUndo) {
      if (action.deletedLayerData) {
        layerManager.addLayerWithData(action.deletedLayerData, action.deletedLayerIndex);
        // Mark all layers as dirty to force a complete redraw
        layerManager.getLayers().forEach(layer => layerManager.markLayerDirty(layer.id));
      }
    } else {
      if (action.layerId) {
        layerManager.deleteLayer(action.layerId);
        // Mark all remaining layers as dirty to force a complete redraw
        layerManager.getLayers().forEach(layer => layerManager.markLayerDirty(layer.id));
      }
    }
  }

  private handleToggleVisibilityAction(action: IHistoryAction, isUndo: boolean, layerToActOn: any, layerManager: LayerManager) {
    if (layerToActOn && action.visibilityBefore !== undefined) {
      layerToActOn.isVisible = isUndo ? action.visibilityBefore : !action.visibilityBefore;
      layerManager.markLayerDirty(layerToActOn.id);
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