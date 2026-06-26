import Phaser from "phaser";

const DIGIT_W = 28;
const DIGIT_H = 40;
const CRIT_W = 38;
const CRIT_H = 52;
const DIGITS = "0123456789";

function drawMsDigit(ctx: CanvasRenderingContext2D, digit: string, cx: number, cy: number, w: number, h: number, isCrit: boolean) {
  const fs = Math.floor(h * 0.85);

  // Deep shadow outline
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (dx === 0 && dy === 0) continue;
      ctx.font = `bold ${fs}px "Trebuchet MS", Arial`;
      ctx.strokeStyle = isCrit ? "#550000" : "#330000";
      ctx.lineWidth = isCrit ? 8 : 6;
      ctx.strokeText(digit, cx + dx * 1.5, cy + dy * 1.5);
    }
  }

  if (isCrit) {
    // White glow background
    ctx.font = `bold ${fs}px "Trebuchet MS", Arial`;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeText(digit, cx, cy);
    // Bright orange main
    ctx.font = `bold ${Math.floor(fs * 0.95)}px "Trebuchet MS", Arial`;
    ctx.fillStyle = "#ff6600";
    ctx.fillText(digit, cx, cy);
    // Yellow center highlight
    ctx.font = `bold ${Math.floor(fs * 0.75)}px "Trebuchet MS", Arial`;
    ctx.fillStyle = "#ffdd00";
    ctx.fillText(digit, cx, cy - Math.floor(h * 0.05));
  } else {
    // Dark orange base
    ctx.font = `bold ${fs}px "Trebuchet MS", Arial`;
    ctx.fillStyle = "#cc4400";
    ctx.fillText(digit, cx, cy);
    // Yellow-ish inner
    ctx.font = `bold ${Math.floor(fs * 0.78)}px "Trebuchet MS", Arial`;
    ctx.fillStyle = "#ffcc44";
    ctx.fillText(digit, cx, cy - Math.floor(h * 0.04));
  }
}

function createDigitTexture(scene: Phaser.Scene, digit: string): string {
  const key = `damage_digit_${digit}`;
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement("canvas");
  canvas.width = DIGIT_W;
  canvas.height = DIGIT_H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawMsDigit(ctx, digit, DIGIT_W / 2, DIGIT_H / 2, DIGIT_W, DIGIT_H, false);
  scene.textures.addCanvas(key, canvas);
  return key;
}

function createCritTexture(scene: Phaser.Scene, digit: string): string {
  const key = `dmg_crit_${digit}`;
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement("canvas");
  canvas.width = CRIT_W;
  canvas.height = CRIT_H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawMsDigit(ctx, digit, CRIT_W / 2, CRIT_H / 2, CRIT_W, CRIT_H, true);
  scene.textures.addCanvas(key, canvas);
  return key;
}

export function preloadDamageFont(scene: Phaser.Scene): void {
  for (const d of DIGITS) {
    createDigitTexture(scene, d);
    createCritTexture(scene, d);
  }
}

export function showDamageNumber(scene: Phaser.Scene, x: number, y: number, damage: number): void {
  _showDamageImpl(scene, x, y, damage, DIGIT_W, "damage_digit_", false);
}

export function showCriticalNumber(scene: Phaser.Scene, x: number, y: number, damage: number): void {
  _showDamageImpl(scene, x, y, damage, CRIT_W, "dmg_crit_", true);
}

function _showDamageImpl(
  scene: Phaser.Scene, x: number, y: number, damage: number,
  digitW: number, keyPrefix: string, isCrit: boolean,
): void {
  const text = damage.toLocaleString("en-US");
  const container = scene.add.container(x, y).setDepth(50);

  let offsetX = -(text.length * (digitW - 6)) / 2;

  for (const ch of text) {
    if (ch === ",") { offsetX += 6; continue; }
    const img = scene.add.image(offsetX + digitW / 2, 0, `${keyPrefix}${ch}`);
    container.add(img);
    offsetX += digitW - 6;
  }

  const spread = isCrit ? 30 : 20;
  container.x += Phaser.Math.Between(-spread, spread);

  if (isCrit) {
    container.setScale(0.3);
    scene.tweens.add({
      targets: container,
      scaleX: 1, scaleY: 1,
      duration: 200,
      ease: "Back.easeOut",
    });
  }

  const flyHeight = isCrit ? 120 : 100;
  const duration = isCrit ? 1600 : 1400;

  scene.tweens.add({
    targets: container,
    y: y - flyHeight,
    alpha: 0,
    duration,
    ease: "Sine.easeOut",
    onComplete: () => container.destroy(),
  });
}
