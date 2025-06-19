<script lang="ts">
  import Canvas from './components/Canvas/Canvas.svelte';
  import LayerPanel from './components/Layers/LayerPanel.svelte';
  import BrushModal from './components/Modals/BrushModal.svelte';
  import ColorModal from './components/Modals/ColorModal.svelte';
  import Icon from './components/Icon.svelte';
  import type { ILayer } from './core/LayerManager';

  // Props for customization
  let {
    width = '100%',
    height = '100%',
    backgroundColor = '#333',
    initialPenColor = '#000000',
    initialPenSize = 5,
    initialTool = 'pen',
    enableFullscreen = false,
    enableDownload = false,
    className = '',
    imageWidth,
    imageHeight,
    onlayerschange,
    onactivelayerchange,
    ontoolchange,
    oncolorchange,
    onsizechange,
    onexport,
    onfullscreentoggle
  }: {
    width?: string | number;
    height?: string | number;
    backgroundColor?: string;
    initialPenColor?: string;
    initialPenSize?: number;
    initialTool?: 'pen' | 'eraser' | 'fill';
    enableFullscreen?: boolean;
    enableDownload?: boolean;
    className?: string;
    imageWidth: number;
    imageHeight: number;
    onlayerschange?: (layers: readonly ILayer[]) => void;
    onactivelayerchange?: (activeLayerId: string | null) => void;
    ontoolchange?: (tool: 'pen' | 'eraser' | 'fill') => void;
    oncolorchange?: (color: string) => void;
    onsizechange?: (size: number) => void;
    onexport?: (file: File) => void;
    onfullscreentoggle?: (isFullscreen: boolean) => void;
  } = $props();

  // Internal state
  let layers = $state<readonly ILayer[]>([]);
  let activeLayerId = $state<string | null>(null);
  let showLayersModal = $state(false);
  let showBrushModal = $state(false);
  let showColorModal = $state(false);
  let penColor = $state(initialPenColor);
  let currentTool = $state<'pen' | 'eraser' | 'fill'>(initialTool);
  let canUndo = $state(false);
  let canRedo = $state(false);
  let isFullscreen = $state(false);
  let mainElement: HTMLElement; // Used with bind:this, not state
  let canvasComponent: Canvas; // Used with bind:this, not state

  // Separate sizes for pen and eraser
  let penBrushSize = $state(initialPenSize);
  let eraserSize = $state(20); // Default eraser size



  // Update penSize based on current tool
  const penSize = $derived(currentTool === 'pen' ? penBrushSize : eraserSize);

  // Callback handlers from Canvas for state updates
  function handleLayersUpdate(newLayers: readonly ILayer[]) {
    layers = newLayers;
    onlayerschange?.(layers);
  }
  
  function handleActiveIdUpdate(newActiveLayerId: string | null) {
    activeLayerId = newActiveLayerId;
    onactivelayerchange?.(activeLayerId);
  }
  
  function handleHistoryChange(state: {canUndo: boolean, canRedo: boolean}) {
    canUndo = state.canUndo;
    canRedo = state.canRedo;
  }
  
  function handleSetSize(size: number) {
    if (currentTool === 'pen') {
      penBrushSize = size;
    } else {
      eraserSize = size;
    }
    // penSize is derived, no need to set it here
    onsizechange?.(size);
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
  function handleSelectLayer(layerId: string) {
    canvasComponent?.setActiveLayer(layerId);
  }
  
  function handleDeleteLayer(layerId: string) {
    canvasComponent?.deleteLayer(layerId);
  }
  
  function handleToggleVisibility(layerId: string) {
    canvasComponent?.toggleLayerVisibility(layerId);
  }
  
  function handleReorderLayer(data: {layerId: string; newIndex: number}) {
    canvasComponent?.reorderLayer(data.layerId, data.newIndex);
  }
  
  function handleRenameLayer(data: {layerId: string; newName: string}) {
    canvasComponent?.renameLayer(data.layerId, data.newName);
  }

  async function handleExportPNG() {
    if (canvasComponent) {
      const imageFile = await canvasComponent.exportToPNG();
      if (imageFile) {
        onexport?.(imageFile);
        
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
    onfullscreentoggle?.(isFullscreen);
  }

  // Public API methods - exported functions are accessible on component instance
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


  // Handle tool button clicks
  function handleToolClick(tool: 'pen' | 'eraser' | 'fill') {
    if (currentTool === tool && (tool === 'pen' || tool === 'eraser')) {
      showBrushModal = true;
      return;
    }
    currentTool = tool;
    ontoolchange?.(currentTool);
  }

  // Handle color picker click to open color modal (if a separate button for modal is desired)
  // function handleColorClick() {
  //   showColorModal = true;
  // }

  // Handle direct color input change
  function handleColorInput(event: Event) {
    const target = event.target as HTMLInputElement;
    penColor = target.value; // Direct assignment to $state variable
    oncolorchange?.(penColor);
  }

  $effect(() => {
    // Sync initialPenColor prop changes to penColor state
    penColor = initialPenColor;
  });

  $effect(() => {
    // Sync initialPenSize prop changes to penBrushSize state (assuming pen is the default context for initialPenSize)
     if (currentTool === 'pen') {
      penBrushSize = initialPenSize;
    }
    // If you want initialPenSize to also set eraserSize when eraser is the initial tool, add:
    // else if (currentTool === 'eraser') {
    //   eraserSize = initialPenSize;
    // }
  });

  $effect(() => {
    // Sync initialTool prop changes to currentTool state
    currentTool = initialTool;
  });

  $effect(() => {
    if (enableFullscreen) {
      document.addEventListener('fullscreenchange', onFullscreenChange);
      return () => {
        document.removeEventListener('fullscreenchange', onFullscreenChange);
      };
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
      onlayersupdate={handleLayersUpdate}
      onactiveidupdate={handleActiveIdUpdate}
      onhistorychange={handleHistoryChange}
      layers={layers}
      activeLayerId={activeLayerId}
    />
  </div>
  <div class="toolbar">
    <button onclick={() => showLayersModal = !showLayersModal} title="Layers">
      <Icon name="layers" size={20} />
    </button>
    <button onclick={() => handleToolClick('pen')} title="Pen" class:active={currentTool === 'pen'}>
      <Icon name="brush" size={20} />
    </button>
    <button onclick={() => handleToolClick('eraser')} title="Eraser" class:active={currentTool === 'eraser'}>
      <Icon name="eraser" size={20} />
    </button>
    <button onclick={() => handleToolClick('fill')} title="Fill Bucket" class:active={currentTool === 'fill'}>
      <Icon name="bucket" size={20} />
    </button>
    
    <!-- Direct color picker button -->
    <input 
      type="color" 
      bind:value={penColor} 
      oninput={handleColorInput}
      title="Color: {penColor}"
      class="color-picker-button"
    />

    <button onclick={handleUndo} disabled={!canUndo} title="Undo">
      <span style="display: inline-block; transform: rotate(180deg);">➦</span>
    </button>
    <button onclick={handleRedo} disabled={!canRedo} title="Redo">➦</button>

    {#if enableDownload}  
      <button onclick={handleExportPNG} title="Download">
        <Icon name="download" size={20} />
      </button>
    {/if}

    {#if enableFullscreen}
      <button onclick={handleToggleFullscreen} title="Toggle Fullscreen">
        <Icon name="fullscreen" size={20} />
      </button>
    {/if}
  </div>



  {#if showLayersModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-overlay" onclick={() => showLayersModal = false} role="presentation">
      <div class="modal-content layer-modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="layers-title" tabindex="0">
        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onselectLayer={handleSelectLayer}
          ondeleteLayer={handleDeleteLayer}
          ontoggleVisibility={handleToggleVisibility}
          onreorderLayer={handleReorderLayer}
          onrenameLayer={handleRenameLayer}
          onaddLayer={handleAddLayer}
        />
      </div>
    </div>
  {/if}



  {#if showColorModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-overlay" onclick={() => showColorModal = false} role="presentation">
      <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="color-modal-title" tabindex="0">
        <ColorModal
          penColor={penColor}
          onsetcolor={(color) => {
            penColor = color;
            oncolorchange?.(penColor);
          }}
          onclose={() => showColorModal = false}
        />
      </div>
    </div>
  {/if}

  {#if showBrushModal}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div class="modal-overlay" onclick={() => showBrushModal = false} role="presentation">
      <div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="brush-modal-title" tabindex="0">
        <BrushModal
          penSize={penSize}
          toolType={currentTool}
          onsetsize={handleSetSize}
          onclose={() => showBrushModal = false}
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
    /* Disable double-tap zoom and other double-tap behaviors */
    touch-action: manipulation;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
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
    align-items: stretch;
    padding: 5px;
    gap: 4px;
    background-color: #f0f0f0;
    border-top: 1px solid #ccc;
  }

  .toolbar button, .color-picker-button  {
    font-size: 1.2em; /* For icon buttons, adjust as needed */
    background-color: #fff;
    border: 1px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    height: auto;
    line-height: 1; /* Ensures icon is centered if it has descenders/ascenders */
  }

  .toolbar button {
   padding: 8px 12px;
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

  /* .color-picker-button {
    width: 40px !important;
    height: 40px !important;
    border: 1px solid #ccc !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    padding: 0 !important;
  } */

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