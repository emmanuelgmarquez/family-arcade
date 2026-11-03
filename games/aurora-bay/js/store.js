/* Aurora Bay — saving.
 *
 * Primary store: IndexedDB database "aurora-bay", object store "profiles" (one record per child,
 * keyed by a stable profile id) and "meta" (profile order + settings).
 * Mirror: every profile is also written synchronously to localStorage ("ab:p:<id>"). That copy is
 * what survives an abrupt close (IndexedDB writes are async), it is what the Family Arcade's own
 * "Back up saves" picks up, and it is the fallback if IndexedDB is unavailable.
 * On load both copies are compared per profile and the newer revision wins.
 *
 * Safety rules:
 *  - A save only ever writes the one profile being saved. There is no "write all" path.
 *  - Unreadable records are set aside (kept, never deleted) and reported.
 *  - Records from a newer game version are loaded read-only and never written back.
 *  - Deleting/resetting keeps a one-step undo copy in localStorage ("ab:trash").
 */
(function () {
  'use strict';
  var AB = window.AB, U = AB.util;
  var ST = AB.store = {};
  var DB_NAME = 'aurora-bay', DB_VER = 1, LS_P = 'ab:p:', LS_META = 'ab:meta';
  ST.SCHEMA = 2;
  ST.MAX_PROFILES = 8;
  ST.backend = 'memory';
  ST.profiles = {};
  ST.meta = { order: [], lastId: null, settings: { music: true, sound: true, readAloud: true } };
  ST.warnings = [];
  ST.lastError = null;
  var db = null;

  function ls() { try { return window.localStorage; } catch (e) { return null; } }

  // ---------------------------------------------------------------- profile shape
  ST.blankProfile = function () {
    return {
      id: U.uid('p'), schema: ST.SCHEMA, rev: 0, createdAt: Date.now(), updatedAt: Date.now(),
      name: 'Friend', species: 'penguin', palette: 'midnight',
      outfit: { head: null, face: null, neck: null, body: null },
      coins: 50,
      owned: { clothes: {}, furniture: {}, styles: { wall_ice: true, floor_snow: true, window_round: true } },
      igloo: { wall: 'ice', floor: 'snow', window: 'round', placed: [] },
      pets: [], activePet: null,
      quests: {}, discovered: { town: true, iglooLane: true }, found: {},
      sculpture: [],
      records: {}, stats: { coinsEarned: 0, plays: 0 },
      pos: null
    };
  };

  /** Bring any older record up to the current schema without losing fields. */
  ST.migrate = function (p) {
    if (!p || typeof p !== 'object') return null;
    var b = ST.blankProfile();
    if ((p.schema || 1) > ST.SCHEMA) { p._readonly = true; return p; }
    // v1 → v2: v1 kept furniture as an array of ids and had no sculpture / found buckets.
    if ((p.schema || 1) < 2) {
      if (p.owned && Array.isArray(p.owned.furniture)) {
        var f = {}; p.owned.furniture.forEach(function (id) { f[id] = (f[id] || 0) + 1; }); p.owned.furniture = f;
      }
    }
    Object.keys(b).forEach(function (k) { if (p[k] === undefined || p[k] === null && b[k] !== null) p[k] = b[k]; });
    ['clothes', 'furniture', 'styles'].forEach(function (k) { if (!p.owned[k] || typeof p.owned[k] !== 'object') p.owned[k] = b.owned[k]; });
    if (!p.owned.styles.wall_ice) p.owned.styles.wall_ice = true;
    if (!p.owned.styles.floor_snow) p.owned.styles.floor_snow = true;
    if (!p.owned.styles.window_round) p.owned.styles.window_round = true;
    if (!Array.isArray(p.igloo.placed)) p.igloo.placed = [];
    if (!Array.isArray(p.pets)) p.pets = [];
    p.outfit = p.outfit || {};
    if (typeof p.coins !== 'number' || !isFinite(p.coins) || p.coins < 0) p.coins = 0;
    p.coins = Math.floor(p.coins);
    p.schema = ST.SCHEMA;
    return p;
  };

  // ---------------------------------------------------------------- IndexedDB
  function openDB() {
    return new Promise(function (resolve) {
      if (!window.indexedDB) return resolve(null);
      var done = false, timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, 3000);
      try {
        var req = indexedDB.open(DB_NAME, DB_VER);
        req.onupgradeneeded = function () {
          var d = req.result;
          if (!d.objectStoreNames.contains('profiles')) d.createObjectStore('profiles', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
        };
        req.onsuccess = function () { if (done) return; done = true; clearTimeout(timer); var d = req.result; d.onversionchange = function () { d.close(); db = null; }; resolve(d); };
        req.onerror = req.onblocked = function () { if (done) return; done = true; clearTimeout(timer); resolve(null); };
      } catch (e) { done = true; clearTimeout(timer); resolve(null); }
    });
  }
  function idbGetAll(store) {
    return new Promise(function (resolve) {
      if (!db) return resolve([]);
      try {
        var r = db.transaction(store, 'readonly').objectStore(store).getAll();
        r.onsuccess = function () { resolve(r.result || []); }; r.onerror = function () { resolve([]); };
      } catch (e) { resolve([]); }
    });
  }
  function idbPut(store, value) {
    return new Promise(function (resolve, reject) {
      if (!db) return resolve(false);
      try {
        var tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = tx.onabort = function () { reject(tx.error || new Error('IndexedDB write failed')); };
      } catch (e) { reject(e); }
    });
  }
  function idbDelete(store, key) {
    return new Promise(function (resolve) {
      if (!db) return resolve(false);
      try { var tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); tx.oncomplete = function () { resolve(true); }; tx.onerror = function () { resolve(false); }; }
      catch (e) { resolve(false); }
    });
  }

  // ---------------------------------------------------------------- load
  ST.init = function () {
    return openDB().then(function (d) {
      db = d;
      ST.backend = db ? 'indexeddb' : (ls() ? 'localstorage' : 'memory');
      if (!db) ST.warnings.push('IndexedDB is not available here, so saves use this browser\'s local storage only.');
      return Promise.all([idbGetAll('profiles'), idbGetAll('meta')]);
    }).then(function (res) {
      var fromIdb = {}, store = ls();
      res[0].forEach(function (p) { if (p && p.id) fromIdb[p.id] = p; });
      var fromLs = {};
      if (store) {
        for (var i = 0; i < store.length; i++) {
          var k = store.key(i);
          if (k && k.indexOf(LS_P) === 0) {
            try { var p = JSON.parse(store.getItem(k)); if (p && p.id) fromLs[p.id] = p; }
            catch (e) {
              // Keep the unreadable copy aside instead of deleting it.
              try { store.setItem('ab:unreadable:' + k.slice(LS_P.length) + ':' + Date.now(), store.getItem(k)); } catch (e2) { /* full */ }
              ST.warnings.push('One saved copy could not be read and was set aside.');
            }
          }
        }
      }
      var ids = {}; Object.keys(fromIdb).concat(Object.keys(fromLs)).forEach(function (id) { ids[id] = true; });
      var repairs = [];
      Object.keys(ids).forEach(function (id) {
        var a = fromIdb[id], b = fromLs[id], win = a;
        if (!a) win = b; else if (b && ((b.rev || 0) > (a.rev || 0) || ((b.rev || 0) === (a.rev || 0) && (b.updatedAt || 0) > (a.updatedAt || 0)))) win = b;
        var p = ST.migrate(win);
        if (!p) return;
        ST.profiles[id] = p;
        if (!p._readonly && (!a || !b || (a.rev || 0) !== (b.rev || 0))) repairs.push(p); // bring both copies level
      });
      // meta
      var metaRec = null;
      res[1].forEach(function (m) { if (m.key === 'meta') metaRec = m.value; });
      var lsMeta = null;
      try { lsMeta = store && JSON.parse(store.getItem(LS_META) || 'null'); } catch (e) { lsMeta = null; }
      var m = (lsMeta && (!metaRec || (lsMeta.rev || 0) >= (metaRec.rev || 0))) ? lsMeta : metaRec;
      if (m) {
        ST.meta.order = Array.isArray(m.order) ? m.order : [];
        ST.meta.lastId = m.lastId || null;
        ST.meta.rev = m.rev || 0;
        if (m.settings) Object.keys(m.settings).forEach(function (k) { ST.meta.settings[k] = m.settings[k]; });
      }
      // order: keep known, append any profile missing from the order list
      ST.meta.order = ST.meta.order.filter(function (id) { return ST.profiles[id]; });
      Object.keys(ST.profiles).sort(function (x, y) { return ST.profiles[x].createdAt - ST.profiles[y].createdAt; })
        .forEach(function (id) { if (ST.meta.order.indexOf(id) < 0) ST.meta.order.push(id); });
      repairs.forEach(function (p) { writeProfile(p, true); });
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(function (g) { ST.persisted = g; }); } catch (e) { /* ignore */ }
      return ST;
    });
  };

  // ---------------------------------------------------------------- write
  var chains = {}, timers = {};
  function writeProfile(p, keepRev) {
    if (!p || p._readonly) return Promise.resolve(false);
    if (!keepRev) { p.rev = (p.rev || 0) + 1; p.updatedAt = Date.now(); }
    var json;
    try { json = JSON.stringify(p); } catch (e) { ST.lastError = e; return Promise.resolve(false); }
    var store = ls();
    if (store) { try { store.setItem(LS_P + p.id, json); } catch (e) { ST.lastError = e; } }
    var snapshot = JSON.parse(json);
    chains[p.id] = (chains[p.id] || Promise.resolve()).then(function () {
      return idbPut('profiles', snapshot).catch(function (e) { ST.lastError = e; AB.emit('save-error', e); return false; });
    });
    return chains[p.id];
  }
  /** Save one profile now (purchases, quest steps, coins). */
  ST.saveNow = function (p) {
    if (timers[p.id]) { clearTimeout(timers[p.id]); timers[p.id] = null; }
    AB.emit('saved', p);
    return writeProfile(p);
  };
  /** Save soon (positions, minor changes) — coalesces bursts. */
  ST.saveSoon = function (p) {
    if (timers[p.id]) clearTimeout(timers[p.id]);
    timers[p.id] = setTimeout(function () { timers[p.id] = null; writeProfile(p); }, 600);
  };
  ST.flush = function () {
    Object.keys(timers).forEach(function (id) { if (timers[id]) { clearTimeout(timers[id]); timers[id] = null; if (ST.profiles[id]) writeProfile(ST.profiles[id]); } });
    ST.saveMeta();
  };
  ST.saveMeta = function () {
    ST.meta.rev = (ST.meta.rev || 0) + 1;
    var v = { order: ST.meta.order.slice(), lastId: ST.meta.lastId, settings: U.deepClone(ST.meta.settings), rev: ST.meta.rev };
    var store = ls(); if (store) { try { store.setItem(LS_META, JSON.stringify(v)); } catch (e) { /* ignore */ } }
    return idbPut('meta', { key: 'meta', value: v }).catch(function () { return false; });
  };

  ST.list = function () { return ST.meta.order.map(function (id) { return ST.profiles[id]; }).filter(Boolean); };
  ST.get = function (id) { return ST.profiles[id] || null; };
  ST.canCreate = function () { return ST.list().length < ST.MAX_PROFILES; };

  ST.create = function (fields) {
    var p = ST.blankProfile();
    Object.keys(fields || {}).forEach(function (k) { p[k] = fields[k]; });
    ST.profiles[p.id] = p;
    ST.meta.order.push(p.id);
    return Promise.all([ST.saveNow(p), ST.saveMeta()]).then(function () { return p; });
  };

  function putTrash(p) {
    var store = ls(); if (!store) return;
    try { store.setItem('ab:trash', JSON.stringify({ at: Date.now(), profile: p })); } catch (e) { /* ignore */ }
  }
  ST.remove = function (id) {
    var p = ST.profiles[id]; if (!p) return Promise.resolve();
    putTrash(p);
    delete ST.profiles[id];
    ST.meta.order = ST.meta.order.filter(function (x) { return x !== id; });
    if (ST.meta.lastId === id) ST.meta.lastId = null;
    var store = ls(); if (store) { try { store.removeItem(LS_P + id); } catch (e) { /* ignore */ } }
    return Promise.all([idbDelete('profiles', id), ST.saveMeta()]);
  };
  /** Reset a child's progress but keep their character, name and id. */
  ST.reset = function (id) {
    var p = ST.profiles[id]; if (!p) return Promise.resolve();
    putTrash(U.deepClone(p));
    var fresh = ST.blankProfile();
    ['id', 'name', 'species', 'palette', 'createdAt', 'rev'].forEach(function (k) { fresh[k] = p[k]; });
    fresh.outfit = { head: null, face: null, neck: null, body: null };
    var starter = p.starter; if (starter) { fresh.starter = starter; fresh.owned.clothes[starter] = true; var it = AB.chars.clothes[starter]; if (it) fresh.outfit[it.slot] = starter; }
    if (AB.giveStarterHome) AB.giveStarterHome(fresh);
    ST.profiles[id] = fresh;
    return ST.saveNow(fresh);
  };
  ST.trash = function () { try { var t = JSON.parse(ls().getItem('ab:trash') || 'null'); return t && t.profile ? t : null; } catch (e) { return null; } };
  ST.restoreTrash = function () {
    var t = ST.trash(); if (!t) return Promise.resolve(null);
    var p = ST.migrate(t.profile);
    if (!ST.profiles[p.id]) ST.meta.order.push(p.id);
    ST.profiles[p.id] = p;
    try { ls().removeItem('ab:trash'); } catch (e) { /* ignore */ }
    return Promise.all([ST.saveNow(p), ST.saveMeta()]).then(function () { return p; });
  };

  // ---------------------------------------------------------------- export / import
  ST.exportAll = function () {
    ST.flush();
    return JSON.stringify({
      app: 'aurora-bay', kind: 'profiles-backup', version: 1, schema: ST.SCHEMA,
      exportedAt: new Date().toISOString(),
      settings: ST.meta.settings,
      profiles: ST.list().map(function (p) { var c = U.deepClone(p); delete c._readonly; return c; })
    }, null, 1);
  };
  /** Validate a backup. Returns { profiles, replacing: [names], adding: [names] } or throws. */
  ST.parseImport = function (text) {
    var j;
    try { j = JSON.parse(text); } catch (e) { throw new Error('That file isn\'t an Aurora Bay backup.'); }
    if (!j || j.app !== 'aurora-bay' || !Array.isArray(j.profiles)) throw new Error('That file isn\'t an Aurora Bay backup.');
    var list = [];
    j.profiles.forEach(function (raw) {
      if (!raw || typeof raw !== 'object' || !raw.id || typeof raw.id !== 'string') return;
      var p = ST.migrate(U.deepClone(raw));
      if (p && !p._readonly) list.push(p);
    });
    if (!list.length) throw new Error('That backup has no players in it.');
    var replacing = [], adding = [];
    list.forEach(function (p) { (ST.profiles[p.id] ? replacing : adding).push(p.name); });
    var room = ST.MAX_PROFILES - ST.list().length;
    return { profiles: list, replacing: replacing, adding: adding, tooMany: adding.length > room };
  };
  ST.applyImport = function (parsed) {
    var store = ls();
    // one-step safety copy of everything being replaced
    try { store && store.setItem('ab:preimport', ST.exportAll()); } catch (e) { /* ignore */ }
    var writes = [];
    parsed.profiles.forEach(function (p) {
      if (!ST.profiles[p.id] && !ST.canCreate()) return;
      if (!ST.profiles[p.id]) ST.meta.order.push(p.id);
      var prev = ST.profiles[p.id];
      p.rev = Math.max(p.rev || 0, prev ? prev.rev || 0 : 0);
      ST.profiles[p.id] = p;
      writes.push(writeProfile(p));
    });
    writes.push(ST.saveMeta());
    return Promise.all(writes);
  };

  // Flush on the way out. localStorage writes are synchronous, so the mirror is always current.
  function onHide() { try { ST.flush(); } catch (e) { /* ignore */ } }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') onHide(); });
  window.addEventListener('pagehide', onHide);
})();
