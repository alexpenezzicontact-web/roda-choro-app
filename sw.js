const CACHE='roda-v6';
const CORE=[
  './?v=6','./index.html?v=6','./styles.css?v=5','./auth.css?v=6','./data.js?v=5','./app.js?v=5','./auth-config.js?v=6','./auth.js?v=6','./manifest.webmanifest?v=6',
  './assets/hero.js?v=5','./assets/composers.js?v=5','./assets/waldir-v2.js?v=6','./assets/collections.js?v=5'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res}).catch(()=>caches.match('./?v=6').then(r=>r||caches.match('./index.html?v=6'))));return;
  }
  if(url.origin===self.location.origin){
    event.respondWith(fetch(event.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy));return res}).catch(()=>caches.match(event.request)));
  }
});
