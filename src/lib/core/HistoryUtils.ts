export function captureCanvasImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function restoreCanvasImageData(canvas: HTMLCanvasElement, imageData: ImageData): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.putImageData(imageData, 0, 0);
}

export function compressImageData(imageData: ImageData): Uint8Array {
  // Simple compression - store only non-transparent pixels with coordinates
  const compressed: number[] = [];
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Non-transparent pixel
      const pixelIndex = i / 4;
      const x = pixelIndex % imageData.width;
      const y = Math.floor(pixelIndex / imageData.width);
      compressed.push(x, y, data[i], data[i + 1], data[i + 2], data[i + 3]);
    }
  }
  
  return new Uint8Array(compressed);
}

export function decompressImageData(compressed: Uint8Array, width: number, height: number): ImageData {
  const imageData = new ImageData(width, height);
  const data = imageData.data;
  
  // Initialize all pixels as transparent
  data.fill(0);
  
  // Restore non-transparent pixels
  for (let i = 0; i < compressed.length; i += 6) {
    const x = compressed[i];
    const y = compressed[i + 1];
    const r = compressed[i + 2];
    const g = compressed[i + 3];
    const b = compressed[i + 4];
    const a = compressed[i + 5];
    
    const pixelIndex = (y * width + x) * 4;
    data[pixelIndex] = r;
    data[pixelIndex + 1] = g;
    data[pixelIndex + 2] = b;
    data[pixelIndex + 3] = a;
  }
  
  return imageData;
} 