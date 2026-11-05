// Offline cache: precache the whole (small) site, serve cache-first, refresh in background.
const VERSION = 'anatomy-v3';
const ASSETS = [
  './', 'index.html', 'style.css', 'app.js', 'content.js', 'actions.js', 'manifest.webmanifest',
  'vendor/three/build/three.module.min.js',
  'vendor/three/examples/jsm/controls/OrbitControls.js',
  'vendor/three/examples/jsm/loaders/GLTFLoader.js',
  'vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
  'vendor/three/examples/jsm/libs/meshopt_decoder.module.js',
  'models/parts.json', 'models/skeleton.glb', 'models/organs.glb', 'models/muscles.glb', 'models/ligaments.glb', 'models/attach.json', 'models/skin.glb',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(ASSETS.map((a) => c.add(new Request(a, { cache: 'reload' }))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? c.match('index.html') : Response.error());
  }));
});
