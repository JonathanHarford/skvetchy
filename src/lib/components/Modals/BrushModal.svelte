<script lang="ts">
  import BaseModal from './BaseModal.svelte';

  let { 
    show = false,
    penSize, 
    toolType = 'pen',
    onsetsize,
    onclose
  } = $props<{
    show?: boolean;
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

<BaseModal {show} {title} {onclose}>
  {#snippet children()}
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
  {/snippet}
</BaseModal>

<style>
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
</style>
