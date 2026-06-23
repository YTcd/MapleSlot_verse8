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

export const LUDIBRIUM_MOB_SYMBOLS: MobSymbolDef[] = [
  {
    mobId: "3000005", symbolIndex: 0, label: "Brown Teddy",
    borderColor: 0x8B6914,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/3000005/stand/0.png", delay: 100, state: "stand", frame: "0", origin: { x: 32, y: 49 } },
      { path: "Mob/3000005/stand/1.png", delay: 100, state: "stand", frame: "1", origin: { x: 47, y: 37 } },
    ],
  },
  {
    mobId: "3110101", symbolIndex: 1, label: "Pink Teddy",
    borderColor: 0xff88aa,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/3110101/stand/0.png", delay: 100, state: "stand", frame: "0", origin: { x: 32, y: 54 } },
      { path: "Mob/3110101/stand/1.png", delay: 100, state: "stand", frame: "1", origin: { x: 47, y: 42 } },
    ],
  },
  {
    mobId: "4230113", symbolIndex: 2, label: "Tick-Tock",
    borderColor: 0xddaa44,
    cdnBase: CDN, frameCount: 3,
    renderPlan: [
      { path: "Mob/4230113/stand/0.png", delay: 100, state: "stand", frame: "0", origin: { x: 30, y: 63 } },
      { path: "Mob/4230113/stand/1.png", delay: 100, state: "stand", frame: "1", origin: { x: 30, y: 65 } },
      { path: "Mob/4230113/stand/2.png", delay: 100, state: "stand", frame: "2", origin: { x: 30, y: 63 } },
    ],
  },
  {
    mobId: "4230115", symbolIndex: 3, label: "Master Chronos",
    borderColor: 0x8844aa,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/4230115/stand/0.png", delay: 100, state: "stand", frame: "0", origin: { x: 38, y: 92 } },
      { path: "Mob/4230115/stand/1.png", delay: 100, state: "stand", frame: "1", origin: { x: 39, y: 89 } },
    ],
  },
  {
    mobId: "3230305", symbolIndex: 4, label: "Toy Horse",
    borderColor: 0xdd8844,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/3230305/stand/0.png", delay: 100, state: "stand", frame: "0", origin: { x: 47, y: 125 } },
      { path: "Mob/3230305/stand/1.png", delay: 100, state: "stand", frame: "1", origin: { x: 48, y: 124 } },
    ],
  },
  {
    mobId: "4230111", symbolIndex: 5, label: "Robo",
    borderColor: 0x8888cc,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/4230111/stand/0.png", delay: 110, state: "stand", frame: "0", origin: { x: 36, y: 86 } },
      { path: "Mob/4230111/stand/1.png", delay: 110, state: "stand", frame: "1", origin: { x: 40, y: 88 } },
    ],
  },
  {
    mobId: "2600631", symbolIndex: 6, label: "Papulatus",
    borderColor: 0xdd3333,
    cdnBase: CDN, frameCount: 2,
    renderPlan: [
      { path: "Mob/2600631/stand/0.png", delay: 100, state: "stand", frame: "0", origin: { x: 104, y: 285 } },
      { path: "Mob/2600631/stand/1.png", delay: 100, state: "stand", frame: "1", origin: { x: 103, y: 287 } },
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
  return LUDIBRIUM_MOB_SYMBOLS[symbolIndex]?.borderColor ?? 0x888888;
}

export function preloadMobTextures(scene: Phaser.Scene, prefix = ""): void {
  for (const mob of LUDIBRIUM_MOB_SYMBOLS) {
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
