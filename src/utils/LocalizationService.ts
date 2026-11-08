import * as en from '../translations/en.json';
import * as de from '../translations/de.json';
import * as es from '../translations/es.json';
import * as fr from '../translations/fr.json';
import * as it from '../translations/it.json';
import * as nl from '../translations/nl.json';
import * as pt from '../translations/pt.json';
import * as ru from '../translations/ru.json';
import * as zh from '../translations/zh.json';
import * as he from '../translations/he.json';
import { resolveLanguage } from './languageCode';

/** Registry of currently supported languages */
const languages: Record<string, any> = {
  en,
  de,
  es,
  fr,
  it,
  nl,
  pt,
  ru,
  zh,
  he,
};

/** The fallback language if the user-defined language isn't defined */
const DEFAULT_LANG = 'en';

/**
 * Get a string by keyword and language.
 *
 * @param {string} key The key to look for in the object notation of the language file (E.g., `status.on`).
 * @param {string} lang The language to get the string from (E.g., `en`).
 *
 * @returns {string | undefined} The requested string or undefined if the keyword doesn't exist/on error.
 */
function getTranslatedString(key: string, lang: string): string | undefined {
  try {
    return key.split('.').reduce((o, i) => (o as Record<string, unknown>)[i], languages[lang]) as string;
  } catch {
    return undefined;
  }
}

/**
 * Singleton instance of the localization function.
 *
 * This variable is set by {@link setupLocalize} and used by {@link localize}.
 *
 * - Must be initialized before {@link localize} is called.
 * - Holds a closure that translates keys based on the language set during setup.
 *
 * @private
 */
let _localize: ((key: string, fallback?: string) => string) | undefined = undefined;

/**
 * Set up the localization.
 *
 * Region/script tags (pt-BR, zh-Hans) resolve to the base language file. A missing key falls back to English,
 * then to the caller-provided default, then to the key itself.
 *
 * @param {any} hass The Home Assistant object.
 */
export function setupLocalize(hass?: any): void {
  const lang = resolveLanguage(
    hass?.locale?.language || hass?.language || navigator.language,
    Object.keys(languages),
    DEFAULT_LANG,
  );

  _localize = (key: string, fallback?: string) =>
    getTranslatedString(key, lang) ?? getTranslatedString(key, DEFAULT_LANG) ?? fallback ?? key;
}

/**
 * Translate a key using the globally configured localize function.
 * `fallback` is returned when the key is missing in both the user language and English.
 */
export function localize(key: string, fallback?: string): string {
  if (!_localize) {
    console.warn('localize is not initialized! Call setupLocalize first.');
    return fallback ?? key;
  }
  return _localize(key, fallback);
}
