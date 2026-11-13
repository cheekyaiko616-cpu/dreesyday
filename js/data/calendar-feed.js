// Event list の「カレンダーに追加した予定」（calendar.json）を読む。
// 通信できないときは、最後に読めた内容を使う。Claude上のプレビューでは見本の予定を使う。
import { fetchT } from '../util/net.js';
import { state, notify } from '../state.js';
import { CALENDAR } from '../config.js';
import { RULES } from './rules.js';
import { sampleCalendar } from './sample.js';

const HEX = /^#[0-9a-f]{6}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

function clean(list) {
  return (Array.isArray(list) ? list : []).filter((x) => x && ISO.test(x.from) && ISO.test(x.to) && x.title).map((x) => ({
    id: str(x.id, 120), title: str(x.title, 100), from: x.from, to: x.to >= x.from ? x.to : x.from,
    place: str(x.place, 100), tab: str(x.tab, 20), color: HEX.test(x.color) ? x.color : '#475569',
    open: str(x.open, 5), start: str(x.start, 5), note: str(x.note, 400)
  }));
}

function cached() {
  try { const c = JSON.parse(localStorage.getItem(CALENDAR.cacheKey) || 'null'); return c && Array.isArray(c.items) ? c : null; } catch (e) { return null; }
}

export async function loadCalendar() {
  if (__PREVIEW__) { state.calendar = { status: 'sample', items: clean(sampleCalendar()), at: '' }; notify(); return; }
  try {
    const res = await fetchT(`${CALENDAR.url}?t=${Date.now()}`, { cache: 'no-store' });
    if (res.status === 404) { state.calendar = { status: 'ok', items: [], at: '' }; notify(); return; }
    if (!res.ok) throw new Error('calendar');
    const body = await res.json();
    const items = clean(body.items);
    const at = str(body.savedAt, 30);
    try { localStorage.setItem(CALENDAR.cacheKey, JSON.stringify({ items, at })); } catch (e) { /* 保存できなくても続ける */ }
    state.calendar = { status: 'ok', items, at };
  } catch (e) {
    const c = cached();
    state.calendar = c ? { status: 'stale', items: c.items, at: c.at } : { status: 'error', items: [], at: '' };
  }
  notify();
}

/** その日にかかる予定。 */
export const eventsOn = (date) => state.calendar.items.filter((x) => x.from <= date && x.to >= date);

/** 予定の服装の種類。設定 → rules.json の tabFormality（タブ名の一部一致）→ カジュアル の順。 */
export function formalityOf(ev) {
  const own = state.settings.tabFormality[ev.tab];
  if (own) return own;
  const hit = Object.keys(RULES.tabFormality).find((k) => !k.startsWith('_') && (ev.tab.includes(k) || ev.title.includes(k)));
  return hit ? RULES.tabFormality[hit] : 'casual';
}
