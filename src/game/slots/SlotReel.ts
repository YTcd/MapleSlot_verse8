import Phaser from "phaser";
import {
  REEL_COUNT,
  VISIBLE_ROWS,
  SYMBOL_SIZE,
  SYMBOL_GAP,
  POOL_PADDING,
  SPIN_DURATION_BASE,
  SPIN_DURATION_PER_REEL,
  SYMBOL_COLORS,
  SYMBOL_LABELS,
} from "./SlotConstants";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;
const POOL_SIZE = VISIBLE_ROWS + POOL_PADDING * 2;

export class SlotReel {
  readonly reelIndex: number;
  readonly strip: Int8Array;
  readonly x: number;
  readonly y: number;

  private scene: Phaser.Scene;
  private pool: Phaser.GameObjects.Container[] = [];
  private stripPos: number = 0;
  private spinTween: Phaser.Tweens.Tween | null = null;
  private spinning: boolean = false;

  constructor(
    scene: Phaser.Scene,
    reelIndex: number,
    strip: Int8Array,
    textureKeys: string[],
    x: number,
    y: number,
  ) {
    this.scene = scene;
    this.reelIndex = reelIndex;
    this.strip = strip;
    this.x = x;
    this.y = y;

    this.buildPool(textureKeys);
  }

  private buildPool(textureKeys: string[]) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const symIdx = i % this.strip.length;
      const sym = this.strip[symIdx];
      const texKey = textureKeys[sym];

      const img = this.scene.add.image(0, 0, texKey).setDisplaySize(SYMBOL_SIZE, SYMBOL_SIZE);
      const label = this.scene.add
        .text(0, 0, SYMBOL_LABELS[sym], {
          fontFamily: "Arial, sans-serif",
          fontSize: "28px",
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5);

      const container = this.scene.add.container(this.x, this.y + i * CELL, [img, label]);
      this.pool.push(container);
    }
  }

  private repositionSymbols() {
    const stripLen = this.strip.length;
    for (let i = 0; i < POOL_SIZE; i++) {
      const container = this.pool[i];
      const virtualRow = Math.floor(this.stripPos) + i;

      // Wrap symbol position within visible zone
      const wrappedPoolIdx = ((virtualRow % POOL_SIZE) + POOL_SIZE) % POOL_SIZE;
      const poolTopRow = Math.floor(this.stripPos);
      const targetPoolIdx = ((i - POOL_PADDING + poolTopRow) % POOL_SIZE + POOL_SIZE) % POOL_SIZE;

      const symIdx = ((virtualRow % stripLen) + stripLen) % stripLen;
      const sym = this.strip[symIdx];

      const img = container.getAt(0) as Phaser.GameObjects.Image;
      img.setTexture("slot_" + sym);

      const label = container.getAt(1) as Phaser.GameObjects.Text;
      label.setText(SYMBOL_LABELS[sym]);

      const floatRow = this.stripPos + i;
      container.y = this.y + floatRow * CELL;
    }
  }

  spin(targetPos: number, delay: number, onComplete: () => void) {
    this.spinning = true;

    // Ensure target position wraps correctly
    const stripLen = this.strip.length;
    const normalizedTarget = ((targetPos % stripLen) + stripLen) % stripLen;

    // Calculate total travel: spin several full cycles + offset to target
    const fullCycles = 3 + this.reelIndex;
    const currentPos = this.stripPos;
    const offsetToTarget = normalizedTarget - (currentPos % stripLen);
    const adjustedOffset = offsetToTarget > 0 ? offsetToTarget : offsetToTarget + stripLen;
    const totalTravel = fullCycles * stripLen + adjustedOffset;
    const endPos = currentPos + totalTravel;

    const duration = SPIN_DURATION_BASE + this.reelIndex * SPIN_DURATION_PER_REEL;

    this.spinTween = this.scene.tweens.add({
      targets: { pos: currentPos },
      pos: endPos,
      duration,
      delay,
      ease: "Quad.easeOut",
      onUpdate: (tween) => {
        this.stripPos = tween.getValue();
        this.repositionSymbols();
      },
      onComplete: () => {
        this.stripPos = ((endPos % stripLen) + stripLen) % stripLen;
        this.repositionSymbols();
        this.spinning = false;
        onComplete();
      },
    } as Phaser.Types.Tweens.TweenBuilderConfig);
  }

  getVisibleSymbols(): number[] {
    const stripLen = this.strip.length;
    const symbols: number[] = [];
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const idx = (Math.floor(this.stripPos) + row) % stripLen;
      symbols.push(this.strip[idx]);
    }
    return symbols;
  }

  get isSpinning(): boolean {
    return this.spinning;
  }

  get currentPosition(): number {
    return this.stripPos;
  }

  destroy() {
    if (this.spinTween) {
      this.spinTween.destroy();
    }
    for (const container of this.pool) {
      container.destroy();
    }
    this.pool = [];
  }
}
