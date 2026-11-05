# Family Arcade

A console-style game library for the family iPad. It holds the HTML5/JavaScript games you've made in Claude, plays each one full-screen, keeps every game's saves separate, and works with no internet once installed. No accounts, ads, subscriptions or tracking — everything lives on the device.

There is no build step. The `www/` folder *is* the app.

```
www/                  ← the app (also Capacitor's webDir)
  index.html          home screen shell
  sw.js               offline engine: caches the app, serves games, injects the runtime
  runtime/game-shim.js  loaded into every game: per-game saves, pause, return-to-arcade API
  js/                 app code (ES modules)
    app.js            home screen, import review, game options, settings
    importer.js       ZIP/HTML → analysis → install
    player.js         full-screen player, return button, pause menu
    touch-controls.js on-screen D-pad / A / B / Start for keyboard-only games
    storage/          swappable storage backends (web = PWA, native = Capacitor)
  games/catalog.json  optional pre-installed games (empty by default)
samples/              two self-test cartridges for checking an install (not real games)
tools/                serve.mjs (local server), bump-version.mjs (release helper)
```

## Try it on a computer

```bash
node tools/serve.mjs        # → http://localhost:8080
```

Import `samples/arcade-test-saves.html` and `samples/arcade-test-assets.zip` to see saves, touch controls, pause and offline play working.

## Install it on the iPad

Service workers (the offline engine) need HTTPS, so the `www/` folder has to be served from an https:// address once. Any free static host works — GitHub Pages, Netlify, Cloudflare Pages. Upload the **contents** of `www/`.

1. Open the address in **Safari** on the iPad.
2. Tap **Share → Add to Home Screen**.
3. Open Family Arcade from the Home Screen. It runs full-screen, landscape, and fully offline from then on. The host only matters for the first visit and for app updates.

Games you import are stored on the iPad, not on the host.

## Adding games

Tap **+**, then choose files from the Files app:

- **One-file game** → the `.html` file.
- **Multi-file game** (images, sounds, scripts) → a `.zip` of its folder. In Files: press and hold the folder → **Compress**.
- **Several at once** → select multiple files; each becomes a game.

The importer finds the start page (`index.html`, or the best guess), reads the name from `<title>`, picks up a cover image if there is one, and suggests an emoji and color. You can change all of that before adding.

**Updating a game:** import the new version with the same name (or Options → *Update game…*). Saves carry over. Choose *Add as a separate game* to keep both copies with separate progress.

**Online libraries:** if a game loads Three.js, Phaser, Tone.js, Google Fonts, etc. from a CDN, import it while online and those files are saved for offline play automatically (including fonts referenced by CSS and nested ES-module imports). The game's code isn't changed — the offline engine answers those URLs from its cache. Games that need live services (multiplayer, accounts, live APIs) are flagged and won't work offline.

### Optional `arcade.json`

Put this next to `index.html` inside a ZIP to control the details:

```json
{
  "id": "space-blaster",
  "title": "Space Blaster",
  "description": "Dodge the asteroids!",
  "entry": "index.html",
  "cover": "cover.png",
  "emoji": "🚀",
  "color": "#2fa8ff",
  "orientation": "landscape",
  "controls": { "dpad": "arrows", "a": "Space", "b": "Enter", "start": "Escape" }
}
```

`id` is what saves are attached to — keep it stable across versions. `controls` can also be `"none"`.

For pre-installed games in `games/`, `"exclude": ["test/", "notes.md"]` leaves development files (folders end in `/`) out of the cartridge that `tools/build-games.mjs` builds.

## How the pieces work

**Original code is preserved.** Game files are stored byte-for-byte. When a game page is served, the offline engine adds one `<script>` tag (the runtime) in front of it. Nothing on disk is rewritten.

**Separate saves per game.** The runtime transparently namespaces `localStorage`, `sessionStorage`, IndexedDB and Cache Storage per game (`fa:g:<id>:…`), so two games that both save `"highscore"` never collide. Claude artifact games that use `window.storage.get/set/delete/list` get an offline, per-game version of that API. Options → *Reset progress* clears one game; Settings → *Back up saves* exports every game's localStorage saves to a JSON file.

**Pause & return.** The floating ⌂ button (drag it to any corner) opens a pause menu: Resume, Restart, show/hide touch controls, Back to Arcade. Pausing freezes `requestAnimationFrame`, suspends Web Audio and media, and reports the page as hidden — so games that save on "page hidden" save before you leave, and there's no time jump on resume. Games can also call `FamilyArcade.exit()` or `FamilyArcade.openMenu()`; `window.close()` returns to the arcade.

**Touch controls.** For keyboard-only games the importer detects which keys the code listens for and turns on an on-screen D-pad (arrows or WASD) plus A/B/Start buttons. Presses become real keyboard events inside the game (with correct `key`, `code` and `keyCode`). Adjust per game in Options.

**Controllers & keyboards.** Paired game controllers navigate the home screen (D-pad, A = play, Y = options, X = add game, Start = settings) and Home (or Select+Start) opens the pause menu in-game. Hardware keyboards: ← → Enter, O, I.

**Games can't break the arcade.** The runtime blocks games from registering or unregistering service workers, since that would knock out offline mode.

