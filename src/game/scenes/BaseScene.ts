import Phaser from "phaser";
import { goToScene } from "../utils/SceneTransition";

const COIN_TIERS = [
  { max: 999, key: "coin_bronze", url: "https://resource-static.msu.io/data/Item/Consume/0243/02435104/info/icon.png" },
  { max: 999999, key: "coin_silver", url: "https://resource-static.msu.io/data/Item/Consume/0243/02433909/info/icon.png" },
  { max: 999999999, key: "coin_gold", url: "https://resource-static.msu.io/data/Item/Consume/0243/02433910/info/icon.png" },
  { max: Infinity, key: "coin_pouch", url: "https://resource-static.msu.io/data/Item/Consume/0263/02630012/info/icon.png" },
];

export abstract class BaseScene extends Phaser.Scene {
  private topBarNumberText?: Phaser.GameObjects.Text;
  private topBarCoinIcon?: Phaser.GameObjects.Image;
  protected balance: number = 0;

  preload() {}

  init(data?: Record<string, unknown>) {
    if (data?.balance !== undefined) {
      this.balance = data.balance as number;
    }
  }

  create() {
    this.input.enabled = true;
    const children = this.buildScene();
    this.fadeIn(children);
  }

  update() {}

  protected abstract buildScene(): Phaser.GameObjects.GameObject[];

  protected preloadTopBarIcons(): void {
    for (const tier of COIN_TIERS) {
      if (!this.textures.exists(tier.key)) {
        this.load.image(tier.key, tier.url);
      }
    }
  }

  protected setTopBarNumber(value: number): void {
    this.balance = value;
    if (this.topBarNumberText) {
      this.topBarNumberText.setText(value.toLocaleString("en-US"));
    }
    if (this.topBarCoinIcon) {
      const tier = COIN_TIERS.find(t => value <= t.max) || COIN_TIERS[COIN_TIERS.length - 1];
      this.topBarCoinIcon.setTexture(tier.key);
    }
  }

  protected createTopBar(
    backScene: string = "TownSelectScene",
    hideBack: boolean = false,
  ): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;
    const barH = height * 0.1;

    const barBg = this.add.rectangle(width / 2, barH / 2, width, barH, 0x1a1a2e, 0.9);
    barBg.setOrigin(0.5, 0.5);

    const children: Phaser.GameObjects.GameObject[] = [barBg];

    if (!hideBack) {
      const btnW = 80;
      const btnH = 32;

      const backBtn = this.add.rectangle(60, barH / 2, btnW, btnH, 0x4a6fa5, 0.85);
      backBtn.setStrokeStyle(1, 0x88bbee);
      backBtn.setInteractive({ useHandCursor: true });

      const backText = this.add
        .text(60, barH / 2, "< Back", {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      backBtn.on("pointerover", () => { backBtn.setFillStyle(0x5a8fc5, 0.85); });
      backBtn.on("pointerout", () => { backBtn.setFillStyle(0x4a6fa5, 0.85); });
      backBtn.on("pointerdown", () => { goToScene(this, backScene); });

      children.push(backBtn, backText);
    }

    const numBgW = 220;
    const numBgH = 30;

    const gfx = this.add.graphics();
    gfx.fillStyle(0x000000, 0.85);
    gfx.fillRoundedRect(0, 0, numBgW, numBgH, numBgH / 2);
    gfx.lineStyle(1, 0x333333);
    gfx.strokeRoundedRect(0, 0, numBgW, numBgH, numBgH / 2);
    gfx.setPosition(width - numBgW - 12, barH / 2 - numBgH / 2);

    const pillLeft = width - numBgW - 12;
    const displayTier =
      COIN_TIERS.find((t) => this.balance <= t.max) ||
      COIN_TIERS[COIN_TIERS.length - 1];
    const coinIcon = this.add.image(pillLeft + 18, barH / 2, displayTier.key);
    coinIcon.setDisplaySize(22, 22);
    this.topBarCoinIcon = coinIcon;

    const numText = this.add
      .text(width - 20, barH / 2, this.balance.toLocaleString("en-US"), {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(1, 0.5);

    this.topBarNumberText = numText;

    children.push(gfx, coinIcon, numText);
    return children;
  }

  protected fadeIn(children: Phaser.GameObjects.GameObject[]) {
    children.forEach((child) => (child as unknown as Phaser.GameObjects.Components.AlphaSingle).setAlpha(0));
    this.tweens.add({
      targets: children,
      alpha: 1,
      duration: 300,
      ease: "Power2",
      delay: this.tweens.stagger(60, {}),
    });
  }
}
