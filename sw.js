// 奧客互助協會 Service Worker：離線快取 + 通知
const VERSION = "aok-v1.5.3";
const SHELL = [
  "./", "./index.html", "./app.js", "./avatar.js", "./config.js", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  // cache: "reload" 跳過瀏覽器的 HTTP 快取（GitHub Pages 會快取 10 分鐘），新版才不會裝到舊檔
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google 地圖 / Firebase 即時資料：一律走網路，不快取（也避免違反地圖條款）
  if (/maps\.googleapis|maps\.gstatic|firebaseio|firebasedatabase|cartocdn|openstreetmap|unpkg/.test(url.hostname)) return;

  // 字型：快取優先（離線也有點陣字）
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.hostname) || /gstatic\.com\/firebasejs/.test(req.url)) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // 自家檔案：先拿快取秒開，背景再更新
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req, { ignoreSearch: true });
        const net = fetch(req, { cache: "no-cache" }).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
        return hit || (await net) || c.match("./index.html");
      })
    );
  }
});

// 點通知 → 打開（或切回）App 並跳到該任務
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = "./index.html#sos-" + (e.notification.data && e.notification.data.id || "");
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { c.postMessage({ type: "open-sos", id: e.notification.data && e.notification.data.id }); return c.focus(); }
      return self.clients.openWindow(target);
    })
  );
});

// 預留：之後接 Web Push（Firebase Cloud Messaging / VAPID）時，手機關掉 App 也收得到
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: "奧客互助協會", body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "附近有店家求救！", {
    body: d.body || "點開查看任務",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: "sos-" + (d.id || "push"),
    data: { id: d.id },
    vibrate: [120, 60, 120, 60, 240]
  }));
});
