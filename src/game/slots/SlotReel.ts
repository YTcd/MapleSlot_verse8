import Phaser from "phaser";
import {
  VISIBLE_ROWS,
  SYMBOL_SIZE,
  SYMBOL_GAP,
  POOL_PADDING,
  SPIN_DURATION_BASE,
  SPIN_DURATION_PER_REEL,
} from "./SlotConstants";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;

interface PoolItem {
  sprite: Phaser.GameObjects.Sprite;
}

export class SlotReel {
  readonly reelIndex: number;
  readonly strip: Int8Array;
  readonly x: number;
  readonly y: number;
  readonly visibleRows: number;

  private scene: Phaser.Scene;
  private items: PoolItem[] = [];
  private container: Phaser.GameObjects.Container;
  private stripPos: number = 0;
  private spinning: boolean = false;
  private rowSprites: (Phaser.GameObjects.Sprite | null)[] = [];
  private textureKeys: string[] = [];

  constructor(
    scene: Phaser.Scene,
    reelIndex: number,
    strip: Int8Array,
    textureKeys: string[],
    x: number,
    y: number,
    visibleRows: number = VISIBLE_ROWS,
  ) {
    this.scene = scene;
    this.reelIndex = reelIndex;
    this.strip = strip;
    this.textureKeys = textureKeys;
    this.x = x;
    this.y = y;
    this.visibleRows = visibleRows;

    this.rowSprites = new Array(visibleRows).fill(null);
    this.container = scene.add.container(x, 0);
    this.buildPool(textureKeys);
    this.applyMask();
    this.positionItems();
  }

  private buildPool(textureKeys: string[]) {
    const poolSize = this.visibleRows + POOL_PADDING * 2;
    for (let i = 0; i < poolSize; i++) {
      const symIdx = ((i - POOL_PADDING) % this.strip.length + this.strip.length) % this.strip.length;
      const sym = this.strip[symIdx];
      const texKey = textureKeys[sym];

      const sprite = this.scene.add.sprite(0, 0, texKey).setDisplaySize(SYMBOL_SIZE, SYMBOL_SIZE);
      sprite.setVisible(false);

      this.container.add(sprite);
      this.items.push({ sprite });
    }
  }

  private applyMask() {
    const maskGfx = this.scene.make.graphics({ x: 0, y: 0 });
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(
      this.x - SYMBOL_SIZE / 2,
      this.y,
      SYMBOL_SIZE,
      this.visibleRows * CELL - SYMBOL_GAP,
    );
    const mask = maskGfx.createGeometryMask();
    this.container.setMask(mask);
  }

  private positionItems() {
    const poolSize = this.visibleRows + POOL_PADDING * 2;
    const stripLen = this.strip.length;
    const baseRow = Math.floor(this.stripPos);
    const frac = this.stripPos - baseRow;

    this.rowSprites = new Array(this.visibleRows).fill(null);

    for (let i = 0; i < poolSize; i++) {
      const virtualRow = baseRow + i - POOL_PADDING;
      const symIdx = ((virtualRow % stripLen) + stripLen) % stripLen;
      const sym = this.strip[symIdx];

      const item = this.items[i];
      item.sprite.stop();
      item.sprite.setTexture(this.textureKeys[sym]);
      item.sprite.setVisible(true);

      const displayRow = i - POOL_PADDING - frac;
      item.sprite.y = this.y + displayRow * CELL + CELL / 2;

      if (displayRow >= -0.5 && displayRow < this.visibleRows - 0.5) {
        const roundedRow = Math.round(displayRow);
        if (roundedRow >= 0 && roundedRow < this.visibleRows) {
          this.rowSprites[roundedRow] = item.sprite;
        }
      }
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
    for (let row = 0; row < this.visibleRows; row++) {
      const idx = ((baseRow + row) % stripLen + stripLen) % stripLen;
      symbols.push(this.strip[idx]);
    }
    return symbols;
  }

  getSpriteAtRow(rowIndex: number): Phaser.GameObjects.Sprite | null {
    if (rowIndex < 0 || rowIndex >= this.visibleRows) return null;
    return this.rowSprites[rowIndex];
  }

  stopAllAnimations() {
    for (const item of this.items) {
      try { item.sprite?.stop(); } catch { /* ignore */ }
    }
  }

  get isSpinning(): boolean {
    return this.spinning;
  }

  destroy() {
    this.container.destroy();
    this.items = [];
    this.rowSprites = [];
  }
}
