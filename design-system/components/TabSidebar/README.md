# TabSidebar

桌布左側的終端機分頁欄：列出每個終端機、切換、開新分頁、改名、關閉，底部是選單。

## 用法

```js
const sidebar = TerminalDesktop.TabSidebar({
  tabs: [{ id: 'a', label: 'dev', active: true }, { id: 'b', label: 'build', activity: true }],
  onSelect: (id) => show(id),
  onNew: () => createTab(),
  onClose: (id) => closeTab(id),
  onRename: (id, label) => renameTab(id, label),
  onMenu: (rect) => openMenu(rect)
});
sidebar.update(nextTabs); // 狀態改變後由你呼叫
```

- 有傳回呼函式時，分頁狀態由你管理，改完呼叫 `update(tabs)`；沒傳時（預覽）元件自己管理。
- 寬 200px，放在 `.td-desk` 的第一欄。

## 分頁狀態

| 狀態 | 圓點 | 說明 |
| --- | --- | --- |
| 作用中 | `phosphor` 實心 | 正在顯示的分頁，底色 `line` |
| 有新輸出 | `focus` 實心 | 背景分頁有沒看過的輸出 |
| 閒置 | `ink-muted` 空心 | 背景分頁，沒有新輸出 |
| 已結束 | `ink-muted` 虛線 | 終端機程序已結束，名稱變淡並標「已結束」 |

綠色和藍色除了色相不同，也靠「作用中有底色」區分。

## 操作

- 點分頁切換；方向鍵上下移動；`Enter` 選取。
- 雙擊或 `F2` 改名，`Enter` 確定、`Esc` 取消。
- 滑鼠中鍵或 `×` 關閉。
- 「+ 新分頁」開一個新的終端機；「▸ 選單」開啟程式捷徑與設定。
- 右鍵：呼叫 `onContextMenu(id, x, y)`，由你在該位置顯示分頁選單；選單裡的「重新命名」呼叫 `startRename(id)`。

## 右鍵選單內容

用系統原生選單，項目用動詞開頭、分組以分隔線隔開，不能用的項目變灰而不是隱藏：

1. 重新命名（F2）、重新啟動、清除畫面
2. 複製所有輸出、儲存輸出成文字檔…、在檔案總管開啟資料夾（只有開機程式分頁）
3. 上移、下移
4. 關閉分頁、關閉其他一般分頁

會停止正在執行的程式的動作（關閉、重新執行開機程式），先跳確認。

## 命名

新分頁叫「終端機 N」，N 取目前沒被用到的最小數字：關掉中間的分頁會留下空號，下一個新分頁先補上；全部關掉後從 1 開始，數字不會一直變大。開機程式分頁用它在設定裡的名稱，不佔編號。

## 規則

- 分頁名稱用 mono 12px；其他文字用 `ui`。
- 底色 `surface`，右側 1px `line` 分隔。
- 分頁列表太長時捲動，底部選單固定。
