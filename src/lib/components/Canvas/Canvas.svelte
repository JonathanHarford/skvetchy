<script lang="ts">
  import { onMount, tick, createEventDispatcher } from 'svelte';
  import { LayerManager, type ILayer } from '../../core/LayerManager';
  import { PenTool } from '../../core/tools/PenTool';
  import { EraserTool } from '../../core/tools/EraserTool'; // Import EraserTool
  import type { ITool } from '../../core/tools/ITool';
  import { HistoryManager, type IHistoryAction, captureCanvasState, ActionType } from '../../core/HistoryManager'; // Import HistoryManager

  // Props from App.svelte
  export let penColor = '#000000';
  export let penSize = 5;
  export let layers: readonly ILayer[] = []; // Bound from App, updated via dispatch
  export let activeLayerId: string | null = null; // Bound from App, updated via dispatch

  // Event dispatcher for App.svelte
  const dispatch = createEventDispatcher<{
    layersupdate: readonly ILayer[];
    activeidupdate: string | null;
    historychange: { canUndo: boolean, canRedo: boolean }; // For toolbar buttons
  }>();

  let containerElement: HTMLDivElement;
  let displayCanvasElement: HTMLCanvasElement;
  let displayCtx: CanvasRenderingContext2D | null = null;

  let width = 0;
  let height = 0;

  let layerManager: LayerManager;
  let historyManager: HistoryManager; // Instance of HistoryManager

  // Tool management
  let currentToolInstance: ITool;
  let penTool: PenTool;
  let eraserTool: EraserTool;
  export let currentToolType: 'pen' | 'eraser' = 'pen'; // Controlled by Toolbar via App.svelte

  // For capturing state before a stroke
  let imageDataBeforeStroke: string | undefined = undefined;

  // Reactive update when tool type changes
  $: if (penTool && eraserTool && layerManager?.getActiveLayer()?.context) {
    const activeCtx = layerManager.getActiveLayer()?.context;
    if (currentToolInstance?.deactivate && activeCtx) currentToolInstance.deactivate(activeCtx);

    if (currentToolType === 'pen') {
      currentToolInstance = penTool;
    } else if (currentToolType === 'eraser') {
      currentToolInstance = eraserTool;
    }
    if (currentToolInstance?.activate && activeCtx) currentToolInstance.activate(activeCtx);
    requestRedraw(); // Redraw if tool change affects appearance (e.g. cursor, though not implemented yet)
  }


  function updateExternalState(dispatchHistoryChange = true) {
    layers = layerManager.getLayers();
    activeLayerId = layerManager.getActiveLayer()?.id || null;
    dispatch('layersupdate', layers);
    dispatch('activeidupdate', activeLayerId);
    if (dispatchHistoryChange && historyManager) {
      dispatch('historychange', { canUndo: historyManager.canUndo(), canRedo: historyManager.canRedo() });
    }
  }

  async function initializeCanvas() {
    await tick();

    if (!displayCanvasElement) return;
    displayCtx = displayCanvasElement.getContext('2d');
    if (!displayCtx) return;

    layerManager = new LayerManager(width, height);
    historyManager = new HistoryManager(); // Initialize
    penTool = new PenTool();
    eraserTool = new EraserTool();
    currentToolInstance = penTool; // Default tool

    const activeCtx = layerManager.getActiveLayer()?.context;
    if (activeCtx && currentToolInstance.activate) currentToolInstance.activate(activeCtx);

    updateExternalState();
    requestRedraw();
  }

  onMount(() => {
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
          // TODO: Consider how history is affected by resize. For now, it's not handled.
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
    if (!displayCtx || !layerManager) return;
    displayCtx.clearRect(0, 0, width, height);
    const visibleLayers = layerManager.getLayers().filter(l => l.isVisible);
    for (const layer of visibleLayers) {
      displayCtx.drawImage(layer.canvas, 0, 0);
    }
  }

  function handlePointerDown(event: PointerEvent) {
    if (!currentToolInstance || !layerManager) return;
    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement) {
      // Capture state BEFORE drawing for undo
      imageDataBeforeStroke = captureCanvasState(activeLayer.canvas);

      const pressure = event.pressure !== 0.5 ? event.pressure : undefined; // PointerEvent pressure defaults to 0.5 if not available
      currentToolInstance.onPointerDown(event, activeLayer, penColor, penSize, pressure);
      // No redraw here, actual drawing is on offscreen layer canvas
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (!currentToolInstance || !layerManager) return;
    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement && (event.buttons === 1 || event.pointerType === 'touch')) { // Check if primary button is pressed
      const pressure = event.pressure !== 0.5 ? event.pressure : undefined;
      currentToolInstance.onPointerMove(event, activeLayer, penColor, penSize, pressure);
      requestRedraw();
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!currentToolInstance || !layerManager) return;
    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement && imageDataBeforeStroke) {
      currentToolInstance.onPointerUp(event, activeLayer);

      const imageDataAfterStroke = captureCanvasState(activeLayer.canvas);
      if (imageDataBeforeStroke !== imageDataAfterStroke) { // Only add history if something changed
        historyManager.addHistory({
          type: 'stroke',
          layerId: activeLayer.id,
          imageDataBefore: imageDataBeforeStroke,
          imageDataAfter: imageDataAfterStroke,
        });
        updateExternalState(); // Update history buttons
      }
      imageDataBeforeStroke = undefined; // Reset for next stroke
      requestRedraw();
    } else if (imageDataBeforeStroke) {
      // If pointer up happens outside, but a stroke was started
      imageDataBeforeStroke = undefined;
    }
  }

  // Function to apply history actions (called by HistoryManager)
  function applyHistoryAction(action: IHistoryAction, isUndo: boolean): void {
    const layer = layerManager.getLayers().find(l => l.id === action.layerId);
    // Updated condition to include 'reorderLayer' which might not have a layer if it was deleted then reordered.
    if (!layer && action.type !== 'addLayer' && action.type !== 'deleteLayer' && action.type !== 'reorderLayer') {
        console.warn('Layer not found for history action:', action);
        return;
    }

    switch (action.type) {
      case 'stroke':
      case 'clearLayer': // clearLayer also uses imageDataBefore/After
        if (layer) {
          const imageDataToRestore = isUndo ? action.imageDataBefore : action.imageDataAfter;
          if (imageDataToRestore) {
            const img = new Image();
            img.onload = () => {
              layer.context.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
              layer.context.drawImage(img, 0, 0);
              requestRedraw();
            };
            img.src = imageDataToRestore;
          }
        }
        break;
      case 'addLayer':
        if (isUndo) { // Undo adding a layer = delete it
            if (action.layerId) layerManager.deleteLayer(action.layerId);
        } else { // Redo adding a layer = re-create it (simplistic, assumes it was last)
            // This part is tricky. The original addLayer in LayerManager creates a new ID.
            // For true redo, we might need to store more info about the layer or make LayerManager accept an ID.
            // For now, let's assume addLayer in LayerManager can be called.
            // A proper redo would need to restore the exact layer with its content and ID.
            // This is a simplification:
            layerManager.addLayer(undefined, width, height); // This will create a new layer with a new ID.
        }
        break;
      case 'deleteLayer':
        if (isUndo) { // Undo deleting a layer = re-add it
            if (action.deletedLayerData) {
                layerManager.addLayerWithData(action.deletedLayerData, action.deletedLayerIndex);
            }
        } else { // Redo deleting a layer = delete it again
            if (action.layerId) layerManager.deleteLayer(action.layerId);
        }
        break;
      case 'toggleLayerVisibility':
        if (layer) {
            layer.isVisible = isUndo ? action.visibilityBefore! : !action.visibilityBefore!;
        }
        break;
      case 'reorderLayer':
        if (action.meta && action.meta.targetLayerId && action.meta.oldVisualIndex !== undefined && action.meta.newVisualIndex !== undefined) {
            const targetId = action.meta.targetLayerId as string;
            const newIndex = (isUndo ? action.meta.oldVisualIndex : action.meta.newVisualIndex) as number;
            // We need to find the layer and tell LayerManager to move it to 'newIndex'
            // The LayerManager.reorderLayer is already designed to place it at a specific visual index.
            layerManager.reorderLayer(targetId, newIndex);
            // Note: This assumes reorderLayer correctly updates z-indices based on visual array order.
        }
        break;
      // Add other cases as new actions are implemented
    }
    updateExternalState(false); // Update UI, but don't dispatch another history change from here
    requestRedraw();
  }

  // --- Methods for App.svelte to call ---
  export function undo() {
    if (!historyManager) return;
    historyManager.undo(applyHistoryAction);
    updateExternalState();
  }

  export function redo() {
    if (!historyManager) return;
    historyManager.redo(applyHistoryAction);
    updateExternalState();
  }

  export function addLayer() {
    if (!layerManager) return;
    const newLayer = layerManager.addLayer(undefined, width, height);
    // History for addLayer (minimal for now, can be enhanced)
    historyManager.addHistory({
        type: 'addLayer',
        layerId: newLayer.id, // Store the ID of the new layer
    });
    updateExternalState();
    requestRedraw();
  }

  export function clearActiveLayer() {
    if (!layerManager) return;
    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer) {
      const beforeState = captureCanvasState(activeLayer.canvas);
      activeLayer.context.clearRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
      const afterState = captureCanvasState(activeLayer.canvas);
      historyManager.addHistory({
        type: 'clearLayer',
        layerId: activeLayer.id,
        imageDataBefore: beforeState,
        imageDataAfter: afterState, // Will be empty, but consistent
      });
      updateExternalState();
      requestRedraw();
    }
  }

  export function setActiveLayer(id: string) {
    if (!layerManager) return;
    const oldActiveLayer = layerManager.getActiveLayer();
    layerManager.setActiveLayer(id);
    const newActiveLayer = layerManager.getActiveLayer();

    // Deactivate old tool on old layer's context, activate on new layer's context
    if (currentToolInstance?.deactivate && oldActiveLayer?.context) currentToolInstance.deactivate(oldActiveLayer.context);
    if (currentToolInstance?.activate && newActiveLayer?.context) currentToolInstance.activate(newActiveLayer.context);

    updateExternalState();
  }

  export function deleteLayer(id: string) {
    if (!layerManager) return;
    const layerToDelete = layerManager.getLayers().find(l => l.id === id);
    const layerIndex = layerManager.getLayers().findIndex(l => l.id === id);

    if (layerToDelete) {
        // Clone layer data for history, especially its canvas content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layerToDelete.canvas.width;
        tempCanvas.height = layerToDelete.canvas.height;
        tempCanvas.getContext('2d')?.drawImage(layerToDelete.canvas, 0, 0);

        const deletedLayerDataClone: ILayer = {
            ...layerToDelete,
            canvas: tempCanvas, // Store a copy of the canvas
            context: tempCanvas.getContext('2d')!, // This context is for the clone
        };

        historyManager.addHistory({
            type: 'deleteLayer',
            layerId: id,
            deletedLayerData: deletedLayerDataClone,
            deletedLayerIndex: layerIndex
        });
    }
    layerManager.deleteLayer(id);
    updateExternalState();
    requestRedraw();
  }

  export function toggleLayerVisibility(id: string) {
    if (!layerManager) return;
    const layer = layerManager.getLayers().find(l => l.id === id);
    if (layer) {
      const visibilityBefore = layer.isVisible;
      layerManager.toggleLayerVisibility(id); // This method is in LayerManager
      historyManager.addHistory({
        type: 'toggleLayerVisibility',
        layerId: id,
        visibilityBefore: visibilityBefore,
      });
      updateExternalState();
      requestRedraw();
    }
  }

