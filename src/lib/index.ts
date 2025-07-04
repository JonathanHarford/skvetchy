export { default as Skvetchy } from './Skvetchy.svelte';

// Export types that consumers might need
export type { ILayer } from './core/LayerManager';
export type { IHistoryAction, ActionType } from './core/HistoryManager';
export type { CanvasSize, CanvasWithContext } from './core/CanvasUtils';

// Export individual components if users want to compose their own UI
export { default as Canvas } from './components/Canvas/Canvas.svelte';
export { default as LayerPanel } from './components/Layers/LayerPanel.svelte';
export { default as Icon } from './components/Icon.svelte';

// Export canvas utilities for advanced usage
export * from './core/CanvasUtils'; 