// RemitosApp — Service Worker
const CACHE = 'remitosapp-v26';
const STATIC = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Instalar: cachear assets estáticos (NO skipWaiting — esperamos que el usuario confirme)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
});

// El cliente puede mandar SKIP_WAITING para activar la nueva versión
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Activar: limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: solo cachear assets estáticos propios, dejar pasar TODO lo demás sin tocar
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Requests externos (Supabase, fonts, CDN) o no-GET → el navegador los maneja directamente
  if (url.origin !== self.location.origin || e.request.method !== 'GET') return;

  // Solo assets propios GET → cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});
