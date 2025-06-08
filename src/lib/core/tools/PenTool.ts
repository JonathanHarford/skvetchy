import type { ILayer } from '../LayerManager';
import type { ITool } from './ITool'; // Changed import

export class PenTool implements ITool {
  private drawing = false;
  private lastX = 0;
  private lastY = 0;

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

    activeLayer.context.beginPath();
    activeLayer.context.strokeStyle = color;
    // Use pressure if available, otherwise fallback to penSize
    activeLayer.context.lineWidth = pressure ? penSize * pressure : penSize;
    activeLayer.context.lineCap = 'round';
    activeLayer.context.lineJoin = 'round';

    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    activeLayer.context.moveTo(this.lastX, this.lastY);
  }

  onPointerMove(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void {
    if (!this.drawing) return;

    activeLayer.context.strokeStyle = color;
    activeLayer.context.lineWidth = pressure ? penSize * pressure : penSize;

    activeLayer.context.lineTo(event.offsetX, event.offsetY);
    activeLayer.context.stroke();

    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
  }

  onPointerUp(event: PointerEvent, activeLayer: ILayer): void {
    if (event.button !== 0) return;
    if (!this.drawing) return; // Ensure up corresponds to a down from this tool
    this.drawing = false;
    // activeLayer.context.closePath(); // Not strictly necessary for pen strokes

    // globalCompositeOperation should already be source-over
    // No need to restore globalCompositeOperation here as PenTool always uses source-over
    // and activate ensures it's set.
  }
}
