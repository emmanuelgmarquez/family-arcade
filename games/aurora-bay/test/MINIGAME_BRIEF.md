# Aurora Bay — minigame brief (for building one minigame)

Aurora Bay is a cozy single-player Arctic village game for kids aged 4–8 on an iPad (landscape),
inspired by the charm of classic early-2000s virtual worlds but fully original. Project root:
`/home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/`.

You build exactly ONE file: `js/minigames/<id>.js`. Do not edit any other file in the project
(you may create scratch files under `test/scratch-<id>/`).

## Files you can use (read them first)
- `js/core.js` — `AB.util` (clamp, lerp, rand, pick, ease, seeded rng, shade/alpha colours), `AB.W=1280`, `AB.H=900`.
- `js/art.js` — the illustration kit. USE IT. `AB.art.C` palette, `A.ellipse/circle/box/poly/shape/line/fs`,
  `A.shadow`, `A.glow`, `A.highlight`, `A.star`, `A.heart`, `A.snowflake`, `A.coin`, `A.sparkle`, `A.sky`,
  `A.aurora`, `A.SnowField`, `A.pine`, `A.drift`, `A.rock`, `A.fish(ctx,x,y,s,kind,t)` (kinds: sunny, bluegill,
  rosy, mint, gold, star), `A.mug(ctx,x,y,s,color,topping)` (toppings: 'cream','marsh','sprinkles'),
  `A.bake(w,h,scale,fn)` for caching static backgrounds, `AB.FONT` for any text.
- `js/characters.js` — `AB.chars.draw(ctx, x, y, look, {t, moving, dir, pose:'stand'|'wave'|'happy'|'sit', scale})`
  draws the child's own animal (penguin, fox, bear, seal, owl, hare) with feet at (x, y). Use `host.look`.
  Characters are ~100 units tall at scale 1.

## House art style (must match)
Flat cartoon shapes, navy outline `A.C.out` (#26324d, lineWidth ~3), one darker shade shape per object, small
white highlight, soft blue oval ground shadows. Cozy blue-hour palette: snow `#f5f9ff`, shade `#cddbf2`, ice
`#c4ebf7`, warm window light `#ffd37a`. Polished and illustrated — NOT emoji, NOT bare rectangles/circles.
Draw every object with the kit (outlined, shaded). Cache static backgrounds with `A.bake` (scale 2).

## The contract
```js
AB.registerMinigame({
  id: '<id>',
  title: 'Ice Fishing',
  // 2–3 animated picture cards shown before play; the shell renders each in a ~360×240 box.
  // Pictures must explain the game without reading (the caption is 2–5 words and is also read aloud).
  tutorial: [ { caption: 'Tap to drop your line', draw: function (ctx, w, h, t) { /* animated demo */ } } ],
  create: function (host) {
    return {
      update: function (dt) {},          // seconds, capped at 0.05. Not called while paused.
      draw: function (ctx, t) {},        // ctx already transformed to 1280×900 logical units (clipped)
      pointer: function (type, x, y) {}, // 'down' | 'move' | 'up', logical coords
      key: function (type, key) {},      // 'down' | 'up', KeyboardEvent.key
      destroy: function () {}
    };
  }
});
```
`host` gives you:
- `host.W`, `host.H` (1280, 900), `host.look` (the child's character), `host.records` = `{ best, plays }` (read-only),
- `host.sfx(name)` with names: `tap, coin, splash, success, oops, whoosh, pop, bell, star, catch, slurp, ding, jump`,
- `host.safeTop` = 110: the shell puts a round PAUSE button in the top-left 110×110 corner (and Exit lives in the
  pause menu). Keep important gameplay and your HUD out of that corner (put your HUD top-centre / top-right).
- `host.finish(result)` — call ONCE when the round ends. The shell shows the results screen, awards coins, saves.
  `result = { score: <number>, coins: <int>, stats: [ { icon: 'fish'|'star'|'mug'|'flake'|'coin'|'time', label: 'Fish', value: 7 } ] }`

## Rules for the game itself
- Ages 4–8: forgiving, no fail states that end the round early, no fast reading. Numbers & pictures only in the HUD.
- A round lasts 60–90 seconds (show a friendly picture timer, e.g. a sun/snowflake ring, not just digits).
- Difficulty starts slow and increases gently.
- Coins: participation minimum 15; an average round for a 5-year-old ≈ 35–50; a great round ≤ 120.
  (Cheapest shop items cost 10–20, so one or two rounds must buy something.) Compute coins from score in the game.
- Touch AND keyboard (arrows / space / enter) must both work. Big touch targets (≥ 90 logical units).
- Give juicy feedback: particles, little pops, stars, the child's character reacting (pose 'happy' on success).
- No external images, fonts, or network. Everything procedurally drawn.
- Must not throw. Must keep running if `host.sfx` does nothing.

## Testing (required)
A harness exists: `test/minigame-harness.html?game=<id>&species=hare` (also `&tut=1` to preview tutorial cards).
It exposes `window.__inst`, `window.__result`, `window.__sfx`, `window.__paused`.
Use Python Playwright with system Chrome:
```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width':1180,'height':820}, has_touch=True)
    pg.goto('file:///home/claude/emmanuelgmarquez/family-arcade/games/aurora-bay/test/minigame-harness.html?game=<id>')
```
Take screenshots (save under `test/scratch-<id>/`) and LOOK at them with the Read tool; iterate on the art until
it's genuinely charming. Simulate input (mouse/touch/keyboard), play a full round to the end (you can speed up
by calling `__inst.update(0.05)` in a loop via `pg.evaluate`), confirm `__result` has sane coins, and that there are
no console errors. Test with at least two species.

When done, reply with: a 5–10 line summary of mechanics, controls, coin formula, and any known issues.
