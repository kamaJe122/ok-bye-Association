/* 奧客互助協會：點陣人物（奧客外觀）產生器
   16x32 格的像素人物，外加 1 格描邊。所有選項都在 OPT 裡，要加新選項只改這裡。 */
(function () {
  "use strict";
  const C = (v, n, c) => ({ v, n, c });
  const OPT = {
    gender: [{ v: "m", n: "男生" }, { v: "f", n: "女生" }],
    age: [{ v: "kid", n: "小朋友" }, { v: "student", n: "學生" }, { v: "office", n: "上班族" }, { v: "parent", n: "爸爸媽媽" }, { v: "elder", n: "爺爺奶奶" }],
    hairColor: [C("black", "黑", "#2a2230"), C("brown", "棕", "#7a4a24"), C("blonde", "金", "#f2c23b"), C("red", "紅", "#c8402e"), C("silver", "銀白", "#dcdce6"), C("blue", "藍", "#3a6ad8")],
    hairLen: [{ v: "long", n: "長髮" }, { v: "short", n: "短髮" }, { v: "curly", n: "捲髮" }],
    hat: [{ v: "none", n: "沒戴" }, { v: "cap", n: "棒球帽" }, { v: "beanie", n: "毛帽" }, { v: "sunhat", n: "遮陽帽" }],
    hatColor: [C("red", "紅", "#d23a2a"), C("blue", "藍", "#2d64c8"), C("green", "綠", "#3fae5a"), C("yellow", "黃", "#f2c23b"), C("black", "黑", "#2a2230"), C("white", "白", "#f6f6f6")],
    glasses: [{ v: "none", n: "沒戴" }, { v: "round", n: "圓框" }, { v: "square", n: "方框" }],
    glassesSize: [{ v: "small", n: "小" }, { v: "big", n: "大" }],
    topLen: [{ v: "long", n: "長袖" }, { v: "short", n: "短袖" }],
    topColor: [C("red", "紅", "#d23a2a"), C("blue", "藍", "#2d64c8"), C("green", "綠", "#3fae5a"), C("yellow", "黃", "#f2c23b"), C("black", "黑", "#2a2230"), C("white", "白", "#f6f6f6")],
    bottom: [{ v: "pants", n: "長褲" }, { v: "shorts", n: "短褲" }, { v: "longskirt", n: "長裙" }, { v: "skirt", n: "短裙" }],
    bottomColor: [C("black", "黑", "#2a2230"), C("denim", "牛仔藍", "#3b5f9e"), C("khaki", "卡其", "#c2a36b"), C("gray", "灰", "#8a8f98"), C("white", "白", "#f6f6f6"), C("red", "紅", "#b8322a")],
    shoes: [{ v: "slipper", n: "拖鞋" }, { v: "sneaker", n: "布鞋" }, { v: "heels", n: "高跟鞋" }],
    shoeColor: [C("black", "黑", "#2a2230"), C("white", "白", "#f6f6f6"), C("red", "紅", "#d23a2a"), C("blue", "藍", "#2d64c8"), C("brown", "棕", "#7a4a24"), C("pink", "粉", "#f08cb0")]
  };
  const GROUPS = [
    ["gender", "性別"], ["age", "年紀"], ["hairColor", "髮色"], ["hairLen", "髮型"],
    ["hat", "帽子"], ["hatColor", "帽子顏色"], ["glasses", "眼鏡"], ["glassesSize", "鏡框大小"],
    ["topLen", "上衣"], ["topColor", "上衣顏色"], ["bottom", "下身"], ["bottomColor", "下身顏色"],
    ["shoes", "鞋子"], ["shoeColor", "鞋子顏色"]
  ];
  const DEFAULT = { gender: "m", age: "office", hairColor: "black", hairLen: "short",
    hat: "none", hatColor: "red", glasses: "none", glassesSize: "small", topLen: "long", topColor: "blue",
    bottom: "pants", bottomColor: "black", shoes: "sneaker", shoeColor: "black" };

  const get = (k, v) => OPT[k].find((o) => o.v === v) || OPT[k].find((o) => o.v === DEFAULT[k]);
  function normalize(look) {
    const out = {};
    for (const k of Object.keys(DEFAULT)) out[k] = get(k, look && look[k]).v;
    return out;
  }
  function random() {
    const out = {};
    for (const k of Object.keys(OPT)) out[k] = OPT[k][Math.floor(Math.random() * OPT[k].length)].v;
    return out;
  }
  function describe(look) {
    const L = normalize(look), n = (k) => get(k, L[k]).n;
    return [n("gender"), n("age"),
      n("hairColor") + "色" + n("hairLen"),
      L.hat !== "none" ? n("hatColor") + "色" + n("hat") : "",
      L.glasses !== "none" ? n("glassesSize") + n("glasses") + "眼鏡" : "",
      n("topColor") + "色" + n("topLen"),
      n("bottomColor") + n("bottom"),
      n("shoeColor") + "色" + n("shoes")].filter(Boolean).join("・");
  }

  /* ---- 顏色工具 ---- */
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
    return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  const SKIN = "#f5c9a0", SKIN_D = "#d99c74", INK = "#1a1020", BLUSH = "#f29a9a";

  /* ---- 依年紀＋性別決定身形 ---- */
  // 男生：肩膀寬（上衣 8 格）；女生：較瘦（上衣 6 格）；爺爺奶奶：矮一點、頭縮進肩膀、往前駝
  const BODY = {
    kid: { legH: 5, torsoH: 6 },
    student: { legH: 8, torsoH: 8 },
    office: { legH: 9, torsoH: 9 },
    parent: { legH: 9, torsoH: 9 },
    elder: { legH: 8, torsoH: 8, sink: 2 }
  };
  const SHAPE = {
    m: { tx: [4, 11], arms: [[2, 3], [12, 13]] },
    f: { tx: [5, 10], arms: [[3, 4], [11, 12]] },
    kid: { tx: [5, 10], arms: [[3, 4], [11, 12]] }
  };
  const W = 24, H = 32, OX = 4;   // 左右多留空間給書包、公事包、拐杖、小 baby

  // full=true：不裁切，固定 26×34 格的畫框，人物永遠站在正中間同一個位置
  function build(look, full) {
    const L = normalize(look);
    const g = Array.from({ length: H }, () => Array(W).fill(null));
    const set = (x, y, c) => { x += OX; if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
    const at = (x, y) => (g[y] ? g[y][x + OX] : null);
    const row = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) set(x, y, c); };
    const draw = (rows, x0, y0, pal) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) set(x0 + i, y0 + j, pal[ch]); }));

    const female = L.gender === "f", elder = L.age === "elder";
    const B = BODY[L.age], S = SHAPE[L.age === "kid" ? "kid" : L.gender];
    const legsTop = 30 - B.legH, torsoTop = legsTop - B.torsoH, headTop = torsoTop - 8 + (B.sink || 0);
    const hc = get("hairColor", L.hairColor).c, hd = shade(hc, 0.72), hl = shade(hc, 1.18);
    const tc = get("topColor", L.topColor).c, td = shade(tc, 0.78);
    const bc = get("bottomColor", L.bottomColor).c, bd = shade(bc, 0.75);
    const sc = get("shoeColor", L.shoeColor).c, sd = shade(sc, 0.7);
    const [tx0, tx1] = S.tx, [[la0, la1], [ra0, ra1]] = S.arms;
    const handY = torsoTop + B.torsoH;

    // 1. 長髮（背後那一片）
    if (L.hairLen === "long") for (let y = headTop + 2; y <= torsoTop + 3; y++) row(3, 12, y, hd);

    // 2. 學生的書包（背在身後，從左側露出來）
    if (L.age === "student") {
      const bag = L.topColor === "red" ? "#2d64c8" : "#c8402e", bagD = shade(bag, 0.7);
      for (let y = torsoTop - 1; y <= torsoTop + 6; y++) row(la0 - 2, la0 - 1, y, y === torsoTop + 1 ? bagD : bag);
      set(la0 - 2, torsoTop + 3, "#f2c23b");                         // 書包扣環
    }

    // 3. 下身
    const bareLegs = (from) => { for (let y = from; y <= 29; y++) { row(5, 6, y, SKIN); row(9, 10, y, SKIN); } };
    if (L.bottom === "pants") {
      for (let y = legsTop; y <= 29; y++) {
        if (y < legsTop + 3) row(5, 10, y, bc);
        else { row(5, 6, y, bc); row(9, 10, y, bc); set(6, y, bd); set(10, y, bd); }
      }
    } else if (L.bottom === "shorts") {
      for (let y = legsTop; y < legsTop + 4; y++) {
        if (y < legsTop + 2) row(5, 10, y, bc); else { row(5, 6, y, bc); row(9, 10, y, bc); }
      }
      bareLegs(legsTop + 4);
    } else if (L.bottom === "longskirt") {
      for (let y = legsTop; y <= 28; y++) {
        const w = Math.floor((y - legsTop) / 3);
        row(Math.max(3, tx0 - w), Math.min(12, tx1 + w), y, y === 28 ? bd : bc);
      }
      bareLegs(29);
    } else {
      for (let y = legsTop; y < legsTop + 4; y++) {
        const w = Math.floor((y - legsTop) / 2);
        row(Math.max(3, tx0 - w), Math.min(12, tx1 + w), y, y === legsTop + 3 ? bd : bc);
      }
      bareLegs(legsTop + 4);
    }

    // 4. 鞋子
    if (L.shoes === "sneaker") {
      row(4, 6, 30, sc); row(9, 11, 30, sc);
      const sole = L.shoeColor === "white" ? "#b8b8c0" : "#f6f6f6";
      row(4, 6, 31, sole); row(9, 11, 31, sole);
    } else if (L.shoes === "slipper") {
      set(4, 30, SKIN); set(11, 30, SKIN); row(5, 6, 30, sc); row(9, 10, 30, sc);
      row(4, 6, 31, sd); row(9, 11, 31, sd);
    } else {
      row(4, 6, 30, sc); row(9, 11, 30, sc);
      set(4, 31, sc); set(6, 31, sd); set(9, 31, sd); set(11, 31, sc);
    }

    // 5. 上衣（男生寬、女生窄＋收腰）
    for (let y = torsoTop; y < handY; y++) {
      row(tx0, tx1, y, y === handY - 1 ? td : tc);
      set(tx1, y, td);
    }
    if (female && L.age !== "kid") { set(tx0, handY - 3, td); set(tx1, handY - 3, shade(tc, 0.65)); } // 腰線
    set(7, torsoTop, SKIN); set(8, torsoTop, SKIN);
    if (elder) { set(tx0, torsoTop, null); set(tx1, torsoTop, null); }  // 圓肩

    // 6. 手臂與袖子
    for (const [a0, a1] of S.arms) {
      const inner = a0 < 8 ? a1 : a0;
      if (!elder) set(inner, torsoTop, tc);
      for (let y = torsoTop + 1; y <= handY; y++) {
        let c = SKIN;
        if (y < handY && (L.topLen === "long" || y <= torsoTop + 2)) c = tc;
        row(a0, a1, y, c);
      }
    }

    // 7. 身上配件
    if (L.age === "student") for (let y = torsoTop; y <= torsoTop + 4; y++) { set(tx0 + 1, y, "#6b4a2b"); set(tx1 - 1, y, "#6b4a2b"); } // 書包背帶
    if (L.age === "office" && !female) {
      const tie = L.topColor === "red" ? "#2d64c8" : "#b8322a";
      for (let y = torsoTop + 1; y <= torsoTop + 5; y++) { set(7, y, tie); set(8, y, y === torsoTop + 1 ? tie : shade(tie, 0.8)); }
    }

    // 8. 手上拿的東西
    if (L.age === "kid") {          // 小朋友：抱著小熊玩偶
      draw(["b...b", "bbbbb", "bkbkb", "bbsbb", ".bbb.", "bb.bb"], ra1, handY - 3,
        { b: "#a0642d", k: INK, s: "#f2d2a0" });
    }
    if (L.age === "office") {       // 上班族：手提公事包
      row(ra1 + 1, ra1 + 4, handY, INK);
      for (let y = handY + 1; y <= handY + 4; y++) row(ra1, ra1 + 5, y, y === handY + 1 ? "#4a2e16" : "#6b4224");
      set(ra1 + 2, handY + 2, "#f2c23b"); set(ra1 + 3, handY + 2, "#f2c23b");  // 金屬扣
    }
    if (L.age === "parent") {       // 爸爸媽媽：牽著小 baby
      const bx = ra1 + 3, onesie = L.topColor === "yellow" ? "#9fc3f0" : "#ffe08a";
      set(ra1 + 1, handY, SKIN); set(ra1 + 1, handY + 1, SKIN);                 // 牽手
      for (let y = handY + 2; y <= 26; y++) set(ra1 + 2, y, SKIN);              // baby 舉高的手
      row(bx, bx + 2, 22, "#7a4a24");                                           // 胎毛
      for (let y = 23; y <= 25; y++) row(bx, bx + 2, y, SKIN);
      set(bx, 24, INK); set(bx + 2, 24, INK); set(bx + 1, 25, BLUSH);
      for (let y = 26; y <= 28; y++) row(bx, bx + 2, y, onesie);
      set(bx + 3, 26, SKIN); set(bx + 3, 27, SKIN);
      set(bx, 29, SKIN); set(bx, 30, SKIN); set(bx + 2, 29, SKIN); set(bx + 2, 30, SKIN);
      set(bx, 31, "#f6f6f6"); set(bx + 2, 31, "#f6f6f6");
    }

    // 9. 頭
    for (let y = headTop; y < headTop + 8; y++) row(4, 11, y, y === headTop + 7 ? SKIN_D : SKIN);
    set(4, headTop, null); set(11, headTop, null); set(4, headTop + 7, null); set(11, headTop + 7, null);
    set(3, headTop + 4, SKIN); set(12, headTop + 4, SKIN);
    const ey = headTop + 4;
    set(6, ey, INK); set(9, ey, INK);
    if (L.age === "kid") { set(6, ey + 1, INK); set(9, ey + 1, INK); }
    if (female) {                   // 女生：睫毛、紅唇、腮紅
      set(5, ey - 1, INK); set(10, ey - 1, INK);
      set(7, headTop + 6, "#d2506a"); set(8, headTop + 6, "#d2506a");
      set(5, ey + 1, BLUSH); set(10, ey + 1, BLUSH); set(4, ey + 1, BLUSH); set(11, ey + 1, BLUSH);
    } else {                        // 男生：粗眉毛
      const brow = shade(hc, 0.55);
      set(6, ey - 2, brow); set(5, ey - 2, brow); set(9, ey - 2, brow); set(10, ey - 2, brow);
      set(7, headTop + 6, "#a0563a"); set(8, headTop + 6, "#a0563a");
      if (L.age === "kid") { set(5, ey + 1, BLUSH); set(10, ey + 1, BLUSH); }
    }
    if (elder) {                    // 爺爺奶奶：皺紋
      set(5, ey + 2, SKIN_D); set(10, ey + 2, SKIN_D); set(7, headTop + 1, SKIN_D); set(8, headTop + 1, SKIN_D);
    }
    if (L.age === "parent" && !female) row(6, 9, headTop + 6, hd);
    if (L.age === "parent" && female) { set(3, headTop + 5, "#f2c23b"); set(12, headTop + 5, "#f2c23b"); }

    // 10. 前面的頭髮
    if (L.hairLen === "curly") {
      row(5, 6, headTop - 2, hc); row(9, 10, headTop - 2, hc);
      row(4, 11, headTop - 1, hc); row(3, 12, headTop, hc); row(3, 12, headTop + 1, hc);
      [3, 4, 5, 10, 11, 12].forEach((x) => set(x, headTop + 2, hc));
      [3, 4, 11, 12].forEach((x) => set(x, headTop + 3, hc));
      for (let y = headTop + 4; y <= headTop + 6; y++) { set(3, y, hc); set(12, y, hc); }
      for (let y = headTop - 2; y <= headTop + 6; y++) for (let x = 3; x <= 12; x++) if (at(x, y) === hc && (x + y) % 3 === 0) set(x, y, hd);
      set(6, headTop - 1, hl);
    } else {
      row(5, 10, headTop - 1, hc); row(4, 11, headTop, hc); row(4, 11, headTop + 1, hc);
      [4, 5, 10, 11].forEach((x) => set(x, headTop + 2, hc));
      set(4, headTop + 3, hc); set(11, headTop + 3, hc);
      set(6, headTop, hl); set(7, headTop, hl);
      if (L.hairLen === "long") {
        for (let y = headTop + 1; y <= torsoTop + 3; y++) { set(3, y, hc); set(12, y, hc); }
        for (let y = headTop + 4; y <= headTop + 6; y++) { set(4, y, hc); set(11, y, hc); }
      }
    }

    // 11. 帽子
    if (L.hat !== "none") {
      const kc = get("hatColor", L.hatColor).c, kd = shade(kc, 0.75), kl = shade(kc, 1.15);
      if (L.hat === "cap") {
        row(5, 10, headTop - 2, kc); row(4, 11, headTop - 1, kc);
        set(6, headTop - 2, kl); set(7, headTop - 1, "#fff6dc");
        row(3, 12, headTop, kd); row(9, 13, headTop, kd);
      } else if (L.hat === "beanie") {
        set(7, headTop - 3, "#fff6dc"); set(8, headTop - 3, "#fff6dc");
        row(5, 10, headTop - 2, kc); row(4, 11, headTop - 1, kc);
        for (let x = 4; x <= 11; x++) { set(x, headTop, x % 2 ? kd : kc); set(x, headTop + 1, x % 2 ? kc : kd); }
      } else {
        row(5, 10, headTop - 3, kc); row(5, 10, headTop - 2, kc);
        row(5, 10, headTop - 1, "#1a1020");
        row(1, 14, headTop, kd); row(2, 13, headTop, kc);
      }
    }

    // 12. 眼鏡
    if (L.glasses !== "none") {
      const F = "#1a1020", LENS = "#9fc3f0", big = L.glassesSize === "big", round = L.glasses === "round";
      const lens = (x0, x1, eye) => {
        for (let y = ey - 1; y <= ey + 1; y++) for (let x = x0; x <= x1; x++) {
          const edge = y !== ey || x === x0 || x === x1;
          const corner = (x === x0 || x === x1) && y !== ey;
          if (round && corner) continue;
          const glass = !round && y === ey + 1 && x !== x0 && x !== x1;
          set(x, y, glass ? LENS : edge ? F : (x === eye ? INK : LENS));
        }
      };
      if (big) { lens(4, 7, 6); lens(8, 11, 9); } else { lens(5, 7, 6); lens(8, 10, 9); }
      if (round && !big) { set(7, ey, F); set(8, ey, F); }
    }

    // 13. 爺爺奶奶：上半身往前傾（駝背）＋膝蓋微彎，再拄拐杖
    if (elder) {
      const lean = (n, y1) => { for (let y = 0; y < y1; y++) for (let k = 0; k < n; k++) g[y] = [null].concat(g[y].slice(0, -1)); };
      lean(1, legsTop + 4);   // 膝蓋微彎
      lean(1, torsoTop + 4);  // 背往前彎
      lean(1, torsoTop + 1);  // 頭往前探（駝背）
      const cx = ra1 + 3;
      row(ra1 + 1, cx, handY - 1, "#6b4a2b");                                         // 拐杖握把
      for (let y = handY - 1; y <= 31; y++) set(cx, y, y === 31 ? INK : "#6b4a2b");
      set(ra1 + 2, handY, SKIN);                                                        // 握著拐杖的手
    }

    // 14. 描邊＋裁掉左右空白
    const O = Array.from({ length: H + 2 }, () => Array(W + 2).fill(null));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) O[y + 1][x + 1] = g[y][x];
    const out = O.map((r) => r.slice());
    for (let y = 0; y < H + 2; y++) for (let x = 0; x < W + 2; x++) {
      if (O[y][x]) continue;
      if ((O[y - 1] && O[y - 1][x]) || (O[y + 1] && O[y + 1][x]) || O[y][x - 1] || O[y][x + 1]) out[y][x] = INK;
    }
    let minX = W + 2, maxX = -1;
    out.forEach((r) => r.forEach((c, x) => { if (c) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); } }));
    if (full) return out;
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
    canvas.setAttribute("aria-label", "奧客外觀：" + describe(look));
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
      else look = { ...look, [b.dataset.k]: b.dataset.v };
      paint(); onChange && onChange(look);
    });
    paint();
    return { get: () => ({ ...look }), set: (l) => { look = normalize(l); paint(); } };
  }

  window.AokAvatar = { OPT, GROUPS, DEFAULT, normalize, random, describe, build, sprite, draw, mountEditor, shade };
})();
