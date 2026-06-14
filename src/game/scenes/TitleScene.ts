import Phaser from "phaser";
import { BaseScene } from "./BaseScene";
import { goToScene } from "../utils/SceneTransition";

const CDN = "https://resource-static.msu.io/data/";

export class TitleScene extends BaseScene {
  constructor() {
    super({ key: "TitleScene" });
  }

  preload() {
    this.load.image("perion_mountain", CDN + "Map/Back/dryRock/back/26.png");
    this.load.image("perion_mid", CDN + "Map/Back/dryRock/back/1.png");
    this.load.image("perion_ground", CDN + "Map/Back/dryRock/back/0.png");
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#0d1321");

    const groundH = 128;
    const midH = 441;
    const mountainH = 280;
    const mountainW = 348;

    const bgMountain = this.add
      .image(0, 0, "perion_mountain")
      .setOrigin(0, 0)
      .setDisplaySize(mountainW * 2, mountainH * 2)
      .setAlpha(0.7);

    const bgMid = this.add
      .tileSprite(0, height - midH - groundH / 2, width, midH, "perion_mid")
      .setOrigin(0, 0);

    const bgGround = this.add
      .tileSprite(0, height - groundH, width, groundH, "perion_ground")
      .setOrigin(0, 0);

    const titleText = this.add
      .text(width / 2, height * 0.2, "MapleSlot", {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#f0d060",
        fontStyle: "bold",
        stroke: "#3a2010",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const btnBg = this.add.rectangle(width / 2, height * 0.55, 240, 64, 0x4a6fa5, 0.85);
    btnBg.setStrokeStyle(2, 0x88bbee);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(width / 2, height * 0.55, "게임시작", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    btnBg.on("pointerover", () => { btnBg.setFillStyle(0x5a8fc5, 0.85); });
    btnBg.on("pointerout", () => { btnBg.setFillStyle(0x4a6fa5, 0.85); });
    btnBg.on("pointerdown", () => { goToScene(this, "TownSelectScene"); });

    return [bgMountain, bgMid, bgGround, titleText, btnBg, btnText];
  }
}
