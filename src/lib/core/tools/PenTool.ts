import type { ILayer } from '../LayerManager';
import type { ITool } from './ITool';

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

    // Improved pressure handling with bounds checking and validation
    let currentPressure = pressure || 1.0;
    
    // Clamp pressure to reasonable bounds (Apple Pencil can sometimes report values outside 0-1)
    currentPressure = Math.max(0.1, Math.min(1.0, currentPressure));
    
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

    // Improved pressure handling with bounds checking and smoothing
    let currentPressure = pressure || 1.0;
    
    // Clamp pressure to reasonable bounds
    currentPressure = Math.max(0.1, Math.min(1.0, currentPressure));
    
    // Smooth pressure transitions to prevent jarring changes
    // If pressure change is very large (>0.3), limit the change per frame
    const pressureDiff = currentPressure - this.lastPressure;
    if (Math.abs(pressureDiff) > 0.3) {
      // Limit pressure change to prevent sudden jumps
      currentPressure = this.lastPressure + (pressureDiff > 0 ? 0.3 : -0.3);
    }
    
    // If pressure has changed significantly, start a new path segment
    if (Math.abs(currentPressure - this.lastPressure) > 0.05) {
      activeLayer.context.lineTo(event.offsetX, event.offsetY);
      activeLayer.context.stroke();
      
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
