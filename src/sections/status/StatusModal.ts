import type { CardManager } from '../../utils/CardManager';
import type { CardConfig } from '../../types/types';
import { DashboardConfig } from '../../config/DashboardConfig';
import { LiquidGlassClasses } from '../../utils/LiquidGlassStyles';
import { escapeHtml } from '../../utils/html';
import type { StatusData } from './statusData';
import { statusModalStyles } from './statusStyles';

export async function openStatusModal(
  statusData: StatusData,
  hass: any,
  cardManager: CardManager | undefined,
  modalCards: Set<HTMLElement>
): Promise<void> {
  const modal = document.createElement('div');
  modal.className = 'status-modal-backdrop';

  const modalContent = document.createElement('div');
  modalContent.className = 'status-modal-content hg-glass--thick';

  const header = document.createElement('div');
  header.className = 'status-modal-header';
  header.innerHTML = `
    <button class="modal-close ${LiquidGlassClasses.modalCancel}" aria-label="Close">
      <ha-icon icon="mdi:close"></ha-icon>
    </button>
    <h2>${escapeHtml(statusData.label)}</h2>
  `;

  const body = document.createElement('div');
  body.className = 'status-modal-body';

  const entitiesByArea = groupEntitiesByArea(hass, statusData.entityIds);

  for (const [roomAreaId, roomEntityIds] of Object.entries(entitiesByArea) as [string, string[]][]) {
    if (roomEntityIds.length === 0) continue;

    const areaName = hass.areas?.[roomAreaId]?.name || roomAreaId;

    const roomTitle = document.createElement('div');
    roomTitle.className = 'status-modal-room-title';
    roomTitle.innerHTML = `<span>${escapeHtml(areaName)}</span>`;
    body.appendChild(roomTitle);

    const cardsGrid = document.createElement('div');
    cardsGrid.className = 'status-modal-cards';
    cardsGrid.dataset.areaId = roomAreaId;

    for (const entityId of roomEntityIds) {
      const cardConfig = createEntityCard(entityId, hass);
      if (cardConfig) {
        await createAndAppendCard(cardManager, cardConfig, cardsGrid, hass, roomAreaId);

      }
    }

    body.appendChild(cardsGrid);
  }

  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', statusData.label);
  modalContent.appendChild(header);
  modalContent.appendChild(body);
  modal.appendChild(modalContent);

  const closeBtn = header.querySelector('.modal-close');

  // Modal cards live in document.body, outside HomeView's hass fan-out, so the hass setter feeds them.
  const cards = Array.from(modal.querySelectorAll<HTMLElement>('.entity-card-wrapper > *'));
  cards.forEach((card) => modalCards.add(card));
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  const closeModal = () => {
    document.removeEventListener('keydown', onKeydown);
    cards.forEach((card) => modalCards.delete(card));
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  };
  document.addEventListener('keydown', onKeydown);

  closeBtn?.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  modal.addEventListener('hass-more-info', (e: Event) => {
    e.stopPropagation(); // Stop the event from bubbling further
    const event = e as CustomEvent;

    closeModal();

    setTimeout(() => {
      const targets = [
        document.querySelector('ha-app'),
        document.querySelector('home-assistant'),
        document.querySelector('hui-root'),
        document.querySelector('ha-panel-lovelace'),
      ].filter(Boolean);

      targets.forEach((target) => {
        if (target) {
          const forwardedEvent = new CustomEvent('hass-more-info', {
            detail: event.detail,
            bubbles: true,
            composed: true,
          });
          target.dispatchEvent(forwardedEvent);
        }
      });

      if (targets.length === 0) {
        const fallbackEvent = new CustomEvent('hass-more-info', {
          detail: event.detail,
          bubbles: true,
          composed: true,
        });
        document.body.dispatchEvent(fallbackEvent);
      }
    }, 100);
  });

  document.body.appendChild(modal);

  addModalStyles();

  requestAnimationFrame(() => {
    modal.classList.add('show');
  });
}

function groupEntitiesByArea(hass: any, entityIds: string[]): { [areaId: string]: string[] } {
  const entitiesByArea: { [areaId: string]: string[] } = {};

  for (const entityId of entityIds) {
    const entry = hass.entities?.[entityId];
    const areaId = entry?.area_id || (entry?.device_id && hass.devices?.[entry.device_id]?.area_id);
    if (!areaId) continue;
    (entitiesByArea[areaId] ||= []).push(entityId);
  }

  return entitiesByArea;
}

