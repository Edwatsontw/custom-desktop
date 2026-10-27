# EdgeStrip

While the real desktop is full screen, an 8px strip sits on the screen's left edge. Move the mouse onto it and it opens into the tab list; click a tab to go straight back to that terminal.

## Usage

```js
const strip = TerminalDesktop.EdgeStrip({
  tabs,
  onSelect: (id) => backToTerminal(id),
  onExpand: (open) => resizeStripWindow(open ? 220 : 8)
});
strip.update(nextTabs);
```

- Shown only while the real desktop is full screen, always above other windows.
- Collapsed it is 8px wide: `surface` background, with one 2 × 16px mark per tab in the same color as the tab dot (active `phosphor`, new output `focus`, otherwise `ink-muted`). A background tab's new output shows as a blue mark even when collapsed.
- Open it is 220px wide: the tab list plus a hint at the bottom, "`Ctrl + Alt + Z` back to the terminal".

## Interaction

- Mouse or keyboard focus enters → it opens; 250ms after the mouse leaves → it collapses.
- Click a tab → back to the terminal, on that tab.
- When built as its own window, use `onExpand` to resize the window, so it takes only 8px when collapsed and doesn't block the desktop.

## Rules

- No icons, no shadow; the open panel has a 1px `line` on its right.
- Never open by itself; only when the user moves the mouse onto it.
