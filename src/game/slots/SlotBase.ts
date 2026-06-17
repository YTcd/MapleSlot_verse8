import type Phaser from "phaser";
import { SlotState } from "./SlotConstants";

export interface SlotWin {
  totalWin: number;
  lineWins: { lineIndex: number; symbol: number; matchCount: number; multiplier: number; win: number }[];
}

export abstract class SlotBase {
  protected scene: Phaser.Scene;
  protected state: SlotState = SlotState.IDLE;
  protected bet: number = 1000;
  protected lines: number = 1;
  protected balance: number = 0;

  private autoStopRequested: boolean = false;
  private resumeAuto: boolean = false;

  private onBalanceChange: ((balance: number) => void) | null = null;
  private onStateChange: ((state: SlotState) => void) | null = null;
  private onWin: ((win: SlotWin) => void) | null = null;
  private onAutoEnd: (() => void) | null = null;

  constructor(scene: Phaser.Scene, balance: number) {
    this.scene = scene;
    this.balance = balance;
  }

  get currentState(): SlotState { return this.state; }
  get currentBalance(): number { return this.balance; }
  get currentBet(): number { return this.bet; }
  get currentLines(): number { return this.lines; }

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

  setOnBalanceChange(cb: (balance: number) => void) { this.onBalanceChange = cb; }
  setOnStateChange(cb: (state: SlotState) => void) { this.onStateChange = cb; }
  setOnWin(cb: (win: SlotWin) => void) { this.onWin = cb; }
  setOnAutoEnd(cb: () => void) { this.onAutoEnd = cb; }

  abstract play(): boolean;
  abstract destroy(): void;
  abstract stopAllSymbolAnimations(): void;
  getSpritesForPayline(_lineIndex: number): (Phaser.GameObjects.Sprite | null)[] { return []; }

  setPresentationDone() {
    if (this.state === SlotState.WIN_PRESENTATION) {
      this.afterEvaluation();
    }
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

  protected setState(newState: SlotState) {
    this.state = newState;
    this.onStateChange?.(newState);
  }

  protected deductBet(): boolean {
    const cost = this.bet * this.lines;
    if (this.balance < cost) return false;
    this.balance -= cost;
    this.onBalanceChange?.(this.balance);
    return true;
  }

  protected applyWin(totalWin: number, win: SlotWin) {
    if (totalWin > 0) {
      this.balance += totalWin;
      this.onBalanceChange?.(this.balance);
      this.onWin?.(win);
      this.resumeAuto = this.state === SlotState.AUTO_SPINNING || this.resumeAuto;
      this.setState(SlotState.WIN_PRESENTATION);
    } else {
      this.afterEvaluation();
    }
  }

  protected afterEvaluation() {
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

  protected doAutoSpin() {
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
    this.executeSpin();
  }

  protected abstract executeSpin(): void;
}
