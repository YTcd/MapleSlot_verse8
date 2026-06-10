import Phaser from "phaser";
import { BaseScene } from "./BaseScene";
import { goToScene } from "../utils/SceneTransition";

export class SceneA extends BaseScene {
  constructor() {
    super({ key: "SceneA" });
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#2d2d44");

    const title = this.add
      .text(width / 2, height * 0.22, "SCENE A", {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#e0e0ff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const subtitle = this.add
      .text(width / 2, height * 0.33, "2d-phaser-basic", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#8888aa",
      })
      .setOrigin(0.5);

    const btnBg = this.add.rectangle(width / 2, height * 0.55, 240, 64, 0x4a6fa5);
    btnBg.setStrokeStyle(2, 0x88bbee);
    btnBg.setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(width / 2, height * 0.55, "Go to Scene B", {
        fontFamily: "Arial, sans-serif",
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    btnBg.on("pointerover", () => { btnBg.setFillStyle(0x5a8fc5); });
    btnBg.on("pointerout", () => { btnBg.setFillStyle(0x4a6fa5); });
    btnBg.on("pointerdown", () => { goToScene(this, "SceneB"); });

    return [title, subtitle, btnBg, btnText];
  }
}