export function reorderLayer(layerId: string, newVisualIndex: number) {
    if (!layerManager || !historyManager) return;

    const layer = layerManager.getLayers().find(l => l.id === layerId);
    if (!layer) return;

    const originalOrder = layerManager.getLayers().map(l => l.id);
    const oldVisualIndex = originalOrder.indexOf(layerId);


    const result = layerManager.reorderLayer(layerId, newVisualIndex);

    if (result) {
        historyManager.addHistory({
            type: 'reorderLayer',
            layerId: layerId,
            // Store enough info to undo/redo the reorder.
            // For simplicity, we can store the new and old visual index.
            // A more robust way might be to store the full layer order before/after.
            meta: { oldVisualIndex: result.oldVisualIndex, newVisualIndex: result.newVisualIndex, targetLayerId: layerId }
        });
        updateExternalState();
        requestRedraw();
    }
}
  // Make currentToolType reactive from props for App.svelte to control
  $: if(currentToolType && penTool && eraserTool) { // Check if tools are initialized
    const activeCtx = layerManager?.getActiveLayer()?.context;
    if (currentToolInstance?.deactivate && activeCtx) currentToolInstance.deactivate(activeCtx);

    if (currentToolType === 'pen') currentToolInstance = penTool;
    else if (currentToolType === 'eraser') currentToolInstance = eraserTool;

    if (currentToolInstance?.activate && activeCtx) currentToolInstance.activate(activeCtx);
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
  .canvas-container {
    position: relative;
    background-color: #f0f0f0;
    overflow: hidden;
    cursor: crosshair;
    width: 100%;
    height: 100%;
  }
</style>
