// 着た履歴の集計（純関数）。クローゼットの「着た回数・最後に着てから何日」に使う。点数には使わない。

const dayNo = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
/** 2つの日付の差（日）。a が後なら正。 */
export const diffDays = (a, b) => dayNo(a) - dayNo(b);

/**
 * wears: 着た記録 [{ date, items, rating }]。date: 基準の日。
 * 基準の日より前に着た記録だけを数える（「着なかった」の評価は除く）。
 * 返す: { count: { id: 回数 }, ago: { id: 最後に着てから何日 }, total: 記録の数 }
 */
export function wearHistory(wears, date) {
  const count = {}, ago = {};
  let total = 0;
  (wears || []).forEach((w) => {
    if (!w || !w.items || w.rating === 'did_not_use' || !(w.date < date)) return;
    total++;
    const n = diffDays(date, w.date);
    const ids = [w.items.tops, w.items.bottoms, w.items.outer, w.items.shoes, ...(w.items.accessories || [])].filter(Boolean);
    ids.forEach((id) => { count[id] = (count[id] || 0) + 1; if (ago[id] === undefined || n < ago[id]) ago[id] = n; });
  });
  return { count, ago, total };
}
