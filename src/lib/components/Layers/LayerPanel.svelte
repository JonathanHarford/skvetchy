<script lang="ts">
  import type { ILayer } from '../../core/LayerManager';
  import { tick } from 'svelte';
  import Icon from '../Icon.svelte';

  let { 
    layers = [], 
    activeLayerId = null,
    onselectLayer,
    ondeleteLayer,
    onclearLayer,
    ontoggleVisibility,
    onreorderLayer,
    onrenameLayer,
    onaddLayer
  } = $props<{
    layers?: readonly ILayer[];
    activeLayerId?: string | null;
    onselectLayer?: (layerId: string) => void;
    ondeleteLayer?: (layerId: string) => void;
    onclearLayer?: (layerId: string) => void;
    ontoggleVisibility?: (layerId: string) => void;
    onreorderLayer?: (data: { layerId: string; newIndex: number }) => void;
    onrenameLayer?: (data: { layerId: string; newName: string }) => void;
    onaddLayer?: () => void;
  }>();

  let editingLayerId = $state<string | null>(null);
  let editingName = $state('');
  let inputElement = $state<HTMLInputElement | null>(null); // For focusing

  let draggedItemId = $state<string | null>(null);
  let dropTargetId = $state<string | null>(null); // For visual feedback

  function handleDragStart(event: DragEvent, layerId: string) {
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', layerId);
    draggedItemId = layerId;
  }

  function handleDragOver(event: DragEvent, targetLayerId: string) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    if (targetLayerId !== draggedItemId) {
        dropTargetId = targetLayerId;
    }
  }
  function handleDragLeave(event: DragEvent) {
    if ((event.target as HTMLLIElement).classList.contains('layer-item')) {
         const leftLayerId = (event.target as HTMLLIElement).dataset.layerId;
         if (leftLayerId === dropTargetId) {
             dropTargetId = null;
         }
    }
  }

  function handleDrop(event: DragEvent, targetLayerId: string) {
    event.preventDefault();
    const sourceLayerId = event.dataTransfer!.getData('text/plain');
    if (sourceLayerId && sourceLayerId !== targetLayerId) {
      // Find the target layer's index in the original layers array (not reversed)
      const targetIndex = layers.findIndex((l: ILayer) => l.id === targetLayerId);
      if (targetIndex !== -1) {
        onreorderLayer?.({ layerId: sourceLayerId, newIndex: targetIndex });
      }
    }
    draggedItemId = null;
    dropTargetId = null;
  }

  function handleDragEnd() {
    draggedItemId = null;
    dropTargetId = null;
  }

  function handleAddLayer() {
    onaddLayer?.();
  }

  async function startEditing(layer: ILayer) {
    editingLayerId = layer.id;
    editingName = layer.name;
    await tick();
    inputElement?.focus();
    inputElement?.select();
  }

  function handleRenameInput(event: Event) {
    editingName = (event.target as HTMLInputElement).value;
  }

  function submitRename(layerId: string) {
    if (editingLayerId === layerId && editingName.trim() !== '') {
      const originalLayer = layers.find((l: ILayer) => l.id === layerId);
      if (originalLayer && originalLayer.name !== editingName.trim()) {
        onrenameLayer?.({ layerId, newName: editingName.trim() });
      }
    }
    editingLayerId = null;
  }

  function handleRenameKeyDown(event: KeyboardEvent, layerId: string) {
    if (event.key === 'Enter') {
      submitRename(layerId);
    } else if (event.key === 'Escape') {
      editingLayerId = null;
    }
  }

  const displayLayers = $derived([...layers].reverse());
</script>

