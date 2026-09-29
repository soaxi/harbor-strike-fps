# HARBOR STRIKE｜港區交戰

[開始遊戲](https://soaxi.github.io/harbor-strike-fps/)

使用 Three.js 製作的單人第一人稱射擊遊戲。你操控一名角色，其餘角色為電腦 AI；包含一張貨运港區地圖、回合殲滅戰及最多 50 對 50 對戰。

## 操作

| 按鍵 | 功能 |
| --- | --- |
| WASD | 移動 |
| 滑鼠 | 轉向 |
| 左鍵 | 射擊／投擲手榴彈 |
| 右鍵 | 瞄準／狙擊鏡 |
| 1 / 2 / 3 / 4 | 步槍／狙擊槍／散彈槍／手榴彈 |
| R | 換彈 |
| Space | 跳躍 |
| Shift | 加速 |
| Esc | 暫停／釋放滑鼠 |

開始前可設定 0–49 名 AI 隊友、1–50 名 AI 敵人。50 對 50 包含玩家本人。先獲得 5 回合勝利的一方獲勝；每回合 2 分鐘。手榴彈有 2.2 秒引信，爆炸會造成自身傷害。

建議使用支援 WebGL 的桌面瀏覽器及鍵盤、滑鼠。點擊「開始行動」會啟用滑鼠鎖定與音效。百人模式的流暢度取決於電腦效能。

## 本機執行

需要 Node.js 22.13 或更新版本。

```sh
npm ci
npm run dev
```

## 建置與 GitHub Pages

```sh
npm run build
```

純靜態輸出位於 `docs/`，所有遊戲邏輯在瀏覽器執行，不需要伺服器或 API 金鑰。

GitHub 儲存庫的 **Settings → Pages** 設為 **Deploy from a branch → main → /docs**。更新程式後，執行建置並一併提交原始碼與 `docs/`，推送到 `main` 即會更新網頁。音效與素材使用相對路徑，可在 GitHub Pages 專案子路徑中載入。

## 專案結構

- `src/play.ts`：遊戲迴圈、角色、武器、手榴彈及回合
- `src/navigation.ts`：AI 導航快取
- `src/weapons.ts`：武器數值與傷害
- `src/roster.ts`：人數限制與出生位置
- `src/audio.ts`：音效載入、距離衰減及左右聲道
- `src/App.tsx`：操作介面
- `public/audio/`：音效與授權來源
- `docs/`：GitHub Pages 可直接發布的建置結果

## 音效來源

音效素材均採 CC0 1.0；詳細來源與編輯方式見 [credits.txt](public/audio/credits.txt)。

- [The Free Firearm Sound Library](https://opengameart.org/node/21826)：Ben Jaszczak、Brian Nelson、Kevin Heras、Matthew Nanney
- [Chunky Explosion](https://opengameart.org/content/chunky-explosion)：Joth
- [Gun reload sounds](https://opengameart.org/content/gun-reload-sounds)：SpringySpringo

此版本由原本的 Sites 遊戲轉換為獨立 Vite 靜態網頁。

## 效能改善與測試

- 同色靜態地圖合併為 19 個繪製物件，靜態陰影只建立一次。
- 共用彈道幾何與角色變換暫存，減少交戰中的配置與回收。
- AI 使用區域分桶尋找鄰近角色，避免每次避讓掃描全隊。
- 暫停時凍結模擬時間並停止重畫；移出視窗會清除瞄準及音效。

```sh
npm test
```

測試涵蓋四種武器、彈藥、爆炸、切槍取消換彈、暫停及 100 人 AI 模擬。測試使用模擬繪圖器，不能代表實際顯示卡 FPS。
