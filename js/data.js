/* PixelPal data layer: state, levelling, momentum, backup. No UI here. */
(function () {
  'use strict';
  var PP = (window.PP = window.PP || {});

  /* ---------- Stats ---------- */
  PP.STATS = [
    { id: 'strength', name: 'Strength', short: 'STR', color: '#e4572e', note: 'Sport sessions' },
    { id: 'dream', name: 'Dream', short: 'DRM', color: '#9b5de5', note: 'Game creation' },
    { id: 'harmony', name: 'Harmony', short: 'HAR', color: '#3fb27f', note: 'Optimising the apartment' },
    { id: 'mind', name: 'Mind', short: 'MND', color: '#3a86ff', note: 'Behaving well at work' },
    { id: 'constitution', name: 'Constitution', short: 'CON', color: '#f4a62a', note: 'Cardio and stability' },
    { id: 'aesthetics', name: 'Aesthetics', short: 'AES', color: '#ff6fae', note: 'Looks and styling' }
  ];
  PP.STAT_BY_ID = {};
  PP.STATS.forEach(function (s) { PP.STAT_BY_ID[s.id] = s; });

  /* Points offered by default when a stat is picked (regular stats = a session). */
  PP.DEFAULT_PTS = { strength: 3, dream: 3, harmony: 3, mind: 3, constitution: 3, aesthetics: 2 };

  PP.DEFAULT_GUIDES = {
    strength: ['Quick mobility or a short warm-up', 'A short or light session', 'A normal session', 'A long or heavy session', 'Personal best or exceptional'],
    dream: ['A few minutes of notes or thinking', 'A short work block (about 30 min)', 'A solid work session', 'A deep session or a feature finished', 'Major milestone (playable build, release)'],
    harmony: ['A small tidy or fix', 'A proper tidy of one area', 'A project step on a zone', 'A big task done (furniture, deep sort)', 'A whole space transformed'],
    mind: ['Noticed and paused before reacting', 'A tricky moment handled well', 'A hard day handled how I wanted', 'A very difficult situation handled well', 'A real breakthrough moment'],
    constitution: ['A short walk or stretch', 'Light cardio or stability work', 'A normal cardio or stability session', 'A long or hard session', 'An endurance milestone'],
    aesthetics: ['Small care (skincare, a little effort)', 'Routine kept or an outfit planned', 'A real styling or grooming step', 'Significant progress or a big change', 'A major milestone reached']
  };

  PP.STAGES = ['Egg', 'Blobling', 'Sprite', 'Guardian', 'Legend'];

  /* Title for a pair of strongest stats (ids ordered as in STATS). */
  var PAIR_TITLES = {
    'strength+dream': 'Dream Knight', 'strength+harmony': 'Garden Brawler', 'strength+mind': 'Battle Mage',
    'strength+constitution': 'Iron Titan', 'strength+aesthetics': 'Gleaming Champion',
    'dream+harmony': 'Cozy Dreamer', 'dream+mind': 'Sage of Dreams', 'dream+constitution': 'Wandering Hero',
    'dream+aesthetics': 'Starlit Muse', 'harmony+mind': 'Zen Keeper', 'harmony+constitution': 'Hearth Warden',
    'harmony+aesthetics': 'Velvet Gardener', 'mind+constitution': 'Steady Monk', 'mind+aesthetics': 'Cool Oracle',
    'constitution+aesthetics': 'Radiant Runner'
  };

  /* ---------- Dates ---------- */
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  PP.dateStr = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  PP.today = function () { return PP.dateStr(new Date()); };
  PP.parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  PP.addDays = function (s, n) { var d = PP.parse(s); d.setDate(d.getDate() + n); return PP.dateStr(d); };
  PP.daysBetween = function (a, b) {
    var x = PP.parse(a), y = PP.parse(b);
    return Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 864e5);
  };
  PP.monthKey = function (s) { return s.slice(0, 7); };
  PP.shiftMonth = function (key, n) {
    var p = key.split('-'); var d = new Date(+p[0], +p[1] - 1 + n, 1);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1);
  };
  PP.monthLabel = function (key) {
    var p = key.split('-');
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][+p[1] - 1] + ' ' + p[0];
  };
  PP.dayLabel = function (s) {
    var t = PP.today();
    if (s === t) return 'Today';
    if (s === PP.addDays(t, -1)) return 'Yesterday';
    var d = PP.parse(s);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + d.getDate() + ' ' +
      ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  };
  PP.uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  /* ---------- State / storage ---------- */
  var KEY = 'pixelpal.v1';
  PP.state = null;
  PP.saveFailed = false;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function blank() {
    return {
      v: 1, created: PP.today(), entries: [], guides: clone(PP.DEFAULT_GUIDES),
      settings: { sound: false, vibrate: false, reduceMotion: false, lastBackup: null },
      forms: [], lastSig: null
    };
  }

  function normalise(s) {
    var b = blank();
    s = s || {};
    b.created = s.created || b.created;
    b.entries = Array.isArray(s.entries) ? s.entries.filter(function (e) { return e && e.date && e.splits; }) : [];
    PP.STATS.forEach(function (st) {
      var g = s.guides && s.guides[st.id];
      if (Array.isArray(g) && g.length === 5) b.guides[st.id] = g.map(String);
    });
    var se = s.settings || {};
    b.settings.sound = !!se.sound;
    b.settings.vibrate = !!se.vibrate;
    b.settings.reduceMotion = !!se.reduceMotion;
    b.settings.lastBackup = se.lastBackup || null;
    b.forms = Array.isArray(s.forms) ? s.forms : [];
    b.lastSig = s.lastSig || null;
    return b;
  }

  PP.load = function () {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* storage blocked */ }
    var parsed = null;
    if (raw) { try { parsed = JSON.parse(raw); } catch (e) { parsed = null; } }
    PP.state = normalise(parsed);
    return PP.state;
  };

  PP.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(PP.state)); PP.saveFailed = false; }
    catch (e) { PP.saveFailed = true; }
    return !PP.saveFailed;
  };

  /* ---------- Levelling: no ceiling, each level costs a bit more ---------- */
  PP.cumFor = function (L) { return L * L + 5 * L; };          // points needed to reach level L
  PP.levelOf = function (p) { return Math.floor((-5 + Math.sqrt(25 + 4 * p)) / 2); };
  PP.levelInfo = function (p) {
    var L = PP.levelOf(p), lo = PP.cumFor(L), hi = PP.cumFor(L + 1);
    return { level: L, into: p - lo, need: hi - lo, frac: (p - lo) / (hi - lo), toNext: hi - p, points: p };
  };

  /* ---------- Aggregates ---------- */
  PP.pointsByStat = function (from, to) {
    var t = {};
    PP.STATS.forEach(function (s) { t[s.id] = 0; });
    PP.state.entries.forEach(function (e) {
      if ((from && e.date < from) || (to && e.date > to)) return;
      for (var k in e.splits) { if (k in t) t[k] += +e.splits[k] || 0; }
    });
    return t;
  };

  PP.lastLogged = function (id) {
    var best = null;
    PP.state.entries.forEach(function (e) {
      if ((e.splits[id] || 0) > 0 && (!best || e.date > best)) best = e.date;
    });
    return best;
  };

  PP.momentum = function (id) {
    var t = PP.today();
    var recent = PP.pointsByStat(PP.addDays(t, -29), t)[id];
    var prev = PP.pointsByStat(PP.addDays(t, -59), PP.addDays(t, -30))[id];
    var dir;
    if (recent === 0 && prev === 0) dir = 'none';
    else if (prev === 0) dir = 'new';
    else if (Math.abs(recent - prev) < 2) dir = 'flat';
    else if (recent >= prev * 1.2) dir = 'up';
    else if (recent <= prev * 0.8) dir = 'down';
    else dir = 'flat';
    return { recent: recent, prev: prev, dir: dir, delta: recent - prev };
  };

  PP.activeDays = function (monthKey) {
    var seen = {};
    PP.state.entries.forEach(function (e) { if (PP.monthKey(e.date) === monthKey) seen[e.date] = 1; });
    return Object.keys(seen).length;
  };

  PP.entriesSorted = function () {
    return PP.state.entries.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts;
    });
  };

  /* ---------- Snapshot: everything the creature and screens need ---------- */
  function stageFor(totalPoints, totalLevel) {
    if (totalPoints <= 0) return 0;
    if (totalLevel >= 45) return 4;
    if (totalLevel >= 20) return 3;
    if (totalLevel >= 6) return 2;
    return 1;
  }

  PP.topTwo = function (levelF, points) {
    var ids = PP.STATS.map(function (s) { return s.id; }).filter(function (id) { return points[id] > 0; });
    ids.sort(function (a, b) { return (levelF[b] - levelF[a]) || (points[b] - points[a]); });
    var a = ids[0] || null, b = ids[1] || null;
    if (a && b && levelF[b] < levelF[a] * 0.4) b = null;
    return [a, b];
  };

  PP.titleFor = function (top, stage) {
    if (stage === 0) return 'Mystery Egg';
    if (!top[0]) return 'Blobling';
    if (!top[1]) return PP.STAT_BY_ID[top[0]].name + ' Spirit';
    var order = PP.STATS.map(function (s) { return s.id; });
    var pair = order.indexOf(top[0]) < order.indexOf(top[1]) ? top[0] + '+' + top[1] : top[1] + '+' + top[0];
    return PAIR_TITLES[pair] || 'Wanderer';
  };

  PP.snapshotFromPoints = function (points, faded, happy) {
    var levels = {}, levelF = {}, totalLevel = 0, totalPoints = 0;
    PP.STATS.forEach(function (s) {
      var info = PP.levelInfo(points[s.id]);
      levels[s.id] = info.level;
      levelF[s.id] = info.level + info.frac;
      totalLevel += info.level;
      totalPoints += points[s.id];
    });
    var stage = stageFor(totalPoints, totalLevel);
    var top = PP.topTwo(levelF, points);
    return {
      points: points, levels: levels, levelF: levelF, totalLevel: totalLevel, totalPoints: totalPoints,
      stage: stage, top: top, title: PP.titleFor(top, stage), faded: faded || {}, happy: !!happy
    };
  };

  PP.snapshot = function () {
    var points = PP.pointsByStat();
    var faded = {}, t = PP.today();
    PP.STATS.forEach(function (s) {
      var last = PP.lastLogged(s.id);
      faded[s.id] = !!last && PP.levelOf(points[s.id]) >= 1 && PP.daysBetween(last, t) >= 14;
    });
    var happy = PP.state.entries.some(function (e) { return e.date >= PP.addDays(t, -1); });
    return PP.snapshotFromPoints(points, faded, happy);
  };

  /* Rebuild a snapshot from saved level numbers (used by the forms gallery). */
  PP.snapshotFromLevels = function (levels) {
    var points = {};
    PP.STATS.forEach(function (s) { points[s.id] = PP.cumFor(levels[s.id] || 0) + (levels[s.id] ? 0 : 1); });
    return PP.snapshotFromPoints(points, {}, true);
  };

  /* ---------- Entries ---------- */
  PP.recordForm = function (snap) {
    if (snap.totalPoints <= 0) return;
    var sig = snap.stage + '|' + (snap.top[0] || '') + '|' + (snap.top[1] || '');
    if (sig === PP.state.lastSig) return;
    var last = PP.state.forms[PP.state.forms.length - 1];
    var t = PP.today();
    if (last && last.stage === snap.stage && PP.daysBetween(last.date, t) < 3) return;
    PP.state.forms.push({ date: t, ts: Date.now(), stage: snap.stage, levels: clone(snap.levels), title: snap.title, sig: sig });
    PP.state.lastSig = sig;
  };

  PP.addEntry = function (o) {
    var before = PP.snapshot();
    var e = { id: PP.uid(), date: o.date, ts: Date.now(), splits: o.splits, note: o.note || '' };
    PP.state.entries.push(e);
    var after = PP.snapshot();
    PP.recordForm(after);
    PP.save();
    var ups = [];
    PP.STATS.forEach(function (s) {
      if (after.levels[s.id] > before.levels[s.id]) ups.push({ id: s.id, level: after.levels[s.id] });
    });
    return { entry: e, before: before, after: after, levelUps: ups, stageUp: after.stage > before.stage };
  };

  PP.updateEntry = function (id, o) {
    var e = PP.state.entries.filter(function (x) { return x.id === id; })[0];
    if (!e) return false;
    e.date = o.date; e.splits = o.splits; e.note = o.note || '';
    PP.save();
    return true;
  };

  PP.deleteEntry = function (id) {
    PP.state.entries = PP.state.entries.filter(function (x) { return x.id !== id; });
    PP.save();
  };

  /* ---------- Backup ---------- */
  PP.exportText = function () { return JSON.stringify({ app: 'pixelpal', exported: new Date().toISOString(), data: PP.state }, null, 1); };

  PP.markBackup = function () { PP.state.settings.lastBackup = PP.today(); PP.save(); };

  PP.importText = function (text) {
    var obj = JSON.parse(text);
    var data = obj && obj.app === 'pixelpal' ? obj.data : obj;
    if (!data || !Array.isArray(data.entries)) throw new Error('This does not look like a PixelPal backup.');
    PP.state = normalise(data);
    PP.save();
    return PP.state.entries.length;
  };

  PP.backupDue = function () {
    var s = PP.state;
    if (!s.entries.length) return false;
    var ref = s.settings.lastBackup || s.entries.reduce(function (m, e) { return e.date < m ? e.date : m; }, PP.today());
    return PP.daysBetween(ref, PP.today()) >= 30;
  };
})();
