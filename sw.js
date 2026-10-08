const CACHE_NAME = 'gaswallet-v7-live-sheets';
const ASSETS = [
  './index.html','./manifest.json','./admin.html','./customer.html','./sheets-bridge.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache =>
    cache.addAll(ASSETS).catch(err => console.log('SW partial cache:', err))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null))
  ).then(() => self.clients.claim()));
});

async function transformedResponse(request, response){
  // Do not redirect index/customer to admin. Both portals are part of the live site.
  return response;
}

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;

  // Google Apps Script is the live database. Never serve/cache its JSONP
  // responses from the PWA cache.
  if(event.request.url.indexOf('script.google.com/macros/s/AKfycbySlLpuOXdozPRJ6tGYXdfALJM2T05YBoP0IuHk5KMnnQgcO1nzwNecNkc0C2MGZUSl/exec') === 0){
    event.respondWith(fetch(event.request, { cache:'no-store' }));
    return;
  }
  event.respondWith((async()=>{
    try{
      const network = await fetch(event.request);
      const transformed = await transformedResponse(event.request, network.clone());
      const cache = await caches.open(CACHE_NAME);
      if(event.request.url.startsWith('http')) await cache.put(event.request, transformed.clone());
      return transformed;
    }catch(e){
      const cached = await caches.match(event.request);
      return cached || Response.error();
    }
  })());
});
