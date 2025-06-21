import type { ILayer } from '../LayerManager';
import type { ITool } from './ITool';
import { processPressureInitial, processPressureWithSmoothing, hasSignificantPressureChange, calculatePressureLineWidth, type PressureState } from './PressureUtils';
import { setupStrokeContextWithPosition, createNewStrokeSegment, setCompositeOperation, resetCompositeOperation } from './CanvasContextUtils';

export class EraserTool implements ITool {
  private erasing = false;
  private lastX = 0;
  private lastY = 0;
  private pressureState: PressureState = { lastPressure: 0 };

  activate(context: CanvasRenderingContext2D): void {
    setCompositeOperation(context, 'destination-out');
  }

  deactivate(context: CanvasRenderingContext2D): void {
    resetCompositeOperation(context);
  }

  onPointerDown(event: PointerEvent, activeLayer: ILayer, _color: string, penSize: number, pressure?: number): void {
    if (event.button !== 0) return;
    this.erasing = true;

    // Process pressure using shared utility
    const currentPressure = processPressureInitial(pressure);
    this.pressureState.lastPressure = currentPressure;

    // Setup canvas context using shared utility (no color needed for eraser)
    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    setupStrokeContextWithPosition(activeLayer.context, {
      lineWidth: calculatePressureLineWidth(currentPressure, penSize)
    }, this.lastX, this.lastY);
  }

  onPointerMove(event: PointerEvent, activeLayer: ILayer, _color: string, penSize: number, pressure?: number): void {
    if (!this.erasing) return;

    // Process pressure using shared utility
    const currentPressure = processPressureWithSmoothing(pressure, this.pressureState);
    
    // If pressure has changed significantly, start a new path segment
    if (hasSignificantPressureChange(currentPressure, this.pressureState.lastPressure)) {
      createNewStrokeSegment(activeLayer.context, {
        lineWidth: calculatePressureLineWidth(currentPressure, penSize)
      }, this.lastX, this.lastY, event.offsetX, event.offsetY);
      
      this.pressureState.lastPressure = currentPressure;
    }

    activeLayer.context.lineTo(event.offsetX, event.offsetY);
    activeLayer.context.stroke();

    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
  }

  onPointerUp(event: PointerEvent, activeLayer: ILayer): void {
    if (event.button !== 0) return;
    if (!this.erasing) return;
    this.erasing = false;
    this.pressureState.lastPressure = 0; // Reset pressure tracking
  }
}
