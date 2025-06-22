/* ------------------------------------------------------------------
   Versioning
   ------------------------------------------------------------------ */
   const CACHE_NAME = 'slunce-v3.0.0';   // ← bump whenever you change this file
   const urlsToCache = [
     '/',                         // root for PWA standalone launches
     '/index.html',
     '/style.css',
   
     // entry + critical modules
     '/src/main.js',
     '/src/ui/controller.js',
     '/src/core/solarCalc.js',
     '/src/core/solarMath.js',
     '/src/core/timezone.js',
     '/src/core/solarExtras.js',
     '/src/pwa/install.js',
     '/src/pwa/update.js',
   
     // metadata & icons
     '/manifest.json',
     '/favicon.ico',
     '/icons/icon-192x192.png',
     '/icons/icon-512x512.png'
   ];
   
   /* ------------------------------------------------------------------
      Install – cache the “app shell”
      ------------------------------------------------------------------ */
   self.addEventListener('install', (event) => {
     event.waitUntil(
       caches.open(CACHE_NAME)
         .then((cache) => cache.addAll(urlsToCache))
         .then(() => self.skipWaiting())          // become active SW immediately
     );
   });
   
   /* ------------------------------------------------------------------
      Activate – drop stale caches, claim clients
      ------------------------------------------------------------------ */
   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys()
         .then((names) =>
           Promise.all(
             names.map((name) => name !== CACHE_NAME && caches.delete(name))
           )
         )
         .then(() => self.clients.claim())
     );
   });
   
   /* ------------------------------------------------------------------
      Messaging – allow page to request skipWaiting
      ------------------------------------------------------------------ */
   self.addEventListener('message', (event) => {
     if (event.data && event.data.type === 'SKIP_WAITING') {
       self.skipWaiting();
     }
   });
   
   /* ------------------------------------------------------------------
      Fetch – cache-first, network fallback, offline HTML fallback
      ------------------------------------------------------------------ */
   self.addEventListener('fetch', (event) => {
     event.respondWith(
       caches.match(event.request)
         .then((cached) => cached || fetch(event.request)
           .then((response) => {
             // only cache successful, same-origin, basic responses
             if (
               response &&
               response.status === 200 &&
               response.type === 'basic'
             ) {
               const copy = response.clone();
               caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
             }
             return response;
           })
           .catch(() => {
             // if offline and navigation request: serve fallback page
             if (event.request.destination === 'document') {
               return caches.match('/index.html');
             }
           })
         )
     );
   });
   
   /* ------------------------------------------------------------------
      Background Sync & Push (optional hooks, no functional changes)
      ------------------------------------------------------------------ */
   self.addEventListener('sync', (event) => {
     if (event.tag === 'background-sync') {
       // background-sync logic goes here if ever needed
     }
   });
   
   self.addEventListener('push', (event) => {
     if (event.data) {
       const options = {
         body: event.data.text(),
         icon: '/icons/icon-192x192.png',
         badge: '/icons/icon-192x192.png',
         tag: 'slunce-notification',
         renotify: true
       };
       event.waitUntil(
         self.registration.showNotification('Slunce', options)
       );
     }
   });
   