import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createTempCanvas,
  createTempCanvasFromSource,
  createExportCanvas,
  createLayerBackup,
  resizeCanvasWithContent,
  clearCanvas,
  clearCanvasArea,
  copyCanvasContent,
  canvasToBlob,
  canvasToFile,
  type CanvasSize
} from './CanvasUtils';

// Mock canvas and context
const mockContext = {
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  scale: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
} as any as CanvasRenderingContext2D;

const mockCanvas = {
  width: 100,
  height: 100,
  getContext: vi.fn(() => mockContext),
  toBlob: vi.fn((callback) => callback(new Blob(['test'], { type: 'image/png' }))),
} as any as HTMLCanvasElement;

// Mock document.createElement
const mockCreateElement = vi.fn(() => mockCanvas);
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
});

describe('CanvasUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTempCanvas', () => {
    it('should create a canvas with specified dimensions', () => {
      const result = createTempCanvas(200, 150);
      
      expect(mockCreateElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.width).toBe(200);
      expect(mockCanvas.height).toBe(150);
      expect(result.canvas).toBe(mockCanvas);
      expect(result.context).toBe(mockContext);
    });

    it('should throw error if context cannot be obtained', () => {
      const failingCanvas = { ...mockCanvas, getContext: vi.fn(() => null) };
      mockCreateElement.mockReturnValueOnce(failingCanvas);
      
      expect(() => createTempCanvas(100, 100)).toThrow('Failed to get 2D context for temporary canvas');
    });
  });

  describe('createTempCanvasFromSource', () => {
    it('should create a canvas copy from source', () => {
      const sourceCanvas = { ...mockCanvas, width: 300, height: 200 } as HTMLCanvasElement;
      
      const result = createTempCanvasFromSource(sourceCanvas);
      
      expect(mockCanvas.width).toBe(300);
      expect(mockCanvas.height).toBe(200);
      expect(mockContext.drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0);
      expect(result.canvas).toBe(mockCanvas);
      expect(result.context).toBe(mockContext);
    });
  });

  describe('createExportCanvas', () => {
    it('should create export canvas with scaling and layer composition', () => {
      const layers = [mockCanvas, mockCanvas] as HTMLCanvasElement[];
      const currentSize: CanvasSize = { width: 100, height: 100 };
      const exportSize: CanvasSize = { width: 200, height: 300 };
      
      const result = createExportCanvas(layers, currentSize, exportSize);
      
      expect(mockCanvas.width).toBe(200);
      expect(mockCanvas.height).toBe(300);
      expect(mockContext.scale).toHaveBeenCalledWith(2, 3); // scaleX=2, scaleY=3
      expect(mockContext.drawImage).toHaveBeenCalledTimes(2); // One for each layer
      expect(result.canvas).toBe(mockCanvas);
      expect(result.context).toBe(mockContext);
    });
  });

  describe('createLayerBackup', () => {
    it('should create a backup of layer canvas', () => {
      const sourceCanvas = { ...mockCanvas, width: 150, height: 120 } as HTMLCanvasElement;
      
      const result = createLayerBackup(sourceCanvas);
      
      expect(result.canvas).toBe(mockCanvas);
      expect(result.context).toBe(mockContext);
      expect(result.width).toBe(150);
      expect(result.height).toBe(120);
      expect(mockContext.drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0);
    });
  });

  describe('resizeCanvasWithContent', () => {
    it('should resize canvas while preserving content', () => {
      const canvas = mockCanvas;
      const context = mockContext;
      const newSize: CanvasSize = { width: 300, height: 250 };
      
      resizeCanvasWithContent(canvas, context, newSize);
      
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(250);
      expect(mockContext.drawImage).toHaveBeenCalled();
    });
  });

  describe('clearCanvas', () => {
    it('should clear entire canvas', () => {
      const canvas = { ...mockCanvas, width: 200, height: 150 } as HTMLCanvasElement;
      const context = mockContext;
      
      clearCanvas(canvas, context);
      
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 200, 150);
    });
  });

  describe('clearCanvasArea', () => {
    it('should clear specified area of canvas', () => {
      clearCanvasArea(mockContext, 10, 20, 50, 60);
      
      expect(mockContext.clearRect).toHaveBeenCalledWith(10, 20, 50, 60);
    });
  });

  describe('copyCanvasContent', () => {
    it('should copy content from source to target', () => {
      const sourceCanvas = mockCanvas;
      const targetContext = mockContext;
      
      copyCanvasContent(sourceCanvas, targetContext, 10, 15);
      
      expect(mockContext.drawImage).toHaveBeenCalledWith(sourceCanvas, 10, 15);
    });

    it('should use default coordinates when not specified', () => {
      const sourceCanvas = mockCanvas;
      const targetContext = mockContext;
      
      copyCanvasContent(sourceCanvas, targetContext);
      
      expect(mockContext.drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0);
    });
  });

  describe('canvasToBlob', () => {
    it('should convert canvas to blob with default PNG format', async () => {
      const result = await canvasToBlob(mockCanvas);
      
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', undefined);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should convert canvas to blob with specified format and quality', async () => {
      const result = await canvasToBlob(mockCanvas, 'image/jpeg', 0.8);
      
      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8);
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('canvasToFile', () => {
    it('should convert canvas to file', async () => {
      const result = await canvasToFile(mockCanvas, 'test.png');
      
      expect(result).toBeInstanceOf(File);
      expect(result?.name).toBe('test.png');
      expect(result?.type).toBe('image/png');
    });

    it('should return null if blob creation fails', async () => {
      const failingCanvas = { 
        ...mockCanvas, 
        toBlob: vi.fn((callback) => callback(null))
      } as any as HTMLCanvasElement;
      
      const result = await canvasToFile(failingCanvas, 'test.png');
      
      expect(result).toBeNull();
    });
  });
}); 