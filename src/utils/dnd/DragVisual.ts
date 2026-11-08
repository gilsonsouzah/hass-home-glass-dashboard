import { injectDragStyles } from './dragStyles';

export class DragVisual {
  private dragVisual: HTMLElement | null = null;

  constructor() {
    injectDragStyles();
  }

  create(element: HTMLElement, x: number, y: number, isChip: boolean = false): void {
    this.remove();

    const rect = element.getBoundingClientRect();

    this.dragVisual = document.createElement('div');
    this.dragVisual.className = 'drag-visual-clone' + (isChip ? ' chip' : '');
    this.dragVisual.style.width = rect.width + 'px';
    this.dragVisual.style.height = rect.height + 'px';
    this.dragVisual.style.left = (x - rect.width / 2) + 'px';
    this.dragVisual.style.top = (y - rect.height / 2) + 'px';

    const card = element.querySelector('home-glass-card');
    if (card && card.shadowRoot) {
      const innerCard = card.shadowRoot.querySelector('.home-glass-card') as HTMLElement;
      if (innerCard) {
        const cardStyle = window.getComputedStyle(innerCard);
        this.dragVisual.style.background = cardStyle.background;
        this.dragVisual.style.backdropFilter = cardStyle.backdropFilter;
        (this.dragVisual.style as any).webkitBackdropFilter = (cardStyle as any).webkitBackdropFilter;
        this.dragVisual.style.borderRadius = cardStyle.borderRadius;

        const cameraContainer = innerCard.querySelector('.camera-container') as HTMLElement;
        const cameraIconUnavailable = innerCard.querySelector('.camera-icon-unavailable') as HTMLElement;
        const cameraIconNoSnapshot = innerCard.querySelector('.camera-icon-no-snapshot') as HTMLElement;

        if (cameraContainer || cameraIconUnavailable || cameraIconNoSnapshot) {
          this.createCamera(innerCard, cameraContainer, cameraIconUnavailable, cameraIconNoSnapshot);
        } else {
          const clone = this.cloneWithStyles(innerCard);
          clone.style.width = '100%';
          clone.style.height = '100%';
          this.dragVisual.appendChild(clone);
        }
      }
    } else if (isChip) {
      const chipElement = element.querySelector('.chip') as HTMLElement;
      if (chipElement) {
        const chipStyle = window.getComputedStyle(chipElement);
        this.dragVisual.style.background = chipStyle.background || chipStyle.backgroundColor;
        this.dragVisual.style.backdropFilter = chipStyle.backdropFilter || 'blur(20px)';
        (this.dragVisual.style as any).webkitBackdropFilter = (chipStyle as any).webkitBackdropFilter || 'blur(20px)';
        this.dragVisual.style.borderRadius = chipStyle.borderRadius || '20px';

        const clone = this.cloneWithStyles(chipElement);
        clone.style.width = '100%';
        clone.style.height = '100%';
        clone.style.margin = '0';
        this.dragVisual.appendChild(clone);
      } else {
        const clone = this.cloneWithStyles(element);
        clone.style.width = '100%';
        clone.style.height = '100%';
        this.dragVisual.appendChild(clone);
      }
    } else {
      this.dragVisual.style.background = 'rgba(128, 128, 128, 0.5)';
    }

    document.body.appendChild(this.dragVisual);
  }

