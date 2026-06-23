self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // HTML / 导航请求：永远走网络，绝不缓存
  // 这样每次打开都拿到最新的 index.html，引用最新的 chunk hash
  if (event.request.mode === 'navigate') return;

  const url = new URL(event.request.url);

  // 只缓存带 hash 的静态资源（Vite 产物：assets/xxx-Ab1Cd2Ef.js/css）
  // 文件名含 hash，内容永远不变，可以安全永久缓存
  if (!url.pathname.startsWith('/assets/')) return;
  if (!/[-\.][a-zA-Z0-9]{6,12}\.(js|css)(\?|$)/.test(url.pathname)) return;

  event.respondWith(
    caches.open('echoes-assets-v2').then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // 只缓存正常响应，防止 SPA fallback 把 404 变成 HTML
          if (response.ok && !(response.headers.get('content-type') || '').includes('text/html')) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      }),
    ),
  );
});
