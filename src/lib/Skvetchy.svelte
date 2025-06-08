<script lang="ts">
  import Canvas from './components/Canvas/Canvas.svelte';
  import Toolbar from './components/Toolbar/Toolbar.svelte';
  import LayerPanel from './components/Layers/LayerPanel.svelte';
  import type { ILayer } from './core/LayerManager';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  // Props for customization
  export let width: string | number = '100%';
  export let height: string | number = '100%';
  export let backgroundColor = '#333';
  export let showToolbar = true;
  export let showLayerPanel = true;
  export let initialPenColor = '#000000';
  export let initialPenSize = 5;
  export let initialTool: 'pen' | 'eraser' = 'pen';
  export let enableFullscreen = true;
  export let className = '';

  // Internal state
  let layers: readonly ILayer[] = [];
  let activeLayerId: string | null = null;
  let penColor = initialPenColor;
  let penSize = initialPenSize;
  let currentTool: 'pen' | 'eraser' = initialTool;
  let canUndo = false;
  let canRedo = false;
  let isFullscreen = false;
  let mainElement: HTMLElement;
  let canvasComponent: Canvas;

  // Event dispatcher for parent communication
  const dispatch = createEventDispatcher<{
    layersChange: readonly ILayer[];
    activeLayerChange: string | null;
    toolChange: 'pen' | 'eraser';
    colorChange: string;
    sizeChange: number;
    export: Blob;
    fullscreenToggle: boolean;
  }>();

  // Reactive statements to sync props with internal state
  $: penColor = initialPenColor;
  $: penSize = initialPenSize;
  $: currentTool = initialTool;

  // Event handlers from Canvas for state updates
  function handleLayersUpdate(event: CustomEvent<readonly ILayer[]>) {
    layers = event.detail;
    dispatch('layersChange', layers);
  }
  
  function handleActiveIdUpdate(event: CustomEvent<string | null>) {
    activeLayerId = event.detail;
    dispatch('activeLayerChange', activeLayerId);
  }
  
  function handleHistoryChange(event: CustomEvent<{canUndo: boolean, canRedo: boolean}>) {
    canUndo = event.detail.canUndo;
    canRedo = event.detail.canRedo;
  }

  // Toolbar event handlers
  function handleSetTool(event: CustomEvent<'pen' | 'eraser'>) {
    currentTool = event.detail;
    dispatch('toolChange', currentTool);
  }
  
  function handleSetColor(event: CustomEvent<string>) {
    penColor = event.detail;
    dispatch('colorChange', penColor);
  }
  
  function handleSetSize(event: CustomEvent<number>) {
    penSize = event.detail;
    dispatch('sizeChange', penSize);
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
    if (!enableFullscreen) return;
    
    if (!document.fullscreenElement) {
      mainElement?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
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

  async function handleExportPNG() {
    if (canvasComponent) {
      const imageFile = await canvasComponent.exportToPNG();
      if (imageFile) {
        dispatch('export', imageFile);
        
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
  }

  // Fullscreen change listener
  function onFullscreenChange() {
    isFullscreen = !!document.fullscreenElement;
    dispatch('fullscreenToggle', isFullscreen);
  }

  // Public API methods
  export function undo() {
    canvasComponent?.undo();
  }
  
  export function redo() {
    canvasComponent?.redo();
  }
  
  export function addLayer() {
    canvasComponent?.addLayer();
  }
  
  export function clearActiveLayer() {
    canvasComponent?.clearActiveLayer();
  }
  
  export async function exportToPNG() {
    return await canvasComponent?.exportToPNG();
  }
  
  export function getLayers() {
    return layers;
  }
  
  export function getActiveLayerId() {
    return activeLayerId;
  }

  onMount(() => {
    if (enableFullscreen) {
      document.addEventListener('fullscreenchange', onFullscreenChange);
    }
  });

  onDestroy(() => {
    if (enableFullscreen) {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    }
  });
</script>

<main 
  bind:this={mainElement} 
  class="sketchy-drawing {className}"
  style="width: {typeof width === 'number' ? width + 'px' : width}; height: {typeof height === 'number' ? height + 'px' : height}; background-color: {backgroundColor};"
>
  {#if showToolbar}
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
  {/if}
  
  {#if showLayerPanel}
    <LayerPanel
      layers={layers}
      activeLayerId={activeLayerId}
      on:selectLayer={handleSelectLayer}
      on:deleteLayer={handleDeleteLayer}
      on:toggleVisibility={handleToggleVisibility}
      on:reorderLayer={handleReorderLayer}
      on:renameLayer={handleRenameLayer}
    />
  {/if}
  
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
  .sketchy-drawing {
    overflow: hidden;
    position: relative;
    display: flex;
  }
  
  .sketchy-drawing:fullscreen :global(.toolbar) {
    /* Ensure toolbar is visible in fullscreen */
    z-index: 1000;
  }
  
  .sketchy-drawing:fullscreen :global(.layer-panel) {
    /* Ensure layer panel is visible in fullscreen */
    z-index: 1000;
  }
</style> 