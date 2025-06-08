<script lang="ts">
  import type { ILayer } from '../../core/LayerManager';
  import { createEventDispatcher, tick } from 'svelte'; // Import tick

  export let layers: readonly ILayer[] = [];
  export let activeLayerId: string | null = null;

  const dispatch = createEventDispatcher<{
    selectLayer: string;
    deleteLayer: string;
    toggleVisibility: string;
    reorderLayer: { layerId: string; newIndex: number };
    renameLayer: { layerId: string; newName: string }; // New event
  }>();

  let editingLayerId: string | null = null;
  let editingName = '';
  let inputElement: HTMLInputElement | null = null; // For focusing

  // ... (drag-and-drop handlers from previous step, assuming they are here) ...
  let draggedItemId: string | null = null;
  let dropTargetId: string | null = null; // For visual feedback

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
      const targetIndex = layers.findIndex(l => l.id === targetLayerId);
      if (targetIndex !== -1) {
        dispatch('reorderLayer', { layerId: sourceLayerId, newIndex: targetIndex });
      }
    }
    draggedItemId = null;
    dropTargetId = null;
  }

  function handleDragEnd() {
    draggedItemId = null;
    dropTargetId = null;
  }
  // End of drag-and-drop handlers


  async function startEditing(layer: ILayer) {
    editingLayerId = layer.id;
    editingName = layer.name;
    await tick(); // Wait for DOM update for the input field to appear
    inputElement?.focus();
    inputElement?.select();
  }

  function handleRenameInput(event: Event) {
    editingName = (event.target as HTMLInputElement).value;
  }

  function submitRename(layerId: string) {
    if (editingLayerId === layerId && editingName.trim() !== '') {
      const originalLayer = layers.find(l => l.id === layerId);
      if (originalLayer && originalLayer.name !== editingName.trim()) {
        dispatch('renameLayer', { layerId, newName: editingName.trim() });
      }
    }
    editingLayerId = null; // Exit editing mode
  }

  function handleRenameKeyDown(event: KeyboardEvent, layerId: string) {
    if (event.key === 'Enter') {
      submitRename(layerId);
    } else if (event.key === 'Escape') {
      editingLayerId = null; // Cancel editing
    }
  }
</script>

<div class="layer-panel">
  <h3>Layers</h3>
  <ul>
    {#each layers as layer (layer.id)}
      <li
        class="layer-item"
        class:active={layer.id === activeLayerId}
        class:drop-target={layer.id === dropTargetId && layer.id !== draggedItemId}
        class:editing={layer.id === editingLayerId}
        draggable={editingLayerId !== layer.id}
        on:dragstart={(e) => editingLayerId !== layer.id && handleDragStart(e, layer.id)}
        on:dragover={(e) => handleDragOver(e, layer.id)}
        on:dragleave={handleDragLeave}
        on:drop={(e) => handleDrop(e, layer.id)}
        on:dragend={handleDragEnd}
        data-layer-id={layer.id}
      >
        <div
          class="layer-content"
          on:click={() => { if(editingLayerId !== layer.id) dispatch('selectLayer', layer.id); }}
          on:keydown={(e) => { if((e.key === 'Enter' || e.key === ' ') && editingLayerId !== layer.id) dispatch('selectLayer', layer.id); }}
          tabindex="0"
          role="button"
          title={editingLayerId === layer.id ? 'Press Enter to save, Esc to cancel' : layer.name + ` (Z: ${layer.zIndex})`}
        >
        {#if editingLayerId === layer.id}
          <input
            type="text"
            bind:this={inputElement}
            value={editingName}
            on:input={handleRenameInput}
            on:blur={() => submitRename(layer.id)}
            on:keydown={(e) => handleRenameKeyDown(e, layer.id)}
            class="rename-input"
          />
        {:else}
          <span class="layer-name" on:dblclick={() => startEditing(layer)} role="button" tabindex="0" on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startEditing(layer); }}>
            {layer.name}
          </span>
        {/if}
        <div class="layer-controls">
          <button
            on:click|stopPropagation={() => dispatch('toggleVisibility', layer.id)}
            title={layer.isVisible ? 'Hide Layer' : 'Show Layer'}
            disabled={editingLayerId === layer.id}
          >
            {layer.isVisible ? '👁️' : '🙈'}
          </button>
          <button
            on:click|stopPropagation={() => dispatch('deleteLayer', layer.id)}
            disabled={layers.length <= 1 || editingLayerId === layer.id}
            title="Delete Layer"
          >
            🗑️
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
  h3 {
    margin-top: 0;
    margin-bottom: 8px;
    font-size: 0.95em; /* Slightly smaller font */
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li.layer-item {
    border-bottom: 1px solid #eee;
    font-size: 0.9em; /* Slightly smaller font */
    transition: background-color 0.2s ease-in-out;
  }
  .layer-content {
    padding: 6px; /* Slightly reduced padding */
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
    padding-left: 3px; /* Adjust for border */
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
    gap: 4px; /* Slightly reduced gap */
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