function createEntityCard(entityId: string, hass: any): CardConfig | null {
  const state = hass.states[entityId];
  if (!state) {
    return null;
  }

  let friendlyName = state?.attributes?.friendly_name || entityId.split('.')[1].replace(/_/g, ' ');
  const domain = entityId.split('.')[0];

  let cardType = 'custom:home-glass-card';
  let isTallCard = false;

  if (DashboardConfig.isDefaultTallDomain(domain)) {
    isTallCard = true;
  }

  const card: CardConfig = {
    type: cardType,
    entity: entityId,
    name: friendlyName,
    domain: domain,
    is_tall: isTallCard,
  };

  if (!state.attributes?.icon) {
    let defaultIcon = '';

    if (domain === 'sensor') {
      switch (state.attributes?.device_class) {
        case 'temperature':
          defaultIcon = 'mdi:thermometer';
          break;
        case 'humidity':
          defaultIcon = 'mdi:water-percent';
          break;
        case 'illuminance':
          defaultIcon = 'mdi:brightness-6';
          break;
        case 'battery':
          defaultIcon = 'mdi:battery';
          break;
        default:
          defaultIcon = 'mdi:gauge';
      }
    } else if (domain === 'binary_sensor') {
      switch (state.attributes?.device_class) {
        case 'motion':
          defaultIcon = 'mdi:motion-sensor';
          break;
        case 'occupancy':
          defaultIcon = 'mdi:account-check';
          break;
        case 'door':
          defaultIcon = 'mdi:door';
          break;
        case 'window':
          defaultIcon = 'mdi:window-open';
          break;
        case 'contact':
          defaultIcon = 'mdi:door-open';
          break;
        case 'smoke':
          defaultIcon = 'mdi:smoke-detector';
          break;
        case 'gas':
          defaultIcon = 'mdi:gas-cylinder';
          break;
        case 'moisture':
        case 'water_leak':
          defaultIcon = 'mdi:water-alert';
          break;
        default:
          defaultIcon = 'mdi:checkbox-marked-circle';
      }
    }

    if (defaultIcon) {
      (card as any).default_icon = defaultIcon;
    }
  }

  return card;
}

async function createAndAppendCard(
  cardManager: CardManager | undefined,
  cardConfig: any,
  container: HTMLElement,
  hass: any,
  areaId?: string
): Promise<void> {
  try {
    let cardElement: HTMLElement;

    if (cardConfig.type === 'custom:home-glass-card') {
      cardElement = document.createElement('home-glass-card') as HTMLElement;

      const shouldBeTall =
        cardManager?.shouldCardBeTall(cardConfig.entity, areaId || 'unknown', 'modal') || cardConfig.is_tall;

      const configWithTall = { ...cardConfig, is_tall: shouldBeTall };

      (cardElement as any).setConfig(configWithTall);
      (cardElement as any).hass = hass;
    } else {
      const customCardType = cardConfig.type.replace('custom:', '');
      if (customElements.get(customCardType)) {
        cardElement = document.createElement(customCardType);
        if (cardElement && typeof (cardElement as any).setConfig === 'function') {
          (cardElement as any).setConfig(cardConfig);
          (cardElement as any).hass = hass;
        }
      } else {
        cardElement = document.createElement('div');
        cardElement.innerHTML = `<div style="color: var(--hg-color-red);">Unknown card type: ${escapeHtml(cardConfig.type)}</div>`;
      }
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'entity-card-wrapper';
    wrapper.dataset.entityId = cardConfig.entity;

    const shouldBeTall =
      cardManager?.shouldCardBeTall(cardConfig.entity, areaId || 'unknown', 'modal') || cardConfig.is_tall;

    if (shouldBeTall) {
      wrapper.classList.add('tall');
    }

    wrapper.appendChild(cardElement);
    container.appendChild(wrapper);
  } catch (error) {
    console.error('Error creating status modal card:', error);
  }
}

function addModalStyles(): void {
  if (document.querySelector('#status-modal-styles')) return;

  const style = document.createElement('style');
  style.id = 'status-modal-styles';
  style.textContent = statusModalStyles;
  document.head.appendChild(style);
}
