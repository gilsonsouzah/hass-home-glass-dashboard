import type { HeaderConfig } from '../../sections/HomeHeader';
import { localize } from '../../utils/LocalizationService';
import { isSpecialPageType } from './pageTypes';

export function buildHeaderConfig(config: any): HeaderConfig {
  const pageType = config.pageType;
  const isGroupPage = pageType === 'group';
  const isSpecialPage = isSpecialPageType(pageType);

  if (!isGroupPage && !isSpecialPage) {
    return { title: config.title || localize('pages.my_home'), isGroupPage: false, showMenu: true };
  }

  let title = config.title || 'Page';
  if (pageType === 'room') title = config.title || localize('pages.default_room');
  else if (pageType === 'scenes') title = localize('pages.scenes');
  else if (pageType === 'cameras') title = localize('pages.cameras');

  return { title, isGroupPage, isSpecialPage, showMenu: !isGroupPage, showBackButton: isSpecialPage };
}

/** Room pages show the area name; every other page shows config.title. */
export function headerTitleFor(config: any): string {
  return config.pageType === 'room' ? (config.areaName || config.title) : config.title;
}
