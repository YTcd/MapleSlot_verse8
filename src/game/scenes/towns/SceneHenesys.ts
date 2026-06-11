import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { SlotMachine } from "../../slots/SlotMachine";
import { SlotUI } from "../../slots/SlotUI";
import { SlotWinPresentation } from "../../slots/SlotWinPresentation";
import { SlotState, REEL_COUNT, SYMBOL_SIZE, SYMBOL_GAP } from "../../slots/SlotConstants";
import { updateBalanceOnServer } from "../../utils/ServerBridge";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;
const GRID_WIDTH = REEL_COUNT * CELL - SYMBOL_GAP;
const GRID_HEIGHT = 3 * CELL - SYMBOL_GAP;
const BAR_HEIGHT = 72;

export class SceneHenesys extends BaseScene {
  private slotMachine!: SlotMachine;
  private slotUI!: SlotUI;
  private winPresentation!: SlotWinPresentation;

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
    this.winPresentation = new SlotWinPresentation(this, gridX, gridY);

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
    });

    this.slotMachine.setOnWin((win) => {
      if (win.totalWin > 0) {
        this.slotUI.showWin(win.totalWin);
        this.winPresentation.start(win.lineWins);
      }
    });

    this.slotMachine.setOnAutoEnd(() => {
      this.slotUI.setAutoMode(false);
    });

    this.winPresentation.onButtonsReady = () => {
      this.slotMachine.setPresentationDone();
    };

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
    this.winPresentation.stop();
    this.slotMachine.play();
  }

  private handleAuto() {
    this.winPresentation.stop();
    this.slotUI.setAutoMode(true);
    this.slotMachine.startAuto();
  }

  private handleStopAuto() {
    this.slotMachine.stopAuto();
    this.slotUI.setAutoMode(false);
  }

  shutdown() {
    this.winPresentation?.destroy();
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}
