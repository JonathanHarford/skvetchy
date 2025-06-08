import type { ILayer } from '../LayerManager';

export interface ITool {
  onPointerDown(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void;
  onPointerMove(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void;
  onPointerUp(event: PointerEvent, activeLayer: ILayer): void;
  // Add activate and deactivate methods for tools that need to set up or clean up canvas context state
  activate?(context: CanvasRenderingContext2D): void;
  deactivate?(context: CanvasRenderingContext2D): void;
}
