import type { ILayer } from '../LayerManager';
import type { ITool } from './ITool';
import { setCompositeOperation } from './CanvasContextUtils';

export class FillBucketTool implements ITool {
  private filling = false;

  activate(context: CanvasRenderingContext2D): void {
    setCompositeOperation(context, 'source-over');
  }

  deactivate(context: CanvasRenderingContext2D): void {
    // No specific deactivation needed for fill bucket tool
  }

  onPointerDown(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void {
    if (event.button !== 0) return;
    this.filling = true;

    // Perform flood fill at the clicked position
    this.floodFill(activeLayer, event.offsetX, event.offsetY, color);
  }

  onPointerMove(event: PointerEvent, activeLayer: ILayer, color: string, penSize: number, pressure?: number): void {
    // Fill bucket doesn't need to handle pointer move
  }

  onPointerUp(event: PointerEvent, activeLayer: ILayer): void {
    if (event.button !== 0) return;
    this.filling = false;
  }

  private floodFill(layer: ILayer, startX: number, startY: number, fillColor: string): void {
    const canvas = layer.canvas;
    const ctx = layer.context;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert fill color to RGBA
    const fillRGBA = this.hexToRGBA(fillColor);
    
    // Get the color at the starting point
    const startIndex = (Math.floor(startY) * canvas.width + Math.floor(startX)) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];
    
    // If the target color is the same as fill color, do nothing
    if (targetR === fillRGBA.r && targetG === fillRGBA.g && 
        targetB === fillRGBA.b && targetA === fillRGBA.a) {
      return;
    }
    
    // Stack-based flood fill to avoid recursion stack overflow
    const stack: Array<[number, number]> = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Set<string>();
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      
      // Check bounds
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      // Check if already visited
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      
      const index = (y * canvas.width + x) * 4;
      
      // Check if this pixel matches the target color
      if (data[index] !== targetR || data[index + 1] !== targetG || 
          data[index + 2] !== targetB || data[index + 3] !== targetA) {
        continue;
      }
      
      // Fill this pixel
      data[index] = fillRGBA.r;
      data[index + 1] = fillRGBA.g;
      data[index + 2] = fillRGBA.b;
      data[index + 3] = fillRGBA.a;
      
      // Add neighboring pixels to stack
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
  }

  private hexToRGBA(hex: string): { r: number; g: number; b: number; a: number } {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Parse hex color
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const a = 255; // Full opacity
    
    return { r, g, b, a };
  }
} 