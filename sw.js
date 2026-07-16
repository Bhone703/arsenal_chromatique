const CACHE_NAME = 'arsenal-chromatique-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne jamais mettre en cache quoi que ce soit d'externe à l'application :
  // API GitHub, API Anthropic, serveur Ollama personnel... tout passe direct au réseau.
  // Cela évite de conserver des données personnelles ou des réponses de modèles
  // dans le cache du navigateur.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Pour l'app elle-même (même origine), stratégie cache d'abord avec repli réseau,
  // puis mise à jour du cache en arrière-plan.
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const network = fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
