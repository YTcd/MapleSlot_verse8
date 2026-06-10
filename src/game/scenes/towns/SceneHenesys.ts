import Phaser from "phaser";
import { BaseScene } from "../BaseScene";

export class SceneHenesys extends BaseScene {
  constructor() {
    super({ key: "SceneHenesys" });
  }

  preload() {
    this.preloadTopBarIcons();
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#2d5a1e");

    const topBar = this.createTopBar();

    const title = this.add
      .text(width / 2, height * 0.22, "Henesys", {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#b0f0a0",
        fontStyle: "bold",
        stroke: "#1a3a0a",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    return [...topBar, title];
  }
}
