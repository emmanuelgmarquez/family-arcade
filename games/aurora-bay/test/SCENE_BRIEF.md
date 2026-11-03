# Aurora Bay — scene brief (building one or more locations)

Aurora Bay is a cozy single-player Arctic village game for kids 4–8 on iPad (landscape), with the charm of an
early-2000s virtual world but fully original. Project root: `/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/`.
You write ONLY the scene files you are assigned: `js/scenes/<id>.js` (scratch files under `test/scratch-<id>/`).

## Read first
- `js/scenes/town.js` — THE reference scene. Match its quality, density and structure exactly.
- `js/scenekit.js` (AB.kit: skyAndMountains, treeline, snowGround, path, cobbles, roof, building, smoke, stringLights, fence, room, exitMat)
- `js/art.js` (AB.art: shapes, pine, drift, rock, window, door, lampPost, bench, igloo, sign, fish, mug, shell, gem, pinecone, tracks, glow, sparkle, SnowField, aurora…)
- `js/icons.js` (icon names for badges: door, left, right, up, down, home, mug, shop, shirt, sofa, paw, fish, sled, bell, bench, skate, star, eye, sparkle, talk, map)
- `js/characters.js` — characters are ~100 units tall at scale 1 (scaled by the scene's `depth`).
- `js/furniture.js` — AB.furniture[id].draw(ctx, {t}) (origin = base centre) — handy for interiors.
- `js/pet-art.js` — AB.pets.draw(ctx, x, y, {kind, color}, {t, mood}) — for the Pet Lodge.

## Scene definition (logical canvas 1280×900, no scrolling)
```js
AB.registerScene({
  id, name, music, ambient, outdoor, snow, footprints, aurora,
  map: { x, y, icon } | null,        // position on the 1000×625 island map (null for interiors)
  depth: [yFar, scaleFar, yNear, scaleNear],
  paint(ctx, w, h),                  // static background, baked once at 2×. Put ALL static art here.
  paintFront(ctx, w, h),             // optional static foreground drawn OVER characters (e.g. a counter front, a foreground snowbank)
  animate(ctx, t),                   // animated background bits (water, smoke, lights, fire, drifting ice). Called every frame — keep it light.
  overlay(ctx, t),                   // optional animated foreground bits
  walk: [[x,y],...],                 // walkable floor polygon
  blocks: [{e:[cx,cy,rx,ry]} | {r:[x,y,w,h]} | {p:[[x,y],...]}],   // obstacles inside the walk polygon
  spawns: { default:[x,y], <fromSceneId>:[x,y] },                    // must be walkable
  hotspots: [{ id, hit:[x,y,w,h], at:[x,y], icon, badge:[x,y], action: function () {} }],  // doors, exits, activities ('at' = walkable spot the player walks to first)
  props: [{ x, y, draw(ctx, t, prop), hit:[x,y,w,h], at:[x,y], tap(prop) }],                 // y-sorted with characters by prop.y; tappable if hit+tap
  npcSpots: { <villagerId>: { at:[x,y], wander:[x,y,w,h] | null, dir: 1|-1 } },             // where villagers stand (walkable)
  questSpots: { <spotId>: [x,y] },                                                          // where quest items appear (walkable, reachable)
  update(dt)                         // optional per-frame logic
});
```
Things that stand in the walk area and that characters walk behind/in front of (trees, lamps, benches, barrels,
tables, the counter, boats on the dock…) must be PROPS (y-sorted), not painted into the background, and need a
matching `block`. Background art (buildings at the back, sky, water, floors) goes in `paint`.

## Runtime APIs you may call from actions/taps (all exist at runtime; the harness stubs them)
- `AB.go(sceneId, fromSceneId)` — travel. The destination spawns the player at `spawns[fromSceneId]`.
- `AB.playMinigame('fishing' | 'sled' | 'cocoa')`
- `AB.ui.openCatalog('clothes' | 'furniture')`, `AB.petsUI.openAdopt()`
- `AB.quests.event('tap', spotId)` — tell the quest system a quest-relevant prop was tapped
- `AB.quests.revealGem(key, x, y)` — call from a fun tap (first time reveals a hidden glimmer stone at x,y). Each scene must have exactly 2 gem triggers with keys `gem_<sceneId>_1`, `gem_<sceneId>_2`, hidden in delightful places (a tap on a barrel, a telescope, the fireplace…).
- `AB.world.burst(x, y, 'snow'|'heart'|'star'|'sparkle'|'note', n)`, `AB.world.particles.push({k:'snow',x,y,vx,vy,t:0,life,r})`
- `AB.world.player` (`.x .y .dir .pose ('sit'|'happy'|'wave') .poseUntil .skate`), `AB.world.t`, `AB.audio.sfx(name)` (tap, snow, bell, splash, pop, jump, door, sparkle, soft, ding, chirp, whoosh)
- To make the player sit: `var p = AB.world.player; p.x = X; p.y = Y; p.pose = 'sit'; p.poseUntil = AB.world.t + 6;`

Every location needs small delightful reactions (tap a tree → snow falls, ring something, sit on a bench, a curious
animal peeks out…). Nothing tappable should do nothing. No buttons or doors that lead nowhere.

## Art direction
Cozy blue-hour Arctic: deep blue sky with stars and aurora (outdoors), bright snow, warm glowing windows, string
lights. Navy outlines (A.C.out, lw ~3), one shade shape per object, white highlights, soft blue shadows.
Interiors are warm (wood, fireplace glow, rugs) with a vignette (AB.kit.room). Interiors have the exit door at
the BOTTOM centre (a doormat via AB.kit.exitMat at about (640, 860)), hotspot id `exit`, icon `door`.
Each location must feel distinct. Use text sparingly (one sign word at most). Keep the top-left 120×120 and the
top-right 440×90 corners free of important tappable things (HUD lives there).

## Testing (required)
`test/scene-harness.html?scene=<id>` renders the scene with a sample character at the default spawn and at each
npcSpot; add `&debug=1` to overlay the walkable grid, blocks, hotspots, prop hit boxes, spawns, npcSpots and
questSpots; `&t=3` sets time. Render with Python Playwright + system Chrome:
```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1280,'height':900})
    pg.goto('file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scene-harness.html?scene=lake&debug=1')
    pg.wait_for_timeout(500); pg.screenshot(path='/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/scratch-lake/dbg.png')
```
Look at the screenshots with the Read tool; iterate until it's beautiful and the walk grid is continuous (every
spawn, hotspot `at`, npcSpot and questSpot sits on green and is connected to the others), no console errors.
Reply with: ids, hotspot ids/actions, npcSpots, questSpots, gem keys and where they hide, and known issues.
