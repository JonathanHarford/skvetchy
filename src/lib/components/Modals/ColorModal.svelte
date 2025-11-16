<script lang="ts">
  import BaseModal from './BaseModal.svelte';
  import ColorPicker from 'svelte-awesome-color-picker/dist/components/ColorPicker.svelte';

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

  $effect(() => {
    onsetcolor(penColor);
  });
</script>

<BaseModal {show} title="Pen Color" {onclose}>
  {#snippet children()}
    <div class="color-controls">
      <ColorPicker
        bind:hex={penColor}
      />
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
</style>
