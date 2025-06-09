<script lang="ts">
  export let name: string;
  export let size: number = 24;
  export let color: string = 'currentColor';

  // Import all SVG assets
  import brushSvg from './svg/brush.svg?raw';
  import eraserSvg from './svg/eraser.svg?raw';
  import eyeOpenSvg from './svg/eye-open.svg?raw';
  import eyeClosedSvg from './svg/eye-closed.svg?raw';
  import layersSvg from './svg/layers.svg?raw';
  import fullscreenSvg from './svg/fullscreen.svg?raw';
  import checkSvg from './svg/check.svg?raw';

  const icons: Record<string, string> = {
    brush: brushSvg,
    eraser: eraserSvg,
    'eye-open': eyeOpenSvg,
    'eye-closed': eyeClosedSvg,
    layers: layersSvg,
    fullscreen: fullscreenSvg,
    check: checkSvg,
    // Add a simple trash icon as SVG string since we don't have one in assets
    trash: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zM17 6H7v13h10zM9 17h2V8H9zm4 0h2V8h-2zM7 6v13z"/></svg>`
  };

  $: svgContent = icons[name] || '';
  $: processedSvg = svgContent
    .replace(/width="24"/, `width="${size}"`)
    .replace(/height="24"/, `height="${size}"`)
    .replace(/fill="currentColor"/g, `fill="${color}"`)
    .replace(/stroke="currentColor"/g, `stroke="${color}"`);
</script>

<span class="icon" style="display: inline-block; width: {size}px; height: {size}px;">
  {@html processedSvg}
</span>

<style>
  .icon {
    vertical-align: middle;
  }
  .icon :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style> 