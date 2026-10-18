/* PixelPal UI core: helpers, home screen, log sheet, celebrations. */
(function () {
  'use strict';
  var PP = (window.PP = window.PP || {});
  var ui = (PP.ui = {});
  ui.snap = null;
  ui.creature = null;
  ui.screen = 'home';

  /* ---------- helpers ---------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  ui.$ = $;

  ui.el = function (tag, props, kids) {
    var n = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.setAttribute('style', v);
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k === 'value') n.value = v;
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  };
  var el = ui.el;

  ui.motion = function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !PP.state.settings.reduceMotion && !reduce;
  };
  ui.applyMotion = function () { document.body.classList.toggle('calm', !ui.motion()); };

  ui.toast = function (msg) {
    var t = $('#toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(ui._tt);
    ui._tt = setTimeout(function () { t.classList.remove('show'); }, 2200);
  };

  /* ---------- sound & vibration (both off by default) ---------- */
  var actx = null;
  ui.beep = function (kind) {
    if (!PP.state.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var seq = { add: [660, 880], level: [523, 659, 784, 1047], evo: [392, 523, 659, 784, 1047, 1319] }[kind] || [660];
      seq.forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square'; o.frequency.value = f;
        var t0 = actx.currentTime + i * 0.09;
        g.gain.setValueAtTime(0.05, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + 0.13);
      });
    } catch (e) { /* audio unavailable */ }
  };
  ui.buzz = function (ms) { if (PP.state.settings.vibrate && navigator.vibrate) navigator.vibrate(ms); };

  ui.setTod = function () {
    var h = new Date().getHours();
    document.body.dataset.tod = (h < 6 || h >= 21) ? 'night' : (h >= 18 ? 'dusk' : 'day');
  };

  /* ---------- navigation ---------- */
  ui.go = function (name) {
    ui.screen = name;
    ['home', 'stats'].forEach(function (s) { $('#' + s).classList.toggle('active', s === name); });
    window.scrollTo(0, 0);
    if (name === 'home') ui.renderHome(); else { ui.stopCreature(); PP.views.renderStats(); }
  };
  ui.stopCreature = function () { if (ui.creature) { ui.creature.stop(); } };
  ui.refresh = function () { if (ui.screen === 'home') ui.renderHome(); else PP.views.renderStats(); };

  /* ---------- home ---------- */
  var STAR_POS = [[8, 10], [22, 24], [38, 8], [52, 30], [66, 12], [80, 26], [92, 8], [14, 44], [74, 46], [46, 50]];

  ui.arrowEl = function (color) {
    var c = el('canvas', { class: 'arrow', width: 5, height: 6 });
    var x = c.getContext('2d'); x.fillStyle = color;
    ['..x..', '.xxx.', 'xxxxx', '..x..', '..x..', '..x..'].forEach(function (r, y) {
      for (var i = 0; i < 5; i++) if (r.charAt(i) === 'x') x.fillRect(i, y, 1, 1);
    });
    return c;
  };

  ui.renderHome = function () {
    var home = $('#home');
    ui.stopCreature();
    home.innerHTML = '';
    ui.setTod(); ui.applyMotion();
    var snap = (ui.snap = PP.snapshot());
    var t = PP.today();

    home.appendChild(el('div', { class: 'topline' }, [
      el('span', { class: 'brand', text: 'PIXELPAL' }),
      el('span', { class: 'small dim', text: PP.dayLabel(t) })
    ]));

    var scene = el('div', { class: 'scene' });
    var stars = el('div', { class: 'stars' });
    STAR_POS.forEach(function (p, i) {
      stars.appendChild(el('i', { style: 'left:' + p[0] + '%;top:' + p[1] + '%;animation-delay:' + (i * 0.37) + 's' }));
    });
    scene.appendChild(stars);
    var cv = el('canvas', { id: 'creature', 'aria-label': 'Your creature: ' + snap.title });
    scene.appendChild(cv);
    scene.appendChild(el('div', { id: 'fx' }));
    home.appendChild(scene);

    ui.creature = new PP.Creature(cv, function () { return ui.snap; });
    cv.addEventListener('click', function () { ui.creature.hop(); ui.buzz(10); });
    ui.creature.start(ui.motion());

    var sub = snap.stage === 0 ? 'Log something to hatch it' :
      'Stage ' + snap.stage + ' · ' + PP.STAGES[snap.stage] + ' · total Lv ' + snap.totalLevel;
    home.appendChild(el('div', { class: 'title-card' }, [
      el('div', { class: 'name', text: snap.title }),
      el('div', { class: 'sub', text: sub })
    ]));

    var chips = el('div', { class: 'chips' });
    PP.STATS.forEach(function (s) {
      var info = PP.levelInfo(snap.points[s.id]);
      var b = el('button', {
        class: 'chip' + (snap.faded[s.id] ? ' faded' : ''), style: '--c:' + s.color, 'data-stat': s.id,
        'aria-label': 'Log ' + s.name + ', level ' + info.level
      }, [
        PP.iconEl(s.id, false),
        el('span', { class: 'lv', text: 'Lv' + info.level }),
        el('span', { class: 'bar' }, [el('i', { style: 'width:' + Math.round(info.frac * 100) + '%' })])
      ]);
      b.addEventListener('click', function () { ui.openSheet({ preset: s.id }); });
      chips.appendChild(b);
    });
    home.appendChild(chips);

    var ad = PP.activeDays(PP.monthKey(t));
    home.appendChild(el('div', {
      class: 'small dim', style: 'text-align:center',
      text: snap.totalPoints === 0 ? 'Tap a stat above for a quick log.' : ad + (ad === 1 ? ' active day' : ' active days') + ' this month'
    }));

    if (PP.saveFailed) {
      home.appendChild(el('div', { class: 'banner', text: 'Could not save to this browser. Export a backup in Stats > Settings.' }));
    }
    if (PP.backupDue()) {
      home.appendChild(el('div', { class: 'banner' }, [
        el('span', { text: 'Time for a backup (30+ days).' }),
        el('button', { class: 'btn small', text: 'Backup', onclick: function () { ui.go('stats'); PP.views.setTab('settings'); } })
      ]));
    }

    home.appendChild(el('div', { class: 'grow' }));
    home.appendChild(el('div', { class: 'btnrow' }, [
      el('button', { class: 'btn', id: 'addBtn', text: '+ Add', onclick: function () { ui.openSheet({}); } }),
      el('button', { class: 'btn alt', id: 'statsBtn', text: 'Stats', onclick: function () { ui.go('stats'); } })
    ]));
  };

  /* ---------- log sheet (add + edit) ---------- */
  var sheetState = null;

  ui.closeSheet = function () {
    $('#sheet').classList.remove('show'); $('#sheetBack').classList.remove('show');
    sheetState = null;
  };

  ui.openSheet = function (opts) {
    var e = opts.entry || null;
    sheetState = {
      editId: e ? e.id : null,
      date: e ? e.date : PP.today(),
      note: e ? e.note : '',
      sel: e ? JSON.parse(JSON.stringify(e.splits)) : {}
    };
    if (!e && opts.preset) sheetState.sel[opts.preset] = PP.DEFAULT_PTS[opts.preset];
    $('#sheetBack').classList.add('show');
    $('#sheet').classList.add('show');
    renderSheet();
  };

  function renderSheet() {
    var S = sheetState, sheet = $('#sheet'), today = PP.today();
    sheet.innerHTML = '';

    sheet.appendChild(el('div', { class: 'sheet-h' }, [
      el('span', { text: S.editId ? 'Edit entry' : 'Log an action' }),
      el('button', { class: 'xbtn', 'aria-label': 'Close', text: 'X', onclick: ui.closeSheet })
    ]));

    var dateInput = el('input', { type: 'date', max: today, value: S.date, 'aria-label': 'Pick a date' });
    dateInput.addEventListener('change', function () { if (dateInput.value) { S.date = dateInput.value > today ? today : dateInput.value; renderSheet(); } });
    sheet.appendChild(el('div', { class: 'datebar' }, [
      el('button', { class: S.date === today ? 'on' : '', text: 'Today', onclick: function () { S.date = today; renderSheet(); } }),
      el('button', { class: S.date === PP.addDays(today, -1) ? 'on' : '', text: 'Yesterday', onclick: function () { S.date = PP.addDays(today, -1); renderSheet(); } }),
      dateInput
    ]));

    var grid = el('div', { class: 'statgrid' });
    PP.STATS.forEach(function (s) {
      var on = S.sel[s.id] != null;
      var b = el('button', { class: 'statbtn' + (on ? ' on' : ''), style: '--c:' + s.color, 'aria-pressed': on ? 'true' : 'false' }, [PP.iconEl(s.id, false), el('span', { text: s.name })]);
      b.addEventListener('click', function () {
        if (S.sel[s.id] != null) delete S.sel[s.id]; else S.sel[s.id] = PP.DEFAULT_PTS[s.id];
        renderSheet();
      });
      grid.appendChild(b);
    });
    sheet.appendChild(grid);

    PP.STATS.forEach(function (s) {
      if (S.sel[s.id] == null) return;
      var cur = S.sel[s.id];
      var guide = el('div', { class: 'guide', text: cur + ' = ' + PP.state.guides[s.id][cur - 1] });
      var pts = el('div', { class: 'pts' });
      [1, 2, 3, 4, 5].forEach(function (n) {
        var pb = el('button', { class: n === cur ? 'on' : '', text: String(n), 'aria-label': n + ' points: ' + PP.state.guides[s.id][n - 1] });
        pb.addEventListener('click', function () {
          S.sel[s.id] = n;
          [].forEach.call(pts.children, function (c, i) { c.classList.toggle('on', i + 1 === n); });
          guide.textContent = n + ' = ' + PP.state.guides[s.id][n - 1];
        });
        pts.appendChild(pb);
      });
      var h = el('h3', null, [PP.iconEl(s.id, false), el('span', { text: s.name })]);
      sheet.appendChild(el('div', { class: 'ptsblock', style: '--c:' + s.color }, [h, pts, guide]));
    });

    var note = el('textarea', { class: 'field', rows: 2, placeholder: 'Optional note (what did you do?)', maxlength: 240 });
    note.value = S.note;
    note.addEventListener('input', function () { S.note = note.value; });
    sheet.appendChild(note);

    var n = Object.keys(S.sel).length;
    var save = el('button', { class: 'btn', text: S.editId ? 'Save changes' : 'Add', onclick: onSave });
    if (!n) save.setAttribute('disabled', '');
    var actions = [save];
    if (S.editId) {
      actions.push(el('button', {
        class: 'btn danger', text: 'Delete', onclick: function () {
          if (!confirm('Delete this entry? Levels will recalculate.')) return;
          PP.deleteEntry(S.editId); ui.closeSheet(); ui.toast('Entry deleted'); ui.refresh();
        }
      }));
    }
    sheet.appendChild(el('div', { class: 'stack' }, actions));
  }

  function onSave() {
    var S = sheetState;
    if (!Object.keys(S.sel).length) return;
    var data = { date: S.date, splits: S.sel, note: S.note.trim() };
    if (S.editId) {
      PP.updateEntry(S.editId, data); ui.closeSheet(); ui.toast('Entry updated'); ui.refresh();
      return;
    }
    var res = PP.addEntry(data);
    ui.closeSheet();
    if (ui.screen !== 'home') ui.go('home'); else ui.renderHome();
    ui.celebrate(res);
  }

  /* ---------- celebrations: one-ups, level-ups, evolution ---------- */
  ui.celebrate = function (res) {
    var fx = $('#fx');
    var ids = Object.keys(res.entry.splits);
    ui.creature.hop(); ui.beep('add'); ui.buzz(25);
    ids.forEach(function (id, i) {
      setTimeout(function () {
        var s = PP.STAT_BY_ID[id];
        var box = el('div', { class: 'oneup', style: '--c:' + s.color + ';bottom:' + (120 + i * 56) + 'px' }, [
          PP.iconEl(id, ui.motion()), ui.arrowEl(s.color), el('b', { text: '+' + res.entry.splits[id] })
        ]);
        if (fx) { fx.appendChild(box); setTimeout(function () { box.remove(); }, 1800); }
      }, i * 320);
    });
    var wait = 900 + ids.length * 320;
    setTimeout(function () {
      res.levelUps.forEach(function (u) { queueMoment(levelMoment(u)); });
      if (res.stageUp) queueMoment(stageMoment(res.after, res.before.stage === 0));
    }, wait);
  };

  var momentQueue = [], momentOpen = false;
  function queueMoment(m) { momentQueue.push(m); if (!momentOpen) nextMoment(); }
  function nextMoment() {
    var ov = $('#overlay');
    var m = momentQueue.shift();
    if (!m) { ov.classList.remove('show'); momentOpen = false; return; }
    momentOpen = true;
    ov.innerHTML = ''; ov.appendChild(m.node); ov.classList.add('show');
    if (m.kind === 'level') { ui.beep('level'); ui.buzz(60); } else { ui.beep('evo'); ui.buzz([40, 40, 80]); }
    clearTimeout(ui._mt);
    ui._mt = setTimeout(nextMoment, 4200);
    ov.onclick = function () { clearTimeout(ui._mt); nextMoment(); };
  }

  function levelMoment(u) {
    var s = PP.STAT_BY_ID[u.id];
    var big = PP.iconEl(u.id, ui.motion());
    return {
      kind: 'level',
      node: el('div', { class: 'moment', style: '--c:' + s.color }, [
        el('h2', { text: 'LEVEL UP!' }), big,
        el('p', { text: s.name + ' is now level ' + u.level }),
        el('p', { class: 'small dim', style: 'margin-top:10px', text: 'tap to continue' })
      ])
    };
  }

  function stageMoment(snap, hatched) {
    var cv = el('canvas', { 'aria-label': 'Your creature' });
    PP.renderStatic(cv, snap);
    var c1 = snap.top[0] ? PP.STAT_BY_ID[snap.top[0]].color : '#b9a7ff';
    return {
      kind: 'stage',
      node: el('div', { class: 'moment', style: '--c:' + c1 }, [
        el('h2', { text: hatched ? 'IT HATCHED!' : 'EVOLVED!' }), cv,
        el('p', { text: snap.title }),
        el('p', { class: 'small dim', style: 'margin-top:6px', text: 'Stage ' + snap.stage + ': ' + PP.STAGES[snap.stage] }),
        el('p', { class: 'small dim', style: 'margin-top:10px', text: 'tap to continue' })
      ])
    };
  }

  /* Close sheet on backdrop tap. */
  document.addEventListener('DOMContentLoaded', function () {
    $('#sheetBack').addEventListener('click', ui.closeSheet);
  });
})();
