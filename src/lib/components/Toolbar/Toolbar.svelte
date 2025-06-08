<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let penColor: string;
  export let penSize: number;
  export let currentTool: 'pen' | 'eraser';
  export let canUndo: boolean = false;
  export let canRedo: boolean = false;
  // No longer need onClearActiveLayer, onAddLayer here, they are in App.svelte

  const dispatch = createEventDispatcher<{
    setTool: 'pen' | 'eraser';
    setColor: string;
    setSize: number;
    undo: void;
    redo: void;
    addLayer: void; // Added for consistency, App.svelte will handle
    clearActiveLayer: void; // Added for consistency
  }>();

  function handleSetTool(tool: 'pen' | 'eraser') {
    dispatch('setTool', tool);
  }
  function handleUndo() {
    dispatch('undo');
  }
  function handleRedo() {
    dispatch('redo');
  }
  function handleAddLayer() {
    dispatch('addLayer');
  }
  function handleClearLayer() {
    dispatch('clearActiveLayer');
  }

</script>

<div class="toolbar">
  <label for="penColor">Color:</label>
  <input type="color" id="penColor" bind:value={penColor} on:input={(e) => dispatch('setColor', e.currentTarget.value)} />

  <label for="penSize">Size:</label>
  <input type="range" id="penSize" min="1" max="50" bind:value={penSize} on:input={(e) => dispatch('setSize', parseInt(e.currentTarget.value))} />
  <span>{penSize}px</span>

  <button on:click={() => handleSetTool('pen')} class:active={currentTool === 'pen'}>Pen</button>
  <button on:click={() => handleSetTool('eraser')} class:active={currentTool === 'eraser'}>Eraser</button>

  <button on:click={handleAddLayer}>Add Layer</button>
  <button on:click={handleClearLayer}>Clear Layer</button>

  <button on:click={handleUndo} disabled={!canUndo}>Undo</button>
  <button on:click={handleRedo} disabled={!canRedo}>Redo</button>
</div>

<style>
  /* ... existing styles ... */
  .toolbar {
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: #eee;
    padding: 8px;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    display: flex;
    gap: 10px;
    align-items: center;
    z-index: 100; /* Ensure toolbar is above canvas */
  }
  input[type="color"] {
    width: 40px;
    height: 24px;
    border: 1px solid #ccc;
    padding: 0;
  }
  button {
    padding: 5px 10px;
    border: 1px solid #ccc;
    border-radius: 3px;
    background-color: #fff;
    cursor: pointer;
  }
  button:hover {
    background-color: #f0f0f0;
  }
  .toolbar button.active {
    background-color: #a0a0ff;
    font-weight: bold;
  }
  .toolbar button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
