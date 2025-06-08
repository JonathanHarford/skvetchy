import type { ILayer } from '../LayerManager';
import type { ITool } from './ITool'; // Changed import

export class EraserTool implements ITool {
  private erasing = false;
  private lastX = 0;
  private lastY = 0;

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

    activeLayer.context.beginPath();
    activeLayer.context.lineWidth = pressure ? penSize * pressure : penSize;
    activeLayer.context.lineCap = 'round';
    activeLayer.context.lineJoin = 'round';

    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
    activeLayer.context.moveTo(this.lastX, this.lastY);
  }

  onPointerMove(event: PointerEvent, activeLayer: ILayer, _color: string, penSize: number, pressure?: number): void {
    if (!this.erasing) return;

    // globalCompositeOperation should be 'destination-out'
    activeLayer.context.lineWidth = pressure ? penSize * pressure : penSize;

    activeLayer.context.lineTo(event.offsetX, event.offsetY);
    activeLayer.context.stroke();

    this.lastX = event.offsetX;
    this.lastY = event.offsetY;
  }

  onPointerUp(event: PointerEvent, activeLayer: ILayer): void {
    if (event.button !== 0) return;
    if (!this.erasing) return;
    this.erasing = false;

    // globalCompositeOperation is reset by deactivate method when tool is unselected
    // activeLayer.context.globalCompositeOperation = 'source-over'; // No longer needed here
  }
}
