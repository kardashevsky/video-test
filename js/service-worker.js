// service-worker.js

const CACHE_NAME = 'genza-static-v1';
const ASSETS_TO_CACHE = [
  '/',                                // если нужен оффлайн индекс
  '/index.html',
  '/index.css',
  '/assets/background_video.mp4',
  '/assets/icons/logo.svg',
  // сюда можно добавить другие ваши статические ресурсы
];

self.addEventListener('install', event => {
  // при установке сразу кешируем нужные файлы
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // убираем старые кэши
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // для видео используем стратегию «cache-first»
  if (req.url.endsWith('background_video.mp4')) {
    event.respondWith(
      caches.match(req).then(cachedResp => {
        if (cachedResp) {
          return cachedResp;
        }
        return fetch(req).then(networkResp => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkResp.clone());
            return networkResp;
          });
        });
      })
    );
    return;
  }

  // для остальных — обычный network-first или cache-fallback
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
