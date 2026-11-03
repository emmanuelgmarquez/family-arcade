# Aurora Bay

A cozy, single-player Arctic village for the family iPad. Each child has their own animal, igloo,
coins, pets, quests and minigame records. Everything is original art drawn in code, all sound is
synthesised in the browser, and nothing is downloaded from the internet.

## Playing it

**In Family Arcade (recommended).** Aurora Bay ships as a pre-installed cartridge in `games/aurora-bay/`.
After `node tools/build-games.mjs` and `node tools/bump-version.mjs`, upload `www/` as usual; installed
iPads pick it up on their next launch while online and play it offline from then on.

**On its own.** Serve this folder from any static web server and open `index.html`
(e.g. `npx serve games/aurora-bay` or `python3 -m http.server` inside the folder). Opening the file
directly from disk mostly works, but browsers restrict storage for `file://` pages, so use a server
for real play.

## Controls

| | Touch / mouse | Keyboard |
|---|---|---|
| Walk | Tap the snow | Arrow keys or WASD |
| Use a door / talk / tap a thing | Tap it (the character walks there first) | Walk close, then Enter or Space |
| Map, bag, journal, home | Toolbar, top right | M, B (or I), J (or Q), H |
| Close a window | ✕ | Esc |
| Minigames | Shown on each game's picture tutorial | Arrows + Space/Enter; Esc pauses |
| Decorating | Tap a thing in the tray to add it, drag to move, Flip / Turn / Put away buttons | Arrows nudge, F flip, R turn, Delete puts away, Enter = Done |

While decorating the character can't move, so dragging furniture never sends anyone walking.

## Saving — what to know

- Saves live **only on this device**, in the browser's IndexedDB (database `aurora-bay`), with a copy of each
  child's save mirrored to localStorage. The mirror is written synchronously, so closing the app mid-step
  doesn't lose progress, and it means Family Arcade's own *Back up saves* includes Aurora Bay.
- Every change saves straight away (purchases, coins, quest steps, furniture moves) and again when the app is
  hidden. A save only ever writes the child who is playing.
- **Back up from inside the game:** Settings → Grown-ups (type the number and hold the button) → *Back up all
  players*. On iPad this opens the Share sheet — save the file to Files / iCloud Drive. *Restore from backup*
  shows exactly which players will be replaced or added before anything changes.
- Reset and Delete are behind the same grown-up gate, ask for confirmation, and keep a one-step undo.
- Limits: clearing Safari website data, deleting the Home Screen app, or iPadOS reclaiming space under heavy
  storage pressure can erase browser storage. Home Screen web apps are exempt from Safari's 7-day cleanup and
  the game asks for persistent storage, but an occasional backup is still the safe habit.

## Code map

```
index.html            loads everything (plain scripts, no build step)
css/style.css         menus & HUD
js/core.js            AB namespace, maths, events, registries (scenes, minigames)
js/art.js             illustration kit (shapes, trees, igloos, fish, mugs…)
js/scenekit.js        scene painting helpers (sky, ground, paths, buildings, rooms)
js/icons.js           one icon set for HTML and canvas
js/characters.js      6 species × colours, movement styles, clothes that fit every species
js/furniture.js       46 furniture items + wall / floor / window styles
js/pet-art.js         4 pet companions with moods
js/store.js           IndexedDB + localStorage mirror, migrations, export / import, undo
js/game.js            the active child's state: coins, buying, outfits, pets, records
js/world.js           walking (A* pathfinding), depth sorting, villagers, footprints, particles
js/scenes/*.js        one file per location
js/villagers.js       named villagers and their chat
js/quests.js          quests, pickups, hints, hidden glimmer stones
js/minigames/*.js     Ice Fishing, Sled Run, Cocoa Café (shared contract, see below)
js/minigame-shell.js  tutorial cards → play → pause/exit → results → coins
js/ui.js, ui-shop.js  menus, map, bag, journal, settings, parent gate, shop, pets
js/decorate.js        igloo decorating
js/main.js            boot, frame loop, input routing, travel
test/                 development harnesses and automated checks (not part of the cartridge)
```

### Adding things later

- **A location:** copy a file in `js/scenes/`, give it an `id`, add a `<script>` line to `index.html`, and point an
  existing scene's hotspot at it with `AB.go('<id>', '<fromId>')`. `test/scene-harness.html?scene=<id>&debug=1`
  shows its walkable area, hotspots and spots.
- **An animal:** add an entry to `AB.chars.species` in `characters.js` (palettes, anchors for hats / glasses /
  scarves, a body path for sweaters, a draw function, a movement style). Clothes fit automatically.
- **Furniture:** add an entry to `AB.furniture` with `name, price, cat, place, w, h, draw(ctx, o)`; it appears in
  the shop and the decorating tray.
- **A quest:** add a definition to `Q.defs` in `quests.js` and its id to `Q.ORDER`; put any item spots in the
  scene's `questSpots`.
- **A minigame:** `AB.registerMinigame({ id, title, tutorial: [...], create(host) })` — see
  `test/MINIGAME_BRIEF.md` for the contract — then call `AB.playMinigame('<id>')` from a hotspot or villager.
