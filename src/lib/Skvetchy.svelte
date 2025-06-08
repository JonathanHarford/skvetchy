<script lang="ts">
  import Canvas from './components/Canvas/Canvas.svelte';
  import Toolbar from './components/Toolbar/Toolbar.svelte';
  import LayerPanel from './components/Layers/LayerPanel.svelte';
  import BrushModal from './components/modals/BrushModal.svelte';
  import ColorModal from './components/modals/ColorModal.svelte';
  import ConfirmModal from './components/modals/ConfirmModal.svelte';
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
  let showLayersModal = false; // New state variable
  let showBrushModal = false;
  let showColorModal = false;
  let showSaveConfirmModal = false;
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
  
  <div style="flex-grow: 1; position: relative; overflow: hidden; width: 100%; height: 100%;">
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
  </div>
  <div class="bottom-toolbar">
    <button on:click={() => showLayersModal = !showLayersModal} title="Layers">❖</button>
    <button on:click={() => showBrushModal = !showBrushModal} title="Brush">🖌️</button>
    <button on:click={() => showColorModal = !showColorModal} title="Color">🎨</button>

    <button on:click={handleUndo} disabled={!canUndo} title="Undo">
      <span style="display: inline-block; transform: rotate(180deg);">➦</span>
    </button>
    <button on:click={handleRedo} disabled={!canRedo} title="Redo">➦</button>

    <button on:click={() => showSaveConfirmModal = true} title="Submit">💾</button>

    <button on:click={handleToggleFullscreen} title="Toggle Fullscreen">∷</button>
  </div>

  {#if showLayersModal}
    <div class="modal-overlay" on:click={() => showLayersModal = false}>
      <div class="modal-content layer-modal-content" on:click|stopPropagation>
        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          on:selectLayer={handleSelectLayer}
          on:deleteLayer={handleDeleteLayer}
          on:toggleVisibility={handleToggleVisibility}
          on:reorderLayer={handleReorderLayer}
          on:renameLayer={handleRenameLayer}
        />
      </div>
    </div>
  {/if}

  {#if showSaveConfirmModal}
    <div class="modal-overlay" on:click={() => showSaveConfirmModal = false}> {/* Allow closing by overlay click */}
      <div class="modal-content" on:click|stopPropagation>
        <ConfirmModal
          title="Save Image"
          message="Are you sure you want to save and download the image?"
          on:confirm={() => {
            handleExportPNG();
            showSaveConfirmModal = false;
          }}
          on:cancel={() => showSaveConfirmModal = false}
        />
      </div>
    </div>
  {/if}

  {#if showColorModal}
    <div class="modal-overlay" on:click={() => showColorModal = false}>
      <div class="modal-content" on:click|stopPropagation>
        <ColorModal
          bind:penColor={penColor} /* Two-way bind penColor */
          on:setColor={() => {
            /* penColor is already updated by the binding */
            /* Dispatch the change for parent components if necessary */
            dispatch('colorChange', penColor);
          }}
          on:close={() => showColorModal = false}
        />
      </div>
    </div>
  {/if}

  {#if showBrushModal}
    <div class="modal-overlay" on:click={() => showBrushModal = false}>
      <div class="modal-content" on:click|stopPropagation> {/* Use generic modal-content class */}
        <BrushModal
          bind:penSize={penSize} /* Two-way bind penSize */
          on:setSize={() => {
            /* penSize is already updated by the binding */
            /* Dispatch the change for parent components if necessary */
            dispatch('sizeChange', penSize);
          }}
          on:close={() => showBrushModal = false}
        />
      </div>
    </div>
  {/if}
</main>

<style>
  .sketchy-drawing {
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column; /* Ensure vertical layout */
  }
  
  .bottom-toolbar {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    background-color: #f0f0f0; /* Example background color */
    border-top: 1px solid #ccc; /* Example border */
  }

  .bottom-toolbar button {
    padding: 8px 12px;
    font-size: 1.2em; /* For icon buttons, adjust as needed */
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    margin: 0 5px; /* Spacing between buttons */
    line-height: 1; /* Ensures icon is centered if it has descenders/ascenders */
  }
  .bottom-toolbar button:hover:not(:disabled) {
    background-color: #e0e0e0;
    border-color: #bbb;
  }
  .bottom-toolbar button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-overlay {
    position: fixed; /* Use fixed to cover the whole viewport */
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000; /* Ensure it's above other content */
  }

  .modal-content {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    /* Max width/height can be added as needed */
  }

  /* Specific styling for layer modal if needed, e.g., size */
  .layer-modal-content {
    /* Reset LayerPanel's absolute positioning if it conflicts */
    /* The LayerPanel itself might need style adjustments now that it's in a modal */
    color: #333; /* Example to make text visible if it was white on dark */
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