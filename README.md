# Skvetchy - Svelte Drawing Component

A powerful, customizable drawing/sketching component for Svelte applications built with Konva.js.

[Demo](https://JonathanHarford.github.io/skvetchy)

## Features

- 🎨 Multi-layer drawing support
- ✏️ Pen and eraser tools
- 🎯 Customizable pen colors and sizes
- 📱 Fullscreen mode support
- 💾 PNG export functionality
- ↩️ Undo/Redo functionality
- 👁️ Layer visibility controls
- 🔄 Layer reordering and renaming
- 📦 Fully customizable UI components

## Installation

```bash
npm install skvetchy
```

## Basic Usage

```svelte
<script>
  import { Skvetchy } from 'skvetchy';
  
  let drawingComponent;
  
  function handleExport(event) {
    console.log('Exported image:', event.detail);
  }
</script>

<Skvetchy
  bind:this={drawingComponent}
  width="800px"
  height="600px"
  imageWidth={1920}
  imageHeight={1080}
  on:export={handleExport}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `width` | `string \| number` | `'100%'` | Width of the drawing area |
| `height` | `string \| number` | `'100%'` | Height of the drawing area |
| `imageWidth` | `number` | **Required** | Width of the exported PNG image (also defines viewport aspect ratio) |
| `imageHeight` | `number` | **Required** | Height of the exported PNG image (also defines viewport aspect ratio) |
| `backgroundColor` | `string` | `'#333'` | Background color of the component |

| `showLayerPanel` | `boolean` | `true` | Whether to show the layer panel |
| `initialPenColor` | `string` | `'#000000'` | Initial pen color |
| `initialPenSize` | `number` | `5` | Initial pen size |
| `initialTool` | `'pen' \| 'eraser'` | `'pen'` | Initial tool selection |
| `enableFullscreen` | `boolean` | `true` | Whether fullscreen mode is enabled |
| `className` | `string` | `''` | Additional CSS class for styling |

## Events

| Event | Detail Type | Description |
|-------|-------------|-------------|
| `layersChange` | `readonly ILayer[]` | Fired when layers are modified |
| `activeLayerChange` | `string \| null` | Fired when active layer changes |
| `toolChange` | `'pen' \| 'eraser'` | Fired when tool is changed |
| `colorChange` | `string` | Fired when pen color changes |
| `sizeChange` | `number` | Fired when pen size changes |
| `export` | `File` | Fired when image is exported |
| `fullscreenToggle` | `boolean` | Fired when fullscreen is toggled |

## Methods

You can call these methods on the component instance:

```svelte
<script>
  let drawingComponent;
  
  function undoLastAction() {
    drawingComponent.undo();
  }
  
  function redoLastAction() {
    drawingComponent.redo();
  }
  
  function addNewLayer() {
    drawingComponent.addLayer();
  }
  
  function clearCurrentLayer() {
    drawingComponent.clearActiveLayer();
  }
  
  async function exportImage() {
    const imageBlob = await drawingComponent.exportToPNG();
    // Handle the exported image
  }
  
  function getCurrentLayers() {
    return drawingComponent.getLayers();
  }
  
  function getActiveLayer() {
    return drawingComponent.getActiveLayerId();
  }
</script>
```

## Advanced Usage

### Custom Styling

```svelte
<Skvetchy
  className="my-custom-drawing"
  backgroundColor="#f0f0f0"
  width="100vw"
  height="100vh"
/>

<style>
  :global(.my-custom-drawing) {
    border: 2px solid #ccc;
    border-radius: 8px;
  }
</style>
```

### Headless Usage (Custom UI)

If you want to build your own UI, you can import individual components:

```svelte
<script>
  import { Canvas, LayerPanel } from 'skvetchy';
  // Build your own layout with these components
</script>
```

### Event Handling

```svelte
<script>
  import { Skvetchy } from 'skvetchy';
  
  function handleLayersChange(event) {
    console.log('Current layers:', event.detail);
    // Sync with your app state
  }
  
  function handleToolChange(event) {
    console.log('Tool changed to:', event.detail);
    // Update your UI accordingly
  }
  
  function handleExport(event) {
    const imageBlob = event.detail;
    // Upload to server, save locally, etc.
  }
</script>

<Skvetchy
  on:layersChange={handleLayersChange}
  on:toolChange={handleToolChange}
  on:export={handleExport}
/>
```

## Development

To work on this component:

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build the library
npm run build

# Package for distribution
npm run package
```

## Dependencies

- Svelte 4.x
- Konva.js
- svelte-konva

## License

MIT
