import Sortable from 'sortablejs';
import { ChipsConfigurationManager } from './ChipsConfigurationManager';
import { pointOf } from './pointer';
import { DragVisual } from './dnd/DragVisual';
import { AutoScroller, CARD_CAROUSEL_SCROLL, CHIPS_SCROLL } from './dnd/AutoScroller';

const GRID_SELECTOR = '.area-entities, .room-group-grid, .scenes-grid, .cameras-grid';

export class DragAndDropManager {
  private saveOrderCallback: (areaId: string, grid: HTMLElement) => void;
  private customizationManager: any;
  private context: string | (() => string);
  private sortableInstances: Map<HTMLElement, Sortable> = new Map();
  private dragVisual = new DragVisual();

  /** Read by other components to suspend behaviors that conflict with a reorder in progress. */
  public static isReordering: boolean = false;

  /** `context` may be a getter, for a manager shared across pages with different contexts. */
  constructor(
    saveOrderCallback: (areaId: string, grid: HTMLElement) => void,
    customizationManager?: any,
    context: string | (() => string) = 'home'
  ) {
    this.saveOrderCallback = saveOrderCallback;
    this.customizationManager = customizationManager;
    this.context = context;
  }

  /**
   * Get common Sortable options
   */
  private getBaseSortableOptions(): Sortable.Options {
    return {
      animation: 150,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',

      delay: 150,
      delayOnTouchOnly: true,
      touchStartThreshold: 5,

      scroll: true,
      scrollSensitivity: 100,
      scrollSpeed: 15,
      bubbleScroll: true,

      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',

      forceFallback: true,
      fallbackClass: 'sortable-fallback-hidden',
      fallbackOnBody: false, // Keep it in container, we handle visual
      fallbackTolerance: 3,

      swapThreshold: 0.65,

      filter: '.entity-controls, .entity-control-btn',
      preventOnFilter: false,
    };
  }

  enableDragAndDrop(container: HTMLElement): void {
    const gridContainers = container.querySelectorAll(GRID_SELECTOR);
    gridContainers.forEach(gridContainer => {
      this.setupGridSortable(gridContainer as HTMLElement);
    });

    const carouselContainers = container.querySelectorAll('.carousel-grid');
    carouselContainers.forEach(carouselGrid => {
      this.setupCarouselSortable(carouselGrid as HTMLElement);
    });

    if (container.classList.contains('permanent-chips')) {
      this.enableChipsCarousel(container);
    }
  }

