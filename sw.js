const CACHE_NAME = 'gaswallet-v5-google-sheets';
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
  const url = new URL(request.url);
  if(!response || !response.ok) return response;

  if(url.pathname.endsWith('/index.html') || url.pathname.endsWith('/customer.html') || url.pathname.endsWith('/Bharatgas/')){
    const html = await response.text();
    const gate = '<script>location.replace("./admin.html");</script>';
    const injected = html.replace('</body>', gate+'</body>');
    return new Response(injected,{headers:{'Content-Type':'text/html; charset=utf-8'}});
  }
  return response;
}

self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET') return;
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
