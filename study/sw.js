/* 會考衝刺站 service worker：預先快取全站，離線可用。VERSION 由 tools/build.py 自動更新。 */
const VERSION = '7737305ac0ee';
const CACHE = 'huikao-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('precache.json', { cache: 'no-store' });
    const list = (await res.json()).files;
    // 分批加入，單一檔案失敗不讓整個安裝失敗
    await Promise.all(list.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch((e) => console.warn('precache fail', u, e))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('huikao-') && k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部連結不攔
  // 只處理本站範圍內的檔案（../anatomy/ 等兄弟資料夾不攔）
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  const isPage = req.mode === 'navigate';
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: isPage || url.pathname.endsWith('.html') });
    const network = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const key = isPage ? new Request(url.origin + url.pathname) : req;
        cache.put(key, res.clone());
      }
      return res;
    }).catch(() => null);
    if (cached) { event.waitUntil(network); return cached; } // 先給快取，背景更新
    const res = await network;
    if (res) return res;
    if (isPage) { const home = await cache.match('index.html'); if (home) return home; }
    return new Response('離線中，這個檔案還沒有快取。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
