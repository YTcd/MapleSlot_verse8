import Phaser from "phaser";
import { BaseScene } from "../BaseScene";

export class SceneLithHarbor extends BaseScene {
  constructor() {
    super({ key: "SceneLithHarbor" });
  }

  preload() {
    this.preloadTopBarIcons();
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#1a3a5c");

    const topBar = this.createTopBar();

    const title = this.add
      .text(width / 2, height * 0.22, "Lith Harbor", {
        fontFamily: "Arial, sans-serif",
        fontSize: "48px",
        color: "#a0d8f0",
        fontStyle: "bold",
        stroke: "#0a2a3c",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    return [...topBar, title];
  }
}
