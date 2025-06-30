<script lang="ts">
  import Skvetchy from './lib/Skvetchy.svelte';
  import type { ILayer } from './lib/core/LayerManager';

  let sketchyComponent: Skvetchy;

  function handleLayersChange(layers: readonly ILayer[]) {
    console.log('Layers changed:', layers);
  }

  function handleExport(file: File) {
    console.log('Image exported:', file);
  }

  function handleToolChange(tool: 'pen' | 'eraser' | 'fill') {
    console.log('Tool changed to:', tool);
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
    onlayerschange={handleLayersChange}
    onexport={handleExport}
    ontoolchange={handleToolChange}
  />
</main>

<style>
  main {
    margin: 0;
    padding: 0;
  }
</style>
