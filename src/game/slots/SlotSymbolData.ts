import type Phaser from "phaser";

interface RenderPlanEntry {
  state: string;
  frame: string;
  path: string;
  origin: { x: number; y: number };
  delay: number;
}

export interface MobSymbolDef {
  mobId: string;
  symbolIndex: number;
  cdnBase: string;
  renderPlan: RenderPlanEntry[];
  frameCount: number;
  borderColor: number;
  label: string;
}

const CDN = "https://resource-static.msu.io/data";

export const MOB_SYMBOLS: MobSymbolDef[] = [
  {
    mobId: "9833419", symbolIndex: 0, label: "Mush",
    borderColor: 0xffd700,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/9833419/stand/0.png", delay: 120, state: "stand", frame: "0", origin: { x: 38, y: 69 } },
      { path: "Mob/9833419/stand/1.png", delay: 120, state: "stand", frame: "1", origin: { x: 38, y: 66 } },
    ],
  },
  {
    mobId: "100000", symbolIndex: 1, label: "Snail",
    borderColor: 0x8B6914,
    cdnBase: CDN, frameCount: 1,
    renderPlan: [
      { path: "Mob/0100100/stand/0.png", delay: 200, state: "stand", frame: "0", origin: { x: 18, y: 26 } },
    ],
  },
  {
    mobId: "100001", symbolIndex: 2, label: "Blue Snail",
    borderColor: 0x4488cc,
    cdnBase: CDN, frameCount: 1,
    renderPlan: [
      { path: "Mob/0100101/move/0.png", delay: 200, state: "stand", frame: "0", origin: { x: 16, y: 34 } },
    ],
  },
  {
    mobId: "100002", symbolIndex: 3, label: "Red Snail",
    borderColor: 0xcc4444,
    cdnBase: CDN, frameCount: 1,
    renderPlan: [
      { path: "Mob/0130101/move/0.png", delay: 200, state: "stand", frame: "0", origin: { x: 16, y: 34 } },
    ],
  },
  {
    mobId: "100003", symbolIndex: 4, label: "Spore",
    borderColor: 0x44aa44,
    cdnBase: CDN, frameCount: 3,
    renderPlan: [
      { path: "Mob/0120100/move/0.png", delay: 180, state: "stand", frame: "0", origin: { x: 18, y: 36 } },
      { path: "Mob/0120100/stand/1.png", delay: 100, state: "stand", frame: "1", origin: { x: 18, y: 36 } },
      { path: "Mob/0120100/stand/2.png", delay: 180, state: "stand", frame: "2", origin: { x: 18, y: 36 } },
    ],
  },
  {
    mobId: "100004", symbolIndex: 5, label: "Orange Mushroom",
    borderColor: 0xff8844,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/1210102/move/0.png", delay: 180, state: "stand", frame: "0", origin: { x: 27, y: 58 } },
      { path: "Mob/1210102/stand/1.png", delay: 180, state: "stand", frame: "1", origin: { x: 27, y: 55 } },
    ],
  },
  {
    mobId: "2220100", symbolIndex: 6, label: "Blue Mushroom",
    borderColor: 0x4488dd,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/2220100/stand/0.png", delay: 180, state: "stand", frame: "0", origin: { x: 27, y: 58 } },
      { path: "Mob/2220100/move/2.png", delay: 180, state: "stand", frame: "1", origin: { x: 27, y: 55 } },
    ],
  },
];

export function getSlotTextureKey(symbolIndex: number, prefix = ""): string {
  return `${prefix}slot_${symbolIndex}`;
}

export function getAnimKey(symbolIndex: number, prefix = ""): string {
  return `${prefix}slot_anim_${symbolIndex}`;
}

export function getFrameKey(symbolIndex: number, frameIndex: number, prefix = ""): string {
  return `${prefix}slot_mob_${symbolIndex}_f_${frameIndex}`;
}

export function getRawFrameKey(symbolIndex: number, frameIndex: number, prefix = ""): string {
  return `${prefix}slot_mob_raw_${symbolIndex}_f_${frameIndex}`;
}

export function getBorderColor(symbolIndex: number): number {
  return MOB_SYMBOLS[symbolIndex]?.borderColor ?? 0x888888;
}

export function preloadMobTextures(scene: Phaser.Scene, prefix = ""): void {
  preloadMobTexturesFor(scene, MOB_SYMBOLS, prefix);
}

export function preloadMobTexturesFor(scene: Phaser.Scene, symbols: MobSymbolDef[], prefix = ""): void {
  for (const mob of symbols) {
    for (let f = 0; f < mob.renderPlan.length; f++) {
      const frame = mob.renderPlan[f];
      const url = `${mob.cdnBase}/${frame.path}`;
      const rawKey = getRawFrameKey(mob.symbolIndex, f, prefix);
      if (!scene.textures.exists(rawKey)) {
        scene.load.image(rawKey, url);
      }
    }
  }
}

export function createMobAnimations(scene: Phaser.Scene, prefix = ""): void {
  createMobAnimationsFor(scene, MOB_SYMBOLS, prefix);
}

export function createMobAnimationsFor(scene: Phaser.Scene, symbols: MobSymbolDef[], prefix = ""): void {
  for (const mob of symbols) {
    const animKey = getAnimKey(mob.symbolIndex, prefix);
    if (scene.anims.exists(animKey)) continue;

    const frames = mob.renderPlan.map((_, f) => ({
      key: getFrameKey(mob.symbolIndex, f, prefix),
    }));
    const totalDelay = mob.renderPlan.reduce((sum, f) => sum + (f.delay || 200), 0);
    const avgDelay = totalDelay / mob.renderPlan.length;

    scene.anims.create({
      key: animKey,
      frames,
      frameRate: 1000 / avgDelay,
      repeat: -1,
    });
  }
}
