import Phaser from "phaser";
import { BaseScene } from "./BaseScene";
import { goToScene } from "../utils/SceneTransition";
import { resetBalance } from "../utils/ServerBridge";

const TOWN_SCENES = [
  { name: "Henesys", key: "SceneHenesys" },
  { name: "Sleepywood", key: "SceneSleepywood" },
  { name: "Ludibrium", key: "SceneLudibrium" },
];

const INITIAL_BALANCE = 300_000_000;

export class TownSelectScene extends BaseScene {
  private isNewUser = false;

  constructor() {
    super({ key: "TownSelectScene" });
  }

  init(data?: Record<string, unknown>) {
    super.init(data);
    if (data?.isNewUser === true) {
      this.isNewUser = true;
      this.balance = 0;
    }
  }

  preload() {
    this.preloadTopBarIcons();
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#0d1321");

    const topBar = this.createTopBar(undefined, true);

    const title = this.add
      .text(width / 2, height * 0.2, "Select Town", {
        fontFamily: "Arial, sans-serif",
        fontSize: "40px",
        color: "#f0d060",
        fontStyle: "bold",
        stroke: "#3a2010",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const btnW = 140;
    const btnH = 56;
    const areaWidth = width * 0.6;
    const gap = (areaWidth - TOWN_SCENES.length * btnW) / (TOWN_SCENES.length - 1);
    const totalW = TOWN_SCENES.length * btnW + (TOWN_SCENES.length - 1) * gap;
    const startX = (width - totalW) / 2 + btnW / 2;
    const btnY = height * 0.55;

    const children: Phaser.GameObjects.GameObject[] = [...topBar, title];

    TOWN_SCENES.forEach((town, i) => {
      const x = startX + i * (btnW + gap);

      const btnBg = this.add.rectangle(x, btnY, btnW, btnH, 0x4a6fa5, 0.85);
      btnBg.setStrokeStyle(2, 0x88bbee);
      btnBg.setInteractive({ useHandCursor: true });

      const btnText = this.add
        .text(x, btnY, town.name, {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      btnBg.on("pointerover", () => { btnBg.setFillStyle(0x5a8fc5, 0.85); });
      btnBg.on("pointerout", () => { btnBg.setFillStyle(0x4a6fa5, 0.85); });
      btnBg.on("pointerdown", () => { goToScene(this, town.key); });

      children.push(btnBg, btnText);
    });

    if (this.isNewUser) {
      this.showWelcomePopup(width, height);
    }

    return children;
  }

  private showWelcomePopup(w: number, h: number) {
    const dim = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6);
    dim.setDepth(100);
    dim.setInteractive({ useHandCursor: false });
    dim.on("pointerdown", () => {});

    const popupW = 420;
    const popupH = 260;
    const popupX = w / 2 - popupW / 2;
    const popupY = h / 2 - popupH / 2;

    const popup = this.add.container(0, 0).setDepth(101);

    const popupBg = this.add.graphics();
    popupBg.fillStyle(0x1a1a2e, 0.95);
    popupBg.fillRoundedRect(popupX, popupY, popupW, popupH, 12);
    popupBg.lineStyle(2, 0xc8a84a, 0.9);
    popupBg.strokeRoundedRect(popupX, popupY, popupW, popupH, 12);
    popup.add(popupBg);

    const msgText = this.add.text(w / 2, popupY + 50, "Welcome to MapleSlot!", {
      fontFamily: "Arial, sans-serif",
      fontSize: "22px",
      color: "#f0d060",
      fontStyle: "bold",
    }).setOrigin(0.5);
    popup.add(msgText);

    const subText = this.add.text(w / 2, popupY + 90, "시작하기 버튼을 누르면\n300,000,000 Meso가 지급됩니다", {
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      color: "#cccccc",
      align: "center",
    }).setOrigin(0.5);
    popup.add(subText);

    const claimBtnW = 180;
    const claimBtnH = 48;
    const claimBtnX = w / 2;
    const claimBtnY = popupY + popupH - 50;

    const claimBg = this.add.rectangle(claimBtnX, claimBtnY, claimBtnW, claimBtnH, 0x338833, 0.9);
    claimBg.setStrokeStyle(2, 0x66cc66);
    claimBg.setInteractive({ useHandCursor: true });
    popup.add(claimBg);

    const claimText = this.add.text(claimBtnX, claimBtnY, "300M Meso 받기", {
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    popup.add(claimText);

    const barH = h * 0.1;
    const balanceTargetX = w - 90;
    const balanceTargetY = barH / 2;

    claimBg.on("pointerdown", () => {
      claimBg.disableInteractive();
      dim.disableInteractive();

      const coinCount = 30;
      for (let i = 0; i < coinCount; i++) {
        this.time.delayedCall(i * 30, () => {
          const coin = this.add.image(
            claimBtnX + Phaser.Math.Between(-40, 40),
            claimBtnY + Phaser.Math.Between(-20, 20),
            "coin_gold",
          ).setDepth(102).setScale(0.3).setAlpha(0.8);

          this.tweens.add({
            targets: coin,
            scaleX: 4,
            scaleY: 4,
            alpha: 1,
            duration: 450,
            ease: "Sine.easeOut",
          });

          const flyDuration = 600;
          const shrinkStart = flyDuration * 0.8;

          this.tweens.add({
            targets: coin,
            x: balanceTargetX,
            y: balanceTargetY,
            duration: flyDuration + 150,
            delay: 450,
            ease: "Sine.easeIn",
            onComplete: () => coin.destroy(),
          });

          this.tweens.add({
            targets: coin,
            scaleX: 0.1,
            scaleY: 0.1,
            alpha: 0,
            duration: 200,
            delay: 450 + shrinkStart,
            ease: "Sine.easeIn",
          });
        });
      }

      this.time.delayedCall(400, () => {
        const rollupTween = this.tweens.addCounter({
          from: 0,
          to: INITIAL_BALANCE,
          duration: 3000,
          ease: "Sine.easeOut",
          onUpdate: (tween) => {
            this.setTopBarNumber(Math.floor(tween.getValue()));
          },
          onComplete: () => {
            this.setTopBarNumber(INITIAL_BALANCE);
            resetBalance().catch(() => {});
            dim.destroy();
            popup.destroy();
          },
        });
      });
    });
  }
}
