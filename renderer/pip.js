(function () {
  'use strict';
  const desk = window.desk;

  const THEME = {
    background: '#0b0f14', foreground: '#d7e0ea', cursor: '#3ddc97', cursorAccent: '#0b0f14',
    selectionBackground: 'rgba(92, 200, 255, 0.35)',
    black: '#141a22', brightBlack: '#8b98a8', red: '#ff6b6b', brightRed: '#ff8a8a',
    green: '#3ddc97', brightGreen: '#6ee7b4', yellow: '#f5b041', brightYellow: '#f8c56e',
    blue: '#5cc8ff', brightBlue: '#8bd8ff', magenta: '#c49bff', brightMagenta: '#d6b8ff',
    cyan: '#4fd6d6', brightCyan: '#7fe3e3', white: '#d7e0ea', brightWhite: '#ffffff'
  };

  const mini = window.TerminalDesktop.MiniDesktop({
    label: '終端機',
    hint: '點擊返回',
    onOpen: () => desk.pipSelect(),
    // Dragging moves this whole window.
    draggable: true,
    onDragStart: () => desk.pipDragStart(),
    onDrag: (dx, dy) => desk.pipDrag(dx, dy),
    onDragEnd: () => desk.pipDragEnd()
  });
  document.body.appendChild(mini);

  let term = null;
  let current = null; // { stage, stageW }

  // Scale the full-size copy of the terminal down to this window's width.
  function rescale() {
    if (!current) return;
    const w = window.innerWidth || current.width;
    current.stage.style.transform = 'scale(' + (w / current.stageW) + ')';
  }
  window.addEventListener('resize', rescale);

  desk.onPipInit((p) => {
    if (term) { term.dispose(); term = null; }
    const stage = document.createElement('div');
    stage.className = 'pip-stage';
    stage.style.width = p.stageW + 'px';
    stage.style.height = p.stageH + 'px';
    // The window may not have its new size yet when this arrives; use the size we were given.
    current = { stage, stageW: p.stageW, width: p.rect.w };
    stage.style.transform = 'scale(' + (p.rect.w / p.stageW) + ')';
    const host = document.createElement('div');
    host.className = 'pip-term';
    stage.appendChild(host);
    mini.setMedia(stage);
    mini.setLabel(p.label);

    term = new window.Terminal({
      fontFamily: '"JetBrains Mono", "Cascadia Code", Consolas, monospace',
      fontSize: p.fontSize || 14,
      lineHeight: 1.3,
      cursorBlink: false,
      disableStdin: true,
      scrollback: 1000,
      theme: THEME,
      cols: p.cols,
      rows: p.rows
    });
    term.open(host);
    term.write(p.data || '', () => {
      requestAnimationFrame(() => requestAnimationFrame(() => desk.pipReady()));
    });
  });

  desk.onPipData((d) => { if (term) term.write(d); });
})();
