import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PenTool } from './PenTool';
import type { ILayer } from '../LayerManager';

// Mock the PressureUtils module
vi.mock('./PressureUtils', () => ({
  processPressureInitial: vi.fn((pressure?: number) => pressure || 1.0),
  processPressureWithSmoothing: vi.fn((pressure?: number) => pressure || 1.0),
  hasSignificantPressureChange: vi.fn((current: number, last: number) => Math.abs(current - last) > 0.05),
  calculatePressureLineWidth: vi.fn((pressure: number, brushSize: number) => {
    // Mock the new pressure calculation: 1px minimum, full brush size maximum
    if (brushSize <= 1) return 1;
    const minPressure = 0.1;
    const maxPressure = 1.0;
    const normalizedPressure = (pressure - minPressure) / (maxPressure - minPressure);
    return 1 + normalizedPressure * (brushSize - 1);
  })
}));

// Mock the CanvasContextUtils module
vi.mock('./CanvasContextUtils', () => ({
  setupStrokeContextWithPosition: vi.fn(),
  createNewStrokeSegment: vi.fn(),
  setCompositeOperation: vi.fn()
}));

// Import the mocked functions after the mock is set up
import { setupStrokeContextWithPosition, createNewStrokeSegment, setCompositeOperation } from './CanvasContextUtils';

const mockSetupStrokeContextWithPosition = setupStrokeContextWithPosition as any;
const mockCreateNewStrokeSegment = createNewStrokeSegment as any;
const mockSetCompositeOperation = setCompositeOperation as any;

function createMockContext() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 1,
    strokeStyle: '#000000'
  };
}

function createMockLayer(): ILayer {
  return {
    id: 'test-layer',
    name: 'Test Layer',
    isVisible: true,
    zIndex: 0,
    canvas: {} as HTMLCanvasElement,
    context: createMockContext() as any
  };
}

describe('PenTool', () => {
  let penTool: PenTool;
  let mockLayer: ILayer;
  let mockContext: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    penTool = new PenTool();
    mockLayer = createMockLayer();
    mockContext = mockLayer.context as any;
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  it('should handle pressure changes by creating separate path segments', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;
    const mockEvent3 = { button: 0, offsetX: 30, offsetY: 30 } as PointerEvent;

    // Start drawing with low pressure
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.5);
    
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledTimes(1);
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledWith(
      mockContext,
      { color: '#000000', lineWidth: 5 }, // 0.5 pressure on 10px brush = 5px
      10,
      10
    );

    // Move with same pressure - should not create new path
    penTool.onPointerMove(mockEvent2, mockLayer, '#000000', 10, 0.5);
    
    expect(mockCreateNewStrokeSegment).toHaveBeenCalledTimes(0); // No new segment
    expect(mockContext.lineTo).toHaveBeenCalledWith(20, 20);
    expect(mockContext.stroke).toHaveBeenCalledTimes(1);

    // Move with significantly different pressure - should create new path segment
    penTool.onPointerMove(mockEvent3, mockLayer, '#000000', 10, 1.0);
    
    expect(mockCreateNewStrokeSegment).toHaveBeenCalledTimes(1); // New segment created
    expect(mockCreateNewStrokeSegment).toHaveBeenCalledWith(
      mockContext,
      { color: '#000000', lineWidth: 10 }, // 1.0 pressure on 10px brush = 10px
      20,
      20,
      30,
      30
    );
  });

  it('should not create new path segments for small pressure changes', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;

    // Start drawing
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.5);
    
    // Move with slightly different pressure (within threshold)
    penTool.onPointerMove(mockEvent2, mockLayer, '#000000', 10, 0.52);
    
    expect(mockCreateNewStrokeSegment).toHaveBeenCalledTimes(0); // Should not create new segment
  });

  it('should reset pressure tracking on pointer up', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;

    // Start and end a stroke
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.5);
    penTool.onPointerUp(mockEvent1, mockLayer);

    // Start a new stroke with different pressure - should not be affected by previous pressure
    penTool.onPointerDown(mockEvent2, mockLayer, '#000000', 10, 1.0);
    
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledTimes(2);
    expect(mockSetupStrokeContextWithPosition).toHaveBeenLastCalledWith(
      mockContext,
      { color: '#000000', lineWidth: 10 }, // 1.0 pressure on 10px brush = 10px
      20,
      20
    );
  });

  it('should handle missing pressure by defaulting to 1.0', () => {
    const mockEvent = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;

    penTool.onPointerDown(mockEvent, mockLayer, '#000000', 10);
    
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledWith(
      mockContext,
      { color: '#000000', lineWidth: 10 }, // 1.0 pressure on 10px brush = 10px
      10,
      10
    );
  });

  it('should use new pressure calculation where minimum pressure gives 1px', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;
    const mockEvent3 = { button: 0, offsetX: 30, offsetY: 30 } as PointerEvent;

    // Test minimum pressure (0.1) gives 1px regardless of brush size
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.1);
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledWith(
      mockContext,
      { color: '#000000', lineWidth: 1 },
      10,
      10
    );

    // Test maximum pressure (1.0) gives full brush size
    penTool.onPointerUp(mockEvent1, mockLayer);
    penTool.onPointerDown(mockEvent2, mockLayer, '#000000', 20, 1.0);
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledWith(
      mockContext,
      { color: '#000000', lineWidth: 20 },
      20,
      20
    );

    // Test with larger brush size - minimum pressure still gives 1px
    penTool.onPointerUp(mockEvent2, mockLayer);
    penTool.onPointerDown(mockEvent3, mockLayer, '#000000', 50, 0.1);
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledWith(
      mockContext,
      { color: '#000000', lineWidth: 1 },
      30,
      30
    );
  });

  it('should interpolate pressure correctly with new calculation', () => {
    const mockEvent1 = { button: 0, offsetX: 10, offsetY: 10 } as PointerEvent;
    const mockEvent2 = { button: 0, offsetX: 20, offsetY: 20 } as PointerEvent;

    // Test middle pressure (0.55) on 10px brush
    // Formula: 1 + (0.55 - 0.1) / (1.0 - 0.1) * (10 - 1) = 1 + 0.45/0.9 * 9 = 5.5px
    penTool.onPointerDown(mockEvent1, mockLayer, '#000000', 10, 0.55);
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledWith(
      mockContext,
      expect.objectContaining({
        color: '#000000',
        lineWidth: expect.closeTo(5.5, 5)
      }),
      10,
      10
    );

    // Test middle pressure (0.55) on 20px brush
    // Formula: 1 + (0.55 - 0.1) / (1.0 - 0.1) * (20 - 1) = 1 + 0.45/0.9 * 19 = 10.5px
    penTool.onPointerUp(mockEvent1, mockLayer);
    penTool.onPointerDown(mockEvent2, mockLayer, '#000000', 20, 0.55);
    expect(mockSetupStrokeContextWithPosition).toHaveBeenCalledWith(
      mockContext,
      expect.objectContaining({
        color: '#000000',
        lineWidth: expect.closeTo(10.5, 5)
      }),
      20,
      20
    );
  });
}); 