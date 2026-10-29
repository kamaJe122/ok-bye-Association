// ===== 奧客互助協會 設定檔 =====
// 只要改這個檔案，不用動其他程式。
window.AOK_CONFIG = {
  // 1) Google Maps JavaScript API 金鑰（留空 = 使用內建「點陣雷達」離線地圖）
  //    記得在 Google Cloud Console 設「HTTP 參照網址限制」與「每日配額上限」
  GMAPS_KEY: "",

  // 2) 雲端同步（留空 = 示範模式：只在同一台裝置的分頁之間同步）
  //    填入 Firebase Realtime Database 設定後，所有人的手機就會即時看到求救
  FIREBASE: {
    apiKey: "AIzaSyAG-8k7aBpq1iK9PsIdfbms4qItJyrdTWY",
    authDomain: "okbye-900cb.firebaseapp.com",
    databaseURL: "https://okbye-900cb-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "okbye-900cb",
    appId: "1:855567297150:web:23dea21635915ddc94462f"
  },

  RADIUS_M: 500,          // 顯示範圍（公尺）
  SOS_EXPIRE_MIN: 60,     // 求救訊號幾分鐘後自動過期
  DEMO_SEED: true         // 示範模式時，在你附近放 3 筆假求救方便測試
};
