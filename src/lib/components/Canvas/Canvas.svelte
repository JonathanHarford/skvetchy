<script lang="ts">
  import { onMount, tick, createEventDispatcher } from 'svelte';
  import { LayerManager, type ILayer } from '../../core/LayerManager';
  import { PenTool } from '../../core/tools/PenTool'; // Assuming ITool will be PenTool for now

  export let penColor = '#000000'; // Bound from App
  export let penSize = 5;       // Bound from App

  // Props for LayerPanel, bound from App and updated by LayerManager
  export let layers: readonly ILayer[] = [];
  export let activeLayerId: string | null = null;

  const dispatch = createEventDispatcher<{
    layersupdate: readonly ILayer[];
    activeidupdate: string | null;
  }>();

  let containerElement: HTMLDivElement;
  let displayCanvasElement: HTMLCanvasElement;
  let displayCtx: CanvasRenderingContext2D | null = null;

  let width = 0;
  let height = 0;
  let layerManager: LayerManager;
  let currentTool: PenTool; // Later ITool

  function updateExternalState() {
    layers = layerManager.getLayers();
    activeLayerId = layerManager.getActiveLayer()?.id || null;
    dispatch('layersupdate', layers);
    dispatch('activeidupdate', activeLayerId);
  }

  async function initializeCanvas() {
    await tick();

    if (!displayCanvasElement) return;
    displayCtx = displayCanvasElement.getContext('2d');
    if (!displayCtx) return;

    layerManager = new LayerManager(width, height);
    currentTool = new PenTool();
    updateExternalState(); // Initial state update
    requestRedraw();
  }

  onMount(() => {
    // ... (resize observer as before)
    const resizeObserver = new ResizeObserver(async entries => {
      for (let entry of entries) {
        width = entry.contentRect.width;
        height = entry.contentRect.height;

        if (displayCanvasElement) {
            displayCanvasElement.width = width;
            displayCanvasElement.height = height;
        }

        if (layerManager) {
          layerManager.resizeLayers(width, height);
          requestRedraw();
        }
      }
    });

    if (containerElement) {
        resizeObserver.observe(containerElement);
        width = containerElement.clientWidth;
        height = containerElement.clientHeight;
        initializeCanvas();
    }

    return () => {
      if (containerElement) resizeObserver.unobserve(containerElement);
    };
  });

  function requestRedraw() {
    requestAnimationFrame(drawLayers);
  }

  function drawLayers() {
    // ... (drawLayers as before)
    if (!displayCtx || !layerManager) return;
    displayCtx.clearRect(0, 0, width, height);
    const visibleLayers = layerManager.getLayers().filter(l => l.isVisible);
    for (const layer of visibleLayers) {
      displayCtx.drawImage(layer.canvas, 0, 0);
    }
  }

  function handlePointerDown(event: PointerEvent) {
    // ... (handlePointerDown as before, using bound penColor, penSize)
    if (!currentTool || !layerManager) return;
    const currentActiveLayer = layerManager.getActiveLayer(); // Renamed to avoid conflict
    if (currentActiveLayer && event.target === displayCanvasElement) {
      currentTool.onPointerDown(event, currentActiveLayer, penColor, penSize);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    // ... (handlePointerMove as before, using bound penColor, penSize)
    if (!currentTool || !layerManager) return;
    const currentActiveLayer = layerManager.getActiveLayer();
    if (currentActiveLayer && event.target === displayCanvasElement) {
      currentTool.onPointerMove(event, currentActiveLayer, penColor, penSize);
      requestRedraw();
    }
  }

  function handlePointerUp(event: PointerEvent) {
    // ... (handlePointerUp as before)
    if (!currentTool || !layerManager) return;
    const currentActiveLayer = layerManager.getActiveLayer();
    if (currentActiveLayer && event.target === displayCanvasElement) {
      currentTool.onPointerUp(event, currentActiveLayer);
      requestRedraw();
    }
  }

  // Methods to be called by App.svelte (or Toolbar/LayerPanel directly if state is managed here)
  export function addLayer() {
    if (!layerManager) return;
    layerManager.addLayer(undefined, width, height);
    updateExternalState();
    requestRedraw();
  }

  export function clearActiveLayer() {
    if (!layerManager) return;
    const currentActiveLayer = layerManager.getActiveLayer();
    if (currentActiveLayer) {
      currentActiveLayer.context.clearRect(0, 0, currentActiveLayer.canvas.width, currentActiveLayer.canvas.height);
      requestRedraw();
      // TODO: Add to history
    }
  }

  export function setActiveLayer(id: string) {
    if (!layerManager) return;
    layerManager.setActiveLayer(id);
    updateExternalState();
  }

  export function deleteLayer(id: string) {
    if (!layerManager) return;
    layerManager.deleteLayer(id);
    updateExternalState();
    requestRedraw();
  }

  export function toggleLayerVisibility(id: string) {
    if (!layerManager) return;
    layerManager.toggleLayerVisibility(id);
    updateExternalState(); // Though layerManager itself changes isVisible, App needs to know for UI
    requestRedraw();
  }

</script>

<div
  bind:this={containerElement}
  class="canvas-container"
  style="width: 100%; height: 100%; touch-action: none;"
  on:pointerdown={handlePointerDown}
  on:pointermove={handlePointerMove}
  on:pointerup={handlePointerUp}
  on:pointerleave={handlePointerUp}
>
  <canvas bind:this={displayCanvasElement} style="position: absolute; top: 0; left: 0;"></canvas>
</div>

<style>
  /* ... (styles as before) */
  .canvas-container {
    position: relative; /* Already relative, ensure it is for stacking context */
    background-color: #f0f0f0;
    overflow: hidden;
    cursor: crosshair;
    /* Ensure canvas container takes up space for App.svelte's main layout */
    width: 100%;
    height: 100%;
  }
</style>
