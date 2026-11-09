/* Seul 2026 — çevrimdışı önbellek. Uygulama kabuğu ve fotoğraflar önceden; fontlar ilk kullanımda önbelleğe alınır. */
const VERSION = "seul-v5"; // index.html'deki ?v= ile aynı tutulur
const IMG = ["bayram", "naksan", "seokchon", "yeouido", "nami", "dmz", "suwon", "rink", "bosingak", "seoulsky", "coex", "seongsu", "hongdae",
  "itaewon", "nmk", "namsangol", "myeongdong", "namsan", "ddp", "gwangjang", "ikseon", "gwanghwamun", "insadong", "changdeok", "bukchon", "gyeongbok"];
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/app.css?v=5",
  "assets/data.js?v=5",
  "assets/research.js?v=5",
  "assets/app.js?v=5",
  "assets/icons/icon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png",
  ...IMG.map(id => "assets/img/" + id + ".jpg")
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Canlı hava verisi her zaman ağdan; uygulama kendi yedeğini localStorage'da tutar.
  if (url.hostname === "api.open-meteo.com") return;
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin === location.origin || isFont) {
    // Önce ağ (güncel sürüm), ağ yoksa önbellek.
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
    );
  }
});
