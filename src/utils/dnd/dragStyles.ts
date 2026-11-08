let injected = false;

export function injectDragStyles(): void {
  if (injected) return;
  const style = document.createElement('style');
  style.id = 'sortable-drag-styles';
  style.textContent = `
      /* Custom drag visual element */
      .drag-visual-clone {
        position: fixed !important;
        pointer-events: none !important;
        z-index: 100000 !important;
        opacity: 0.95 !important;
        box-shadow: 0 15px 50px rgba(0, 0, 0, 0.5) !important;
        transform: scale(1.03) rotate(2deg) !important;
        border-radius: var(--apple-card-radius, 25px) !important;
        transition: transform 0.1s ease, box-shadow 0.1s ease !important;
        overflow: hidden !important;
      }
      
      .drag-visual-clone.chip {
        border-radius: var(--apple-chip-radius, 50px) !important;
      }
      
      /* Ghost - the placeholder showing where item will drop */
      .sortable-ghost {
        opacity: 0.3 !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: var(--apple-card-radius, 25px) !important;
      }
      
      /* Hide controls on ghost and dragged elements */
      .sortable-ghost .entity-controls,
      .sortable-drag .entity-controls,
      .sortable-chosen .entity-controls,
      .dragging .entity-controls {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      /* Hide the actual element being dragged (SortableJS moves it) */
      .sortable-drag {
        opacity: 0 !important;
        visibility: hidden !important;
      }
      
      /* Ghost placeholder for chips */
      .chip-wrapper.sortable-ghost {
        opacity: 0.3 !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border-radius: var(--apple-chip-radius, 50px) !important;
      }
      .chip-wrapper.sortable-ghost .chip {
        opacity: 0.3 !important;
      }
      
      /* Prevent images from interfering with drag */
      .entity-card-wrapper img,
      .entity-card-wrapper .camera-container,
      .entity-card-wrapper .camera-snapshot {
        pointer-events: none;
      }
  `;
  document.head.appendChild(style);
  injected = true;
}
