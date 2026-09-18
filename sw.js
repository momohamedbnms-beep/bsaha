const V = 'bsaha-v3-1';
const CORE = ['./','index.html','app.js','data.js','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(CORE).catch(()=>{}))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (/\.(html|js|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/')) {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(x => { const c = x.clone(); caches.open(V).then(y => y.put(e.request, c)); return x; })));
  }
});
