/* 奧客互助協會：點陣人物產生器 v3（大頭圓臉 Q 版風格）
   勇者與奧客共用。所有選項都在 OPT 裡，要加新選項只改這裡。
   畫面固定 28×34 格（含描邊），人物永遠站在正中間。 */
(function () {
  "use strict";
  const C = (v, n, c) => ({ v, n, c });
  // 8 色：紅橙黃綠藍紫黑白
  const COLORS = (pal) => [C("red", "紅", pal[0]), C("orange", "橙", pal[1]), C("yellow", "黃", pal[2]), C("green", "綠", pal[3]),
    C("blue", "藍", pal[4]), C("purple", "紫", pal[5]), C("black", "黑", pal[6]), C("white", "白", pal[7])];
  const OPT = {
    gender: [{ v: "m", n: "男生" }, { v: "f", n: "女生" }],
    age: [{ v: "kid", n: "小朋友" }, { v: "student", n: "學生" }, { v: "office", n: "上班族" }, { v: "parent", n: "爸爸媽媽" },
      { v: "auntie", n: "婆婆媽媽" }, { v: "weird", n: "奇怪大哥" }, { v: "elder", n: "爺爺奶奶" }],
    hairColor: COLORS(["#c8402e", "#d9782a", "#f2c23b", "#4c9a50", "#3a6ad8", "#7a4ab0", "#2a2230", "#ececf2"]),
    hairLen: [{ v: "long", n: "長髮" }, { v: "short", n: "短髮" }, { v: "curly", n: "捲髮" }, { v: "perm", n: "大媽長捲髮" }],
    hat: [{ v: "none", n: "沒戴" }, { v: "cap", n: "棒球帽" }, { v: "beanie", n: "毛帽" }, { v: "sunhat", n: "遮陽帽" }],
    hatColor: COLORS(["#e04a3a", "#f08a2a", "#f2c23b", "#4caf50", "#3a78d8", "#8e5bd0", "#2e2a33", "#f6f6f6"]),
    glasses: [{ v: "none", n: "沒戴" }, { v: "round", n: "圓框" }, { v: "square", n: "方框" }],
    glassesSize: [{ v: "small", n: "小" }, { v: "big", n: "大" }],
    topLen: [{ v: "long", n: "長袖" }, { v: "short", n: "短袖" }],
    topColor: COLORS(["#e04a3a", "#f08a2a", "#f2c23b", "#4caf50", "#3a78d8", "#8e5bd0", "#2e2a33", "#f6f6f6"]),
    bottom: [{ v: "pants", n: "長褲" }, { v: "shorts", n: "短褲" }, { v: "longskirt", n: "長裙" }, { v: "skirt", n: "短裙" }],
    bottomColor: COLORS(["#c43a2e", "#d97a2a", "#e0b23a", "#3f8f45", "#3b5f9e", "#6e4aa0", "#2a2630", "#eeeae0"]),
    shoes: [{ v: "slipper", n: "拖鞋" }, { v: "sneaker", n: "布鞋" }, { v: "heels", n: "高跟鞋" }],
    shoeColor: COLORS(["#e04a3a", "#f08a2a", "#f2c23b", "#4caf50", "#3a78d8", "#8e5bd0", "#2e2a33", "#f6f6f6"])
  };
  const GROUPS = [
    ["gender", "性別"], ["age", "種類"], ["hairColor", "髮色"], ["hairLen", "髮型"],
    ["hat", "帽子"], ["hatColor", "帽子顏色"], ["glasses", "眼鏡"], ["glassesSize", "鏡框大小"],
    ["topLen", "上衣"], ["topColor", "上衣顏色"], ["bottom", "下身"], ["bottomColor", "下身顏色"],
    ["shoes", "鞋子"], ["shoeColor", "鞋子顏色"]
  ];
  const DEFAULT = { gender: "m", age: "office", hairColor: "black", hairLen: "short",
    hat: "none", hatColor: "red", glasses: "none", glassesSize: "small", topLen: "long", topColor: "blue",
    bottom: "pants", bottomColor: "black", shoes: "sneaker", shoeColor: "black" };
  // 舊版顏色名稱 → 新 8 色（之前存的人物不會壞掉）
  const LEGACY = { brown: "orange", blonde: "yellow", silver: "white", denim: "blue", khaki: "yellow", gray: "white", pink: "red" };
  // 種類綁定性別：婆婆媽媽＝女生、奇怪大哥＝男生
  const BIND = { auntie: "f", weird: "m" };

  const get = (k, v) => OPT[k].find((o) => o.v === v) || OPT[k].find((o) => o.v === DEFAULT[k]);
  function normalize(look) {
    const out = {};
    for (const k of Object.keys(DEFAULT)) {
      let v = look && look[k];
      if (LEGACY[v] && !OPT[k].some((o) => o.v === v)) v = LEGACY[v];
      out[k] = get(k, v).v;
    }
    if (BIND[out.age]) out.gender = BIND[out.age];
    return out;
  }
  function random() {
    const out = {};
    for (const k of Object.keys(OPT)) out[k] = OPT[k][Math.floor(Math.random() * OPT[k].length)].v;
    return normalize(out);
  }
  function describe(look) {
    const L = normalize(look), n = (k) => get(k, L[k]).n;
    return [n("gender"), n("age"),
      n("hairColor") + "色" + n("hairLen"),
      L.hat !== "none" ? n("hatColor") + "色" + n("hat") : "",
      L.glasses !== "none" ? n("glassesSize") + n("glasses") + "眼鏡" : "",
      n("topColor") + "色" + n("topLen"),
      n("bottomColor") + "色" + n("bottom"),
      n("shoeColor") + "色" + n("shoes")].filter(Boolean).join("・");
  }

  /* ---- 顏色工具 ---- */
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb2hex(r, g, b) { return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
  function shade(hex, f) { const [r, g, b] = hex2rgb(hex), c = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return rgb2hex(c(r), c(g), c(b)); }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(...A.map((v, i) => Math.round(v + (B[i] - v) * t))); }
  // Q 版柔和色：膚色、描邊用深咖啡而不是純黑
  const SKIN = "#f8d4b0", SKIN_D = "#e3a984", OUT = "#3a2a22", EYE = "#2a1e18", BLUSH = "#f4a0a0", WHITE = "#ffffff";

  /* ---- 種類 → 身形 ---- */
  // head：頭高（Q 版大頭）、torso：身體、leg：腿；男生肩寬 8 格、女生 6 格
  const BODY = {
    kid: { head: 13, torso: 5, leg: 2 },
    student: { head: 14, torso: 6, leg: 3 },
    office: { head: 14, torso: 7, leg: 3 },
    parent: { head: 14, torso: 7, leg: 3 },
    auntie: { head: 14, torso: 7, leg: 3 },
    weird: { head: 14, torso: 7, leg: 3 },
    elder: { head: 14, torso: 6, leg: 3 }
  };
  const W = 26, H = 32, OX = 5;

  // full=true：不裁切，固定畫框，人物永遠站在正中間同一個位置
  function build(look, full) {
    const L = normalize(look);
    const g = Array.from({ length: H }, () => Array(W).fill(null));
    const set = (x, y, c) => { x += OX; if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
    const at = (x, y) => (g[y] ? g[y][x + OX] : null);
    const row = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) set(x, y, c); };
    const draw = (rows, x0, y0, pal) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) set(x0 + i, y0 + j, pal[ch]); }));

    const female = L.gender === "f", kid = L.age === "kid", elder = L.age === "elder", weird = L.age === "weird", auntie = L.age === "auntie";
    const B = BODY[L.age];
    const legsTop = 30 - B.leg, bT = legsTop - B.torso, hT = bT - B.head + (elder ? 1 : 0);
    const [tx0, tx1] = kid || female ? [5, 10] : [4, 11];
    const handY = bT + Math.min(5, B.torso - 1);

    const hc = get("hairColor", L.hairColor).c, hd = shade(hc, 0.72), hl = mix(hc, WHITE, 0.35);
    // 奇怪大哥：衣服灰灰髒髒的
    const dirty = (c) => (weird ? mix(c, "#7d725e", 0.38) : c);
    const tc = dirty(get("topColor", L.topColor).c), td = shade(tc, 0.8);
    const bc = dirty(get("bottomColor", L.bottomColor).c), bd = shade(bc, 0.78);
    const sc = dirty(get("shoeColor", L.shoeColor).c), sd = shade(sc, 0.72);

    // 圓圓的大頭（超橢圓，比圓形更方一點的 Q 版臉）
    const cx = 7.5, cy = hT + (B.head - 1) / 2, rx = 7, ry = B.head / 2;
    const inHead = (x, y, ex) => Math.pow(Math.abs(x - cx) / (rx + (ex || 0)), 2.6) + Math.pow(Math.abs(y - cy) / (ry + (ex || 0)), 2.6) <= 1;

    /* 1. 背後的頭髮（長髮、大媽捲） */
    if (L.hairLen === "long") for (let y = hT + 5; y <= bT + 3; y++) row(0, 15, y, hd);
    if (L.hairLen === "perm") for (let y = hT + 4; y <= bT + 1; y++) for (let x = -2; x <= 17; x++) if (Math.abs(x - cx) <= 9.5 - Math.max(0, y - bT + 1) * 1.5) set(x, y, hd);

    /* 2. 學生書包（從左邊露出） */
    if (L.age === "student") {
      const bag = L.topColor === "red" ? "#3a78d8" : "#e04a3a", bagD = shade(bag, 0.72);
      for (let y = bT - 1; y <= bT + 4; y++) row(tx0 - 4, tx0 - 3, y, y === bT ? bagD : bag);
      set(tx0 - 4, bT + 2, "#f2c23b");
    }

    /* 3. 腿與下身（Q 版短腿） */
    const skinLegs = (from) => { for (let y = from; y <= 29; y++) { row(5, 6, y, SKIN); row(9, 10, y, SKIN); } };
    if (L.bottom === "pants") {
      for (let y = legsTop; y <= 29; y++) { if (y === legsTop) row(5, 10, y, bc); else { row(5, 6, y, bc); row(9, 10, y, bc); set(6, y, bd); set(10, y, bd); } }
      if (weird) set(5, 29, "#a08a5a");                                   // 補丁
    } else if (L.bottom === "shorts") {
      row(5, 10, legsTop, bc); skinLegs(legsTop + 1);
    } else if (L.bottom === "skirt") {
      row(tx0, tx1, legsTop, bc); row(tx0 - 1, tx1 + 1, legsTop + 1, bd); skinLegs(legsTop + 2);
    } else {
      for (let y = legsTop; y <= 29; y++) row(tx0 - 1 - (y - legsTop), tx1 + 1 + (y - legsTop), y, y === 29 ? bd : bc);
    }

    /* 4. 鞋子（圓圓的） */
    if (L.shoes === "sneaker") {
      row(4, 6, 30, sc); row(9, 11, 30, sc);
      const sole = L.shoeColor === "white" ? "#b8b8c0" : WHITE;
      row(4, 6, 31, sole); row(9, 11, 31, sole);
    } else if (L.shoes === "slipper") {
      set(4, 30, SKIN); set(11, 30, SKIN); row(5, 6, 30, sc); row(9, 10, 30, sc); row(4, 6, 31, sd); row(9, 11, 31, sd);
    } else {
      row(4, 6, 30, sc); row(9, 11, 30, sc); set(4, 31, sc); set(6, 31, sd); set(9, 31, sd); set(11, 31, sc);
    }

    /* 5. 身體（圓肩、男寬女窄） */
    for (let y = bT; y < bT + B.torso; y++) {
      const a = y === bT ? tx0 + 1 : tx0, b = y === bT ? tx1 - 1 : tx1;
      row(a, b, y, y === bT + B.torso - 1 ? td : tc); set(b, y, td);
    }
    set(7, bT, SKIN); set(8, bT, SKIN);
    if (female && !kid) { set(tx0, bT + B.torso - 3, td); set(tx1, bT + B.torso - 3, shade(tc, 0.65)); }  // 收腰
    if (weird) { set(tx0 + 1, bT + 2, "#6b5a2a"); set(tx1 - 2, bT + 3, "#6b5a2a"); set(tx0 + 3, bT + 5, "#5a4a22"); set(tx0 + 4, bT + 5, "#5a4a22"); } // 污漬

    /* 6. 短短的手 */
    for (const [a0, a1] of [[tx0 - 2, tx0 - 1], [tx1 + 1, tx1 + 2]]) {
      for (let y = bT + 1; y <= handY; y++) {
        const sleeve = y < handY && (L.topLen === "long" || y <= bT + 2);
        row(a0, a1, y, sleeve ? tc : SKIN);
      }
    }

    /* 7. 身上配件 */
    if (L.age === "student") for (let y = bT; y <= bT + 3; y++) { set(tx0 + 1, y, "#7a4a24"); set(tx1 - 1, y, "#7a4a24"); }
    if (L.age === "office" && !female) {
      const tie = L.topColor === "red" ? "#3a78d8" : "#c43a2e";
      for (let y = bT + 1; y <= bT + 4; y++) { set(7, y, tie); set(8, y, y === bT + 1 ? tie : shade(tie, 0.8)); }
    }
    if (auntie) for (let x = tx0 + 1; x <= tx1 - 1; x++) set(x, bT + 1, x % 2 ? "#fffaf0" : "#d8d0e0");  // 珍珠項鍊

    /* 8. 手上拿的東西 */
    const rh = tx1 + 3;
    if (kid) draw(["b...b", "bbbbb", "bkbkb", "bbsbb", ".bbb.", "bb.bb"], tx1 + 2, handY - 3, { b: "#b07040", k: EYE, s: "#f2d8b0" });   // 小熊
    if (L.age === "office") {                                                                                       // 公事包
      row(rh, rh + 2, handY, OUT);
      for (let y = handY + 1; y <= handY + 3; y++) row(rh - 1, rh + 3, y, y === handY + 1 ? "#5a3a1e" : "#7a4e2a");
      set(rh + 1, handY + 2, "#f2c23b");
    }
    if (auntie) {                                                                                                   // 菜籃＋蔥
      for (let y = handY - 4; y <= handY - 1; y++) set(rh + 2, y, y === handY - 1 ? WHITE : "#4caf50");
      set(rh + 1, handY - 4, "#4caf50");
      row(rh - 1, rh, handY - 1, "#c43a2e"); row(rh + 3, rh + 4, handY - 1, "#c43a2e");
      for (let y = handY; y <= handY + 3; y++) for (let x = rh - 1; x <= rh + 4; x++) set(x, y, (x + y) % 2 ? "#e04a3a" : "#fff3e0");
    }
    if (L.age === "parent") {                                                                                       // 牽小 baby
      const bx = tx1 + 4, onesie = L.topColor === "yellow" ? "#9fc3f0" : "#ffe08a";
      set(tx1 + 3, handY, SKIN); for (let y = handY + 1; y <= 25; y++) set(tx1 + 3, y, SKIN);
      row(bx + 1, bx + 3, 21, "#8a5a30");
      for (let y = 22; y <= 25; y++) row(y === 22 || y === 25 ? bx + 1 : bx, y === 22 || y === 25 ? bx + 3 : bx + 4, y, SKIN);
      set(bx + 1, 23, EYE); set(bx + 3, 23, EYE); set(bx + 2, 24, BLUSH);
      for (let y = 26; y <= 28; y++) row(bx + 1, bx + 3, y, onesie);
      set(bx + 1, 29, SKIN); set(bx + 3, 29, SKIN); set(bx + 1, 30, SKIN); set(bx + 3, 30, SKIN);
      set(bx + 1, 31, WHITE); set(bx + 3, 31, WHITE);
    }

    /* 9. 大頭 */
    for (let y = hT; y < hT + B.head; y++) for (let x = 0; x <= 15; x++) if (inHead(x, y)) set(x, y, y >= hT + B.head - 2 ? SKIN_D : SKIN);
    for (let y = hT; y < hT + B.head - 2; y++) for (let x = 0; x <= 15; x++) if (inHead(x, y)) set(x, y, SKIN);
    const ey = hT + 7;
    // 眼睛：2×2 圓眼＋反光；爺爺奶奶瞇瞇眼；奇怪大哥半睜眼
    for (const ex of [4, 10]) {
      if (elder) { set(ex, ey + 1, EYE); set(ex + 1, ey + 1, EYE); set(ex - 1, ey, SKIN_D); set(ex + 2, ey, SKIN_D); }
      else if (weird) { row(ex, ex + 1, ey, SKIN_D); row(ex, ex + 1, ey + 1, EYE); set(ex, ey + 2, "#c8a0a0"); set(ex + 1, ey + 2, "#c8a0a0"); }
      else { row(ex, ex + 1, ey, EYE); row(ex, ex + 1, ey + 1, EYE); set(ex, ey, WHITE); }
    }
    set(7, ey + 2, SKIN_D);                                                     // 小鼻子
    if (female) {
      set(3, ey - 1, EYE); set(12, ey - 1, EYE);                               // 睫毛
      row(2, 4, ey + 3, BLUSH); row(11, 13, ey + 3, BLUSH);                    // 腮紅
      set(7, ey + 4, "#e0607a"); set(8, ey + 4, "#e0607a");                    // 紅唇
    } else {
      const brow = shade(hc, 0.5);
      row(4, 5, ey - 2, brow); row(10, 11, ey - 2, brow);                      // 粗眉
      set(7, ey + 4, "#b06a4a"); set(8, ey + 4, "#b06a4a");
      if (kid) { row(3, 4, ey + 3, BLUSH); row(11, 12, ey + 3, BLUSH); }
    }
    if (auntie) {
      // 婆婆媽媽：臉頰往下垂（雙下巴、法令紋、眼袋）＋濃妝（紫眼影、粗睫毛、大紅唇、大腮紅、美人痣）
      const SAG = "#d9997a";
      for (let y = ey + 3; y <= ey + 5; y++) { if (!at(1, y)) set(1, y, SKIN); if (!at(14, y)) set(14, y, SKIN); }   // 垂下來的臉頰
      set(1, ey + 5, SAG); set(14, ey + 5, SAG);
      row(3, 12, hT + B.head, SKIN_D); row(4, 11, hT + B.head, SKIN_D); row(5, 10, hT + B.head - 1, SAG);                // 雙下巴
      row(3, 6, ey - 1, "#8a4ab8"); row(9, 12, ey - 1, "#8a4ab8");                                                     // 紫色眼影
      set(4, ey - 2, "#b98ad8"); set(5, ey - 2, "#b98ad8"); set(10, ey - 2, "#b98ad8"); set(11, ey - 2, "#b98ad8");
      set(3, ey, EYE); set(2, ey - 1, EYE); set(12, ey, EYE); set(13, ey - 1, EYE);                                   // 粗睫毛
      row(4, 5, ey + 2, SAG); row(10, 11, ey + 2, SAG);                                                                // 眼袋
      set(5, ey + 4, SAG); set(10, ey + 4, SAG); set(5, ey + 3, SAG); set(10, ey + 3, SAG);                           // 法令紋
      row(2, 4, ey + 3, "#f0607a"); row(11, 13, ey + 3, "#f0607a"); set(3, ey + 2, "#f0607a"); set(12, ey + 2, "#f0607a"); // 大腮紅
      row(6, 9, ey + 4, "#d8203a"); row(7, 8, ey + 5, "#a8182e");                                                      // 大紅唇
      set(11, ey + 5, EYE);                                                                                            // 美人痣
      set(3, ey + 1, EYE); set(12, ey + 1, EYE);                                                                       // 下垂的眼尾
      for (const [x0, x1] of [[1, 2], [13, 14]]) for (let y = ey + 2; y <= ey + 6; y++) row(x0, x1, y, y >= ey + 5 ? SAG : SKIN); // 兩側鬆垮的臉頰
      set(2, ey + 6, null); set(13, ey + 6, null); set(1, ey + 6, null); set(14, ey + 6, null);
      row(3, 12, ey + 6, SAG); row(4, 11, ey + 6, SKIN); set(4, ey + 6, SAG); set(11, ey + 6, SAG);                    // 雙下巴
      set(3, ey + 5, SAG); set(12, ey + 5, SAG);
    }
    if (weird) for (let x = 5; x <= 10; x++) { if (x % 2) set(x, ey + 5, "#9a8a96"); if (x === 6 || x === 9) set(x, ey + 4, "#9a8a96"); } // 鬍渣
    if (elder) { set(4, ey + 3, SKIN_D); set(11, ey + 3, SKIN_D); set(7, hT + 3, SKIN_D); set(8, hT + 3, SKIN_D); }   // 皺紋
    if (L.age === "parent" && !female) row(6, 9, ey + 4, hd);                 // 爸爸的小鬍子
    if ((L.age === "parent" || auntie) && female) { set(0, ey + 2, "#f2c23b"); set(15, ey + 2, "#f2c23b"); }        // 耳環

    /* 10. 前面的頭髮 */
    const headPx = (x, y, ex) => inHead(x, y, ex);
    if (L.hairLen === "short" || L.hairLen === "long") {
      for (let y = hT - 1; y <= hT + 8; y++) for (let x = -1; x <= 16; x++) {
        if (!headPx(x, y, 0.6)) continue;
        if (y <= hT + 3 || (y === hT + 4 && !(x === 5 || x === 6 || x === 9 || x === 10)) || ((x <= 2 || x >= 13) && y <= hT + 8)) set(x, y, hc);
      }
      set(5, hT, hl); set(6, hT, hl); set(4, hT + 1, hl);
      if (L.hairLen === "long") for (let y = hT + 4; y <= bT + 2; y++) { row(-1, 1, y, hc); row(14, 16, y, hc); }
    } else if (L.hairLen === "curly") {
      for (let y = hT - 2; y <= hT + 9; y++) for (let x = -2; x <= 17; x++) {
        if (!headPx(x, y, 1.2)) continue;
        const edge = !headPx(x, y, 0.4);
        if (edge && (x + y) % 2) continue;                                     // 捲捲的波浪邊
        if (y <= hT + 4 || x <= 2 || x >= 13) set(x, y, (x * 2 + y) % 5 === 0 ? hd : hc);
      }
      set(5, hT - 1, hl); set(9, hT, hl);
    } else {
      // 大媽長捲髮：蓬蓬的大捲，一路捲到肩膀
      for (let y = hT - 3; y <= bT + 1; y++) for (let x = -3; x <= 18; x++) {
        const top = Math.pow(Math.abs(x - cx) / 9.5, 2) + Math.pow(Math.abs(y - (hT + 5)) / 8.5, 2) <= 1;
        if (!top) continue;
        const face = (inHead(x, y) && y > hT + 4 && x > 2 && x < 13) || (auntie && y >= ey + 2 && y <= ey + 6 && x >= 1 && x <= 14);  // 婆婆媽媽：垂下的臉頰露出來
        if (face) continue;
        const ring = (x * 3 + y * 5) % 7;
        set(x, y, ring === 0 ? hd : ring === 3 ? hl : hc);
      }
      for (let x = 3; x <= 12; x++) if (x % 3 !== 1) set(x, hT + 4, hc);       // 捲捲瀏海
    }
    if (weird) { set(3, hT - 2, hc); set(7, hT - 3, hc); set(8, hT - 2, hc); set(12, hT - 2, hc); set(13, hT - 1, hc); }  // 亂翹的頭髮

    /* 11. 帽子 */
    if (L.hat !== "none") {
      const kc = get("hatColor", L.hatColor).c, kd = shade(kc, 0.75), kl = mix(kc, WHITE, 0.3);
      if (L.hat === "cap") {
        for (let y = hT - 2; y <= hT + 2; y++) for (let x = 1; x <= 14; x++) if (headPx(x, y, 0.8)) set(x, y, kc);
        set(5, hT - 1, kl); set(7, hT, WHITE); set(8, hT, WHITE);
        row(0, 15, hT + 3, kd);
      } else if (L.hat === "beanie") {
        set(7, hT - 4, WHITE); set(8, hT - 4, WHITE); set(7, hT - 3, WHITE); set(8, hT - 3, WHITE);
        for (let y = hT - 2; y <= hT + 3; y++) for (let x = 0; x <= 15; x++) if (headPx(x, y, 0.8)) set(x, y, y >= hT + 2 ? (x % 2 ? kd : kc) : kc);
      } else {
        for (let y = hT - 3; y <= hT + 1; y++) row(3, 12, y, y === hT + 1 ? OUT : kc);
        row(-2, 17, hT + 2, kd); row(-1, 16, hT + 3, kc);
      }
    }

    /* 12. 眼鏡（圍著 2×2 圓眼） */
    if (L.glasses !== "none") {
      const F = "#2a1e18", LENS = "#bfe0ff", big = L.glassesSize === "big", round = L.glasses === "round";
      const lens = (x0, x1, y0, y1) => {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const edge = y === y0 || y === y1 || x === x0 || x === x1;
          const corner = (x === x0 || x === x1) && (y === y0 || y === y1);
          if (round && corner) continue;
          if (edge) set(x, y, F); else if (at(x, y) !== EYE && at(x, y) !== WHITE) set(x, y, LENS);
        }
      };
      if (big) { lens(2, 7, ey - 2, ey + 3); lens(8, 13, ey - 2, ey + 3); }
      else { lens(3, 6, ey - 1, ey + 2); lens(9, 12, ey - 1, ey + 2); set(7, ey, F); set(8, ey, F); }
    }

    /* 13. 爺爺奶奶：上半身往前駝＋拄拐杖 */
    if (elder) {
      const lean = (y1) => { for (let y = 0; y < y1; y++) g[y] = [null].concat(g[y].slice(0, -1)); };
      lean(legsTop + 2); lean(bT + 3); lean(bT);
      const cane = tx1 + 5;
      row(tx1 + 3, cane, handY - 1, "#7a4e2a");
      for (let y = handY - 1; y <= 31; y++) set(cane, y, y === 31 ? OUT : "#7a4e2a");
      set(tx1 + 4, handY, SKIN);
    }

    /* 14. 描邊（深咖啡色，比純黑柔和） */
    const O = Array.from({ length: H + 2 }, () => Array(W + 2).fill(null));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) O[y + 1][x + 1] = g[y][x];
    const out = O.map((r) => r.slice());
    for (let y = 0; y < H + 2; y++) for (let x = 0; x < W + 2; x++) {
      if (O[y][x]) continue;
      if ((O[y - 1] && O[y - 1][x]) || (O[y + 1] && O[y + 1][x]) || O[y][x - 1] || O[y][x + 1]) out[y][x] = OUT;
    }
    if (full) return out;
    let minX = W + 2, maxX = -1;
    out.forEach((r) => r.forEach((c, x) => { if (c) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); } }));
    return out.map((r) => r.slice(minX, maxX + 1));
  }

  /* ---- 輸出 ---- */
  const cache = new Map();
  function sprite(look, px, full) {
    const key = JSON.stringify(normalize(look)) + "@" + px + (full ? "F" : "");
    if (cache.has(key)) return cache.get(key);
    const grid = build(look, full), c = document.createElement("canvas");
    c.width = grid[0].length * px; c.height = grid.length * px;
    const g = c.getContext("2d");
    grid.forEach((r, y) => r.forEach((col, x) => { if (col) { g.fillStyle = col; g.fillRect(x * px, y * px, px, px); } }));
    if (cache.size > 200) cache.clear();
    cache.set(key, c);
    return c;
  }
  // 編輯器預覽與任務卡：固定畫框，換配件時人物和版面都不會跳動
  function draw(canvas, look, px) {
    const s = sprite(look, px, true);
    canvas.width = s.width; canvas.height = s.height;
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, s.width, s.height); g.drawImage(s, 0, 0);
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "人物外觀：" + describe(look));
  }

  /* ---- 編輯器 ---- */
  function mountEditor(root, initial, onChange) {
    let look = normalize(initial);
    root.innerHTML = `
      <div class="ava-stage"><canvas class="ava-preview"></canvas>
        <div class="ava-actions">
          <button type="button" class="btn ghost sm" data-ava="random">隨機</button>
          <button type="button" class="btn ghost sm" data-ava="reset">重置</button>
        </div></div>
      <div class="ava-groups">${GROUPS.map(([k, label]) => `
        <div class="ava-group" role="radiogroup" aria-label="${label}">
          <span class="ava-label">${label}</span>
          <div class="ava-opts">${OPT[k].map((o) => o.c
            ? `<button type="button" class="ava-sw" data-k="${k}" data-v="${o.v}" style="--sw:${o.c}" title="${o.n}" aria-label="${label}：${o.n}"></button>`
            : `<button type="button" class="ava-opt" data-k="${k}" data-v="${o.v}">${o.n}</button>`).join("")}</div>
        </div>`).join("")}</div>
      <p class="ava-desc" aria-live="polite"></p>`;
    const preview = root.querySelector(".ava-preview"), desc = root.querySelector(".ava-desc");
    function paint() {
      draw(preview, look, 5);
      root.querySelectorAll("[data-k]").forEach((b) => {
        const on = look[b.dataset.k] === b.dataset.v;
        b.setAttribute("aria-checked", String(on)); b.setAttribute("role", "radio");
      });
      desc.textContent = describe(look);
    }
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k],[data-ava]"); if (!b) return;
      if (b.dataset.ava === "random") look = random();
      else if (b.dataset.ava === "reset") look = { ...DEFAULT };
      else {
        const k = b.dataset.k, v = b.dataset.v;
        look = { ...look, [k]: v };
        // 婆婆媽媽自動變女生、奇怪大哥自動變男生；反過來改性別時跳到相近的種類
        if (k === "age" && BIND[v]) look.gender = BIND[v];
        if (k === "gender" && BIND[look.age] && BIND[look.age] !== v) look.age = look.age === "auntie" ? "parent" : "office";
        if (k === "age" && v === "auntie" && look.hairLen === "short") look.hairLen = "perm";
      }
      look = normalize(look);
      paint(); onChange && onChange(look);
    });
    paint();
    return { get: () => ({ ...look }), set: (l) => { look = normalize(l); paint(); } };
  }

  window.AokAvatar = { OPT, GROUPS, DEFAULT, normalize, random, describe, build, sprite, draw, mountEditor, shade };
})();
