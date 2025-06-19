<script lang="ts">
  import BaseModal from './BaseModal.svelte';

  let { 
    show = false,
    penColor,
    onsetcolor,
    onclose
  } = $props<{
    show?: boolean;
    penColor: string;
    onsetcolor: (color: string) => void;
    onclose: () => void;
  }>();

  function handleInput(event: Event) {
    const newColor = (event.target as HTMLInputElement).value;
    onsetcolor(newColor);
  }
</script>

<BaseModal {show} title="Pen Color" {onclose}>
  {#snippet children()}
    <div class="color-controls">
      <input
        type="color"
        id="penColor"
        value={penColor}
        oninput={handleInput}
      />
      <span>{penColor}</span>
    </div>
  {/snippet}
</BaseModal>

<style>
  .color-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin: 20px 0;
  }
  
  input[type="color"] {
    width: 100px;
    height: 40px;
    border: 1px solid #ccc;
    padding: 0;
  }
  
  span {
    font-family: monospace;
  }
</style>
