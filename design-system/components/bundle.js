/* @ds-bundle: {"format":4,"namespace":"TerminalDesktop","components":[{"name":"TerminalArea"},{"name":"TabSidebar"},{"name":"MiniDesktop"},{"name":"EdgeStrip"},{"name":"ClockWidget"}]} */
(function () {
  'use strict';

  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function btn(cls, text, label) {
    var b = h('button', cls, text);
    b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    return b;
  }

  var WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(d, seconds) {
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + (seconds ? ':' + pad(d.getSeconds()) : '');
  }
  function fmtDate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // Tab state shared by TabSidebar and EdgeStrip: active (green), activity = unseen output (blue), exited (muted).
  function tabState(t) {
    if (t.exited) return 'exited';
    if (t.active) return 'active';
    if (t.activity) return 'activity';
    return 'idle';
  }

  /* ---------- TerminalArea (demo shell; real apps use xterm.js with the same look) ---------- */

  function appendLine(out, line) {
    if (typeof line === 'string') line = { text: line };
    out.appendChild(h('div', 'td-terminal__line td-tone-' + (line.tone || 'out'), line.text));
  }

  function TerminalArea(props) {
    props = props || {};
    var promptText = props.prompt || 'PS C:\\Users\\me> ';
    var root = h('div', 'td-terminal');
    root.tabIndex = 0;
    root.setAttribute('role', 'textbox');
    root.setAttribute('aria-label', props.label || '桌面終端機');
    var out = h('div', 'td-terminal__output');
    (props.lines || []).forEach(function (l) { appendLine(out, l); });
    var row = h('div', 'td-terminal__row');
    var input = h('span', 'td-terminal__input');
    var cursor = h('span', 'td-cursor');
    cursor.setAttribute('aria-hidden', 'true');
    row.appendChild(h('span', 'td-prompt', promptText));
    row.appendChild(input);
    row.appendChild(cursor);
    root.appendChild(out);
    root.appendChild(row);

    function setActive(a) { root.classList.toggle('is-active', !!a); }
    root.setActive = setActive;
    setActive(props.active);

    var run = props.onCommand || function (cmd) {
      var c = cmd.trim();
      if (!c) return [];
      if (c === 'clear' || c === 'cls') { out.textContent = ''; return []; }
      if (c === 'help') return [{ text: '示範指令：help · date · echo <文字> · clear', tone: 'muted' }];
      if (c === 'date') { var d = new Date(); return [fmtDate(d) + ' ' + fmtTime(d, true)]; }
      if (c.indexOf('echo ') === 0) return [c.slice(5)];
      return [{ text: c.split(' ')[0] + '：預覽模式，指令未實際執行', tone: 'warn' }];
    };

    if (props.interactive !== false) {
      root.addEventListener('focus', function () { setActive(true); });
      root.addEventListener('blur', function () { setActive(false); });
      root.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          var cmd = input.textContent;
          appendLine(out, { text: promptText + cmd, tone: 'cmd' });
          input.textContent = '';
          (run(cmd) || []).forEach(function (l) { appendLine(out, l); });
          root.scrollTop = root.scrollHeight;
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          input.textContent = input.textContent.slice(0, -1);
        } else if (e.key.length === 1) {
          e.preventDefault();
          input.textContent += e.key;
        }
      });
    }
    return root;
  }

  /* ---------- TabSidebar ---------- */

  function TabSidebar(props) {
    props = props || {};
    var tabs = (props.tabs || []).map(function (t) { return Object.assign({}, t); });
    var nextId = tabs.length + 1;

    var el = h('aside', 'td-sidebar');
    el.setAttribute('aria-label', '終端機分頁');
    el.appendChild(h('div', 'td-sidebar__head', props.title || '終端機'));
    var list = h('div', 'td-tabs');
    list.setAttribute('role', 'tablist');
    list.setAttribute('aria-orientation', 'vertical');
    el.appendChild(list);
    var add = btn('td-sidebar__new', '+ 新分頁');
    el.appendChild(add);
    var foot = h('div', 'td-sidebar__foot');
    var menu = btn('td-sidebar__menu', '▸ 選單');
    foot.appendChild(menu);
    foot.appendChild(h('span', 'td-sidebar__hint', props.shortcutLabel || 'Ctrl + Alt + Z'));
    el.appendChild(foot);

    // With a callback, the host owns the state and calls update(); without one, the sidebar manages itself (previews).
    function select(id) {
      if (props.onSelect) return props.onSelect(id);
      tabs.forEach(function (t) { t.active = t.id === id; if (t.active) t.activity = false; });
      render();
    }
    function close(id) {
      if (props.onClose) return props.onClose(id);
      var i = tabs.findIndex(function (t) { return t.id === id; });
      var wasActive = tabs[i] && tabs[i].active;
      tabs.splice(i, 1);
      if (wasActive && tabs.length) tabs[Math.max(0, i - 1)].active = true;
      render();
    }
    function create() {
      if (props.onNew) return props.onNew();
      tabs.forEach(function (t) { t.active = false; });
      tabs.push({ id: 'tab' + nextId, label: '終端機 ' + nextId, active: true });
      nextId++;
      render();
    }
    function rename(id, label) {
      if (props.onRename) return props.onRename(id, label);
      tabs.forEach(function (t) { if (t.id === id) t.label = label; });
      render();
    }

    function startRename(tab, labelEl) {
      var input = h('input', 'td-tab__input');
      input.value = tab.label;
      input.setAttribute('aria-label', '分頁名稱');
      labelEl.replaceWith(input);
      input.focus();
      input.select();
      var done = false;
      function finish(save) {
        if (done) return;
        done = true;
        var v = input.value.trim();
        if (save && v && v !== tab.label) rename(tab.id, v); else render();
      }
      input.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        else if (e.key === 'Escape') finish(false);
      });
      input.addEventListener('blur', function () { finish(true); });
    }

    function render() {
      list.textContent = '';
      tabs.forEach(function (t) {
        var state = tabState(t);
        var row = h('div', 'td-tab is-' + state);
        row.setAttribute('role', 'tab');
        row.setAttribute('aria-selected', t.active ? 'true' : 'false');
        row.tabIndex = t.active ? 0 : -1;
        row.title = '雙擊重新命名';
        row.appendChild(h('span', 'td-tab__dot'));
        var label = h('span', 'td-tab__label', t.label);
        row.appendChild(label);
        if (t.exited) row.appendChild(h('span', 'td-tab__meta', '已結束'));
        var x = btn('td-tab__close', '×', '關閉 ' + t.label);
        x.addEventListener('click', function (e) { e.stopPropagation(); close(t.id); });
        row.appendChild(x);
        row.addEventListener('click', function () { select(t.id); });
        row.addEventListener('dblclick', function () { startRename(t, label); });
        row.addEventListener('auxclick', function (e) { if (e.button === 1) close(t.id); });
        row.addEventListener('contextmenu', function (e) {
          if (!props.onContextMenu) return;
          e.preventDefault();
          props.onContextMenu(t.id, e.clientX, e.clientY);
        });
        row.addEventListener('keydown', function (e) {
          var i = tabs.indexOf(t);
          if (e.key === 'ArrowDown' && tabs[i + 1]) { e.preventDefault(); select(tabs[i + 1].id); focusActive(); }
          else if (e.key === 'ArrowUp' && tabs[i - 1]) { e.preventDefault(); select(tabs[i - 1].id); focusActive(); }
          else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(t.id); }
          else if (e.key === 'F2') { e.preventDefault(); startRename(t, label); }
        });
        list.appendChild(row);
      });
    }
    function focusActive() {
      setTimeout(function () {
        var a = list.querySelector('[aria-selected="true"]');
        if (a) a.focus();
      }, 0);
    }

    add.addEventListener('click', create);
    menu.addEventListener('click', function () {
      if (props.onMenu) props.onMenu(menu.getBoundingClientRect());
    });

    el.update = function (next) {
      tabs = (next || []).map(function (t) { return Object.assign({}, t); });
      render();
    };
    // Open the inline name editor on a tab (e.g. from a right-click menu).
    el.startRename = function (id) {
      var rows = list.querySelectorAll('.td-tab');
      for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].id === id && rows[i]) {
          var label = rows[i].querySelector('.td-tab__label');
          if (label) startRename(tabs[i], label);
          return;
        }
      }
    };
    render();
    return el;
  }

  /* ---------- MiniDesktop ---------- */

  function MiniDesktop(props) {
    props = props || {};
    var el = btn('td-mini', null, (props.label || '我的桌面') + '，' + (props.hint || '點擊放大'));
    var screen = h('div', 'td-mini__screen');
    if (props.preview) {
      // Stand-in for the live desktop picture; not tokens on purpose.
      screen.classList.add('td-mini__screen--preview');
      for (var i = 0; i < 3; i++) screen.appendChild(h('span', 'td-mini__icon'));
      var w = h('span', 'td-mini__win');
      screen.appendChild(w);
    }
    el.appendChild(screen);
    var labelEl = h('span', 'td-mini__label', props.label || '我的桌面');
    el.appendChild(labelEl);
    el.appendChild(h('span', 'td-mini__hint', props.hint || '點擊放大'));
    el.setLabel = function (text) {
      labelEl.textContent = text;
      el.setAttribute('aria-label', text + '，' + (props.hint || '點擊放大'));
    };
    // Drag: past a 5px threshold a press becomes a move, and the click that ends it is swallowed.
    // With onDrag the host moves something else (e.g. its own window); without it the element moves
    // itself inside its positioned parent.
    var drag = null;
    var swallowClick = false;
    function place(x, y) {
      var p = el.offsetParent;
      if (p) {
        // Fractional sizes (e.g. a width set in vw): round up so it never pokes past the edge.
        var r = el.getBoundingClientRect();
        x = Math.max(0, Math.min(x, p.clientWidth - Math.ceil(r.width)));
        y = Math.max(0, Math.min(y, p.clientHeight - Math.ceil(r.height)));
      }
      el.style.position = 'absolute';
      el.style.right = 'auto';
      el.style.left = Math.floor(x) + 'px';
      el.style.top = Math.floor(y) + 'px';
    }
    el.place = place;
    if (props.draggable) {
      el.classList.add('td-mini--draggable');
      el.addEventListener('pointerdown', function (e) {
        if (e.button !== 0) return;
        drag = { x: e.screenX, y: e.screenY, left: el.offsetLeft, top: el.offsetTop, moving: false };
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var dx = e.screenX - drag.x;
        var dy = e.screenY - drag.y;
        if (!drag.moving) {
          if (Math.abs(dx) + Math.abs(dy) < 5) return;
          drag.moving = true;
          el.classList.add('is-dragging');
          if (props.onDragStart) props.onDragStart();
        }
        if (props.onDrag) props.onDrag(dx, dy);
        else place(drag.left + dx, drag.top + dy);
      });
      var end = function (e) {
        if (!drag) return;
        var d = drag;
        drag = null;
        if (!d.moving) return;
        swallowClick = true;
        el.classList.remove('is-dragging');
        if (props.onDragEnd) props.onDragEnd(e.screenX - d.x, e.screenY - d.y);
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }
    el.addEventListener('click', function () {
      if (swallowClick) { swallowClick = false; return; }
      if (props.onOpen) props.onOpen();
    });

    // Put a live <video>, <canvas> or <img> inside.
    el.setMedia = function (node) {
      screen.textContent = '';
      screen.classList.remove('td-mini__screen--preview');
      if (node) screen.appendChild(node);
    };
    el.setUnavailable = function (msg) {
      screen.textContent = '';
      screen.classList.remove('td-mini__screen--preview');
      screen.appendChild(h('span', 'td-mini__empty', msg || '無法顯示桌面畫面'));
    };
    return el;
  }

  /* ---------- EdgeStrip ---------- */

  function EdgeStrip(props) {
    props = props || {};
    var tabs = props.tabs || [];
    var el = h('nav', 'td-edge');
    el.setAttribute('aria-label', '終端機分頁（收合）');
    var ticks = h('div', 'td-edge__ticks');
    ticks.setAttribute('aria-hidden', 'true');
    var panel = h('div', 'td-edge__panel');
    var head = h('div', 'td-edge__head', '終端機');
    var list = h('div', 'td-edge__list');
    var hint = h('div', 'td-edge__hint');
    hint.appendChild(h('kbd', 'td-kbd', props.shortcutLabel || 'Ctrl + Alt + Z'));
    hint.appendChild(document.createTextNode(' 回到終端機'));
    panel.appendChild(head);
    panel.appendChild(list);
    panel.appendChild(hint);
    el.appendChild(ticks);
    el.appendChild(panel);

    var timer = null;
    function setExpanded(v) {
      clearTimeout(timer);
      if (el.classList.contains('is-expanded') === !!v) return;
      el.classList.toggle('is-expanded', !!v);
      if (props.onExpand) props.onExpand(!!v);
    }
    el.setExpanded = setExpanded;
    el.addEventListener('mouseenter', function () { setExpanded(true); });
    el.addEventListener('mouseleave', function () {
      // Small delay so a quick wobble off the edge doesn't snap it shut.
      timer = setTimeout(function () { setExpanded(false); }, 250);
    });
    el.addEventListener('focusin', function () { setExpanded(true); });

    function render() {
      ticks.textContent = '';
      list.textContent = '';
      tabs.forEach(function (t) {
        var state = tabState(t);
        ticks.appendChild(h('span', 'td-edge__tick is-' + state));
        var b = btn('td-edge__tab is-' + state);
        b.appendChild(h('span', 'td-tab__dot'));
        b.appendChild(h('span', 'td-tab__label', t.label));
        if (t.exited) b.appendChild(h('span', 'td-tab__meta', '已結束'));
        b.addEventListener('click', function () { if (props.onSelect) props.onSelect(t.id); });
        list.appendChild(b);
      });
    }
    el.update = function (next) { tabs = next || []; render(); };
    render();
    if (props.expanded) setExpanded(true);
    return el;
  }

  /* ---------- ClockWidget ---------- */

  function ClockWidget(props) {
    props = props || {};
    var el = h('div', 'td-clock' + (props.compact ? ' td-clock--compact' : ''));
    var time = h('div', 'td-clock__time');
    var date = h('div', 'td-clock__date');
    el.appendChild(time);
    if (props.date !== false) el.appendChild(date);
    function tick() {
      var d = props.now ? new Date(props.now) : new Date();
      time.textContent = fmtTime(d, !!props.seconds);
      date.textContent = fmtDate(d) + ' ' + WEEKDAYS[d.getDay()];
    }
    tick();
    if (!props.now) el._timer = setInterval(tick, 1000);
    return el;
  }

  window.TerminalDesktop = {
    TerminalArea: TerminalArea,
    TabSidebar: TabSidebar,
    MiniDesktop: MiniDesktop,
    EdgeStrip: EdgeStrip,
    ClockWidget: ClockWidget
  };
})();
