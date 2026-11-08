import { CustomizationManager } from './CustomizationManager';
import Sortable from 'sortablejs';
import { localize } from './LocalizationService';
import { RTLHelper } from './RTLHelper';
import { LiquidGlassClasses } from './LiquidGlassStyles';
import { escapeHtml } from './html';
import { injectSectionReorderStyles } from './section-reorder/sectionReorderStyles';
import { prepareSectionsData, SectionItem } from './section-reorder/SectionsModel';

export class SectionReorderManager {
  private modal?: HTMLElement;
  private customizationManager: CustomizationManager;
  private onSaveCallback: () => void;
  private sections: SectionItem[] = [];
  private sortableInstance?: Sortable;
  private saving = false;

  constructor(customizationManager: CustomizationManager, onSaveCallback: () => void) {
    this.customizationManager = customizationManager;
    this.onSaveCallback = onSaveCallback;
  }

  public async showReorderModal(areas: any[], hass: any) {
    if (this.modal) return;

    this.sections = await prepareSectionsData(this.customizationManager, areas, hass);

    this.createModal();
    this.setupEventListeners();
    this.showModal();
  }

  private createModal() {
    this.modal = document.createElement('div');
    this.modal.className = `apple-section-reorder-modal ${RTLHelper.isRTL() ? 'rtl' : 'ltr'}`;

    this.modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="modal-header">
          <button class="modal-cancel ${LiquidGlassClasses.modalCancel}">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
          <h2>${localize('section_reorder.title')}</h2>
          <button class="modal-done ${LiquidGlassClasses.modalDone}">
            <ha-icon icon="mdi:check"></ha-icon>
            <div class="save-spinner"></div>
          </button>
        </div>
        <div class="modal-body">
          <div class="sections-list">
            ${this.sections
              .map(
                (section, index) => `
              <div class="section-item" data-section-id="${escapeHtml(section.id)}" data-index="${index}">
                <button class="section-visibility-toggle ${section.visible ? 'visible' : 'hidden'}"
                        data-section-id="${escapeHtml(section.id)}">
                  <ha-icon icon="${section.visible ? 'mdi:eye' : 'mdi:eye-off'}"></ha-icon>
                </button>
                <div class="section-info">
                  <span class="section-name">${escapeHtml(section.name)}</span>
                </div>
                <div class="section-drag-handle">
                  <ha-icon icon="mdi:menu"></ha-icon>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    injectSectionReorderStyles();
    document.body.appendChild(this.modal);
  }

  private setupEventListeners() {
    if (!this.modal) return;

    const cancelBtn = this.modal.querySelector('.modal-cancel');
    cancelBtn?.addEventListener('click', () => this.closeModal());

    const doneBtn = this.modal.querySelector('.modal-done');
    doneBtn?.addEventListener('click', () => this.saveAndClose());

    const backdrop = this.modal.querySelector('.modal-backdrop');
    backdrop?.addEventListener('click', () => this.closeModal());

    // Delegated; no touchstart handler, it would fire when a scroll gesture starts on the button.
    const sectionsListEl = this.modal.querySelector('.sections-list');

    sectionsListEl?.addEventListener(
      'click',
      (e) => {
        const target = e.target as HTMLElement;
        const toggleButton = target.closest('.section-visibility-toggle');
        if (toggleButton) {
          e.preventDefault();
          e.stopPropagation();
          this.toggleSectionVisibility(toggleButton as HTMLElement);
        }
      },
      { capture: true }
    );

    this.setupSortable();

    document.addEventListener('keydown', this.handleEscapeKey);
  }

  private setupSortable() {
    const sectionsList = this.modal?.querySelector('.sections-list');
    if (!sectionsList) return;

    if (this.sortableInstance) {
      this.sortableInstance.destroy();
    }

    this.sortableInstance = new Sortable(sectionsList as HTMLElement, {
      scroll: true,
      scrollSensitivity: 100,
      scrollSpeed: 3,
      bubbleScroll: false,
      forceAutoScrollFallback: true,
      forceFallback: true,
      fallbackOnBody: true,
      swapThreshold: 1,
      animation: 150,
      easing: 'cubic-bezier(1, 0, 0, 1)',
      delay: 150,
      delayOnTouchOnly: true,
      draggable: '.section-item',
      handle: '.section-drag-handle',
      filter: '.section-visibility-toggle',
      preventOnFilter: false,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      chosenClass: 'sortable-chosen',
      fallbackClass: 'sortable-fallback',
      onStart: () => {
        document.body.style.userSelect = 'none';
      },
      onEnd: (evt: any) => {
        document.body.style.userSelect = '';

        this.handleItemMoved(evt);
      },
    });
  }

  private handleItemMoved(evt: any) {
    const { oldIndex, newIndex } = evt;

    if (oldIndex === newIndex) return;

    const movedSection = this.sections.splice(oldIndex, 1)[0];
    this.sections.splice(newIndex, 0, movedSection);
  }

  private toggleSectionVisibility(button: HTMLElement) {
    if (!button || !button.classList.contains('section-visibility-toggle')) {
      return;
    }

    const sectionId = button.dataset.sectionId;
    if (!sectionId) return;

    const section = this.sections.find((s) => s.id === sectionId);
    if (!section) return;

    button.style.transform = 'scale(0.85)';
    button.style.background = 'rgba(255, 255, 255, 0.2)';

    section.visible = !section.visible;

    setTimeout(() => {
      this.updateVisibilityButtonState(button, section.visible);

      const sectionItem = button.closest('.section-item');
      if (sectionItem) {
        sectionItem.classList.toggle('hidden', !section.visible);
      }

      button.style.transform = '';
      button.style.background = '';
    }, 100);
  }

  private updateVisibilityButtonState(button: HTMLElement, visible: boolean) {
    button.classList.toggle('visible', visible);
    button.classList.toggle('hidden', !visible);

    const haIcon = button.querySelector('ha-icon');
    if (haIcon) {
      haIcon.setAttribute('icon', visible ? 'mdi:eye' : 'mdi:eye-off');
    }
  }

  private showModal() {
    if (!this.modal) return;

    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      this.modal?.classList.add('show');
    });
  }

  private closeModal() {
    this.detachModal();
  }

  /** Detaches the current modal now and removes its element after the fade, so a modal reopened meanwhile is untouched. */
  private detachModal(afterRemove?: () => void) {
    const modal = this.modal;
    if (!modal) return;
    this.modal = undefined;

    document.body.style.overflow = '';
    document.removeEventListener('keydown', this.handleEscapeKey);
    this.sortableInstance?.destroy();
    this.sortableInstance = undefined;
    modal.classList.remove('show');

    setTimeout(() => {
      modal.remove();
      afterRemove?.();
    }, 300);
  }

  private async saveAndClose() {
    if (this.saving || !this.modal) return;
    this.saving = true;

    this.modal.classList.add('saving');
    this.modal.style.transition = 'opacity 0.3s ease-out';
    this.modal.style.opacity = '0';
    this.sortableInstance?.destroy();
    this.sortableInstance = undefined;

    try {
      await this.saveSectionConfiguration();
    } catch (error) {
      console.error('Error saving section configuration:', error);
    }

    this.saving = false;
    if (this.modal) {
      this.detachModal(() => this.onSaveCallback?.());
    } else {
      this.onSaveCallback?.();
    }
  }

  private async saveSectionConfiguration() {
    const sectionOrder = this.sections.map((s) => s.id);
    const hiddenSections = this.sections.filter((s) => !s.visible).map((s) => s.id);

    const home = this.customizationManager.getCustomization('home') || {};
    if (!home.sections) home.sections = {};
    home.sections.order = sectionOrder;
    home.sections.hidden = hiddenSections;

    await this.customizationManager.batchSetCustomizations({ home });
  }

  private handleEscapeKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.closeModal();
    }
  };

  public destroy() {
    this.closeModal();

    const styleElement = document.querySelector('#apple-section-reorder-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }
}
