const CAMERA_REFRESH_MS = 240000;

export function isCameraUnavailable(state: any): boolean {
  return !state?.state || ['unavailable', 'unknown', 'off'].includes(state.state);
}

/** Keeps a signed camera_proxy image fresh inside a card's shadow root. */
export class CameraController {
  private timer?: number;

  constructor(
    private readonly host: HTMLElement,
    private readonly getHass: () => any,
    private readonly getEntity: () => string | undefined
  ) {}

  get isRunning(): boolean {
    return this.timer !== undefined;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private start() {
    this.stop();
    this.timer = window.setInterval(() => this.refresh(), CAMERA_REFRESH_MS);
  }

  private async signPath(): Promise<string | null> {
    const result = await this.getHass().callWS({
      type: 'auth/sign_path',
      path: `/api/camera_proxy/${this.getEntity()}`,
      expires: 300,
    });
    return result?.path ?? null;
  }

  async initialize(): Promise<void> {
    const hass = this.getHass();
    const entity = this.getEntity();
    if (!hass || !entity || isCameraUnavailable(hass.states[entity])) return;

    try {
      const signedUrl = await this.signPath();
      // The card may have been detached while the signing request was pending
      if (!signedUrl || !this.host.isConnected) return;
      const container = this.host.shadowRoot?.querySelector('.camera-container');
      if (!container) return;

      container.querySelector('.camera-loading')?.remove();
      container.querySelector('.camera-stream-img')?.remove();
      container.querySelector('.camera-icon-no-snapshot')?.remove();

      const img = document.createElement('img');
      img.className = 'camera-stream-img';
      img.src = signedUrl;
      img.alt = 'Camera';
      img.onload = () => {
        img.style.display = '';
        container.querySelector('.camera-icon-no-snapshot')?.remove();
      };
      img.onerror = () => {
        img.style.display = 'none';
        if (container.querySelector('.camera-icon-no-snapshot')) return;
        const fallback = document.createElement('div');
        fallback.className = 'camera-icon-no-snapshot';
        fallback.innerHTML = '<ha-icon icon="mdi:camera-off"></ha-icon>';
        container.insertBefore(fallback, container.firstChild);
      };

      container.insertBefore(img, container.firstChild);
      this.start();
    } catch (error) {
      console.error('Error getting signed camera URL:', error);
    }
  }

  async refresh(): Promise<void> {
    if (!this.getHass() || !this.getEntity()) return;

    try {
      const signedUrl = await this.signPath();
      const img = this.host.shadowRoot?.querySelector('.camera-stream-img') as HTMLImageElement | null;
      if (signedUrl && img) {
        img.src = signedUrl;
      }
    } catch (error) {
      console.error('Error refreshing signed camera URL:', error);
    }
  }

  resume() {
    if (!this.getHass() || this.isRunning) return;
    if (!this.host.shadowRoot?.querySelector('.camera-stream-img')) return;
    this.refresh();
    this.start();
  }
}
