<script lang="ts">
  import { onMount, tick, createEventDispatcher } from 'svelte';
  import { LayerManager, type ILayer } from '../../core/LayerManager';
  import { PenTool } from '../../core/tools/PenTool';
  import { EraserTool } from '../../core/tools/EraserTool';
  import type { ITool } from '../../core/tools/ITool';
  import { HistoryManager, type IHistoryAction, captureCanvasState, type ActionType } from '../../core/HistoryManager';

  // Props from App.svelte
  export let penColor = '#000000';
  export let penSize = 5;
  export let layers: readonly ILayer[] = []; // Bound from App, updated via dispatch
  export let activeLayerId: string | null = null; // Bound from App, updated via dispatch
  export let currentToolType: 'pen' | 'eraser' = 'pen'; // Controlled by parent component
  
  // Image export dimensions
  export let imageWidth: number;
  export let imageHeight: number;

  // Event dispatcher for App.svelte
  const dispatch = createEventDispatcher<{
    layersupdate: readonly ILayer[];
    activeidupdate: string | null;
    historychange: { canUndo: boolean, canRedo: boolean }; // For undo/redo buttons
  }>();

  let containerElement: HTMLDivElement;
  let displayCanvasElement: HTMLCanvasElement;
  let displayCtx: CanvasRenderingContext2D | null = null;

  let width = 0;
  let height = 0;

  let layerManager: LayerManager;
  let historyManager: HistoryManager;

  // Tool management
  let currentToolInstance: ITool;
  let penTool: PenTool;
  let eraserTool: EraserTool;

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
    historyManager = new HistoryManager();
    penTool = new PenTool();
    eraserTool = new EraserTool();
    currentToolInstance = penTool;

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

      // Improved pressure detection for Apple Pencil and other pressure-sensitive devices
      // Only treat pressure as unavailable if it's exactly 0.5 AND the device doesn't support pressure
      // or if pressure is 0 (which typically indicates no pressure support)
      let pressure: number | undefined;
      if (event.pressure === 0) {
        // Pressure is 0 - device likely doesn't support pressure
        pressure = undefined;
      } else if (event.pressure === 0.5 && event.pointerType !== 'pen') {
        // Pressure is 0.5 and it's not a pen device - likely default value
        pressure = undefined;
      } else {
        // Use the actual pressure value (including legitimate 0.5 values from Apple Pencil)
        pressure = event.pressure;
      }
      
      currentToolInstance.onPointerDown(event, activeLayer, penColor, penSize, pressure);
      // No redraw here, actual drawing is on offscreen layer canvas
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (!currentToolInstance || !layerManager) return;
    const activeLayer = layerManager.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement && (event.buttons === 1 || event.pointerType === 'touch')) { // Check if primary button is pressed
      // Apply the same improved pressure detection logic
      let pressure: number | undefined;
      if (event.pressure === 0) {
        pressure = undefined;
      } else if (event.pressure === 0.5 && event.pointerType !== 'pen') {
        pressure = undefined;
      } else {
        pressure = event.pressure;
      }
      
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
      case 'renameLayer':
        if (action.meta && action.meta.oldName !== undefined && action.meta.newName !== undefined) {
            const nameToSet = (isUndo ? action.meta.oldName : action.meta.newName) as string;
            // Directly set the name if LayerManager's renameLayer is complex or has side effects not desired during undo/redo
            const layer = layerManager.getLayers().find(l => l.id === action.layerId);
            if (layer) {
                layer.name = nameToSet;
                // updateExternalState(); // Called by top-level undo/redo
                // requestRedraw(); // Not needed for name change
            }
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
        layerId: newLayer.id,
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
            canvas: tempCanvas,
            context: tempCanvas.getContext('2d')!,
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

export function renameLayer(layerId: string, newName: string) {
    if (!layerManager || !historyManager) return;

    const result = layerManager.renameLayer(layerId, newName);

    if (result) { // Only add history if name actually changed
      historyManager.addHistory({
        type: 'renameLayer',
        layerId: layerId,
        meta: { oldName: result.oldName, newName: newName }
      });
      updateExternalState(); // This will trigger layersupdate for LayerPanel
      // No explicit requestRedraw needed as name change doesn't affect canvas pixels
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

export async function exportToPNG(): Promise<File | null> {
    if (!layerManager || width === 0 || height === 0 || !imageWidth || !imageHeight) {
      console.error("Cannot export: LayerManager not ready, canvas dimensions are zero, or image dimensions not specified.");
      return null;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageWidth;
    tempCanvas.height = imageHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      console.error("Failed to get context for temporary export canvas.");
      return null;
    }

    // Calculate scaling factors to fit the viewport content into the export dimensions
    const scaleX = imageWidth / width;
    const scaleY = imageHeight / height;

    // Apply scaling to match the export resolution
    tempCtx.scale(scaleX, scaleY);

    // Draw a background if needed (e.g. if your app has a non-transparent bg not part of layers)
    // tempCtx.fillStyle = '#ffffff'; // Or whatever background color is desired
    // tempCtx.fillRect(0, 0, width, height);

    const visibleLayers = layerManager.getLayers().filter(l => l.isVisible);
    for (const layer of visibleLayers) {
      tempCtx.drawImage(layer.canvas, 0, 0);
    }

    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "skvetchy-drawing.png", { type: "image/png" });
          resolve(file);
        } else {
          console.error("Failed to create blob for PNG export.");
          resolve(null);
        }
      }, 'image/png');
    });
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
