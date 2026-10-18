(function () {
  'use strict';
  PP.load();
  PP.ui.applyMotion();
  PP.ui.renderHome();

  /* Ask the browser not to evict our data (best effort). */
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

  /* Pause animation in the background, refresh when coming back (the date may have changed). */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { PP.ui.stopCreature(); return; }
    if (PP.ui.screen === 'home') PP.ui.renderHome();
  });

  /* Offline support. Only works when served over http(s), not from a local file. */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* ignore */ }); });
  }
})();
