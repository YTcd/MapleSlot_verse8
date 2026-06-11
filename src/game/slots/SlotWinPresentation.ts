import Phaser from "phaser";
import {
  REEL_COUNT,
  SYMBOL_SIZE,
  SYMBOL_GAP,
  PAYLINES,
  LINE_COLORS,
} from "./SlotConstants";
import type { SlotWin } from "./SlotMachine";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;

interface LinePoint {
  reelIndex: number;
  rowIndex: number;
  x: number;
  y: number;
}

export class SlotWinPresentation {
  private scene: Phaser.Scene;
  private gridX: number;
  private gridY: number;

  private overlayGfx: Phaser.GameObjects.Graphics;
  private timers: Phaser.Time.TimerEvent[] = [];
  private phaseIndex: number = 0;
  private allPhaseReached: boolean = false;

  onButtonsReady: (() => void) | null = null;

  constructor(scene: Phaser.Scene, gridX: number, gridY: number) {
    this.scene = scene;
    this.gridX = gridX;
    this.gridY = gridY;

    this.overlayGfx = scene.add.graphics();
    this.overlayGfx.setDepth(10);
  }

  start(lineWins: SlotWin["lineWins"]) {
    this.stop();

    if (lineWins.length === 0) return;

    this.allPhaseReached = false;
    this.phaseIndex = 0;
    this.overlayGfx.setVisible(true);

    this.runPhase(lineWins);
  }

  private runPhase(lineWins: SlotWin["lineWins"]) {
    const winCount = lineWins.length;

    if (this.phaseIndex < winCount) {
      // Single line phase
      const win = lineWins[this.phaseIndex];
      this.drawLine(win.lineIndex, win.matchCount);
      this.animateMatchedSymbols(win.lineIndex, win.matchCount);

      this.timers.push(
        this.scene.time.delayedCall(500, () => {
          this.overlayGfx.clear();
          this.phaseIndex++;
          this.runPhase(lineWins);
        }),
      );
    } else {
      // All lines phase
      for (const win of lineWins) {
        this.drawLine(win.lineIndex, win.matchCount);
        this.animateMatchedSymbols(win.lineIndex, win.matchCount);
      }

      if (!this.allPhaseReached) {
        this.allPhaseReached = true;
        this.onButtonsReady?.();
      }

      this.timers.push(
        this.scene.time.delayedCall(1000, () => {
          this.overlayGfx.clear();
          // Pause phase
          this.timers.push(
            this.scene.time.delayedCall(1000, () => {
              this.phaseIndex = 0;
              this.runPhase(lineWins);
            }),
          );
        }),
      );
    }
  }

  private drawLine(lineIndex: number, matchCount: number) {
    const payline = PAYLINES[lineIndex];
    if (!payline) return;

    const color = LINE_COLORS[lineIndex % LINE_COLORS.length];
    const points: LinePoint[] = [];

    for (let reel = 0; reel < REEL_COUNT; reel++) {
      const row = payline[reel];
      const cx = this.gridX + reel * CELL + SYMBOL_SIZE / 2;
      const cy = this.gridY + row * CELL + SYMBOL_SIZE / 2;
      points.push({ reelIndex: reel, rowIndex: row, x: cx, y: cy });

      // Draw highlight box on matching symbols
      if (reel < matchCount) {
        this.overlayGfx.lineStyle(3, color, 0.8);
        this.overlayGfx.strokeRect(
          this.gridX + reel * CELL + 2,
          this.gridY + row * CELL + 2,
          SYMBOL_SIZE - 4,
          SYMBOL_SIZE - 4,
        );
      }
    }

    // Draw connecting line
    this.overlayGfx.lineStyle(4, color, 0.7);
    this.overlayGfx.beginPath();
    this.overlayGfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.overlayGfx.lineTo(points[i].x, points[i].y);
    }
    this.overlayGfx.strokePath();
  }

  /**
   * Placeholder: animate matched symbols on a payline.
   * Override this to implement symbol-level effects (flash, pulse, glow, etc.)
   */
  animateMatchedSymbols(_lineIndex: number, _matchCount: number) {
    // TODO: implement symbol animation (flash, glow, scale pulse, etc.)
  }

  stop() {
    for (const timer of this.timers) {
      timer.destroy();
    }
    this.timers = [];
    this.overlayGfx.clear();
    this.overlayGfx.setVisible(false);
  }

  destroy() {
    this.stop();
    this.overlayGfx.destroy();
  }
}
