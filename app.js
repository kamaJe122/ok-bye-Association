/* 奧客互助協會 v1.3.1
   創意發起人：Popcorn ｜ 程式美編設計：Kama
   純 HTML + JS，PWA：可離線、可加到主畫面（Android / iOS / 電腦） */
(() => {
"use strict";
const CFG = Object.assign({ GMAPS_KEY: "", FIREBASE: null, RADIUS_M: 500, SOS_EXPIRE_MIN: 60, DEMO_SEED: true }, window.AOK_CONFIG || {});
const VERSION = "v1.3.1";
const AV = window.AokAvatar;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- 小工具 ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("aok_" + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem("aok_" + k, JSON.stringify(v)); } catch (_) {} }
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ME = store.get("me", null) || (() => { const id = uid(); store.set("me", id); return id; })();
// 同一支手機有兩個身分 id：店家、勇者。切換身分就能一個人測完整流程
const SID = ME + "-s", HID = ME + "-h";
const ss = { get(k) { try { return sessionStorage.getItem("aok_" + k); } catch (_) { return null; } }, set(k, v) { try { sessionStorage.setItem("aok_" + k, v); } catch (_) {} } };
let ROLE = ss.get("role") || store.get("role", "hero");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const M_PER_DEG = 111320;
function distM(a, b) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function offset(p, northM, eastM) {
  return { lat: p.lat + northM / M_PER_DEG, lng: p.lng + eastM / (M_PER_DEG * Math.cos(p.lat * Math.PI / 180)) };
}
const fmtDist = (m) => m < 1000 ? Math.round(m) + " 公尺" : (m / 1000).toFixed(1) + " 公里";
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "剛剛" : m + " 分鐘前"; };
const code6 = () => "AOK-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.floor(Math.random() * 90 + 10);
const LV = { 1: "Lv1 碎念", 2: "Lv2 大聲", 3: "Lv3 失控" };
const ST = { open: "求救中", accepted: "勇者前往中", reported: "待店家確認", done: "已解決" };

/* ---------- 點陣圖示（7x7） ---------- */
const PAL = { k: "#1a1020", r: "#d23a2a", y: "#f2c23b", o: "#ff7a1a", w: "#fff6dc", g: "#3fae5a", b: "#2d64c8", n: "#6b4a2b", l: "#ffd23f" };
const ICONS = {
  fire: ["...o...", "..oo...", ".oyoo..", ".oyyo.o", "ooylyoo", "oyllyo.", ".oyyo.."],
  bell: ["...y...", "..yyy..", ".yyyyy.", ".yyyyy.", ".yyyyy.", "yyyyyyy", "...k..."],
  map: ["bbgbbgg", "bggbggb", "gggrggg", "ggrrrgg", "gggrggb", "bgg.ggb", "bbgbbbb"],
  bag: ["..nnn..", ".n...n.", "nnnnnnn", "nyyyyyn", "nyykyyn", "nyyyyyn", "nnnnnnn"],
  pin: ["..rrr..", ".rrrrr.", ".rrwrr.", ".rrrrr.", "..rrr..", "...r...", "...r..."],
  shop: ["rrrrrrr", "ryryryr", "rrrrrrr", ".wwwww.", ".wbwkw.", ".wwwkw.", "nnnnnnn"],
  hero: ["..www..", ".wkwkw.", "..www..", ".rrrrr.", "w.rrr.w", "..r.r..", ".kk.kk."]
};
function drawIcon(cv, name) {
  const g = cv.getContext("2d"), rows = ICONS[name]; if (!rows) return;
  g.clearRect(0, 0, 7, 7);
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (PAL[c]) { g.fillStyle = PAL[c]; g.fillRect(x, y, 1, 1); } }));
}
$$("canvas[data-icon]").forEach((c) => drawIcon(c, c.dataset.icon));

/* ---------- Toast + 8-bit 音效 ---------- */
function toast(msg, ms = 2800) {
  const box = $("#toast");
  while (box.children.length >= 2) box.firstElementChild.remove(); // 最多同時 2 則，不擋畫面
  const d = document.createElement("div"); d.className = "px"; d.textContent = msg;
  box.appendChild(d); setTimeout(() => d.remove(), ms);
}
let actx = null;
function beep(seq = [660, 880, 990]) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    seq.forEach((f, i) => {
      const o = actx.createOscillator(), v = actx.createGain();
      o.type = "square"; o.frequency.value = f; v.gain.value = 0.06;
      o.connect(v); v.connect(actx.destination);
      const t = actx.currentTime + i * 0.09; o.start(t); o.stop(t + 0.08);
    });
  } catch (_) {}
}

/* ---------- 資料層：示範模式 / Firebase ---------- */
const DB = (() => {
  let subs = [];
  const emit = (list) => subs.forEach((f) => f(list));
  if (CFG.FIREBASE && window.firebase) {
    firebase.initializeApp(CFG.FIREBASE);
    const ref = firebase.database().ref("sos");
    ref.on("value", (snap) => { const v = snap.val() || {}; const list = Object.values(v); store.set("cache", list); emit(list); });
    return {
      mode: "cloud",
      sub(f) { subs.push(f); f(store.get("cache", [])); },
      put(s) { return ref.child(s.id).set(s); },
      patch(id, p) { return ref.child(id).update(p); },
      claim(id, p) { // 搶單保護：同時兩個勇者按「接任務」只有一個成功
        return ref.child(id).transaction((cur) => (cur && cur.status === "open" ? Object.assign(cur, p) : undefined)).then((r) => r.committed);
      }
    };
  }
  // 示範模式：localStorage + BroadcastChannel（同一台裝置多個分頁會互相同步）
  const bc = "BroadcastChannel" in window ? new BroadcastChannel("aok") : null;
  const read = () => store.get("sos", []);
  const write = (l) => { store.set("sos", l); bc && bc.postMessage("sync"); emit(l); };
  bc && (bc.onmessage = () => emit(read()));
  window.addEventListener("storage", (e) => { if (e.key === "aok_sos") emit(read()); });
  return {
    mode: "demo",
    sub(f) { subs.push(f); f(read()); },
    put(s) { write(read().filter((x) => x.id !== s.id).concat(s)); return Promise.resolve(); },
    patch(id, p) { write(read().map((x) => x.id === id ? Object.assign({}, x, p) : x)); return Promise.resolve(); },
    claim(id, p) {
      const cur = read().find((x) => x.id === id);
      if (!cur || cur.status !== "open") return Promise.resolve(false);
      write(read().map((x) => x.id === id ? Object.assign({}, x, p) : x)); return Promise.resolve(true);
    }
  };
})();

