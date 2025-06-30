// Web Worker for flood fill operations
interface FloodFillMessage {
  imageData: ImageData;
  startX: number;
  startY: number;
  fillColor: string;
  width: number;
  height: number;
}

self.onmessage = function(e: MessageEvent<FloodFillMessage>) {
  const { imageData, startX, startY, fillColor, width, height } = e.data;
  
  // Perform scanline flood fill
  const result = floodFillScanline(imageData, startX, startY, fillColor, width, height);
  
  // Send result back
  self.postMessage({ imageData: result });
};

function floodFillScanline(imageData: ImageData, startX: number, startY: number, fillColor: string, width: number, height: number): ImageData {
  const data = imageData.data;
  
  // Convert fill color to RGBA
  const fillRGBA = hexToRGBA(fillColor);
  
  // Get the color at the starting point
  const startIndex = (Math.floor(startY) * width + Math.floor(startX)) * 4;
  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];
  
  // If the target color is the same as fill color, do nothing
  if (targetR === fillRGBA.r && targetG === fillRGBA.g && 
      targetB === fillRGBA.b && targetA === fillRGBA.a) {
    return imageData;
  }
  
  // Scanline flood fill algorithm - more efficient than stack-based
  const stack: Array<[number, number]> = [[Math.floor(startX), Math.floor(startY)]];
  
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    
    // Check bounds
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    
    const index = (y * width + x) * 4;
    
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
      const leftIndex = (y * width + (leftX - 1)) * 4;
      if (data[leftIndex] === targetR && data[leftIndex + 1] === targetG && 
          data[leftIndex + 2] === targetB && data[leftIndex + 3] === targetA) {
        leftX--;
      } else {
        break;
      }
    }
    
    // Extend right
    while (rightX < width - 1) {
      const rightIndex = (y * width + (rightX + 1)) * 4;
      if (data[rightIndex] === targetR && data[rightIndex + 1] === targetG && 
          data[rightIndex + 2] === targetB && data[rightIndex + 3] === targetA) {
        rightX++;
      } else {
        break;
      }
    }
    
    // Fill the scanline
    for (let fillX = leftX; fillX <= rightX; fillX++) {
      const fillIndex = (y * width + fillX) * 4;
      data[fillIndex] = fillRGBA.r;
      data[fillIndex + 1] = fillRGBA.g;
      data[fillIndex + 2] = fillRGBA.b;
      data[fillIndex + 3] = fillRGBA.a;
    }
    
    // Check pixels above and below the scanline
    for (let checkX = leftX; checkX <= rightX; checkX++) {
      // Check above
      if (y > 0) {
        const aboveIndex = ((y - 1) * width + checkX) * 4;
        if (data[aboveIndex] === targetR && data[aboveIndex + 1] === targetG && 
            data[aboveIndex + 2] === targetB && data[aboveIndex + 3] === targetA) {
          stack.push([checkX, y - 1]);
        }
      }
      
      // Check below
      if (y < height - 1) {
        const belowIndex = ((y + 1) * width + checkX) * 4;
        if (data[belowIndex] === targetR && data[belowIndex + 1] === targetG && 
            data[belowIndex + 2] === targetB && data[belowIndex + 3] === targetA) {
          stack.push([checkX, y + 1]);
        }
      }
    }
  }
  
  return imageData;
}

function hexToRGBA(hex: string): { r: number; g: number; b: number; a: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex color
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const a = 255; // Full opacity
  
  return { r, g, b, a };
} 