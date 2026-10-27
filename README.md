# Custom Desktop

A terminal that fills your whole wallpaper, with its tabs down the left side. Your real desktop shrinks to a live mini view in the top-right corner; click it to bring the desktop back full screen. Built with the Terminal Desktop design system in `design-system/`.

## Install and start

```
npm install
```

Then double-click **Start Custom Desktop.vbs**, or run this in the folder:

```
npm start
```

## Using it

| Action | Result |
| --- | --- |
| "+ New tab" on the left, or `Ctrl + Shift + T` | Open a new terminal tab |
| Click a tab, or `Ctrl + Tab` | Switch tabs |
| Double-click a tab name | Rename it |
| `×` on a tab, middle-click, or `Ctrl + Shift + W` | Close the tab |
| Click the "My desktop" mini view (top right) | The desktop grows to full screen and the terminal shrinks into the corner (swap animation) |
| Click the mini terminal in the corner | Swap back to the terminal |
| Drag the mini view | Move it anywhere. It stays in place when you swap (the desktop and terminal mini views share one spot) |
| Move the mouse to the thin strip on the far left | Open the tab list; click a tab to go straight back to it |
| `Ctrl + Alt + Z` | From anywhere, bring the terminal to the front at once (no animation, above other windows) |
| "▸ Menu" at the bottom left | App shortcuts, start with Windows, restart a tab, quit |

- A new tab takes the smallest number not in use: close `Terminal 2` and the next new tab is `Terminal 2` again; close them all and it starts over at `Terminal 1`.
- A background tab with new output gets a blue dot. In desktop mode you can also see a blue mark on the left strip.

## Right-click menus

**Right-click a tab on the left:** rename, restart (startup tabs: run again), clear, copy all output, save output as a text file (to the desktop by default), open folder in File Explorer (startup tabs), move up / down, close tab, close other plain tabs (startup tabs are never closed this way).

**Right-click inside the terminal:** copy, paste, select all, clear, larger / smaller / reset text size, rename tab, new tab, switch to desktop.

## Shortcuts inside the terminal

The same defaults as Windows Terminal:

| Shortcut | Action |
| --- | --- |
| `Ctrl + C` | Copy when text is selected; otherwise it interrupts the running command, as usual |
| `Ctrl + V` | Paste |
| `Ctrl + Shift + C` / `Ctrl + Shift + V` | Copy / paste |
| `Ctrl + Insert` / `Shift + Insert` | Copy / paste |
| `Ctrl + Shift + A` | Select all |
| `Ctrl + Shift + T` / `Ctrl + Shift + D` | New tab |
| `Ctrl + Shift + W` | Close tab |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Next / previous tab |
| `Ctrl + Alt + 1` … `9` | Go to tab 1 … 9 |
| `Ctrl + =` / `Ctrl + -` / `Ctrl + 0`, or `Ctrl` + mouse wheel | Larger / smaller / reset text size (all tabs, remembered) |
| `Ctrl + Shift + ↑` / `↓` | Scroll one line |
| `Ctrl + Shift + PgUp` / `PgDn` | Scroll one page |
| `Ctrl + Shift + Home` / `End` | Scroll to the top / bottom |

Every other key goes straight to the shell.

- When PowerShell in a tab exits, press `Enter` to start it again.
- Tab names are remembered when you reopen the app, but each tab starts a new PowerShell.

## Startup programs

Programs listed in `startupTabs` in `config.json` each get their own tab every time Custom Desktop opens. They're listed first and run in the background.

`config.json` holds your own computer's settings and is not uploaded to Git. The first time, copy `config.example.json` to `config.json` and edit it.

- Closing a startup tab that is still running asks first, because it stops the program in it.
- When the program ends, press `Enter` in the tab to run the same file again.
- If a program used to start from the Windows Startup folder, move that shortcut out after adding it to `startupTabs`, or it runs twice.

## Settings

Edit `config.json`, save, then quit from "▸ Menu → Quit Custom Desktop" and start it again:

- `shell` / `shellArgs`: the shell to use, for example `"pwsh.exe"` for PowerShell 7.
- `returnShortcut`: the shortcut that brings the terminal back (Electron format, for example `"Control+Alt+Z"`; write the Windows key as `Super`, for example `"Control+Super+Z"`). `returnShortcutLabel` is the text shown on screen.
- `miniDesktopFps`: how many times a second the desktop mini view updates (default 10; drops to 2 in desktop mode). Lower it to save resources.
- `startupTabs`: startup program tabs, each `{ "label": "Name", "command": "full\\path\\to\\file.bat" }`. It runs in the file's folder; add `"cwd"` to use another folder.
- `apps`: app shortcuts in the menu. `command` can be a program name or a full path.

## Opening .bat / .cmd files in Custom Desktop

Double-clicking a `.bat` or `.cmd` runs it in a new Custom Desktop terminal tab (in the file's folder). If you're looking at the desktop, the terminal comes back. The tab is named after the file. When the program ends, press `Enter` in the tab to run it again; closing it while it runs asks first.

- **Turn on:** run `Open bat files in Custom Desktop.cmd`. It only changes settings for your Windows account and doesn't need admin rights.
- **Turn off:** run `Restore default bat opening.cmd`. Double-clicking goes back to the normal black Windows window.
- **Use the old way once:** right-click the file → "Run in a classic window" (on Windows 11, click "Show more options" first).
- **Without changing any settings:** drag a `.bat` onto `Open in Custom Desktop.vbs`.
- Extra arguments passed to the bat on double-click are not carried over; if it needs arguments, use "Run in a classic window".
- If you move the Custom Desktop folder, run the restore script first, then set it up again after the move, or double-clicking a bat won't find the app.

## Screen resolution

When the resolution, Windows scaling, taskbar position, or connected monitors change, Custom Desktop refits the main screen right away, in terminal mode or desktop mode. The mini view's size follows the screen width (192px to 384px) and always stays on screen.

## Known limits

- This is a full-screen window, not something built into the wallpaper. Other programs you open in terminal mode float above it; press `Ctrl + Alt + Z` to bring it back to the front.
- The mini view only captures the main screen.
- The left strip and the corner mini terminal are always on top, so they cover that small part of other windows.
- The mini terminal is the whole terminal area scaled down, so the text is tiny. It's mainly for seeing whether something is running or has new output.
