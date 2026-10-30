/*
 * Family Arcade add-on for Midnight Meridian: kid-friendly driving screen.
 *
 * Loaded by the arcade before the game (see "inject" in arcade.json). The game's own files are
 * unchanged; this restyles the game's touch controls and HUD for Kid mode and adds two optional
 * ways to steer:
 *
 *   Layout (touch screens)
 *     - Steering in the bottom-left corner, pedals (GAS / BRAKE) in the bottom-right corner.
 *     - Minimap moves to the top-left, the speedometer shrinks and moves to the top-right,
 *       so nothing sits under the kids' thumbs.
 *
 *   Steering (picked on the main menu or the pause menu, remembered on this iPad)
 *     - Buttons: big ◀ ▶ buttons (the game's own).
 *     - Wheel:   drag a steering wheel round.
 *     - Tilt:    turn the iPad like a steering wheel.
 *   Wheel and tilt steer through the game's own game-controller input, so Kid mode's
 *   steering help still applies.
 */
(function () {
  'use strict';

  var STORE = 'fa-kids-steer';
  var MODES = [['buttons', 'Buttons'], ['wheel', 'Wheel'], ['tilt', 'Tilt']];
  var mode = 'buttons';
  try { mode = localStorage.getItem(STORE) || 'buttons'; } catch (e) { /* storage blocked */ }
  if (!MODES.some(function (m) { return m[0] === mode; })) mode = 'buttons';

  var steer = 0;          // -1 (right) .. 1 (left), the game's sign
  var tiltZero = null;    // tilt angle that counts as straight ahead
  var tiltAngle = 0;

  /* ------------------------------------------------------------------ */
  /* Analog steering through the game's game-controller input           */
  /* ------------------------------------------------------------------ */

  // The game reads navigator.getGamepads() each frame and uses axis 0 for steering.
  // While Wheel or Tilt is on, a virtual controller carrying just that steering value is listed first.
  var realGetGamepads = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : null;
  var NO_BUTTONS = [];
  for (var i = 0; i < 17; i++) NO_BUTTONS.push({ pressed: false, touched: false, value: 0 });
  function virtualPad() {
    return {
      id: 'Family Arcade touch steering', index: 0, connected: true, mapping: 'standard', timestamp: performance.now(),
      axes: [-steer, 0, 0, 0], buttons: NO_BUTTONS
    };
  }
  try {
    Object.defineProperty(navigator, 'getGamepads', {
      configurable: true,
      value: function () {
        var list = realGetGamepads ? Array.prototype.slice.call(realGetGamepads()).filter(Boolean) : [];
        if (mode !== 'buttons' && Math.abs(steer) > 0.001) list.unshift(virtualPad());
        return list;
      }
    });
  } catch (e) { /* leave the browser's own */ }

  /* ------------------------------------------------------------------ */
  /* Styles                                                              */
  /* ------------------------------------------------------------------ */

  var B = 'max(16px, env(safe-area-inset-bottom, 0px))';
  var css = [
    // --- minimap: top-left, below the arcade's return button
    'body.kid .hud-bl { top: calc(max(14px, env(safe-area-inset-top, 0px)) + 70px); bottom: auto; }',
    'body.kid #minimap { width: 150px; height: 150px; }',
    'body.kid #district { top: calc(100% + 10px); bottom: auto; font-size: 17px; }',
    'body.kid #street { top: calc(100% + 36px); bottom: auto; transform: none; font-size: 10px; }',
    // --- speedometer: smaller, top-right below the pause / camera / map buttons
    'body.kid .hud-br { top: calc(max(16px, env(safe-area-inset-top, 0px)) + 120px); bottom: auto; width: 150px; }',
    'body.kid #tach { width: 150px; height: 150px; }',
    'body.kid .speedo { top: 40px; }',
    'body.kid #speed { font-size: 48px; }',
    'body.kid .unit { margin-top: 3px; font-size: 9px; }',
    'body.kid #gear { top: 100px; width: 26px; height: 26px; font-size: 16px; }',
    'body.kid .bars { margin-top: -4px; gap: 4px; }',
    'body.kid #rep { display: none; }',
    // free kid driving has no story: hide the story objective and phone call panels
    'body.kid #objective, body.kid #phone { display: none !important; }',
    // other bottom messages: keep clear of both control corners
    'body.kid #radio { left: calc(var(--gx) + 280px); max-width: calc(100vw - 600px); }',
    'body.kid #drift { right: calc(var(--gr) + 280px); bottom: calc(' + B + ' + 24px); }',

    // --- shared control look (the game's glass style, bigger and bolder for small hands)
    'body.kid #touch button, .fa-pad { border-radius: 28px; background: rgba(9,11,15,0.5); border: 2px solid rgba(242,237,227,0.22);' +
      ' color: #f2ede3; font-family: var(--display); font-weight: 800; letter-spacing: 0.06em; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);' +
      ' box-shadow: 0 6px 20px rgba(0,0,0,0.35); transition: transform .08s, background .08s; -webkit-tap-highlight-color: transparent; }',
    'body.kid #touch button.on { background: rgba(255,178,62,0.45); border-color: var(--amber); transform: scale(0.94); }',

    // --- steering buttons: bottom-left
    'body.kid #touch [data-k="left"], body.kid #touch [data-k="right"] { width: 116px !important; height: 116px !important; bottom: calc(' + B + ' + 8px) !important; font-size: 46px; }',
    'body.kid #touch [data-k="left"] { left: calc(var(--gx) + 8px) !important; }',
    'body.kid #touch [data-k="right"] { left: calc(var(--gx) + 140px) !important; }',
    'body.fa-steer-wheel #touch [data-k="left"], body.fa-steer-wheel #touch [data-k="right"],' +
      ' body.fa-steer-tilt #touch [data-k="left"], body.fa-steer-tilt #touch [data-k="right"] { display: none !important; }',

    // --- pedals: bottom-right (GAS tall on the outside, BRAKE beside it)
    'body.kid #touch [data-k="up"] { right: calc(var(--gr) + 8px) !important; bottom: calc(' + B + ' + 8px) !important; width: 116px !important; height: 150px !important;' +
      ' font-size: 26px; background: rgba(40,120,70,0.42); border-color: rgba(109,255,160,0.55); }',
    'body.kid #touch [data-k="down"] { right: calc(var(--gr) + 140px) !important; bottom: calc(' + B + ' + 8px) !important; width: 116px !important; height: 116px !important;' +
      ' font-size: 24px; background: rgba(140,30,30,0.42); border-color: rgba(255,90,80,0.6); }',
    'body.kid #touch [data-k="up"].on { background: rgba(109,255,160,0.5); }',
    'body.kid #touch [data-k="down"].on { background: rgba(255,90,80,0.55); }',
    // when the car drives itself the GAS pedal shows it is already on
    'body.fa-autogas #touch [data-k="up"] { opacity: .7; }',
    'body.fa-autogas #touch [data-k="up"]::after { content: "AUTO"; position: absolute; left: 0; right: 0; bottom: 14px; font-size: 12px; letter-spacing: 0.2em; color: var(--green); }',
    // boost above GAS; drift above BRAKE (Big Kid only)
    'body.kid #touch [data-k="nitro"] { right: calc(var(--gr) + 8px) !important; bottom: calc(' + B + ' + 174px) !important; width: 116px !important; height: 62px !important; font-size: 18px;' +
      ' border-color: rgba(82,228,255,0.55); }',
    'body.kid #touch [data-k="hb"] { right: calc(var(--gr) + 140px) !important; bottom: calc(' + B + ' + 140px) !important; width: 116px !important; height: 62px !important; font-size: 18px; }',
    'body.kid:not(.fa-big) #touch [data-k="hb"] { display: none !important; }',

    // --- steering wheel
    '.fa-wheel { position: absolute; left: calc(var(--gx) + 8px); bottom: calc(' + B + ' + 8px); width: 200px; height: 200px; pointer-events: auto; touch-action: none; display: none; }',
    'body.fa-steer-wheel .fa-wheel { display: block; }',
    '.fa-wheel svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 8px 18px rgba(0,0,0,0.45)); transition: transform .12s ease-out; }',
    '.fa-wheel.held svg { transition: none; }',
    // --- tilt panel
    '.fa-tilt { position: absolute; left: calc(var(--gx) + 8px); bottom: calc(' + B + ' + 8px); width: 248px; height: 116px; pointer-events: auto; display: none;' +
      ' align-items: center; gap: 14px; padding: 0 16px; }',
    'body.fa-steer-tilt .fa-tilt { display: flex; }',
    '.fa-tilt .fa-tilt-car { width: 70px; height: 70px; flex: none; display: grid; place-items: center; border-radius: 50%; border: 2px solid rgba(242,237,227,0.22); }',
    '.fa-tilt .fa-tilt-car svg { width: 46px; height: 46px; transition: transform .08s linear; }',
    '.fa-tilt .fa-tilt-txt { display: flex; flex-direction: column; gap: 8px; font-family: var(--display); font-weight: 800; font-size: 18px; line-height: 1; }',
    '.fa-tilt .fa-tilt-txt button { pointer-events: auto; font: inherit; font-size: 14px; letter-spacing: 0.08em; padding: 9px 12px; border-radius: 999px; color: #111;' +
      ' background: var(--amber); border: 0; }',

    // --- steering picker (main menu and pause menu)
    '.fa-steer-pick { display: flex !important; align-items: center; gap: 10px; flex-wrap: wrap; margin: 6px 0 4px; font-family: var(--ui); }',
    '.fa-steer-pick > span { font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--dim); font-weight: 700; margin-right: 4px; }',
    // (the game's own menu-button styles are strong, so these are marked important)
    '.menu-list .fa-steer-pick button, .fa-steer-pick button { display: inline-flex !important; align-items: center !important; justify-content: center !important; width: auto !important;' +
      ' min-width: 96px !important; height: 46px !important; margin: 0 !important; padding: 0 18px !important; border-radius: 999px !important; border: 1.5px solid rgba(242,237,227,0.25) !important;' +
      ' background: rgba(9,11,15,0.55) !important; color: var(--ink) !important; font-family: var(--display) !important; font-weight: 800 !important; font-size: 19px !important;' +
      ' line-height: 1 !important; letter-spacing: 0.06em !important; text-transform: uppercase !important; text-decoration: none !important; opacity: 1 !important; cursor: pointer; }',
    '.menu-list .fa-steer-pick button.on, .fa-steer-pick button.on { background: var(--amber) !important; color: #111 !important; border-color: var(--amber) !important; }',
    '.fa-steer-pick button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }',

    // --- narrow / portrait screens: slightly smaller controls
    '@media (max-width: 700px) { body.kid #touch [data-k="left"], body.kid #touch [data-k="right"], body.kid #touch [data-k="down"] { width: 96px !important; height: 96px !important; }' +
      ' body.kid #touch [data-k="right"] { left: calc(var(--gx) + 116px) !important; } body.kid #touch [data-k="up"] { width: 96px !important; height: 128px !important; }' +
      ' body.kid #touch [data-k="down"] { right: calc(var(--gr) + 116px) !important; } body.kid #touch [data-k="nitro"], body.kid #touch [data-k="hb"] { width: 96px !important; }' +
      ' body.kid #touch [data-k="nitro"] { bottom: calc(' + B + ' + 148px) !important; } body.kid #touch [data-k="hb"] { right: calc(var(--gr) + 116px) !important; bottom: calc(' + B + ' + 116px) !important; }' +
      ' .fa-wheel { width: 168px; height: 168px; } }'
  ].join('\n');
  var style = document.createElement('style');
  style.setAttribute('data-family-arcade', 'kids-hud');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  /* ------------------------------------------------------------------ */
  /* Steering wheel                                                      */
  /* ------------------------------------------------------------------ */

  var WHEEL_SVG = '<svg viewBox="0 0 200 200" aria-hidden="true">' +
    '<circle cx="100" cy="100" r="88" fill="rgba(9,11,15,0.5)" stroke="rgba(242,237,227,0.85)" stroke-width="14"/>' +
    '<circle cx="100" cy="100" r="88" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>' +
    '<path d="M100 100 L24 112 M100 100 L176 112 M100 100 L100 186" stroke="rgba(242,237,227,0.8)" stroke-width="13" stroke-linecap="round"/>' +
    '<circle cx="100" cy="100" r="26" fill="#14161c" stroke="rgba(242,237,227,0.85)" stroke-width="5"/>' +
    '<rect x="92" y="8" width="16" height="16" rx="4" fill="#ffb23e"/>' +
    '</svg>';
  var MAX_TURN = 120; // degrees of wheel rotation for full lock

  function buildWheel() {
    var el = document.createElement('div');
    el.className = 'fa-wheel';
    el.setAttribute('role', 'slider');
    el.setAttribute('aria-label', 'Steering wheel');
    el.innerHTML = WHEEL_SVG;
    var svg = el.firstChild;
    var pointer = null, startPtr = 0, startRot = 0, rot = 0;
    var angleAt = function (e) {
      var r = el.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    };
    var show = function () {
      svg.style.transform = 'rotate(' + rot + 'deg)';
      steer = Math.max(-1, Math.min(1, -rot / MAX_TURN * 1.1)); // clockwise = right = negative in the game
    };
    el.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (pointer !== null) return;
      pointer = e.pointerId;
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      el.classList.add('held');
      startPtr = angleAt(e);
      startRot = rot;
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pointer) return;
      var d = angleAt(e) - startPtr;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      rot = Math.max(-MAX_TURN, Math.min(MAX_TURN, startRot + d));
      show();
    });
    var release = function (e) {
      if (e.pointerId !== pointer) return;
      pointer = null;
      el.classList.remove('held');
      rot = 0; // springs back to straight ahead
      show();
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', release);
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    return el;
  }

  /* ------------------------------------------------------------------ */
  /* Tilt steering                                                       */
  /* ------------------------------------------------------------------ */

  var CAR_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="13" y="6" width="22" height="36" rx="8" fill="#ffb23e"/>' +
    '<rect x="17" y="13" width="14" height="9" rx="3" fill="#14161c"/><rect x="17" y="29" width="14" height="6" rx="2" fill="#14161c" opacity=".6"/></svg>';
  var tiltCar = null;
  var TILT_FULL = 28; // degrees of tilt for full lock

  function screenAngle() {
    if (typeof window.orientation === 'number') return window.orientation;
    var a = screen.orientation && typeof screen.orientation.angle === 'number' ? screen.orientation.angle : 0;
    return a > 180 ? a - 360 : a;
  }
  // How far the iPad is turned like a steering wheel, in degrees (works upright or leaned back).
  function onOrientation(e) {
    if (e.beta === null || e.gamma === null) return;
    var b = e.beta * Math.PI / 180, g = e.gamma * Math.PI / 180;
    var gx = Math.cos(b) * Math.sin(g), gy = -Math.sin(b);       // gravity in device coordinates
    var a = screenAngle(), sx, sy;                                 // gravity in screen coordinates
    if (a === 90) { sx = -gy; sy = gx; } else if (a === -90) { sx = gy; sy = -gx; } else if (a === 180) { sx = -gx; sy = -gy; } else { sx = gx; sy = gy; }
    if (Math.abs(sx) + Math.abs(sy) < 0.25) return;                // lying flat: keep the last value
    tiltAngle = Math.atan2(sx, -sy) * 180 / Math.PI;
    if (tiltZero === null) tiltZero = tiltAngle;
    var d = tiltAngle - tiltZero;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    if (Math.abs(d) < 3) d = 0;                                    // a little dead zone for steady hands
    if (mode === 'tilt') steer = Math.max(-1, Math.min(1, -d / TILT_FULL));
    if (tiltCar) tiltCar.style.transform = 'rotate(' + (-steer * 35) + 'deg)';
  }
  var tiltListening = false;
  function startTilt(fromTap) {
    var go = function () {
      if (!tiltListening) { window.addEventListener('deviceorientation', onOrientation); tiltListening = true; }
      tiltZero = null;
      return true;
    };
    var DOE = window.DeviceOrientationEvent;
    if (!DOE) return Promise.resolve(false);
    if (typeof DOE.requestPermission === 'function') {
      if (!fromTap) return Promise.resolve(tiltListening);
      return DOE.requestPermission().then(function (r) { return r === 'granted' ? go() : false; }, function () { return false; });
    }
    return Promise.resolve(go());
  }
  function buildTilt() {
    var el = document.createElement('div');
    el.className = 'fa-tilt fa-pad';
    el.innerHTML = '<div class="fa-tilt-car">' + CAR_SVG + '</div><div class="fa-tilt-txt">TILT TO STEER<button type="button">STRAIGHT AHEAD</button></div>';
    tiltCar = el.querySelector('svg');
    el.querySelector('button').addEventListener('click', function () { tiltZero = tiltAngle; steer = 0; });
    return el;
  }

  /* ------------------------------------------------------------------ */
  /* Steering picker                                                     */
  /* ------------------------------------------------------------------ */

  var pickers = [];
  function tiltPossible() { return !!window.DeviceOrientationEvent && (navigator.maxTouchPoints || 0) > 0; }
  function setMode(m, fromTap) {
    if (m === 'tilt') {
      return startTilt(fromTap).then(function (ok) {
        if (!ok) { flash('Tilt isn’t available here. Using buttons.'); return setMode('buttons'); }
        apply('tilt');
      });
    }
    apply(m);
    return Promise.resolve();
  }
  function apply(m) {
    mode = m;
    steer = 0;
    try { localStorage.setItem(STORE, m); } catch (e) { /* ignore */ }
    document.body.classList.remove('fa-steer-buttons', 'fa-steer-wheel', 'fa-steer-tilt');
    document.body.classList.add('fa-steer-' + m);
    pickers.forEach(function (p) { p.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === m); }); });
  }
  function buildPicker() {
    var el = document.createElement('div');
    el.className = 'fa-steer-pick';
    var label = document.createElement('span');
    label.textContent = 'Steering';
    el.appendChild(label);
    MODES.forEach(function (m) {
      if (m[0] === 'tilt' && !tiltPossible()) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.mode = m[0];
      b.textContent = m[1];
      b.classList.toggle('on', m[0] === mode);
      b.addEventListener('click', function (e) { e.stopPropagation(); setMode(m[0], true); });
      el.appendChild(b);
    });
    pickers.push(el);
    return el;
  }
  function flash(msg) {
    try { if (typeof HUD !== 'undefined' && HUD.toast) { HUD.toast(msg); return; } } catch (e) { /* ignore */ } // eslint-disable-line no-undef
    console.warn(msg);
  }

  /* ------------------------------------------------------------------ */
  /* Wire up once the game's screens exist                               */
  /* ------------------------------------------------------------------ */

  function game() {
    try { if (typeof GAME !== 'undefined' && typeof KID !== 'undefined' && GAME.save) return { GAME: GAME, KID: KID }; } catch (e) { /* not ready */ } // eslint-disable-line no-undef
    return null;
  }

  var wired = false;
  var wasPlaying = false;
  function wire() {
    var touch = document.getElementById('touch');
    var mainNav = document.querySelector('#mainMenu .menu-list');
    var pauseNav = document.querySelector('#pause .menu-list');
    if (!touch || !mainNav || !pauseNav) return false;
    touch.appendChild(buildWheel());
    touch.appendChild(buildTilt());
    var nitro = touch.querySelector('[data-k="nitro"]');
    if (nitro) nitro.textContent = 'BOOST';
    // picker under the kids' drive buttons, and under Resume in the pause menu
    var afterDrives = mainNav.querySelectorAll('.fa-kid-drive');
    var mainPick = buildPicker();
    if (afterDrives.length) afterDrives[afterDrives.length - 1].after(mainPick); else mainNav.prepend(mainPick);
    var resume = document.getElementById('pResume');
    var pausePick = buildPicker();
    if (resume) resume.after(pausePick); else pauseNav.prepend(pausePick);
    // Tilt needs a tap to ask for motion access on iPad: if it was chosen last time, ask on the first tap.
    if (mode === 'tilt') {
      startTilt(false).then(function (ok) {
        if (ok) return apply('tilt');
        apply('tilt');
        var once = function () { document.removeEventListener('pointerdown', once, true); setMode('tilt', true); };
        document.addEventListener('pointerdown', once, true);
      });
    } else {
      apply(mode);
    }
    // straight ahead again whenever a drive starts or the game is paused
    document.addEventListener('visibilitychange', function () { steer = 0; });
    return true;
  }

  var tries = 0;
  var timer = setInterval(function () {
    // the kids menu (other add-on) adds its drive buttons first; wait a moment for them
    if (!wired && document.querySelector('#mainMenu .fa-kid-drive') || (!wired && ++tries > 300)) {
      wired = wire();
    }
    if (!wired) return;
    clearInterval(timer);
    setInterval(function () {
      var g = game();
      if (!g) return;
      var S = g.GAME.save.settings;
      document.body.classList.toggle('fa-big', S.kidLvl === 'big');
      var auto = false;
      try { auto = g.KID.autoGas(); } catch (e) { auto = false; }
      document.body.classList.toggle('fa-autogas', auto);
      var playing = g.GAME.state === 'play';
      if (!playing && mode === 'wheel') steer = 0;
      // Tilt: whatever way the iPad is held when a drive starts or resumes counts as straight ahead.
      if (playing && !wasPlaying && mode === 'tilt') { tiltZero = null; steer = 0; }
      wasPlaying = playing;
    }, 300);
  }, 100);
})();
