<script lang="ts">
  import Canvas from './lib/components/Canvas/Canvas.svelte';
  import Toolbar from './lib/components/Toolbar/Toolbar.svelte';
  import LayerPanel from './lib/components/Layers/LayerPanel.svelte';
  import type { ILayer } from './lib/core/LayerManager'; // Adjust path as needed

  // These will eventually be reactive stores or managed by Canvas.svelte
  let layers: readonly ILayer[] = [];
  let activeLayerId: string | null = null;
  let penColor = '#000000'; // Default, will be bound
  let penSize = 5; // Default, will be bound

  // Placeholder functions - these would typically call methods on the Canvas component instance
  // or a shared service/store. For now, they are stubs.
  function handleAddLayer() {
    console.log("App: Add Layer clicked");
    // canvasComponentInstance.addLayer(); // Example of how it might work
  }
  function handleClearActiveLayer() {
    console.log("App: Clear Active Layer clicked");
    // canvasComponentInstance.clearActiveLayer();
  }
  function handleSelectLayer(id: string) {
    console.log("App: Select Layer", id);
    // canvasComponentInstance.setActiveLayer(id);
  }
  function handleDeleteLayer(id: string) {
    console.log("App: Delete Layer", id);
    // canvasComponentInstance.deleteLayer(id);
  }
  function handleToggleVisibility(id: string) {
    console.log("App: Toggle Visibility", id);
    // canvasComponentInstance.toggleLayerVisibility(id);
  }

</script>

<main>
  <Toolbar
    bind:penColor={penColor}
    bind:penSize={penSize}
    on:addLayer={handleAddLayer}
    on:clearActiveLayer={handleClearActiveLayer}
  />
  <LayerPanel
    bind:layers={layers}
    bind:activeLayerId={activeLayerId}
    on:selectLayer={(e) => handleSelectLayer(e.detail)}
    on:deleteLayer={(e) => handleDeleteLayer(e.detail)}
    on:toggleVisibility={(e) => handleToggleVisibility(e.detail)}
  />
  <Canvas
    bind:layers={layers}
    bind:activeLayerId={activeLayerId}
    bind:penColor={penColor}
    bind:penSize={penSize}
  />
</main>

<style>
  main {
    width: 100vw;
    height: 100vh;
    /* display: flex; Already set, remove if Canvas is not meant to be centered */
    /* justify-content: center; */
    /* align-items: center; */
    background-color: #333;
    overflow: hidden;
    position: relative; /* Needed for absolute positioning of Toolbar/LayerPanel */
  }
</style>
