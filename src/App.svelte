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
    imageWidth={1920}
    imageHeight={1080}
    backgroundColor="#333"
    initialPenColor="#ff0000"
    initialPenSize={8}
    initialTool="pen"
    enableFullscreen={true}
    enableDownload={true}
    on:layersChange={handleLayersChange}
    on:export={handleExport}
    on:toolChange={handleToolChange}
  />
</main>

<style>
  main {
    margin: 0;
    padding: 0;
  }
</style>