/* ---------- 狀態 ---------- */
const S = {
  pos: store.get("pos", null),     // 上次位置（離線也能畫）
  list: [],
  seen: new Set(store.get("seen", [])),
  focus: null,
  gmap: null, gReady: false, gMarkers: {}, gUser: null, gCircle: null,
  lmap: null, lReady: false, lMarkers: {}, lUser: null, lCircle: null
};
const alive = (s) => Date.now() - s.createdAt < CFG.SOS_EXPIRE_MIN * 60000 || s.status === "done";
function nearby() {
  if (!S.pos) return [];
  return S.list.filter(alive)
    .map((s) => Object.assign({ d: distM(S.pos, s) }, s))
    .filter((s) => s.d <= CFG.RADIUS_M || s.owner === SID || s.heroId === HID)
    .sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1) || a.d - b.d);
}

/* ---------- 權限 ---------- */
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const notifSupported = "Notification" in window && "serviceWorker" in navigator;

function setChip(id, state, text) { const c = $(id); c.className = "chip " + (state ? "on" : "off"); if (text) c.textContent = text; }
function refreshChips() {
  setChip("#chipGps", !!S.pos);
  setChip("#chipNotif", notifSupported && Notification.permission === "granted");
  setChip("#chipNet", navigator.onLine, navigator.onLine ? (DB.mode === "cloud" ? "雲端" : "示範") : "離線");
  $("#offline").hidden = navigator.onLine;
  $("#okGps").textContent = S.pos ? "OK" : "";
  $("#okNotif").textContent = notifSupported && Notification.permission === "granted" ? "OK" : "";
}

let watchId = null;
function startGeo() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) { toast("這個瀏覽器不支援定位"); return resolve(false); }
    let first = true;
    watchId != null && navigator.geolocation.clearWatch(watchId);
    watchId = navigator.geolocation.watchPosition((p) => {
      const np = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
      const moved = !S.pos || distM(S.pos, np) > 15;
      S.pos = np; store.set("pos", np);
      if (first) { first = false; seedDemo(); resolve(true); }
      if (moved) render();
      refreshChips();
    }, (err) => {
      if (first) { first = false; resolve(false); }
      toast(err.code === 1 ? "定位被拒絕：請到瀏覽器設定 → 網站權限 → 位置 開啟" : "暫時抓不到定位，使用上次位置");
      refreshChips();
    }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  });
}
async function askNotif() {
  if (!notifSupported) {
    if (isIOS && !isStandalone) toast("iPhone 請先「加入主畫面」，從圖示打開後才能開通知", 4500);
    return false;
  }
  if (Notification.permission === "default") { try { await Notification.requestPermission(); } catch (_) {} }
  refreshChips();
  return Notification.permission === "granted";
}

/* ---------- Service Worker + 通知 ---------- */
let swReg = null;
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").then((r) => (swReg = r)).catch(() => {});
  navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.type === "open-sos") openCard(e.data.id); });
}
// 共用提醒：音效 + 畫面提示 + 系統通知
async function push(title, body, id, seq) {
  beep(seq);
  toast(title + "\n" + body, 4200);
  if (!(notifSupported && Notification.permission === "granted")) return;
  const opt = { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "sos-" + id + "-" + title.length, data: { id }, vibrate: [120, 60, 120, 60, 240] };
  try {
    const reg = swReg || (await navigator.serviceWorker.ready);
    await reg.showNotification(title, opt);
  } catch (_) { try { new Notification(title, opt); } catch (__) {} }
}
function notify(s) {
  const who = s.look ? "\n奧客外觀：" + AV.describe(s.look) : "";
  push("奧客出沒！" + (S.pos ? fmtDist(distM(S.pos, s)) + "外" : "") + "需要勇者",
    s.store + "・" + LV[s.level] + "・獎勵：" + s.reward + who, s.id);
}

/* ---------- 示範資料 ---------- */
function seedDemo() {
  if (DB.mode !== "demo" || !CFG.DEMO_SEED || store.get("seeded", false) || !S.pos) return;
  const now = Date.now();
  [
    { n: 140, e: 60, store: "（示範）巷口雞排", level: 2, desc: "客人說雞排太大塊要退錢", reward: "雞排加大一次", look: { gender: "m", age: "parent", hairColor: "black", hairLen: "short", topLen: "short", topColor: "white", bottom: "shorts", bottomColor: "khaki", shoes: "slipper", shoeColor: "blue" } },
    { n: -90, e: 310, store: "（示範）轉角咖啡", level: 1, desc: "要求插座位置但已客滿，持續碎念", reward: "美式咖啡一杯", look: { gender: "f", age: "office", hairColor: "brown", hairLen: "long", topLen: "long", topColor: "black", bottom: "skirt", bottomColor: "gray", shoes: "heels", shoeColor: "red" } },
    { n: -330, e: -260, store: "（示範）深夜拉麵", level: 3, desc: "酒後大聲叫囂，需要有人在旁陪同等待", reward: "拉麵免費一碗＋溏心蛋", look: { gender: "m", age: "elder", hairColor: "silver", hairLen: "curly", topLen: "long", topColor: "green", bottom: "pants", bottomColor: "denim", shoes: "sneaker", shoeColor: "brown" } }
  ].forEach((d, i) => (S.seen.add("demo" + i), DB.put(Object.assign({
    id: "demo" + i, owner: "demo", level: d.level, store: d.store, desc: d.desc, reward: d.reward, look: d.look,
    createdAt: now - i * 240000, status: "open"
  }, offset(S.pos, d.n, d.e)))));
  store.set("seeded", true);
  toast("已在你附近放了 3 筆示範求救，點「任務」看看");
}

