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

  private async floodFill(layer: ILayer, startX: number, startY: number, fillColor: string): Promise<void> {
    const canvas = layer.canvas;
    const ctx = layer.context;
    
    // For small areas, use synchronous fill
    if (canvas.width * canvas.height < 100000) {
      this.floodFillScanline(layer, startX, startY, fillColor);
      return;
    }
    
    // For large areas, use Web Worker
    return this.floodFillOptimized(layer, startX, startY, fillColor);
  }

  private floodFillOptimized(layer: ILayer, startX: number, startY: number, fillColor: string): Promise<void> {
    const canvas = layer.canvas;
    const ctx = layer.context;
    
    return new Promise((resolve) => {
      const worker = new Worker(new URL('./FloodFillWorker.ts', import.meta.url));
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      worker.postMessage({
        imageData: imageData,
        startX, startY, fillColor,
        width: canvas.width,
        height: canvas.height
      });
      
      worker.onmessage = (e) => {
        ctx.putImageData(e.data.imageData, 0, 0);
        worker.terminate();
        resolve();
      };
    });
  }

  private floodFillScanline(layer: ILayer, startX: number, startY: number, fillColor: string): void {
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
    
    // Scanline flood fill algorithm - more efficient than stack-based
    const stack: Array<[number, number]> = [[Math.floor(startX), Math.floor(startY)]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      
      // Check bounds
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      const index = (y * canvas.width + x) * 4;
      
      // Check if this pixel matches the target color
      if (data[index] !== targetR || data[index + 1] !== targetG || 
          data[index + 2] !== targetB || data[index + 3] !== targetA) {
        continue;
      }
      
      // Find the extent of the scanline to the left and right
      let leftX = x;
      let rightX = x;
      
      // Extend left
      while (leftX > 0) {
        const leftIndex = (y * canvas.width + (leftX - 1)) * 4;
        if (data[leftIndex] === targetR && data[leftIndex + 1] === targetG && 
            data[leftIndex + 2] === targetB && data[leftIndex + 3] === targetA) {
          leftX--;
        } else {
          break;
        }
      }
      
      // Extend right
      while (rightX < canvas.width - 1) {
        const rightIndex = (y * canvas.width + (rightX + 1)) * 4;
        if (data[rightIndex] === targetR && data[rightIndex + 1] === targetG && 
            data[rightIndex + 2] === targetB && data[rightIndex + 3] === targetA) {
          rightX++;
        } else {
          break;
        }
      }
      
      // Fill the scanline
      for (let fillX = leftX; fillX <= rightX; fillX++) {
        const fillIndex = (y * canvas.width + fillX) * 4;
        data[fillIndex] = fillRGBA.r;
        data[fillIndex + 1] = fillRGBA.g;
        data[fillIndex + 2] = fillRGBA.b;
        data[fillIndex + 3] = fillRGBA.a;
      }
      
      // Check pixels above and below the scanline
      for (let checkX = leftX; checkX <= rightX; checkX++) {
        // Check above
        if (y > 0) {
          const aboveIndex = ((y - 1) * canvas.width + checkX) * 4;
          if (data[aboveIndex] === targetR && data[aboveIndex + 1] === targetG && 
              data[aboveIndex + 2] === targetB && data[aboveIndex + 3] === targetA) {
            stack.push([checkX, y - 1]);
          }
        }
        
        // Check below
        if (y < canvas.height - 1) {
          const belowIndex = ((y + 1) * canvas.width + checkX) * 4;
          if (data[belowIndex] === targetR && data[belowIndex + 1] === targetG && 
              data[belowIndex + 2] === targetB && data[belowIndex + 3] === targetA) {
            stack.push([checkX, y + 1]);
          }
        }
      }
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