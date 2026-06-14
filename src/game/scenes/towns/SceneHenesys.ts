import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { CascadeSlotMachine } from "../../slots/CascadeSlotMachine";
import { SlotUI } from "../../slots/SlotUI";
import { SlotState } from "../../slots/SlotConstants";
import { updateBalanceOnServer } from "../../utils/ServerBridge";
import {
  CASCADE_REEL_COUNT,
  CASCADE_VISIBLE_ROWS,
} from "../../slots/CascadeSlotConstants";

const CELL = 100;
const GRID_WIDTH = CASCADE_REEL_COUNT * CELL;
const GRID_HEIGHT = CASCADE_VISIBLE_ROWS * CELL;
const BAR_HEIGHT = 72;

export class SceneHenesys extends BaseScene {
  private slotMachine!: CascadeSlotMachine;
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
        fontFamily: '"Gowun Batang", "Noto Serif KR", serif',
        fontSize: "40px",
        color: "#f5e6c8",
        fontStyle: "bold",
        stroke: "#2a1a0a",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1);

    const gridX = (width - GRID_WIDTH) / 2;
    const gridY = height * 0.22;

    this.slotMachine = new CascadeSlotMachine(this, gridX, gridY, this.balance);

    const barY = height - BAR_HEIGHT;
    this.slotUI = new SlotUI(this, 0, barY, width, {
      onPlay: () => this.handlePlay(),
      onAuto: () => this.handleAuto(),
      onStopAuto: () => this.handleStopAuto(),
      onBetChange: (value) => this.slotMachine.setBet(value),
      onLineChange: (value) => this.slotMachine.setLines(value),
    });

    this.slotUI.updateLineDisplay(25);

    this.slotMachine.setOnBalanceChange((newBalance) => {
      this.setTopBarNumber(newBalance);
      this.persistBalance(newBalance);
    });

    this.slotMachine.setOnStateChange((state) => {
      const isIdle = state === SlotState.IDLE;
      this.slotUI.setButtonsEnabled(isIdle);
    });

    this.slotMachine.setOnWin((win) => {
      if (win.totalWin > 0) {
        this.slotUI.showWin(win.totalWin);
      }
    });

    this.slotMachine.setOnAutoEnd(() => {
      this.slotUI.setAutoMode(false);
    });

    const gridBorder = this.add.graphics();
    gridBorder.lineStyle(3, 0x4488cc, 0.6);
    gridBorder.strokeRect(gridX - 4, gridY - 4, GRID_WIDTH + 8, GRID_HEIGHT + 8);
    gridBorder.setDepth(0);

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
    this.slotUI.setAutoMode(true);
    this.slotMachine.startAuto();
  }

  private handleStopAuto() {
    this.slotMachine.stopAuto();
    this.slotUI.setAutoMode(false);
  }

  shutdown() {
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}
