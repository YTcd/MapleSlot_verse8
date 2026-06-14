import Phaser from "phaser";
import { BaseScene } from "./BaseScene";
import { goToScene } from "../utils/SceneTransition";

const TOWN_SCENES = [
  { name: "Lith Harbor", key: "SceneLithHarbor" },
  { name: "Henesys", key: "SceneHenesys" },
  { name: "Ellinia", key: "SceneEllinia" },
  { name: "Perion", key: "ScenePerion" },
  { name: "Kerning City", key: "SceneKerningCity" },
];

export class TownSelectScene extends BaseScene {
  constructor() {
    super({ key: "TownSelectScene" });
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#0d1321");

    const title = this.add
      .text(width / 2, height * 0.2, "Select Town", {
        fontFamily: "Arial, sans-serif",
        fontSize: "40px",
        color: "#f0d060",
        fontStyle: "bold",
        stroke: "#3a2010",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const btnW = 140;
    const btnH = 56;
    const gap = 16;
    const totalW = TOWN_SCENES.length * btnW + (TOWN_SCENES.length - 1) * gap;
    const startX = (width - totalW) / 2 + btnW / 2;
    const btnY = height * 0.55;

    const children: Phaser.GameObjects.GameObject[] = [title];

    TOWN_SCENES.forEach((town, i) => {
      const x = startX + i * (btnW + gap);

      const btnBg = this.add.rectangle(x, btnY, btnW, btnH, 0x4a6fa5, 0.85);
      btnBg.setStrokeStyle(2, 0x88bbee);
      btnBg.setInteractive({ useHandCursor: true });

      const btnText = this.add
        .text(x, btnY, town.name, {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      btnBg.on("pointerover", () => { btnBg.setFillStyle(0x5a8fc5, 0.85); });
      btnBg.on("pointerout", () => { btnBg.setFillStyle(0x4a6fa5, 0.85); });
      btnBg.on("pointerdown", () => { goToScene(this, town.key); });

      children.push(btnBg, btnText);
    });

    return children;
  }
}