/* ---------- 離線佇列 ---------- */
function queueOrPut(s) {
  if (navigator.onLine || DB.mode === "demo") return DB.put(s);
  const q = store.get("queue", []); q.push(s); store.set("queue", q);
  toast("目前離線，恢復連線後自動送出求救");
  return Promise.resolve();
}
function flushQueue() {
  const q = store.get("queue", []); if (!q.length) return;
  store.set("queue", []);
  q.forEach((s) => DB.put(Object.assign(s, { createdAt: Date.now() })));
  toast("已補送 " + q.length + " 筆離線求救");
}
addEventListener("online", () => { refreshChips(); flushQueue(); loadGoogleMaps(); });
addEventListener("offline", refreshChips);

/* ---------- 點陣雷達（離線地圖） ---------- */
const radar = $("#radar"), rg = radar.getContext("2d");
let hits = [];
function sizeRadar() {
  const r = radar.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  radar.width = Math.max(1, Math.round(r.width * dpr)); radar.height = Math.max(1, Math.round(r.height * dpr));
  rg.setTransform(dpr, 0, 0, dpr, 0, 0); rg.imageSmoothingEnabled = false;
}
function sprite(name, x, y, px) {
  const rows = ICONS[name];
  rows.forEach((row, j) => [...row].forEach((c, i) => { if (PAL[c]) { rg.fillStyle = PAL[c]; rg.fillRect(Math.round(x + i * px), Math.round(y + j * px), px, px); } }));
}
const HERO = ["..www..", ".wkwkw.", "..www..", ".rrrrr.", "w.rrr.w", "..r.r..", ".kk.kk."];
function drawRadar(t = 0) {
  if (!radar.offsetParent && radar.hidden) return;
  const w = radar.clientWidth, h = radar.clientHeight; if (!w || !h) return;
  rg.fillStyle = "#14306b"; rg.fillRect(0, 0, w, h);
  // 格線
  rg.fillStyle = "rgba(255,255,255,.06)";
  for (let x = 0; x < w; x += 24) rg.fillRect(x, 0, 2, h);
  for (let y = 0; y < h; y += 24) rg.fillRect(0, y, w, 2);
  // 星星
  for (let i = 0; i < 26; i++) { const sx = (i * 97) % w, sy = (i * 53) % h, on = (Math.floor(t / 600) + i) % 5; if (on) { rg.fillStyle = "#fff6dc"; rg.fillRect(sx, sy, 2, 2); } }
  const cx = w / 2, cy = h / 2, scale = (Math.min(w, h) / 2 - 28) / CFG.RADIUS_M;
  // 距離圈（點陣虛線）
  [100, 250, CFG.RADIUS_M].forEach((m) => {
    const R = m * scale; rg.fillStyle = m === CFG.RADIUS_M ? "#ffd23f" : "rgba(159,179,224,.55)";
    for (let a = 0; a < Math.PI * 2; a += 8 / Math.max(R, 1)) rg.fillRect(Math.round(cx + Math.cos(a) * R), Math.round(cy + Math.sin(a) * R), 3, 3);
    rg.font = "12px DotGothic16, monospace"; rg.fillText(m + "m", cx + 4, cy - R - 4);
  });
  // 北方
  rg.fillStyle = "#fff6dc"; rg.font = "12px 'Press Start 2P', monospace"; rg.fillText("N", cx - 5, 18);
  hits = [];
  if (!S.pos) {
    rg.fillStyle = "#fff6dc"; rg.font = "16px DotGothic16, monospace"; rg.textAlign = "center";
    rg.fillText("等待定位中…", cx, cy); rg.textAlign = "left"; return;
  }
  const cosLat = Math.cos(S.pos.lat * Math.PI / 180);
  nearby().forEach((s) => {
    const ex = (s.lng - S.pos.lng) * M_PER_DEG * cosLat, ny = (s.lat - S.pos.lat) * M_PER_DEG;
    const x = cx + ex * scale, y = cy - ny * scale;
    const px = s.status === "open" ? 3 + s.level : 4;
    const flick = s.status === "open" && Math.floor(t / 180 + s.createdAt) % 2 ? 1 : 0;
    const size = 7 * px;
    if (s.status === "open") sprite("fire", x - size / 2, y - size + flick, px);
    if (s.status === "open" && s.look) { const av = AV.sprite(s.look, 1); rg.drawImage(av, Math.round(x + size / 2 + 2), Math.round(y - av.height)); }
    else if (s.status === "accepted") sprite("pin", x - size / 2, y - size, px);
    else { rg.fillStyle = "#3fae5a"; rg.fillRect(x - 6, y - 12, 12, 12); }
    rg.font = "12px DotGothic16, monospace";
    const label = s.store.replace("（示範）", "");
    const tw = rg.measureText(label).width + 8;
    rg.fillStyle = "rgba(11,26,61,.85)"; rg.fillRect(x - tw / 2, y + 2, tw, 16);
    rg.fillStyle = "#fff6dc"; rg.fillText(label, x - tw / 2 + 4, y + 14);
    hits.push({ id: s.id, x, y: y - size / 2, r: Math.max(size, 26) });
  });
  sprite_hero(cx, cy);
}
function sprite_hero(cx, cy) {
  if (ROLE === "store") return sprite("shop", cx - 14, cy - 14, 4);
  const av = AV.sprite(heroLookNow(), 1);
  rg.drawImage(av, Math.round(cx - av.width / 2), Math.round(cy - av.height + 8));
}
radar.addEventListener("click", (e) => {
  const r = radar.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const hit = hits.find((h) => Math.hypot(h.x - x, h.y - y) < h.r);
  if (hit) openCard(hit.id);
});
let raf = 0;
(function loop(t) { drawRadar(t); raf = requestAnimationFrame(loop); })(0);
addEventListener("resize", () => { sizeRadar(); });

