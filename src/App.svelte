<script lang="ts">
  import Canvas from './lib/components/Canvas/Canvas.svelte';
  import Toolbar from './lib/components/Toolbar/Toolbar.svelte';
  import LayerPanel from './lib/components/Layers/LayerPanel.svelte';
  import type { ILayer } from './lib/core/LayerManager';
  import type { IHistoryAction, ActionType } from './lib/core/HistoryManager'; // Ensure ActionType is imported if Canvas needs it for applyHistoryAction


  let layers: readonly ILayer[] = [];
  let activeLayerId: string | null = null;
  let penColor = '#000000';
  let penSize = 5;
  let currentTool: 'pen' | 'eraser' = 'pen'; // Default tool

  let canUndo = false;
  let canRedo = false;

  let canvasComponent: Canvas; // bind:this to Canvas component

  // Event handlers from Canvas for state updates
  function handleLayersUpdate(event: CustomEvent<readonly ILayer[]>) {
    layers = event.detail;
  }
  function handleActiveIdUpdate(event: CustomEvent<string | null>) {
    activeLayerId = event.detail;
  }
  function handleHistoryChange(event: CustomEvent<{canUndo: boolean, canRedo: boolean}>) {
    canUndo = event.detail.canUndo;
    canRedo = event.detail.canRedo;
  }

  // Toolbar event handlers
  function handleSetTool(event: CustomEvent<'pen' | 'eraser'>) {
    currentTool = event.detail;
  }
  function handleSetColor(event: CustomEvent<string>) {
    penColor = event.detail;
  }
  function handleSetSize(event: CustomEvent<number>) {
    penSize = event.detail;
  }
  function handleUndo() {
    canvasComponent?.undo();
  }
  function handleRedo() {
    canvasComponent?.redo();
  }
  function handleAddLayer() {
    canvasComponent?.addLayer();
  }
  function handleClearActiveLayer() {
    if (window.confirm('Are you sure you want to clear the active layer? This action cannot be undone directly by another clear, only by regular undo.')) {
      canvasComponent?.clearActiveLayer();
    }
  }

  // LayerPanel event handlers
  function handleSelectLayer(event: CustomEvent<string>) {
    canvasComponent?.setActiveLayer(event.detail);
  }
  function handleDeleteLayer(event: CustomEvent<string>) {
    canvasComponent?.deleteLayer(event.detail);
  }
  function handleToggleVisibility(event: CustomEvent<string>) {
    canvasComponent?.toggleLayerVisibility(event.detail);
  }
  function handleReorderLayer(event: CustomEvent<{layerId: string; newIndex: number}>) { // Added
    canvasComponent?.reorderLayer(event.detail.layerId, event.detail.newIndex);
  }

</script>

<main>
  <Toolbar
    bind:penColor={penColor}
    bind:penSize={penSize}
    bind:currentTool={currentTool}
    canUndo={canUndo}
    canRedo={canRedo}
    on:setTool={handleSetTool}
    on:setColor={handleSetColor}
    on:setSize={handleSetSize}
    on:undo={handleUndo}
    on:redo={handleRedo}
    on:addLayer={handleAddLayer}
    on:clearActiveLayer={handleClearActiveLayer}
  />
  <LayerPanel
    layers={layers}
    activeLayerId={activeLayerId}
    on:selectLayer={handleSelectLayer}
    on:deleteLayer={handleDeleteLayer}
    on:toggleVisibility={handleToggleVisibility}
    on:reorderLayer={handleReorderLayer} <!-- Add this line -->
  />
  <Canvas
    bind:this={canvasComponent}
    penColor={penColor}
    penSize={penSize}
    currentToolType={currentTool}
    on:layersupdate={handleLayersUpdate}
    on:activeidupdate={handleActiveIdUpdate}
    on:historychange={handleHistoryChange}
    layers={layers}
    activeLayerId={activeLayerId}
  />
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    background-color: #333;
    overflow: hidden;
    position: relative;
  }
</style>
