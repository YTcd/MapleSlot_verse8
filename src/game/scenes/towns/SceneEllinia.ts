import Phaser from "phaser";
import { BaseScene } from "../BaseScene";

export class SceneEllinia extends BaseScene {
  constructor() {
    super({ key: "SceneEllinia" });
  }

  preload() {
    this.preloadTopBarIcons();
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#2d1a4a");

    const topBar = this.createTopBar();

    const title = this.add
      .text(width / 2, height * 0.22, "Ellinia", {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#c0a0f0",
        fontStyle: "bold",
        stroke: "#1a0a3a",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    return [...topBar, title];
  }
}
