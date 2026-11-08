import { CustomizationManager } from '../utils/CustomizationManager';
import { CardManager } from '../utils/CardManager';
import { Entity } from '../types/types';
import { escapeHtml } from '../utils/html';
import { openStatusModal } from './status/StatusModal';
import { generateStatusData, type StatusData } from './status/statusData';
import { statusChipStyles } from './status/statusStyles';

export type { StatusData };

export class StatusSection {
  private cardManager?: CardManager;
  private _hass?: any;
  private statusItems: StatusData[] = [];
  private _entities?: Entity[];
  private _container?: HTMLElement;
  private statusSection?: HTMLElement;
  private modalCards = new Set<HTMLElement>();

  constructor(customizationManager: CustomizationManager, cardManager?: CardManager) {
    this.cardManager = cardManager || new CardManager(customizationManager);
  }

  set hass(hass: any) {
    this._hass = hass;
    if (this._container && this._entities) {
      this.updateStatus(this._entities, hass);
    }
    this.modalCards.forEach((card) => ((card as any).hass = hass));
  }

  /**
   * Render status section for a specific area or group.
   * ponytail: `_areaId` is unused; RoomPage/GroupPage still pass it, drop it there first.
   */
  async render(container: HTMLElement, entities: Entity[], hass: any): Promise<void> {
    this._hass = hass;
    this._entities = entities;
    this._container = container;

    // The wrapper exists even with no visible chip so a chip that appears later has a place to go.
    this.statusSection = document.createElement('div');
    this.statusSection.className = 'apple-status-section';
    container.appendChild(this.statusSection);

    this.statusItems = generateStatusData(entities, hass);
    this.fillStatusSection();
  }

  private fillStatusSection(): void {
    const section = this.statusSection;
    if (!section) return;

    const visibleItems = this.statusItems.filter((item) => item.isVisible);
    section.style.display = visibleItems.length === 0 ? 'none' : '';
    section.innerHTML = visibleItems.length > 0 ? this.generateHTML(visibleItems) : '';
    this.attachEventListeners(section);
  }

  /**
   * Patch chip values in place; rebuild only when the set of visible chips changes.
   */
  private updateStatus(entities: Entity[], hass: any): void {
    const section = this.statusSection;
    if (!section?.isConnected) return;

    const visibleDomains = (items: StatusData[]) =>
      items
        .filter((item) => item.isVisible)
        .map((item) => item.domain)
        .join();
    const newStatusItems = generateStatusData(entities, hass);
    const setChanged = visibleDomains(newStatusItems) !== visibleDomains(this.statusItems);
    this.statusItems = newStatusItems;

    if (setChanged) {
      this.fillStatusSection();
      return;
    }

    newStatusItems
      .filter((item) => item.isVisible)
      .forEach((item) => {
        const chipElement = section.querySelector(`[data-domain="${item.domain}"]`);
        const valueElement = chipElement?.querySelector('.status-chip-value');
        if (valueElement && valueElement.textContent !== item.value) valueElement.textContent = item.value;
        chipElement?.setAttribute('data-entity-ids', item.entityIds.join(','));
      });
  }

  private generateHTML(statusItems: StatusData[]): string {
    return `
      <style>${statusChipStyles}</style>
        <div class="status-carousel-container">
          <div class="status-chips-grid">
            ${statusItems
              .map(
                (item) => `
              <div class="status-chip" role="button" tabindex="0" data-domain="${escapeHtml(item.domain)}" data-entity-ids="${escapeHtml(item.entityIds.join(','))}">
                <div class="status-chip-icon">
                  <ha-icon icon="${escapeHtml(item.icon)}"></ha-icon>
                </div>
                <div class="status-chip-content">
                  <span class="status-chip-label">${escapeHtml(item.label)}</span>
                  <span class="status-chip-value">${escapeHtml(item.value)}</span>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
    `;
  }

  private attachEventListeners(statusSection: HTMLElement): void {
    statusSection.querySelectorAll<HTMLElement>('.status-chip').forEach((chip) => {
      const open = () => {
        const item = this.statusItems.find((i) => i.domain === chip.getAttribute('data-domain'));
        if (item) this.handleStatusChipClick(item);
      };
      chip.addEventListener('click', open);
      chip.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        open();
      });
    });
  }

  private handleStatusChipClick(statusData: StatusData): void {
    if (statusData.entityIds.length === 1) {
      this.openMoreInfoDialog(statusData.entityIds[0]);
    } else {
      void openStatusModal(statusData, this._hass, this.cardManager, this.modalCards);
    }
  }

  private openMoreInfoDialog(entityId: string): void {
    if (this._hass) {
      const event = new CustomEvent('hass-more-info', {
        detail: { entityId },
        bubbles: true,
        composed: true,
      });

      const targets = [
        document.querySelector('ha-app'),
        document.querySelector('home-assistant'),
        document.querySelector('hui-root'),
        document.querySelector('ha-panel-lovelace'),
      ].filter(Boolean);

      let dispatched = false;
      for (const target of targets) {
        if (target) {
          target.dispatchEvent(event);
          dispatched = true;
          break; // Only need to dispatch from one target
        }
      }

      if (!dispatched) {
        document.body.dispatchEvent(event);
      }
    }
  }
}
