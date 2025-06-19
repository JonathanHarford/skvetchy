import type { ILayer } from '../../core/LayerManager';

export interface DragDropContext {
  layers: readonly ILayer[];
  onReorderLayer: (layerId: string, newIndex: number) => void;
}

export class LayerDragDrop {
  private draggedItemId: string | null = null;
  private dropTargetId: string | null = null;
  private context: DragDropContext;

  constructor(context: DragDropContext) {
    this.context = context;
  }

  updateContext(context: DragDropContext) {
    this.context = context;
  }

  getDraggedItemId(): string | null {
    return this.draggedItemId;
  }

  getDropTargetId(): string | null {
    return this.dropTargetId;
  }

  handleDragStart = (event: DragEvent, layerId: string): void => {
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', layerId);
    this.draggedItemId = layerId;
  };

  handleDragOver = (event: DragEvent, targetLayerId: string): void => {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    if (targetLayerId !== this.draggedItemId) {
      this.dropTargetId = targetLayerId;
    }
  };

  handleDragLeave = (event: DragEvent): void => {
    if ((event.target as HTMLLIElement).classList.contains('layer-item')) {
      const leftLayerId = (event.target as HTMLLIElement).dataset.layerId;
      if (leftLayerId === this.dropTargetId) {
        this.dropTargetId = null;
      }
    }
  };

  handleDrop = (event: DragEvent, targetLayerId: string): void => {
    event.preventDefault();
    const sourceLayerId = event.dataTransfer!.getData('text/plain');
    
    if (sourceLayerId && sourceLayerId !== targetLayerId) {
      const reversedLayers = [...this.context.layers].reverse();
      const targetIndex = reversedLayers.findIndex(l => l.id === targetLayerId);
      
      if (targetIndex !== -1) {
        const originalTargetIndex = this.context.layers.length - 1 - targetIndex;
        this.context.onReorderLayer(sourceLayerId, originalTargetIndex);
      }
    }
    
    this.resetDragState();
  };

  handleDragEnd = (): void => {
    this.resetDragState();
  };

  private resetDragState(): void {
    this.draggedItemId = null;
    this.dropTargetId = null;
  }
} 