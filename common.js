(function () {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  function read() { return copy(window.GL_DEFAULTS); }
  function applyTheme(config) {
    const map = {bg:'bg',card:'card',card2:'card2',gold:'gold',goldD:'gold-d',goldL:'gold-l',text:'text',muted:'muted',green:'green'};
    for (const [key, variable] of Object.entries(map)) document.documentElement.style.setProperty('--'+variable,config.brand.colors[key]);
  }
  window.GLModel = {read,applyTheme};
})();
