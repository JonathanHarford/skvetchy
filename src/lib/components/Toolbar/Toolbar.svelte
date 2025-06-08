<script lang="ts">
  // Props for tool selection, color, size will be added later
  export let onClearActiveLayer: () => void;
  export let onAddLayer: () => void;

  // Default values, will be made dynamic
  let penColor = '#000000';
  let penSize = 5;
</script>

<div class="toolbar">
  <label for="penColor">Color:</label>
  <input type="color" id="penColor" bind:value={penColor} />

  <label for="penSize">Size:</label>
  <input type="range" id="penSize" min="1" max="50" bind:value={penSize} />
  <span>{penSize}px</span>

  <button on:click={() => console.log('Select Pen Tool (TODO)')}>Pen</button>
  <button on:click={() => console.log('Select Eraser Tool (TODO)')}>Eraser</button>

  <button on:click={onAddLayer}>Add Layer</button>
  <button on:click={onClearActiveLayer}>Clear Layer</button>

  <!-- More controls will be added here: Undo, Redo, Export, etc. -->
</div>

<style>
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
</style>
