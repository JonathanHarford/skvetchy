<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let penColor: string; // Bound two-way by Skvetchy

  const dispatch = createEventDispatcher<{
    setColor: string; // Dispatched when color changes
    close: void;    // Dispatched to close the modal
  }>();

  // This function will be called on input.
  // penColor prop is already updated by bind:value on the input.
  function handleInput() {
    dispatch('setColor', penColor);
  }
</script>

<div class="color-modal-container">
  <h4>Pen Color</h4>
  <div class="color-controls">
    <input
      type="color"
      id="penColor"
      bind:value={penColor}
      on:input={handleInput}
    />
    <span>{penColor}</span>
  </div>
  <button on:click={() => dispatch('close')}>Close</button>
</div>

<style>
  .color-modal-container {
    padding: 20px;
    text-align: center;
    color: #333; /* Ensure text is visible */
  }
  .color-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 20px 0;
  }
  input[type="color"] {
    width: 100px; /* Adjust as needed */
    height: 40px; /* Adjust as needed */
    border: 1px solid #ccc;
    padding: 0; /* Remove default padding for color input */
  }
  span {
    font-family: monospace; /* For better display of hex code */
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
