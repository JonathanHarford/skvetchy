<script lang="ts">
  import Skvetchy from './lib/Skvetchy.svelte';
  import type { ILayer } from './lib/core/LayerManager';

  let sketchyComponent: Skvetchy;

  function handleLayersChange(event: CustomEvent<readonly ILayer[]>) {
    console.log('Layers changed:', event.detail);
  }

  function handleExport(event: CustomEvent<Blob>) {
    console.log('Image exported:', event.detail);
  }

  function handleToolChange(event: CustomEvent<'pen' | 'eraser'>) {
    console.log('Tool changed to:', event.detail);
  }
</script>

<main>
  <Skvetchy
    bind:this={sketchyComponent}
    width="100vw"
    height="100vh"
    backgroundColor="#333"
    showToolbar={true}
    showLayerPanel={true}
    initialPenColor="#ff0000"
    initialPenSize={8}
    initialTool="pen"
    enableFullscreen={true}
    on:layersChange={handleLayersChange}
    on:export={handleExport}
    on:toolChange={handleToolChange}
  />
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    margin: 0;
    padding: 0;
  }
</style>
