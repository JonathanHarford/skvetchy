<script lang="ts">
  let { 
    penSize, 
    toolType = 'pen',
    onsetsize,
    onclose
  } = $props<{
    penSize: number;
    toolType?: 'pen' | 'eraser' | 'fill';
    onsetsize: (size: number) => void;
    onclose: () => void;
  }>();

  function handleInput(event: Event) {
    const newSize = parseInt((event.target as HTMLInputElement).value);
    onsetsize(newSize);
  }

  const title = $derived(toolType === 'pen' ? 'Brush Size' : toolType === 'eraser' ? 'Eraser Size' : 'Fill Bucket');
</script>

<div class="brush-modal-container">
  <h4>{title}</h4>
  <div class="brush-controls">
    <input
      type="range"
      id="brushSize"
      min="1"
      max="100"
      value={penSize}
      oninput={handleInput}
    />
    <span>{penSize}px</span>
  </div>
  <button onclick={onclose}>Close</button>
</div>

<style>
  .brush-modal-container { /* Changed from brush-modal-content */
    padding: 20px;
    /* background-color: #fff; -- Provided by .modal-content in Skvetchy */
    /* border-radius: 8px; -- Provided by .modal-content in Skvetchy */
    text-align: center;
    color: #333; /* Ensure text is visible */
  }
  .brush-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 20px 0;
  }
  input[type="range"] {
    width: 200px;
  }
  h4 {
    margin-top: 0;
    margin-bottom: 15px;
  }
  button {
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
  }
  button:hover {
    background-color: #0056b3;
  }
</style>
