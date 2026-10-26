(async function () {
  'use strict';

  const TD = window.TerminalDesktop;
  const desk = window.desk;
  const config = await desk.config();

  const stage = document.getElementById('stage');
  const termsEl = document.getElementById('terms');
  const corner = document.getElementById('corner');

  const THEME = {
    background: '#0b0f14',
    foreground: '#d7e0ea',
    cursor: '#3ddc97',
    cursorAccent: '#0b0f14',
    selectionBackground: 'rgba(92, 200, 255, 0.35)',
    black: '#141a22', brightBlack: '#8b98a8',
    red: '#ff6b6b', brightRed: '#ff8a8a',
    green: '#3ddc97', brightGreen: '#6ee7b4',
    yellow: '#f5b041', brightYellow: '#f8c56e',
    blue: '#5cc8ff', brightBlue: '#8bd8ff',
    magenta: '#c49bff', brightMagenta: '#d6b8ff',
    cyan: '#4fd6d6', brightCyan: '#7fe3e3',
    white: '#d7e0ea', brightWhite: '#ffffff'
  };

  /* ---------- Tabs ---------- */

  const tabs = [];
  let counter = 0;
  let mode = 'terminal';

  function find(id) { return tabs.find((t) => t.id === id); }
  function active() { return tabs.find((t) => t.active); }

  function view() {
    return tabs.map((t) => ({ id: t.id, label: t.label, active: t.active, activity: t.activity, exited: t.exited }));
  }
  // Plain tabs are remembered by name; startup tabs come from config.json every time
  // (only a new name you give them is remembered).
  function save() {
    try {
      const plain = tabs.filter((t) => t.startupIndex == null);
      localStorage.setItem('tabs', JSON.stringify(plain.map((t) => t.label)));
      localStorage.setItem('activeIndex', String(plain.findIndex((t) => t.active)));
      const names = {};
      tabs.forEach((t) => { if (typeof t.startupIndex === 'number') names[t.startupIndex] = t.label; });
      localStorage.setItem('startupLabels', JSON.stringify(names));
    } catch (e) { /* not essential */ }
  }
  function sync() {
    const v = view();
    sidebar.update(v);
    desk.tabsUpdate(v);
    save();
  }

  function fitTab(t) {
    if (!t || !t.host.classList.contains('is-on')) return;
    if (t.host.clientWidth < 100 || t.host.clientHeight < 40) return;
    t.fit.fit();
    if (!t.exited) desk.ptyResize(t.id, t.term.cols, t.term.rows);
  }

  function startShell(t) {
    t.exited = false;
    desk.ptyCreate(t.id, t.term.cols, t.term.rows, t.startupIndex);
  }

  // New tabs take the smallest free number: closing everything starts over at 終端機 1,
  // and a gap left by a closed tab is filled first.
  function nextLabel() {
    const used = new Set();
    tabs.forEach((t) => { const m = /^終端機 (\d+)$/.exec(t.label); if (m) used.add(Number(m[1])); });
    let n = 1;
    while (used.has(n)) n += 1;
    return '終端機 ' + n;
  }

  let fontSize = Number(localStorage.getItem('fontSize')) || 14;
  function setFontSize(n) {
    fontSize = Math.max(9, Math.min(28, n));
    try { localStorage.setItem('fontSize', String(fontSize)); } catch (e) { /* not essential */ }
    tabs.forEach((t) => { t.term.options.fontSize = fontSize; });
    fitTab(active());
  }

  function createTab(label, makeActive, startupIndex) {
    counter += 1;
    const id = 't' + counter + '-' + Date.now().toString(36);
    const host = document.createElement('div');
    host.className = 'app-term';
    termsEl.appendChild(host);

    const term = new window.Terminal({
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      theme: THEME
    });
    const fit = new window.FitAddon.FitAddon();
    term.loadAddon(fit);
    const ser = new window.SerializeAddon.SerializeAddon();
    term.loadAddon(ser);
    term.open(host);

    const t = {
      id, label: label || nextLabel(), active: false, activity: false, exited: false,
      startupIndex: startupIndex == null ? null : startupIndex,
      term, fit, ser, host
    };
    tabs.push(t);

    term.onData((d) => {
      if (t.exited) {
        if (d === '\r') { term.write('\r\n'); startShell(t); sync(); }
        return;
      }
      desk.ptyWrite(id, d);
    });
    term.attachCustomKeyEventHandler(keyHandler);
    host.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      terminalMenu(t, e.clientX, e.clientY);
    });

    if (makeActive !== false) showTab(id);
    // The shell starts at the tab's real size once it has been laid out. A tab started in the
    // background borrows the visible tab's size, so its output isn't wrapped at 80 columns.
    requestAnimationFrame(() => {
      const a = active();
      if (a && a !== t && a.term.cols > 1) t.term.resize(a.term.cols, a.term.rows);
      fitTab(t);
      startShell(t);
    });
    return t;
  }

  function showTab(id) {
    const t = find(id);
    if (!t) return;
    tabs.forEach((x) => {
      x.active = x === t;
      x.host.classList.toggle('is-on', x === t);
    });
    t.activity = false;
    requestAnimationFrame(() => { fitTab(t); t.term.focus(); });
    sync();
  }

  function closeTab(id) {
    const i = tabs.findIndex((t) => t.id === id);
    if (i < 0) return;
    const t = tabs[i];
    if (t.startupIndex != null && !t.exited &&
        !window.confirm('關閉「' + t.label + '」會停止裡面正在執行的程式。確定要關閉嗎？')) return;
    desk.ptyKill(id);
    t.term.dispose();
    t.host.remove();
    tabs.splice(i, 1);
    if (!tabs.length) { createTab(); return; }
    if (t.active) showTab(tabs[Math.max(0, i - 1)].id);
    else sync();
  }

  function renameTab(id, label) {
    const t = find(id);
    if (t) { t.label = label; sync(); }
  }

  function restartTab(t) {
    if (!t) return;
    if (t.startupIndex != null && !t.exited &&
        !window.confirm('重新執行「' + t.label + '」會先停止正在執行的程式。確定嗎？')) return;
    desk.ptyKill(t.id);
    t.term.reset();
    startShell(t);
    sync();
  }

  function cycle(step) {
    const i = tabs.findIndex((t) => t.active);
    const next = tabs[(i + step + tabs.length) % tabs.length];
    if (next) showTab(next.id);
  }

  /* ---------- Tab actions (used by the menus and shortcuts) ---------- */

  // Everything in a tab's scrollback as plain text.
  function bufferText(t) {
    const b = t.term.buffer.active;
    const lines = [];
    for (let i = 0; i < b.length; i++) {
      const line = b.getLine(i);
      if (line) lines.push(line.translateToString(true));
    }
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    return lines.join('\r\n');
  }
  function copySelection(t) {
    const s = t.term.getSelection();
    if (s) desk.clipboardWrite(s);
  }
  async function paste(t) {
    const text = await desk.clipboardRead();
    if (text && !t.exited) t.term.paste(text);
    t.term.focus();
  }
  function moveTab(t, step) {
    const i = tabs.indexOf(t);
    const j = i + step;
    if (i < 0 || j < 0 || j >= tabs.length) return;
    tabs.splice(i, 1);
    tabs.splice(j, 0, t);
    sync();
  }
  function closeOthers(t) {
    tabs.filter((x) => x !== t && x.startupIndex == null).forEach((x) => closeTab(x.id));
  }
  async function saveOutput(t) {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    const stamp = d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    const name = t.label.replace(/[\\/:*?"<>|]/g, '_') + '-' + stamp + '.txt';
    await desk.saveText(name, bufferText(t));
    t.term.focus();
  }
  function rename(t) {
    if (!t.active) showTab(t.id);
    requestAnimationFrame(() => sidebar.startRename(t.id));
  }

  /* ---------- Right-click menus ---------- */

  const SEP = { type: 'separator' };

  // Right-click on a tab in the sidebar.
  async function tabMenu(t, x, y) {
    const i = tabs.indexOf(t);
    const isStartup = t.startupIndex != null;
    const others = tabs.some((o) => o !== t && o.startupIndex == null);
    const pick = await desk.popupMenu([
      { id: 'rename', label: '重新命名', accelerator: 'F2' },
      { id: 'restart', label: isStartup ? '重新執行程式' : '重新啟動終端機' },
      { id: 'clear', label: '清除畫面' },
      SEP,
      { id: 'copyAll', label: '複製所有輸出' },
      { id: 'save', label: '儲存輸出成文字檔…' },
      ...(isStartup ? [{ id: 'folder', label: '在檔案總管開啟資料夾' }] : []),
      SEP,
      { id: 'up', label: '上移', enabled: i > 0 },
      { id: 'down', label: '下移', enabled: i < tabs.length - 1 },
      SEP,
      { id: 'close', label: '關閉分頁', accelerator: 'Ctrl+Shift+W' },
      { id: 'closeOthers', label: '關閉其他一般分頁', enabled: others }
    ], x, y);
    runAction(pick, t);
  }

  // Right-click inside the terminal.
  async function terminalMenu(t, x, y) {
    const pick = await desk.popupMenu([
      { id: 'copy', label: '複製', accelerator: 'Ctrl+Shift+C', enabled: t.term.hasSelection() },
      { id: 'paste', label: '貼上', accelerator: 'Ctrl+Shift+V', enabled: !t.exited },
      { id: 'selectAll', label: '全選' },
      SEP,
      { id: 'clear', label: '清除畫面' },
      { id: 'bigger', label: '放大字體', accelerator: 'Ctrl+=' },
      { id: 'smaller', label: '縮小字體', accelerator: 'Ctrl+-' },
      { id: 'resetFont', label: '重設字體大小（' + fontSize + 'px）', accelerator: 'Ctrl+0', enabled: fontSize !== 14 },
      SEP,
      { id: 'rename', label: '重新命名分頁', accelerator: 'F2' },
      { id: 'new', label: '新分頁', accelerator: 'Ctrl+Shift+T' },
      { id: 'desktop', label: '切換到桌面' }
    ], x, y);
    runAction(pick, t);
  }

  function runAction(id, t) {
    if (!id || !find(t.id)) return;
    switch (id) {
      case 'rename': rename(t); return;
      case 'restart': restartTab(t); return;
      case 'clear': t.term.clear(); break;
      case 'copyAll': desk.clipboardWrite(bufferText(t)); break;
      case 'save': saveOutput(t); return;
      case 'folder': desk.openTabFolder(t.startupIndex); return;
      case 'up': moveTab(t, -1); return;
      case 'down': moveTab(t, 1); return;
      case 'close': closeTab(t.id); return;
      case 'closeOthers': closeOthers(t); return;
      case 'copy': copySelection(t); break;
      case 'paste': paste(t); return;
      case 'selectAll': t.term.selectAll(); break;
      case 'bigger': setFontSize(fontSize + 1); break;
      case 'smaller': setFontSize(fontSize - 1); break;
      case 'resetFont': setFontSize(14); break;
      case 'new': createTab(); return;
      case 'desktop': swapToDesktop(); return;
      default: return;
    }
    if (t.active) t.term.focus();
  }

  // Shortcuts inside the terminal. Ctrl + Alt + Z is global and never reaches here.
  function keyHandler(e) {
    if (e.type !== 'keydown') return true;
    const k = e.key.toLowerCase();
    const a = active();
    if (e.ctrlKey && e.shiftKey && k === 't') { createTab(); return false; }
    if (e.ctrlKey && e.shiftKey && k === 'w') { if (a) closeTab(a.id); return false; }
    if (e.ctrlKey && e.shiftKey && k === 'c') { if (a) copySelection(a); return false; }
    if (e.ctrlKey && e.shiftKey && k === 'v') { if (a) paste(a); return false; }
    if (e.ctrlKey && !e.shiftKey && (k === '=' || k === '+')) { setFontSize(fontSize + 1); return false; }
    if (e.ctrlKey && !e.shiftKey && k === '-') { setFontSize(fontSize - 1); return false; }
    if (e.ctrlKey && !e.shiftKey && k === '0') { setFontSize(14); return false; }
    if (e.key === 'F2' && !e.ctrlKey && !e.altKey) { if (a) rename(a); return false; }
    if (e.ctrlKey && k === 'tab') { cycle(e.shiftKey ? -1 : 1); return false; }
    return true;
  }

  desk.onPtyData((id, data) => {
    const t = find(id);
    if (!t) return;
    t.term.write(data);
    if (!t.active && !t.activity) { t.activity = true; sync(); }
  });
  desk.onPtyExit((id) => {
    const t = find(id);
    if (!t) return;
    t.exited = true;
    t.term.write('\r\n\x1b[90m程序已結束，按 Enter 重新啟動\x1b[0m\r\n');
    sync();
  });
  desk.onTabNew(() => createTab());
  desk.onTabRestart(() => restartTab(active()));

  /* ---------- Sidebar, mini desktop, clock ---------- */

  const sidebar = TD.TabSidebar({
    tabs: [],
    shortcutLabel: config.returnShortcutLabel,
    onSelect: showTab,
    onNew: () => createTab(),
    onClose: closeTab,
    onRename: renameTab,
    onMenu: (r) => desk.menu(r.left, r.top),
    onContextMenu: (id, x, y) => { const t = find(id); if (t) tabMenu(t, x, y); }
  });
  document.getElementById('sidebar-slot').replaceWith(sidebar);

  // One small window, one spot: the mini desktop (terminal mode) and the mini terminal (desktop
  // mode) share a position, so swapping never moves it, and dragging either one moves both.
  // The spot is kept as the distance from the top-right corner, so it stays put when the screen
  // size changes. It lives on the page itself, so it can sit anywhere, over the sidebar too.
  const mini = TD.MiniDesktop({
    draggable: true,
    onOpen: () => swapToDesktop(),
    onDragEnd: () => saveMiniPos()
  });
  mini.classList.add('app-mini');
  document.body.appendChild(mini);
  corner.appendChild(TD.ClockWidget());

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function writeJSON(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* not essential */ }
  }
  function applyMiniPos() {
    const p = readJSON('miniPos');
    if (!p || p.right == null) { mini.style.left = ''; mini.style.right = ''; mini.style.top = ''; return; }
    mini.place(window.innerWidth - p.right - mini.offsetWidth, p.top);
  }
  function saveMiniPos(x, y, w) {
    if (x == null) { x = mini.offsetLeft; y = mini.offsetTop; w = mini.offsetWidth; }
    writeJSON('miniPos', { right: window.innerWidth - x - w, top: y });
  }

  new ResizeObserver(() => {
    stage.classList.toggle('is-narrow', stage.clientWidth < 700);
    applyMiniPos();
    fitTab(active());
  }).observe(termsEl);

  /* ---------- Live picture of the desktop ---------- */

  let stream = null;
  let pollTimer = null;
  const video = document.createElement('video');
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;

  async function startCapture() {
    if (stream || pollTimer) return;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { max: config.miniDesktopFps || 10 } },
        audio: false
      });
      video.srcObject = stream;
      bigVideo.srcObject = stream;
      mini.setMedia(video);
      await video.play().catch(() => {});
    } catch (err) {
      // Fall back to still frames once a second.
      stream = null;
      const img = document.createElement('img');
      img.alt = '';
      mini.setMedia(img);
      const tick = async () => {
        const url = await desk.captureThumb().catch(() => null);
        if (url) img.src = url; else mini.setUnavailable('無法擷取桌面畫面');
      };
      tick();
      pollTimer = setInterval(tick, 1000);
    }
  }
  function stopCapture() {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; video.srcObject = null; }
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  /* ---------- Swap: desktop <-> terminal ---------- */

  // The desktop picture grows from the mini view to full screen while the terminal shrinks into
  // the top-right corner; going back plays the same thing in reverse.
  const sidebarEl = sidebar;
  const bigVideo = document.getElementById('swap-video');
  const swapFrame = document.getElementById('swap-frame');
  const swapLabel = document.getElementById('swap-label');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let swapped = null; // { box, scale, stageRect, miniRect }
  let busy = false;
  let running = [];

  let instantSwap = false; // set while the shortcut swaps back: no animation
  function duration() { return reduceMotion.matches || instantSwap ? 0 : 320; }
  // The capture is the whole display, the window only its work area: lay the big video over the
  // whole display so it lines up pixel for pixel with the real desktop behind the window.
  function placeBigVideo() {
    const g = { x: -window.screenX, y: -window.screenY, w: window.screen.width, h: window.screen.height };
    Object.assign(bigVideo.style, { left: g.x + 'px', top: g.y + 'px', width: g.w + 'px', height: g.h + 'px' });
    return g;
  }
  // Transform that shrinks the big video onto rectangle r.
  function rectTransform(r, g) {
    return 'translate(' + (r.x - g.x) + 'px, ' + (r.y - g.y) + 'px) scale(' + (r.width / g.w) + ', ' + (r.height / g.h) + ')';
  }
  function play(el, frames) {
    const a = el.animate(frames, { duration: duration(), easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'forwards' });
    running.push(a);
    return a.finished;
  }
  function settle() {
    running.forEach((a) => { try { a.commitStyles(); } catch (e) { /* element hidden */ } a.cancel(); });
    running = [];
  }

  async function swapToDesktop() {
    if (busy || swapped || !stream) { if (!stream && !busy) desk.enterDesktop(null); return; }
    const a = active();
    if (!a) return;
    busy = true;
    const { stageRect, miniRect, scale, box } = swapGeometry();

    const g = placeBigVideo();
    bigVideo.style.display = 'block';
    stage.classList.add('is-swapping');
    document.body.classList.add('is-swapping');
    await Promise.all([
      play(bigVideo, [{ transform: rectTransform(miniRect, g) }, { transform: 'none' }]),
      play(stage, [
        { transform: 'none', borderRadius: '0px' },
        { transform: 'translate(' + (box.x - stageRect.x) + 'px, ' + (box.y - stageRect.y) + 'px) scale(' + scale + ')', borderRadius: (8 / scale) + 'px' }
      ]),
      play(sidebarEl, [{ opacity: 1 }, { opacity: 0 }]),
      play(corner, [{ opacity: 1 }, { opacity: 0 }]),
      play(mini, [{ opacity: 1 }, { opacity: 0 }])
    ]);
    settle();

    Object.assign(swapFrame.style, { display: 'block', left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
    swapLabel.textContent = a.label;
    swapped = { box, scale, stageRect, miniRect, tab: a };
    if (stream) stream.getVideoTracks().forEach((t) => t.applyConstraints({ frameRate: { max: 2 } }).catch(() => {}));

    desk.enterDesktop(pipPayload(swapped));
    busy = false;
  }

  // The stage's place on the page ignoring the swap transform (offset* sizes aren't transformed).
  function stageBox() {
    return { x: stage.offsetLeft, y: stage.offsetTop, width: stage.offsetWidth, height: stage.offsetHeight };
  }
  // Where the shrunken terminal goes: exactly the mini window's spot and width, height by the
  // terminal's own proportions, kept on screen.
  function swapGeometry() {
    const stageRect = stageBox();
    const miniRect = mini.getBoundingClientRect();
    const scale = miniRect.width / stageRect.width;
    const h = Math.round(stageRect.height * scale);
    const box = {
      x: Math.max(0, Math.min(miniRect.x, window.innerWidth - miniRect.width)),
      y: Math.max(0, Math.min(miniRect.y, window.innerHeight - h)),
      w: miniRect.width,
      h
    };
    return { stageRect, miniRect, scale, box };
  }
  function pipPayload(s) {
    const a = s.tab;
    return {
      rect: s.box,
      stageW: s.stageRect.width,
      stageH: s.stageRect.height,
      tabId: a.id,
      label: a.label,
      cols: a.term.cols,
      rows: a.term.rows,
      fontSize,
      data: a.ser.serialize({ scrollback: 0 })
    };
  }

  /* ---------- Fit to the screen, any time ---------- */

  // Called whenever the window size or the display changes. Works in both modes: while swapped
  // (window hidden) it recomputes the shrunken terminal and tells the mini terminal its new spot.
  function relayout() {
    stage.classList.toggle('is-narrow', stage.clientWidth < 700);
    applyMiniPos();
    fitTab(active());
    if (!swapped || busy) return;
    placeBigVideo();
    const geo = swapGeometry();
    Object.assign(swapped, { box: geo.box, scale: geo.scale, stageRect: geo.stageRect, miniRect: geo.miniRect });
    stage.style.transform = stageTransform(swapped);
    stage.style.borderRadius = (8 / swapped.scale) + 'px';
    Object.assign(swapFrame.style, { left: geo.box.x + 'px', top: geo.box.y + 'px', width: geo.box.w + 'px', height: geo.box.h + 'px' });
    // Let the terminal reflow to its new size before taking its picture.
    setTimeout(() => { if (swapped) desk.pipRelayout(pipPayload(swapped)); }, 120);
  }
  let relayoutTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(relayout, 60);
  });
  desk.onDisplayChanged(() => {
    relayout();
    // The main monitor or its size may have changed: capture it afresh.
    stopCapture();
    startCapture().then(() => {
      if (swapped && stream) stream.getVideoTracks().forEach((t) => t.applyConstraints({ frameRate: { max: 2 } }).catch(() => {}));
    });
  });

  async function swapToTerminal(tabId) {
    if (tabId && find(tabId) && !find(tabId).active) showTab(tabId);
    if (!swapped) return;
    busy = true;
    const s = swapped;
    swapped = null;
    swapFrame.style.display = 'none';
    if (stream) stream.getVideoTracks().forEach((t) => t.applyConstraints({ frameRate: { max: config.miniDesktopFps || 10 } }).catch(() => {}));
    // The desktop shrinks into wherever the mini window is now (it may have been dragged, or the
    // screen may have changed while the desktop was showing).
    applyMiniPos();
    s.miniRect = mini.getBoundingClientRect();
    const g = placeBigVideo();
    await Promise.all([
      play(bigVideo, [{ transform: 'none' }, { transform: rectTransform(s.miniRect, g) }]),
      play(stage, [
        { transform: stageTransform(s), borderRadius: (8 / s.scale) + 'px' },
        { transform: 'none', borderRadius: '0px' }
      ]),
      play(sidebarEl, [{ opacity: 0 }, { opacity: 1 }]),
      play(corner, [{ opacity: 0 }, { opacity: 1 }]),
      play(mini, [{ opacity: 0 }, { opacity: 1 }])
    ]);
    settle();
    [bigVideo, stage, sidebarEl, corner, mini].forEach((el) => { el.style.transform = ''; el.style.opacity = ''; el.style.borderRadius = ''; });
    bigVideo.style.display = 'none';
    stage.classList.remove('is-swapping');
    document.body.classList.remove('is-swapping');
    busy = false;
  }

  function stageTransform(s) {
    return 'translate(' + (s.box.x - s.stageRect.x) + 'px, ' + (s.box.y - s.stageRect.y) + 'px) scale(' + s.scale + ')';
  }

  // The mini terminal was dragged: that is the shared spot now. Move the (hidden) mini desktop and
  // the hidden swapped picture there too, so swapping back starts and ends where it really is.
  desk.onPipMoved((pos) => {
    if (!swapped) return;
    saveMiniPos(pos.x, pos.y, swapped.box.w);
    applyMiniPos();
    swapped.box = { ...swapped.box, x: pos.x, y: pos.y };
    stage.style.transform = stageTransform(swapped);
    swapFrame.style.left = pos.x + 'px';
    swapFrame.style.top = pos.y + 'px';
  });

  // Never leave the small window off screen after the screen shrinks.
  function clampMini() {
    const r = mini.getBoundingClientRect();
    if (r.right > window.innerWidth || r.bottom > window.innerHeight || r.left < 0 || r.top < 0) {
      mini.place(r.left, r.top);
    }
  }
  window.addEventListener('resize', clampMini);

  desk.onReturn(async ({ tabId, swap, instant }) => {
    instantSwap = !!instant;
    mode = 'terminal';
    startCapture();
    if (swap) await swapToTerminal(tabId);
    else if (tabId && find(tabId)) showTab(tabId);
    instantSwap = false;
    const a = active();
    if (a) { fitTab(a); a.term.focus(); }
  });

  /* ---------- Start ---------- */

  let saved = [];
  let savedActive = 0;
  try {
    saved = JSON.parse(localStorage.getItem('tabs') || '[]');
    savedActive = Number(localStorage.getItem('activeIndex')) || 0;
  } catch (e) { saved = []; }
  if (!Array.isArray(saved) || !saved.length) saved = ['終端機 1'];
  const plain = saved.map((label, i) => createTab(String(label), i === 0));
  // Programs from config.json "startupTabs" open in their own tabs, listed first, in the background.
  const startupNames = readJSON('startupLabels') || {};
  const startupTabs = (config.startupTabs || []).map((s, i) => {
    const t = createTab(startupNames[i] || s.label || ('開機程式 ' + (i + 1)), false, i);
    tabs.splice(tabs.indexOf(t), 1);
    return t;
  });
  tabs.unshift(...startupTabs);
  const start = plain[Math.min(Math.max(savedActive, 0), plain.length - 1)];
  if (start) showTab(start.id);

  startCapture();

  /* ---------- Batch files opened from Windows ---------- */

  // A .bat/.cmd opened with 自製桌面 runs in its own new tab (in the file's folder), shown at once.
  // Like a startup tab it asks before closing while running, and Enter reruns it once it ends.
  function openFileTab(file) {
    const name = String(file).split(/[\\/]/).pop();
    createTab(name, true, { file });
  }
  desk.onOpenFile(openFileTab);
  (await desk.takePendingFiles()).forEach(openFileTab);
})();
