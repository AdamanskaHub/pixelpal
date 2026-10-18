/* 8x8 pixel icons for each stat. x = main colour, d = darker shade, l = highlight. */
(function () {
  'use strict';
  var PP = (window.PP = window.PP || {});

  var ICONS = {
    strength: [
      '........',
      '.dd..dd.',
      'dxxddxxd',
      'dxxxxxxd',
      'dxxddxxd',
      '.dd..dd.',
      '........',
      '........'
    ],
    dream: [
      '...xx...',
      '...xx...',
      'xxxxxxxx',
      '.xxlxxx.',
      '..xxxx..',
      '..xxxx..',
      '.xx..xx.',
      '.x....x.'
    ],
    harmony: [
      '.....xx.',
      '...xxxxx',
      '..xxlxx.',
      '..xxxx..',
      '...dx...',
      '...d....',
      '...d....',
      '..ddd...'
    ],
    mind: [
      '..xxxx..',
      '.xxllxx.',
      'xxlxxxxx',
      'xxxxxxxx',
      '.xxxxxx.',
      '..dddd..',
      '..dddd..',
      '...dd...'
    ],
    constitution: [
      '.xx..xx.',
      'xxxxxxxx',
      'xxlxxxxx',
      'xxxxxxxx',
      '.xxxxxx.',
      '..xxxx..',
      '...xx...',
      '........'
    ],
    aesthetics: [
      '.dxxxxd.',
      'dxlxxxxd',
      'xxxxxxxx',
      '.dxxxxd.',
      '..dxxd..',
      '...dd...',
      '........',
      '........'
    ]
  };

  PP.shade = function (hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(c) { return Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))); }
    return '#' + [f(r), f(g), f(b)].map(function (c) { return (c < 16 ? '0' : '') + c.toString(16); }).join('');
  };

  /* Draws icon frame 0 or 1 (frame 1 hops up one pixel and twinkles). */
  PP.drawIcon = function (ctx, id, frame, ox, oy) {
    var grid = ICONS[id], col = PP.STAT_BY_ID[id].color;
    var map = { x: col, d: PP.shade(col, -0.45), l: '#ffffff' };
    var dy = frame ? -1 : 0;
    for (var y = 0; y < 8; y++) {
      for (var x = 0; x < 8; x++) {
        var c = grid[y].charAt(x);
        if (c === '.') continue;
        ctx.fillStyle = map[c];
        ctx.fillRect((ox || 0) + x, (oy || 0) + y + dy + 1, 1, 1);
      }
    }
    if (frame) { ctx.fillStyle = '#fff'; ctx.fillRect((ox || 0) + 7, (oy || 0), 1, 1); ctx.fillRect((ox || 0), (oy || 0) + 2, 1, 1); }
  };

  /* Returns a small <canvas> for the icon. If animate is true it flips between frames. */
  PP.iconEl = function (id, animate) {
    var c = document.createElement('canvas');
    c.width = 9; c.height = 10; c.className = 'icon';
    var ctx = c.getContext('2d');
    function paint(f) { ctx.clearRect(0, 0, 9, 10); PP.drawIcon(ctx, id, f, 0, 0); }
    paint(0);
    if (animate) {
      var f = 0, n = 0;
      var t = setInterval(function () {
        f = 1 - f; paint(f);
        if (++n > 10 || !c.isConnected) clearInterval(t);
      }, 180);
    }
    return c;
  };
})();
