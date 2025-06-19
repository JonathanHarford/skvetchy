<script lang="ts">
  import { tick } from 'svelte';
  import { LayerManager, type ILayer } from '../../core/LayerManager';
  import { PenTool } from '../../core/tools/PenTool';
  import { EraserTool } from '../../core/tools/EraserTool';
  import { FillBucketTool } from '../../core/tools/FillBucketTool';
  import type { ITool } from '../../core/tools/ITool';
  import { HistoryManager, type IHistoryAction, captureCanvasState } from '../../core/HistoryManager';

  // Props
  let {
    penColor: initialPenColor = '#000000', // Renamed to avoid conflict if penColor becomes $state
    penSize: initialPenSize = 5,         // Renamed
    layers: initialLayers = [],
    activeLayerId: initialActiveLayerId = null,
    currentToolType: initialCurrentToolType = 'pen',
    imageWidth,
    imageHeight,
    onlayersupdate,
    onactiveidupdate,
    onhistorychange
  } = $props<{
    penColor?: string;
    penSize?: number;
    layers?: readonly ILayer[];
    activeLayerId?: string | null;
    currentToolType?: 'pen' | 'eraser' | 'fill';
    imageWidth: number;
    imageHeight: number;
    onlayersupdate?: (layers: readonly ILayer[]) => void;
    onactiveidupdate?: (activeLayerId: string | null) => void;
    onhistorychange?: (state: { canUndo: boolean, canRedo: boolean }) => void;
  }>();

  // Internal State
  let displayCanvasElement = $state<HTMLCanvasElement | null>(null);
  let containerElement = $state<HTMLDivElement | null>(null);
  let displayCtx = $state<CanvasRenderingContext2D | null>(null);

  let width = $state(0);
  let height = $state(0);

  let layerManager = $state<LayerManager | null>(null);
  let historyManager = $state<HistoryManager | null>(null);

  let currentToolInstance = $state<ITool | null>(null);
  let penTool = $state<PenTool | null>(null);
  let eraserTool = $state<EraserTool | null>(null);
  let fillBucketTool = $state<FillBucketTool | null>(null);

  let imageDataBeforeStroke = $state<string | undefined>(undefined);

  // Component's own reactive state, initialized by props
  // These props are passed down from Skvetchy.svelte which also holds them as $state
  // This component will receive new values if they change in Skvetchy.svelte
  // For layers and activeLayerId, this component dispatches events when they change
  // internally, and Skvetchy.svelte updates its state, which then flows back down.
  // So, direct assignment from props here is correct for initial values and prop updates.
  let penColor = $state(initialPenColor);
  let penSize = $state(initialPenSize);
  let currentToolType = $state(initialCurrentToolType); // Internal reactive copy of the prop
  // 'layers' and 'activeLayerId' are primarily managed by LayerManager and updated via events.
  // They are passed as props for initial setup and potentially if parent forces a state.

  // Prop synchronization effects
  $effect(() => {
    penColor = initialPenColor;
  });

  $effect(() => {
    penSize = initialPenSize;
  });

  $effect(() => {
    // This effect handles changes to the initialCurrentToolType prop
    // and updates the internal currentToolType state.
    currentToolType = initialCurrentToolType;
  });

  // Tool Switching Effect
  $effect(() => {
    const lm = layerManager;
    const pt = penTool;
    const et = eraserTool;
    const fbt = fillBucketTool;
    const toolType = currentToolType; // Use the internal $state variable for reactivity

    if (pt && et && fbt && lm?.getActiveLayer()?.context) {
      const activeCtx = lm.getActiveLayer()!.context; // Not null due to check
      let cti = currentToolInstance;

      if (cti?.deactivate && activeCtx) cti.deactivate(activeCtx);

      if (toolType === 'pen') {
        currentToolInstance = pt;
      } else if (toolType === 'eraser') {
        currentToolInstance = et;
      } else if (toolType === 'fill') {
        currentToolInstance = fbt;
      }
      // Re-assign to cti to ensure we use the updated instance for activate
      cti = currentToolInstance;
      if (cti?.activate && activeCtx) cti.activate(activeCtx);
      requestRedraw();
    }
  });

  function updateExternalState(dispatchHistoryChange = true) {
    const lm = layerManager;
    if (!lm) return;
    // Call callback props for parent
    onlayersupdate?.(lm.getLayers());
    onactiveidupdate?.(lm.getActiveLayer()?.id || null);

    const hm = historyManager;
    if (dispatchHistoryChange && hm) {
      onhistorychange?.({ canUndo: hm.canUndo(), canRedo: hm.canRedo() });
    }
  }

  async function initializeCanvas() {
    await tick();
    const currentDisplayCanvasElement = displayCanvasElement;

    if (!currentDisplayCanvasElement) return;
    const ctx = currentDisplayCanvasElement.getContext('2d');
    if (!ctx) return;
    displayCtx = ctx;

    layerManager = new LayerManager(width, height);
    historyManager = new HistoryManager();
    penTool = new PenTool();
    eraserTool = new EraserTool();
    fillBucketTool = new FillBucketTool();

    // Set initial tool based on the currentToolType state
    if (currentToolType === 'pen') currentToolInstance = penTool;
    else if (currentToolType === 'eraser') currentToolInstance = eraserTool;
    else if (currentToolType === 'fill') currentToolInstance = fillBucketTool;
    else currentToolInstance = penTool; // Default fallback

    const activeLayerCtx = layerManager?.getActiveLayer()?.context;
    if (activeLayerCtx && currentToolInstance?.activate) {
       currentToolInstance.activate(activeLayerCtx);
    }

    updateExternalState();
    requestRedraw();
  }

  // Lifecycle: ResizeObserver and Initialization
  $effect(() => {
    const currentContainerEl = containerElement;
    if (currentContainerEl) {
      // Function to wait for actual dimensions
      const waitForDimensions = (): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
          const checkDimensions = () => {
            const rect = currentContainerEl.getBoundingClientRect();
            const clientWidth = currentContainerEl.clientWidth;
            const clientHeight = currentContainerEl.clientHeight;
            
            // Check if we have actual dimensions (not zero)
            if (clientWidth > 0 && clientHeight > 0) {
              resolve({ width: clientWidth, height: clientHeight });
            } else {
              // Use requestAnimationFrame to check again on next frame
              requestAnimationFrame(checkDimensions);
            }
          };
          checkDimensions();
        });
      };

      // Initialize with proper dimensions
      const initializeWithDimensions = async () => {
        const dimensions = await waitForDimensions();
        width = dimensions.width;
        height = dimensions.height;
        
        const currentDisplayEl = displayCanvasElement;
        if (currentDisplayEl) {
          currentDisplayEl.width = width;
          currentDisplayEl.height = height;
        }
        
        // Initialize canvas only after we have proper dimensions
        await initializeCanvas();
      };

      const resizeObserver = new ResizeObserver(async entries => {
        for (let entry of entries) {
          const newWidth = entry.contentRect.width;
          const newHeight = entry.contentRect.height;
          
          // Only update if dimensions actually changed and are valid
          if (newWidth > 0 && newHeight > 0 && (newWidth !== width || newHeight !== height)) {
            width = newWidth;
            height = newHeight;
            
            const currentDisplayEl = displayCanvasElement;
            if (currentDisplayEl) {
              currentDisplayEl.width = width;
              currentDisplayEl.height = height;
            }
            
            const lm = layerManager;
            if (lm) {
              lm.resizeLayers(width, height);
              requestRedraw();
            }
          }
        }
      });
      
      resizeObserver.observe(currentContainerEl);
      
      // Initialize with proper dimension checking
      initializeWithDimensions();

      return () => {
        resizeObserver.unobserve(currentContainerEl);
      };
    }
  });

  function requestRedraw() {
    requestAnimationFrame(drawLayers);
  }

  function drawLayers() {
    const currentDisplayCtx = displayCtx;
    const lm = layerManager;
    if (!currentDisplayCtx || !lm) return;
    currentDisplayCtx.clearRect(0, 0, width, height);
    const visibleLayers = lm.getLayers().filter(l => l.isVisible);
    for (const layer of visibleLayers) {
      currentDisplayCtx.drawImage(layer.canvas, 0, 0);
    }
  }

  function handlePointerDown(event: PointerEvent) {
    const cti = currentToolInstance;
    const lm = layerManager;
    if (!cti || !lm) return;

    const activeLayer = lm.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement) {
      imageDataBeforeStroke = captureCanvasState(activeLayer.canvas);
      let pressure: number | undefined;
      if (event.pressure === 0) pressure = undefined;
      else if (event.pressure === 0.5 && event.pointerType !== 'pen') pressure = undefined;
      else pressure = event.pressure;
      
      cti.onPointerDown(event, activeLayer, penColor, penSize, pressure);
    }
  }

  function handlePointerMove(event: PointerEvent) {
    const cti = currentToolInstance;
    const lm = layerManager;
    if (!cti || !lm) return;

    const activeLayer = lm.getActiveLayer();
    if (activeLayer && event.target === displayCanvasElement && (event.buttons === 1 || event.pointerType === 'touch')) {
      let pressure: number | undefined;
      if (event.pressure === 0) pressure = undefined;
      else if (event.pressure === 0.5 && event.pointerType !== 'pen') pressure = undefined;
      else pressure = event.pressure;
      
      cti.onPointerMove(event, activeLayer, penColor, penSize, pressure);
      requestRedraw();
    }
  }

  function handlePointerUp(event: PointerEvent) {
    const cti = currentToolInstance;
    const lm = layerManager;
    const hm = historyManager;
    if (!cti || !lm || !hm) return;

    const activeLayer = lm.getActiveLayer();
    const ibs = imageDataBeforeStroke; // Use local copy of $state variable

    if (activeLayer && event.target === displayCanvasElement && ibs) {
      cti.onPointerUp(event, activeLayer);
      const imageDataAfterStroke = captureCanvasState(activeLayer.canvas);
      if (ibs !== imageDataAfterStroke) {
        hm.addHistory({
          type: 'stroke',
          layerId: activeLayer.id,
          imageDataBefore: ibs,
          imageDataAfter: imageDataAfterStroke,
        });
        updateExternalState();
      }
      imageDataBeforeStroke = undefined;
      requestRedraw();
    } else if (ibs) {
      imageDataBeforeStroke = undefined;
    }
  }

  function applyHistoryAction(action: IHistoryAction, isUndo: boolean): void {
    const lm = layerManager;
    if(!lm) return;
    const layerToActOn = lm.getLayers().find(l => l.id === action.layerId);

    if (!layerToActOn && action.type !== 'addLayer' && action.type !== 'deleteLayer' && action.type !== 'reorderLayer') {
        console.warn('Layer not found for history action:', action);
        return;
    }

    switch (action.type) {
      case 'stroke':
      case 'clearLayer':
        if (layerToActOn) {
          const imageDataToRestore = isUndo ? action.imageDataBefore : action.imageDataAfter;
          if (imageDataToRestore) {
            const img = new Image();
            img.onload = () => {
              layerToActOn.context.clearRect(0, 0, layerToActOn.canvas.width, layerToActOn.canvas.height);
              layerToActOn.context.drawImage(img, 0, 0);
              requestRedraw();
            };
            img.src = imageDataToRestore;
          }
        }
        break;
      case 'addLayer':
        if (isUndo) {
            if (action.layerId) lm.deleteLayer(action.layerId);
        } else {
            lm.addLayer(undefined, width, height);
        }
        break;
      case 'deleteLayer':
        if (isUndo) {
            if (action.deletedLayerData) {
                lm.addLayerWithData(action.deletedLayerData, action.deletedLayerIndex);
            }
        } else {
            if (action.layerId) lm.deleteLayer(action.layerId);
        }
        break;
      case 'toggleLayerVisibility':
        if (layerToActOn && action.visibilityBefore !== undefined) { // Ensure visibilityBefore is defined
            layerToActOn.isVisible = isUndo ? action.visibilityBefore : !action.visibilityBefore;
        }
        break;
      case 'reorderLayer':
        if (action.meta && action.meta.targetLayerId && action.meta.oldVisualIndex !== undefined && action.meta.newVisualIndex !== undefined) {
            const targetId = action.meta.targetLayerId as string;
            const newIndex = (isUndo ? action.meta.oldVisualIndex : action.meta.newVisualIndex) as number;
            lm.reorderLayer(targetId, newIndex);
        }
        break;
      case 'renameLayer':
        if (layerToActOn && action.meta && action.meta.oldName !== undefined && action.meta.newName !== undefined) {
            const nameToSet = (isUndo ? action.meta.oldName : action.meta.newName) as string;
            layerToActOn.name = nameToSet;
        }
        break;
    }
    updateExternalState(false);
    requestRedraw();
  }

  // --- Public API methods will be exported below ---

  async function exportToPNG_impl(): Promise<File | null> {
    const lm = layerManager;
    if (!lm || width === 0 || height === 0 || !imageWidth || !imageHeight) {
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
    const scaleX = imageWidth / width;
    const scaleY = imageHeight / height;
    tempCtx.scale(scaleX, scaleY);
    const visibleLayers = lm.getLayers().filter(l => l.isVisible);
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

  // Svelte 5 method exposure - export functions to make them available on component instance
  export function undo() {
    const hm = historyManager;
    if (!hm) return;
    hm.undo(applyHistoryAction);
    updateExternalState();
  }

  export function redo() {
    const hm = historyManager;
    if (!hm) return;
    hm.redo(applyHistoryAction);
    updateExternalState();
  }

  export function addLayer() {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const newLayer = lm.addLayer(undefined, width, height);
    hm.addHistory({ type: 'addLayer', layerId: newLayer.id });
    updateExternalState();
    requestRedraw();
  }

  export function clearActiveLayer() {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const activeLayer = lm.getActiveLayer();
    if (activeLayer) {
      const beforeState = captureCanvasState(activeLayer.canvas);
      activeLayer.context.clearRect(0, 0, activeLayer.canvas.width, activeLayer.canvas.height);
      const afterState = captureCanvasState(activeLayer.canvas); // Should be empty
      hm.addHistory({
        type: 'clearLayer',
        layerId: activeLayer.id,
        imageDataBefore: beforeState,
        imageDataAfter: afterState,
      });
      updateExternalState();
      requestRedraw();
    }
  }

  export function setActiveLayer(id: string) {
    const lm = layerManager;
    if (!lm) return;
    const oldActiveLayer = lm.getActiveLayer();
    lm.setActiveLayer(id);
    const newActiveLayer = lm.getActiveLayer();
    const cti = currentToolInstance;

    if (cti?.deactivate && oldActiveLayer?.context) cti.deactivate(oldActiveLayer.context);
    if (cti?.activate && newActiveLayer?.context) cti.activate(newActiveLayer.context);
    updateExternalState(); // Dispatch activeidupdate
  }

  export function deleteLayer(id: string) {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;

    const layerToDelete = lm.getLayers().find(l => l.id === id);
    const layerIndex = lm.getLayers().findIndex(l => l.id === id);

    if (layerToDelete) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = layerToDelete.canvas.width;
        tempCanvas.height = layerToDelete.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) tempCtx.drawImage(layerToDelete.canvas, 0, 0);

        const deletedLayerDataClone = {
            ...layerToDelete,
            canvas: tempCanvas,
            context: tempCtx!, // We know it's not null because we used it to draw
        };
        hm.addHistory({
            type: 'deleteLayer',
            layerId: id,
            deletedLayerData: deletedLayerDataClone,
            deletedLayerIndex: layerIndex
        });
    }
    lm.deleteLayer(id);
    updateExternalState();
    requestRedraw();
  }

  export function toggleLayerVisibility(id: string) {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const layer = lm.getLayers().find(l => l.id === id);
    if (layer) {
      const visibilityBefore = layer.isVisible;
      lm.toggleLayerVisibility(id);
      hm.addHistory({
        type: 'toggleLayerVisibility',
        layerId: id,
        visibilityBefore: visibilityBefore,
      });
      updateExternalState();
      requestRedraw();
    }
  }

  export function reorderLayer(layerId: string, newVisualIndex: number) {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const layer = lm.getLayers().find(l => l.id === layerId);
    if (!layer) return;

    const result = lm.reorderLayer(layerId, newVisualIndex);
    if (result) {
        hm.addHistory({
            type: 'reorderLayer',
            layerId: layerId,
            meta: { oldVisualIndex: result.oldVisualIndex, newVisualIndex: result.newVisualIndex, targetLayerId: layerId }
        });
        updateExternalState();
        requestRedraw();
    }
  }

  export function renameLayer(layerId: string, newName: string) {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const result = lm.renameLayer(layerId, newName);
    if (result) {
      hm.addHistory({
        type: 'renameLayer',
        layerId: layerId,
        meta: { oldName: result.oldName, newName: newName }
      });
      updateExternalState();
    }
  }

  export function exportToPNG() {
    return exportToPNG_impl();
  }

</script>

<div
  bind:this={containerElement}
  class="canvas-container"
  style="width: 100%; height: 100%; touch-action: none;"
  onpointerdown={handlePointerDown}
  onpointermove={handlePointerMove}
  onpointerup={handlePointerUp}
  onpointerleave={handlePointerUp}
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
