# 奧客互助協會

附近餐廳出現奧客 → 店員一鍵求救 → 方圓 500 公尺的勇者接任務 → 店員確認後發獎勵代碼。

- 創意發起人：Popcorn
- 程式美編設計：Kama

## 檔案

| 檔案 | 用途 |
|---|---|
| index.html | 畫面（點陣風 UI） |
| avatar.js | 奧客外觀點陣人物：選項、繪圖、編輯器 |
| app.js | 全部邏輯：定位、通知、地圖、任務、離線佇列 |
| config.js | **唯一要改的檔**：Google Maps 金鑰、Firebase、範圍 |
| sw.js | Service Worker：離線快取、通知點擊 |
| manifest.webmanifest + icons/ | 加到主畫面用 |

## 上線（GitHub Pages，免費、自帶 HTTPS）

定位、通知、Service Worker 都**必須是 HTTPS**，直接雙擊 index.html 不會動。

1. GitHub 開新 repo（例：`kamaJe122/ok-bye-Association`），把整個資料夾上傳
2. Settings → Pages → Branch 選 `main` / `root` → Save
3. 約 1 分鐘後網址：`https://kamaje122.github.io/ok-bye-Association/`

## 兩種模式

- **示範模式（預設）**：資料存在本機，同一台裝置開兩個分頁就能模擬「店員」和「勇者」。
- **雲端模式**：在 config.js 填 `FIREBASE`（Realtime Database，免費 Spark 方案），所有人即時同步。

## Google Maps 金鑰

1. Google Cloud Console → 建立專案 → 綁帳單帳戶（要信用卡）
2. 啟用 **Maps JavaScript API**
3. 憑證 → 建立 API 金鑰 → 應用程式限制：**HTTP 參照網址** `https://kamaje122.github.io/*`
4. 配額 → Maps JavaScript API → Map loads per day 設 **300**（保險絲，超過就停，不會被扣錢）
5. 金鑰貼到 config.js 的 `GMAPS_KEY`

沒填金鑰也能用：會顯示內建「點陣雷達」，離線時也自動切換成它。

## 下一版（v2）：手機關掉 App 也收得到通知

需要後端：Firebase Cloud Messaging（或 web-push + VAPID）＋ Cloud Function，
在有新求救時，找出最後位置在 500 公尺內的使用者並推播。sw.js 已預留 `push` 事件。

## 奧客外觀（v1.1.0）

店員求救時可以畫出奧客的樣子，勇者在任務卡、雷達、通知裡都看得到。

| 項目 | 選項 |
|---|---|
| 性別 | 男生、女生 |
| 年紀 | 小朋友、學生、上班族、爸爸媽媽、爺爺奶奶（身高與配件不同） |
| 髮色 | 黑、棕、金、紅、銀白、藍 |
| 髮型 | 長髮、短髮、捲髮 |
| 上衣 | 長袖、短袖 × 紅、藍、綠、黃、黑、白 |
| 下身 | 長褲、短褲、長裙、短裙 × 黑、牛仔藍、卡其、灰、白、紅 |
| 鞋子 | 拖鞋、布鞋、高跟鞋 × 黑、白、紅、藍、棕、粉 |

年紀配件：學生＝書包背帶、上班族＝領帶（男）／手提包（女）、爸爸＝鬍子、媽媽＝耳環、爺爺奶奶＝眼鏡＋拐杖。
最後一次選的外觀會記在手機裡，「重置」回到預設。要加新選項只改 `avatar.js` 最上面的 `OPT`。
