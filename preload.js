const { contextBridge, ipcRenderer } = require('electron');

function on(channel, fn) {
  ipcRenderer.on(channel, (_e, ...args) => fn(...args));
}

contextBridge.exposeInMainWorld('desk', {
  config: () => ipcRenderer.invoke('desk:config'),

  // Shells, one per tab
  ptyCreate: (id, cols, rows, startupIndex) => ipcRenderer.send('pty:create', id, cols, rows, startupIndex),
  ptyWrite: (id, data) => ipcRenderer.send('pty:write', id, data),
  ptyResize: (id, cols, rows) => ipcRenderer.send('pty:resize', id, cols, rows),
  ptyKill: (id) => ipcRenderer.send('pty:kill', id),
  onPtyData: (fn) => on('pty:data', fn),
  onPtyExit: (fn) => on('pty:exit', fn),

  // Tabs shared with the edge strip
  tabsUpdate: (tabs) => ipcRenderer.send('tabs:update', tabs),
  tabsGet: () => ipcRenderer.invoke('tabs:get'),
  onTabs: (fn) => on('tabs', fn),
  onTabNew: (fn) => on('tab:new', fn),
  onTabRestart: (fn) => on('tab:restart', fn),

  // Modes
  enterDesktop: (swap) => ipcRenderer.send('desk:enter-desktop', swap),

  // Mini terminal (top right while the desktop is full screen)
  onPipInit: (fn) => on('pip:init', fn),
  onPipData: (fn) => on('pip:data', fn),
  pipReady: () => ipcRenderer.send('pip:ready'),
  pipSelect: () => ipcRenderer.send('pip:select'),
  pipDragStart: () => ipcRenderer.send('pip:drag-start'),
  pipDrag: (dx, dy) => ipcRenderer.send('pip:drag', dx, dy),
  pipDragEnd: () => ipcRenderer.send('pip:drag-end'),
  onPipMoved: (fn) => on('pip:moved', fn),
  pipRelayout: (swap) => ipcRenderer.send('pip:relayout', swap),
  onDisplayChanged: (fn) => on('desk:display-changed', fn),
  onMode: (fn) => on('desk:mode', fn),
  onReturn: (fn) => on('desk:return', fn),
  menu: (x, y) => ipcRenderer.send('desk:menu', x, y),
  popupMenu: (items, x, y) => ipcRenderer.invoke('menu:popup', items, x, y),
  clipboardRead: () => ipcRenderer.invoke('clipboard:read'),
  clipboardWrite: (text) => ipcRenderer.send('clipboard:write', text),
  saveText: (name, text) => ipcRenderer.invoke('file:save-text', name, text),
  openTabFolder: (startupIndex) => ipcRenderer.send('tab:open-folder', startupIndex),

  // Edge strip
  stripExpand: (open) => ipcRenderer.send('strip:expand', open),
  stripSelect: (id) => ipcRenderer.send('strip:select', id),

  // Mini desktop fallback (still frames)
  captureThumb: () => ipcRenderer.invoke('capture:thumb')
});
