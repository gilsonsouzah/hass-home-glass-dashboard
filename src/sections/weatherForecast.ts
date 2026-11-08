export interface ForecastDay {
  datetime: string;
  temperature?: number;
  templow?: number;
  condition?: string;
}

const MAX_UPCOMING_DAYS = 5;

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Separates today's entry from the following days; providers may start the list at tomorrow. */
export function splitForecast(forecast: ForecastDay[], now: Date): { today: ForecastDay | null; upcoming: ForecastDay[] } {
  const todayStart = dayStart(now);
  const dated = forecast
    .map((day) => ({ day, start: dayStart(new Date(day.datetime)) }))
    .filter((entry) => !Number.isNaN(entry.start) && entry.start >= todayStart);
  const today = dated.find((entry) => entry.start === todayStart)?.day ?? null;
  const upcoming = dated.filter((entry) => entry.start > todayStart).slice(0, MAX_UPCOMING_DAYS).map((entry) => entry.day);
  return { today, upcoming };
}
