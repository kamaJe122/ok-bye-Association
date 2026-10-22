/* 奧客互助協會 v1.0.0
   創意發起人：Popcorn ｜ 程式美編設計：Kama
   純 HTML + JS，PWA：可離線、可加到主畫面（Android / iOS / 電腦） */
(() => {
"use strict";
const CFG = Object.assign({ GMAPS_KEY: "", FIREBASE: null, RADIUS_M: 500, SOS_EXPIRE_MIN: 60, DEMO_SEED: true }, window.AOK_CONFIG || {});
const VERSION = "v1.0.0";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- 小工具 ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("aok_" + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem("aok_" + k, JSON.stringify(v)); } catch (_) {} }
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ME = store.get("me", null) || (() => { const id = uid(); store.set("me", id); return id; })();
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
const ST = { open: "求救中", accepted: "勇者前往中", done: "已解決" };

/* ---------- 點陣圖示（7x7） ---------- */
const PAL = { k: "#1a1020", r: "#d23a2a", y: "#f2c23b", o: "#ff7a1a", w: "#fff6dc", g: "#3fae5a", b: "#2d64c8", n: "#6b4a2b", l: "#ffd23f" };
const ICONS = {
  fire: ["...o...", "..oo...", ".oyoo..", ".oyyo.o", "ooylyoo", "oyllyo.", ".oyyo.."],
  bell: ["...y...", "..yyy..", ".yyyyy.", ".yyyyy.", ".yyyyy.", "yyyyyyy", "...k..."],
  map: ["bbgbbgg", "bggbggb", "gggrggg", "ggrrrgg", "gggrggb", "bgg.ggb", "bbgbbbb"],
  bag: ["..nnn..", ".n...n.", "nnnnnnn", "nyyyyyn", "nyykyyn", "nyyyyyn", "nnnnnnn"],
  pin: ["..rrr..", ".rrrrr.", ".rrwrr.", ".rrrrr.", "..rrr..", "...r...", "...r..."]
};
function drawIcon(cv, name) {
  const g = cv.getContext("2d"), rows = ICONS[name]; if (!rows) return;
  g.clearRect(0, 0, 7, 7);
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (PAL[c]) { g.fillStyle = PAL[c]; g.fillRect(x, y, 1, 1); } }));
}
$$("canvas[data-icon]").forEach((c) => drawIcon(c, c.dataset.icon));

/* ---------- Toast + 8-bit 音效 ---------- */
function toast(msg, ms = 2800) {
  const d = document.createElement("div"); d.className = "px"; d.textContent = msg;
  $("#toast").appendChild(d); setTimeout(() => d.remove(), ms);
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
      patch(id, p) { return ref.child(id).update(p); }
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
    patch(id, p) { write(read().map((x) => x.id === id ? Object.assign({}, x, p) : x)); return Promise.resolve(); }
  };
})();

