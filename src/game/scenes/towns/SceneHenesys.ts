import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { SlotMachine } from "../../slots/SlotMachine";
import { SlotUI } from "../../slots/SlotUI";
import { SlotWinPresentation } from "../../slots/SlotWinPresentation";
import { SlotState, REEL_COUNT, SYMBOL_SIZE, SYMBOL_GAP } from "../../slots/SlotConstants";
import { preloadMobTextures } from "../../slots/SlotSymbolData";
import { updateBalanceOnServer } from "../../utils/ServerBridge";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;
const GRID_WIDTH = REEL_COUNT * CELL - SYMBOL_GAP;
const GRID_HEIGHT = 3 * CELL - SYMBOL_GAP;
const BAR_HEIGHT = 72;

const BGM_URL = "https://resource-static.msu.io/data/Sound/Bgm00/GoPicnic.mp3";
const WIN_SFX_URL = "https://agent8-games.verse8.io/0xbd5fca74691be09be4a11386cc45c686f3ecf63d-1781021996644/static-assets/audio-a093ae4e-d8a9-493d-bf1c-3659ee66ff28.ogg";

export class SceneHenesys extends BaseScene {
  private slotMachine!: SlotMachine;
  private slotUI!: SlotUI;
  private winPresentation!: SlotWinPresentation;
  private bgMusic: Phaser.Sound.BaseSound | null = null;
  private audioLoaded: boolean = false;

  constructor() {
    super({ key: "SceneHenesys" });
  }

  preload() {
    this.preloadTopBarIcons();
    preloadMobTextures(this);

    this.load.audio("bgm_gopicnic", BGM_URL);
    this.load.audio("sfx_win", WIN_SFX_URL);
    this.load.once("complete", () => { this.audioLoaded = true; });
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

    this.slotMachine = new SlotMachine(this, gridX, gridY, this.balance);
    this.winPresentation = new SlotWinPresentation(this, gridX, gridY, this.slotMachine);

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
        this.playWinSound();
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
    gridBorder.setDepth(0);

    this.time.delayedCall(200, () => this.startBgm());

    return [...topBar, title, gridBorder];
  }

  private startBgm() {
    if (this.bgMusic) return;
    if (!this.audioLoaded) return;
    try {
      this.bgMusic = this.sound.add("bgm_gopicnic", { loop: true, volume: 0.35 });
      this.bgMusic.play();
    } catch {
      // audio unavailable
    }
  }

  private playWinSound() {
    if (!this.audioLoaded) return;
    try {
      if (this.bgMusic?.isPlaying) {
        this.bgMusic.pause();
      }
      this.sound.play("sfx_win", { volume: 0.6 });
      this.time.delayedCall(3000, () => {
        if (this.bgMusic && !this.bgMusic.isPlaying) {
          this.bgMusic.resume();
        }
      });
    } catch {
      // audio unavailable
    }
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
    try { this.bgMusic?.stop(); } catch { /* ignore */ }
    this.bgMusic = null;
    this.winPresentation?.destroy();
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}
