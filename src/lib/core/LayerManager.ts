import { 
  createTempCanvas, 
  createTempCanvasFromSource, 
  resizeCanvasWithContent,
  type CanvasSize 
} from './CanvasUtils';

export interface ILayer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement; // Offscreen canvas for this layer
  context: CanvasRenderingContext2D;
  isVisible: boolean;
  zIndex: number;
  isDirty: boolean;
  lastModified: number;
}

export class LayerManager {
  private layers: ILayer[] = [];
  private activeLayerId: string | null = null;
  private nextLayerId = 0;
  private dirtyLayers = new Set<string>();

  constructor(initialWidth: number, initialHeight: number) {
    this.addLayer('Background', initialWidth, initialHeight);
  }

  /**
   * Helper method to find a layer by its ID
   * @param id The layer ID to search for
   * @returns The layer if found, null otherwise
   */
  findLayerById(id: string): ILayer | null {
    return this.layers.find(l => l.id === id) || null;
  }

  /**
   * Helper method to find the index of a layer by its ID
   * @param id The layer ID to search for
   * @returns The index of the layer if found, -1 otherwise
   */
  findLayerIndexById(id: string): number {
    return this.layers.findIndex(l => l.id === id);
  }

  private createLayer(name: string, width: number, height: number, zIndex: number): ILayer {
    const { canvas, context } = createTempCanvas(width, height);
    return {
      id: `layer-${this.nextLayerId++}`,
      name,
      canvas,
      context,
      isVisible: true,
      zIndex,
      isDirty: false,
      lastModified: Date.now(),
    };
  }

  addLayer(name: string = `Layer ${this.layers.length + 1}`, width: number, height: number): ILayer {
    // Find the currently active layer to insert the new layer above it
    const activeLayer = this.getActiveLayer();
    let insertIndex: number;
    let newZIndex: number;

    if (activeLayer) {
      // Insert the new layer directly above the active layer
      insertIndex = this.findLayerIndexById(activeLayer.id) + 1;
      newZIndex = activeLayer.zIndex + 1;
      
      // Shift zIndex of all layers above the insertion point
      this.layers.forEach(layer => {
        if (layer.zIndex >= newZIndex) {
          layer.zIndex += 1;
        }
      });
    } else {
      // If no active layer (shouldn't happen normally), add at the end
      insertIndex = this.layers.length;
      newZIndex = this.layers.length > 0 ? Math.max(...this.layers.map(l => l.zIndex)) + 1 : 0;
    }

    const layer = this.createLayer(name, width, height, newZIndex);
    this.layers.splice(insertIndex, 0, layer);
    
    // Make the newly created layer active
    this.activeLayerId = layer.id;
    // TODO: Emit event for UI update
    return layer;
  }

  deleteLayer(id: string): boolean {
    if (this.layers.length <= 1) {
      console.warn("Cannot delete the last layer.");
      return false;
    }
    const layerIndex = this.findLayerIndexById(id);
    if (layerIndex === -1) return false;

    this.layers.splice(layerIndex, 1);

    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers[this.layers.length - 1]?.id || null;
    }
    this.layers.sort((a, b) => a.zIndex - b.zIndex).forEach((layer, index) => {
        layer.zIndex = index;
    });
    // TODO: Emit event for UI update
    return true;
  }

  setActiveLayer(id: string): void {
    if (this.findLayerById(id)) {
      this.activeLayerId = id;
      // TODO: Emit event for UI update
    }
  }

  getActiveLayer(): ILayer | null {
    return this.activeLayerId ? this.findLayerById(this.activeLayerId) : null;
  }

  getLayers(): ReadonlyArray<ILayer> {
    return [...this.layers].sort((a,b) => a.zIndex - b.zIndex);
  }

  toggleLayerVisibility(id: string): void {
    const layer = this.findLayerById(id);
    if (layer) {
      layer.isVisible = !layer.isVisible;
      // TODO: Emit event for UI update
    }
  }

  // Modify reorderLayer to be more suitable for drag-and-drop (new index based)
  // and to return information for history
  reorderLayer(layerId: string, newVisualIndex: number): { oldVisualIndex: number, newVisualIndex: number } | null {
    const layerIndex = this.findLayerIndexById(layerId);
    if (layerIndex === -1) return null;

    const layerToMove = this.layers.splice(layerIndex, 1)[0];
    this.layers.splice(newVisualIndex, 0, layerToMove);

    const oldVisualZIndex = layerToMove.zIndex; // Capture old zIndex before re-assigning

    this.layers.forEach((layer, index) => {
        layer.zIndex = index;
    });

    // TODO: Emit event for UI update if not handled by history update propagation
    return { oldVisualIndex: oldVisualZIndex, newVisualIndex: layerToMove.zIndex };
  }

  resizeLayers(width: number, height: number): void {
    const newSize: CanvasSize = { width, height };
    this.layers.forEach(layer => {
      resizeCanvasWithContent(layer.canvas, layer.context, newSize);
    });
    // TODO: Emit event for redraw
  }

  addLayerWithData(layerData: ILayer, index?: number): ILayer | null {
    // Check if layer with this ID already exists to prevent duplicates if not handled carefully
    if (this.findLayerById(layerData.id)) {
        console.warn(`Layer with ID ${layerData.id} already exists. Cannot re-add.`);
        // Optionally, find and update it, or handle as an error
        return null;
    }

    // Create a new canvas and copy content for the re-added layer
    const { canvas: newCanvas, context: newCtx } = createTempCanvasFromSource(layerData.canvas);

    const newLayer: ILayer = {
      ...layerData,
      canvas: newCanvas,
      context: newCtx,
    };

    if (index !== undefined && index >= 0 && index <= this.layers.length) {
      this.layers.splice(index, 0, newLayer);
    } else {
      this.layers.push(newLayer);
    }

    this.layers.sort((a, b) => a.zIndex - b.zIndex); // Sort by old zIndex first if mixed
    this.layers.forEach((l, i) => {
      l.zIndex = i;
    });

    if (!this.activeLayerId && this.layers.length > 0) {
        this.activeLayerId = this.layers[this.layers.length -1].id; // Set active if none
    } else if (this.layers.length === 1) {
        this.activeLayerId = this.layers[0].id;
    }
    // TODO: Emit event for UI update
    return newLayer;
  }

  renameLayer(id: string, newName: string): { oldName: string } | null {
    const layer = this.findLayerById(id);
    if (layer) {
      const oldName = layer.name;
      if (oldName === newName) return null; // No change, no history needed
      layer.name = newName;
      // TODO: Emit event for UI update if not handled by history update propagation
      return { oldName };
    }
    return null;
  }

  markLayerDirty(layerId: string): void {
    this.dirtyLayers.add(layerId);
    const layer = this.findLayerById(layerId);
    if (layer) {
      layer.isDirty = true;
      layer.lastModified = Date.now();
    }
  }

  getDirtyLayers(): ILayer[] {
    return this.layers.filter(l => this.dirtyLayers.has(l.id));
  }

  clearDirtyFlags(): void {
    this.dirtyLayers.clear();
    this.layers.forEach(l => l.isDirty = false);
  }
}
