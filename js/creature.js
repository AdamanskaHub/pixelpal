/* The creature: drawn in code on a 40x40 grid, layered by stage, top stats and accessories. */
(function () {
  'use strict';
  var PP = (window.PP = window.PP || {});

  var W = 40, H = 40, CX = 20, OUT = '#1b1530';
  var SIZES = [{ rw: 8, rh: 10 }, { rw: 7, rh: 6 }, { rw: 8, rh: 7 }, { rw: 9, rh: 8 }, { rw: 10, rh: 9 }];
  var HOP = [-3, -6, -8, -9, -8, -6, -3, 0, -2, 0];

  function px(ctx, x, y, w, h, c, a) {
    ctx.globalAlpha = a == null ? 1 : a;
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x), Math.round(y), w || 1, h || 1);
    ctx.globalAlpha = 1;
  }

  /* Draw string art: map chars to colours, '.' is empty. */
  function art(ctx, ox, oy, rows, map, a) {
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < rows[y].length; x++) {
        var c = rows[y].charAt(x);
        if (c !== '.' && map[c]) px(ctx, ox + x, oy + y, 1, 1, map[c], a);
      }
    }
  }

  function tierOf(l) { return l >= 12 ? 3 : l >= 5 ? 2 : l >= 1 ? 1 : 0; }

  function inside(x, y, cx, cy, rw, rh) {
    var dx = (x + 0.5 - cx) / rw, dy = (y + 0.5 - cy) / rh;
    return dx * dx + dy * dy <= 1;
  }

  /* ---------- body ---------- */
  function drawBlob(ctx, m, main, belly) {
    var dark = PP.shade(main, -0.28), light = PP.shade(main, 0.28);
    for (var y = m.cy - m.rh - 1; y <= m.cy + m.rh; y++) {
      for (var x = m.cx - m.rw - 1; x <= m.cx + m.rw; x++) {
        if (!inside(x, y, m.cx, m.cy, m.rw, m.rh)) continue;
        var edge = !inside(x - 1, y, m.cx, m.cy, m.rw, m.rh) || !inside(x + 1, y, m.cx, m.cy, m.rw, m.rh) ||
          !inside(x, y - 1, m.cx, m.cy, m.rw, m.rh) || !inside(x, y + 1, m.cx, m.cy, m.rw, m.rh);
        var c = main;
        var s = (x + 0.5 - m.cx) / m.rw + (y + 0.5 - m.cy) / m.rh;
        if (s > 0.85) c = dark; else if (s < -0.9) c = light;
        var bx = (x + 0.5 - m.cx) / (m.rw * 0.6), by = (y + 0.5 - (m.cy + m.rh * 0.38)) / (m.rh * 0.5);
        if (bx * bx + by * by <= 1) c = belly;
        px(ctx, x, y, 1, 1, edge ? OUT : c);
      }
    }
  }

  function drawFeet(ctx, m, col) {
    var dx = Math.round(m.rw * 0.5);
    [-dx - 1, dx - 1].forEach(function (o) {
      px(ctx, m.cx + o - 1, m.cy + m.rh - 1, 4, 3, OUT);
      px(ctx, m.cx + o, m.cy + m.rh - 1, 2, 2, col);
    });
  }

  function drawEgg(ctx, frame) {
    var cx = CX + [0, 0, -1, -1, 0, 0, 1, 1][frame % 8] * (frame % 24 < 8 ? 1 : 0);
    var cy = 24, rw = 8, rh = 10;
    function inEgg(x, y) {
      var t = (y + 0.5 - (cy - rh)) / (2 * rh);
      var w = rw * (0.62 + 0.38 * t) * Math.sqrt(Math.max(0, 1 - Math.pow((y + 0.5 - cy) / rh, 2)));
      return Math.abs(x + 0.5 - cx) <= w;
    }
    for (var y = cy - rh; y < cy + rh; y++) {
      for (var x = cx - rw - 1; x <= cx + rw; x++) {
        if (!inEgg(x, y)) continue;
        var edge = !inEgg(x - 1, y) || !inEgg(x + 1, y) || !inEgg(x, y - 1) || !inEgg(x, y + 1);
        px(ctx, x, y, 1, 1, edge ? OUT : ((x - cx) + (y - cy) > 6 ? '#cfc6e6' : '#f1ecff'));
      }
    }
    var spots = [[-3, -4], [2, -6], [4, -1], [-5, 1], [0, 2], [-2, 6], [3, 5]];
    PP.STATS.forEach(function (s, i) { px(ctx, cx + spots[i][0], cy + spots[i][1], 2, 2, s.color); });
    px(ctx, cx + 1, cy - 2, 1, 1, OUT); px(ctx, cx + 2, cy - 1, 1, 1, OUT); px(ctx, cx + 1, cy, 1, 1, OUT);
    px(ctx, cx - 2, cy + 7, 4, 1, 'rgba(0,0,0,0.0)');
  }

  /* ---------- accessories ---------- */
  function drawArms(ctx, m, tier, col, a) {
    var w = [0, 2, 3, 4][tier], h = [0, 3, 4, 5][tier];
    var dark = PP.shade(col, -0.35);
    [-1, 1].forEach(function (side) {
      var x = side < 0 ? m.cx - m.rw - w : m.cx + m.rw;
      var y = m.cy - 1;
      px(ctx, x - 1, y - 1, w + 2, h + 2, OUT, a);
      px(ctx, x, y, w, h, col, a);
      px(ctx, x, y + h - 1, w, 1, dark, a);
      if (tier >= 2) px(ctx, x + (side < 0 ? 0 : w - 1), y, 1, 1, '#ffffff', a);
    });
  }

  function drawDream(ctx, m, tier, frame, a) {
    var gold = '#ffe27a', pur = '#b388ff';
    var tw = frame % 2;
    var sx = m.cx + m.rw - 2, sy = m.top - 8 + (frame % 4 < 2 ? 0 : 1);
    art(ctx, sx, sy, ['..y..', '.yyy.', 'yyyyy', '.yyy.', '..y..'], { y: gold }, a);
    if (tier >= 2) {
      var s2 = tw ? [['.p.', 'ppp', '.p.'], 0] : [['...', '.p.', '...'], 0];
      art(ctx, m.cx - m.rw - 2, m.top - 6, s2[0], { p: pur }, a);
      art(ctx, m.cx + m.rw + 3, m.top - 1, tw ? ['...', '.p.', '...'] : ['.p.', 'ppp', '.p.'], { p: pur }, a);
    }
    if (tier >= 3) {
      art(ctx, m.cx - m.rw - 8, m.top - 4, ['..xxx..', '.xx....', 'xx.....', 'xx.....', 'xx.....', '.xx....', '..xxx..'], { x: pur }, a);
    }
  }

  function drawSprout(ctx, m, tier, frame, a) {
    var g = '#3fb27f', d = '#1f7a52', y = '#ffd84d', w = '#d8f5e6';
    var ox = m.cx - m.rw + 2, oy = m.top;
    var sway = frame % 4 < 2 ? 0 : 1;
    if (tier === 1) {
      art(ctx, ox, oy - 4, ['gg.gg', '.ggg.', '..d..', '..d..'], { g: g, d: d }, a);
    } else if (tier === 2) {
      art(ctx, ox, oy - 7, ['..y..', '.yyy.', '..d..', 'gg.gg', '.ggg.', '..d..', '..d..'], { g: g, d: d, y: y }, a);
    } else {
      art(ctx, ox - 1, oy - 8 + sway, ['..www..', '.wwyww.', '..www..', '...d...', 'gg.d.gg', '.ggdgg.', '...d...', '...d...'], { g: g, d: d, y: y, w: w }, a);
      art(ctx, m.cx - m.rw + 1, m.cy + m.rh - 4, ['gg', '.d'], { g: g, d: d }, a);
      art(ctx, m.cx + m.rw - 3, m.cy + m.rh - 4, ['gg', 'd.'], { g: g, d: d }, a);
    }
  }

  function drawMind(ctx, m, tier, a) {
    var col = '#3a86ff', dark = '#1d4fb0', hi = '#9cc2ff';
    if (tier === 1) {
      var ey = m.ey;
      [m.cx - m.eo - 1, m.cx + m.eo - 3].forEach(function (x) {
        px(ctx, x, ey - 1, 4, 1, col, a); px(ctx, x, ey + 3, 4, 1, col, a);
        px(ctx, x, ey, 1, 3, col, a); px(ctx, x + 3, ey, 1, 3, col, a);
      });
      px(ctx, m.cx - 1, ey + 1, 2, 1, col, a);
      return;
    }
    var hh = tier === 2 ? 7 : 9, bw = tier === 2 ? 9 : 11;
    var brimY = m.top;
    px(ctx, m.cx - bw / 2 - 2, brimY - 1, bw + 4, 3, OUT, a);
    px(ctx, m.cx - bw / 2 - 1, brimY, bw + 2, 1, dark, a);
    px(ctx, m.cx - bw / 2 - 1, brimY - 1 + 1, bw + 2, 1, dark, a);
    for (var i = 0; i < hh; i++) {
      var w = Math.max(1, Math.round(bw * (1 - i / hh)));
      var x0 = m.cx - Math.floor(w / 2) + (i > hh - 3 ? 1 : 0);
      var y = brimY - 2 - i;
      px(ctx, x0 - 1, y, w + 2, 1, OUT, a);
    }
    for (var j = 0; j < hh; j++) {
      var w2 = Math.max(1, Math.round(bw * (1 - j / hh)));
      var x1 = m.cx - Math.floor(w2 / 2) + (j > hh - 3 ? 1 : 0);
      px(ctx, x1, brimY - 2 - j, w2, 1, j < 1 ? hi : col, a);
    }
    px(ctx, m.cx - Math.floor(bw / 2), brimY - 2, bw, 1, dark, a);
    if (tier >= 3) {
      px(ctx, m.cx - 1, brimY - 5, 1, 1, '#ffe27a', a);
      px(ctx, m.cx + 1, brimY - 8, 1, 1, '#ffe27a', a);
      px(ctx, m.cx - 2, brimY - 8, 1, 1, '#ffffff', a);
    }
  }

  function drawCon(ctx, m, tier, a) {
    var col = '#f4a62a', d = '#8a5a08', l = '#ffe9b0';
    if (tier === 1) {
      art(ctx, m.cx - 3, m.cy + 1, ['.dd.dd.', 'dxxdxxd', 'dxxxxxd', '.dxxxd.', '..dxd..', '...d...'], { x: col, d: d }, a);
    } else {
      art(ctx, m.cx - 3, m.cy - 1, ['ddddddd', 'dxxxxxd', 'dxlxxxd', 'dxxxxxd', 'dxxxxxd', '.dxxxd.', '..dxd..', '...d...'], { x: col, d: d, l: l }, a);
    }
  }

  function drawAes(ctx, m, tier, frame, a) {
    var p = '#ff6fae', d = '#a8326a';
    art(ctx, m.cx + m.rw - 6, m.top, ['pp.pp', 'ppdpp', 'pp.pp'], { p: p, d: d }, a);
    if (tier >= 2) {
      var ey = m.ey + 4;
      px(ctx, m.cx - m.eo - 1, ey, 2, 1, p, a);
      px(ctx, m.cx + m.eo - 1, ey, 2, 1, p, a);
      var sp = frame % 2;
      px(ctx, m.cx - m.rw - 3 + sp, m.cy - 6, 1, 1, '#ffffff', a);
      px(ctx, m.cx + m.rw + 3 - sp, m.cy + 3, 1, 1, '#ffd1e6', a);
      px(ctx, m.cx + m.rw + 2, m.cy - 9 + sp, 1, 1, '#ffffff', a);
    }
  }

  function drawCape(ctx, m, a) {
    var col = PP.shade('#ff6fae', -0.35);
    var flut = m.frame % 4 < 2 ? 0 : 1;
    for (var y = m.cy - 2; y <= m.cy + m.rh; y++) {
      var hw = m.rw + 1 + Math.round((y - (m.cy - 2)) * 0.3) + (y > m.cy + 2 ? flut : 0);
      px(ctx, m.cx - hw, y, hw * 2, 1, OUT, a);
      px(ctx, m.cx - hw + 1, y, hw * 2 - 2, 1, col, a);
    }
  }

  function drawAura(ctx, m, col, frame) {
    var a = frame % 4 < 2 ? 0.5 : 0.25;
    for (var ang = 0; ang < 360; ang += 12) {
      var r = ang * Math.PI / 180;
      var x = m.cx + Math.cos(r) * (m.rw + 3), y = m.cy + Math.sin(r) * (m.rh + 3);
      if (((ang / 12) + frame) % 2 === 0) px(ctx, x, y, 1, 1, col, a);
    }
  }

  function drawFace(ctx, m, happy, blink) {
    var ey = m.ey;
    [m.cx - m.eo, m.cx + m.eo - 2].forEach(function (x) {
      if (blink) { px(ctx, x, ey + 1, 2, 1, OUT); return; }
      if (happy) { px(ctx, x, ey + 1, 1, 1, OUT); px(ctx, x + 1, ey, 1, 1, OUT); px(ctx, x + 2, ey + 1, 1, 1, OUT); return; }
      px(ctx, x, ey, 2, 3, OUT); px(ctx, x, ey, 1, 1, '#ffffff');
    });
    var my = ey + 5;
    if (happy) { px(ctx, m.cx - 2, my, 1, 1, OUT); px(ctx, m.cx - 1, my + 1, 2, 1, OUT); px(ctx, m.cx + 1, my, 1, 1, OUT); }
    else px(ctx, m.cx - 1, my + 1, 2, 1, OUT);
  }

  /* ---------- main entry ---------- */
  PP.drawCreature = function (ctx, snap, frame, hopY) {
    ctx.clearRect(0, 0, W, H);
    frame = frame || 0;
    var bob = [0, 0, -1, -1][frame % 4];
    var lift = bob + (hopY || 0);
    var stage = snap.stage;

    var sh = Math.min(1, Math.abs(lift) / 9);
    px(ctx, CX - 8 + sh * 3, 36, 16 - sh * 6, 1, 'rgba(0,0,0,0.28)');

    if (stage === 0) {
      ctx.save(); ctx.translate(0, lift); drawEgg(ctx, frame); ctx.restore();
      return;
    }

    var sz = SIZES[stage];
    var m = { cx: CX, rw: sz.rw, rh: sz.rh, frame: frame };
    m.cy = 34 - sz.rh;
    m.top = m.cy - sz.rh;
    m.eo = stage >= 3 ? 5 : 4;
    m.ey = m.cy - Math.round(sz.rh * 0.25);

    var c1 = snap.top[0] ? PP.STAT_BY_ID[snap.top[0]].color : '#b9a7ff';
    var c2 = snap.top[1] ? PP.STAT_BY_ID[snap.top[1]].color : c1;
    var belly = PP.shade(c2, snap.top[1] ? 0.35 : 0.5);

    var L = snap.levels, T = {}, A = {};
    PP.STATS.forEach(function (s) { T[s.id] = tierOf(L[s.id]); A[s.id] = snap.faded[s.id] ? 0.3 : 1; });

    ctx.save();
    ctx.translate(0, lift);
    if (stage >= 4) drawAura(ctx, m, c1, frame);
    if (T.aesthetics >= 3) drawCape(ctx, m, A.aesthetics);
    if (T.strength) drawArms(ctx, m, T.strength, PP.STAT_BY_ID.strength.color, A.strength);
    if (stage >= 2) drawFeet(ctx, m, T.constitution >= 2 ? '#f4a62a' : PP.shade(c1, -0.3));
    drawBlob(ctx, m, c1, belly);
    if (stage >= 3) {
      [-1, 1].forEach(function (s) {
        var x = m.cx + s * (m.rw - 3) - 1;
        px(ctx, x - 1, m.top - 2, 4, 3, OUT); px(ctx, x, m.top - 1, 2, 2, c1);
      });
    }
    drawFace(ctx, m, snap.happy, frame % 20 === 7);
    if (T.constitution) drawCon(ctx, m, T.constitution, A.constitution);
    if (T.harmony) drawSprout(ctx, m, T.harmony, frame, A.harmony);
    if (T.aesthetics) drawAes(ctx, m, T.aesthetics, frame, A.aesthetics);
    if (T.mind) drawMind(ctx, m, T.mind, A.mind);
    if (T.dream) drawDream(ctx, m, T.dream, frame, A.dream);
    ctx.restore();
  };

  /* ---------- animated wrapper ---------- */
  PP.Creature = function (canvas, getSnap) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    this.getSnap = getSnap; this.tick = 0; this.hopIdx = -1; this.timer = null; this.animated = true;
  };
  PP.Creature.prototype.draw = function () {
    var hop = this.hopIdx >= 0 ? HOP[this.hopIdx] : 0;
    PP.drawCreature(this.ctx, this.getSnap(), Math.floor(this.tick / 3), hop);
  };
  PP.Creature.prototype.start = function (animated) {
    var self = this;
    this.animated = animated !== false;
    this.stop();
    this.draw();
    if (!this.animated) return;
    this.timer = setInterval(function () {
      self.tick++;
      if (self.hopIdx >= 0) { self.hopIdx++; if (self.hopIdx >= HOP.length) self.hopIdx = -1; }
      self.draw();
    }, 100);
  };
  PP.Creature.prototype.stop = function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } };
  PP.Creature.prototype.hop = function () {
    if (this.animated) this.hopIdx = 0;
  };

  PP.renderStatic = function (canvas, snap) {
    canvas.width = W; canvas.height = H;
    PP.drawCreature(canvas.getContext('2d'), snap, 0, 0);
  };
})();
