import Phaser from "phaser";
import { SlotReel } from "./SlotReel";
import {
  SlotState,
  REELS,
  PAY_TABLE,
  PAYLINES,
  REEL_COUNT,
  VISIBLE_ROWS,
  SYMBOL_SIZE,
  SYMBOL_GAP,
  SYMBOL_COUNT,
} from "./SlotConstants";
import {
  MOB_SYMBOLS,
  createMobAnimations,
  getSlotTextureKey,
  getAnimKey,
  getFrameKey,
  getRawFrameKey,
  getBorderColor,
} from "./SlotSymbolData";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;

export interface SlotWin {
  totalWin: number;
  lineWins: { lineIndex: number; symbol: number; matchCount: number; multiplier: number; win: number }[];
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export class SlotMachine {
  readonly reels: SlotReel[] = [];
  readonly x: number;
  readonly y: number;

  private scene: Phaser.Scene;
  private state: SlotState = SlotState.IDLE;
  private bet: number = 100;
  private lines: number = 1;
  private balance: number = 0;
  private textureKeys: string[] = [];
  private autoStopRequested: boolean = false;
  private resumeAuto: boolean = false;

  private onBalanceChange: ((balance: number) => void) | null = null;
  private onStateChange: ((state: SlotState) => void) | null = null;
  private onWin: ((win: SlotWin) => void) | null = null;
  private onAutoEnd: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, balance: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.balance = balance;

    this.createTextures();
    createMobAnimations(this.scene);
    this.createReels();
  }

  private createTextures() {
    for (let i = 0; i < SYMBOL_COUNT; i++) {
      const slotKey = getSlotTextureKey(i);
      if (this.scene.textures.exists(slotKey)) {
        this.textureKeys.push(slotKey);
        continue;
      }

      const mob = MOB_SYMBOLS[i];
      for (let f = 0; f < mob.frameCount; f++) {
        const rawKey = getRawFrameKey(i, f);
        const compKey = getFrameKey(i, f);
        if (!this.scene.textures.exists(compKey)) {
          this.drawCompositeTexture(i, f, rawKey, compKey);
        }
      }

      const firstCompKey = getFrameKey(i, 0);
      if (this.scene.textures.exists(firstCompKey)) {
        const src = this.scene.textures.get(firstCompKey).getSourceImage();
        this.scene.textures.addImage(slotKey, src);
      } else {
        this.drawFallbackTexture(i);
      }
      this.textureKeys.push(slotKey);
    }
  }

  private drawCompositeTexture(symIdx: number, _frameIdx: number, rawKey: string, outKey: string) {
    const borderColor = getBorderColor(symIdx);
    const borderW = 4;
    const pad = 3;
    const innerSize = SYMBOL_SIZE - (borderW + pad) * 2;

    const hex = "#" + borderColor.toString(16).padStart(6, "0");

    const canvasTex = this.scene.textures.createCanvas(outKey, SYMBOL_SIZE, SYMBOL_SIZE);
    if (!canvasTex) return;
    const ctx = canvasTex.context;
    if (!ctx) return;

    ctx.fillStyle = "#111122";
    roundRectPath(ctx, borderW, borderW, SYMBOL_SIZE - borderW * 2, SYMBOL_SIZE - borderW * 2, 6);
    ctx.fill();

    ctx.strokeStyle = hex;
    ctx.lineWidth = borderW;
    roundRectPath(ctx, borderW, borderW, SYMBOL_SIZE - borderW * 2, SYMBOL_SIZE - borderW * 2, 6);
    ctx.stroke();

    if (this.scene.textures.exists(rawKey)) {
      const rawTex = this.scene.textures.get(rawKey);
      const source = rawTex.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      if (source && source.width > 0 && source.height > 0) {
        const s = Math.min(innerSize / source.width, innerSize / source.height);
        const dw = source.width * s;
        const dh = source.height * s;
        const dx = (SYMBOL_SIZE - dw) / 2;
        const dy = (SYMBOL_SIZE - dh) / 2;
        ctx.drawImage(source, dx, dy, dw, dh);
      }
    }

    canvasTex.refresh();
  }

  private drawFallbackTexture(symIdx: number) {
    const key = getSlotTextureKey(symIdx);
    const borderColor = getBorderColor(symIdx);
    const gfx = this.scene.make.graphics({ x: 0, y: 0 });
    gfx.fillStyle(0x111122, 1);
    gfx.fillRoundedRect(2, 2, SYMBOL_SIZE - 4, SYMBOL_SIZE - 4, 8);
    gfx.lineStyle(3, borderColor, 1);
    gfx.strokeRoundedRect(2, 2, SYMBOL_SIZE - 4, SYMBOL_SIZE - 4, 8);
    gfx.generateTexture(key, SYMBOL_SIZE, SYMBOL_SIZE);
    gfx.destroy();
  }

  private createReels() {
    for (let i = 0; i < REEL_COUNT; i++) {
      const reelX = this.x + i * CELL + SYMBOL_SIZE / 2;
      const reel = new SlotReel(
        this.scene,
        i,
        REELS[i],
        this.textureKeys,
        reelX,
        this.y,
      );
      this.reels.push(reel);
    }
  }

  get currentState(): SlotState {
    return this.state;
  }

