<script lang="ts">
  import { tick } from 'svelte';
  import { LayerManager, type ILayer } from '../../core/LayerManager';
  import { PenTool } from '../../core/tools/PenTool';
  import { EraserTool } from '../../core/tools/EraserTool';
  import { FillBucketTool } from '../../core/tools/FillBucketTool';
  import type { ITool } from '../../core/tools/ITool';
  import { HistoryManager, type IHistoryAction, captureCanvasState, captureCanvasStateOptimized } from '../../core/HistoryManager';
  import { CanvasHistoryActions, type HistoryActionContext } from './CanvasHistoryActions';
  import { CanvasEventHandlers, type CanvasEventHandlerContext } from './CanvasEventHandlers';
  import { 
    createExportCanvas, 
    createLayerBackup, 
    clearCanvas, 
    canvasToFile,
    type CanvasSize 
  } from '../../core/CanvasUtils';
  import { debounce } from '../../utils/debounce';

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

  let imageDataBeforeStroke = $state<{ data: Uint8Array; size: { width: number; height: number } } | undefined>(undefined);

  // Handler classes
  let canvasHistoryActions = $state<CanvasHistoryActions | null>(null);
  let canvasEventHandlers = $state<CanvasEventHandlers | null>(null);

  // Consolidated effect for tool switching and handler context updates
  $effect(() => {
    const context = {
      layerManager,
      historyManager,
      currentToolInstance,
      penTool,
      eraserTool,
      fillBucketTool,
      currentToolType,
      penColor,
      penSize,
      displayCanvasElement,
      imageDataBeforeStroke,
      width,
      height,
      requestRedraw,
      updateExternalState,
      updateExternalStatePartial
    };
    
    updateToolAndContext(context);
    updateHandlerContexts(context);
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

  function updateToolAndContext(context: any) {
    const { layerManager, penTool, eraserTool, fillBucketTool, currentToolType } = context;
    
    if (penTool && eraserTool && fillBucketTool && layerManager?.getActiveLayer()?.context) {
      const activeCtx = layerManager.getActiveLayer()!.context;
      let cti = currentToolInstance;

      if (cti?.deactivate && activeCtx) cti.deactivate(activeCtx);

      if (currentToolType === 'pen') {
        currentToolInstance = penTool;
      } else if (currentToolType === 'eraser') {
        currentToolInstance = eraserTool;
      } else if (currentToolType === 'fill') {
        currentToolInstance = fillBucketTool;
      }
      
      cti = currentToolInstance;
      if (cti?.activate && activeCtx) cti.activate(activeCtx);
      context.requestRedraw();
    }
  }

  function updateHandlerContexts(context: any) {
    const {
      layerManager, historyManager, currentToolInstance, penColor, penSize,
      displayCanvasElement, imageDataBeforeStroke, width, height,
      requestRedraw, updateExternalState, updateExternalStatePartial
    } = context;

    // Update history actions context
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

    // Update event handlers context
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

      const debouncedResize = debounce(async (newWidth: number, newHeight: number) => {
        width = newWidth;
        height = newHeight;
        
        const currentDisplayEl = displayCanvasElement;
        if (currentDisplayEl) {
          currentDisplayEl.width = width;
          currentDisplayEl.height = height;
          // Remove any temporary transform
          currentDisplayEl.style.transform = '';
          currentDisplayEl.style.transformOrigin = '';
        }
        
        const lm = layerManager;
        if (lm) {
          lm.resizeLayers(width, height);
          // Mark all layers as dirty after resize
          lm.getLayers().forEach(layer => lm.markLayerDirty(layer.id));
          requestRedraw();
        }
      }, 150); // 150ms debounce

      const resizeObserver = new ResizeObserver(async entries => {
        for (let entry of entries) {
          const newWidth = entry.contentRect.width;
          const newHeight = entry.contentRect.height;
          
          // Only update if dimensions actually changed and are valid
          if (newWidth > 0 && newHeight > 0 && (newWidth !== width || newHeight !== height)) {
            // Use CSS transform for immediate visual feedback
            const currentDisplayEl = displayCanvasElement;
            if (currentDisplayEl) {
              const scaleX = newWidth / width;
              const scaleY = newHeight / height;
              currentDisplayEl.style.transform = `scale(${scaleX}, ${scaleY})`;
              currentDisplayEl.style.transformOrigin = 'top left';
            }
            
            // Debounced actual resize
            debouncedResize(newWidth, newHeight);
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
    
    const dirtyLayers = lm.getDirtyLayers();
    
    if (dirtyLayers.length === 0) return; // No redraw needed
    
    // Only clear and redraw if we have dirty layers
    currentDisplayCtx.clearRect(0, 0, width, height);
    const visibleLayers = lm.getLayers().filter(l => l.isVisible);
    
    for (const layer of visibleLayers) {
      currentDisplayCtx.drawImage(layer.canvas, 0, 0);
    }
    
    lm.clearDirtyFlags();
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
      const beforeState = captureCanvasStateOptimized(activeLayer.canvas);
      clearCanvas(activeLayer.canvas, activeLayer.context);
      const afterState = captureCanvasStateOptimized(activeLayer.canvas); // Should be empty
      hm.addHistory({
        type: 'clearLayer',
        layerId: activeLayer.id,
        imageDataBefore: beforeState.data,
        imageDataAfter: afterState.data,
        canvasSize: beforeState.size,
      });
      lm.markLayerDirty(activeLayer.id);
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
        
        // Try to delete the layer - only proceed if successful
        const deletionSuccessful = lm.deleteLayer(id);
        if (deletionSuccessful) {
            hm.addHistory({
                type: 'deleteLayer',
                layerId: id,
                deletedLayerData: deletedLayerDataClone,
                deletedLayerIndex: layerIndex
            });
            // Mark all remaining layers as dirty to force a complete redraw
            lm.getLayers().forEach(layer => lm.markLayerDirty(layer.id));
            updateExternalStatePartial(true, true, true);
            requestRedraw();
        }
    }
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
      lm.markLayerDirty(id);
      // Update layers state so UI reflects the visibility change, plus history state
      updateExternalStatePartial(true, false, true);
      requestRedraw();
    }
  }

  export function reorderLayer(data: { layerId: string; newIndex: number }) {
    const lm = layerManager;
    const hm = historyManager;
    if (!lm || !hm) return;
    const layer = lm.findLayerById(data.layerId);
    if (!layer) return;

    const result = lm.reorderLayer(data.layerId, data.newIndex);
    if (result) {
        hm.addHistory({
            type: 'reorderLayer',
            layerId: data.layerId,
            meta: { oldVisualIndex: result.oldVisualIndex, newVisualIndex: result.newVisualIndex, targetLayerId: data.layerId }
        });
        // Mark all layers as dirty to force a redraw with new layer order
        lm.getLayers().forEach(layer => lm.markLayerDirty(layer.id));
        // Update layers state so UI reflects the reordering, plus history state
        updateExternalStatePartial(true, false, true);
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
      // Update layers state so UI reflects the name change, plus history state
      updateExternalStatePartial(true, false, true);
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
