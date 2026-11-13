// 駅の一覧(data/stations.json)から、会場にいちばん近い駅を探す。一覧は初めて使うときに1回だけ読む。
let index = null;
let loading = null;

const cell = (lat, lon) => `${Math.floor(lat * 10)},${Math.floor(lon * 10)}`;

function build(rows) {
  const map = new Map();
  for (const [name, lat, lon] of rows) {
    const k = cell(lat, lon);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push({ name, lat, lon });
  }
  return map;
}

function load() {
  if (index) return Promise.resolve(index);
  if (!loading) {
    loading = fetch(new URL('data/stations.json', document.baseURI))
      .then((r) => { if (!r.ok) throw new Error('stations'); return r.json(); })
      .then((rows) => (index = build(rows)))
      .finally(() => { loading = null; });
  }
  return loading;
}

// 2点間のおよその距離(km)
function km(a, b) {
  const dy = (b.lat - a.lat) * 111;
  const dx = (b.lon - a.lon) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** 近い順に最大 n 駅。2km→10km→30km と範囲を広げて探す。 */
export async function nearStations(pos, n = 3) {
  const map = await load();
  for (const r of [2, 10, 30]) {
    const span = Math.ceil(r / 11) + 1;
    const cy = Math.floor(pos.lat * 10);
    const cx = Math.floor(pos.lon * 10);
    const best = new Map();
    for (let y = cy - span; y <= cy + span; y++) {
      for (let x = cx - span; x <= cx + span; x++) {
        for (const s of map.get(`${y},${x}`) || []) {
          const d = km(pos, s);
          if (d > r) continue;
          const old = best.get(s.name);
          if (!old || d < old.km) best.set(s.name, { name: s.name, km: d });
        }
      }
    }
    if (best.size) return [...best.values()].sort((a, b) => a.km - b.km).slice(0, n);
  }
  return [];
}
