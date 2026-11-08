const LEADING_SECTIONS = ['weather_section', 'energy_section'];
const FIXED_SECTIONS = [...LEADING_SECTIONS, 'scenes_section', 'cameras_section', 'favorites_section'];

/**
 * Order used by the pages and by the reorder modal. With a saved order, unknown ids are
 * appended (weather and energy go first, in that order). Without one: fixed sections, then areas by name.
 */
export function orderSections(
  availableIds: string[],
  savedOrder: string[],
  areaNames: Record<string, string>,
  locale?: string
): string[] {
  if (savedOrder.length === 0) {
    const fixed = FIXED_SECTIONS.filter((id) => availableIds.includes(id));
    const areas = availableIds
      .filter((id) => !FIXED_SECTIONS.includes(id))
      .sort((a, b) => (areaNames[a] ?? a).localeCompare(areaNames[b] ?? b, locale));
    return [...fixed, ...areas];
  }

  const saved = savedOrder.filter((id) => availableIds.includes(id));
  const leading = LEADING_SECTIONS.filter((id) => availableIds.includes(id) && !saved.includes(id));
  const rest = availableIds.filter((id) => !saved.includes(id) && !leading.includes(id));
  return [...leading, ...saved, ...rest];
}
