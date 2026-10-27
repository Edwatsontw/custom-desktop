# MiniDesktop

The live mini view in the top-right corner (picture in picture): it shows the real desktop in terminal mode and the terminal in desktop mode. Click it and the two views swap.

## Usage

```js
// Terminal mode: the desktop mini view
const mini = TerminalDesktop.MiniDesktop({ onOpen: () => swapToDesktop() });
corner.appendChild(mini);            // .td-corner: top right of the terminal area
mini.setMedia(videoElement);         // live picture of the desktop
mini.setUnavailable("Can't capture the screen"); // when capture fails

// Desktop mode: the mini terminal
const back = TerminalDesktop.MiniDesktop({ label: 'dev', hint: 'Click to return', onOpen: () => swapToTerminal() });
back.setMedia(scaledTerminal);       // scaled-down picture of the terminal
back.setLabel('build');              // update the name when the tab changes
```

- Put it in `.td-corner` inside `.td-stage`, `space-6` from the right and `space-4` from the top.
- The desktop mini view is 256 × 144 (16:9); the mini terminal is 256 wide with the terminal area's proportions. `radius-md` corners, `line` border.
- You supply the live picture; `preview: true` only draws a sketch. Leave the terminal window out of the desktop capture, or the mini view shows itself.

## Swap animation

When the mini view is clicked, both views move at once:

1. The mini view's content (the desktop) grows from the top-right corner to full screen.
2. The full-screen content (the terminal) shrinks in proportion and flies into the corner, its corners becoming `radius-md`.
3. The sidebar and corner widgets fade out.
4. When the animation ends, the corner shows a `line` border and the tab name: it is now the other mode's mini view.

320ms, `cubic-bezier(0.2, 0, 0, 1)`; swapping back plays it in reverse. With "reduce motion" on, the swap is instant.

## Interaction

- Hover: the border brightens and a hint appears at the bottom right (`phosphor`): "Click to enlarge" or "Click to return".
- Click or `Enter`: swap.
- **Drag** (`draggable: true`): moving more than 5px while pressed starts a drag, and letting go doesn't count as a click. While dragging the border turns `focus` and the hint hides.
  - Without `onDrag`: the component moves itself inside its parent and can't leave it.
  - With `onDrag(dx, dy)`: you move something else, such as a whole small window.
  - **The two mini views share one spot**: they are the same "small window" with different content. Swapping leaves the small window where it is: the desktop grows out of its spot, and the terminal shrinks into the same spot at the same width. Drag either one and the other appears there next time. The spot is remembered as the distance from the top-right corner, so it follows that corner when the screen size changes. The small window can sit anywhere on screen, over the sidebar too.
- Keyboard focus: a `focus` border.

## Rules

- A name is always shown at the bottom left: "My desktop" for the desktop mini view, the tab name for the mini terminal. `surface-glass` background.
- The mini view itself has no shadow.
- **Sized by the screen:** about 13.4% of the screen width (about 256px on a 1920px-wide screen), at least 192px and at most 384px, always 16:9. The mini terminal is the same width, with the terminal area's proportions.
- **Always on screen:** when the resolution, scaling or taskbar position changes, or a monitor is added or removed, the small window is placed again by its distance from the top-right corner and kept on screen. This also happens in desktop mode: the mini terminal changes size and spot with it, and the swap back starts from the new spot.
