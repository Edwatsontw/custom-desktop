// Custom Desktop — main process.
// Terminal mode: one full-screen window (tabs + terminal + live mini desktop, top right).
// Desktop mode: that window hides, and a thin always-on-top strip on the left edge lists the tabs.

const { app, BrowserWindow, globalShortcut, ipcMain, Menu, screen, desktopCapturer, session, clipboard, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const pty = require('@lydell/node-pty');

const STRIP_COLLAPSED = 8;
const STRIP_EXPANDED = 220;

const CONFIG_DEFAULTS = {
  shell: 'powershell.exe',
  shellArgs: ['-NoLogo'],
  returnShortcut: 'Control+Alt+Z',
  returnShortcutLabel: 'Ctrl + Alt + Z',
  miniDesktopFps: 10,
  startupTabs: [],
  apps: []
};

function loadConfig() {
  try {
    // DESK_CONFIG points at another config file (used for testing without the real startup programs).
    const raw = fs.readFileSync(process.env.DESK_CONFIG || path.join(__dirname, 'config.json'), 'utf8');
    // Notepad may save with a byte-order mark; JSON.parse rejects it.
    return { ...CONFIG_DEFAULTS, ...JSON.parse(raw.replace(/^﻿/, '')) };
  } catch (err) {
    console.error('Could not read config.json, using defaults:', err.message);
    return { ...CONFIG_DEFAULTS };
  }
}

const config = loadConfig();
let mainWin = null;
let stripWin = null;
let pipWin = null; // live mini terminal, top right, while the desktop is full screen
let pipTabId = null;
let mode = 'terminal';
let tabs = [];
const shells = new Map();

// DESK_PROFILE: run a separate copy with its own settings (for testing while the real one is open).
if (process.env.DESK_PROFILE) app.setPath('userData', process.env.DESK_PROFILE);

// A second launch just brings the running one back to the terminal (see 'second-instance').
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

const webPreferences = {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true
};

function workArea() {
  return screen.getPrimaryDisplay().workArea;
}

/* ---------- Shells (one per tab) ---------- */

// A plain tab runs the configured shell. A startup tab (config.startupTabs) runs its batch file
// through cmd.exe in that file's folder, like double-clicking it.
function startupSpec(index) {
  const s = (config.startupTabs || [])[index];
  if (!s || !s.command) return null;
  return { command: s.command, cwd: s.cwd || path.dirname(s.command) };
}

// Files that can be opened as a tab (double-click / "open with" / launcher): batch files.
const RUNNABLE = /\.(bat|cmd)$/i;
function fileSpec(file) {
  const full = path.resolve(String(file || ''));
  if (!RUNNABLE.test(full) || !fs.existsSync(full)) return null;
  return { command: full, cwd: path.dirname(full) };
}

// What a tab runs: null = the normal shell, a number = config.startupTabs[n], { file } = a batch file.
function specFor(source) {
  if (source == null) return null;
  if (typeof source === 'number') return startupSpec(source);
  if (typeof source === 'object' && source.file) return fileSpec(source.file);
  return null;
}

function createShell(id, cols, rows, source) {
  if (shells.has(id)) return;
  const spec = specFor(source);
  const file = spec ? 'cmd.exe' : config.shell;
  const args = spec ? '/c "' + spec.command + '"' : config.shellArgs;
  const cwd = spec && fs.existsSync(spec.cwd) ? spec.cwd : os.homedir();
  const proc = pty.spawn(file, args, {
    name: 'xterm-256color',
    cols: cols || 100,
    rows: rows || 30,
    cwd,
    env: process.env
  });
  shells.set(id, proc);
  proc.onData((data) => {
    if (shells.get(id) !== proc) return;
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('pty:data', id, data);
    if (mode === 'desktop' && id === pipTabId && pipWin && !pipWin.isDestroyed()) pipWin.webContents.send('pip:data', data);
  });
  proc.onExit(({ exitCode }) => {
    if (shells.get(id) !== proc) return; // closed or replaced on purpose
    shells.delete(id);
    if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send('pty:exit', id, exitCode);
  });
}

function killShell(id) {
  const proc = shells.get(id);
  if (!proc) return;
  shells.delete(id);
  try { proc.kill(); } catch (e) { /* already gone */ }
}

/* ---------- Windows ---------- */

function createMainWindow() {
  mainWin = new BrowserWindow({
    ...workArea(),
    frame: false,
    backgroundColor: '#0b0f14',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    show: false,
    title: 'Custom Desktop',
    // Keep the desktop video running while hidden, so swapping back starts from a current picture.
    webPreferences: { ...webPreferences, backgroundThrottling: false }
  });
  // Keep this window out of screen captures, so the mini desktop shows what is behind it.
  mainWin.setContentProtection(true);
  mainWin.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWin.once('ready-to-show', () => { mainWin.show(); mainWin.focus(); });
  mainWin.on('closed', () => { mainWin = null; app.quit(); });
}

function createStripWindow() {
  const wa = workArea();
  stripWin = new BrowserWindow({
    x: wa.x,
    y: wa.y,
    width: STRIP_COLLAPSED,
    height: wa.height,
    frame: false,
    // A tool window can be narrower than Windows' usual ~32px minimum, and stays out of Alt+Tab.
    type: 'toolbar',
    thickFrame: false,
    backgroundColor: '#141a22',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    title: 'Custom Desktop tabs',
    webPreferences
  });
  stripWin.setAlwaysOnTop(true, 'screen-saver');
  stripWin.setContentProtection(true);
  stripWin.loadFile(path.join(__dirname, 'renderer', 'strip.html'));
}

function createPipWindow() {
  pipWin = new BrowserWindow({
    width: 256,
    height: 160,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    type: 'toolbar',
    thickFrame: false,
    focusable: false,
    show: false,
    title: 'Custom Desktop terminal',
    webPreferences
  });
  pipWin.setAlwaysOnTop(true, 'screen-saver');
  pipWin.setContentProtection(true);
  pipWin.loadFile(path.join(__dirname, 'renderer', 'pip.html'));
}

function setStripExpanded(open) {
  if (!stripWin) return;
  const wa = workArea();
  stripWin.setBounds({ x: wa.x, y: wa.y, width: open ? STRIP_EXPANDED : STRIP_COLLAPSED, height: wa.height });
}

// Any display change — resolution, DPI scaling, taskbar moved or auto-hidden, a monitor added or
// removed, a new main monitor: refit every window to the main monitor's work area, then let the
// page lay itself out again (it also re-sends where the mini terminal belongs).
let fitTimer = null;
function fitToScreen() {
  clearTimeout(fitTimer);
  // Windows sends several events in a row while a change settles; act once it's quiet.
  fitTimer = setTimeout(() => {
    const wa = workArea();
    if (mainWin) mainWin.setBounds(wa);
    if (stripWin) setStripExpanded(false);
    if (pipWin) {
      // Keep it on screen until the page sends its new spot.
      const b = pipWin.getBounds();
      pipWin.setBounds({
        x: Math.max(wa.x, Math.min(b.x, wa.x + wa.width - b.width)),
        y: Math.max(wa.y, Math.min(b.y, wa.y + wa.height - b.height)),
        width: b.width,
        height: b.height
      });
    }
    if (mainWin) mainWin.webContents.send('desk:display-changed');
  }, 150);
}

// Put the mini terminal at rect (page coordinates = work-area coordinates) and (re)draw it.
function placePip(swap) {
  const wa = workArea();
  pipWin.setBounds({
    x: Math.round(wa.x + swap.rect.x),
    y: Math.round(wa.y + swap.rect.y),
    width: Math.round(swap.rect.w),
    height: Math.round(swap.rect.h)
  });
  pipWin.webContents.send('pip:init', swap);
}

/* ---------- Modes ---------- */

// The page has already animated the swap: its last frame is the desktop full screen with the
// terminal shrunk into the corner. Put the live mini terminal exactly there, then hide the page.
function enterDesktop(swap) {
  if (mode === 'desktop' || !mainWin) return;
  mode = 'desktop';
  pipTabId = swap && swap.tabId;
  setStripExpanded(false);

  const finish = () => {
    if (mode !== 'desktop') return;
    if (pipWin && swap) pipWin.showInactive();
    stripWin.showInactive();
    mainWin.hide();
  };
  if (!pipWin || !swap) return finish();

  let done = false;
  const ready = () => { if (!done) { done = true; finish(); } };
  ipcMain.once('pip:ready', ready);
  setTimeout(ready, 400);
  placePip(swap);
}

// Windows often refuses to bring a background app forward (it just flashes the taskbar button).
// Briefly making the window topmost puts it above everything, then it goes back to normal so
// other windows can be opened over it again.
function bringToFront(win) {
  if (win.isMinimized()) win.restore();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.show();
  win.moveTop();
  win.focus();
  setTimeout(() => { if (!win.isDestroyed()) win.setAlwaysOnTop(false); }, 200);
}

// instant: skip the swap animation (the shortcut wants the terminal right now).
function returnToTerminal(tabId, opts) {
  if (!mainWin) return;
  const instant = !!(opts && opts.instant);
  const fromDesktop = mode === 'desktop';
  mode = 'terminal';
  if (stripWin) stripWin.hide();
  bringToFront(mainWin);
  mainWin.webContents.send('desk:return', { tabId: tabId || null, swap: fromDesktop, instant });
  // The page shows the same picture as the mini terminal for a moment, so hide it just after.
  if (pipWin) setTimeout(() => { if (mode === 'terminal') pipWin.hide(); }, instant ? 0 : 60);
}

/* ---------- Menu and launchers ---------- */

function launch(command) {
  if (!command) return;
  const child = spawn('cmd.exe', ['/c', 'start', '""', command], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

function loginArgs() {
  return { path: process.execPath, args: [app.getAppPath()] };
}

function showMenu(x, y) {
  const login = app.getLoginItemSettings(loginArgs());
  const appItems = (config.apps || []).map((a) => ({ label: a.label, click: () => launch(a.command) }));
  const menu = Menu.buildFromTemplate([
    { label: 'New tab', accelerator: 'Ctrl+Shift+T', click: () => mainWin.webContents.send('tab:new') },
    { label: 'Restart this tab', click: () => mainWin.webContents.send('tab:restart') },
    { type: 'separator' },
    ...appItems,
    ...(appItems.length ? [{ type: 'separator' }] : []),
    {
      label: 'Start when Windows starts',
      type: 'checkbox',
      checked: login.openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, ...loginArgs() })
    },
    { label: 'Reload', click: () => mainWin.reload() },
    { label: 'Developer tools', click: () => mainWin.webContents.openDevTools({ mode: 'detach' }) },
    { type: 'separator' },
    { label: 'Quit Custom Desktop', click: () => app.quit() }
  ]);
  menu.popup({ window: mainWin, x: Math.round(x), y: Math.round(y) });
}

/* ---------- Screen capture for the mini desktop ---------- */

async function primaryScreenSource(thumbnailSize) {
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: thumbnailSize || { width: 0, height: 0 } });
  const id = String(screen.getPrimaryDisplay().id);
  return sources.find((s) => s.display_id === id) || sources[0];
}

