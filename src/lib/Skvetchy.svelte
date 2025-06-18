<script lang="ts">
  import Canvas from './components/Canvas/Canvas.svelte';
  import LayerPanel from './components/Layers/LayerPanel.svelte';
  import BrushModal from './components/Modals/BrushModal.svelte';
  import ColorModal from './components/Modals/ColorModal.svelte';
  import ConfirmModal from './components/Modals/ConfirmModal.svelte';
  import Icon from './components/Icon.svelte';
  import type { ILayer } from './core/LayerManager';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  // Props for customization
  export let width: string | number = '100%';
  export let height: string | number = '100%';
  export let backgroundColor = '#333';

  export let initialPenColor = '#000000';
  export let initialPenSize = 5;
  export let initialTool: 'pen' | 'eraser' = 'pen';
  export let enableFullscreen = true;
  export let className = '';
  
  // Required image dimensions for export
  export let imageWidth: number;
  export let imageHeight: number;

  // Internal state
  let layers: readonly ILayer[] = [];
  let activeLayerId: string | null = null;
  let showLayersModal = false;
  let showBrushModal = false;
  let showColorModal = false;
  let brushModalTool: 'pen' | 'eraser' = 'pen'; // Track which tool the brush modal is for
  let showSaveConfirmModal = false;
  let penColor = initialPenColor;
  let penSize = initialPenSize;
  let currentTool: 'pen' | 'eraser' = initialTool;
  let canUndo = false;
  let canRedo = false;
  let isFullscreen = false;
  let mainElement: HTMLElement;
  let canvasComponent: Canvas;

  // Separate sizes for pen and eraser
  let penBrushSize = initialPenSize;
  let eraserSize = 20; // Default eraser size
  
  // Track which tool was last clicked for second-tap detection
  let lastClickedTool: 'pen' | 'eraser' | null = null;

  // Event dispatcher for parent communication
  const dispatch = createEventDispatcher<{
    layersChange: readonly ILayer[];
    activeLayerChange: string | null;
    toolChange: 'pen' | 'eraser';
    colorChange: string;
    sizeChange: number;
    export: File;
    fullscreenToggle: boolean;
  }>();

  // Reactive statements to sync props with internal state
  $: penColor = initialPenColor;
  $: penSize = initialPenSize;
  $: currentTool = initialTool;

  // Update penSize based on current tool
  $: penSize = currentTool === 'pen' ? penBrushSize : eraserSize;

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

  // Tool event handlers
  function handleSetTool(tool: 'pen' | 'eraser') {
    currentTool = tool;
    dispatch('toolChange', currentTool);
  }
  
  function handleSetColor(color: string) {
    penColor = color;
    dispatch('colorChange', penColor);
  }
  
  function handleSetSize(event: CustomEvent<number>) {
    const size = event.detail;
    if (currentTool === 'pen') {
      penBrushSize = size;
    } else {
      eraserSize = size;
    }
    penSize = size;
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

  // Handle tool button clicks - first click selects, second click opens size modal
  function handleToolClick(tool: 'pen' | 'eraser') {
    if (currentTool === tool && lastClickedTool === tool) {
      // Second tap on already active tool - open size modal
      brushModalTool = tool;
      showBrushModal = true;
    } else {
      // First tap or switching tools - select tool
      currentTool = tool;
      dispatch('toolChange', currentTool);
    }
    lastClickedTool = tool;
  }

  // Handle color picker click to open color modal
  function handleColorClick() {
    showColorModal = true;
  }

  // Handle direct color input change
  function handleColorInput(event: Event) {
    const target = event.target as HTMLInputElement;
    penColor = target.value;
    dispatch('colorChange', penColor);
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

  
  <div class="canvas-wrapper" style="--aspect-ratio: {imageWidth / imageHeight};">
    <Canvas
      bind:this={canvasComponent}
      penColor={penColor}
      penSize={penSize}
      currentToolType={currentTool}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      on:layersupdate={handleLayersUpdate}
      on:activeidupdate={handleActiveIdUpdate}
      on:historychange={handleHistoryChange}
      layers={layers}
      activeLayerId={activeLayerId}
    />
  </div>
  <div class="toolbar">
    <button on:click={() => showLayersModal = !showLayersModal} title="Layers">
      <Icon name="layers" size={20} />
    </button>
    <button on:click={() => handleToolClick('pen')} title="Pen" class:active={currentTool === 'pen'}>
      <Icon name="brush" size={20} />
    </button>
    <button on:click={() => handleToolClick('eraser')} title="Eraser" class:active={currentTool === 'eraser'}>
      <Icon name="eraser" size={20} />
    </button>
    
    <!-- Direct color picker button -->
    <input 
      type="color" 
      bind:value={penColor} 
      on:input={handleColorInput}
      title="Color: {penColor}"
      class="color-picker-button"
    />

    <button on:click={handleUndo} disabled={!canUndo} title="Undo">
      <span style="display: inline-block; transform: rotate(180deg);">➦</span>
    </button>
    <button on:click={handleRedo} disabled={!canRedo} title="Redo">➦</button>

    <button on:click={() => showSaveConfirmModal = true} title="Submit">
      <Icon name="check" size={20} />
    </button>

    <button on:click={handleToggleFullscreen} title="Toggle Fullscreen">
      <Icon name="fullscreen" size={20} />
    </button>
  </div>



  {#if showLayersModal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="modal-overlay" on:click={() => showLayersModal = false} role="presentation">
      <div class="modal-content layer-modal-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="layers-title" tabindex="0">
        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          on:selectLayer={handleSelectLayer}
          on:deleteLayer={handleDeleteLayer}
          on:toggleVisibility={handleToggleVisibility}
          on:reorderLayer={handleReorderLayer}
          on:renameLayer={handleRenameLayer}
          on:addLayer={handleAddLayer}
        />
      </div>
    </div>
  {/if}

  {#if showSaveConfirmModal}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="modal-overlay" on:click={() => showSaveConfirmModal = false} role="presentation">
      <div class="modal-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="save-confirm-title" tabindex="0">
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
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="modal-overlay" on:click={() => showColorModal = false} role="presentation">
      <div class="modal-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="color-modal-title" tabindex="0">
        <ColorModal
          bind:penColor={penColor}
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
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="modal-overlay" on:click={() => showBrushModal = false} role="presentation">
      <div class="modal-content" on:click|stopPropagation role="dialog" aria-modal="true" aria-labelledby="brush-modal-title" tabindex="0">
        <BrushModal
          bind:penSize={penSize}
          on:setSize={handleSetSize}
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
    flex-direction: column;
  }
  
  .canvas-wrapper {
    flex-grow: 1;
    position: relative;
    overflow: hidden;
    width: 100%;
    max-width: 100%;
    max-height: 100%;
    aspect-ratio: var(--aspect-ratio);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
  .toolbar {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    background-color: #f0f0f0;
    border-top: 1px solid #ccc;
  }

  .toolbar button {
    padding: 8px 12px;
    font-size: 1.2em; /* For icon buttons, adjust as needed */
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    margin: 0 5px;
    line-height: 1; /* Ensures icon is centered if it has descenders/ascenders */
  }
  .toolbar button:hover:not(:disabled) {
    background-color: #e0e0e0;
    border-color: #bbb;
  }
  .toolbar button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .toolbar button.active {
    background-color: #a0a0ff;
    font-weight: bold;
  }

  .color-picker-button {
    width: 40px !important;
    height: 40px !important;
    border: 1px solid #ccc !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    padding: 0 !important;
    margin: 0 5px !important;
  }

  .color-picker-button:hover {
    border-color: #bbb !important;
  }

  .modal-overlay {
    position: absolute; /* Position relative to the component container */
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