# ClockWidget

浮在終端機右上角、小畫面下方的時鐘：大字時間加一行日期。

## 用法

```js
corner.appendChild(TerminalDesktop.ClockWidget());            // 大時鐘
corner.appendChild(TerminalDesktop.ClockWidget({ compact: true, date: false })); // 單行小時鐘
// 截圖用固定時間：ClockWidget({ now: '2026-10-26T14:05:00' })
```

- 放在 `.td-corner`，排在 `MiniDesktop` 下方，間隔 `space-4`。
- 終端機區太窄時（小於 600px）隱藏，或改用 `compact`。

## 規則

- 時間用 `clock` 樣式（48/52、600、等寬數字），24 小時制。
- 日期 mono 12px、`ink-muted`，格式 `2026-10-26 週一`。
- 底色 `surface-glass` + 背景模糊，邊框 `line`，圓角 `radius-md`，內距 `space-4`。
- 每秒更新一次；沒有動畫。