/* ---------- IPC ---------- */

ipcMain.handle('desk:config', (e) => {
  // The terminal page (re)loading starts its tabs over: end shells left from before, so a reload
  // doesn't run the startup programs twice.
  if (mainWin && e.sender === mainWin.webContents) {
    for (const id of [...shells.keys()]) killShell(id);
  }
  return config;
});
ipcMain.on('pty:create', (_e, id, cols, rows, startupIndex) => createShell(id, cols, rows, startupIndex));
ipcMain.on('pty:write', (_e, id, data) => { const p = shells.get(id); if (p) p.write(data); });
ipcMain.on('pty:resize', (_e, id, cols, rows) => {
  const p = shells.get(id);
  if (p && cols > 1 && rows > 1) { try { p.resize(cols, rows); } catch (e) { /* exiting */ } }
});
ipcMain.on('pty:kill', (_e, id) => killShell(id));

ipcMain.on('tabs:update', (_e, next) => {
  tabs = next;
  if (stripWin && !stripWin.isDestroyed()) stripWin.webContents.send('tabs', tabs);
});
ipcMain.handle('tabs:get', () => tabs);

// Right-click menus: the page describes the items, this shows a native menu at (x, y)
// and answers with the id of the item picked (or null).
ipcMain.handle('menu:popup', (e, items, x, y) => new Promise((resolve) => {
  let chosen = null;
  const template = (items || []).map((it) => (it.type === 'separator'
    ? { type: 'separator' }
    : { label: it.label, accelerator: it.accelerator, enabled: it.enabled !== false, click: () => { chosen = it.id; } }));
  Menu.buildFromTemplate(template).popup({
    window: BrowserWindow.fromWebContents(e.sender),
    x: Math.round(x),
    y: Math.round(y),
    callback: () => setTimeout(() => resolve(chosen), 0)
  });
}));

