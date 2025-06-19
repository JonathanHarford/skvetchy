<script lang="ts">
  import { onMount } from 'svelte';

  let {
    show = false,
    title,
    onclose,
    children,
    ariaLabelledBy,
    preventOverlayClose = false,
    customClass = '',
    ...restProps
  } = $props<{
    show?: boolean;
    title?: string;
    onclose: () => void;
    children: any;
    ariaLabelledBy?: string;
    preventOverlayClose?: boolean;
    customClass?: string;
    [key: string]: any;
  }>();

  let modalContentElement = $state<HTMLDivElement | null>(null);

  function handleOverlayClick() {
    if (!preventOverlayClose) {
      onclose();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onclose();
    }
  }

  function handleContentClick(event: Event) {
    event.stopPropagation();
  }

  // Focus management
  onMount(() => {
    if (show && modalContentElement) {
      modalContentElement.focus();
    }
  });

  $effect(() => {
    if (show && modalContentElement) {
      modalContentElement.focus();
    }
  });
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div 
    class="modal-overlay" 
    onclick={handleOverlayClick} 
    onkeydown={handleKeydown}
    role="presentation"
  >
    <div 
      bind:this={modalContentElement}
      class="modal-content {customClass}" 
      onclick={handleContentClick} 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby={ariaLabelledBy || (title ? 'modal-title' : undefined)}
      tabindex="0"
      {...restProps}
    >
      {#if title}
        <h4 id="modal-title" class="modal-title">{title}</h4>
      {/if}
      
      {@render children()}
      
      <div class="modal-actions">
        <button class="modal-close-button" onclick={onclose}>Close</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-content {
    background-color: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    color: #333;
    text-align: center;
    max-width: 90vw;
    max-height: 90vh;
    overflow: auto;
  }

  .modal-title {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
  }

  .modal-actions {
    margin-top: 20px;
  }

  .modal-close-button {
    padding: 8px 16px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
  }

  .modal-close-button:hover {
    background-color: #0056b3;
  }
</style> 