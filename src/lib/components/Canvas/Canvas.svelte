<script lang="ts">
  import { tick } from 'svelte';
  import { LayerManager, type ILayer } from '../../core/LayerManager';
  import { PenTool } from '../../core/tools/PenTool';
  import { EraserTool } from '../../core/tools/EraserTool';
  import { FillBucketTool } from '../../core/tools/FillBucketTool';
  import type { ITool } from '../../core/tools/ITool';
  import { HistoryManager, type IHistoryAction, captureCanvasState } from '../../core/HistoryManager';
  import { CanvasHistoryActions, type HistoryActionContext } from './CanvasHistoryActions';
  import { CanvasEventHandlers, type CanvasEventHandlerContext } from './CanvasEventHandlers';
  import { 
    createExportCanvas, 
    createLayerBackup, 
    clearCanvas, 
    canvasToFile,
    type CanvasSize 
  } from '../../core/CanvasUtils';

  // Props - use directly without internal copies
  let {
    penColor = '#000000',
    penSize = 5,
    layers = [],
    activeLayerId = null,
    currentToolType = 'pen',
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

  // Internal State - only what's truly internal to the component
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

  // Handler classes
  let canvasHistoryActions = $state<CanvasHistoryActions | null>(null);
  let canvasEventHandlers = $state<CanvasEventHandlers | null>(null);

  // Tool Switching Effect - simplified to use currentToolType prop directly
  $effect(() => {
    const lm = layerManager;
    const pt = penTool;
    const et = eraserTool;
    const fbt = fillBucketTool;

    if (pt && et && fbt && lm?.getActiveLayer()?.context) {
      const activeCtx = lm.getActiveLayer()!.context;
      let cti = currentToolInstance;

      if (cti?.deactivate && activeCtx) cti.deactivate(activeCtx);

      if (currentToolType === 'pen') {
        currentToolInstance = pt;
      } else if (currentToolType === 'eraser') {
        currentToolInstance = et;
      } else if (currentToolType === 'fill') {
        currentToolInstance = fbt;
      }
      
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

  // Optimized version for operations that only affect specific state parts
  function updateExternalStatePartial(updateLayers = false, updateActiveId = false, updateHistory = false) {
    const lm = layerManager;
    if (!lm) return;
    
    if (updateLayers) {
      onlayersupdate?.(lm.getLayers());
    }
    if (updateActiveId) {
      onactiveidupdate?.(lm.getActiveLayer()?.id || null);
    }
    if (updateHistory) {
      const hm = historyManager;
      if (hm) {
        onhistorychange?.({ canUndo: hm.canUndo(), canRedo: hm.canRedo() });
      }
    }
  }

  function requestRedraw() {
    requestAnimationFrame(drawLayers);
  }

  // Update handler contexts when dependencies change
  $effect(() => {
    if (canvasHistoryActions) {
      const historyContext: HistoryActionContext = {
        layerManager,
        width,
        height,
        requestRedraw,
        updateExternalState,
        updateExternalStatePartial
      };
      canvasHistoryActions.updateContext(historyContext);
    }
  });

  $effect(() => {
    if (canvasEventHandlers) {
      const eventContext: CanvasEventHandlerContext = {
        currentToolInstance,
        layerManager,
        historyManager,
        penColor,
        penSize,
        displayCanvasElement,
        imageDataBeforeStroke,
        requestRedraw,
        updateExternalState,
        updateExternalStatePartial
      };
      canvasEventHandlers.updateContext(eventContext);
    }
  });

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

    // Initialize handler classes
    const historyContext: HistoryActionContext = {
      layerManager,
      width,
      height,
      requestRedraw,
      updateExternalState,
      updateExternalStatePartial
    };
    canvasHistoryActions = new CanvasHistoryActions(historyContext);

    const eventContext: CanvasEventHandlerContext = {
      currentToolInstance,
      layerManager,
      historyManager,
      penColor,
      penSize,
      displayCanvasElement,
      imageDataBeforeStroke,
      requestRedraw,
      updateExternalState,
      updateExternalStatePartial
    };
    canvasEventHandlers = new CanvasEventHandlers(eventContext);

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
    if (canvasEventHandlers) {
      const capturedImageData = canvasEventHandlers.handlePointerDown(event);
      if (capturedImageData !== undefined) {
        imageDataBeforeStroke = capturedImageData;
      }
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (canvasEventHandlers) {
      canvasEventHandlers.handlePointerMove(event);
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (canvasEventHandlers) {
      canvasEventHandlers.handlePointerUp(event, imageDataBeforeStroke);
      imageDataBeforeStroke = undefined;
    }
  }

  function applyHistoryAction(action: IHistoryAction, isUndo: boolean): void {
    if (canvasHistoryActions) {
      canvasHistoryActions.applyHistoryAction(action, isUndo);
    }
  }

  // --- Public API methods will be exported below ---

  async function exportToPNG_impl(): Promise<File | null> {
    const lm = layerManager;
    if (!lm || width === 0 || height === 0 || !imageWidth || !imageHeight) {
      console.error("Cannot export: LayerManager not ready, canvas dimensions are zero, or image dimensions not specified.");
      return null;
    }

    try {
      const visibleLayers = lm.getLayers().filter(l => l.isVisible);
      const currentSize: CanvasSize = { width, height };
      const exportSize: CanvasSize = { width: imageWidth, height: imageHeight };
      
      const { canvas: exportCanvas } = createExportCanvas(
        visibleLayers.map(l => l.canvas),
        currentSize,
        exportSize
      );
      
      return await canvasToFile(exportCanvas, "skvetchy-drawing.png");
    } catch (error) {
      console.error("Failed to export PNG:", error);
      return null;
    }
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
    updateExternalStatePartial(true, true, true);
    requestRedraw();
  }

  export function clearActiveLayer() {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const activeLayer = lm.getActiveLayer();
    if (activeLayer) {
      const beforeState = captureCanvasState(activeLayer.canvas);
      clearCanvas(activeLayer.canvas, activeLayer.context);
      const afterState = captureCanvasState(activeLayer.canvas); // Should be empty
      hm.addHistory({
        type: 'clearLayer',
        layerId: activeLayer.id,
        imageDataBefore: beforeState,
        imageDataAfter: afterState,
      });
      updateExternalStatePartial(false, false, true);
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
    updateExternalStatePartial(false, true, false);
  }

  export function deleteLayer(id: string) {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;

    const layerToDelete = lm.findLayerById(id);
    const layerIndex = lm.findLayerIndexById(id);

    if (layerToDelete) {
        const backup = createLayerBackup(layerToDelete.canvas);
        const deletedLayerDataClone = {
            ...layerToDelete,
            canvas: backup.canvas,
            context: backup.context,
        };
        hm.addHistory({
            type: 'deleteLayer',
            layerId: id,
            deletedLayerData: deletedLayerDataClone,
            deletedLayerIndex: layerIndex
        });
    }
    lm.deleteLayer(id);
    // History action in CanvasHistoryActions will call updateExternalState(false)
    // We only need to update history state
    updateExternalStatePartial(false, false, true);
    requestRedraw();
  }

  export function toggleLayerVisibility(id: string) {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const layer = lm.findLayerById(id);
    if (layer) {
      const visibilityBefore = layer.isVisible;
      lm.toggleLayerVisibility(id);
      hm.addHistory({
        type: 'toggleLayerVisibility',
        layerId: id,
        visibilityBefore: visibilityBefore,
      });
      // History action in CanvasHistoryActions will call updateExternalState(false)
      // We only need to update history state
      updateExternalStatePartial(false, false, true);
      requestRedraw();
    }
  }

  export function reorderLayer(layerId: string, newVisualIndex: number) {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const layer = lm.findLayerById(layerId);
    if (!layer) return;

    const result = lm.reorderLayer(layerId, newVisualIndex);
    if (result) {
        hm.addHistory({
            type: 'reorderLayer',
            layerId: layerId,
            meta: { oldVisualIndex: result.oldVisualIndex, newVisualIndex: result.newVisualIndex, targetLayerId: layerId }
        });
        // History action in CanvasHistoryActions will call updateExternalState(false)
        // We only need to update history state
        updateExternalStatePartial(false, false, true);
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
      // History action in CanvasHistoryActions will call updateExternalState(false)
      // We only need to update history state
      updateExternalStatePartial(false, false, true);
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