<div class="layer-panel">
  <div class="layer-header">
    <h3>Layers</h3>
    <button class="add-layer-btn" onclick={handleAddLayer} title="Add Layer">+</button>
  </div>
  <ul>
    {#each displayLayers as layer (layer.id)}
      <li
        class="layer-item"
        class:active={layer.id === activeLayerId}
        class:drop-target={layer.id === dropTargetId && layer.id !== draggedItemId}
        class:editing={layer.id === editingLayerId}
        draggable={editingLayerId !== layer.id}
        ondragstart={(e) => { if (editingLayerId !== layer.id) handleDragStart(e, layer.id); }}
        ondragover={(e) => handleDragOver(e, layer.id)}
        ondragleave={handleDragLeave}
        ondrop={(e) => handleDrop(e, layer.id)}
        ondragend={handleDragEnd}
        data-layer-id={layer.id}
      >
        <div
          class="layer-content"
          onclick={() => { if(editingLayerId !== layer.id) onselectLayer?.(layer.id); }}
          ondblclick={() => { if(editingLayerId !== layer.id) startEditing(layer); }}
          onkeydown={(e) => { if((e.key === 'Enter' || e.key === ' ') && editingLayerId !== layer.id) onselectLayer?.(layer.id); }}
          tabindex="0"
          role="button"
          title={editingLayerId === layer.id ? 'Press Enter to save, Esc to cancel' : layer.name + ` (Z: ${layer.zIndex}) - Double-click to rename`}
        >
        {#if editingLayerId === layer.id}
          <input
            type="text"
            bind:this={inputElement}
            value={editingName}
            oninput={handleRenameInput}
            onblur={() => submitRename(layer.id)}
            onkeydown={(e) => handleRenameKeyDown(e, layer.id)}
            class="rename-input"
          />
        {:else}
          <span class="layer-name" role="button" tabindex="0" onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startEditing(layer); }}>
            {layer.name}
          </span>
        {/if}
        <div class="layer-controls">
          <button
            onclick={(e) => { e.stopPropagation(); ontoggleVisibility?.(layer.id); }}
            title={layer.isVisible ? 'Hide Layer' : 'Show Layer'}
            disabled={editingLayerId === layer.id}
          >
            <Icon name={layer.isVisible ? 'eye-open' : 'eye-closed'} size={16} />
          </button>
          <button
            onclick={(e) => { 
              e.stopPropagation(); 
              if (layers.length <= 1) {
                onclearLayer?.(layer.id);
              } else {
                ondeleteLayer?.(layer.id);
              }
            }}
            disabled={editingLayerId === layer.id}
            title={layers.length <= 1 ? "Clear Layer" : "Delete Layer"}
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
        </div>
      </li>
    {/each}
  </ul>
</div>

<style>
  .layer-panel {
    /* position: absolute; */ /* Removed for modal display */
    /* top: 80px; */ /* Removed for modal display */
    /* left: 10px; */ /* Removed for modal display */
    width: 300px; /* Example width for modal */
    max-height: 70vh; /* Example max-height */
    overflow-y: auto; /* Allow vertical scrolling if content exceeds max-height */
    background-color: #f9f9f9; /* Keep its own background */
    border: 1px solid #ccc;
    border-radius: 4px;
    /* box-shadow: 0 2px 5px rgba(0,0,0,0.1); */ /* Shadow now on modal-content in Skvetchy.svelte */
    padding: 8px;
    /* z-index: 100; */ /* Removed for modal display */
  }
  
  .layer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  h3 {
    margin: 0;
    font-size: 0.95em;
  }
  
  .add-layer-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  
  .add-layer-btn:hover {
    background-color: #45a049;
  }
  
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li.layer-item {
    border-bottom: 1px solid #eee;
    font-size: 0.9em;
    transition: background-color 0.2s ease-in-out;
  }
  .layer-content {
    padding: 6px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  li:last-child {
    border-bottom: none;
  }
  li.active {
    background-color: #e0e0ff;
    font-weight: bold;
    border-left: 3px solid #6060ff;
    padding-left: 3px;
  }
  li:hover:not(.active) {
    background-color: #f0f0f0;
  }
  .layer-name {
    flex-grow: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
  }
  .rename-input {
    flex-grow: 1;
    margin-right: 5px;
    padding: 2px 4px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 1em; /* Keep input font size readable */
  }
  .layer-controls {
    display: flex;
    gap: 4px;
  }
  .layer-controls button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9em; /* Consistent with item font size */
    padding: 2px;
  }
   .layer-controls button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  li.editing {
    background-color: #f0f0f0;
  }
  li.drop-target {
    background-color: #d0d0ff;
  }
</style>
