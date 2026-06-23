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

export const SLEEPYWOOD_MOB_SYMBOLS: MobSymbolDef[] = [
  {
    mobId: "2600224", symbolIndex: 0, label: "Drake",
    borderColor: 0xaa3333,
    cdnBase: CDN, frameCount: 1,
    renderPlan: [
      { path: "Mob/5130100/stand/0.png", delay: 200, state: "stand", frame: "0", origin: { x: 64, y: 82 } },
    ],
  },
  {
    mobId: "6230100", symbolIndex: 1, label: "Wild Kargo",
    borderColor: 0xcc6633,
    cdnBase: CDN, frameCount: 1,
    renderPlan: [
      { path: "Mob/6230100/stand/0.png", delay: 200, state: "stand", frame: "0", origin: { x: 79, y: 91 } },
    ],
  },
  {
    mobId: "7130100", symbolIndex: 2, label: "Tauromacis",
    borderColor: 0x448844,
    cdnBase: CDN, frameCount: 3,
    renderPlan: [
      { path: "Mob/7130100/stand/0.png", delay: 100, state: "stand", frame: "0", origin: { x: 81, y: 120 } },
      { path: "Mob/7130100/stand/1.png", delay: 100, state: "stand", frame: "1", origin: { x: 81, y: 120 } },
      { path: "Mob/7130100/stand/2.png", delay: 70, state: "stand", frame: "2", origin: { x: 81, y: 120 } },
    ],
  },
  {
    mobId: "6130100", symbolIndex: 3, label: "Red Drake",
    borderColor: 0xcc4444,
    cdnBase: CDN, frameCount: 1,
    renderPlan: [
      { path: "Mob/6130100/stand/0.png", delay: 200, state: "stand", frame: "0", origin: { x: 64, y: 82 } },
    ],
  },
  {
    mobId: "6230600", symbolIndex: 4, label: "Ice Drake",
    borderColor: 0x44aacc,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/6230600/stand/0.png", delay: 130, state: "stand", frame: "0", origin: { x: 64, y: 82 } },
      { path: "Mob/6230600/stand/1.png", delay: 130, state: "stand", frame: "1", origin: { x: 93, y: 82 } },
    ],
  },
  {
    mobId: "2230101", symbolIndex: 5, label: "Zombie Mushroom",
    borderColor: 0x7733aa,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/2230101/stand/0.png", delay: 180, state: "stand", frame: "0", origin: { x: 27, y: 58 } },
      { path: "Mob/2230101/move/2.png", delay: 180, state: "stand", frame: "1", origin: { x: 27, y: 67 } },
    ],
  },
  {
    mobId: "8130100", symbolIndex: 6, label: "Jr. Balrog",
    borderColor: 0xff5500,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/8130100/stand/0.png", delay: 150, state: "stand", frame: "0", origin: { x: 80, y: 156 } },
      { path: "Mob/8130100/stand/1.png", delay: 150, state: "stand", frame: "1", origin: { x: 80, y: 156 } },
    ],
  },
];

export function getSlotTextureKey(symbolIndex: number): string {
  return `slot_${symbolIndex}`;
}

export function getAnimKey(symbolIndex: number): string {
  return `slot_anim_${symbolIndex}`;
}

export function getFrameKey(symbolIndex: number, frameIndex: number): string {
  return `slot_mob_${symbolIndex}_f_${frameIndex}`;
}

export function getRawFrameKey(symbolIndex: number, frameIndex: number, prefix = ""): string {
  return `${prefix}slot_mob_raw_${symbolIndex}_f_${frameIndex}`;
}

export function getBorderColor(symbolIndex: number): number {
  return SLEEPYWOOD_MOB_SYMBOLS[symbolIndex]?.borderColor ?? 0x888888;
}

export function preloadMobTextures(scene: Phaser.Scene, prefix = ""): void {
  for (const mob of SLEEPYWOOD_MOB_SYMBOLS) {
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
