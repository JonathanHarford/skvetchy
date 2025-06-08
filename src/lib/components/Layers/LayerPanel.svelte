<script lang="ts">
  import type { ILayer } from '../../core/LayerManager';
  import { createEventDispatcher } from 'svelte';

  export let layers: readonly ILayer[] = [];
  export let activeLayerId: string | null = null;
  // Removed onSelectLayer, onDeleteLayer, onToggleVisibility as direct props
  // They will be dispatched as events now.

  const dispatch = createEventDispatcher<{
    selectLayer: string;
    deleteLayer: string;
    toggleVisibility: string;
    reorderLayer: { layerId: string; newIndex: number };
  }>();

  let draggedItemId: string | null = null;
  let dropTargetId: string | null = null; // For visual feedback

  function handleDragStart(event: DragEvent, layerId: string) {
    event.dataTransfer!.effectAllowed = 'move';
    event.dataTransfer!.setData('text/plain', layerId);
    draggedItemId = layerId;
    // (event.target as HTMLLIElement).style.opacity = '0.5'; // Optional: visual feedback
  }

  function handleDragOver(event: DragEvent, targetLayerId: string) {
    event.preventDefault(); // Necessary to allow dropping
    event.dataTransfer!.dropEffect = 'move';
    if (targetLayerId !== draggedItemId) {
        dropTargetId = targetLayerId; // Highlight potential drop target
    }
  }
    function handleDragLeave(event: DragEvent) {
        // Only clear if leaving a valid target that's not the dragged item itself
        if ((event.target as HTMLLIElement).classList.contains('layer-item')) {
             const leftLayerId = (event.target as HTMLLIElement).dataset.layerId;
             if (leftLayerId === dropTargetId) { // Check if leaving the currently highlighted target
                 dropTargetId = null;
             }
        }
    }


  function handleDrop(event: DragEvent, targetLayerId: string) {
    event.preventDefault();
    const sourceLayerId = event.dataTransfer!.getData('text/plain');
    // (event.target as HTMLLIElement).style.opacity = '1'; // Reset opacity

    if (sourceLayerId && sourceLayerId !== targetLayerId) {
      const targetIndex = layers.findIndex(l => l.id === targetLayerId);
      if (targetIndex !== -1) {
        // Dispatch event with sourceLayerId and targetIndex
        dispatch('reorderLayer', { layerId: sourceLayerId, newIndex: targetIndex });
      }
    }
    draggedItemId = null;
    dropTargetId = null;
  }

  function handleDragEnd(event: DragEvent) {
    // Reset opacity if changed
    // if (draggedItemId) {
    //   const el = document.querySelector(`[data-layer-id="${draggedItemId}"]`) as HTMLLIElement;
    //   if(el) el.style.opacity = '1';
    // }
    draggedItemId = null;
    dropTargetId = null;
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
        draggable="true"
        on:dragstart={(e) => handleDragStart(e, layer.id)}
        on:dragover={(e) => handleDragOver(e, layer.id)}
        on:dragleave={handleDragLeave}
        on:drop={(e) => handleDrop(e, layer.id)}
        on:dragend={handleDragEnd}
        on:click={() => dispatch('selectLayer', layer.id)}
        title={layer.name + ` (Z: ${layer.zIndex})`}
        data-layer-id={layer.id}
      >
        <span class="layer-name">{layer.name}</span>
        <div class="layer-controls">
          <button
            on:click|stopPropagation={() => dispatch('toggleVisibility', layer.id)}
            title={layer.isVisible ? 'Hide Layer' : 'Show Layer'}
          >
            {layer.isVisible ? '👁️' : '🙈'}
          </button>
          <button
            on:click|stopPropagation={() => dispatch('deleteLayer', layer.id)}
            disabled={layers.length <= 1}
            title="Delete Layer"
          >
            🗑️
          </button>
        </div>
      </li>
    {/each}
  </ul>
</div>

<style>
  .layer-panel {
    position: absolute;
    top: 70px; /* Below toolbar */
    left: 10px;
    width: 200px;
    background-color: #f9f9f9;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    padding: 10px;
    z-index: 100; /* Ensure panel is above canvas */
  }
  h3 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1em;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    padding: 8px;
    border-bottom: 1px solid #eee;
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
  }
  li:hover:not(.active) {
    background-color: #f0f0f0;
  }
  .layer-name {
    flex-grow: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .layer-controls {
    display: flex;
    gap: 5px;
  }
  .layer-controls button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9em;
    padding: 2px;
  }
   .layer-controls button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  li.layer-item { /* Added class for easier selection */
    /* ... existing li styles ... */
    transition: background-color 0.2s ease-in-out; /* Smooth transition for drop target highlight */
  }
  li.active {
    background-color: #e0e0ff; /* Existing highlight */
    border-left: 3px solid #6060ff; /* Enhanced highlight for active */
    padding-left: 5px; /* Adjust padding for border */
  }
  li.drop-target {
    background-color: #d0d0ff; /* Highlight for potential drop target */
  }
  /* Optional: Style for the item being dragged */
  /* li[draggable="true"]:active { opacity: 0.5; } This is not standard for drag */

</style>
