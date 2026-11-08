import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitForecast } from '../src/sections/weatherForecast.ts';

const day = (iso: string, temperature = 20) => ({ datetime: iso, temperature });
const now = new Date(2026, 10, 8, 16, 0);

test('splitForecast picks today by date and lists the next days', () => {
  const list = [day('2026-11-07T12:00:00'), day('2026-11-08T12:00:00', 25), day('2026-11-09T12:00:00'), day('2026-11-10T12:00:00')];
  const { today, upcoming } = splitForecast(list, now);
  assert.equal(today?.temperature, 25);
  assert.equal(upcoming.length, 2);
});

test('splitForecast does not mistake tomorrow for today when the list starts tomorrow', () => {
  const list = Array.from({ length: 6 }, (_, i) => day(`2026-11-${String(9 + i).padStart(2, '0')}T12:00:00`));
  const { today, upcoming } = splitForecast(list, now);
  assert.equal(today, null);
  assert.equal(upcoming.length, 5);
});
