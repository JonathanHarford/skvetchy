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

  handlePointerDown = (event: PointerEvent): string | undefined => {
    const { currentToolInstance, layerManager, penColor, penSize, displayCanvasElement } = this.context;
    
    if (!currentToolInstance || !layerManager) return;

    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement) {
      const imageDataBeforeStroke = captureCanvasState(activeLayer.canvas);
      
      let pressureValue: number | undefined;
      if (event.pressure === 0 && event.pointerType === 'pen') { // Specifically for pen, 0 pressure should be treated as minimal, not default
        pressureValue = 0;
      } else if (event.pressure === 0.5 && event.pointerType !== 'pen') { // Non-pen (mouse/touch) with default 0.5 pressure
        pressureValue = undefined; // Will default to 1.0 in normalizePressure, as intended for mouse/touch
      } else {
        pressureValue = event.pressure;
      }
      
      currentToolInstance.onPointerDown(event, activeLayer, penColor, penSize, pressureValue);
      return imageDataBeforeStroke;
    }
    return undefined;
  };

  handlePointerMove = (event: PointerEvent): void => {
    const { currentToolInstance, layerManager, penColor, penSize, displayCanvasElement, requestRedraw } = this.context;
    
    if (!currentToolInstance || !layerManager) return;

    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement && (event.buttons === 1 || event.pointerType === 'touch' || event.pointerType === 'pen')) {
      let pressureValue: number | undefined;
      if (event.pressure === 0 && event.pointerType === 'pen') { // Specifically for pen, 0 pressure should be treated as minimal, not default
        pressureValue = 0;
      } else if (event.pressure === 0.5 && event.pointerType !== 'pen') { // Non-pen (mouse/touch) with default 0.5 pressure
        pressureValue = undefined; // Will default to 1.0 in normalizePressure, as intended for mouse/touch
      } else {
        pressureValue = event.pressure;
      }
      
      currentToolInstance.onPointerMove(event, activeLayer, penColor, penSize, pressureValue);
      requestRedraw();
    }
  };

  handlePointerUp = (event: PointerEvent, imageDataBeforeStroke?: string): void => {
    const { currentToolInstance, layerManager, historyManager, displayCanvasElement, updateExternalStatePartial, requestRedraw } = this.context;
    
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
        updateExternalStatePartial(false, false, true);
      }
      requestRedraw();
    }
  };
} 