  private setupGridSortable(gridContainer: HTMLElement): void {
    const existingInstance = this.sortableInstances.get(gridContainer);
    if (existingInstance) {
      existingInstance.destroy();
    }

    const areaId = gridContainer.dataset.areaId;

    let lastX = 0, lastY = 0;

    const onMove = (e: MouseEvent | TouchEvent) => {
      ({ x: lastX, y: lastY } = pointOf(e));
      this.dragVisual.update(lastX, lastY);
    };

    const sortable = new Sortable(gridContainer, {
      ...this.getBaseSortableOptions(),
      draggable: '.entity-card-wrapper',

      onStart: (evt) => {
        DragAndDropManager.isReordering = true;
        evt.item.classList.add('dragging');

        // All of them: SortableJS also creates a fallback clone.
        gridContainer.querySelectorAll('.entity-controls').forEach((ctrl) => {
          (ctrl as HTMLElement).style.visibility = 'hidden';
        });

        const originalEvent = (evt as any).originalEvent;
        const touch = (originalEvent as TouchEvent)?.touches?.[0];
        const mouse = originalEvent as MouseEvent;
        lastX = touch?.clientX ?? mouse?.clientX ?? 0;
        lastY = touch?.clientY ?? mouse?.clientY ?? 0;

        this.dragVisual.create(evt.item, lastX, lastY);

        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: true });

        if ('vibrate' in navigator) navigator.vibrate(50);
        document.body.style.userSelect = 'none';
      },

      onEnd: (evt) => {
        DragAndDropManager.isReordering = false;
        evt.item.classList.remove('dragging');

        gridContainer.querySelectorAll('.entity-controls').forEach((ctrl) => {
          (ctrl as HTMLElement).style.visibility = '';
        });

        this.dragVisual.remove();

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);

        document.body.style.userSelect = '';
        if ('vibrate' in navigator) navigator.vibrate(30);

        this.reconnectSingleCameraManager(evt.item);

        if (areaId) {
          this.saveOrderCallback(areaId, gridContainer);
        }
      }
    });

    this.sortableInstances.set(gridContainer, sortable);
  }

  private setupCarouselSortable(carouselGrid: HTMLElement): void {
    const existingInstance = this.sortableInstances.get(carouselGrid);
    if (existingInstance) {
      existingInstance.destroy();
    }

    const scrollContainer = carouselGrid.closest('.carousel-container') as HTMLElement;

    let lastX = 0, lastY = 0;
    const scroller = new AutoScroller(scrollContainer, CARD_CAROUSEL_SCROLL);

    const onMove = (e: MouseEvent | TouchEvent) => {
      ({ x: lastX, y: lastY } = pointOf(e));
      this.dragVisual.update(lastX, lastY);
      scroller.update(lastX);
    };

    const sortable = new Sortable(carouselGrid, {
      ...this.getBaseSortableOptions(),
      draggable: '.entity-card-wrapper',
      direction: 'horizontal',

      // AutoScroller handles edge scrolling
      scroll: false,

      onStart: (evt) => {
        DragAndDropManager.isReordering = true;
        evt.item.classList.add('dragging');

        carouselGrid.querySelectorAll('.entity-controls').forEach((ctrl) => {
          (ctrl as HTMLElement).style.visibility = 'hidden';
        });

        const originalEvent = (evt as any).originalEvent;
        const touch = (originalEvent as TouchEvent)?.touches?.[0];
        const mouse = originalEvent as MouseEvent;
        lastX = touch?.clientX ?? mouse?.clientX ?? 0;
        lastY = touch?.clientY ?? mouse?.clientY ?? 0;

        this.dragVisual.create(evt.item, lastX, lastY);

        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: true });

        if ('vibrate' in navigator) navigator.vibrate(50);
        document.body.style.userSelect = 'none';
      },

      onEnd: (evt) => {
        DragAndDropManager.isReordering = false;
        evt.item.classList.remove('dragging');

        scroller.stop();

        carouselGrid.querySelectorAll('.entity-controls').forEach((ctrl) => {
          (ctrl as HTMLElement).style.visibility = '';
        });

        this.dragVisual.remove();

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);

        document.body.style.userSelect = '';
        if ('vibrate' in navigator) navigator.vibrate(30);

        this.reconnectSingleCameraManager(evt.item);

        const carousel = evt.item.closest('.carousel-grid') as HTMLElement;
        if (carousel) {
          this.updateCarouselConfiguration(carousel);
        }
      }
    });

    this.sortableInstances.set(carouselGrid, sortable);
  }

  enableChipsCarousel(container: HTMLElement): void {
    const chipsCarousel = container.querySelector('.chips-grid') as HTMLElement;
    if (!chipsCarousel) return;

    const existingInstance = this.sortableInstances.get(chipsCarousel);
    if (existingInstance) {
      existingInstance.destroy();
    }

    const scrollContainer = chipsCarousel.closest('.carousel-container, .chips-carousel-container') as HTMLElement;

    let lastX = 0, lastY = 0;
    const scroller = new AutoScroller(scrollContainer, CHIPS_SCROLL);

    const onMove = (e: MouseEvent | TouchEvent) => {
      ({ x: lastX, y: lastY } = pointOf(e));
      this.dragVisual.update(lastX, lastY);
      scroller.update(lastX);
    };

    const sortable = new Sortable(chipsCarousel, {
      ...this.getBaseSortableOptions(),
      draggable: '.chip-wrapper',
      direction: 'horizontal',
      // AutoScroller handles edge scrolling
      scroll: false,

      onStart: (evt) => {
        DragAndDropManager.isReordering = true;
        evt.item.classList.add('dragging');

        const originalEvent = (evt as any).originalEvent;
        const touch = (originalEvent as TouchEvent)?.touches?.[0];
        const mouse = originalEvent as MouseEvent;
        lastX = touch?.clientX ?? mouse?.clientX ?? 0;
        lastY = touch?.clientY ?? mouse?.clientY ?? 0;

        this.dragVisual.create(evt.item, lastX, lastY, true);

        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: true });

        if ('vibrate' in navigator) navigator.vibrate(50);
        document.body.style.userSelect = 'none';
      },

      onEnd: (evt) => {
        DragAndDropManager.isReordering = false;
        evt.item.classList.remove('dragging');
        scroller.stop();
        this.dragVisual.remove();

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('touchmove', onMove);

        document.body.style.userSelect = '';
        if ('vibrate' in navigator) navigator.vibrate(30);

        const chipsGrid = evt.item.closest('.chips-grid') as HTMLElement;
        if (chipsGrid) {
          this.updateChipsOrder(chipsGrid);
        }
      }
    });

    this.sortableInstances.set(chipsCarousel, sortable);
  }

  private updateChipsOrder(chipsGrid: HTMLElement): void {
    const chipWrappers = Array.from(chipsGrid.querySelectorAll('.chip-wrapper'));
    const newOrder: string[] = [];

    chipWrappers.forEach((wrapper) => {
      const chipId = (wrapper as HTMLElement).dataset.chipId || (wrapper as HTMLElement).dataset.entityId;
      if (chipId) newOrder.push(chipId);
    });

    if (this.customizationManager) {
      ChipsConfigurationManager.saveChipsOrder(this.customizationManager, newOrder);
    }
  }

  private updateCarouselConfiguration(carousel: HTMLElement): void {
    const areaId = carousel.dataset.areaId;
    const sectionType = carousel.dataset.sectionType;

    if (!areaId || !sectionType) return;

    const entityWrappers = Array.from(carousel.querySelectorAll('.entity-card-wrapper'));
    const newOrder: string[] = [];

    entityWrappers.forEach((wrapper) => {
      let entityId = (wrapper as HTMLElement).dataset.entityId;
      if (!entityId) {
        const appleHomeCard = wrapper.querySelector('home-glass-card') as any;
        if (appleHomeCard) {
          entityId = appleHomeCard.entity || appleHomeCard.entityId || appleHomeCard.getAttribute('entity');
        }
      }
      if (entityId) newOrder.push(entityId);
    });

    if (this.customizationManager) {
      this.customizationManager.updateCarouselOrderWithContext(areaId, sectionType, newOrder, typeof this.context === 'function' ? this.context() : this.context);
    }
  }

  private reconnectSingleCameraManager(wrapper: HTMLElement): void {
    const appleHomeCard = wrapper.querySelector('home-glass-card') as any;
    if (appleHomeCard && typeof appleHomeCard.reloadCameraImage === 'function') {
      appleHomeCard.reloadCameraImage();
    }
  }

  disableDragAndDrop(container: HTMLElement): void {
    const gridContainers = container.querySelectorAll(GRID_SELECTOR);
    gridContainers.forEach(gridContainer => {
      const instance = this.sortableInstances.get(gridContainer as HTMLElement);
      if (instance) {
        instance.destroy();
        this.sortableInstances.delete(gridContainer as HTMLElement);
      }
    });

    const carouselContainers = container.querySelectorAll('.carousel-grid');
    carouselContainers.forEach(carouselGrid => {
      const instance = this.sortableInstances.get(carouselGrid as HTMLElement);
      if (instance) {
        instance.destroy();
        this.sortableInstances.delete(carouselGrid as HTMLElement);
      }
    });
  }
}
