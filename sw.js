// オフラインでも開けるように、アプリの部品を端末に保存する。天気・予定は保存しない（毎回取りに行く）。
// 切り抜きのモデル（2MB超）は、初めて使ったときに保存する（最初に開くときの通信を減らすため）。
// ファイルを追加・削除したら ASSETS を直し、CACHE の番号を上げる。
const CACHE = 'morning-brief-v4';
const ASSETS = ['./', 'index.html', 'dist/app.min.js', 'dist/app.min.css', 'manifest.webmanifest',
  'fonts/BarlowCondensed-600.woff', 'fonts/CormorantGaramond-500-italic.woff', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// 自分のファイルだけ：まず通信、だめなら保存したもの
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', location).pathname)) return;
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
