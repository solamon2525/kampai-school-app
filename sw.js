// ── Service Worker: Super App บ้านคำไผ่ ──
const CACHE_NAME = 'kampai-v1';
const CORE_ASSETS = [
    '/index.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// ── Install: cache core assets ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

// ── Activate: remove old caches ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// ── Fetch: Network-first for Firebase/API, Cache-first for static ──
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // ข้ามคำขอที่ไม่ใช่ GET หรือ Scheme ที่ไม่รองรับ (เช่น chrome-extension)
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) return;

    // Firebase / googleapis → network only (ข้ามไปใช้ network ตรงๆ)
    if (
        url.hostname.includes('firebasedatabase') ||
        url.hostname.includes('googleapis') ||
        url.hostname.includes('gstatic') ||
        url.hostname.includes('firebaseapp')
    ) {
        return;
    }

    // Static assets → Cache-first, fallback network
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request)
                .then(response => {
                    // Cache หน้า HTML และ assets หลัก
                    if (
                        response.ok &&
                        (url.pathname.endsWith('.html') ||
                            url.pathname.endsWith('.css') ||
                            url.pathname.endsWith('.js') ||
                            url.pathname.endsWith('.png') ||
                            url.pathname.endsWith('.jpg'))
                    ) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    // Offline fallback → แสดงหน้าหลักจาก cache
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
        })
    );
});
