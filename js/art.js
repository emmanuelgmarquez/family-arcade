// Generated cartridge art for games without a cover image.

export const PALETTE = [
  '#ff3d8b', '#ff7a1a', '#ffc400', '#3ddc84', '#00d6c8', '#2fa8ff',
  '#7c5cff', '#c04bff', '#ff5d5d', '#8bd450', '#ff9ecf', '#5ee7ff'
];

export const EMOJIS = [
  '🎮', '🕹️', '👾', '🚀', '🛸', '🪐', '⭐', '🌈', '🐍', '🐸', '🦖', '🐉',
  '🐱', '🐶', '🦄', '🐠', '🏎️', '⚽', '🏀', '🎯', '🧩', '🃏', '♟️', '🎲',
  '🏰', '⚔️', '🧙', '👻', '🤖', '💎', '🍕', '🍄', '🎨', '🎵', '🔥', '❄️'
];

const KEYWORDS = [
  [/space|galax|star|astro|alien|invader|asteroid|rocket|orbit/i, '🚀'],
  [/snake|serpent/i, '🐍'], [/frog|toad/i, '🐸'], [/dino|rex/i, '🦖'], [/dragon/i, '🐉'],
  [/cat|kitty|kitten/i, '🐱'], [/dog|puppy/i, '🐶'], [/unicorn|pony/i, '🦄'], [/fish|ocean|sea|shark/i, '🐠'],
  [/race|racing|car|kart|drive|speed/i, '🏎️'], [/soccer|football/i, '⚽'], [/basket/i, '🏀'],
  [/target|archer|shoot|aim/i, '🎯'], [/puzzle|tetr|block|match|jigsaw/i, '🧩'], [/card|solitaire|poker/i, '🃏'],
  [/chess|checkers/i, '♟️'], [/dice|yahtzee|board/i, '🎲'], [/castle|kingdom|tower/i, '🏰'],
  [/sword|knight|battle|war|fight/i, '⚔️'], [/wizard|magic|spell/i, '🧙'], [/ghost|haunt|spooky|pac/i, '👻'],
  [/robot|bot|mech/i, '🤖'], [/gem|jewel|diamond|treasure/i, '💎'], [/pizza|food|cook/i, '🍕'],
  [/music|rhythm|beat|piano|song/i, '🎵'], [/paint|draw|color|art/i, '🎨'], [/fire|lava/i, '🔥'],
  [/snow|ice|winter|frozen/i, '❄️'], [/bird|flap|fly/i, '🐦'], [/word|spell|letter|type/i, '🔤'],
  [/math|number|count/i, '🔢'], [/memory|brain|quiz|trivia/i, '🧠'], [/maze|labyrinth/i, '🌀'],
  [/jump|platform|run/i, '🏃'], [/pong|tennis|ball/i, '🏓'], [/brick|breakout/i, '🧱']
];

export function suggestEmoji(text) {
  for (const [re, emoji] of KEYWORDS) if (re.test(text || '')) return emoji;
  return '🎮';
}

export function colorFor(text) {
  let h = 0;
  for (const ch of String(text || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const n = m ? parseInt(m[1], 16) : 0x7c5cff;
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
  }
  return [Math.round(hue), Math.round(s * 100), Math.round(l * 100)];
}

/** CSS background for a cartridge tile in the game's color. */
export function tileBackground(color) {
  const [hh, s] = hexToHsl(color);
  const sat = Math.max(55, s);
  return [
    `radial-gradient(110% 80% at 18% 8%, hsla(${hh}, ${sat}%, 78%, .55), transparent 55%)`,
    `radial-gradient(90% 70% at 100% 100%, hsla(${(hh + 40) % 360}, ${sat}%, 45%, .65), transparent 60%)`,
    `linear-gradient(150deg, hsl(${hh}, ${sat}%, 52%), hsl(${(hh + 330) % 360}, ${Math.min(90, sat)}%, 22%))`
  ].join(',');
}

const coverUrls = new WeakMap();
/** Object URL for a stored cover Blob (cached per Blob). */
export function coverUrl(blob) {
  if (!blob) return null;
  let u = coverUrls.get(blob);
  if (!u) { u = URL.createObjectURL(blob); coverUrls.set(blob, u); }
  return u;
}

/** Softer variant used for the ambient background glow. */
export function glowColors(color) {
  const [hh, s] = hexToHsl(color);
  const sat = Math.max(60, s);
  return [`hsl(${hh}, ${sat}%, 50%)`, `hsl(${(hh + 50) % 360}, ${sat}%, 45%)`, `hsl(${(hh + 300) % 360}, ${sat}%, 40%)`];
}
