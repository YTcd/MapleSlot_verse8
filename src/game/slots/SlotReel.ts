import Phaser from "phaser";
import {
  VISIBLE_ROWS,
  SYMBOL_SIZE,
  SYMBOL_GAP,
  POOL_PADDING,
  SPIN_DURATION_BASE,
  SPIN_DURATION_PER_REEL,
  SYMBOL_LABELS,
} from "./SlotConstants";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;
const POOL_SIZE = VISIBLE_ROWS + POOL_PADDING * 2;

interface PoolItem {
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
}

export class SlotReel {
  readonly reelIndex: number;
  readonly strip: Int8Array;
  readonly x: number;
  readonly y: number;

  private scene: Phaser.Scene;
  private items: PoolItem[] = [];
  private container: Phaser.GameObjects.Container;
  private stripPos: number = 0;
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

    this.container = scene.add.container(x, 0);
    this.buildPool(textureKeys);
    this.applyMask();
    this.positionItems();
  }

  private buildPool(textureKeys: string[]) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const symIdx = ((i - POOL_PADDING) % this.strip.length + this.strip.length) % this.strip.length;
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

      this.container.add([img, label]);
      this.items.push({ img, label });
    }
  }

  private applyMask() {
    const maskGfx = this.scene.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(
      this.x,
      this.y,
      SYMBOL_SIZE,
      VISIBLE_ROWS * CELL - SYMBOL_GAP,
    );
    const mask = maskGfx.createGeometryMask();
    this.container.setMask(mask);
  }

  private positionItems() {
    const stripLen = this.strip.length;
    const baseRow = Math.floor(this.stripPos);
    const frac = this.stripPos - baseRow;

    for (let i = 0; i < POOL_SIZE; i++) {
      const virtualRow = baseRow + i - POOL_PADDING;
      const symIdx = ((virtualRow % stripLen) + stripLen) % stripLen;
      const sym = this.strip[symIdx];

      const item = this.items[i];
      item.img.setTexture("slot_" + sym);
      item.label.setText(SYMBOL_LABELS[sym]);

      const displayRow = i - POOL_PADDING - frac;
      item.img.y = this.y + displayRow * CELL + CELL / 2;
      item.label.y = this.y + displayRow * CELL + CELL / 2;
    }
  }

  spin(targetPos: number, delay: number, onComplete: () => void) {
    this.spinning = true;

    const stripLen = this.strip.length;
    const normalizedTarget = ((targetPos % stripLen) + stripLen) % stripLen;

    const fullCycles = 3 + this.reelIndex;
    const currentPos = this.stripPos;
    const offsetToTarget =
      ((normalizedTarget - (currentPos % stripLen)) + stripLen) % stripLen;
    const totalTravel = fullCycles * stripLen + offsetToTarget;
    const endPos = currentPos + totalTravel;

    const duration = SPIN_DURATION_BASE + this.reelIndex * SPIN_DURATION_PER_REEL;

    this.scene.tweens.addCounter({
      from: currentPos,
      to: endPos,
      duration,
      delay,
      ease: "Quad.easeOut",
      onUpdate: (_tween: Phaser.Tweens.Tween, _target: unknown, _key: string, current: number) => {
        this.stripPos = current;
        this.positionItems();
      },
      onComplete: () => {
        this.stripPos = ((endPos % stripLen) + stripLen) % stripLen;
        this.positionItems();
        this.spinning = false;
        onComplete();
      },
    });
  }

  getVisibleSymbols(): number[] {
    const stripLen = this.strip.length;
    const baseRow = Math.floor(this.stripPos);
    const symbols: number[] = [];
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const idx = ((baseRow + row) % stripLen + stripLen) % stripLen;
      symbols.push(this.strip[idx]);
    }
    return symbols;
  }

  get isSpinning(): boolean {
    return this.spinning;
  }

  destroy() {
    this.container.destroy();
    this.items = [];
  }
}
