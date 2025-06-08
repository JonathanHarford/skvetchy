<script lang="ts">
  import Canvas from './lib/components/Canvas/Canvas.svelte';
  import Toolbar from './lib/components/Toolbar/Toolbar.svelte';
  import LayerPanel from './lib/components/Layers/LayerPanel.svelte';
  import type { ILayer } from './lib/core/LayerManager';
  // import type { IHistoryAction, ActionType } from './lib/core/HistoryManager'; // This was from previous step, remove if not used directly in App.svelte
  import { onMount, onDestroy } from 'svelte'; // Import onMount and onDestroy

  let layers: readonly ILayer[] = [];
  let activeLayerId: string | null = null;
  let penColor = '#000000';
  let penSize = 5;
  let currentTool: 'pen' | 'eraser' = 'pen';

  let canUndo = false;
  let canRedo = false;
  let isFullscreen = false; // State for fullscreen mode
  let mainElement: HTMLElement; // To bind to the main container for fullscreen


  let canvasComponent: Canvas;

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
  function handleToggleFullscreen() {
    if (!document.fullscreenElement) {
      mainElement?.requestFullscreen().catch(err => {
        alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
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
  function handleReorderLayer(event: CustomEvent<{layerId: string; newIndex: number}>) {
    canvasComponent?.reorderLayer(event.detail.layerId, event.detail.newIndex);
  }
  function handleRenameLayer(event: CustomEvent<{layerId: string; newName: string}>) {
    canvasComponent?.renameLayer(event.detail.layerId, event.detail.newName);
  }

  async function handleExportPNG() { // New handler for the event from Toolbar
    if (canvasComponent) {
      const imageFile = await canvasComponent.exportToPNG();
      if (imageFile) {
        const url = URL.createObjectURL(imageFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = imageFile.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up
      } else {
        alert("Failed to export image. See console for details.");
      }
    }
  }

  // Fullscreen change listener
  function onFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
  }

  onMount(() => {
    document.addEventListener('fullscreenchange', onFullscreenChange);
  });

  onDestroy(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
  });

</script>

<main bind:this={mainElement}>
  <Toolbar
    bind:penColor={penColor}
    bind:penSize={penSize}
    bind:currentTool={currentTool}
    canUndo={canUndo}
    canRedo={canRedo}
    isFullscreen={isFullscreen}
    on:setTool={handleSetTool}
    on:setColor={handleSetColor}
    on:setSize={handleSetSize}
    on:undo={handleUndo}
    on:redo={handleRedo}
    on:addLayer={handleAddLayer}
    on:clearActiveLayer={handleClearActiveLayer}
    on:toggleFullscreen={handleToggleFullscreen}
    on:exportPNG={handleExportPNG}
  />
  <LayerPanel
    layers={layers}
    activeLayerId={activeLayerId}
    on:selectLayer={handleSelectLayer}
    on:deleteLayer={handleDeleteLayer}
    on:toggleVisibility={handleToggleVisibility}
    on:reorderLayer={handleReorderLayer}
    on:renameLayer={handleRenameLayer}
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
    display: flex; /* Ensure it's a flex container if Toolbar/LayerPanel are direct children */
                  /* Or ensure Canvas takes up full space correctly if they overlay */
  }
  /* When in fullscreen, ensure toolbar and layer panel are still visible if they are part of 'mainElement' */
  main:fullscreen .toolbar {
    /* Adjust if needed, e.g., ensure z-index */
  }
  main:fullscreen .layer-panel {
    /* Adjust if needed */
  }

  /* If only the canvas area (excluding toolbar/panel) should go fullscreen,
     then mainElement should bind to a wrapper around Canvas.svelte,
     and that wrapper would be the fullscreen target.
     For simplicity, making the whole <main> element fullscreen is done here.
     This means Toolbar and LayerPanel will also be part of the fullscreen view.
  */
</style>
