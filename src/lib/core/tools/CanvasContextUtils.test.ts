import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  setupStrokeContext, 
  setupStrokeContextWithPosition, 
  createNewStrokeSegment,
  setCompositeOperation,
  resetCompositeOperation,
  type StrokeContextOptions 
} from './CanvasContextUtils';

// Mock canvas context
const createMockContext = () => ({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  strokeStyle: '#000000',
  lineWidth: 1,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
});

describe('CanvasContextUtils', () => {
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mockContext = createMockContext();
  });

  describe('setupStrokeContext', () => {
    it('should set up basic stroke context with default values', () => {
      const options: StrokeContextOptions = {
        lineWidth: 5
      };

      setupStrokeContext(mockContext as any, options);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.lineWidth).toBe(5);
      expect(mockContext.lineCap).toBe('round');
      expect(mockContext.lineJoin).toBe('round');
    });

    it('should set up stroke context with custom values', () => {
      const options: StrokeContextOptions = {
        color: '#ff0000',
        lineWidth: 10,
        lineCap: 'square',
        lineJoin: 'bevel'
      };

      setupStrokeContext(mockContext as any, options);

      expect(mockContext.strokeStyle).toBe('#ff0000');
      expect(mockContext.lineWidth).toBe(10);
      expect(mockContext.lineCap).toBe('square');
      expect(mockContext.lineJoin).toBe('bevel');
    });

    it('should handle missing lineWidth with default value', () => {
      const options: StrokeContextOptions = {
        color: '#00ff00'
      };

      setupStrokeContext(mockContext as any, options);

      expect(mockContext.lineWidth).toBe(1);
      expect(mockContext.strokeStyle).toBe('#00ff00');
    });
  });

  describe('setupStrokeContextWithPosition', () => {
    it('should set up context and move to position', () => {
      const options: StrokeContextOptions = {
        color: '#0000ff',
        lineWidth: 3
      };

      setupStrokeContextWithPosition(mockContext as any, options, 10, 20);

      expect(mockContext.strokeStyle).toBe('#0000ff');
      expect(mockContext.lineWidth).toBe(3);
      expect(mockContext.moveTo).toHaveBeenCalledWith(10, 20);
    });
  });

  describe('createNewStrokeSegment', () => {
    it('should create new stroke segment with updated properties', () => {
      const options: StrokeContextOptions = {
        lineWidth: 8
      };

      createNewStrokeSegment(mockContext as any, options, 5, 10, 15, 25);

      expect(mockContext.stroke).toHaveBeenCalled();
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.lineWidth).toBe(8);
      expect(mockContext.moveTo).toHaveBeenCalledWith(5, 10);
      expect(mockContext.lineTo).toHaveBeenCalledWith(15, 25);
    });
  });

  describe('setCompositeOperation', () => {
    it('should set globalCompositeOperation to source-over', () => {
      setCompositeOperation(mockContext as any, 'source-over');
      expect(mockContext.globalCompositeOperation).toBe('source-over');
    });

    it('should set globalCompositeOperation to destination-out', () => {
      setCompositeOperation(mockContext as any, 'destination-out');
      expect(mockContext.globalCompositeOperation).toBe('destination-out');
    });
  });

  describe('resetCompositeOperation', () => {
    it('should reset globalCompositeOperation to source-over', () => {
      // First set it to something else
      mockContext.globalCompositeOperation = 'destination-out' as GlobalCompositeOperation;
      
      resetCompositeOperation(mockContext as any);
      
      expect(mockContext.globalCompositeOperation).toBe('source-over');
    });
  });
}); 