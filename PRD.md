# **Product Requirements Document: skvetchy**

| Document Status | Draft |
| :---- | :---- |
| **Version** | 0.9 |
| **Date** | 2025-06-08 |
| **Author** | Gemini |
| **Stakeholder** | User |

## **1\. Overview & Vision**

**skvetchy** is a high-performance, MIT-licensed, and mobile-friendly drawing component for Svelte applications. It provides a feature-rich, layered digital canvas that developers can easily integrate into their projects. The core vision is to provide a "batteries-included" canvas solution that abstracts away the complexities of multi-layer rendering, state management, and cross-device input, allowing developers to focus on their application's unique features rather than reinventing a drawing engine.

## **2\. Target Audience & Use Cases**

The primary audience is **Svelte developers** who need to add drawing or annotation capabilities to their applications.
**Example Use Cases:**

* A collaborative whiteboard application.
* An annotation tool for marking up images or documents.
* A simple digital art or note-taking web app.
* A signature pad within a form.

## **3\. Features & Requirements**

### **3.1. Core Canvas Engine**

* **Layered Architecture:** The canvas must support multiple, independent drawing layers. The underlying implementation will handle the composition of these layers into a final image.
* **High Performance:** The component must remain responsive and fluid, even with numerous layers and complex vector paths. The architecture must prioritize performance to avoid input lag.
* **Mobile-First & Responsive:** The canvas and its UI controls must be fully responsive and functional across all screen sizes, from small mobile phones to large desktop monitors.
* **Cross-Device Input:** The component must provide a seamless experience for mouse, touch, and pressure-sensitive stylus input.

### **3.2. Drawing Tools & Controls**

| Feature | Requirement | Technical Notes |
| :---- | :---- | :---- |
| **Pen Tool** | Users must be able to draw freeform lines on the active layer. | This is the default drawing mode. |
| **Color Selector** | A UI control must allow the user to select the active drawing color. | Can use a native \<input type="color"\> or a custom palette. |
| **Pen Size Selector** | A UI control (e.g., a slider) must allow the user to change the stroke width of the pen and eraser. | The UI should provide a visual preview of the selected size. |
| **Eraser Tool** | The eraser must remove content from the *active layer only*, revealing content on layers below or the transparent background. | Must be implemented with globalCompositeOperation \= 'destination-out'. A "background-colored pen" is not acceptable. |
| **Pressure Sensitivity** | On supported hardware (e.g., styluses on tablets), stroke width must vary with input pressure. | Must use the PointerEvent API and gracefully degrade on devices without pressure support (where event.pressure will be a default value). |

### **3.3. Layer Management**

| Feature | Requirement | Technical Notes |
| :---- | :---- | :---- |
| **Add/Delete Layers** | Users must be able to add new, transparent layers and delete existing layers (except the final base layer). | A UI panel is required to display and manage the layer stack. |
| **Reorder Layers** | Users must be able to change the stacking order of layers via drag-and-drop in the UI. | This will manipulate the zIndex of the underlying canvas layers. |
| **Toggle Visibility** | Users must be able to hide or show individual layers. | Hidden layers must not appear in the final exported image. An eye icon is the standard UI convention for this. |
| **Active Layer** | The UI must clearly indicate which layer is currently active for drawing. Clicking a layer in the management panel sets it as active. | The active layer should have a distinct visual highlight. |

### **3.4. Utility Features**

| Feature | Requirement | Technical Notes |
| :---- | :---- | :---- |
| **Undo/Redo** | A robust, multi-step undo and redo functionality is required. | Must be implemented by storing a history of drawing actions (vector data), not by storing canvas bitmaps. |
| **Fullscreen Mode** | A control must allow the user to toggle a distraction-free, fullscreen view of the canvas. | To be implemented using the browser's Fullscreen API. |
| **Submit/Export** | A "Submit" button must convert the visible canvas layers into a single PNG image. | Emits a File object that can be easily appended to a FormData. |
| **Clear Canvas** | A control to clear the contents of the *currently active layer*. | This is a destructive action that should prompt for confirmation. |