/* ---------- Google 地圖 ---------- */
const NIGHT_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d4596" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#fff6dc" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b1a3d" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#6b4a2b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1020" }] },
  { featureType: "water", stylers: [{ color: "#0b1a3d" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#3fae5a" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] }
];
function iconURL(name, px) {
  const c = document.createElement("canvas"); c.width = c.height = 7 * px;
  const g = c.getContext("2d");
  ICONS[name].forEach((row, j) => [...row].forEach((ch, i) => { if (PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(i * px, j * px, px, px); } }));
  return c.toDataURL();
}
function heroURL() {
  const c = document.createElement("canvas"); c.width = c.height = 28; const g = c.getContext("2d");
  HERO.forEach((row, j) => [...row].forEach((ch, i) => { if (PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(i * 4, j * 4, 4, 4); } }));
  return c.toDataURL();
}
// 地圖標記：火焰（或圖釘）＋奧客小人並排
const iconCache = new Map();
function markerIcon(s) {
  const name = s.status === "open" ? "fire" : "pin", px = s.status === "open" ? 4 + s.level : 4, sz = 7 * px;
  const key = name + px + (s.status === "open" && s.look ? JSON.stringify(AV.normalize(s.look)) : "");
  if (iconCache.has(key)) return iconCache.get(key);
  const av = s.status === "open" && s.look ? AV.sprite(s.look, 2) : null;
  const w = sz + (av ? av.width + 2 : 0), h = Math.max(sz, av ? av.height : 0);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  ICONS[name].forEach((row, j) => [...row].forEach((ch, i) => { if (PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(i * px, h - sz + j * px, px, px); } }));
  if (av) g.drawImage(av, sz + 2, h - av.height);
  const out = { key, url: c.toDataURL(), w, h, ax: sz / 2, ay: h };
  iconCache.set(key, out);
  return out;
}
let gLoading = false;
function loadGoogleMaps() {
  if (!CFG.GMAPS_KEY) return loadLeaflet();
  if (S.gReady || gLoading || !navigator.onLine) return;
  gLoading = true;
  window.__aokGmaps = () => { gLoading = false; S.gReady = true; initGmap(); };
  window.gm_authFailure = () => { toast("Google 地圖金鑰無效，改用免費地圖"); S.gReady = false; CFG.GMAPS_KEY = ""; loadLeaflet(); };
  const s = document.createElement("script");
  s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(CFG.GMAPS_KEY) + "&callback=__aokGmaps&v=weekly&language=zh-TW&region=TW";
  s.async = true; s.onerror = () => { gLoading = false; useRadar(); };
  document.head.appendChild(s);
}

/* ---------- 免費真實地圖（沒填 Google 金鑰時：Leaflet + OpenStreetMap 資料） ---------- */
let lLoading = false;
function loadLeaflet() {
  if (S.lReady || lLoading || !navigator.onLine) return;
  lLoading = true;
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(css);
  const s = document.createElement("script");
  s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  s.async = true;
  s.onload = () => { lLoading = false; S.lReady = true; initLmap(); };
  s.onerror = () => { lLoading = false; useRadar(); };
  document.head.appendChild(s);
}
function initLmap() {
  if (!S.pos || S.lmap) return;
  $("#gmap").hidden = false; radar.hidden = true; $("#hudMode").textContent = "街道地圖";
  S.lmap = L.map($("#gmap"), { zoomControl: false, attributionControl: true }).setView([S.pos.lat, S.pos.lng], 16);
  L.control.zoom({ position: "bottomleft" }).addTo(S.lmap);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19, subdomains: "abcd",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(S.lmap);
  S.lCircle = L.circle([S.pos.lat, S.pos.lng], { radius: CFG.RADIUS_M, color: "#ffd23f", weight: 3, fillColor: "#ffd23f", fillOpacity: 0.06, interactive: false }).addTo(S.lmap);
  S.lUser = L.marker([S.pos.lat, S.pos.lng], { icon: L.icon({ iconUrl: heroURL(), iconSize: [28, 28], iconAnchor: [14, 14] }), zIndexOffset: 1000, interactive: false }).addTo(S.lmap);
  renderLmap();
}
function renderLmap() {
  if (S.lReady && !S.lmap && S.pos) return initLmap();
  if (!S.lmap || !S.pos) return;
  S.lUser.setLatLng([S.pos.lat, S.pos.lng]); S.lCircle.setLatLng([S.pos.lat, S.pos.lng]);
  const keep = new Set();
  nearby().forEach((s) => {
    keep.add(s.id);
    const ic = markerIcon(s);
    let m = S.lMarkers[s.id];
    if (!m) { m = L.marker([s.lat, s.lng], { title: s.store }).addTo(S.lmap); m.on("click", () => openCard(s.id)); S.lMarkers[s.id] = m; }
    if (m.__k !== ic.key) { m.setIcon(L.icon({ iconUrl: ic.url, iconSize: [ic.w, ic.h], iconAnchor: [ic.ax, ic.ay], className: "px-marker" })); m.__k = ic.key; }
    m.setLatLng([s.lat, s.lng]);
  });
  Object.keys(S.lMarkers).forEach((id) => { if (!keep.has(id)) { S.lMarkers[id].remove(); delete S.lMarkers[id]; } });
}
function useRadar() { $("#gmap").hidden = true; radar.hidden = false; $("#hudMode").textContent = "點陣雷達"; sizeRadar(); }
function initGmap() {
  if (!S.pos) return;
  $("#gmap").hidden = false; radar.hidden = true; $("#hudMode").textContent = "Google 地圖";
  S.gmap = new google.maps.Map($("#gmap"), {
    center: S.pos, zoom: 16, styles: NIGHT_STYLE, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy", clickableIcons: false
  });
  S.gCircle = new google.maps.Circle({ map: S.gmap, center: S.pos, radius: CFG.RADIUS_M, strokeColor: "#ffd23f", strokeWeight: 3, fillColor: "#ffd23f", fillOpacity: 0.06, clickable: false });
  S.gUser = new google.maps.Marker({ map: S.gmap, position: S.pos, icon: { url: heroURL(), scaledSize: new google.maps.Size(28, 28), anchor: new google.maps.Point(14, 14) }, zIndex: 999 });
  renderGmap();
}
function renderGmap() {
  if (S.gReady && !S.gmap && S.pos) return initGmap();
  if (!S.gmap || !S.pos) return;
  S.gUser.setPosition(S.pos); S.gCircle.setCenter(S.pos);
  const keep = new Set();
  nearby().forEach((s) => {
    keep.add(s.id);
    const ic = markerIcon(s);
    let m = S.gMarkers[s.id];
    if (!m) { m = new google.maps.Marker({ map: S.gmap, title: s.store }); m.addListener("click", () => openCard(s.id)); S.gMarkers[s.id] = m; }
    if (m.__k !== ic.key) { m.setIcon({ url: ic.url, scaledSize: new google.maps.Size(ic.w, ic.h), anchor: new google.maps.Point(ic.ax, ic.ay) }); m.__k = ic.key; }
    m.setPosition({ lat: s.lat, lng: s.lng });
  });
  Object.keys(S.gMarkers).forEach((id) => { if (!keep.has(id)) { S.gMarkers[id].setMap(null); delete S.gMarkers[id]; } });
}
$("#recenter").addEventListener("click", () => {
  if (S.gmap && S.pos) { S.gmap.panTo(S.pos); S.gmap.setZoom(16); }
  else if (S.lmap && S.pos) S.lmap.setView([S.pos.lat, S.pos.lng], 16);
  else if (!S.pos) startGeo();
  toast(S.pos ? "已回到你的位置（半徑 " + CFG.RADIUS_M + " 公尺）" : "正在取得定位…", 1600);
});

/* ---------- 身分：店家 / 勇者 ---------- */
const heroNick = () => (store.get("hero", "") || "").trim();
const shopName = () => (store.get("shop", "") || "").trim();
let heroEditor = null;
const heroLookNow = () => (heroEditor ? heroEditor.get() : store.get("heroLook", AV.DEFAULT));
function setRole(r, quiet) {
  ROLE = r === "store" ? "store" : "hero";
  store.set("role", ROLE); ss.set("role", ROLE);
  applyRole();
  if (!quiet) { beep(ROLE === "store" ? [784, 659] : [659, 784]); toast(ROLE === "store" ? "切換成店家：可以發求救、確認勇者完成任務" : "切換成勇者：可以接附近的任務"); }
}
function applyRole() {
  document.body.dataset.role = ROLE;
  const chip = $("#chipRole");
  chip.textContent = ROLE === "store" ? "店家" : "勇者";
  chip.classList.toggle("store", ROLE === "store");
  $$(".role-btn").forEach((b) => b.setAttribute("aria-checked", String(b.dataset.role === ROLE)));
  $$("nav.tabs button[data-for]").forEach((b) => (b.hidden = b.dataset.for !== ROLE));
  $("#storeProfile").hidden = ROLE !== "store";
  $("#heroProfile").hidden = ROLE !== "hero";
  const cur = $$("nav.tabs button").find((b) => b.getAttribute("aria-selected") === "true");
  if (cur && cur.hidden) setTab("map");
  renderShopLine();
  render();
}
function renderShopLine() {
  const n = shopName();
  $("#shopLine").innerHTML = n
    ? `店家：<b>${esc(n)}</b><button class="btn ghost sm" type="button" data-go="me">修改</button>`
    : `還沒填店名<button class="btn red sm" type="button" data-go="me">去填店名</button>`;
}
$("#chipRole").addEventListener("click", () => setRole(ROLE === "store" ? "hero" : "store"));
document.addEventListener("click", (e) => {
  const rb = e.target.closest(".role-btn"); if (rb) setRole(rb.dataset.role, !!e.target.closest("#onboard"));
  const go = e.target.closest("[data-go]"); if (go) setTab(go.dataset.go);
});

/* ---------- 卡片與清單 ---------- */
const QUICK = ["客人已經冷靜下來了", "客人已離開", "已協助排隊動線", "陪店員一起處理完畢"];
const drafts = store.get("drafts", {});
const saveDrafts = () => store.set("drafts", drafts);
const lookBox = (look, cls, title, extra) => `<div class="who ${cls}"><canvas data-look="${esc(JSON.stringify(AV.normalize(look)))}"></canvas><div><span class="who-t">${title}</span>${extra || ""}${esc(AV.describe(look))}</div></div>`;
function heroBox(s) {
  const nick = s.heroNick || s.hero || "無名勇者";
  return s.heroLook ? lookBox(s.heroLook, "hero", "勇者", `<b>${esc(nick)}</b><br>`) : `<div class="who hero"><div><span class="who-t">勇者</span><b>${esc(nick)}</b></div></div>`;
}
function card(s, ctx) {
  const mineShop = s.owner === SID, mineHero = s.heroId === HID, id = esc(s.id);
  let body = "", act = "";
  const nav = S.pos && s.status !== "done" && ctx === "quest" ? `<a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking" target="_blank" rel="noopener">導航</a>` : "";
  const heroMsg = s.heroMsg ? `<div class="bubble"><span class="from">勇者 ${esc(s.heroNick || "")} 說</span>${esc(s.heroMsg)}</div>` : "";
  const storeMsg = s.storeMsg ? `<div class="bubble store"><span class="from">店家 ${esc(s.store)} 說</span>${esc(s.storeMsg)}</div>` : "";

  if (ctx === "quest") {
    if (s.status === "open") act = `<button class="btn red" data-act="accept" data-id="${id}">接任務</button>`;
    else if (!mineHero) body = `<div class="wait">已有勇者 ${esc(s.heroNick || s.hero || "")} 接下這個任務</div>`;
    else if (s.status === "accepted") {
      const d = drafts["m" + s.id] || "";
      body = `${storeMsg}<div class="report"><b>到店幫忙完了嗎？回報給店家</b>
        <div class="quick">${QUICK.map((q) => `<button type="button" class="ava-opt" data-quick="m${id}">${q}</button>`).join("")}</div>
        <textarea id="msg-${id}" data-draft="m${id}" rows="2" maxlength="80" placeholder="跟店家說明處理狀況">${esc(d)}</textarea>
        <button class="btn green wide" type="button" data-act="report" data-id="${id}">回報任務完成</button></div>`;
      act = `<button class="btn ghost" data-act="giveup" data-id="${id}">放棄任務</button>`;
    } else if (s.status === "reported") body = `${heroMsg}<div class="wait">已回報，等店家按「確認完成」…</div>`;
    else if (s.status === "done") body = `${storeMsg}${s.code ? `<div class="coupon">${esc(s.code)}</div><div class="meta">獎勵已放進背包</div>` : ""}`;
  }
  if (ctx === "mine") {
    if (s.status === "open") { body = `<div class="wait">等待附近的勇者接任務…</div>`; act = `<button class="btn ghost" data-act="cancel" data-id="${id}">取消求救</button>`; }
    if (s.status === "accepted") body = `${heroBox(s)}<div class="wait">勇者正在趕來，認明上面這個樣子</div>${storeMsg}`;
    if (s.status === "reported") {
      const d = drafts["r" + s.id] || "";
      body = `${heroBox(s)}${heroMsg}<div class="report"><b>勇者回報完成，確認一下？</b>
        <textarea id="reply-${id}" data-draft="r${id}" rows="2" maxlength="80" placeholder="回覆勇者（可不填）">${esc(d)}</textarea>
        <div class="row"><button class="btn green" type="button" data-act="confirm" data-id="${id}">確認完成並發獎勵</button>
        <button class="btn ghost" type="button" data-act="notyet" data-id="${id}">還沒解決</button></div></div>`;
    }
    if (s.status === "done") body = `${s.heroId ? heroBox(s) : ""}${s.code ? `<div class="meta">已發給勇者的兌換碼</div><div class="coupon">${esc(s.code)}</div>` : ""}`;
  }
  return `<article class="px card" id="sos-${id}">
    <div class="row"><span class="name">${esc(s.store)}</span><span class="lv lv${s.level}">${LV[s.level]}</span><span class="st ${esc(s.status)}">${ST[s.status] || ""}</span></div>
    <div class="meta">${S.pos ? fmtDist(distM(S.pos, s)) + "・" : ""}${ago(s.createdAt)}</div>
    ${s.look && s.status !== "done" ? lookBox(s.look, "", "奧客外觀") : ""}
    ${s.desc ? `<div>${esc(s.desc)}</div>` : ""}
    <div class="reward">獎勵：${esc(s.reward)}</div>
    ${body}
    ${act || nav ? `<div class="row">${act}${nav}</div>` : ""}
  </article>`;
}
function render() {
  const near = nearby();
  // 示範模式：同一支手機可以用勇者身分接自己店的任務，方便一個人測完整流程
  const others = (s) => DB.mode === "demo" || s.owner !== SID;
  const open = near.filter((s) => s.status === "open" && others(s));
  $("#hudOpen").textContent = open.length;
  $("#hudRange").textContent = CFG.RADIUS_M + "M";
  $("#badge").hidden = !open.length; $("#badge").textContent = open.length;
  $("#questList").innerHTML = near.filter(others).map((s) => card(s, "quest")).join("")
    || `<p class="empty">方圓 ${CFG.RADIUS_M} 公尺內很和平，沒有奧客出沒。</p>`;
  const mine = S.list.filter((s) => s.owner === SID && alive(s)).sort((a, b) => (b.status === "reported") - (a.status === "reported") || b.createdAt - a.createdAt);
  const toConfirm = mine.filter((s) => s.status === "reported").length;
  $("#badgeSos").hidden = $("#badgeConfirm").hidden = !toConfirm;
  $("#badgeSos").textContent = $("#badgeConfirm").textContent = toConfirm;
  $("#mySosList").innerHTML = mine.map((s) => card(s, "mine")).join("") || `<p class="empty">還沒有發出求救。</p>`;
  const bag = S.list.filter((s) => s.heroId === HID && s.status === "done" && s.code).sort((a, b) => b.doneAt - a.doneAt);
  $("#bagList").innerHTML = bag.map((s) => `<article class="px card"><div class="row"><span class="name">${esc(s.store)}</span></div>
    <div class="reward">${esc(s.reward)}</div><div class="coupon">${esc(s.code)}</div><div class="meta">出示此代碼給店員兌換</div></article>`).join("")
    || `<p class="empty">背包空空的，去接個任務吧。</p>`;
  $$("canvas[data-look]").forEach((c) => { try { AV.draw(c, JSON.parse(c.dataset.look), 3); } catch (_) {} });
  renderGmap(); renderLmap();
}
document.addEventListener("input", (e) => {
  const t = e.target.closest("[data-draft]"); if (!t) return;
  drafts[t.dataset.draft] = t.value; saveDrafts();
});
document.addEventListener("click", (e) => {
  const q = e.target.closest("[data-quick]"); if (!q) return;
  const ta = document.querySelector(`[data-draft="${q.dataset.quick}"]`); if (!ta) return;
  ta.value = ta.value ? ta.value + "，" + q.textContent : q.textContent;
  drafts[q.dataset.quick] = ta.value; saveDrafts();
});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.dataset.id, s = S.list.find((x) => x.id === id); if (!s) return;
  const act = b.dataset.act;
  if (act === "accept") {
    if (!heroNick()) { toast("先設定你的勇者綽號和長相，店家才認得你"); return setTab("me"); }
    b.disabled = true;
    const ok = await DB.claim(id, { status: "accepted", heroId: HID, heroNick: heroNick(), heroLook: AV.normalize(heroLookNow()),
      acceptedAt: Date.now(), heroMsg: null, storeMsg: null });
    if (!ok) { b.disabled = false; return toast("慢了一步，這個任務已經有人接了"); }
    beep([523, 659, 784, 1046]); toast("任務接受！店家會看到你的綽號和長相。\n處理完記得按「回報任務完成」");
  }
  if (act === "giveup") { await DB.patch(id, { status: "open", heroId: null, heroNick: null, heroLook: null, heroMsg: null, storeMsg: null }); toast("已放棄任務"); }
  if (act === "report") {
    const msg = (drafts["m" + id] || "").trim() || "任務完成！";
    await DB.patch(id, { status: "reported", heroMsg: msg, reportedAt: Date.now() });
    delete drafts["m" + id]; saveDrafts();
    beep([659, 784, 988]); toast("已回報給店家，等店家確認後就會拿到獎勵");
  }
  if (act === "confirm") {
    const reply = (drafts["r" + id] || "").trim() || "感謝勇者幫忙！";
    await DB.patch(id, { status: "done", code: code6(), doneAt: Date.now(), storeMsg: reply });
    delete drafts["r" + id]; saveDrafts();
    beep([784, 988, 1175, 1568]); toast("任務完成！獎勵兌換碼已發給勇者");
  }
  if (act === "notyet") {
    const reply = (drafts["r" + id] || "").trim() || "還沒解決，請再幫忙一下";
    await DB.patch(id, { status: "accepted", storeMsg: reply, storeMsgAt: Date.now() });
    delete drafts["r" + id]; saveDrafts();
    toast("已請勇者繼續幫忙");
  }
  if (act === "cancel") { await DB.patch(id, { status: "done", reward: s.reward + "（已取消）", code: null, doneAt: Date.now() }); toast("已取消求救"); }
});

