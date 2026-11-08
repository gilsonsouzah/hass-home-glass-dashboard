export const SPECIAL_PAGE_TYPES = ['room', 'scenes', 'cameras'];

export const isSpecialPageType = (pageType: unknown): boolean =>
  typeof pageType === 'string' && SPECIAL_PAGE_TYPES.includes(pageType);

export function pageContextFor(pageType: unknown): string {
  return typeof pageType === 'string' && (isSpecialPageType(pageType) || pageType === 'group') ? pageType : 'home';
}
