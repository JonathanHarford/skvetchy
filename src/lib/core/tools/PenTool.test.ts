import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PenTool } from './PenTool';
import type { ILayer } from '../LayerManager';

// Mock canvas context
const createMockContext = () => ({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  strokeStyle: '#000000',
  lineWidth: 1,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
});

// Mock layer
const createMockLayer = (): ILayer => ({
  id: 'test-layer',
  name: 'Test Layer',
  isVisible: true,
  zIndex: 0,
  canvas: {} as HTMLCanvasElement,
  context: createMockContext() as any as CanvasRenderingContext2D,
});

describe('PenTool', () => {
  let penTool: PenTool;
  let mockLayer: ILayer;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    penTool = new PenTool();
    mockLayer = createMockLayer();
    mockContext = mockLayer.context as any;
  });

  it('should handle pressure changes by creating separate path segments', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;
    const mockEvent3 = { button: 0, offsetX: 30, offsetY: 30 } as PointerEvent;

    // Start drawing with low pressure
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.5);
    
    expect(mockContext.beginPath).toHaveBeenCalledTimes(1);
    expect(mockContext.lineWidth).toBe(5); // 10 * 0.5
    expect(mockContext.moveTo).toHaveBeenCalledWith(10, 10);

    // Move with same pressure - should not create new path
    penTool.onPointerMove(mockEvent2, mockLayer, '#000000', 10, 0.5);
    
    expect(mockContext.beginPath).toHaveBeenCalledTimes(1); // Still only 1
    expect(mockContext.lineTo).toHaveBeenCalledWith(20, 20);
    expect(mockContext.stroke).toHaveBeenCalledTimes(1);

    // Move with significantly different pressure - should create new path segment
    // Note: Due to pressure smoothing, jumping from 0.5 to 1.0 will be limited to 0.5 + 0.3 = 0.8
    penTool.onPointerMove(mockEvent3, mockLayer, '#000000', 10, 1.0);
    
    expect(mockContext.beginPath).toHaveBeenCalledTimes(2); // New path started
    expect(mockContext.lineWidth).toBe(8); // 10 * 0.8 (smoothed from 0.5 to 0.8)
    expect(mockContext.moveTo).toHaveBeenCalledWith(20, 20); // Starts from last position
    expect(mockContext.lineTo).toHaveBeenCalledWith(30, 30);
    expect(mockContext.stroke).toHaveBeenCalledTimes(3); // Once to finish old path, once for new path
  });

  it('should not create new path segments for small pressure changes', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;

    // Start drawing
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.5);
    
    // Move with slightly different pressure (within threshold)
    penTool.onPointerMove(mockEvent2, mockLayer, '#000000', 10, 0.52);
    
    expect(mockContext.beginPath).toHaveBeenCalledTimes(1); // Should not create new path
  });

  it('should reset pressure tracking on pointer up', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;

    // Start and end a stroke
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.5);
    penTool.onPointerUp(mockEvent1, mockLayer);

    // Start a new stroke with different pressure - should not be affected by previous pressure
    penTool.onPointerDown(mockEvent2, mockLayer, '#000000', 10, 1.0);
    
    expect(mockContext.lineWidth).toBe(10); // Should use new pressure, not be affected by previous
  });

  it('should handle missing pressure by defaulting to 1.0', () => {
    const mockEvent = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;

    penTool.onPointerDown(mockEvent, mockLayer, '#000000', 10);
    
    expect(mockContext.lineWidth).toBe(10); // 10 * 1.0 (default)
  });

  it('should clamp pressure values to reasonable bounds', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;
    const mockEvent3 = { button: 0, offsetX: 30, offsetY: 30 } as PointerEvent;

    // Test pressure below minimum (should be clamped to 0.1)
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.05);
    expect(mockContext.lineWidth).toBe(1); // 10 * 0.1 (clamped minimum)

    // Test pressure above maximum (should be clamped to 1.0)
    penTool.onPointerUp(mockEvent1, mockLayer);
    penTool.onPointerDown(mockEvent2, mockLayer, '#000000', 10, 1.5);
    expect(mockContext.lineWidth).toBe(10); // 10 * 1.0 (clamped maximum)

    // Test negative pressure (should be clamped to 0.1)
    penTool.onPointerUp(mockEvent2, mockLayer);
    penTool.onPointerDown(mockEvent3, mockLayer, '#000000', 10, -0.2);
    expect(mockContext.lineWidth).toBe(1); // 10 * 0.1 (clamped minimum)
  });

  it('should smooth large pressure transitions to prevent glitches', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;

    // Start with low pressure
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.2);
    expect(mockContext.lineWidth).toBe(2); // 10 * 0.2

    // Try to jump to very high pressure - should be limited
    penTool.onPointerMove(mockEvent2, mockLayer, '#000000', 10, 1.0);
    
    // The pressure change should be limited to 0.3 per frame
    // So from 0.2, it should go to 0.5 (0.2 + 0.3)
    expect(mockContext.lineWidth).toBe(5); // 10 * 0.5 (smoothed)
  });
}); 