  get currentBalance(): number {
    return this.balance;
  }

  get currentBet(): number {
    return this.bet;
  }

  get currentLines(): number {
    return this.lines;
  }

  setBet(value: number) {
    if (this.state !== SlotState.IDLE) return;
    this.bet = value;
  }

  setLines(value: number) {
    if (this.state !== SlotState.IDLE) return;
    this.lines = value;
  }

  setBalance(value: number) {
    this.balance = value;
    this.onBalanceChange?.(this.balance);
  }

  setOnBalanceChange(cb: (balance: number) => void) {
    this.onBalanceChange = cb;
  }

  setOnStateChange(cb: (state: SlotState) => void) {
    this.onStateChange = cb;
  }

  setOnWin(cb: (win: SlotWin) => void) {
    this.onWin = cb;
  }

  setOnAutoEnd(cb: () => void) {
    this.onAutoEnd = cb;
  }

  play(): boolean {
    if (this.state !== SlotState.IDLE) return false;

    const cost = this.bet * this.lines;
    if (this.balance < cost) return false;

    this.balance -= cost;
    this.onBalanceChange?.(this.balance);
    this.setState(SlotState.SPINNING);
    this.spinReels();
    return true;
  }

  startAuto() {
    if (this.state !== SlotState.IDLE) return;
    this.autoStopRequested = false;
    this.resumeAuto = true;
    this.doAutoSpin();
  }

  stopAuto() {
    this.autoStopRequested = true;
  }

  private setState(newState: SlotState) {
    this.state = newState;
    this.onStateChange?.(newState);
  }

  private spinReels() {
    const stripLen = REELS[0].length;
    let stoppedCount = 0;
    const results: number[][] = Array.from({ length: REEL_COUNT }, () => []);

    for (let i = 0; i < REEL_COUNT; i++) {
      const targetPos = Math.floor(Math.random() * stripLen);
      const delay = i * 100;

      this.reels[i].spin(targetPos, delay, () => {
        results[i] = this.reels[i].getVisibleSymbols();
        stoppedCount++;

        if (stoppedCount === REEL_COUNT) {
          this.evaluate(results);
        }
      });
    }
  }

  private evaluate(allSymbols: number[][]) {
    this.setState(SlotState.EVALUATING);

    const win = this.calculateWin(allSymbols);

    if (win.totalWin > 0) {
      this.balance += win.totalWin;
      this.onBalanceChange?.(this.balance);
      this.onWin?.(win);
      this.resumeAuto = this.state === SlotState.AUTO_SPINNING || this.resumeAuto;
      this.setState(SlotState.WIN_PRESENTATION);
    } else {
      this.afterEvaluation();
    }
  }

  setPresentationDone() {
    if (this.state === SlotState.WIN_PRESENTATION) {
      this.afterEvaluation();
    }
  }

  private afterEvaluation() {
    if (this.resumeAuto && !this.autoStopRequested) {
      this.resumeAuto = false;
      this.doAutoSpin();
    } else {
      const wasAuto = this.resumeAuto;
      this.resumeAuto = false;
      this.autoStopRequested = false;
      this.setState(SlotState.IDLE);
      if (wasAuto) this.onAutoEnd?.();
    }
  }

  private doAutoSpin() {
    const cost = this.bet * this.lines;
    if (this.balance < cost) {
      this.autoStopRequested = false;
      this.resumeAuto = false;
      this.setState(SlotState.IDLE);
      this.onAutoEnd?.();
      return;
    }

    this.balance -= cost;
    this.onBalanceChange?.(this.balance);
    this.setState(SlotState.SPINNING);
    this.spinReels();
  }

  private calculateWin(allSymbols: number[][]): SlotWin {
    const lineWins: SlotWin["lineWins"] = [];

    for (let l = 0; l < Math.min(this.lines, PAYLINES.length); l++) {
      const payline = PAYLINES[l];
      const rowSymbols = payline.map((rowIdx, reelIdx) => allSymbols[reelIdx]?.[rowIdx] ?? -1);

      const firstSym = rowSymbols[0];
      if (firstSym < 0) continue;

      let matchCount = 1;
      for (let r = 1; r < REEL_COUNT; r++) {
        if (rowSymbols[r] === firstSym) {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchCount >= 3) {
        const multipliers = PAY_TABLE[matchCount];
        if (multipliers && firstSym < multipliers.length) {
          const multiplier = multipliers[firstSym];
          const win = multiplier * this.bet;
          lineWins.push({
            lineIndex: l,
            symbol: firstSym,
            matchCount,
            multiplier,
            win,
          });
        }
      }
    }

    const totalWin = lineWins.reduce((sum, lw) => sum + lw.win, 0);
    return { totalWin, lineWins };
  }

  getSpritesForPayline(lineIndex: number): (Phaser.GameObjects.Sprite | null)[] {
    const payline = PAYLINES[lineIndex];
    if (!payline) return [];

    return payline.map((rowIdx, reelIdx) =>
      this.reels[reelIdx].getSpriteAtRow(rowIdx),
    );
  }

  stopAllSymbolAnimations() {
    for (const reel of this.reels) {
      reel.stopAllAnimations();
    }
  }

  destroy() {
    for (const reel of this.reels) {
      reel.destroy();
    }
  }
}
