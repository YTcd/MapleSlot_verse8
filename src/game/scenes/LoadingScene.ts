import Phaser from "phaser";

const MIN_LOAD_DURATION = 2000;

export class LoadingScene extends Phaser.Scene {
  private progressBarBg: Phaser.GameObjects.Rectangle;
  private progressBarFill: Phaser.GameObjects.Rectangle;
  private progressText: Phaser.GameObjects.Text;
  private loadingText: Phaser.GameObjects.Text;

  private elapsed: number = 0;
  private started: number = 0;
  private targetSceneKey: string = "";

  constructor() {
    super({ key: "LoadingScene" });
  }

  init(data: { targetScene: string }) {
    this.targetSceneKey = data.targetScene;
  }

  create() {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#1a1a2e");
    this.input.enabled = false;
    this.started = this.time.now;

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
        0x4466ff
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
  }

  update() {
    this.elapsed = this.time.now - this.started;

    const rawProgress = Math.min(this.elapsed / 2500, 1);

    const smoothProgress = easeOutQuad(rawProgress);

    const percentage = Math.floor(smoothProgress * 100);

    const barWidth = this.progressBarBg.width - 4;
    const fillWidth = barWidth * smoothProgress;
    this.progressBarFill.width = fillWidth;
    this.progressBarFill.x = this.progressBarBg.x - this.progressBarBg.width / 2 + 2;

    this.progressText.setText(`${percentage}%`);

    if (this.elapsed >= MIN_LOAD_DURATION && percentage >= 100) {
      this.transitionToTarget();
    }
  }

  private transitionToTarget() {
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
        // ===================================================================
        // STAGE 2: DURING SCENE TRANSITION
        // ===================================================================
        // - Phaser's scene.start() destroys this loading scene and all
        //   its children automatically via shutdown().
        // - The target scene's create() builds the scene fresh.
        // - Textures from previous scene can be cleaned up here if needed.
        // ===================================================================
        this.scene.start(this.targetSceneKey);
      },
    });
  }
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}
