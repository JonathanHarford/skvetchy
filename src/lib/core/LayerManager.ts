export interface ILayer {
  id: string;
  name: string;
  canvas: HTMLCanvasElement; // Offscreen canvas for this layer
  context: CanvasRenderingContext2D;
  isVisible: boolean;
  zIndex: number;
}

export class LayerManager {
  private layers: ILayer[] = [];
  private activeLayerId: string | null = null;
  private nextLayerId = 0;

  constructor(initialWidth: number, initialHeight: number) {
    this.addLayer('Background', initialWidth, initialHeight);
  }

  private createLayer(name: string, width: number, height: number, zIndex: number): ILayer {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context for layer');
    }
    return {
      id: `layer-${this.nextLayerId++}`,
      name,
      canvas,
      context,
      isVisible: true,
      zIndex,
    };
  }

  addLayer(name: string = `Layer ${this.layers.length + 1}`, width: number, height: number): ILayer {
    const newZIndex = this.layers.length > 0 ? Math.max(...this.layers.map(l => l.zIndex)) + 1 : 0;
    const layer = this.createLayer(name, width, height, newZIndex);
    this.layers.push(layer);
    if (!this.activeLayerId) {
      this.activeLayerId = layer.id;
    }
    // TODO: Emit event for UI update
    return layer;
  }

  deleteLayer(id: string): void {
    if (this.layers.length <= 1) {
      console.warn("Cannot delete the last layer.");
      return;
    }
    const layerIndex = this.layers.findIndex(l => l.id === id);
    if (layerIndex === -1) return;

    this.layers.splice(layerIndex, 1);

    if (this.activeLayerId === id) {
      this.activeLayerId = this.layers[this.layers.length - 1]?.id || null;
    }
    this.layers.sort((a, b) => a.zIndex - b.zIndex).forEach((layer, index) => {
        layer.zIndex = index;
    });
    // TODO: Emit event for UI update
  }

  setActiveLayer(id: string): void {
    if (this.layers.find(l => l.id === id)) {
      this.activeLayerId = id;
      // TODO: Emit event for UI update
    }
  }

  getActiveLayer(): ILayer | null {
    return this.layers.find(l => l.id === this.activeLayerId) || null;
  }

  getLayers(): ReadonlyArray<ILayer> {
    return [...this.layers].sort((a,b) => a.zIndex - b.zIndex);
  }

  toggleLayerVisibility(id: string): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.isVisible = !layer.isVisible;
      // TODO: Emit event for UI update
    }
  }

  // Modify reorderLayer to be more suitable for drag-and-drop (new index based)
  // and to return information for history
  reorderLayer(layerId: string, newVisualIndex: number): { oldVisualIndex: number, newVisualIndex: number } | null {
    const layerIndex = this.layers.findIndex(l => l.id === layerId);
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
    this.layers.forEach(layer => {
      // Preserve existing content
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.canvas.width;
      tempCanvas.height = layer.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
          tempCtx.drawImage(layer.canvas, 0, 0);
      }

      layer.canvas.width = width;
      layer.canvas.height = height;

      // Restore content (might be scaled or cropped, depending on strategy)
      // For now, just redraws, which might clear or distort.
      // A more sophisticated approach would handle content scaling/cropping.
      if (tempCtx) {
          layer.context.drawImage(tempCanvas, 0, 0);
      }
    });
    // TODO: Emit event for redraw
  }

  addLayerWithData(layerData: ILayer, index?: number): ILayer | null {
    // Check if layer with this ID already exists to prevent duplicates if not handled carefully
    if (this.layers.find(l => l.id === layerData.id)) {
        console.warn(`Layer with ID ${layerData.id} already exists. Cannot re-add.`);
        // Optionally, find and update it, or handle as an error
        return null;
    }

    // Create a new canvas and copy content for the re-added layer
    const newCanvas = document.createElement('canvas');
    newCanvas.width = layerData.canvas.width;
    newCanvas.height = layerData.canvas.height;
    const newCtx = newCanvas.getContext('2d');
    if(!newCtx) throw new Error("Failed to get context for re-added layer");
    newCtx.drawImage(layerData.canvas, 0, 0);

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
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      const oldName = layer.name;
      if (oldName === newName) return null; // No change, no history needed
      layer.name = newName;
      // TODO: Emit event for UI update if not handled by history update propagation
      return { oldName };
    }
    return null;
  }
}
