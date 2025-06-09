<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let title: string = 'Confirm';
  export let message: string = 'Are you sure?';
  // No isOpen prop needed if controlled by #if in parent

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();
</script>

<div class="confirm-modal-container">
  <h4>{title}</h4>
  <p>{message}</p>
  <div class="confirm-actions">
    <button class="confirm-button" on:click={() => dispatch('confirm')}>Confirm</button>
    <button class="cancel-button" on:click={() => dispatch('cancel')}>Cancel</button>
  </div>
</div>

<style>
  .confirm-modal-container {
    padding: 20px;
    text-align: center;
    color: #333;
  }
  h4 {
    margin-top: 0;
    margin-bottom: 10px;
    font-size: 1.2em;
  }
  p {
    margin-bottom: 20px;
    font-size: 1em;
  }
  .confirm-actions {
    display: flex;
    justify-content: center;
    gap: 15px;
  }
  .confirm-actions button {
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    font-size: 0.95em;
    cursor: pointer;
  }
  .confirm-button {
    background-color: #28a745; /* Green */
    color: white;
  }
  .confirm-button:hover {
    background-color: #218838;
  }
  .cancel-button {
    background-color: #dc3545; /* Red */
    color: white;
  }
  .cancel-button:hover {
    background-color: #c82333;
  }
</style>
