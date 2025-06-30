import type { ITool } from '../../core/tools/ITool';
import type { ILayer } from '../../core/LayerManager';
import { captureCanvasState, captureCanvasStateOptimized } from '../../core/HistoryManager';

export interface CanvasEventHandlerContext {
  currentToolInstance: ITool | null;
  layerManager: any;
  historyManager: any;
  penColor: string;
  penSize: number;
  displayCanvasElement: HTMLCanvasElement | null;
  imageDataBeforeStroke: { data: Uint8Array; size: { width: number; height: number } } | undefined;
  requestRedraw: () => void;
  updateExternalState: () => void;
  updateExternalStatePartial: (updateLayers?: boolean, updateActiveId?: boolean, updateHistory?: boolean) => void;
}

export class CanvasEventHandlers {
  private context: CanvasEventHandlerContext;

  constructor(context: CanvasEventHandlerContext) {
    this.context = context;
  }

  updateContext(context: CanvasEventHandlerContext) {
    this.context = context;
  }

  handlePointerDown = (event: PointerEvent): { data: Uint8Array; size: { width: number; height: number } } | undefined => {
    const { currentToolInstance, layerManager, penColor, penSize, displayCanvasElement } = this.context;
    
    if (!currentToolInstance || !layerManager) return;

    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement) {
      const imageDataBeforeStroke = captureCanvasStateOptimized(activeLayer.canvas);
      
      let pressure: number | undefined;
      if (event.pressure === 0) pressure = undefined;
      else if (event.pressure === 0.5 && event.pointerType !== 'pen') pressure = undefined;
      else pressure = event.pressure;
      
      currentToolInstance.onPointerDown(event, activeLayer, penColor, penSize, pressure);
      return imageDataBeforeStroke;
    }
    return undefined;
  };

  handlePointerMove = (event: PointerEvent): void => {
    const { currentToolInstance, layerManager, penColor, penSize, displayCanvasElement, requestRedraw } = this.context;
    
    if (!currentToolInstance || !layerManager) return;

    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement && (event.buttons === 1 || event.pointerType === 'touch')) {
      let pressure: number | undefined;
      if (event.pressure === 0) pressure = undefined;
      else if (event.pressure === 0.5 && event.pointerType !== 'pen') pressure = undefined;
      else pressure = event.pressure;
      
      currentToolInstance.onPointerMove(event, activeLayer, penColor, penSize, pressure);
      layerManager.markLayerDirty(activeLayer.id);
      requestRedraw();
    }
  };

  handlePointerUp = (event: PointerEvent, imageDataBeforeStroke?: { data: Uint8Array; size: { width: number; height: number } }): void => {
    const { currentToolInstance, layerManager, historyManager, displayCanvasElement, updateExternalStatePartial, requestRedraw } = this.context;
    
    if (!currentToolInstance || !layerManager || !historyManager) return;

    const activeLayer = layerManager.getActiveLayer();

    if (activeLayer && event.target === displayCanvasElement && imageDataBeforeStroke) {
      currentToolInstance.onPointerUp(event, activeLayer);
      const imageDataAfterStroke = captureCanvasStateOptimized(activeLayer.canvas);
      
      // Compare compressed data arrays to detect changes
      const hasChanged = !this.areImageDataEqual(imageDataBeforeStroke.data, imageDataAfterStroke.data);
      
      if (hasChanged) {
        historyManager.addHistory({
          type: 'stroke',
          layerId: activeLayer.id,
          imageDataBefore: imageDataBeforeStroke.data,
          imageDataAfter: imageDataAfterStroke.data,
          canvasSize: imageDataBeforeStroke.size,
        });
        layerManager.markLayerDirty(activeLayer.id);
        updateExternalStatePartial(false, false, true);
      }
      requestRedraw();
    }
  };

  private areImageDataEqual(data1: Uint8Array, data2: Uint8Array): boolean {
    if (data1.length !== data2.length) return false;
    for (let i = 0; i < data1.length; i++) {
      if (data1[i] !== data2[i]) return false;
    }
    return true;
  }
} 