<script lang="ts">
  import type { ILayer } from '../../core/LayerManager';

  export let layers: readonly ILayer[] = [];
  export let activeLayerId: string | null = null;
  export let onSelectLayer: (id: string) => void;
  export let onDeleteLayer: (id: string) => void;
  export let onToggleVisibility: (id: string) => void;
  // TODO: Add onReorderLayer
</script>

<div class="layer-panel">
  <h3>Layers</h3>
  <ul>
    {#each layers as layer (layer.id)}
      <li
        class:active={layer.id === activeLayerId}
        on:click={() => onSelectLayer(layer.id)}
        title={layer.name}
      >
        <span class="layer-name">{layer.name} (Z: {layer.zIndex})</span>
        <div class="layer-controls">
          <button
            on:click|stopPropagation={() => onToggleVisibility(layer.id)}
            title={layer.isVisible ? 'Hide Layer' : 'Show Layer'}
          >
            {layer.isVisible ? '👁️' : '🙈'}
          </button>
          <button
            on:click|stopPropagation={() => onDeleteLayer(layer.id)}
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
</style>
