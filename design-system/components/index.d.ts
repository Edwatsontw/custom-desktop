// Terminal Desktop components. Plain DOM functions on window.TerminalDesktop:
// each takes props and returns an HTMLElement you append yourself.

export type TerminalTone = 'out' | 'cmd' | 'muted' | 'ok' | 'warn' | 'error';
export type TerminalLine = string | { text: string; tone?: TerminalTone };

export interface TerminalAreaProps {
  /** Lines already on screen. */
  lines?: TerminalLine[];
  /** Prompt text. Default "PS C:\Users\me> ". */
  prompt?: string;
  /** Start with keyboard input going to the terminal (phosphor cursor). */
  active?: boolean;
  /** false = display only. Default true. */
  interactive?: boolean;
  /** Runs a typed command and returns lines to print. Default: a small demo shell. */
  onCommand?: (command: string) => TerminalLine[];
  label?: string;
}
/** Demo terminal with the system's look. A real desktop uses xterm.js themed with the same tokens. Returned element has setActive(active). */
export declare function TerminalArea(props?: TerminalAreaProps): HTMLElement;

export interface TerminalTab {
  id: string;
  label: string;
  /** The tab on screen. */
  active?: boolean;
  /** Unseen output in a background tab. */
  activity?: boolean;
  /** Its shell has ended. */
  exited?: boolean;
}

export interface TabSidebarProps {
  tabs?: TerminalTab[];
  /** Heading above the list. Default "Terminals". */
  title?: string;
  /** Shown in the footer. Default "Ctrl + Alt + Z". */
  shortcutLabel?: string;
  /** With any of these callbacks the host owns the tab state and calls update(); without them the sidebar manages its own state. */
  onSelect?: (id: string) => void;
  onNew?: () => void;
  onClose?: (id: string) => void;
  onRename?: (id: string, label: string) => void;
  /** "▸ Menu" clicked; anchor is the button's rectangle. */
  onMenu?: (anchor: DOMRect) => void;
  /** A tab was right-clicked at (x, y) in page coordinates; show your tab menu there. */
  onContextMenu?: (id: string, x: number, y: number) => void;
}
/** Left sidebar of terminal tabs. Double-click or F2 renames; middle-click closes. Returned element has update(tabs) and startRename(id). */
export declare function TabSidebar(props?: TabSidebarProps): HTMLElement;

export interface MiniDesktopProps {
  /** Caption. Default "My desktop". */
  label?: string;
  /** Hover hint. Default "Click to enlarge"; the swapped-in mini terminal uses "Click to return". */
  hint?: string;
  /** Draw a stand-in desktop picture (previews only). */
  preview?: boolean;
  /** Clicked: the host swaps this picture and the full screen. */
  onOpen?: () => void;
  /** Allow dragging. A press that moves 5px or more drags instead of clicking. */
  draggable?: boolean;
  onDragStart?: () => void;
  /** Screen-pixel offset since the press. When given, the host moves things itself (e.g. its window); otherwise the element moves inside its positioned parent. */
  onDrag?: (dx: number, dy: number) => void;
  onDragEnd?: (dx: number, dy: number) => void;
}
/**
 * Picture-in-picture in the top right: the original desktop in terminal mode, the terminal in desktop mode.
 * Returned element has setMedia(node) for a live <video>/<canvas>/<img>/<div>, setLabel(text), setUnavailable(message)
 * and place(x, y) to position it inside its parent.
 */
export declare function MiniDesktop(props?: MiniDesktopProps): HTMLElement;

export interface EdgeStripProps {
  tabs?: TerminalTab[];
  shortcutLabel?: string;
  /** Start expanded. */
  expanded?: boolean;
  /** Hover opened or closed the panel (a host window may resize to match: 8px ↔ 220px). */
  onExpand?: (expanded: boolean) => void;
  /** A tab was picked: the host returns to the terminal on that tab. */
  onSelect?: (id: string) => void;
}
/** 8px strip on the left screen edge while the original desktop is full screen; hover expands it into the tab list. Returned element has update(tabs) and setExpanded(v). */
export declare function EdgeStrip(props?: EdgeStripProps): HTMLElement;

export interface ClockWidgetProps {
  seconds?: boolean;
  date?: boolean;
  /** Single-line small clock. */
  compact?: boolean;
  /** Fixed time for screenshots; omit for the live time. */
  now?: string | number | Date;
}
export declare function ClockWidget(props?: ClockWidgetProps): HTMLElement;
