/*
 * Family Arcade add-on for Midnight Meridian: the kids' driving game only.
 *
 * Loaded by the arcade before the game (see "inject" in arcade.json). The game's own
 * index.html is unchanged; this only uses the game's built-in Kid mode:
 *   - Kid mode is always on (the car drives itself, smash street lights, police chases are tag).
 *   - The main menu shows two choices: Little Racer (6-8) and Big Kid (9-12).
 *   - Legacy Mode, the story, race events and the real-Utah world are hidden.
 *     (The real-Utah map data isn't included in this cartridge, so the game uses its city world.)
 */
(function () {
  'use strict';

  var LEVELS = {
    little: { name: 'Little racer', label: 'Little Racer', ages: 'Ages 6–8 · slower, lots of steering help' },
    big: { name: 'Big kid', label: 'Big Kid', ages: 'Ages 9–12 · faster, you do more of the steering' }
  };

  var style = document.createElement('style');
  style.setAttribute('data-family-arcade', 'kids');
  style.textContent = [
    // main menu: only the two kid drives (plus Garage, Settings, Controls)
    '#mDream, #mKid, #mPlay, #mWorld, #mNew, #mEvents, #menuStory { display: none !important; }',
    // pause menu: no races, no Legacy Mode
    '#pEvents, #pDream, #pLegacy, #pQuit, #pRestart { display: none !important; }',
    // settings: kid mode can't be switched off
    '#settings .row:has(#setKid) { display: none !important; }',
    '.fa-kid-drive { display: flex !important; flex-direction: column; align-items: flex-start; gap: 4px; }',
    '.fa-kid-drive strong { font-size: 1.25em; }',
    '.fa-kid-drive small { opacity: .75; font-size: .8em; font-weight: 500; letter-spacing: 0; text-transform: none; }'
  ].join('\n');
  (document.head || document.documentElement).appendChild(style);

  function game() {
    try {
      // The game's top-level consts are shared with other scripts on the page.
      /* global GAME, KID */
      if (typeof GAME !== 'undefined' && typeof KID !== 'undefined' && GAME.save && GAME.save.settings) return { GAME: GAME, KID: KID };
    } catch (e) { /* not ready */ }
    return null;
  }

  // Kid mode on, without the game's "Kid mode on" pop-up.
  function ensureKidMode(g) {
    var S = g.GAME.save.settings;
    if (S.kidLvl !== 'big') S.kidLvl = 'little';
    if (!S.kid) {
      S.kid = true;
      try { g.GAME.persist(); g.GAME.applyPerf(); } catch (e) { /* ignore */ }
    }
    try { g.KID.label(); } catch (e) { /* ignore */ }
  }

  function chooseByMenuButton(level) {
    // Fallback that only uses the game's own Kid mode button (Off → Little racer → Big kid → Off).
    var mk = document.getElementById('mKid');
    for (var i = 0; i < 4 && mk && mk.textContent.indexOf(LEVELS[level].name) === -1; i++) mk.click();
  }

  function drive(level) {
    var g = game();
    if (g) {
      ensureKidMode(g);
      g.GAME.save.settings.kidLvl = level;
      try { g.GAME.persist(); g.KID.setLevel(); } catch (e) { /* ignore */ }
    } else {
      chooseByMenuButton(level);
    }
    var play = document.getElementById('mPlay');
    if (play) play.click(); // the game's own "drive" button (in Kid mode it's free driving, no story)
  }

  function addMenu(g) {
    var nav = document.querySelector('#mainMenu .menu-list');
    if (!nav || nav.querySelector('.fa-kid-drive')) return;
    ['little', 'big'].forEach(function (level, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'fa-kid-drive';
      b.innerHTML = '<strong>Drive · ' + LEVELS[level].label + '</strong><small>' + LEVELS[level].ages + '</small>';
      b.addEventListener('click', function () { drive(level); });
      nav.insertBefore(b, nav.children[i] || null);
    });
  }

  var tries = 0;
  var timer = setInterval(function () {
    var g = game();
    var menuReady = document.getElementById('mPlay') && document.getElementById('mKid');
    if (g && menuReady) {
      ensureKidMode(g);
      addMenu(g);
      clearInterval(timer);
      // Keep Kid mode on for the whole session (e.g. if a setting somewhere turns it off).
      setInterval(function () { var gg = game(); if (gg && !gg.GAME.save.settings.kid) ensureKidMode(gg); }, 2000);
    } else if (++tries > 600 && menuReady) {
      addMenu(null); // game globals not reachable: use the menu-button fallback
      clearInterval(timer);
    }
  }, 100);
})();
