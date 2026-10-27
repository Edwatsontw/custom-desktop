# TabSidebar

The terminal tab bar on the left of the wallpaper: lists each terminal, switches, opens new tabs, renames, closes, with a menu at the bottom.

## Usage

```js
const sidebar = TerminalDesktop.TabSidebar({
  tabs: [{ id: 'a', label: 'dev', active: true }, { id: 'b', label: 'build', activity: true }],
  onSelect: (id) => show(id),
  onNew: () => createTab(),
  onClose: (id) => closeTab(id),
  onRename: (id, label) => renameTab(id, label),
  onMenu: (rect) => openMenu(rect)
});
sidebar.update(nextTabs); // call this after the state changes
```

- When you pass callbacks, you own the tab state and call `update(tabs)` after changing it; without them (previews) the component manages itself.
- 200px wide, in the first column of `.td-desk`.

## Tab states

| State | Dot | Notes |
| --- | --- | --- |
| Active | Solid `phosphor` | The tab being shown, with a `line` background |
| New output | Solid `focus` | A background tab with output not seen yet |
| Idle | Hollow `ink-muted` | A background tab with no new output |
| Exited | Dashed `ink-muted` | The terminal process has ended; the name dims and is marked "exited" |

Green and blue differ in hue, and the active tab also has a background.

## Actions

- Click a tab to switch; arrow keys move up and down; `Enter` selects.
- Double-click or `F2` (with the tab list focused) to rename; `Enter` confirms, `Esc` cancels.
- Middle-click or `×` to close.
- "+ New tab" opens a new terminal; "▸ Menu" opens app shortcuts and settings.
- Right-click calls `onContextMenu(id, x, y)` so you can show the tab menu there; the menu's "Rename" calls `startRename(id)`.

## Right-click menu

Use the system's native menu. Items start with a verb, groups are split by separators, and unavailable items are greyed out rather than hidden:

1. Rename, Restart, Clear
2. Copy all output, Save output as text…, Open folder in File Explorer (startup tabs only)
3. Move up, Move down
4. Close tab, Close other plain tabs

Actions that stop a running program (closing it, running a startup program again) ask first.

## Naming

New tabs are called "Terminal N", where N is the smallest number not in use: closing a tab in the middle leaves a gap that the next new tab fills, and closing everything starts over at 1, so the numbers never keep growing. Startup program tabs use their name from the settings and don't take a number.

## Rules

- Tab names use mono 12px; other text uses `ui`.
- `surface` background, with a 1px `line` divider on the right.
- A long tab list scrolls; the menu at the bottom stays put.
