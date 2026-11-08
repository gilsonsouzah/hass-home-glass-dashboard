export interface SummaryEntity {
  entity_id: string;
  state: string;
  attributes?: Record<string, any>;
}

export type SummaryTarget = { entityId: string } | { page: string };

export interface SummaryItem {
  id: string;
  text: string;
  alert: boolean;
  target: SummaryTarget;
}

export interface SummaryContext {
  localize: (key: string, fallback: string) => string;
  language: string;
  temperatureUnit: string;
}

export const MAX_SUMMARY_ITEMS = 4;

type SummaryKey =
  | 'alarm'
  | 'leak'
  | 'smoke'
  | 'gas'
  | 'co'
  | 'lock-unavailable'
  | 'lock-unlocked'
  | 'garage'
  | 'door'
  | 'window'
  | 'opening'
  | 'lights'
  | 'media'
  | 'climate';

// Device group pages (view path === group id)
const PAGE = { security: 'security', lighting: 'lighting', media: 'media', climate: 'climate' } as const;

const SENSOR_KEYS = new Map<string, SummaryKey>([
  ['moisture', 'leak'],
  ['smoke', 'smoke'],
  ['gas', 'gas'],
  ['carbon_monoxide', 'co'],
  ['door', 'door'],
  ['window', 'window'],
  ['opening', 'opening'],
]);

const LOCK_UNLOCKED_STATES = new Set(['unlocked', 'unlocking', 'open']);
const COVER_OPEN_STATES = new Set(['open', 'opening', 'closing']);
const UNREADABLE_STATES = new Set(['unavailable', 'unknown']);

const domainOf = (entityId: string) => entityId.split('.')[0];

// Mirrors isGarageDoorOrGate in config/deviceGroup.ts; relative runtime imports would break node's test runner.
const isGarageOrGate = (attributes?: Record<string, any>) => ['garage', 'gate'].includes(attributes?.device_class?.toLowerCase());

/** Whether the entity can ever contribute to the summary, whatever its current state. */
export function isSummaryRelevant({ entity_id, attributes }: Pick<SummaryEntity, 'entity_id' | 'attributes'>): boolean {
  switch (domainOf(entity_id)) {
    case 'alarm_control_panel':
    case 'lock':
    case 'light':
    case 'media_player':
    case 'climate':
      return true;
    case 'cover':
      return isGarageOrGate(attributes);
    case 'binary_sensor':
      return SENSOR_KEYS.has(attributes?.device_class);
    default:
      return false;
  }
}

function keyOf({ entity_id, state, attributes }: SummaryEntity): SummaryKey | null {
  switch (domainOf(entity_id)) {
    case 'alarm_control_panel':
      return state === 'triggered' ? 'alarm' : null;
    case 'lock':
      if (state === 'unavailable') return 'lock-unavailable';
      return LOCK_UNLOCKED_STATES.has(state) ? 'lock-unlocked' : null;
    case 'cover':
      return isGarageOrGate(attributes) && COVER_OPEN_STATES.has(state) ? 'garage' : null;
    case 'binary_sensor':
      return state === 'on' ? (SENSOR_KEYS.get(attributes?.device_class) ?? null) : null;
    case 'light':
      return state === 'on' ? 'lights' : null;
    case 'media_player':
      return state === 'playing' ? 'media' : null;
    case 'climate':
      return !UNREADABLE_STATES.has(state) && Number.isFinite(attributes?.current_temperature) ? 'climate' : null;
    default:
      return null;
  }
}

const nameOf = (e: SummaryEntity): string => e.attributes?.friendly_name || e.entity_id;

const fill = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));

function createFormats(language: string) {
  try {
    return { number: new Intl.NumberFormat(language, { maximumFractionDigits: 0 }), plural: new Intl.PluralRules(language) };
  } catch {
    return { number: new Intl.NumberFormat('en', { maximumFractionDigits: 0 }), plural: new Intl.PluralRules('en') };
  }
}

const single = (list: SummaryEntity[]): SummaryTarget | null => (list.length === 1 ? { entityId: list[0].entity_id } : null);

