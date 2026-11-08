import { HomeChips } from '../../sections/HomeChips';
import { HomeHeader } from '../../sections/HomeHeader';
import { ChipsConfigurationManager } from '../../utils/ChipsConfigurationManager';
import type { DeviceGroup } from '../../config/DashboardConfig';
import { CustomizationManager } from '../../utils/CustomizationManager';
import { isSpecialPageType } from './pageTypes';

export interface ChipsHost {
  getContent(): HTMLElement | undefined;
  getHass(): any;
  getConfig(): any;
  isEditMode(): boolean;
  enableChipsDragAndDrop(container: HTMLElement): void;
}

/** Owns the permanent chips element of a view and wires it to the header on group pages. */
export class ChipsController {
  private chips?: HomeChips;

  constructor(
    private host: ChipsHost,
    private header: HomeHeader,
    private customizationManager: CustomizationManager
  ) {}

  setEditMode(editMode: boolean): void {
    this.chips?.setEditMode(editMode);
  }

  setActiveGroup(group: DeviceGroup | undefined): void {
    this.chips?.setActiveGroup(group);
  }

  attach(): void {
    if (this.chips) return;
    const chipsContainer = this.host.getContent()?.querySelector('.permanent-chips') as HTMLElement | null;
    if (!chipsContainer) return;
    this.chips = new HomeChips(chipsContainer, this.customizationManager);
    this.chips.setOnRenderCallback(() => {
      if (!this.host.isEditMode()) return;
      setTimeout(() => {
        const container = this.host.getContent()?.querySelector('.permanent-chips') as HTMLElement | null;
        if (container) this.host.enableChipsDragAndDrop(container);
      }, 50);
    });
  }

  update(): void {
    const hass = this.host.getHass();
    if (this.chips && hass && this.chips.hass !== hass) {
      this.chips.hass = hass;
    }
  }

  private configure(): void {
    if (!this.chips) return;
    const config = this.host.getConfig();
    this.chips.setConfig(ChipsConfigurationManager.getSettingsFromConfig().chips_config);
    if (config?.activeGroup) this.chips.setActiveGroup(config.activeGroup);
    const hass = this.host.getHass();
    if (hass) this.chips.hass = hass;
  }

  /** Chips are permanent: a page render only clears and reconfigures them. */
  forceReset(): void {
    this.attach();
    this.chips?.clearContainer();
    if (this.host.getHass()) this.configure();
  }

  ensureExist(): void {
    this.attach();

    const hass = this.host.getHass();
    if (this.chips) {
      if (!this.chips.isConfigured()) this.configure();
      if (!this.chips.hass && hass) this.chips.hass = hass;
    }

    if (this.chips?.isConfigured()) {
      const config = this.host.getConfig();
      const activeGroup = config?.pageType === 'group' && config?.deviceGroup ? config.deviceGroup : undefined;
      this.chips.setActiveGroup(activeGroup);
    }
  }

  /** Group pages show the chips inside the header; other pages hide or show the permanent container. */
  ensureConfiguredForHeader(): void {
    const pageType = this.host.getConfig()?.pageType;
    const chipsContainer = this.host.getContent()?.querySelector('.permanent-chips') as HTMLElement | null;

    if (isSpecialPageType(pageType)) {
      this.header.setChipsElement(null);
      if (chipsContainer) chipsContainer.style.display = 'none';
      return;
    }

    if (pageType !== 'group') {
      this.header.setChipsElement(null);
      if (chipsContainer) chipsContainer.style.display = 'block';
      return;
    }

    this.ensureExist();
    if (!this.chips) return;

    if (!(this.chips.isConfigured() && this.chips.hass)) this.configure();
    if (this.chips.isConfigured() && this.chips.hass) this.header.setChipsElement(this.chips);
  }
}
