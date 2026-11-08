import { DragAndDropManager } from '../utils/DragAndDropManager';

/** Click-and-drag horizontal scrolling for desktop users. */
export function setupDragScroll(container: HTMLElement): void {
  let isDown = false;
  let startX: number;
  let scrollLeft: number;
  let hasDragged = false;
  const dragThreshold = 5; // Minimum pixels moved to consider it a drag

  // Function to check if container has overflow and update cursor
  const updateDragState = () => {
    const hasOverflow = container.scrollWidth > container.clientWidth;
    if (hasOverflow) {
      container.style.cursor = 'grab';
    } else {
      container.style.cursor = '';
    }
    return hasOverflow;
  };

  // Initial check
  setTimeout(updateDragState, 100);

  container.addEventListener('mousedown', (e) => {
    // Skip if reordering is in progress or not left button or no overflow
    if (DragAndDropManager.isReordering || e.button !== 0 || !updateDragState()) return;
    
    isDown = true;
    hasDragged = false;
    container.style.cursor = 'grabbing';
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener('mouseleave', () => {
    isDown = false;
    updateDragState();
  });

  container.addEventListener('mouseup', () => {
    isDown = false;
    updateDragState();
  });

  container.addEventListener('mousemove', (e) => {
    // Stop if reordering started or not dragging
    if (!isDown || DragAndDropManager.isReordering) {
      if (DragAndDropManager.isReordering) isDown = false; // Reset state
      return;
    }
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = x - startX;
    
    // Mark as dragged if moved beyond threshold
    if (Math.abs(walk) > dragThreshold) {
      hasDragged = true;
    }
    
    container.scrollLeft = scrollLeft - walk;
  });

  // Prevent click events on cards when dragging
  container.addEventListener('click', (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
      hasDragged = false;
    }
  }, true);
}
