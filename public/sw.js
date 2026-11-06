// 도구 개편에서 등록한 서비스 워커와 정적 파일 캐시를 해제합니다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('workbox-precache-')).map(key => caches.delete(key)));
    await self.clients.claim();
    await self.registration.unregister();
  })());
});