/* ---------- 狀態 ---------- */
const S = {
  pos: store.get("pos", null),     // 上次位置（離線也能畫）
  list: [],
  seen: new Set(store.get("seen", [])),
  focus: null,
  gmap: null, gReady: false, gMarkers: {}, gUser: null, gCircle: null
};
const alive = (s) => Date.now() - s.createdAt < CFG.SOS_EXPIRE_MIN * 60000 || s.status === "done";
function nearby() {
  if (!S.pos) return [];
  return S.list.filter(alive)
    .map((s) => Object.assign({ d: distM(S.pos, s) }, s))
    .filter((s) => s.d <= CFG.RADIUS_M || s.owner === ME || s.heroId === ME)
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
async function notify(s) {
  beep();
  toast("附近求救！" + s.store + "（" + LV[s.level] + "）" + fmtDist(distM(S.pos, s)));
  if (!(notifSupported && Notification.permission === "granted")) return;
  const opt = { body: s.store + "・" + LV[s.level] + "・獎勵：" + s.reward, icon: "icons/icon-192.png", badge: "icons/icon-192.png",
    tag: "sos-" + s.id, data: { id: s.id }, vibrate: [120, 60, 120, 60, 240] };
  try {
    const reg = swReg || (await navigator.serviceWorker.ready);
    await reg.showNotification("奧客出沒！" + fmtDist(distM(S.pos, s)) + "外需要勇者", opt);
  } catch (_) { try { new Notification("奧客出沒！", opt); } catch (__) {} }
}

/* ---------- 示範資料 ---------- */
function seedDemo() {
  if (DB.mode !== "demo" || !CFG.DEMO_SEED || store.get("seeded", false) || !S.pos) return;
  const now = Date.now();
  [
    { n: 140, e: 60, store: "（示範）巷口雞排", level: 2, desc: "客人說雞排太大塊要退錢", reward: "雞排加大一次" },
    { n: -90, e: 310, store: "（示範）轉角咖啡", level: 1, desc: "要求插座位置但已客滿，持續碎念", reward: "美式咖啡一杯" },
    { n: -330, e: -260, store: "（示範）深夜拉麵", level: 3, desc: "酒後大聲叫囂，需要有人在旁陪同等待", reward: "拉麵免費一碗＋溏心蛋" }
  ].forEach((d, i) => (S.seen.add("demo" + i), DB.put(Object.assign({
    id: "demo" + i, owner: "demo", level: d.level, store: d.store, desc: d.desc, reward: d.reward,
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
  const px = 4; HERO.forEach((row, j) => [...row].forEach((c, i) => { if (PAL[c]) { rg.fillStyle = PAL[c]; rg.fillRect(cx - 14 + i * px, cy - 14 + j * px, px, px); } }));
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
let gLoading = false;
function loadGoogleMaps() {
  if (!CFG.GMAPS_KEY || S.gReady || gLoading || !navigator.onLine) return;
  gLoading = true;
  window.__aokGmaps = () => { gLoading = false; S.gReady = true; initGmap(); };
  window.gm_authFailure = () => { toast("Google 地圖金鑰無效，改用點陣雷達"); useRadar(); };
  const s = document.createElement("script");
  s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(CFG.GMAPS_KEY) + "&callback=__aokGmaps&v=weekly&language=zh-TW&region=TW";
  s.async = true; s.onerror = () => { gLoading = false; useRadar(); };
  document.head.appendChild(s);
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
    const name = s.status === "open" ? "fire" : "pin", px = s.status === "open" ? 4 + s.level : 4, sz = 7 * px;
    const key = name + px;
    let m = S.gMarkers[s.id];
    if (!m) { m = new google.maps.Marker({ map: S.gmap, title: s.store }); m.addListener("click", () => openCard(s.id)); S.gMarkers[s.id] = m; }
    if (m.__k !== key) { m.setIcon({ url: iconURL(name, px), scaledSize: new google.maps.Size(sz, sz), anchor: new google.maps.Point(sz / 2, sz) }); m.__k = key; }
    m.setPosition({ lat: s.lat, lng: s.lng });
  });
  Object.keys(S.gMarkers).forEach((id) => { if (!keep.has(id)) { S.gMarkers[id].setMap(null); delete S.gMarkers[id]; } });
}
$("#recenter").addEventListener("click", () => {
  if (S.gmap && S.pos) { S.gmap.panTo(S.pos); S.gmap.setZoom(16); }
  else if (!S.pos) startGeo();
  toast(S.pos ? "已回到你的位置（半徑 " + CFG.RADIUS_M + " 公尺）" : "正在取得定位…", 1600);
});

/* ---------- 卡片與清單 ---------- */
function heroName() { return ($("#fHero").value || store.get("hero", "") || "無名勇者").trim(); }
function card(s, ctx) {
  const mine = s.owner === ME, hero = s.heroId === ME;
  let act = "";
  if (ctx === "quest") {
    if (s.status === "open" && !mine) act = `<button class="btn red" data-act="accept" data-id="${esc(s.id)}">接任務</button>`;
    if (s.status === "accepted" && hero) act = `<button class="btn ghost" data-act="giveup" data-id="${esc(s.id)}">放棄任務</button>`;
  }
  if (ctx === "mine") {
    if (s.status === "accepted") act = `<button class="btn green" data-act="resolve" data-id="${esc(s.id)}">確認解決並發獎勵</button>`;
    if (s.status === "open") act = `<button class="btn ghost" data-act="cancel" data-id="${esc(s.id)}">取消求救</button>`;
  }
  const nav = S.pos ? `<a class="btn ghost" href="https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}&travelmode=walking" target="_blank" rel="noopener">導航</a>` : "";
  return `<article class="px card" id="sos-${esc(s.id)}">
    <div class="row"><span class="name">${esc(s.store)}</span><span class="lv lv${s.level}">${LV[s.level]}</span><span class="st ${s.status}">${ST[s.status]}</span></div>
    <div class="meta">${S.pos ? fmtDist(distM(S.pos, s)) + "・" : ""}${ago(s.createdAt)}${s.hero ? "・勇者：" + esc(s.hero) : ""}</div>
    ${s.desc ? `<div>${esc(s.desc)}</div>` : ""}
    <div class="reward">獎勵：${esc(s.reward)}</div>
    ${s.status === "done" && (hero || mine) && s.code ? `<div class="coupon">${esc(s.code)}</div>` : ""}
    <div class="row">${act}${s.status !== "done" ? nav : ""}</div>
  </article>`;
}
function render() {
  const near = nearby();
  const open = near.filter((s) => s.status === "open" && s.owner !== ME);
  $("#hudOpen").textContent = open.length;
  $("#hudRange").textContent = CFG.RADIUS_M + "M";
  $("#badge").hidden = !open.length; $("#badge").textContent = open.length;
  $("#questList").innerHTML = near.filter((s) => s.owner !== ME).map((s) => card(s, "quest")).join("")
    || `<p class="empty">方圓 ${CFG.RADIUS_M} 公尺內很和平，沒有奧客出沒。</p>`;
  const mine = S.list.filter((s) => s.owner === ME && alive(s)).sort((a, b) => b.createdAt - a.createdAt);
  $("#mySosList").innerHTML = mine.map((s) => card(s, "mine")).join("") || `<p class="empty">還沒有發出求救。</p>`;
  const bag = S.list.filter((s) => s.heroId === ME && s.status === "done").sort((a, b) => b.doneAt - a.doneAt);
  $("#bagList").innerHTML = bag.map((s) => `<article class="px card"><div class="row"><span class="name">${esc(s.store)}</span></div>
    <div class="reward">${esc(s.reward)}</div><div class="coupon">${esc(s.code)}</div><div class="meta">出示此代碼給店員兌換</div></article>`).join("")
    || `<p class="empty">背包空空的，去接個任務吧。</p>`;
  renderGmap();
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.dataset.id, s = S.list.find((x) => x.id === id); if (!s) return;
  if (b.dataset.act === "accept") {
    if (s.status !== "open") return toast("這個任務已經有人接了");
    await DB.patch(id, { status: "accepted", hero: heroName(), heroId: ME, acceptedAt: Date.now() });
    beep([523, 659, 784, 1046]); toast("任務接受！到店後請店員按「確認解決」");
  }
  if (b.dataset.act === "giveup") { await DB.patch(id, { status: "open", hero: null, heroId: null }); toast("已放棄任務"); }
  if (b.dataset.act === "resolve") { await DB.patch(id, { status: "done", code: code6(), doneAt: Date.now() }); beep([784, 988, 1175, 1568]); toast("已發放獎勵代碼給勇者"); }
  if (b.dataset.act === "cancel") { await DB.patch(id, { status: "done", reward: s.reward + "（已取消）", code: null, doneAt: Date.now() }); toast("已取消求救"); }
});

/* ---------- 新求救偵測 → 通知 ---------- */
let firstLoad = true;
DB.sub((list) => {
  S.list = Array.isArray(list) ? list : [];
  S.list.forEach((s) => {
    if (s.status === "open" && s.owner !== ME && !S.seen.has(s.id)) {
      S.seen.add(s.id);
      if (!firstLoad && S.pos && distM(S.pos, s) <= CFG.RADIUS_M) notify(s);
    }
    // 勇者：任務完成時提醒
    if (s.heroId === ME && s.status === "done" && !S.seen.has("done" + s.id)) {
      S.seen.add("done" + s.id); if (!firstLoad) { beep([784, 988, 1175, 1568]); toast("任務完成！獎勵已放進背包"); }
    }
  });
  store.set("seen", [...S.seen].slice(-300));
  firstLoad = false;
  store.set("cache", S.list);
  render();
});
setInterval(render, 30000);

/* ---------- 求救表單 ---------- */
$("#fStore").value = store.get("shop", "");
$("#sosForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!S.pos) { toast("需要定位才能標出你的店，請允許定位"); await startGeo(); if (!S.pos) return; }
  const f = new FormData(e.target);
  const s = {
    id: uid(), owner: ME, store: String(f.get("store")).trim(), level: Number(f.get("level")) || 1,
    desc: String(f.get("desc") || "").trim(), reward: String(f.get("reward")).trim(),
    lat: S.pos.lat, lng: S.pos.lng, createdAt: Date.now(), status: "open"
  };
  store.set("shop", s.store);
  await queueOrPut(s);
  beep([988, 784, 988, 784]);
  toast("求救訊號已發出！附近 " + CFG.RADIUS_M + " 公尺的勇者會收到");
  $("#fDesc").value = "";
});

/* ---------- 分頁 ---------- */
const SHEETS = { quest: "#sheetQuest", sos: "#sheetSos", bag: "#sheetBag" };
function setTab(name) {
  $$("nav.tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
  Object.entries(SHEETS).forEach(([k, sel]) => ($(sel).hidden = k !== name));
}
$$("nav.tabs button").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
$$("[data-close]").forEach((b) => b.addEventListener("click", () => setTab("map")));
function openCard(id) {
  if (!id) return; setTab("quest"); render();
  const el = document.getElementById("sos-" + id) || null;
  if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.animate([{ transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 400, easing: "steps(4)" }); }
}

/* ---------- 背包設定 ---------- */
$("#fHero").value = store.get("hero", "");
$("#fHero").addEventListener("change", (e) => store.set("hero", e.target.value.trim()));
$("#btnPerm").addEventListener("click", () => showOnboard(true));
$("#btnTestNotif").addEventListener("click", async () => {
  if (!(await askNotif())) return toast("通知尚未開啟");
  notify({ id: "test", store: "測試店家", level: 2, reward: "測試獎勵", lat: S.pos ? S.pos.lat : 25, lng: S.pos ? S.pos.lng : 121.5 });
});
$("#ver").textContent = VERSION + "・" + (DB.mode === "cloud" ? "雲端同步" : "示範模式");

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
  if (!okGeo) toast("沒有定位也能用，但看不到附近任務");
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
