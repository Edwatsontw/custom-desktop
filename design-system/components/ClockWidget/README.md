# ClockWidget

A clock floating in the terminal's top-right corner, below the mini view: the time in large type plus a line with the date.

## Usage

```js
corner.appendChild(TerminalDesktop.ClockWidget());            // big clock
corner.appendChild(TerminalDesktop.ClockWidget({ compact: true, date: false })); // small one-line clock
// Fixed time for screenshots: ClockWidget({ now: '2026-10-26T14:05:00' })
```

- Put it in `.td-corner`, below `MiniDesktop`, `space-4` apart.
- When the terminal area is narrow (under 600px), hide it or use `compact`.

## Rules

- The time uses the `clock` style (48/52, 600, tabular figures), 24-hour clock.
- The date is mono 12px, `ink-muted`, formatted `2026-10-26 Mon`.
- `surface-glass` background with a backdrop blur, `line` border, `radius-md` corners, `space-4` padding.
- Updates once a second; no animation.
