# Terminal Desktop

The terminal is the wallpaper: you can see it, and type into it.

Terminal Desktop is a design system for a custom desktop. A terminal fills the whole wallpaper, with terminal tabs on the left. The real desktop shrinks to a live mini view in the top-right corner; click it to bring the desktop back full screen, and press a shortcut to shrink it again. It has one dark theme, 10 colors, 6 text styles, 4 spacing steps, 3 corner radii, and 5 components (see "Components" at the end).

## Core idea: two modes

### Terminal mode (normal)

| Area | Component | Notes |
| --- | --- | --- |
| Left, 200px | `TabSidebar` | Terminal tabs, new tab, menu |
| Everything else | `TerminalArea` | The current tab's terminal, filling the wallpaper |
| Top right | `MiniDesktop` | Live mini view of the real desktop (256 × 144) |
| Below the mini view | `ClockWidget` | Clock |

### Desktop mode (after clicking the mini view)

| Area | Component | Notes |
| --- | --- | --- |
| Full screen | The system's own desktop | Wallpaper, icons and windows work as usual, with nothing laid over them |
| Top right | `MiniDesktop` (shows the tab name and the hint "Click to return") | The terminal you just left, as a live mini view |
| Left edge, 8px | `EdgeStrip` | Collapsed tabs; opens when the mouse moves onto it |

### Switching rules

- **Click the mini view → the two views swap.** Like a video that shrinks into the corner when it ends: the desktop grows from the top-right corner to full screen while the terminal shrinks and flies into the corner, becoming the mini terminal.
- **Click the mini terminal, or press `Ctrl + Alt + Z` → swap back.** The animation plays in reverse and you're back in the same tab, with the keyboard focus in the terminal. The shortcut works from any program.
- **Click a tab on the left strip → swap back and switch to that tab.**
- **Fits any resolution, any time.** Resolution, Windows scaling, taskbar position or auto-hide, monitors added or removed, a new main monitor: in either mode, even mid-swap, every view refits the main screen's work area. The terminal reflows, the mini view moves back on screen, and the desktop is captured again.
- **The mini view stays put.** The desktop mini view and the mini terminal are one small window: swapping doesn't move it, dragging either one moves the shared spot, and the swap animation starts and ends there.
- **Startup programs run in tabs.** Programs to start at boot (a server, a monitoring script) each get a tab, listed first in the sidebar and running in the background. Closing a running startup tab asks first.
- **Swap animation:** 320ms, `cubic-bezier(0.2, 0, 0, 1)` (fast, then slow). The growing and shrinking views move together while the sidebar and corner widgets fade out / in. The view shrinking into the corner gets `radius-md` corners. With "reduce motion" on, the swap is instant.
- **Switching never stops a terminal.** In desktop mode every tab keeps running in the background; a tab with new output shows a blue mark on the strip.
- **Other programs' windows** can be opened in both modes; in terminal mode they float above the terminal.

## Content rules

- Interface text is short and direct and starts with a verb: "New tab", "Click to enlarge", never "Click here to…".
- Commands, paths, file names and tab names always use the `mono` font; other interface text uses `sans`.
- Times use the 24-hour clock (`14:05`); dates look like `2026-10-26`.
- No emoji as icons.

## Visual foundations

- **Color:** mostly the dark `desk` and `surface`; color only shows state. `phosphor` is the one brand color and also means "active"; `focus` is keyboard focus and "new output"; `warn` and `error` appear only for those states. Main text is `ink`, secondary text `ink-muted`; both pass 4.5:1 on `desk` and `surface`.
- **Tab states:** active is a solid `phosphor` dot, new output a solid `focus` dot, idle a hollow `ink-muted` dot, exited a dashed `ink-muted` dot. The sidebar and the strip use the same set.
- **Type:** terminal content uses `terminal` (14/20 mono); tab names and shortcuts use mono 12px. Interface headings use `title`, normal interface text `ui`, notes `caption`. The big clock uses `clock`.
- **Spacing:** a 4px grid. `space-1` between an icon and its text, `space-2` between items, `space-4` for panel padding, `space-6` for distance from the screen edge.
- **Corners:** buttons and tabs `radius-sm`, the mini view and clock `radius-md`, large floating panels `radius-lg`. The terminal itself has no rounded corners and sits flush with the screen.
- **Borders, not shadows:** panels are layered with a 1px `line` border, never big shadows.

## Icons

There is no icon set or logo yet. When a symbol is needed, use mono characters (`+`, `×`, `▸`) or plain text labels, colored by state tokens. If icons are added later, use 1.5px strokes on a 16px grid.

## Components

Components are plain DOM functions on `window.TerminalDesktop`: pass options, get back an element, and put it on the page yourself. Styles are in `components/bundle.css`; every class starts with `td-`.

| Component | Mode | Purpose |
| --- | --- | --- |
| `TabSidebar` | Terminal | Left tab bar: switch, add, rename, close, menu |
| `TerminalArea` | Terminal | A demo terminal with the system's look; the real desktop uses xterm.js with the same tokens |
| `MiniDesktop` | Both | The live mini view in the top right: the desktop in terminal mode, the terminal in desktop mode; click to swap |
| `ClockWidget` | Terminal | Clock |
| `EdgeStrip` | Desktop | Thin left-edge strip that opens into the tab list |

Page skeleton:

```html
<div class="td-desk">
  <!-- TabSidebar -->
  <div class="td-stage">
    <!-- TerminalArea (or xterm.js) -->
    <div class="td-corner"><!-- MiniDesktop, ClockWidget --></div>
  </div>
</div>
```

When this runs on Windows, the desktop app is responsible for: running several real terminal processes, capturing the desktop for the mini view (leaving the terminal window itself out of the capture), making the strip and the mini terminal separate always-on-top windows in desktop mode, and registering the global shortcut. The swap animation's last frame must match desktop mode exactly (full-screen desktop plus the terminal in the corner) before the windows switch, so nothing flickers.
