(async function () {
  'use strict';
  const desk = window.desk;
  const config = await desk.config();
  const strip = window.TerminalDesktop.EdgeStrip({
    tabs: await desk.tabsGet(),
    shortcutLabel: config.returnShortcutLabel,
    onExpand: (open) => desk.stripExpand(open),
    onSelect: (id) => { strip.setExpanded(false); desk.stripSelect(id); }
  });
  document.body.appendChild(strip);
  desk.onTabs((tabs) => strip.update(tabs));
})();
