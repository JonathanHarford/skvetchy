import type { ILayer } from '../LayerManager';
import type { ITool } from './ITool'; // Changed import

export class PenTool implements ITool {
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  private lastPressure = 0; // Track last pressure to detect changes

  activate(context: CanvasRenderingContext2D): void {
    context.globalCompositeOperation = 'source-over';
  }

  deactivate(context: CanvasRenderingContext2D): void {
    // No specific deactivation needed for pen tool regarding globalCompositeOperation
  }

  onPointerDown(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void {
    if (event.button !== 0) return;
    this.drawing = true;

    // Ensure correct composite operation when this tool becomes active
    activeLayer.context.globalCompositeOperation = 'source-over';

    const currentPressure = pressure || 1.0;
    this.lastPressure = currentPressure;

    activeLayer.context.beginPath();
    activeLayer.context.strokeStyle = color;
    activeLayer.context.lineWidth = penSize * currentPressure;
    activeLayer.context.lineCap = 'round';
    activeLayer.context.lineJoin = 'round';

    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    activeLayer.context.moveTo(this.lastX, this.lastY);
  }

  onPointerMove(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void {
    if (!this.drawing) return;

    const currentPressure = pressure || 1.0;
    
    // If pressure has changed significantly, start a new path segment
    if (Math.abs(currentPressure - this.lastPressure) > 0.05) {
      // Finish the current path segment
      activeLayer.context.lineTo(event.offsetX, event.offsetY);
      activeLayer.context.stroke();
      
      // Start a new path segment with the new pressure
      activeLayer.context.beginPath();
      activeLayer.context.strokeStyle = color;
      activeLayer.context.lineWidth = penSize * currentPressure;
      activeLayer.context.lineCap = 'round';
      activeLayer.context.lineJoin = 'round';
      activeLayer.context.moveTo(this.lastX, this.lastY);
      
      this.lastPressure = currentPressure;
    }

    activeLayer.context.lineTo(event.offsetX, event.offsetY);
    activeLayer.context.stroke();

    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
  }

  onPointerUp(event: PointerEvent, activeLayer: ILayer): void {
    if (event.button !== 0) return;
    if (!this.drawing) return; // Ensure up corresponds to a down from this tool
    this.drawing = false;
    this.lastPressure = 0; // Reset pressure tracking
    // activeLayer.context.closePath(); // Not strictly necessary for pen strokes

    // globalCompositeOperation should already be source-over
    // No need to restore globalCompositeOperation here as PenTool always uses source-over
    // and activate ensures it's set.
  }
}
