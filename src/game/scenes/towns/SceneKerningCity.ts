import Phaser from "phaser";
import { BaseScene } from "../BaseScene";

export class SceneKerningCity extends BaseScene {
  constructor() {
    super({ key: "SceneKerningCity" });
  }

  preload() {
    this.preloadTopBarIcons();
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#2d2d2d");

    const topBar = this.createTopBar();

    const title = this.add
      .text(width / 2, height * 0.22, "Kerning City", {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#d0d0d0",
        fontStyle: "bold",
        stroke: "#1a1a1a",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    return [...topBar, title];
  }
}
