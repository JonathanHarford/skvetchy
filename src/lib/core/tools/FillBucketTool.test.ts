import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FillBucketTool } from './FillBucketTool';
import type { ILayer } from '../LayerManager';

// Mock canvas context
const createMockContext = () => ({
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  getImageData: vi.fn(),
  putImageData: vi.fn(),
});

// Mock canvas
const createMockCanvas = () => ({
  width: 100,
  height: 100,
});

// Mock layer
const createMockLayer = (): ILayer => ({
  id: 'test-layer',
  name: 'Test Layer',
  isVisible: true,
  zIndex: 0,
  canvas: createMockCanvas() as any as HTMLCanvasElement,
  context: createMockContext() as any as CanvasRenderingContext2D,
});

describe('FillBucketTool', () => {
  let fillBucketTool: FillBucketTool;
  let mockLayer: ILayer;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    fillBucketTool = new FillBucketTool();
    mockLayer = createMockLayer();
    mockContext = mockLayer.context as any;
  });

  it('should set globalCompositeOperation to source-over on activate', () => {
    const context = createMockContext() as any as CanvasRenderingContext2D;
    fillBucketTool.activate(context);
    expect(context.globalCompositeOperation).toBe('source-over');
  });

  it('should perform flood fill on pointer down', () => {
    const mockEvent = { button: 0, offsetX: 50, offsetY: 50 } as PointerEvent;
    
    // Mock image data
    const imageData = {
      data: new Uint8ClampedArray(100 * 100 * 4), // 100x100 canvas, 4 bytes per pixel
      width: 100,
      height: 100
    };
    
    // Fill with white pixels initially
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255;     // R
      imageData.data[i + 1] = 255; // G
      imageData.data[i + 2] = 255; // B
      imageData.data[i + 3] = 255; // A
    }
    
    mockContext.getImageData.mockReturnValue(imageData);

    fillBucketTool.onPointerDown(mockEvent, mockLayer, '#ff0000', 10);
    
    expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    expect(mockContext.putImageData).toHaveBeenCalledWith(imageData, 0, 0);
    expect(mockLayer.context.globalCompositeOperation).toBe('source-over');
  });

  it('should not perform flood fill if target color matches fill color', () => {
    const mockEvent = { button: 0, offsetX: 50, offsetY: 50 } as PointerEvent;
    
    // Mock image data with red pixels (same as fill color)
    const imageData = {
      data: new Uint8ClampedArray(100 * 100 * 4),
      width: 100,
      height: 100
    };
    
    // Fill with red pixels initially
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255;     // R
      imageData.data[i + 1] = 0;   // G
      imageData.data[i + 2] = 0;   // B
      imageData.data[i + 3] = 255; // A
    }
    
    mockContext.getImageData.mockReturnValue(imageData);

    fillBucketTool.onPointerDown(mockEvent, mockLayer, '#ff0000', 10);
    
    expect(mockContext.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
    // putImageData should not be called if colors match
    expect(mockContext.putImageData).not.toHaveBeenCalled();
  });

  it('should ignore non-primary button clicks', () => {
    const mockEvent = { button: 1, offsetX: 50, offsetY: 50 } as PointerEvent; // Right click
    
    fillBucketTool.onPointerDown(mockEvent, mockLayer, '#ff0000', 10);
    
    expect(mockContext.getImageData).not.toHaveBeenCalled();
  });

  it('should handle pointer up correctly', () => {
    const mockEvent = { button: 0, offsetX: 50, offsetY: 50 } as PointerEvent;
    
    // Should not throw any errors
    expect(() => {
      fillBucketTool.onPointerUp(mockEvent, mockLayer);
    }).not.toThrow();
  });

  it('should not do anything on pointer move', () => {
    const mockEvent = { button: 0, offsetX: 50, offsetY: 50 } as PointerEvent;
    
    // Should not throw any errors and not call any context methods
    expect(() => {
      fillBucketTool.onPointerMove(mockEvent, mockLayer, '#ff0000', 10);
    }).not.toThrow();
    
    expect(mockContext.getImageData).not.toHaveBeenCalled();
    expect(mockContext.putImageData).not.toHaveBeenCalled();
  });
}); 