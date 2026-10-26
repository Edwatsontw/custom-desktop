# EdgeStrip

原有桌面全螢幕時，貼在螢幕左邊緣的 8px 細條；滑鼠移上去展開成分頁列表，點分頁直接回到那個終端機。

## 用法

```js
const strip = TerminalDesktop.EdgeStrip({
  tabs,
  onSelect: (id) => backToTerminal(id),
  onExpand: (open) => resizeStripWindow(open ? 220 : 8)
});
strip.update(nextTabs);
```

- 只在原有桌面全螢幕時出現，永遠在其他視窗之上。
- 收合時寬 8px：底色 `surface`，每個分頁一條 2 × 16px 的刻度，顏色和分頁圓點相同（作用中 `phosphor`、有新輸出 `focus`、其他 `ink-muted`）。背景分頁有新輸出時，不展開也看得到藍色刻度。
- 展開時寬 220px：分頁列表 + 底部提示「`Ctrl + Alt + Z` 回到終端機」。

## 互動

- 滑鼠移入或鍵盤焦點進入 → 展開；移出 250ms 後收合。
- 點分頁 → 回到終端機並切到那個分頁。
- 以獨立視窗實作時，用 `onExpand` 同步調整視窗寬度，收合時只占 8px，不擋住桌面。

## 規則

- 不放圖示、不加陰影；展開面板右側 1px `line`。
- 不要自動展開；只有使用者把滑鼠移過去才展開。
