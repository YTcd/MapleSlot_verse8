import Phaser from "phaser";
import { BaseScene } from "../BaseScene";

export class ScenePerion extends BaseScene {
  constructor() {
    super({ key: "ScenePerion" });
  }

  preload() {
    this.preloadTopBarIcons();
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#4a3a1a");

    const topBar = this.createTopBar();

    const title = this.add
      .text(width / 2, height * 0.22, "Perion", {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#f0c060",
        fontStyle: "bold",
        stroke: "#3a2a0a",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    return [...topBar, title];
  }
}