/* ---------- 資料變化 → 提醒 ---------- */
let firstLoad = true;
const once = (key, fn) => { if (S.seen.has(key)) return; S.seen.add(key); if (!firstLoad) fn(); };
const demoTimers = new Set();
DB.sub((list) => {
  S.list = Array.isArray(list) ? list : [];
  S.list.forEach((s) => {
    // 勇者：附近有新求救
    if (s.status === "open" && s.owner !== SID) once(s.id, () => { if (ROLE === "hero" && S.pos && distM(S.pos, s) <= CFG.RADIUS_M) notify(s); });
    // 店家：有勇者接了我的求救、勇者回報完成
    if (s.owner === SID && s.heroId && s.status !== "open") once("acc:" + s.id + ":" + s.heroId, () =>
      push("勇者 " + (s.heroNick || "") + " 接下任務！", s.store + "：勇者正在趕來" + (s.heroLook ? "\n勇者外觀：" + AV.describe(s.heroLook) : ""), s.id, [523, 659, 784]));
    if (s.owner === SID && s.status === "reported") once("rep:" + s.id + ":" + s.reportedAt, () =>
      push("勇者回報任務完成", (s.heroNick || "勇者") + "：" + (s.heroMsg || "") + "\n請到「求救」按確認完成", s.id, [659, 784, 988]));
    // 勇者：店家確認完成、或店家說還沒好
    if (s.heroId === HID && s.status === "done") once("done:" + s.id, () =>
      push("任務完成！獲得獎勵", s.store + "：" + (s.storeMsg || "") + "\n獎勵：" + s.reward, s.id, [784, 988, 1175, 1568]));
    if (s.heroId === HID && s.status === "accepted" && s.storeMsgAt) once("back:" + s.id + ":" + s.storeMsgAt, () =>
      push("店家說還沒解決", s.store + "：" + (s.storeMsg || ""), s.id, [988, 784]));
    // 示範模式：示範店家 3 秒後自動確認，方便一個人測試
    if (DB.mode === "demo" && s.owner === "demo" && s.status === "reported" && !demoTimers.has(s.id)) {
      demoTimers.add(s.id);
      setTimeout(() => { demoTimers.delete(s.id); DB.patch(s.id, { status: "done", code: code6(), doneAt: Date.now(), storeMsg: "（示範店家）謝謝你，客人已經冷靜了！" }); }, 3000);
    }
  });
  store.set("seen", [...S.seen].slice(-500));
  firstLoad = false;
  store.set("cache", S.list);
  render();
});
setInterval(render, 30000);