/** Ordered summary items, at most MAX_SUMMARY_ITEMS: alerts first, then by relevance. */
export function buildSummary(entities: SummaryEntity[], ctx: SummaryContext): SummaryItem[] {
  const byKey = new Map<SummaryKey, SummaryEntity[]>();
  for (const entity of entities) {
    const key = keyOf(entity);
    if (key) byKey.set(key, [...(byKey.get(key) ?? []), entity]);
  }
  const of = (...keys: SummaryKey[]) => keys.flatMap((key) => byKey.get(key) ?? []);

  const formats = createFormats(ctx.language);
  const t = (key: string, fallback: string, vars: Record<string, string | number> = {}) => fill(ctx.localize(key, fallback), vars);
  const count = (n: number) => formats.number.format(n);

  const items: SummaryItem[] = [];
  const add = (id: string, text: string, alert: boolean, target: SummaryTarget) => items.push({ id, text, alert, target });

  // page is omitted when no group page lists these sensors (moisture resolves to OTHER); the first entity's more-info is the fallback
  const addAlert = (key: SummaryKey, page: string | null, localeKey: string, fallback: string) => {
    const list = of(key);
    if (!list.length) return;
    const label = t(localeKey, fallback);
    add(key, list.length === 1 ? label : `${label} (${count(list.length)})`, true, single(list) ?? (page ? { page } : { entityId: list[0].entity_id }));
  };

  addAlert('alarm', PAGE.security, 'summary.alarm_triggered', 'Alarm triggered');
  addAlert('leak', null, 'summary.leak_detected', 'Leak detected');
  addAlert('smoke', PAGE.security, 'summary.smoke_detected', 'Smoke detected');
  addAlert('gas', PAGE.security, 'summary.gas_detected', 'Gas detected');
  addAlert('co', PAGE.security, 'summary.co_detected', 'Carbon monoxide detected');
  addAlert('lock-unavailable', PAGE.security, 'summary.lock_unavailable', 'Lock unavailable');

  const unlocked = of('lock-unlocked');
  if (unlocked.length === 1) {
    add('lock-unlocked', t('summary.lock_unlocked_named', '{name} unlocked', { name: nameOf(unlocked[0]) }), false, single(unlocked)!);
  } else if (unlocked.length > 1) {
    add('lock-unlocked', t('summary.locks_unlocked', '{n} locks unlocked', { n: count(unlocked.length) }), false, { page: PAGE.security });
  }

  const garage = of('garage');
  if (garage.length === 1) {
    add('garage', t('summary.open_named', '{name} open', { name: nameOf(garage[0]) }), false, single(garage)!);
  } else if (garage.length > 1) {
    add('garage', t('summary.garage_open', '{n} garage doors and gates open', { n: count(garage.length) }), false, { page: PAGE.security });
  }

  const openings = of('door', 'window', 'opening');
  if (openings.length === 1) {
    add('openings', t('summary.open_named', '{name} open', { name: nameOf(openings[0]) }), false, single(openings)!);
  } else if (openings.length > 1) {
    const n = count(openings.length);
    const allDoors = byKey.get('door')?.length === openings.length;
    const allWindows = byKey.get('window')?.length === openings.length;
    const text = allDoors
      ? t('summary.doors_open', '{n} doors open', { n })
      : allWindows
        ? t('summary.windows_open', '{n} windows open', { n })
        : t('summary.openings_open', '{n} doors and windows open', { n });
    add('openings', text, false, { page: PAGE.security });
  }

  const lights = of('lights');
  if (lights.length) {
    const form = formats.plural.select(lights.length) === 'one' ? 'one' : 'other';
    const fallback = form === 'one' ? '{n} light on' : '{n} lights on';
    add('lights', t(`summary.lights_on_${form}`, fallback, { n: count(lights.length) }), false, single(lights) ?? { page: PAGE.lighting });
  }

  const media = of('media');
  if (media.length === 1) {
    add('media', t('summary.media_named', '{name} playing', { name: nameOf(media[0]) }), false, single(media)!);
  } else if (media.length > 1) {
    add('media', t('summary.media_playing', '{n} media players playing', { n: count(media.length) }), false, { page: PAGE.media });
  }

  const climate = of('climate');
  if (climate.length) {
    const temperatures = climate.map((e) => Math.round(e.attributes!.current_temperature) || 0);
    const low = Math.min(...temperatures);
    const high = Math.max(...temperatures);
    const range = low === high ? count(low) : `${count(low)}–${count(high)}`;
    add('climate', `${range}${ctx.temperatureUnit}`, false, single(climate) ?? { page: PAGE.climate });
  }

  return items.slice(0, MAX_SUMMARY_ITEMS);
}
