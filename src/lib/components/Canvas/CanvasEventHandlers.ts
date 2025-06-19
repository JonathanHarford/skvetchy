import type { ITool } from '../../core/tools/ITool';
import type { ILayer } from '../../core/LayerManager';
import { captureCanvasState } from '../../core/HistoryManager';

export interface CanvasEventHandlerContext {
  currentToolInstance: ITool | null;
  layerManager: any;
  historyManager: any;
  penColor: string;
  penSize: number;
  displayCanvasElement: HTMLCanvasElement | null;
  imageDataBeforeStroke: string | undefined;
  requestRedraw: () => void;
  updateExternalState: () => void;
}

export class CanvasEventHandlers {
  private context: CanvasEventHandlerContext;

  constructor(context: CanvasEventHandlerContext) {
    this.context = context;
  }

  updateContext(context: CanvasEventHandlerContext) {
    this.context = context;
  }

  handlePointerDown = (event: PointerEvent): string | undefined => {
    const { currentToolInstance, layerManager, penColor, penSize, displayCanvasElement } = this.context;
    
    if (!currentToolInstance || !layerManager) return;

    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement) {
      const imageDataBeforeStroke = captureCanvasState(activeLayer.canvas);
      
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
      requestRedraw();
    }
  };

  handlePointerUp = (event: PointerEvent, imageDataBeforeStroke?: string): void => {
    const { currentToolInstance, layerManager, historyManager, displayCanvasElement, updateExternalState, requestRedraw } = this.context;
    
    if (!currentToolInstance || !layerManager || !historyManager) return;

    const activeLayer = layerManager.getActiveLayer();

    if (activeLayer && event.target === displayCanvasElement && imageDataBeforeStroke) {
      currentToolInstance.onPointerUp(event, activeLayer);
      const imageDataAfterStroke = captureCanvasState(activeLayer.canvas);
      
      if (imageDataBeforeStroke !== imageDataAfterStroke) {
        historyManager.addHistory({
          type: 'stroke',
          layerId: activeLayer.id,
          imageDataBefore: imageDataBeforeStroke,
          imageDataAfter: imageDataAfterStroke,
        });
        updateExternalState();
      }
      requestRedraw();
    }
  };
} 