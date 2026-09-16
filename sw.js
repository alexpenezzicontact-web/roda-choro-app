const CACHE='roda-v5';
const CORE=[
  './?v=5','./index.html?v=5','./styles.css?v=5','./data.js?v=5','./app.js?v=5','./manifest.webmanifest?v=5',
  './assets/hero.js?v=5','./assets/composers.js?v=5','./assets/collections.js?v=5'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res}).catch(()=>caches.match('./?v=5').then(r=>r||caches.match('./index.html?v=5'))));return;
  }
  if(url.origin===self.location.origin){
    event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res}).catch(()=>caches.match(event.request)));
  }
});