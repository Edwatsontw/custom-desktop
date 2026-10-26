# TerminalArea

鋪滿桌布的終端機，每個分頁一個；這個元件是有相同外觀的示範版，實際桌面用 xterm.js 套用同一組 token。

## 用法

```js
const term = TerminalDesktop.TerminalArea({
  active: true,
  lines: ['On branch main', { text: '✓ 42 tests passed', tone: 'ok' }],
  onCommand: (cmd) => myShell.run(cmd)
});
stage.appendChild(term); // .td-stage
```

- 放在 `.td-desk` 的第二欄 `.td-stage` 裡，鋪滿整個區域；右上角的 `.td-corner` 疊在上面。
- 預覽裡的指令是示範用的小 shell（`help`、`date`、`echo`、`clear`）。
- 每一行可帶 `tone`：`out`（預設，`ink`）、`cmd`、`muted`（`ink-muted`）、`ok`（`phosphor`）、`warn`、`error`。

## 用 xterm.js 時的對應

| xterm 設定 | token |
| --- | --- |
| background | `desk` |
| foreground、white | `ink` |
| cursor、green | `phosphor` |
| blue、選取範圍 | `focus` |
| yellow | `warn` |
| red | `error` |
| brightBlack | `ink-muted` |

字體 `mono` 14px。失去焦點時 xterm 會自動把游標變成空心框，和本元件的非作用中狀態一致。

## 右鍵選單與快捷鍵

在終端機裡按右鍵：複製（`Ctrl + Shift + C`，沒有選取時變灰）、貼上（`Ctrl + Shift + V`）、全選；清除畫面；放大／縮小／重設字體（`Ctrl + =`、`Ctrl + -`、`Ctrl + 0`，9–28px，所有分頁一起）；重新命名分頁（`F2`）、新分頁、切換到桌面。`Ctrl + C` 保留給終端機中斷指令。

## 狀態

- **作用中**：提示字元與實心游標 `phosphor`，游標閃爍（減少動態效果時不閃）。
- **非作用中**：提示字元 `ink-muted`，游標空心框。

## 規則

- 左右內距 `space-6`、上下 `space-4`；不加圓角、不加邊框，底色固定 `desk`。
- 從原有桌面按快捷鍵回來時，焦點自動回到剛才的分頁。