/* ---------- 求救表單（店家） ---------- */
$("#fReward").value = store.get("rewardDraft", "");
$("#fDesc").value = store.get("descDraft", "");
$("#fReward").addEventListener("input", (e) => store.set("rewardDraft", e.target.value));
$("#fDesc").addEventListener("input", (e) => store.set("descDraft", e.target.value));
const lookEditor = AV.mountEditor($("#lookEditor"), store.get("look", AV.DEFAULT), (l) => store.set("look", l));
$("#lookOn").checked = store.get("lookOn", true);
$("#lookEditor").hidden = !$("#lookOn").checked;
$("#lookOn").addEventListener("change", (e) => { store.set("lookOn", e.target.checked); $("#lookEditor").hidden = !e.target.checked; });
$("#sosForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!shopName()) { toast("先到「我的」填店名，勇者才知道是哪一家"); return setTab("me"); }
  if (!S.pos) { toast("需要定位才能標出你的店，請允許定位"); await startGeo(); if (!S.pos) return; }
  const f = new FormData(e.target);
  const s = {
    id: uid(), owner: SID, store: shopName(), level: Number(f.get("level")) || 1,
    desc: String(f.get("desc") || "").trim(), reward: String(f.get("reward")).trim(),
    lat: S.pos.lat, lng: S.pos.lng, createdAt: Date.now(), status: "open",
    look: $("#lookOn").checked ? AV.normalize(lookEditor.get()) : null
  };
  await queueOrPut(s);
  beep([988, 784, 988, 784]);
  toast("求救訊號已發出！附近 " + CFG.RADIUS_M + " 公尺的勇者會收到");
  $("#fDesc").value = ""; store.set("descDraft", "");
});

