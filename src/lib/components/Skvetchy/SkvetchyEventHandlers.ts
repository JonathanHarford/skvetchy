import type { ILayer } from '../../core/LayerManager';

export interface SkvetchyEventHandlerContext {
  canvasComponent: any;
  onlayerschange?: (layers: readonly ILayer[]) => void;
  onactivelayerchange?: (activeLayerId: string | null) => void;
  ontoolchange?: (tool: 'pen' | 'eraser' | 'fill') => void;
  oncolorchange?: (color: string) => void;
  onsizechange?: (size: number) => void;
  onexport?: (file: File) => void;
  onfullscreentoggle?: (isFullscreen: boolean) => void;
  enableFullscreen: boolean;
  mainElement?: HTMLElement;
}

export class SkvetchyEventHandlers {
  private context: SkvetchyEventHandlerContext;

  constructor(context: SkvetchyEventHandlerContext) {
    this.context = context;
  }

  updateContext(context: SkvetchyEventHandlerContext) {
    this.context = context;
  }

  // Canvas event handlers
  handleLayersUpdate = (event: CustomEvent<readonly ILayer[]>) => {
    this.context.onlayerschange?.(event.detail);
    return event.detail;
  };

  handleActiveIdUpdate = (event: CustomEvent<string | null>) => {
    this.context.onactivelayerchange?.(event.detail);
    return event.detail;
  };

  handleHistoryChange = (event: CustomEvent<{canUndo: boolean, canRedo: boolean}>) => {
    return event.detail;
  };

  handleSetSize = (event: CustomEvent<number>, currentTool: 'pen' | 'eraser' | 'fill') => {
    const size = event.detail;
    this.context.onsizechange?.(size);
    return { size, currentTool };
  };

  // Action handlers
  handleUndo = () => {
    this.context.canvasComponent?.undo();
  };

  handleRedo = () => {
    this.context.canvasComponent?.redo();
  };

  handleAddLayer = () => {
    this.context.canvasComponent?.addLayer();
  };

  handleClearActiveLayer = () => {
    if (window.confirm('Are you sure you want to clear the active layer? This action cannot be undone directly by another clear, only by regular undo.')) {
      this.context.canvasComponent?.clearActiveLayer();
    }
  };

  handleToggleFullscreen = () => {
    if (!this.context.enableFullscreen) return;
    
    if (!document.fullscreenElement) {
      this.context.mainElement?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // LayerPanel event handlers
  handleSelectLayer = (event: CustomEvent<string>) => {
    this.context.canvasComponent?.setActiveLayer(event.detail);
  };

  handleDeleteLayer = (event: CustomEvent<string>) => {
    this.context.canvasComponent?.deleteLayer(event.detail);
  };

  handleToggleVisibility = (event: CustomEvent<string>) => {
    this.context.canvasComponent?.toggleLayerVisibility(event.detail);
  };

  handleReorderLayer = (event: CustomEvent<{layerId: string; newIndex: number}>) => {
    this.context.canvasComponent?.reorderLayer(event.detail.layerId, event.detail.newIndex);
  };

  handleRenameLayer = (event: CustomEvent<{layerId: string; newName: string}>) => {
    this.context.canvasComponent?.renameLayer(event.detail.layerId, event.detail.newName);
  };

  // Export handler
  handleExportPNG = async () => {
    if (this.context.canvasComponent) {
      const imageFile = await this.context.canvasComponent.exportToPNG();
      if (imageFile) {
        this.context.onexport?.(imageFile);
        
        // Default behavior: download the file
        const url = URL.createObjectURL(imageFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = imageFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error("Failed to export image");
      }
    }
  };

  // Tool and color handlers
  handleToolClick = (tool: 'pen' | 'eraser' | 'fill', currentTool: 'pen' | 'eraser' | 'fill') => {
    if (currentTool === tool && (tool === 'pen' || tool === 'eraser')) {
      return { shouldShowBrushModal: true, newTool: currentTool };
    }
    this.context.ontoolchange?.(tool);
    return { shouldShowBrushModal: false, newTool: tool };
  };

  handleColorInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const newColor = target.value;
    this.context.oncolorchange?.(newColor);
    return newColor;
  };

  // Fullscreen change listener
  onFullscreenChange = () => {
    const isFullscreen = !!document.fullscreenElement;
    this.context.onfullscreentoggle?.(isFullscreen);
    return isFullscreen;
  };
} 