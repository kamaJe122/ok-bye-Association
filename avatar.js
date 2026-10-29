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
    topLen: [{ v: "long", n: "長袖" }, { v: "short", n: "短袖" }],
    topColor: [C("red", "紅", "#d23a2a"), C("blue", "藍", "#2d64c8"), C("green", "綠", "#3fae5a"), C("yellow", "黃", "#f2c23b"), C("black", "黑", "#2a2230"), C("white", "白", "#f6f6f6")],
    bottom: [{ v: "pants", n: "長褲" }, { v: "shorts", n: "短褲" }, { v: "longskirt", n: "長裙" }, { v: "skirt", n: "短裙" }],
    bottomColor: [C("black", "黑", "#2a2230"), C("denim", "牛仔藍", "#3b5f9e"), C("khaki", "卡其", "#c2a36b"), C("gray", "灰", "#8a8f98"), C("white", "白", "#f6f6f6"), C("red", "紅", "#b8322a")],
    shoes: [{ v: "slipper", n: "拖鞋" }, { v: "sneaker", n: "布鞋" }, { v: "heels", n: "高跟鞋" }],
    shoeColor: [C("black", "黑", "#2a2230"), C("white", "白", "#f6f6f6"), C("red", "紅", "#d23a2a"), C("blue", "藍", "#2d64c8"), C("brown", "棕", "#7a4a24"), C("pink", "粉", "#f08cb0")]
  };
  const GROUPS = [
    ["gender", "性別"], ["age", "年紀"], ["hairColor", "髮色"], ["hairLen", "髮型"],
    ["topLen", "上衣"], ["topColor", "上衣顏色"], ["bottom", "下身"], ["bottomColor", "下身顏色"],
    ["shoes", "鞋子"], ["shoeColor", "鞋子顏色"]
  ];
  const DEFAULT = { gender: "m", age: "office", hairColor: "black", hairLen: "short", topLen: "long", topColor: "blue",
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
      n("topColor") + "色" + n("topLen"),
      n("bottomColor") + n("bottom"),
      n("shoeColor") + "色" + n("shoes")].join("・");
  }

  /* ---- 顏色工具 ---- */
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
    return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
  }
  const SKIN = "#f5c9a0", SKIN_D = "#d99c74", INK = "#1a1020", BLUSH = "#f29a9a";

  /* ---- 依年紀決定身形 ---- */
  const BODY = {
    kid: { legH: 5, torsoH: 6, tx: [5, 10], arms: [[3, 4], [11, 12]] },
    student: { legH: 8, torsoH: 8, tx: [4, 11], arms: [[2, 3], [12, 13]] },
    office: { legH: 9, torsoH: 9, tx: [4, 11], arms: [[2, 3], [12, 13]] },
    parent: { legH: 9, torsoH: 9, tx: [4, 11], arms: [[2, 3], [12, 13]] },
    elder: { legH: 9, torsoH: 9, tx: [4, 11], arms: [[2, 3], [12, 13]] }
  };
  const W = 16, H = 32;

  function build(look) {
    const L = normalize(look);
    const g = Array.from({ length: H }, () => Array(W).fill(null));
    const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
    const row = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) set(x, y, c); };

    const B = BODY[L.age];
    const legsTop = 30 - B.legH, torsoTop = legsTop - B.torsoH, headTop = torsoTop - 8;
    const hc = get("hairColor", L.hairColor).c, hd = shade(hc, 0.72), hl = shade(hc, 1.18);
    const tc = get("topColor", L.topColor).c, td = shade(tc, 0.78);
    const bc = get("bottomColor", L.bottomColor).c, bd = shade(bc, 0.75);
    const sc = get("shoeColor", L.shoeColor).c, sd = shade(sc, 0.7);
    const female = L.gender === "f";
    const [tx0, tx1] = B.tx;

    // 1. 長髮（背後那一片）
    if (L.hairLen === "long") for (let y = headTop + 2; y <= torsoTop + 3; y++) row(3, 12, y, hd);

    // 2. 爺爺奶奶的拐杖
    if (L.age === "elder") {
      const hy = torsoTop + B.torsoH - 1;
      row(13, 14, hy - 1, "#6b4a2b");
      for (let y = hy; y <= 31; y++) set(14, y, "#6b4a2b");
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
        const i = y - legsTop, w = Math.floor(i / 3);
        row(Math.max(3, tx0 - w), Math.min(12, tx1 + w), y, y === 28 ? bd : bc);
      }
      bareLegs(29);
    } else {
      for (let y = legsTop; y < legsTop + 4; y++) {
        const i = y - legsTop, w = Math.floor(i / 2);
        row(Math.max(3, tx0 - w), Math.min(12, tx1 + w), y, y === legsTop + 3 ? bd : bc);
      }
      bareLegs(legsTop + 4);
    }

    // 4. 鞋子（第 30、31 列）
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

    // 5. 上衣
    for (let y = torsoTop; y < torsoTop + B.torsoH; y++) {
      row(tx0, tx1, y, y === torsoTop + B.torsoH - 1 ? td : tc);
      set(tx1, y, td);
    }
    set(7, torsoTop, SKIN); set(8, torsoTop, SKIN);

    // 6. 手臂與袖子
    const handY = torsoTop + B.torsoH;
    for (const [a0, a1] of B.arms) {
      const inner = a0 < 8 ? a1 : a0;
      set(inner, torsoTop, tc);
      for (let y = torsoTop + 1; y <= handY; y++) {
        let c = SKIN;
        if (y < handY && (L.topLen === "long" || y <= torsoTop + 2)) c = tc;
        row(a0, a1, y, c);
      }
    }

    // 7. 年紀配件（身上）
    if (L.age === "student") for (let y = torsoTop; y <= torsoTop + 4; y++) { set(5, y, "#6b4a2b"); set(10, y, "#6b4a2b"); }
    if (L.age === "office") {
      if (!female) {
        const tie = L.topColor === "red" ? "#2d64c8" : "#b8322a";
        for (let y = torsoTop + 1; y <= torsoTop + 5; y++) set(7, y, tie), set(8, y, y === torsoTop + 1 ? tie : shade(tie, 0.8));
      } else {
        row(13, 14, handY, "#6b4a2b"); row(13, 14, handY + 1, "#8a5a33"); row(13, 14, handY + 2, "#6b4a2b"); set(13, handY - 1, "#6b4a2b");
      }
    }

    // 8. 頭
    for (let y = headTop; y < headTop + 8; y++) row(4, 11, y, y === headTop + 7 ? SKIN_D : SKIN);
    set(4, headTop, null); set(11, headTop, null); set(4, headTop + 7, null); set(11, headTop + 7, null);
    set(3, headTop + 4, SKIN); set(12, headTop + 4, SKIN);
    const ey = headTop + 4;
    set(6, ey, INK); set(9, ey, INK);
    if (L.age === "kid") { set(6, ey + 1, INK); set(9, ey + 1, INK); }
    if (female) { set(5, ey - 1, INK); set(10, ey - 1, INK); set(7, headTop + 6, "#d2506a"); set(8, headTop + 6, "#d2506a"); }
    else { set(7, headTop + 6, "#a0563a"); set(8, headTop + 6, "#a0563a"); }
    if (female || L.age === "kid") { set(5, ey + 1, BLUSH); set(10, ey + 1, BLUSH); }
    if (L.age === "parent" && !female) row(6, 9, headTop + 6, hd === "#000000" ? INK : hd);
    if (L.age === "parent" && female) { set(3, headTop + 5, "#f2c23b"); set(12, headTop + 5, "#f2c23b"); }

    // 9. 前面的頭髮
    if (L.hairLen === "curly") {
      row(5, 6, headTop - 2, hc); row(9, 10, headTop - 2, hc);
      row(4, 11, headTop - 1, hc); row(3, 12, headTop, hc); row(3, 12, headTop + 1, hc);
      [3, 4, 5, 10, 11, 12].forEach((x) => set(x, headTop + 2, hc));
      [3, 4, 11, 12].forEach((x) => set(x, headTop + 3, hc));
      for (let y = headTop + 4; y <= headTop + 6; y++) { set(3, y, hc); set(12, y, hc); }
      for (let y = headTop - 2; y <= headTop + 6; y++) for (let x = 3; x <= 12; x++) if (g[y] && g[y][x] === hc && (x + y) % 3 === 0) set(x, y, hd);
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

    // 10. 爺爺奶奶的眼鏡
    if (L.age === "elder") {
      row(5, 7, ey - 1, INK); row(8, 10, ey - 1, INK);
      set(5, ey, INK); set(7, ey, INK); set(8, ey, INK); set(10, ey, INK);
      set(6, ey, "#9fc3f0"); set(9, ey, "#9fc3f0");
      set(6, ey + 1, INK); set(9, ey + 1, INK);
    }

    // 11. 描邊（遊戲感 + 在深色雷達上看得清楚）
    const O = Array.from({ length: H + 2 }, () => Array(W + 2).fill(null));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) O[y + 1][x + 1] = g[y][x];
    const out = O.map((r) => r.slice());
    for (let y = 0; y < H + 2; y++) for (let x = 0; x < W + 2; x++) {
      if (O[y][x]) continue;
      if ((O[y - 1] && O[y - 1][x]) || (O[y + 1] && O[y + 1][x]) || O[y][x - 1] || O[y][x + 1]) out[y][x] = INK;
    }
    return out;
  }

  /* ---- 輸出 ---- */
  const cache = new Map();
  function sprite(look, px) {
    const key = JSON.stringify(normalize(look)) + "@" + px;
    if (cache.has(key)) return cache.get(key);
    const grid = build(look), c = document.createElement("canvas");
    c.width = (W + 2) * px; c.height = (H + 2) * px;
    const g = c.getContext("2d");
    grid.forEach((r, y) => r.forEach((col, x) => { if (col) { g.fillStyle = col; g.fillRect(x * px, y * px, px, px); } }));
    if (cache.size > 200) cache.clear();
    cache.set(key, c);
    return c;
  }
  function draw(canvas, look, px) {
    const s = sprite(look, px);
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

  window.AokAvatar = { OPT, GROUPS, DEFAULT, normalize, random, describe, build, sprite, draw, mountEditor };
})();
