/** Maps an HA/browser language tag (pt-BR, zh-Hans, es-419) to a supported base language, or the default. */
export function resolveLanguage(tag: string | undefined, supported: readonly string[], fallback = 'en'): string {
  const base = (tag ?? '').toLowerCase().split(/[-_]/)[0];
  return supported.includes(base) ? base : fallback;
}
