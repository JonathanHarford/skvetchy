import type { ILayer } from '../../core/LayerManager';

export interface LayerEditingContext {
  layers: readonly ILayer[];
  onRenameLayer: (layerId: string, newName: string) => void;
}

export class LayerEditing {
  private editingLayerId: string | null = null;
  private editingName: string = '';
  private context: LayerEditingContext;

  constructor(context: LayerEditingContext) {
    this.context = context;
  }

  updateContext(context: LayerEditingContext) {
    this.context = context;
  }

  getEditingLayerId(): string | null {
    return this.editingLayerId;
  }

  getEditingName(): string {
    return this.editingName;
  }

  startEditing = (layer: ILayer): void => {
    this.editingLayerId = layer.id;
    this.editingName = layer.name;
  };

  handleRenameInput = (event: Event): void => {
    this.editingName = (event.target as HTMLInputElement).value;
  };

  submitRename = (layerId: string): void => {
    if (this.editingLayerId === layerId && this.editingName.trim() !== '') {
      const originalLayer = this.context.layers.find((l: ILayer) => l.id === layerId);
      if (originalLayer && originalLayer.name !== this.editingName.trim()) {
        this.context.onRenameLayer(layerId, this.editingName.trim());
      }
    }
    this.editingLayerId = null;
  };

  handleRenameKeyDown = (event: KeyboardEvent, layerId: string): void => {
    if (event.key === 'Enter') {
      this.submitRename(layerId);
    } else if (event.key === 'Escape') {
      this.editingLayerId = null;
    }
  };

  cancelEditing = (): void => {
    this.editingLayerId = null;
  };

  isEditing = (layerId: string): boolean => {
    return this.editingLayerId === layerId;
  };
} 