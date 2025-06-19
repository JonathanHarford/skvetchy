import type { ILayer } from '../LayerManager';
import type { ITool } from './ITool';
import { processPressureInitial, processPressureWithSmoothing, hasSignificantPressureChange, type PressureState } from './PressureUtils';
import { setupStrokeContextWithPosition, createNewStrokeSegment, setCompositeOperation } from './CanvasContextUtils';

export class PenTool implements ITool {
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  private pressureState: PressureState = { lastPressure: 0 };

  activate(context: CanvasRenderingContext2D): void {
    setCompositeOperation(context, 'source-over');
  }

  deactivate(context: CanvasRenderingContext2D): void {
    // No specific deactivation needed for pen tool
  }

  onPointerDown(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void {
    if (event.button !== 0) return;
    this.drawing = true;

    // Process pressure using shared utility
    const currentPressure = processPressureInitial(pressure);
    this.pressureState.lastPressure = currentPressure;

    // Setup canvas context using shared utility
    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    setupStrokeContextWithPosition(activeLayer.context, {
      color,
      lineWidth: penSize * currentPressure
    }, this.lastX, this.lastY);
  }

  onPointerMove(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void {
    if (!this.drawing) return;

    // Process pressure using shared utility
    const currentPressure = processPressureWithSmoothing(pressure, this.pressureState);
    
    // If pressure has changed significantly, start a new path segment
    if (hasSignificantPressureChange(currentPressure, this.pressureState.lastPressure)) {
      createNewStrokeSegment(activeLayer.context, {
        color,
        lineWidth: penSize * currentPressure
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
    if (!this.drawing) return;
    this.drawing = false;
    this.pressureState.lastPressure = 0; // Reset pressure tracking
  }
}