## Releasing an update to the arcade itself

After editing anything in `www/`:

```bash
node tools/bump-version.mjs   # refreshes sw.js's file list + version hash
```

Upload `www/` again. Installed iPads show *"A new version of Family Arcade is ready → Update"* the next time they're online. Imported games and saves are untouched.

## The family's games (pre-installed)

The arcade ships with twelve games made in Claude. Each lives in `games/<id>/` with its original files copied byte-for-byte from the published artifact, plus an `arcade.json` (title, icon, color, cover, controls) and a `cover.png` captured from the game's own title screen.

| Game | Notes |
|---|---|
| Brine Bite, Eight Gates, Hop Highway, Mesa Run, Vellmark Tamer | Built-in touch controls |
| Ricochet Duel | Two players, built-in touch pads |
| Slipstream Duel | Two players: the arcade adds a D-pad on each side (left = Player 2 / WASD, right = Player 1 / arrows) |
| The Star Compass | Point and tap; its own offline helper is switched off (the arcade handles offline) |
| Midnight Meridian Kids | Kid mode only (see below) |
| Snugglewood Pets | Pet care for several kids: each player has their own pets, saved in the game's own storage. Its in-game **Grown-ups** area (behind a times-table question) backs up and restores pets; the arcade's *Back up saves* doesn't include them, because they're in IndexedDB. The game moves its buttons out of the way of the ⌂ return button in whichever corner it's in. |
| Aurora Bay | Cozy Arctic village with a separate save for each child; see `games/aurora-bay/README.md` |
| Sprint Stars | Speed platformer: five worlds with two acts and a boss each, Bolt the fox or Rosie the red panda (press jump in mid-air to fly with her spinning tail), three save slots. Built-in touch controls (floating D-pad, JUMP, SPIN); its HUD and buttons move out of the way of the ⌂ return button in whichever corner it's in, and its own offline helper is switched off inside the arcade. |

**Midnight Meridian Kids.** Only the kids' driving game is included: the cartridge leaves out the 150 MB real-Utah map data (so the game uses its city world) and adds `family-arcade-kids.js`, listed under `"inject"` in its `arcade.json`. The arcade loads that file before the game. It keeps the game's Kid mode on and replaces the main menu with **Drive · Little Racer** (ages 6–8) and **Drive · Big Kid** (ages 9–12), hiding Legacy Mode, the story, race events and the world switch. A second add-on, `family-arcade-kids-hud.js`, redesigns the driving screen for small hands: steering in the bottom-left corner, big GAS / BRAKE pedals in the bottom-right (GAS shows AUTO when the car drives itself; DRIFT appears for Big Kid only), the minimap moved to the top-left and a smaller speedometer in the top-right, so no control covers the HUD. Steering can be **Buttons**, a draggable **Wheel**, or **Tilt** (turn the iPad like a wheel; the iPad asks for motion access on first use, and *Straight ahead* re-centres it). The choice is on the main menu and the pause menu and is remembered. Wheel and tilt steer through the game's own game-controller input, so Kid mode's steering help still applies. The game's own `index.html` is unchanged.

Games that load libraries from a CDN (Three.js, JSZip) or Google Fonts get those saved for offline play when the iPad installs them.

To change or add a pre-installed game, edit its folder in `games/`, then:

```bash
node tools/build-games.mjs     # zips games/* into www/games/ and updates catalog.json
node tools/bump-version.mjs
```

Installed arcades pick up new or changed games on their next launch while online (saves are kept). A game the family removes isn't re-added.

## Packaging for iPad with Capacitor (later)

The app is already laid out for Capacitor (`capacitor.config.json`, `webDir: "www"`). WKWebView in Capacitor apps doesn't run service workers, so game storage is behind an interface with two backends:

| | Web app (now) | Capacitor app (later) |
|---|---|---|
| Game files | Cache Storage | App Data folder via `@capacitor/filesystem` |
| Loading a game | `play/<id>/…` served by `sw.js` | iframe `srcdoc` with a `<base href>` to the game folder |
| Runtime injection | by `sw.js` | by `js/storage/native-store.js` |
| Saves, pause, touch controls | same runtime | same runtime |
| CDN library capture | yes | no — bundle libraries inside the ZIP |

`js/storage/index.js` picks the backend automatically. To build:

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/filesystem
npx cap add ios
npx cap sync
npx cap open ios       # set landscape-only orientations in Xcode, then run on the iPad
```

The native backend is written against the Capacitor 6/7 Filesystem API but **has not been run on a device yet** — expect to test and adjust it during that step. Games that build URLs from `location.href` may need attention under `srcdoc`.

## Known limits

- **React/JSX artifacts** (`.jsx`) need to be exported as HTML first; the importer explains this if one is chosen.
- **Save backups** cover localStorage (what most small games use). Games that save only to IndexedDB keep separate, working saves but aren't included in the backup file.
- **iPadOS storage:** installed Home Screen apps aren't subject to Safari's 7-day data cleanup, and the arcade requests persistent storage, but backing up saves occasionally is still wise.
- **Orientation:** iPadOS doesn't let web apps lock rotation, so landscape is a manifest hint plus a "turn your iPad" prompt for games marked landscape. Capacitor can lock it for real.
