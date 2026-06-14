import Phaser from "phaser";
import { BaseScene } from "./BaseScene";
import { goToScene } from "../utils/SceneTransition";

export class SceneB extends BaseScene {
  constructor() {
    super({ key: "SceneB" });
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#1e3a1e");

    const title = this.add
      .text(width / 2, height * 0.22, "SCENE B", {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#c0ffc0",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(width / 2, height * 0.33, "2d-phaser-basic", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#559955",
      })
      .setOrigin(0.5);

    const btnBg = this.add.rectangle(width / 2, height * 0.55, 240, 64, 0x5a8a3c);
    btnBg.setStrokeStyle(2, 0x88cc66);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(width / 2, height * 0.55, "Go to Scene A", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    btnBg.on("pointerover", () => { btnBg.setFillStyle(0x6aaa4c); });
    btnBg.on("pointerout", () => { btnBg.setFillStyle(0x5a8a3c); });
    btnBg.on("pointerdown", () => { goToScene(this, "SceneA"); });

    return [title, subtitle, btnBg, btnText];
  }
}
