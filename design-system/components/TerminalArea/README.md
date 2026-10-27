# TerminalArea

The terminal that fills the wallpaper, one per tab. This component is a demo with the same look; the real desktop uses xterm.js with the same tokens.

## Usage

```js
const term = TerminalDesktop.TerminalArea({
  active: true,
  lines: ['On branch main', { text: '✓ 42 tests passed', tone: 'ok' }],
  onCommand: (cmd) => myShell.run(cmd)
});
stage.appendChild(term); // .td-stage
```

- Put it in `.td-stage`, the second column of `.td-desk`, filling the area; `.td-corner` sits on top in the top-right corner.
- The preview's commands come from a tiny demo shell (`help`, `date`, `echo`, `clear`).
- Each line can have a `tone`: `out` (default, `ink`), `cmd`, `muted` (`ink-muted`), `ok` (`phosphor`), `warn`, `error`.

## Mapping to xterm.js

| xterm option | Token |
| --- | --- |
| background | `desk` |
| foreground, white | `ink` |
| cursor, green | `phosphor` |
| blue, selection | `focus` |
| yellow | `warn` |
| red | `error` |
| brightBlack | `ink-muted` |

Font `mono` 14px. When it loses focus, xterm draws the cursor as a hollow box, matching this component's inactive state.

## Right-click menu and shortcuts

Right-click inside the terminal: Copy (greyed out with no selection), Paste, Select all; Clear; Larger / Smaller / Reset text size (9–28px, all tabs together); Rename tab, New tab, Switch to desktop.

Shortcuts follow Windows Terminal's defaults: `Ctrl + C` copies when text is selected and otherwise interrupts, `Ctrl + V` pastes, `Ctrl + Shift + C / V` copy and paste, `Ctrl + Shift + A` selects all, `Ctrl + Shift + T / W` open and close tabs, `Ctrl + Tab` and `Ctrl + Alt + 1…9` switch tabs, `Ctrl + = / - / 0` and `Ctrl` + wheel change the text size, and `Ctrl + Shift + ↑ ↓ PgUp PgDn Home End` scroll. Every other key goes to the shell.

## States

- **Active:** `phosphor` prompt and solid cursor; the cursor blinks (not with reduce motion).
- **Inactive:** `ink-muted` prompt, hollow cursor.

## Rules

- `space-6` padding left and right, `space-4` top and bottom; no rounded corners, no border, always a `desk` background.
- Coming back from the desktop with the shortcut puts the focus back in the tab you left.
