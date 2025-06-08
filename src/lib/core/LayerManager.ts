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
    // Initialize with a base layer
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
    // Re-assign z-indices
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

  reorderLayer(id: string, newZIndex: number): void {
    const layerToMove = this.layers.find(l => l.id === id);
    if (!layerToMove) return;

    const oldZIndex = layerToMove.zIndex;
    if (oldZIndex === newZIndex) return;

    this.layers.forEach(layer => {
      if (layer.id === id) {
        layer.zIndex = newZIndex;
      } else if (newZIndex > oldZIndex && layer.zIndex > oldZIndex && layer.zIndex <= newZIndex) {
        // Moving up, shift layers between old and new Z down
        layer.zIndex--;
      } else if (newZIndex < oldZIndex && layer.zIndex < oldZIndex && layer.zIndex >= newZIndex) {
        // Moving down, shift layers between new and old Z up
        layer.zIndex++;
      }
    });

    // Ensure z-indices are contiguous after reordering
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
    this.layers.forEach((layer, index) => {
        if (layer.zIndex !== index) { // Check to prevent unnecessary re-assignment if already correct
            layer.zIndex = index;
        }
    });
    // TODO: Emit event for UI update
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
}
