import Phaser from "phaser";
import { BaseScene } from "./BaseScene";
import { goToScene } from "../utils/SceneTransition";
import { isNewUser, resetBalance, clearUserState } from "../utils/ServerBridge";
import Assets from "../../assets.json";

const BG_URL = Assets.ui.titleBg.url;
const LOGO_URL = Assets.ui.titleLogo.url;
const BTN_BG_URL = Assets.ui.btnBg.url;

(window as any).__resetBalance = resetBalance;
(window as any).__clearUserState = clearUserState;
(window as any).__isNewUser = isNewUser;

export class TitleScene extends BaseScene {
  private isNew = false;

  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    this.load.image("title_bg", BG_URL);
    this.load.image("title_logo", LOGO_URL);
    this.load.image("btn_bg", BTN_BG_URL);
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    isNewUser().then((result) => {
      this.isNew = result;
    });

    const bg = this.add
      .image(width / 2, height / 2, "title_bg")
      .setOrigin(0.5)
      .setDisplaySize(width, height);

    const logoScale = width * 0.44 / 1024;
    const logoImg = this.add
      .image(width / 2, height * 0.35, "title_logo")
      .setOrigin(0.5)
      .setScale(logoScale);

    const btnW = 280;
    const btnH = 70;
    const btnX = width / 2;
    const btnY = height * 0.58;

    const btnBg = this.add
      .image(btnX, btnY, "btn_bg")
      .setOrigin(0.5)
      .setDisplaySize(btnW, btnH);

    const btnHitArea = this.add.rectangle(btnX, btnY, btnW, btnH, 0x000000, 0.001);
    btnHitArea.setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(btnX, btnY, "Game Start", {
        fontFamily: "Georgia, serif",
        fontSize: "26px",
        color: "#fff8e0",
        fontStyle: "bold",
        stroke: "#3a2010",
        strokeThickness: 3,
        shadow: {
          offsetX: 1,
          offsetY: 2,
          color: "#1a0a00",
          blur: 3,
          fill: true,
        },
      })
      .setOrigin(0.5);

    btnHitArea.on("pointerover", () => {
      btnBg.setDisplaySize(btnW * 1.05, btnH * 1.05);
      btnText.setScale(1.05);
    });
    btnHitArea.on("pointerout", () => {
      btnBg.setDisplaySize(btnW, btnH);
      btnText.setScale(1);
    });
    btnHitArea.on("pointerdown", () => { goToScene(this, "TownSelectScene", { isNewUser: this.isNew }); });

    const delBtnW = 140;
    const delBtnH = 32;
    const delBtnX = 80;
    const delBtnY = height - 30;

    const delBg = this.add.rectangle(delBtnX, delBtnY, delBtnW, delBtnH, 0x662222, 0.7);
    delBg.setStrokeStyle(1, 0x994444);
    delBg.setInteractive({ useHandCursor: true });
    delBg.on("pointerover", () => { delBg.setFillStyle(0x883333, 0.8); });
    delBg.on("pointerout", () => { delBg.setFillStyle(0x662222, 0.7); });
    delBg.on("pointerdown", () => {
      delBg.disableInteractive();
      clearUserState().then(() => {
        alert("User data deleted. Refresh to start as a new user.");
      });
    });

    const delText = this.add.text(delBtnX, delBtnY, "User Del", {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: "#cc8888",
    }).setOrigin(0.5);

    return [bg, logoImg, btnBg, btnHitArea, btnText, delBg, delText];
  }
}