  private createCamera(
    innerCard: HTMLElement,
    cameraContainer: HTMLElement | null,
    cameraIconUnavailable: HTMLElement | null,
    cameraIconNoSnapshot: HTMLElement | null
  ): void {
    const cardStyle = window.getComputedStyle(innerCard);

    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
      border-radius: ${cardStyle.borderRadius};
    `;

    if (cameraContainer) {
      const images = Array.from(cameraContainer.querySelectorAll('img')) as HTMLImageElement[];
      let visibleImgSrc: string | null = null;

      for (const img of images) {
        const imgStyle = window.getComputedStyle(img);
        if (imgStyle.opacity !== '0' && img.src) {
          visibleImgSrc = img.src;
          break;
        }
      }

      if (visibleImgSrc) {
        const imgClone = document.createElement('img');
        imgClone.src = visibleImgSrc;
        imgClone.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: inherit;
        `;
        container.appendChild(imgClone);
      } else {
        container.innerHTML = `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3);">
            <ha-icon icon="mdi:camera" style="color: white; --mdc-icon-size: 48px;"></ha-icon>
          </div>
        `;
      }
    } else if (cameraIconUnavailable) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
          <ha-icon icon="mdi:camera-off" style="color: rgba(255,255,255,0.6); --mdc-icon-size: 48px;"></ha-icon>
        </div>
      `;
    } else if (cameraIconNoSnapshot) {
      container.innerHTML = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
          <ha-icon icon="mdi:camera" style="color: rgba(255,255,255,0.6); --mdc-icon-size: 48px;"></ha-icon>
        </div>
      `;
    }

    const entityName = innerCard.querySelector('.entity-name');
    if (entityName) {
      const nameClone = document.createElement('div');
      const nameStyle = window.getComputedStyle(entityName);
      nameClone.textContent = entityName.textContent;
      nameClone.style.cssText = `
        position: absolute;
        bottom: 12px;
        left: 12px;
        right: 12px;
        color: white;
        font-size: ${nameStyle.fontSize};
        font-weight: ${nameStyle.fontWeight};
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      `;
      container.appendChild(nameClone);
    }

    this.dragVisual!.appendChild(container);
  }

  private cloneWithStyles(element: HTMLElement): HTMLElement {
    const clone = element.cloneNode(false) as HTMLElement;
    const style = window.getComputedStyle(element);

    const stylesToCopy = [
      'display', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
      'padding', 'margin', 'width', 'height', 'minWidth', 'minHeight',
      'color', 'fontSize', 'fontWeight', 'fontFamily', 'textAlign',
      'background', 'backgroundColor', 'borderRadius',
      'overflow', 'whiteSpace', 'textOverflow'
    ];

    stylesToCopy.forEach(prop => {
      (clone.style as any)[prop] = (style as any)[prop];
    });

    element.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        clone.appendChild(child.cloneNode(true));
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childEl = child as HTMLElement;
        if (childEl.tagName === 'HA-ICON') {
          const haIcon = childEl as any;
          const iconName = haIcon.icon || haIcon.getAttribute('icon');
          const iconStyle = window.getComputedStyle(childEl);
          const iconClone = document.createElement('ha-icon');
          iconClone.setAttribute('icon', iconName || 'mdi:help');
          iconClone.style.color = iconStyle.color;
          (iconClone.style as any)['--mdc-icon-size'] = iconStyle.getPropertyValue('--mdc-icon-size') || '24px';
          clone.appendChild(iconClone);
        } else if (childEl.tagName === 'IMG') {
          const img = childEl as HTMLImageElement;
          const imgClone = document.createElement('img');
          imgClone.src = img.src;
          imgClone.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            pointer-events: none;
          `;
          clone.appendChild(imgClone);
        } else if (childEl.classList.contains('camera-container')) {
          const visibleImg = childEl.querySelector('img[style*="opacity: 1"], img:not([style*="opacity: 0"])') as HTMLImageElement;
          if (visibleImg && visibleImg.src) {
            const cameraClone = document.createElement('div');
            cameraClone.style.cssText = `
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
            `;
            const imgClone = document.createElement('img');
            imgClone.src = visibleImg.src;
            imgClone.style.cssText = `
              width: 100%;
              height: 100%;
              object-fit: cover;
            `;
            cameraClone.appendChild(imgClone);
            clone.appendChild(cameraClone);
          } else {
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(0,0,0,0.3);
            `;
            placeholder.innerHTML = '<ha-icon icon="mdi:camera" style="color: white; --mdc-icon-size: 32px;"></ha-icon>';
            clone.appendChild(placeholder);
          }
        } else {
          clone.appendChild(this.cloneWithStyles(childEl));
        }
      }
    });

    return clone;
  }

  update(x: number, y: number): void {
    if (!this.dragVisual) return;

    const width = this.dragVisual.offsetWidth;
    const height = this.dragVisual.offsetHeight;

    this.dragVisual.style.left = (x - width / 2) + 'px';
    this.dragVisual.style.top = (y - height / 2) + 'px';
  }

  remove(): void {
    if (this.dragVisual && this.dragVisual.parentNode) {
      this.dragVisual.parentNode.removeChild(this.dragVisual);
    }
    this.dragVisual = null;
  }
}
