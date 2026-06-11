import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { SlotMachine } from "../../slots/SlotMachine";
import { SlotUI } from "../../slots/SlotUI";
import { SlotState, REEL_COUNT, SYMBOL_SIZE, SYMBOL_GAP } from "../../slots/SlotConstants";
import { updateBalanceOnServer } from "../../utils/ServerBridge";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;
const GRID_WIDTH = REEL_COUNT * CELL - SYMBOL_GAP;
const GRID_HEIGHT = 3 * CELL - SYMBOL_GAP;
const BAR_HEIGHT = 72;

export class SceneHenesys extends BaseScene {
  private slotMachine!: SlotMachine;
  private slotUI!: SlotUI;

  constructor() {
    super({ key: "SceneHenesys" });
  }

  preload() {
    this.preloadTopBarIcons();
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#2d5a1e");

    const topBar = this.createTopBar();

    const title = this.add
      .text(width / 2, height * 0.08, "Henesys", {
        fontFamily: "Arial, sans-serif",
        fontSize: "36px",
        color: "#b0f0a0",
        fontStyle: "bold",
        stroke: "#1a3a0a",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    const gridX = (width - GRID_WIDTH) / 2;
    const gridY = height * 0.22;

    this.slotMachine = new SlotMachine(this, gridX, gridY, this.balance);

    const barY = height - BAR_HEIGHT;
    this.slotUI = new SlotUI(this, 0, barY, width, {
      onPlay: () => this.handlePlay(),
      onAuto: () => this.handleAuto(),
      onStopAuto: () => this.handleStopAuto(),
      onBetChange: (value) => this.slotMachine.setBet(value),
      onLineChange: (value) => this.slotMachine.setLines(value),
    });

    this.slotMachine.setOnBalanceChange((newBalance) => {
      this.setTopBarNumber(newBalance);
      this.persistBalance(newBalance);
    });

    this.slotMachine.setOnStateChange((state) => {
      const isIdle = state === SlotState.IDLE;
      this.slotUI.setButtonsEnabled(isIdle);
      if (!isIdle) this.slotUI.setAutoMode(
        state === SlotState.AUTO_SPINNING ||
        state === SlotState.SPINNING ||
        state === SlotState.EVALUATING ||
        state === SlotState.WIN_PRESENTATION,
      );
      if (state === SlotState.IDLE) this.slotUI.setAutoMode(false);
    });

    this.slotMachine.setOnWin((win) => {
      if (win.totalWin > 0) {
        this.slotUI.showWin(win.totalWin);
      }
    });

    const gridBorder = this.add.graphics();
    gridBorder.lineStyle(3, 0x4488cc, 0.6);
    gridBorder.strokeRect(gridX - 4, gridY - 4, GRID_WIDTH + 8, GRID_HEIGHT + 8);

    return [...topBar, title, gridBorder];
  }

  private lastSyncedBalance = 0;

  private persistBalance(newBalance: number) {
    if (newBalance === this.lastSyncedBalance) return;
    this.lastSyncedBalance = newBalance;

    updateBalanceOnServer(newBalance, "slot").catch((err) => {
      console.warn("[SceneHenesys] Failed to sync balance:", err);
    });
  }

  private handlePlay() {
    this.slotMachine.play();
  }

  private handleAuto() {
    this.slotMachine.startAuto();
  }

  private handleStopAuto() {
    this.slotMachine.stopAuto();
  }

  shutdown() {
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}
