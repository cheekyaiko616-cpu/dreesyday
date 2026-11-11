// 持ち物チェック。日付ごとに、チェックした物を残す（7日より前は消す）。
import { state, notify } from '../state.js';
import { get, put } from './db.js';
import { todayIso, addDaysIso } from '../util/date.js';

export async function loadChecks() {
  const c = await get('kv', 'checks');
  const since = addDaysIso(todayIso(), -7);
  state.checks = {};
  if (c && typeof c === 'object') Object.keys(c).forEach((d) => { if (d >= since) state.checks[d] = c[d]; });
}

export const isChecked = (date, name) => !!(state.checks[date] && state.checks[date][name]);

export async function toggleCheck(date, name) {
  const day = state.checks[date] || (state.checks[date] = {});
  if (day[name]) delete day[name]; else day[name] = true;
  await put('kv', 'checks', state.checks);
  notify();
}
