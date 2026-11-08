import { localize } from '../utils/LocalizationService';
import { navigateToDashboardPath } from './navigation';
import { buildSummary, isSummaryRelevant, SummaryContext, SummaryEntity, SummaryItem } from './summary/summaryModel';
import { summaryStyles } from './summary/summaryStyles';

const SEPARATOR = '·';

export class SummarySection {
  private root?: HTMLElement;
  private list?: HTMLElement;
  private anchor?: HTMLElement;
  private entityIds: string[] = [];
  private seenStates = new Map<string, unknown>();
  private contextKey = '';
  private items: SummaryItem[] = [];
  private layoutKey = '';

  /** Mounts right after the page title, and only while there is something to say. */
  render(container: HTMLElement, hass: any, entityIds: string[]): void {
    this.anchor = container.querySelector<HTMLElement>(':scope > .apple-page-title') ?? undefined;
    this.entityIds = entityIds.filter((id) => hass.states[id] && isSummaryRelevant({ entity_id: id, attributes: hass.states[id].attributes }));
    this.seenStates.clear();
    this.contextKey = '';
    this.items = [];
    this.layoutKey = '';
    this.createRoot();
    this.refresh(hass);
  }

  /** Recomputes only when a relevant entity state, the language or the temperature unit changed. */
  update(hass: any): void {
    if (!this.anchor?.isConnected) return;
    this.refresh(hass);
  }

  private createRoot(): void {
    const root = document.createElement('div');
    root.className = 'hg-home-summary';
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', localize('summary.label', 'Home summary'));

    const style = document.createElement('style');
    style.textContent = summaryStyles;
    const list = document.createElement('div');
    list.className = 'hg-summary-list';
    root.append(style, list);
    root.addEventListener('click', (event) => this.handleClick(event));

    this.root = root;
    this.list = list;
  }

  private refresh(hass: any): void {
    const language = hass.locale?.language || hass.language || 'en';
    const temperatureUnit = hass.config?.unit_system?.temperature || '°C';
    const contextKey = `${language}|${temperatureUnit}`;
    const changed = contextKey !== this.contextKey || this.entityIds.some((id) => hass.states[id] !== this.seenStates.get(id));
    if (!changed) return;

    this.contextKey = contextKey;
    this.entityIds.forEach((id) => this.seenStates.set(id, hass.states[id]));
    const entities: SummaryEntity[] = this.entityIds.map((id) => hass.states[id]).filter(Boolean);
    const ctx: SummaryContext = { localize, language, temperatureUnit };
    this.items = buildSummary(entities, ctx);
    this.paint();
  }

  private paint(): void {
    const { root, list, anchor } = this;
    if (!root || !list || !anchor) return;

    const layoutKey = this.items.map((item) => item.id).join('|');
    if (layoutKey !== this.layoutKey) {
      this.layoutKey = layoutKey;
      list.replaceChildren(...this.buildChildren());
    }

    const buttons = list.querySelectorAll<HTMLButtonElement>('button');
    this.items.forEach((item, index) => {
      const button = buttons[index];
      if (button.textContent !== item.text) button.textContent = item.text;
      button.classList.toggle('alert', item.alert);
    });

    if (!this.items.length) root.remove();
    else if (!root.isConnected) anchor.after(root);
  }

  private buildChildren(): Node[] {
    return this.items.flatMap((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hg-summary-item';
      button.dataset.id = item.id;
      if (index === 0) return [button];

      const separator = document.createElement('span');
      separator.className = 'hg-summary-sep';
      separator.setAttribute('aria-hidden', 'true');
      separator.textContent = SEPARATOR;
      return [separator, button];
    });
  }

  private handleClick(event: Event): void {
    // Edit mode rearranges sections; navigating away would drop pending changes. HomeView flags edit mode on its host.
    const host = (this.root?.getRootNode() as ShadowRoot | undefined)?.host;
    if (host?.classList.contains('edit-mode')) return;
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-id]');
    const item = this.items.find((candidate) => candidate.id === button?.dataset.id);
    if (!button || !item) return;

    if ('page' in item.target) {
      navigateToDashboardPath(item.target.page);
      return;
    }
    button.dispatchEvent(
      new CustomEvent('hass-more-info', { detail: { entityId: item.target.entityId }, bubbles: true, composed: true })
    );
  }
}
