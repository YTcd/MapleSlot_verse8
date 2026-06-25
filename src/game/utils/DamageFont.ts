import Phaser from "phaser";

const FONT_KEY = "maple_dmg_font";
const CHARS = "0123456789,";
const CHAR_W = 36;
const CHAR_H = 52;
const FONT_SIZE = 40;

export function preloadDamageFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.has(FONT_KEY)) return;

  const canvas = document.createElement("canvas");
  canvas.width = CHAR_W * CHARS.length;
  canvas.height = CHAR_H;
  const ctx = canvas.getContext("2d")!;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let i = 0; i < CHARS.length; i++) {
    const cx = i * CHAR_W + CHAR_W / 2;
    const cy = CHAR_H / 2;
    const ch = CHARS[i];

    ctx.font = `bold ${FONT_SIZE}px Arial`;
    ctx.strokeStyle = "#550000";
    ctx.lineWidth = 6;
    ctx.strokeText(ch, cx, cy);

    ctx.fillStyle = "#ff6600";
    ctx.fillText(ch, cx, cy);

    ctx.font = `bold ${FONT_SIZE - 10}px Arial`;
    ctx.fillStyle = "#ffdd44";
    ctx.fillText(ch, cx, cy - 3);
  }

  scene.textures.addCanvas(FONT_KEY, canvas);

  const chars: Record<number, Phaser.Types.GameObjects.BitmapText.BitmapFontCharacter> = {};
  for (let i = 0; i < CHARS.length; i++) {
    const code = CHARS.charCodeAt(i);
    chars[code] = {
      x: i * CHAR_W,
      y: 0,
      width: CHAR_W,
      height: CHAR_H,
      centerX: CHAR_W / 2,
      centerY: CHAR_H / 2,
      xOffset: 0,
      yOffset: 0,
      xAdvance: CHAR_W - 2,
      data: {},
      kerning: {},
    };
  }

  scene.cache.bitmapFont.add(FONT_KEY, {
    data: {
      font: FONT_KEY,
      size: CHAR_H,
      lineHeight: CHAR_H,
      chars,
    } as Phaser.Types.GameObjects.BitmapText.BitmapFontData,
    texture: FONT_KEY,
    frame: null,
  });
}

export function showDamageNumber(scene: Phaser.Scene, x: number, y: number, damage: number): void {
  const text = damage.toLocaleString("en-US");
  const dmg = scene.add.bitmapText(x, y, FONT_KEY, text, CHAR_H);
  dmg.setOrigin(0.5, 1);
  dmg.setDepth(50);

  scene.tweens.add({
    targets: dmg,
    y: y - 90,
    alpha: 0,
    duration: 1400,
    ease: "Sine.easeOut",
    onComplete: () => dmg.destroy(),
  });
}
