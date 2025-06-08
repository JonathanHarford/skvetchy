import type { ILayer } from '../LayerManager';

export interface ITool {
  onPointerDown(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number): void;
  onPointerMove(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number): void;
  onPointerUp(event: PointerEvent, activeLayer: ILayer): void;
  // onPointerEnter and onPointerLeave might be needed for cursor changes
}

export class PenTool implements ITool {
  private drawing = false;
  private lastX = 0;
  private lastY = 0;

  onPointerDown(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number): void {
    if (event.button !== 0) return; // Only main button (left-click or touch)
    this.drawing = true;
    activeLayer.context.beginPath();
    activeLayer.context.strokeStyle = color;
    activeLayer.context.lineWidth = penSize;
    activeLayer.context.lineCap = 'round';
    activeLayer.context.lineJoin = 'round';

    // Adjust for canvas offset if any, and use offsetX/offsetY for simplicity here
    // A more robust solution would calculate relative to the canvas element precisely
    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    activeLayer.context.moveTo(this.lastX, this.lastY);
  }

  onPointerMove(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number): void {
    if (!this.drawing) return;

    // Update style in case it changed mid-draw (e.g. pressure)
    activeLayer.context.strokeStyle = color;
    activeLayer.context.lineWidth = penSize;

    activeLayer.context.lineTo(event.offsetX, event.offsetY);
    activeLayer.context.stroke();

    // Update lastX/lastY for the next segment
    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    // For smoother lines, might need to re-beginPath() here or use a more complex path drawing
  }

  onPointerUp(event: PointerEvent, activeLayer: ILayer): void {
    if (event.button !== 0) return;
    this.drawing = false;
    activeLayer.context.closePath();
    // TODO: Add this drawing action to the history stack for undo/redo
  }
}