/* ---------- 分頁 ---------- */
const SHEETS = { quest: "#sheetQuest", sos: "#sheetSos", bag: "#sheetBag", me: "#sheetMe" };
function setTab(name) {
  $$("nav.tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  Object.entries(SHEETS).forEach(([k, sel]) => ($(sel).hidden = k !== name));
}
$$("nav.tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
$$("[data-close]").forEach((b) => b.addEventListener("click", () => setTab("map")));
function openCard(id) {
  if (!id) return;
  const s = S.list.find((x) => x.id === id);
  const rel = s && s.owner === SID ? "store" : "hero";
  if (ROLE !== rel) setRole(rel, true);
  setTab(rel === "store" ? "sos" : "quest"); render();
  const el = document.getElementById("sos-" + id) || null;
  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.animate([{ transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 400, easing: "steps(4)" }); }
}

/* ---------- 我的：個人檔案與設定 ---------- */
$("#fHero").value = heroNick();
$("#fHero").addEventListener("input", (e) => store.set("hero", e.target.value.trim()));
$("#fShop").value = shopName();
$("#fShop").addEventListener("input", (e) => { store.set("shop", e.target.value.trim()); renderShopLine(); });
heroEditor = AV.mountEditor($("#heroLookEditor"), store.get("heroLook", AV.DEFAULT), (l) => store.set("heroLook", l));
$("#btnPerm").addEventListener("click", () => showOnboard(true));
$("#btnTestNotif").addEventListener("click", async () => {
  if (!(await askNotif())) return toast("通知尚未開啟");
  notify({ id: "test", store: "測試店家", level: 2, reward: "測試獎勵", lat: S.pos ? S.pos.lat : 25, lng: S.pos ? S.pos.lng : 121.5 });
});
$("#ver").textContent = VERSION + "・" + (DB.mode === "cloud" ? "雲端同步" : "示範模式");
applyRole();

/* ---------- 安裝到主畫面 ---------- */
let deferredPrompt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredPrompt = e; $("#btnInstall").hidden = false; });
$("#btnInstall").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $("#btnInstall").hidden = true;
});
addEventListener("appinstalled", () => toast("已加到主畫面！"));

