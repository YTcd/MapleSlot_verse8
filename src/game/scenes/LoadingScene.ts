import Phaser from "phaser";
import { fetchBalance } from "../utils/ServerBridge";

const MIN_LOAD_DURATION = 2000;

export class LoadingScene extends Phaser.Scene {
  private progressBarBg!: Phaser.GameObjects.Rectangle;
  private progressBarFill!: Phaser.GameObjects.Rectangle;
  private progressText!: Phaser.GameObjects.Text;
  private loadingText!: Phaser.GameObjects.Text;

  private elapsed: number = 0;
  private targetSceneKey: string = "";
  private passData: Record<string, unknown> = {};
  private transitioning: boolean = false;
  private serverDataReady: boolean = false;

  constructor() {
    super({ key: "LoadingScene" });
  }

  init(data: { targetScene: string; passData?: Record<string, unknown> }) {
    this.targetSceneKey = data.targetScene;
    this.passData = data.passData || {};
  }

  create() {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#1a1a2e");
    this.input.enabled = false;
    this.elapsed = 0;
    this.transitioning = false;
    this.serverDataReady = false;

    this.loadingText = this.add
      .text(width / 2, height * 0.35, "Loading...", {
        fontFamily: "Arial, sans-serif",
        fontSize: "32px",
        color: "#ccccff",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const barWidth = Math.min(400, width * 0.6);
    const barHeight = 24;
    const barX = width / 2;
    const barY = height * 0.5;

    this.progressBarBg = this.add
      .rectangle(barX, barY, barWidth, barHeight, 0x222244)
      .setStrokeStyle(2, 0x4444aa)
      .setAlpha(0);

    this.progressBarFill = this.add
      .rectangle(
        barX - barWidth / 2 + 2,
        barY,
        0,
        barHeight - 4,
        0x4466ff,
      )
      .setOrigin(0, 0.5)
      .setAlpha(0);

    this.progressText = this.add
      .text(width / 2, height * 0.58, "0%", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#8888cc",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: [
        this.loadingText,
        this.progressBarBg,
        this.progressBarFill,
        this.progressText,
      ],
      alpha: 1,
      duration: 200,
      ease: "Power2",
    });

    this.fetchServerData();
  }

  private async fetchServerData() {
    try {
      const balance = await fetchBalance();
      this.passData.balance = balance;
    } catch (err) {
      console.warn("[LoadingScene] Failed to fetch balance:", err);
      this.passData.balance = 300_000_000;
    }
    this.serverDataReady = true;
  }

  update(_time: number, delta: number) {
    if (this.transitioning) return;

    this.elapsed += delta;

    const timeProgress = Math.min(this.elapsed / 2500, 1);
    const smoothProgress = easeOutQuad(timeProgress);

    const percentage = Math.floor(smoothProgress * 100);

    const barWidth = this.progressBarBg.width - 4;
    const fillWidth = barWidth * smoothProgress;
    this.progressBarFill.width = fillWidth;
    this.progressBarFill.x =
      this.progressBarBg.x - this.progressBarBg.width / 2 + 2;

    this.progressText.setText(`${percentage}%`);

    if (this.serverDataReady && this.elapsed >= MIN_LOAD_DURATION) {
      this.transitionToTarget();
    }
  }

  private transitionToTarget() {
    this.transitioning = true;
    this.tweens.add({
      targets: [
        this.loadingText,
        this.progressBarBg,
        this.progressBarFill,
        this.progressText,
      ],
      alpha: 0,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        this.scene.start(this.targetSceneKey, this.passData);
      },
    });
  }
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
