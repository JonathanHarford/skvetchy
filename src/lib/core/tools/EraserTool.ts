import type { ILayer } from '../LayerManager';
import type { ITool } from './ITool';

export class EraserTool implements ITool {
  private erasing = false;
  private lastX = 0;
  private lastY = 0;
  private lastPressure = 0; // Track last pressure to detect changes

  activate(context: CanvasRenderingContext2D): void {
    context.globalCompositeOperation = 'destination-out';
  }

  deactivate(context: CanvasRenderingContext2D): void {
    context.globalCompositeOperation = 'source-over';
  }

  onPointerDown(event: PointerEvent, activeLayer: ILayer, _color: string, penSize: number, pressure?: number): void {
    if (event.button !== 0) return;
    this.erasing = true;

    // globalCompositeOperation is set by activate method when tool is selected
    // activeLayer.context.globalCompositeOperation = 'destination-out'; // No longer needed here

    const currentPressure = pressure || 1.0;
    this.lastPressure = currentPressure;

    activeLayer.context.beginPath();
    activeLayer.context.lineWidth = penSize * currentPressure;
    activeLayer.context.lineCap = 'round';
    activeLayer.context.lineJoin = 'round';

    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    activeLayer.context.moveTo(this.lastX, this.lastY);
  }

  onPointerMove(event: PointerEvent, activeLayer: ILayer, _color: string, penSize: number, pressure?: number): void {
    if (!this.erasing) return;

    const currentPressure = pressure || 1.0;
    
    // If pressure has changed significantly, start a new path segment
    if (Math.abs(currentPressure - this.lastPressure) > 0.05) {
      activeLayer.context.lineTo(event.offsetX, event.offsetY);
      activeLayer.context.stroke();
      
      activeLayer.context.beginPath();
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
    if (!this.erasing) return;
    this.erasing = false;
    this.lastPressure = 0; // Reset pressure tracking

    // globalCompositeOperation is reset by deactivate method when tool is unselected
    // activeLayer.context.globalCompositeOperation = 'source-over'; // No longer needed here
  }
}
