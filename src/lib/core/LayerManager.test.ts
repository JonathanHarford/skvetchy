import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LayerManager } from './LayerManager';

// Mock canvas and context creation
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => ({
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  })),
} as any as HTMLCanvasElement;

const mockCreateElement = vi.fn(() => mockCanvas);

// Mock document.createElement
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
});

describe('LayerManager', () => {
  let layerManager: LayerManager;

  beforeEach(() => {
    vi.clearAllMocks();
    layerManager = new LayerManager(800, 600);
  });

  describe('addLayer', () => {
    it('should add new layers directly above the currently selected layer', () => {
      // Initially, there should be one background layer
      expect(layerManager.getLayers()).toHaveLength(1);
      const backgroundLayer = layerManager.getLayers()[0];
      expect(backgroundLayer.name).toBe('Background');
      expect(backgroundLayer.zIndex).toBe(0);

      // Add a second layer - should go above background
      const layer1 = layerManager.addLayer('Layer 1', 800, 600);
      expect(layerManager.getLayers()).toHaveLength(2);
      expect(layer1.zIndex).toBe(1);
      expect(backgroundLayer.zIndex).toBe(0); // Background should stay at 0

      // Select the background layer and add a new layer
      layerManager.setActiveLayer(backgroundLayer.id);
      const layer2 = layerManager.addLayer('Layer 2', 800, 600);
      
      // Layer 2 should be inserted above background (zIndex 1)
      // and Layer 1 should be shifted up to zIndex 2
      const allLayers = layerManager.getLayers();
      expect(allLayers).toHaveLength(3);
      
      const updatedBackground = allLayers.find(l => l.id === backgroundLayer.id);
      const updatedLayer1 = allLayers.find(l => l.id === layer1.id);
      const newLayer2 = allLayers.find(l => l.id === layer2.id);

      expect(updatedBackground?.zIndex).toBe(0);
      expect(newLayer2?.zIndex).toBe(1); // Should be directly above background
      expect(updatedLayer1?.zIndex).toBe(2); // Should be shifted up
    });

    it('should maintain proper layer ordering when adding multiple layers', () => {
      const layers = layerManager.getLayers();
      const backgroundLayer = layers[0];

      // Add several layers - each new layer becomes active and subsequent layers go above it
      const layer1 = layerManager.addLayer('Layer 1', 800, 600); // Goes above Background, becomes active
      const layer2 = layerManager.addLayer('Layer 2', 800, 600); // Goes above Layer1, becomes active  
      const layer3 = layerManager.addLayer('Layer 3', 800, 600); // Goes above Layer2, becomes active

      // Now select layer 1 and add a new layer above it
      layerManager.setActiveLayer(layer1.id);
      const layer4 = layerManager.addLayer('Layer 4', 800, 600);

      const allLayers = layerManager.getLayers();
      expect(allLayers).toHaveLength(5);

      // Expected order after sequential additions:
      // Background(0) -> Layer1(1) -> Layer2(2) -> Layer3(3)
      // Then select Layer1 and add Layer4 above it:
      // Background(0) -> Layer1(1) -> Layer4(2) -> Layer2(3) -> Layer3(4)
      const sortedLayers = [...allLayers].sort((a, b) => a.zIndex - b.zIndex);
      expect(sortedLayers[0].id).toBe(backgroundLayer.id);
      expect(sortedLayers[1].id).toBe(layer1.id);
      expect(sortedLayers[2].id).toBe(layer4.id);
      expect(sortedLayers[3].id).toBe(layer2.id);
      expect(sortedLayers[4].id).toBe(layer3.id);
    });

    it('should handle adding layers when no layer is active', () => {
      // Clear the active layer
      layerManager.setActiveLayer('non-existent-id');
      
      const initialLayers = layerManager.getLayers();
      const layer1 = layerManager.addLayer('Test Layer', 800, 600);
      
      // Should add at the end when no active layer
      expect(layer1.zIndex).toBe(initialLayers.length);
    });
  });

  describe('findLayerById', () => {
    it('should find a layer by its ID', () => {
      const layers = layerManager.getLayers();
      const backgroundLayer = layers[0];
      
      // Add another layer
      const layer1 = layerManager.addLayer('Layer 1', 800, 600);
      
      // Test finding existing layers
      expect(layerManager.findLayerById(backgroundLayer.id)).toBe(backgroundLayer);
      expect(layerManager.findLayerById(layer1.id)).toBe(layer1);
    });

    it('should return null for non-existent layer ID', () => {
      expect(layerManager.findLayerById('non-existent-id')).toBeNull();
    });

    it('should return null for empty string ID', () => {
      expect(layerManager.findLayerById('')).toBeNull();
    });
  });

  describe('findLayerIndexById', () => {
    it('should find the index of a layer by its ID', () => {
      const layers = layerManager.getLayers();
      const backgroundLayer = layers[0];
      
      // Add another layer
      const layer1 = layerManager.addLayer('Layer 1', 800, 600);
      
      // Test finding existing layer indices
      expect(layerManager.findLayerIndexById(backgroundLayer.id)).toBe(0);
      expect(layerManager.findLayerIndexById(layer1.id)).toBe(1);
    });

    it('should return -1 for non-existent layer ID', () => {
      expect(layerManager.findLayerIndexById('non-existent-id')).toBe(-1);
    });

    it('should return -1 for empty string ID', () => {
      expect(layerManager.findLayerIndexById('')).toBe(-1);
    });
  });

  describe('reorderLayer', () => {
    it('should reorder layers correctly', () => {
      // Add some layers to test with
      const layer1 = layerManager.addLayer('Layer 1', 800, 600);
      const layer2 = layerManager.addLayer('Layer 2', 800, 600);
      const layer3 = layerManager.addLayer('Layer 3', 800, 600);

      // Initial order should be: Background(0), Layer1(1), Layer2(2), Layer3(3)
      let layers = layerManager.getLayers();
      expect(layers).toHaveLength(4);
      
      let sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      expect(sortedLayers[0].name).toBe('Background');
      expect(sortedLayers[1].name).toBe('Layer 1');
      expect(sortedLayers[2].name).toBe('Layer 2');
      expect(sortedLayers[3].name).toBe('Layer 3');

      // Move Layer 2 to position 0 (should be at the bottom, below Background)
      const result = layerManager.reorderLayer(layer2.id, 0);
      expect(result).not.toBeNull();
      expect(result?.oldVisualIndex).toBe(2);
      expect(result?.newVisualIndex).toBe(0);

      // Check the new order: Layer2(0), Background(1), Layer1(2), Layer3(3)
      layers = layerManager.getLayers();
      sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      expect(sortedLayers[0].name).toBe('Layer 2');
      expect(sortedLayers[1].name).toBe('Background');
      expect(sortedLayers[2].name).toBe('Layer 1');
      expect(sortedLayers[3].name).toBe('Layer 3');
    });

    it('should return null for non-existent layer ID', () => {
      const result = layerManager.reorderLayer('non-existent-id', 0);
      expect(result).toBeNull();
    });

    it('should handle moving layer to the same position', () => {
      const layer1 = layerManager.addLayer('Layer 1', 800, 600);
      
      // Move layer to its current position
      const result = layerManager.reorderLayer(layer1.id, 1);
      expect(result).not.toBeNull();
      
      // Layer should remain in the same position
      const layers = layerManager.getLayers();
      const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
      expect(sortedLayers[1].name).toBe('Layer 1');
    });
  });
}); 