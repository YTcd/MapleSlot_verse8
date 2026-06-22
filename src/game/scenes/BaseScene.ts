import Phaser from "phaser";
import { goToScene } from "../utils/SceneTransition";
import { checkAllCleared } from "../utils/ServerBridge";

const COIN_TIERS = [
  { max: 999, key: "coin_bronze", url: "https://resource-static.msu.io/data/Item/Consume/0243/02435104/info/icon.png" },
  { max: 999999, key: "coin_silver", url: "https://resource-static.msu.io/data/Item/Consume/0243/02433909/info/icon.png" },
  { max: 999999999, key: "coin_gold", url: "https://resource-static.msu.io/data/Item/Consume/0243/02433910/info/icon.png" },
  { max: Infinity, key: "coin_pouch", url: "https://resource-static.msu.io/data/Item/Consume/0263/02630012/info/icon.png" },
];

export abstract class BaseScene extends Phaser.Scene {
  private topBarNumberText?: Phaser.GameObjects.Text;
  private topBarCoinIcon?: Phaser.GameObjects.Image;
  private backBtnRef?: Phaser.GameObjects.Rectangle;
  protected balance: number = 0;

  preload() {}

  init(data?: Record<string, unknown>) {
    if (data?.balance !== undefined) {
      this.balance = data.balance as number;
    }
  }

  create() {
    this.input.enabled = true;
    this.events.once("shutdown", this.shutdown, this);
    const children = this.buildScene();
    this.fadeIn(children);
  }

  update() {}

  protected setBackButtonEnabled(enabled: boolean) {
    if (!this.backBtnRef) return;
    if (enabled) {
      this.backBtnRef.setAlpha(1);
      this.backBtnRef.setInteractive({ useHandCursor: true });
    } else {
      this.backBtnRef.setAlpha(0.3);
      this.backBtnRef.disableInteractive();
    }
  }

  protected checkAndShowAllClear() {
    checkAllCleared().then((cleared) => {
      if (cleared) this.showAllClearPopup();
    });
  }

  protected showAllClearPopup() {
    const { width, height } = this.cameras.main;
    const dim = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);
    dim.setDepth(200).setInteractive({ useHandCursor: false });
    dim.on("pointerdown", () => {});

    const popup = this.add.container(0, 0).setDepth(201);
    const pw = 400, ph = 200;
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, 12);
    bg.lineStyle(2, 0xf0d060, 0.9);
    bg.strokeRoundedRect(width / 2 - pw / 2, height / 2 - ph / 2, pw, ph, 12);
    popup.add(bg);

    const title = this.add.text(width / 2, height / 2 - 30, "All Clear!", {
      fontFamily: "Arial, sans-serif",
      fontSize: "36px",
      color: "#f0d060",
      fontStyle: "bold",
    }).setOrigin(0.5);
    popup.add(title);

    const sub = this.add.text(width / 2, height / 2 + 20, "모든 보스를 처치했습니다!", {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: "#cccccc",
    }).setOrigin(0.5);
    popup.add(sub);

    const okBtn = this.add.rectangle(width / 2, height / 2 + 60, 120, 40, 0x4a6fa5, 0.9);
    okBtn.setStrokeStyle(2, 0x88bbee);
    okBtn.setInteractive({ useHandCursor: true });
    okBtn.on("pointerdown", () => {
      dim.destroy();
      popup.destroy();
    });
    popup.add(okBtn);

    const okText = this.add.text(width / 2, height / 2 + 60, "확인", {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    popup.add(okText);
  }

  shutdown() {}

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

      this.backBtnRef = backBtn;
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
