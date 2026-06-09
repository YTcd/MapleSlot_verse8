import Phaser from "phaser";
import { BaseScene } from "./BaseScene";
import { goToScene } from "../utils/SceneTransition";

export class TitleScene extends BaseScene {
  constructor() {
    super({ key: "TitleScene" });
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#1a1a2e");

    const btnBg = this.add.rectangle(width / 2, height / 2, 240, 64, 0x4a6fa5);
    btnBg.setStrokeStyle(2, 0x88bbee);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(width / 2, height / 2, "게임시작", {
        fontFamily: "Arial, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    btnBg.on("pointerover", () => { btnBg.setFillStyle(0x5a8fc5); });
    btnBg.on("pointerout", () => { btnBg.setFillStyle(0x4a6fa5); });
    btnBg.on("pointerdown", () => { goToScene(this, "SceneA"); });

    return [btnBg, btnText];
  }
}