/* ---------- 開場 ---------- */
const scene = $("#scene"), sg = scene.getContext("2d");
function drawScene(t) {
  if ($("#onboard").hidden) return;
  sg.imageSmoothingEnabled = false;
  sg.fillStyle = "#2d64c8"; sg.fillRect(0, 0, 160, 70);
  sg.fillStyle = "#fff6dc"; [[12, 8], [40, 20], [70, 6], [118, 14], [150, 28], [96, 30]].forEach(([x, y], i) => { if ((Math.floor(t / 500) + i) % 3) sg.fillRect(x, y, 1, 1); });
  sg.fillStyle = "#9fc3f0"; sg.fillRect(20, 14, 14, 3); sg.fillRect(24, 11, 7, 3); sg.fillRect(106, 22, 12, 3); sg.fillRect(109, 19, 6, 3);
  // 地面
  sg.fillStyle = "#3fae5a"; sg.fillRect(0, 56, 160, 3); sg.fillStyle = "#257a3c"; for (let x = 0; x < 160; x += 4) sg.fillRect(x, 58, 2, 1);
  sg.fillStyle = "#6b4a2b"; sg.fillRect(0, 59, 160, 11); sg.fillStyle = "#4e331d"; for (let x = 3; x < 160; x += 11) sg.fillRect(x, 63 + (x % 3), 4, 1);
  // 小廟
  sg.fillStyle = "#d23a2a"; sg.fillRect(14, 38, 26, 18); sg.fillStyle = "#f2c23b"; sg.fillRect(10, 34, 34, 4); sg.fillRect(8, 33, 2, 2); sg.fillRect(44, 33, 2, 2);
  sg.fillStyle = "#1a1020"; sg.fillRect(23, 44, 8, 12); sg.fillStyle = "#ff7a1a"; sg.fillRect(16, 41, 3, 4); sg.fillRect(35, 41, 3, 4);
  // 勇者
  const bob = Math.floor(t / 300) % 2;
  HERO.forEach((row, j) => [...row].forEach((c, i) => { if (PAL[c]) { sg.fillStyle = PAL[c]; sg.fillRect(56 + i, 49 + j - bob, 1, 1); } }));
  // 火焰（奧客出沒）
  [[84, 1], [100, 2], [118, 3]].forEach(([x, s], k) => {
    const f = (Math.floor(t / 160) + k) % 2;
    ICONS.fire.forEach((row, j) => [...row].forEach((c, i) => { if (PAL[c]) { sg.fillStyle = PAL[c]; sg.fillRect(x + i * s * 0.7, 56 - 7 * s * 0.7 + j * s * 0.7 - f, Math.ceil(s * 0.7), Math.ceil(s * 0.7)); } }));
  });
  // 甘蔗（獎勵）
  sg.fillStyle = "#3a7a3a"; for (let i = 0; i < 10; i++) sg.fillRect(138 + i, 54 - Math.floor(i / 2), 2, 2);
  sg.fillStyle = "#7a3a8a"; sg.fillRect(141, 52, 2, 2); sg.fillRect(145, 50, 2, 2);
  requestAnimationFrame(drawScene);
}
function showOnboard(force) {
  if (!force && store.get("onboarded", false)) return false;
  $("#onboard").hidden = false;
  $("#iosGuide").hidden = !(isIOS && !isStandalone);
  refreshChips(); requestAnimationFrame(drawScene);
  return true;
}
$("#btnStart").addEventListener("click", async () => {
  beep([523, 659, 784]);
  const okGeo = await startGeo();      // 1. 定位
  await askNotif();                    // 2. 通知（iOS 需要在主畫面 App 內、且由按鈕觸發）
  store.set("onboarded", true);
  $("#onboard").hidden = true;
  sizeRadar(); loadGoogleMaps(); render();
  if (ROLE === "store" && !shopName()) { setTab("me"); toast("先填你的店名"); }
  else if (ROLE === "hero" && !heroNick()) { setTab("me"); toast("先取個勇者綽號、捏好你的長相"); }
  else if (!okGeo) toast("沒有定位也能用，但看不到附近任務");
});
$("#btnSkip").addEventListener("click", () => { store.set("onboarded", true); $("#onboard").hidden = true; sizeRadar(); render(); });

/* ---------- 啟動 ---------- */
sizeRadar();
refreshChips();
if (!showOnboard(false)) {
  // 已授權過就直接開始
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: "geolocation" }).then((p) => { if (p.state === "granted") startGeo().then(loadGoogleMaps); }).catch(() => startGeo().then(loadGoogleMaps));
  } else startGeo().then(loadGoogleMaps);
}
if (S.pos) loadGoogleMaps();
if (location.hash.startsWith("#sos-")) setTimeout(() => openCard(location.hash.slice(5)), 600);
})();
