const PROBE_SIZE = 16;
const LIGHT_THRESHOLD = 0.6;
const DIM_MIN = 0.2;
const DIM_RANGE = 0.3;

/** Mean Rec. 709 luma (0..1) of RGBA pixel data; ignores alpha. */
export function averageLuminance(rgba: ArrayLike<number>): number {
  let sum = 0;
  let pixels = 0;
  for (let i = 0; i + 2 < rgba.length; i += 4) {
    sum += 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
    pixels++;
  }
  return pixels ? sum / pixels / 255 : 0.5;
}

/** Mean luma of the rgb()/rgba() stops of a CSS gradient, or undefined when it has none. */
export function gradientLuminance(css: string): number | undefined {
  const stops = [...css.matchAll(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/g)];
  if (!stops.length) return undefined;
  return averageLuminance(stops.flatMap((m) => [+m[1], +m[2], +m[3], 255]));
}

export function imageUrlOf(css: string): string | undefined {
  return css.match(/url\(\s*(['"]?)(.*?)\1\s*\)/s)?.[2];
}

export function wallpaperTone(luminance: number): 'light' | 'dark' {
  return luminance >= LIGHT_THRESHOLD ? 'light' : 'dark';
}

/** Shadow behind white titles: soft on dark wallpapers, stronger on bright ones. */
export function titleShadowFor(luminance: number): string {
  const strength = 0.25 + 0.4 * Math.min(1, Math.max(0, luminance));
  return `0 1px 2px rgba(0, 0, 0, ${strength.toFixed(2)}), 0 0 12px rgba(0, 0, 0, ${(strength * 0.6).toFixed(2)})`;
}

/** Black overlay strength for clear glass: brighter wallpapers get a stronger dim. */
export function dimFor(luminance: number): string {
  return `rgba(0, 0, 0, ${(DIM_MIN + DIM_RANGE * luminance).toFixed(2)})`;
}

/** Resolves undefined when the image cannot load or the canvas is tainted. */
export function probeImageLuminance(url: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = PROBE_SIZE;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return resolve(undefined);
        context.drawImage(image, 0, 0, PROBE_SIZE, PROBE_SIZE);
        resolve(averageLuminance(context.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE).data));
      } catch {
        resolve(undefined);
      }
    };
    image.onerror = () => resolve(undefined);
    image.src = url;
  });
}

export async function wallpaperLuminance(css: string): Promise<number | undefined> {
  const url = imageUrlOf(css);
  return url ? probeImageLuminance(url) : gradientLuminance(css);
}
