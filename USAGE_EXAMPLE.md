# How to Use Skvetchy in Your Project

## Installation

```bash
npm install skvetchy
```

## Example 1: Basic Integration

```svelte
<!-- MyDrawingApp.svelte -->
<script>
  import { Skvetchy } from 'skvetchy';
  
  let drawingRef;
  
  function handleExport(event) {
    const imageBlob = event.detail;
    // Do something with the exported image
    console.log('Image exported!', imageBlob);
  }
  
  function saveDrawing() {
    drawingRef.exportToPNG().then(blob => {
      // Save to server, local storage, etc.
    });
  }
</script>

<div class="app">
  <h1>My Drawing App</h1>
  
  <Skvetchy
    bind:this={drawingRef}
    width="800px"
    height="600px"
    backgroundColor="#f5f5f5"
    initialPenColor="#2563eb"
    initialPenSize={3}
    on:export={handleExport}
  />
  
  <button on:click={saveDrawing}>Save Drawing</button>
</div>

<style>
  .app {
    padding: 20px;
  }
</style>
```

## Example 2: Embedded in a Larger App

```svelte
<!-- Dashboard.svelte -->
<script>
  import { Skvetchy } from 'skvetchy';
  
  let showDrawing = false;
  let drawingComponent;
  
  function toggleDrawing() {
    showDrawing = !showDrawing;
  }
  
  function handleLayersChange(event) {
    // Sync with your app's state management
    console.log('Layers updated:', event.detail);
  }
</script>

<div class="dashboard">
  <nav>
    <button on:click={toggleDrawing}>
      {showDrawing ? 'Hide' : 'Show'} Drawing
    </button>
  </nav>
  
  {#if showDrawing}
    <div class="drawing-container">
      <Skvetchy
        bind:this={drawingComponent}
        width="100%"
        height="400px"
        showToolbar={true}
        showLayerPanel={false}
        on:layersChange={handleLayersChange}
      />
    </div>
  {/if}
</div>

<style>
  .drawing-container {
    border: 1px solid #ccc;
    border-radius: 8px;
    overflow: hidden;
    margin-top: 20px;
  }
</style>
```

## Example 3: Custom Styled Component

```svelte
<!-- CustomDrawing.svelte -->
<script>
  import { Skvetchy } from 'skvetchy';
</script>

<div class="custom-wrapper">
  <Skvetchy
    className="custom-drawing"
    width="100%"
    height="500px"
    backgroundColor="#1a1a1a"
    initialPenColor="#00ff88"
    initialPenSize={2}
    enableFullscreen={false}
  />
</div>

<style>
  .custom-wrapper {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
    border-radius: 12px;
  }
  
  :global(.custom-drawing) {
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  }
</style>
```

## Example 4: Programmatic Control

```svelte
<!-- AdvancedDrawing.svelte -->
<script>
  import { Skvetchy } from 'skvetchy';
  
  let drawing;
  let currentLayers = [];
  
  function addNewLayer() {
    drawing.addLayer();
  }
  
  function undoAction() {
    drawing.undo();
  }
  
  function redoAction() {
    drawing.redo();
  }
  
  function clearCanvas() {
    drawing.clearActiveLayer();
  }
  
  function handleLayersChange(event) {
    currentLayers = event.detail;
  }
</script>

<div class="controls">
  <button on:click={addNewLayer}>Add Layer</button>
  <button on:click={undoAction}>Undo</button>
  <button on:click={redoAction}>Redo</button>
  <button on:click={clearCanvas}>Clear</button>
  
  <p>Current layers: {currentLayers.length}</p>
</div>

<Skvetchy
  bind:this={drawing}
  width="100%"
  height="600px"
  on:layersChange={handleLayersChange}
/>
```

## TypeScript Support

The component includes full TypeScript definitions:

```typescript
// types.ts
import type { ILayer } from 'skvetchy';

interface DrawingState {
  layers: readonly ILayer[];
  activeLayerId: string | null;
  currentTool: 'pen' | 'eraser';
}
```

## Integration with State Management

```svelte
<!-- WithStore.svelte -->
<script>
  import { Skvetchy } from 'skvetchy';
  import { writable } from 'svelte/store';
  
  const drawingState = writable({
    layers: [],
    activeLayer: null,
    tool: 'pen',
    color: '#000000'
  });
  
  function syncWithStore(event) {
    drawingState.update(state => ({
      ...state,
      layers: event.detail
    }));
  }
</script>

<Skvetchy
  initialPenColor={$drawingState.color}
  initialTool={$drawingState.tool}
  on:layersChange={syncWithStore}
/>
``` 