ipcMain.handle('clipboard:read', () => clipboard.readText());
ipcMain.on('clipboard:write', (_e, text) => clipboard.writeText(String(text || '')));

ipcMain.handle('file:save-text', async (_e, suggestedName, text) => {
  const res = await dialog.showSaveDialog(mainWin, {
    title: 'Save terminal output',
    defaultPath: path.join(app.getPath('desktop'), suggestedName),
    filters: [{ name: 'Text file', extensions: ['txt'] }]
  });
  if (res.canceled || !res.filePath) return null;
  fs.writeFileSync(res.filePath, '﻿' + text, 'utf8');
  return res.filePath;
});

// Open a startup tab's folder in File Explorer.
ipcMain.on('tab:open-folder', (_e, startupIndex) => {
  const spec = specFor(startupIndex);
  shell.openPath(spec ? spec.cwd : os.homedir());
});

ipcMain.on('desk:enter-desktop', (_e, swap) => enterDesktop(swap));
ipcMain.on('pip:select', () => returnToTerminal(pipTabId));
// After a display change in desktop mode the page works out the mini terminal's new size and spot.
ipcMain.on('pip:relayout', (_e, swap) => {
  if (mode === 'desktop' && pipWin && swap) placePip(swap);
});

// Dragging the mini terminal moves its window; the spot is kept inside the work area.
let pipDragStart = null;
ipcMain.on('pip:drag-start', () => { if (pipWin) pipDragStart = pipWin.getBounds(); });
ipcMain.on('pip:drag', (_e, dx, dy) => {
  if (!pipWin || !pipDragStart) return;
  const wa = workArea();
  const b = pipDragStart;
  const x = Math.max(wa.x, Math.min(b.x + Math.round(dx), wa.x + wa.width - b.width));
  const y = Math.max(wa.y, Math.min(b.y + Math.round(dy), wa.y + wa.height - b.height));
  pipWin.setBounds({ x, y, width: b.width, height: b.height });
});
ipcMain.on('pip:drag-end', () => {
  pipDragStart = null;
  if (!pipWin || !mainWin) return;
  const wa = workArea();
  const b = pipWin.getBounds();
  mainWin.webContents.send('pip:moved', { x: b.x - wa.x, y: b.y - wa.y });
});
ipcMain.on('desk:menu', (_e, x, y) => showMenu(x, y));
ipcMain.on('strip:expand', (_e, open) => setStripExpanded(!!open));
ipcMain.on('strip:select', (_e, id) => returnToTerminal(id));
ipcMain.handle('capture:thumb', async () => {
  const s = await primaryScreenSource({ width: 512, height: 288 });
  return s ? s.thumbnail.toDataURL() : null;
});

