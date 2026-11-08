export interface AutoScrollOptions {
  zone: number;
  maxSpeed: number;
  minSpeed: number;
}

export const CARD_CAROUSEL_SCROLL: AutoScrollOptions = { zone: 100, maxSpeed: 15, minSpeed: 3 };
export const CHIPS_SCROLL: AutoScrollOptions = { zone: 80, maxSpeed: 12, minSpeed: 2 };

/** Scrolls a carousel horizontally while the pointer is near its left or right edge. */
export class AutoScroller {
  private speed = 0;
  private frameId: number | null = null;

  constructor(
    private readonly scrollContainer: HTMLElement | null,
    private readonly options: AutoScrollOptions
  ) {}

  update(x: number): void {
    const container = this.scrollContainer;
    if (!container) return;

    const { zone, maxSpeed, minSpeed } = this.options;
    const rect = container.getBoundingClientRect();
    const maxScroll = container.scrollWidth - container.clientWidth;
    const distFromLeft = x - rect.left;
    const distFromRight = rect.right - x;

    let newSpeed = 0;
    if (distFromLeft < zone && distFromLeft >= 0 && container.scrollLeft > 0) {
      newSpeed = -(minSpeed + (1 - distFromLeft / zone) * (maxSpeed - minSpeed));
    } else if (distFromRight < zone && distFromRight >= 0 && container.scrollLeft < maxScroll) {
      newSpeed = minSpeed + (1 - distFromRight / zone) * (maxSpeed - minSpeed);
    }

    // The 0.5 dead band avoids restarting the animation on sub-pixel pointer jitter.
    if (Math.abs(newSpeed - this.speed) > 0.5 || (newSpeed === 0 && this.speed !== 0)) {
      this.speed = newSpeed;
      if (this.speed !== 0 && this.frameId === null) {
        this.frameId = requestAnimationFrame(this.step);
      }
    }
  }

  stop(): void {
    this.speed = 0;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  private step = (): void => {
    const container = this.scrollContainer;
    if (!container || this.speed === 0) {
      this.frameId = null;
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    if ((this.speed < 0 && container.scrollLeft <= 0) || (this.speed > 0 && container.scrollLeft >= maxScroll)) {
      this.speed = 0;
      this.frameId = null;
      return;
    }

    container.scrollLeft += this.speed;
    this.frameId = requestAnimationFrame(this.step);
  };
}
