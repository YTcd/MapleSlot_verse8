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
  SYMBOL_COLORS,
} from "./SlotConstants";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;
const GRID_WIDTH = REEL_COUNT * CELL - SYMBOL_GAP;
const GRID_HEIGHT = VISIBLE_ROWS * CELL - SYMBOL_GAP;

export interface SlotWin {
  totalWin: number;
  lineWins: { lineIndex: number; symbol: number; matchCount: number; multiplier: number; win: number }[];
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
    this.createReels();
  }

  private createTextures() {
    for (let i = 0; i < 7; i++) {
      const key = "slot_" + i;
      if (this.scene.textures.exists(key)) continue;

      const gfx = this.scene.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(SYMBOL_COLORS[i], 1);
      gfx.fillRoundedRect(2, 2, SYMBOL_SIZE - 4, SYMBOL_SIZE - 4, 8);
      gfx.lineStyle(2, 0xffffff, 0.3);
      gfx.strokeRoundedRect(2, 2, SYMBOL_SIZE - 4, SYMBOL_SIZE - 4, 8);
      gfx.generateTexture(key, SYMBOL_SIZE, SYMBOL_SIZE);
      gfx.destroy();
      this.textureKeys.push(key);
    }
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

  // --- public API ---

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

  // --- internal ---

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

  destroy() {
    for (const reel of this.reels) {
      reel.destroy();
    }
  }
}