/* ---------- App ---------- */

app.whenReady().then(() => {
  if (!gotLock) return;
  // One-off: turn on "start at login" and quit (used to set it up without opening the desktop).
  if (process.argv.includes('--enable-autostart')) {
    app.setLoginItemSettings({ openAtLogin: true, ...loginArgs() });
    console.log('autostart', app.getLoginItemSettings(loginArgs()).openAtLogin);
    app.quit();
    return;
  }
  // getDisplayMedia() in the page gets the primary screen without a picker.
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, callback) => {
    try {
      const source = await primaryScreenSource();
      callback(source ? { video: source } : {});
    } catch (err) {
      console.error('Screen capture failed:', err.message);
      callback({});
    }
  });

  createMainWindow();
  createStripWindow();
  createPipWindow();
  screen.on('display-metrics-changed', fitToScreen);
  screen.on('display-added', fitToScreen);
  screen.on('display-removed', fitToScreen);

  if (!globalShortcut.register(config.returnShortcut, () => returnToTerminal(null, { instant: true }))) {
    console.error('Could not register the shortcut ' + config.returnShortcut + '; another program may be using it.');
  }});

/* ---------- Opening batch files in a tab ---------- */

// Launching the app with a .bat/.cmd path (e.g. Open in Custom Desktop.vbs, or a file association) opens it
// as a new tab and brings the terminal forward. If the app is already running, Windows starts a
// second copy, which hands its arguments to this one through 'second-instance' and exits.
let pageReady = false;
let pendingFiles = [];

function filesFromArgv(argv) {
  return (argv || []).slice(1).filter((a) => RUNNABLE.test(a) && fs.existsSync(a)).map((a) => path.resolve(a));
}

function openFiles(files) {
  if (!files.length) return;
  if (!pageReady || !mainWin) { pendingFiles.push(...files); return; }
  returnToTerminal();
  files.forEach((f) => mainWin.webContents.send('tab:open-file', f));
}

// The page asks once it is set up; files given before that wait here.
ipcMain.handle('tab:take-pending-files', (e) => {
  if (mainWin && e.sender === mainWin.webContents) pageReady = true;
  const files = pendingFiles;
  pendingFiles = [];
  return files;
});

pendingFiles.push(...filesFromArgv(process.argv));

app.on('second-instance', (_e, argv) => {
  const files = filesFromArgv(argv);
  if (files.length) openFiles(files);
  else returnToTerminal();
});
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  for (const id of [...shells.keys()]) killShell(id);
});
app.on('window-all-closed', () => app.quit());
