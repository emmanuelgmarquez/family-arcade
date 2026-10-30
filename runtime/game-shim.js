/*!
 * Family Arcade — game runtime
 *
 * Loaded as the very first script of every game page (the service worker or the
 * native loader adds the <script> tag when serving the page; the game's files on
 * disk are never changed).
 *
 * What it does:
 *  - Gives each game its own private saves: localStorage, sessionStorage,
 *    IndexedDB and Cache Storage names are transparently namespaced per game.
 *  - Lets the arcade pause a game (freezes requestAnimationFrame, audio and media,
 *    and reports the page as hidden) and resume it without a time jump.
 *  - Stops games from registering or removing service workers (that would break
 *    the arcade's offline mode).
 *  - Exposes window.FamilyArcade for games that want to integrate (optional):
 *      FamilyArcade.exit()      -> return to the arcade
 *      FamilyArcade.openMenu()  -> show the arcade pause menu
 *      FamilyArcade.gameId, FamilyArcade.inArcade
 */
(function () {
  'use strict';
  if (window.__FA_RUNTIME__) return;

  var script = document.currentScript;
  var gameId = (script && script.getAttribute('data-fa-game')) || (function () {
    var m = location.pathname.match(/\/play\/([^/]+)\//);
    return m ? decodeURIComponent(m[1]).replace(/--r\d+$/, '') : 'standalone';
  })();
  var PREFIX = 'fa:g:' + gameId + ':';

  var host = null;
  try {
    if (window.parent && window.parent !== window && window.parent.FamilyArcadeHost) host = window.parent.FamilyArcadeHost;
  } catch (e) { host = null; }
  var options = {};
  try { options = (host && host.launchOptions && host.launchOptions(gameId)) || {}; } catch (e) { options = {}; }

  /* ------------------------------------------------------------------ */
  /* 1. Per-game storage                                                 */
  /* ------------------------------------------------------------------ */

  function namespacedStorage(real, prefix) {
    function keys() {
      var out = [];
      for (var i = 0; i < real.length; i++) {
        var k = real.key(i);
        if (k !== null && k.indexOf(prefix) === 0) out.push(k.slice(prefix.length));
      }
      return out;
    }
    var api = {
      getItem: function (k) { return real.getItem(prefix + String(k)); },
      setItem: function (k, v) { real.setItem(prefix + String(k), String(v)); },
      removeItem: function (k) { real.removeItem(prefix + String(k)); },
      clear: function () { keys().forEach(function (k) { real.removeItem(prefix + k); }); },
      key: function (i) { var ks = keys(); return i >= 0 && i < ks.length ? ks[i] : null; }
    };
    var isApi = function (p) { return p === 'length' || Object.prototype.hasOwnProperty.call(api, p); };
    return new Proxy({}, {
      get: function (t, p) {
        if (p === 'length') return keys().length;
        if (typeof p === 'symbol') return p === Symbol.toStringTag ? 'Storage' : undefined;
        if (isApi(p)) return api[p];
        if (p === 'toString') return function () { return '[object Storage]'; };
        var v = api.getItem(p);
        return v === null ? undefined : v;
      },
      set: function (t, p, v) {
        if (typeof p === 'symbol' || isApi(p)) return true;
        api.setItem(p, v);
        return true;
      },
      deleteProperty: function (t, p) { if (typeof p !== 'symbol') api.removeItem(p); return true; },
      has: function (t, p) { return typeof p !== 'symbol' && (isApi(p) || api.getItem(p) !== null); },
      ownKeys: function () { return keys(); },
      getOwnPropertyDescriptor: function (t, p) {
        if (typeof p === 'symbol') return undefined;
        var v = api.getItem(p);
        if (v === null) return undefined;
        return { value: v, writable: true, enumerable: true, configurable: true };
      }
    });
  }

  function isolateWebStorage(name) {
    var real;
    try { real = window[name]; } catch (e) { return; }
    if (!real) return;
    var ns = namespacedStorage(real, PREFIX);
    try {
      Object.defineProperty(window, name, { configurable: true, enumerable: true, get: function () { return ns; } });
    } catch (e) { /* ignore */ }
    if (window[name] !== ns) {
      // Fallback for engines that won't let us redefine the property: patch the methods.
      var P = Storage.prototype;
      ['getItem', 'setItem', 'removeItem'].forEach(function (m) {
        var orig = P[m];
        P[m] = function (k) {
          if (this !== real) return orig.apply(this, arguments);
          var args = Array.prototype.slice.call(arguments);
          args[0] = PREFIX + String(k);
          return orig.apply(this, args);
        };
      });
    }
  }
  isolateWebStorage('localStorage');
  isolateWebStorage('sessionStorage');

  try {
    var idb = window.indexedDB;
    if (idb) {
      var origOpen = idb.open, origDelete = idb.deleteDatabase, origDatabases = idb.databases;
      idb.open = function (name) {
        var args = Array.prototype.slice.call(arguments);
        args[0] = PREFIX + String(name);
        return origOpen.apply(idb, args);
      };
      idb.deleteDatabase = function (name) { return origDelete.call(idb, PREFIX + String(name)); };
      if (origDatabases) {
        idb.databases = function () {
          return origDatabases.call(idb).then(function (list) {
            return list.filter(function (d) { return d.name && d.name.indexOf(PREFIX) === 0; })
              .map(function (d) { return { name: d.name.slice(PREFIX.length), version: d.version }; });
          });
        };
      }
      var nameDesc = window.IDBDatabase && Object.getOwnPropertyDescriptor(IDBDatabase.prototype, 'name');
      if (nameDesc && nameDesc.get) {
        Object.defineProperty(IDBDatabase.prototype, 'name', {
          configurable: true, enumerable: true,
          get: function () { var n = nameDesc.get.call(this); return n.indexOf(PREFIX) === 0 ? n.slice(PREFIX.length) : n; }
        });
      }
    }
  } catch (e) { /* ignore */ }

  try {
    var cs = window.caches;
    if (cs) {
      var CP = 'fa-gc:' + gameId + ':';
      var cOpen = cs.open, cHas = cs.has, cDelete = cs.delete, cKeys = cs.keys;
      cs.open = function (n) { return cOpen.call(cs, CP + n); };
      cs.has = function (n) { return cHas.call(cs, CP + n); };
      cs.delete = function (n) { return cDelete.call(cs, CP + n); };
      cs.keys = function () {
        return cKeys.call(cs).then(function (ks) {
          return ks.filter(function (k) { return k.indexOf(CP) === 0; }).map(function (k) { return k.slice(CP.length); });
        });
      };
    }
  } catch (e) { /* ignore */ }

  /*
   * Games built as Claude artifacts may use Claude's persistent storage API
   * (window.storage.get/set/delete/list). Outside Claude that API doesn't exist,
   * so provide a compatible, offline version backed by this game's private storage.
   */
  if (!window.storage || typeof window.storage.get !== 'function') {
    try {
      var ls = window.localStorage; // already namespaced to this game
      var keyFor = function (key, shared) { return (shared ? 'claude-shared:' : 'claude:') + String(key); };
      var claudeStorage = {
        get: function (key, shared) {
          var v = ls.getItem(keyFor(key, shared));
          return Promise.resolve(v === null ? null : { key: String(key), value: v, shared: !!shared });
        },
        set: function (key, value, shared) {
          ls.setItem(keyFor(key, shared), typeof value === 'string' ? value : JSON.stringify(value));
          return Promise.resolve({ key: String(key), value: value, shared: !!shared });
        },
        delete: function (key, shared) {
          var existed = ls.getItem(keyFor(key, shared)) !== null;
          ls.removeItem(keyFor(key, shared));
          return Promise.resolve({ key: String(key), deleted: existed, shared: !!shared });
        },
        list: function (prefix, shared) {
          var base = shared ? 'claude-shared:' : 'claude:';
          var p = base + (prefix ? String(prefix) : '');
          var keys = [];
          for (var i = 0; i < ls.length; i++) {
            var k = ls.key(i);
            if (k && k.indexOf(p) === 0) keys.push(k.slice(base.length));
          }
          return Promise.resolve({ keys: keys, prefix: prefix, shared: !!shared });
        }
      };
      Object.defineProperty(window, 'storage', { value: claudeStorage, configurable: true, writable: true });
    } catch (e) { /* ignore */ }
  }

  /* Service workers belong to the arcade. A game unregistering "old" workers would break offline play. */
  try {
    var swc = navigator.serviceWorker;
    if (swc) {
      swc.register = function () {
        return Promise.reject(new Error('Family Arcade manages offline storage for this game.'));
      };
      swc.getRegistrations = function () { return Promise.resolve([]); };
      swc.getRegistration = function () { return Promise.resolve(undefined); };
      Object.defineProperty(swc, 'ready', { configurable: true, get: function () { return new Promise(function () {}); } });
    }
  } catch (e) { /* ignore */ }

  /* ------------------------------------------------------------------ */
  /* 2. Pause / resume                                                   */
  /* ------------------------------------------------------------------ */

  var paused = false, pausedAt = 0, offset = 0;
  var rawNow = performance.now.bind(performance);
  try { performance.now = function () { return (paused ? pausedAt : rawNow()) - offset; }; } catch (e) { /* ignore */ }

  var rawRAF = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : null;
  var rawCAF = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : null;
  var rafSeq = 0, rafPending = new Map(), rafHeld = [];

  function scheduleFrame(id, entry) {
    entry.raw = rawRAF(function (ts) {
      if (!rafPending.has(id)) return;
      if (paused) { rafHeld.push(id); return; }
      rafPending.delete(id);
      entry.cb(ts - offset);
    });
  }
  if (rawRAF) {
    var raf = function (cb) {
      var id = ++rafSeq;
      var entry = { cb: cb, raw: 0 };
      rafPending.set(id, entry);
      if (paused) rafHeld.push(id); else scheduleFrame(id, entry);
      return id;
    };
    var caf = function (id) {
      var entry = rafPending.get(id);
      if (!entry) return;
      rafPending.delete(id);
      if (entry.raw) rawCAF(entry.raw);
    };
    window.requestAnimationFrame = raf;
    window.cancelAnimationFrame = caf;
    if (window.webkitRequestAnimationFrame) window.webkitRequestAnimationFrame = raf;
    if (window.webkitCancelAnimationFrame) window.webkitCancelAnimationFrame = caf;
  }

  var audioContexts = [];
  ['AudioContext', 'webkitAudioContext'].forEach(function (name) {
    var Orig = window[name];
    if (!Orig) return;
    try {
      var Tracked = class extends Orig {
        constructor() { super(...arguments); audioContexts.push(this); }
      };
      Object.defineProperty(Tracked, 'name', { value: name });
      window[name] = Tracked;
    } catch (e) { /* ignore */ }
  });

  var mediaSeen = new Set();
  try {
    var origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      mediaSeen.add(this);
      return origPlay.apply(this, arguments);
    };
  } catch (e) { /* ignore */ }

  var forcedHidden = false;
  try {
    var hiddenDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');
    var visDesc = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    if (hiddenDesc && hiddenDesc.get) {
      Object.defineProperty(document, 'hidden', { configurable: true, get: function () { return forcedHidden || hiddenDesc.get.call(document); } });
    }
    if (visDesc && visDesc.get) {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: function () { return forcedHidden ? 'hidden' : visDesc.get.call(document); } });
    }
  } catch (e) { /* ignore */ }

  var suspendedAudio = [], pausedMedia = [];

  function pause() {
    if (paused) return;
    // Let the game react first (many games save or show their own pause screen here).
    forcedHidden = true;
    try { document.dispatchEvent(new Event('visibilitychange')); } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new Event('blur')); } catch (e) { /* ignore */ }

    paused = true;
    pausedAt = rawNow();
    suspendedAudio = audioContexts.filter(function (c) { return c.state === 'running'; });
    suspendedAudio.forEach(function (c) { try { c.suspend(); } catch (e) { /* ignore */ } });
    var media = Array.from(mediaSeen).concat(Array.from(document.querySelectorAll('audio,video')));
    pausedMedia = media.filter(function (m, i) { return media.indexOf(m) === i && !m.paused; });
    pausedMedia.forEach(function (m) { try { m.pause(); } catch (e) { /* ignore */ } });
  }

  function resume() {
    if (!paused) return;
    offset += rawNow() - pausedAt;
    paused = false;
    var held = rafHeld; rafHeld = [];
    held.forEach(function (id) { var entry = rafPending.get(id); if (entry) scheduleFrame(id, entry); });
    suspendedAudio.forEach(function (c) { try { c.resume(); } catch (e) { /* ignore */ } });
    pausedMedia.forEach(function (m) { try { var p = m.play(); if (p && p.catch) p.catch(function () {}); } catch (e) { /* ignore */ } });
    suspendedAudio = []; pausedMedia = [];
    forcedHidden = false;
    try { document.dispatchEvent(new Event('visibilitychange')); } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new Event('focus')); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /* 3. Virtual keys (used by the arcade's on-screen touch controls)     */
  /* ------------------------------------------------------------------ */

  function dispatchKey(type, k) {
    var init = { key: k.key, code: k.code, bubbles: true, cancelable: true, composed: true, keyCode: k.keyCode, which: k.keyCode };
    var ev;
    try { ev = new KeyboardEvent(type, init); } catch (e) { ev = document.createEvent('Event'); ev.initEvent(type, true, true); }
    var charCode = type === 'keypress' ? (k.key.length === 1 ? k.key.charCodeAt(0) : k.keyCode) : 0;
    try {
      Object.defineProperty(ev, 'keyCode', { get: function () { return type === 'keypress' ? charCode : k.keyCode; } });
      Object.defineProperty(ev, 'which', { get: function () { return type === 'keypress' ? charCode : k.keyCode; } });
      Object.defineProperty(ev, 'charCode', { get: function () { return charCode; } });
      if (ev.key !== k.key) Object.defineProperty(ev, 'key', { get: function () { return k.key; } });
      if (ev.code !== k.code) Object.defineProperty(ev, 'code', { get: function () { return k.code; } });
    } catch (e) { /* ignore */ }
    var active = document.activeElement;
    var target = active && active !== document.documentElement ? active : (document.body || document);
    target.dispatchEvent(ev);
  }

  /* ------------------------------------------------------------------ */
  /* 4. Kid-friendly touch hygiene (no text selection / callout menus)   */
  /* ------------------------------------------------------------------ */

  if (options.touchHygiene !== false) {
    try {
      var st = document.createElement('style');
      st.setAttribute('data-family-arcade', '');
      st.textContent = 'html{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}' +
        'input,textarea,select,[contenteditable]{-webkit-user-select:text;user-select:text}';
      (document.head || document.documentElement).appendChild(st);
    } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ */
  /* 5. Public + host APIs                                               */
  /* ------------------------------------------------------------------ */

  var api = {
    version: 1,
    gameId: gameId,
    inArcade: !!host,
    exit: function () { if (host && host.requestExit) host.requestExit(gameId); },
    openMenu: function () { if (host && host.requestMenu) host.requestMenu(gameId); }
  };
  try { Object.defineProperty(window, 'FamilyArcade', { value: Object.freeze(api), configurable: false }); } catch (e) { window.FamilyArcade = api; }

  if (host) {
    window.close = function () { api.exit(); };
    window.addEventListener('error', function (e) {
      try { host.reportError && host.reportError(gameId, String(e.message || 'Error') + (e.filename ? ' (' + e.filename.split('/').pop() + ':' + e.lineno + ')' : '')); } catch (x) { /* ignore */ }
    });
    window.addEventListener('unhandledrejection', function (e) {
      try { host.reportError && host.reportError(gameId, 'Unhandled: ' + String(e.reason && e.reason.message || e.reason)); } catch (x) { /* ignore */ }
    });
  }

  window.__FA_RUNTIME__ = {
    gameId: gameId,
    pause: pause,
    resume: resume,
    isPaused: function () { return paused; },
    key: dispatchKey
  };
})();
