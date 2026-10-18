/* Stats screens: overview + radar, monthly recap, history, forms gallery, settings. */
(function () {
  'use strict';
  var PP = (window.PP = window.PP || {});
  var ui = PP.ui, el = ui.el;
  var V = (PP.views = {});

  var tab = 'stats', radarMode = 'all', recapKey = null, histLimit = 40;
  var TABS = [['stats', 'Stats'], ['recap', 'Recap'], ['history', 'History'], ['forms', 'Forms'], ['settings', 'Settings']];

  V.setTab = function (t) { tab = t; V.renderStats(); };

  V.renderStats = function () {
    var root = ui.$('#stats');
    root.innerHTML = '';
    if (!recapKey) recapKey = PP.monthKey(PP.today());
    root.appendChild(el('div', { class: 'head' }, [
      el('button', { class: 'btn small alt', text: 'Back', onclick: function () { ui.go('home'); } }),
      el('h2', { text: 'Your stats' })
    ]));
    var tabs = el('div', { class: 'tabs', role: 'tablist' });
    TABS.forEach(function (t) {
      tabs.appendChild(el('button', { class: 'tab' + (t[0] === tab ? ' on' : ''), role: 'tab', 'aria-selected': t[0] === tab ? 'true' : 'false', text: t[1], onclick: function () { tab = t[0]; V.renderStats(); } }));
    });
    root.appendChild(tabs);
    var box = el('div', { class: 'stack' });
    root.appendChild(box);
    ({ stats: tabStats, recap: tabRecap, history: tabHistory, forms: tabForms, settings: tabSettings })[tab](box);
  };

  /* ---------- Stats tab: radar + level cards ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    return n;
  }

  function radar(snap) {
    var t = PP.today();
    var vals = {}, minScale, caption;
    if (radarMode === 'all') {
      PP.STATS.forEach(function (s) { vals[s.id] = snap.levelF[s.id]; });
      minScale = 3;
    } else {
      var p30 = PP.pointsByStat(PP.addDays(t, -29), t);
      PP.STATS.forEach(function (s) { vals[s.id] = p30[s.id]; });
      minScale = 10;
    }
    var max = Math.max.apply(null, PP.STATS.map(function (s) { return vals[s.id]; }));
    var scale = Math.max(minScale, max);
    caption = radarMode === 'all'
      ? 'Shape of your balance. Scaled to your strongest stat, so it never overflows.'
      : 'Where your effort went in the last 30 days. Scaled to your busiest stat.';

    var C = 170, R = 100, el0 = svg('svg', { viewBox: '0 0 340 340', role: 'img', 'aria-label': 'Radar chart of your six stats' });
    function pt(i, f) { var a = (-90 + i * 60) * Math.PI / 180; return [C + Math.cos(a) * R * f, C + Math.sin(a) * R * f]; }
    [0.25, 0.5, 0.75, 1].forEach(function (f) {
      el0.appendChild(svg('polygon', { points: PP.STATS.map(function (s, i) { return pt(i, f).join(','); }).join(' '), fill: 'none', stroke: f === 1 ? '#6a5ba3' : '#3a3158', 'stroke-width': 2 }));
    });
    PP.STATS.forEach(function (s, i) {
      var e = pt(i, 1);
      el0.appendChild(svg('line', { x1: C, y1: C, x2: e[0], y2: e[1], stroke: '#3a3158', 'stroke-width': 2 }));
    });
    var c1 = snap.top[0] ? PP.STAT_BY_ID[snap.top[0]].color : '#b9a7ff';
    el0.appendChild(svg('polygon', {
      points: PP.STATS.map(function (s, i) { return pt(i, vals[s.id] / scale).join(','); }).join(' '),
      fill: c1, 'fill-opacity': 0.32, stroke: c1, 'stroke-width': 3, 'stroke-linejoin': 'round'
    }));
    PP.STATS.forEach(function (s, i) {
      var p = pt(i, vals[s.id] / scale);
      el0.appendChild(svg('rect', { x: p[0] - 4, y: p[1] - 4, width: 8, height: 8, fill: s.color, stroke: '#0b0916', 'stroke-width': 2 }));
      var l = pt(i, 1.3);
      var txt = radarMode === 'all' ? s.short + ' ' + snap.levels[s.id] : s.short + ' ' + vals[s.id];
      el0.appendChild(svg('text', { x: l[0], y: l[1] + 3, 'text-anchor': 'middle', fill: s.color, style: 'fill:' + s.color }, txt));
    });
    return { node: el('div', { class: 'radarwrap' }, [el0]), caption: caption };
  }

  var MOM = {
    up: ['RISING', 'up'], down: ['SLIPPING', 'down'], flat: ['STEADY', 'flat'], none: ['QUIET', 'none'], 'new': ['STARTING', 'new']
  };

  function tabStats(box) {
    var snap = PP.snapshot();
    box.appendChild(el('div', { class: 'seg' }, [
      el('button', { class: radarMode === 'all' ? 'on' : '', text: 'All time', onclick: function () { radarMode = 'all'; V.renderStats(); } }),
      el('button', { class: radarMode === '30d' ? 'on' : '', text: 'Last 30 days', onclick: function () { radarMode = '30d'; V.renderStats(); } })
    ]));
    var r = radar(snap);
    box.appendChild(el('div', { class: 'panel' }, [r.node, el('p', { class: 'small dim', style: 'text-align:center;margin-top:6px', text: r.caption })]));

    PP.STATS.forEach(function (s) {
      var info = PP.levelInfo(snap.points[s.id]);
      var m = PP.momentum(s.id), mm = MOM[m.dir];
      var last = PP.lastLogged(s.id);
      var ago = last ? PP.daysBetween(last, PP.today()) : null;
      var agoTxt = last === null ? 'never logged' : ago === 0 ? 'logged today' : ago === 1 ? 'logged yesterday' : 'logged ' + ago + ' days ago';
      var delta = m.delta > 0 ? '+' + m.delta : '' + m.delta;
      box.appendChild(el('div', { class: 'card', style: '--c:' + s.color }, [
        PP.iconEl(s.id, false),
        el('div', null, [el('div', { class: 'nm', text: s.name }), el('div', { class: 'small dim', text: s.note })]),
        el('div', { class: 'lvbig', text: 'Lv ' + info.level }),
        el('div', { class: 'meter' }, [el('i', { style: 'width:' + Math.round(info.frac * 100) + '%' })]),
        el('div', { class: 'meta' }, [el('span', { text: info.toNext + ' pts to Lv ' + (info.level + 1) }), el('span', { text: snap.points[s.id] + ' pts total' })]),
        el('div', { class: 'meta' }, [
          el('span', { class: 'mom ' + mm[1], text: mm[0] + ' · 30d ' + m.recent + ' (' + delta + ')' }),
          el('span', { text: agoTxt })
        ])
      ]));
    });
  }

  /* ---------- Recap tab ---------- */
  function tabRecap(box) {
    var key = recapKey, prevKey = PP.shiftMonth(key, -1), cur = PP.monthKey(PP.today());
    var a = PP.pointsByStat(key + '-01', key + '-31'), b = PP.pointsByStat(prevKey + '-01', prevKey + '-31');
    var total = 0, best = null;
    PP.STATS.forEach(function (s) { total += a[s.id]; if (a[s.id] > 0 && (!best || a[s.id] > a[best])) best = s.id; });
    var max = 1;
    PP.STATS.forEach(function (s) { max = Math.max(max, a[s.id], b[s.id]); });

    box.appendChild(el('div', { class: 'row' }, [
      el('button', { class: 'btn small alt', text: '<', 'aria-label': 'Previous month', onclick: function () { recapKey = prevKey; V.renderStats(); } }),
      el('div', { class: 'grow', style: 'text-align:center', text: PP.monthLabel(key) }),
      el('button', { class: 'btn small alt', text: '>', 'aria-label': 'Next month', disabled: key >= cur, onclick: function () { recapKey = PP.shiftMonth(key, 1); V.renderStats(); } })
    ]));
    var ad = PP.activeDays(key);
    box.appendChild(el('div', { class: 'panel small', style: 'line-height:2' }, [
      el('div', { text: ad + (ad === 1 ? ' active day' : ' active days') + ' · ' + total + ' points' }),
      el('div', { class: 'dim', text: best ? 'Most active: ' + PP.STAT_BY_ID[best].name : 'Nothing logged this month.' })
    ]));

    var bars = el('div', { class: 'bars panel' });
    PP.STATS.forEach(function (s) {
      var d = a[s.id] - b[s.id];
      bars.appendChild(el('div', { class: 'brow', style: '--c:' + s.color }, [
        PP.iconEl(s.id, false),
        el('div', { class: 'track' }, [
          el('i', { style: 'width:' + (a[s.id] / max * 100) + '%' }),
          b[s.id] > 0 ? el('u', { style: 'left:calc(' + (b[s.id] / max * 100) + '% - 1px)', title: 'Previous month' }) : null
        ]),
        el('div', { class: 'num', text: a[s.id] + ' (' + (d > 0 ? '+' : '') + d + ')' })
      ]));
    });
    bars.appendChild(el('p', { class: 'small dim', text: 'Bar = this month. White tick = previous month. Number in brackets = change.' }));
    box.appendChild(bars);

    var any = false;
    PP.STATS.forEach(function (s) {
      var list = PP.entriesSorted().filter(function (e) { return PP.monthKey(e.date) === key && e.note && e.splits[s.id]; });
      if (!list.length) return;
      any = true;
      var ul = el('ul', { style: 'padding-left:14px;margin:6px 0 0' });
      list.forEach(function (e) { ul.appendChild(el('li', { text: PP.dayLabel(e.date) + ' (+' + e.splits[s.id] + '): ' + e.note })); });
      box.appendChild(el('details', { class: 'notes', style: 'border-color:' + s.color }, [el('summary', { text: s.name + ' notes (' + list.length + ')' }), ul]));
    });
    if (!any) box.appendChild(el('p', { class: 'small dim', text: 'Notes you add when logging show up here, which helps a lot when you look back.' }));
  }

  /* ---------- History tab ---------- */
  function tabHistory(box) {
    var list = PP.entriesSorted();
    if (!list.length) { box.appendChild(el('p', { class: 'small dim', text: 'Nothing logged yet.' })); return; }
    box.appendChild(el('p', { class: 'small dim', text: 'Tap an entry to edit it, change its date, or delete it.' }));
    var lastDay = null;
    list.slice(0, histLimit).forEach(function (e) {
      if (e.date !== lastDay) { box.appendChild(el('div', { class: 'dayhead', text: PP.dayLabel(e.date) })); lastDay = e.date; }
      var tags = el('div', { class: 'tags' });
      Object.keys(e.splits).forEach(function (id) {
        var s = PP.STAT_BY_ID[id]; if (!s) return;
        tags.appendChild(el('span', { class: 'tag', style: '--c:' + s.color }, [PP.iconEl(id, false), el('span', { text: s.short + ' +' + e.splits[id] })]));
      });
      var b = el('button', { class: 'entry', 'aria-label': 'Edit entry from ' + PP.dayLabel(e.date) }, [tags, e.note ? el('div', { class: 'small dim', text: e.note }) : null]);
      b.addEventListener('click', function () { ui.openSheet({ entry: e }); });
      box.appendChild(b);
    });
    if (list.length > histLimit) box.appendChild(el('button', { class: 'btn alt small', text: 'Show more', onclick: function () { histLimit += 40; V.renderStats(); } }));
  }

  /* ---------- Forms tab ---------- */
  function tabForms(box) {
    var forms = PP.state.forms.slice().reverse();
    if (!forms.length) { box.appendChild(el('p', { class: 'small dim', text: 'Forms appear here as your creature evolves or changes style. Keep logging.' })); return; }
    box.appendChild(el('p', { class: 'small dim', text: 'Every form your creature has taken, newest first.' }));
    var grid = el('div', { class: 'forms' });
    forms.forEach(function (f) {
      var cv = el('canvas');
      var snap = PP.snapshotFromLevels(f.levels); snap.stage = f.stage;
      PP.renderStatic(cv, snap);
      grid.appendChild(el('div', { class: 'form' }, [cv, el('div', { text: f.title }), el('div', { class: 'dim', text: PP.STAGES[f.stage] + ' · ' + PP.dayLabel(f.date) })]));
    });
    box.appendChild(grid);
  }

  /* ---------- Settings tab ---------- */
  function download(name, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var file = null;
    try { file = new File([blob], name, { type: 'application/json' }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
      return navigator.share({ files: [file], title: 'PixelPal backup' }).then(function () { return true; }, function (err) {
        if (err && err.name === 'AbortError') return false;
        return saveLink(blob, name);
      });
    }
    return Promise.resolve(saveLink(blob, name));
  }
  function saveLink(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
    return true;
  }

  function toggle(label, key, onchange) {
    var cb = el('input', { type: 'checkbox' });
    cb.checked = !!PP.state.settings[key];
    cb.addEventListener('change', function () { PP.state.settings[key] = cb.checked; PP.save(); ui.applyMotion(); if (onchange) onchange(cb.checked); });
    return el('label', null, [el('span', { text: label }), cb]);
  }

  function tabSettings(box) {
    var st = PP.state.settings;

    box.appendChild(el('div', { class: 'panel set stack' }, [
      el('h3', { text: 'Feel' }),
      toggle('Sound', 'sound', function (on) { if (on) ui.beep('add'); }),
      toggle('Vibration', 'vibrate', function (on) { if (on) ui.buzz(30); }),
      toggle('Reduce motion', 'reduceMotion')
    ]));

    var gp = el('div', { class: 'panel stack' }, [
      el('h3', { text: 'Point guides' }),
      el('p', { class: 'small dim', text: 'What 1 to 5 means for each stat, so points stay consistent over months.' })
    ]);
    PP.STATS.forEach(function (s) {
      var ed = el('div', { class: 'gedit' });
      [0, 1, 2, 3, 4].forEach(function (i) {
        var inp = el('input', { type: 'text', maxlength: 70, 'aria-label': s.name + ' ' + (i + 1) + ' points' });
        inp.value = PP.state.guides[s.id][i];
        inp.addEventListener('change', function () {
          PP.state.guides[s.id][i] = inp.value.trim() || PP.DEFAULT_GUIDES[s.id][i];
          inp.value = PP.state.guides[s.id][i]; PP.save();
        });
        ed.appendChild(el('div', { class: 'line' }, [el('span', { text: String(i + 1) }), inp]));
      });
      gp.appendChild(el('details', { class: 'notes', style: 'border-color:' + s.color }, [el('summary', { text: s.name }), ed]));
    });
    gp.appendChild(el('button', {
      class: 'btn alt small', text: 'Reset all guides', onclick: function () {
        if (!confirm('Reset all point guides to the defaults?')) return;
        PP.state.guides = JSON.parse(JSON.stringify(PP.DEFAULT_GUIDES)); PP.save(); V.renderStats();
      }
    }));
    box.appendChild(gp);

    var fileIn = el('input', { type: 'file', accept: 'application/json,.json', class: 'hidden' });
    fileIn.addEventListener('change', function () {
      var f = fileIn.files && fileIn.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var obj = JSON.parse(rd.result), data = obj && obj.app === 'pixelpal' ? obj.data : obj;
          var n = data && Array.isArray(data.entries) ? data.entries.length : -1;
          if (n < 0) throw new Error('bad');
          if (!confirm('Replace everything on this phone with the backup (' + n + ' entries)?')) return;
          PP.importText(rd.result); ui.toast('Imported ' + n + ' entries'); V.renderStats();
        } catch (e) { ui.toast('That file is not a PixelPal backup'); }
      };
      rd.readAsText(f);
    });
    box.appendChild(el('div', { class: 'panel stack' }, [
      el('h3', { text: 'Backup' }),
      el('p', { class: 'small dim', text: 'Your data lives only in this browser. Clearing site data erases it, so export now and then.' }),
      el('p', { class: 'small', text: 'Last backup: ' + (st.lastBackup ? PP.dayLabel(st.lastBackup) + ' (' + st.lastBackup + ')' : 'never') + ' · ' + PP.state.entries.length + ' entries' }),
      el('button', {
        class: 'btn', text: 'Export backup', onclick: function () {
          download('pixelpal-backup-' + PP.today() + '.json', PP.exportText()).then(function (ok) {
            if (ok) { PP.markBackup(); ui.toast('Backup exported'); V.renderStats(); }
          });
        }
      }),
      el('button', { class: 'btn alt', text: 'Import backup', onclick: function () { fileIn.click(); } }),
      fileIn
    ]));

    box.appendChild(el('div', { class: 'panel stack' }, [
      el('h3', { text: 'Install' }),
      el('p', { class: 'small dim', text: 'iPhone: Share, then Add to Home Screen. Android: browser menu, then Install app. It then opens full screen and works offline.' })
    ]));

    box.appendChild(el('button', {
      class: 'btn danger small', text: 'Erase everything', onclick: function () {
        if (!confirm('Erase ALL entries, forms and settings from this phone?')) return;
        if (!confirm('Really erase everything? This cannot be undone.')) return;
        try { localStorage.removeItem('pixelpal.v1'); } catch (e) { /* ignore */ }
        PP.load(); recapKey = null; ui.toast('All data erased'); ui.go('home');
      }
    }));
  }
})();
