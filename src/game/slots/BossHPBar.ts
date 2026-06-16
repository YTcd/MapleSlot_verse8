import Phaser from "phaser";

export interface BossHPBarConfig {
  bossName: string;
  bossIconKey: string;
  maxHP: number;
  currentHP: number;
  barColor: number;
}

export class BossHPBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private barGfx: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private hpText: Phaser.GameObjects.Text;
  private currentHP: number;
  private maxHP: number;
  private barColor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, config: BossHPBarConfig) {
    this.scene = scene;
    this.currentHP = config.currentHP;
    this.maxHP = config.maxHP;
    this.barColor = config.barColor;

    this.container = scene.add.container(0, 0);

    const panelH = 32;
    const panelRadius = 6;
    const iconSize = 28;
    const barH = 14;

    const panelGfx = scene.add.graphics();
    panelGfx.fillStyle(0x1a1a2e, 0.9);
    panelGfx.fillRoundedRect(0, 0, width, panelH, panelRadius);
    panelGfx.lineStyle(2, 0xc8a84a, 0.8);
    panelGfx.strokeRoundedRect(0, 0, width, panelH, panelRadius);
    this.container.add(panelGfx);

    const iconX = 10;
    const iconY = panelH / 2;
    const iconFrame = scene.add.graphics();
    iconFrame.fillStyle(0x222244, 1);
    iconFrame.fillRoundedRect(iconX - iconSize / 2 - 2, iconY - iconSize / 2 - 2, iconSize + 4, iconSize + 4, 4);
    iconFrame.lineStyle(1, config.barColor, 0.7);
    iconFrame.strokeRoundedRect(iconX - iconSize / 2 - 2, iconY - iconSize / 2 - 2, iconSize + 4, iconSize + 4, 4);
    this.container.add(iconFrame);

    const iconImg = scene.add.image(iconX, iconY, config.bossIconKey);
    iconImg.setDisplaySize(iconSize, iconSize);
    this.container.add(iconImg);

    const nameX = iconX + iconSize / 2 + 12;
    this.nameText = scene.add.text(nameX, iconY - barH / 2 - 2, config.bossName, {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0, 1);
    this.container.add(this.nameText);

    const barX = nameX;
    const barY = iconY - barH / 2 + 2;
    const barW = width - barX - 10;

    const barBg = scene.add.graphics();
    barBg.fillStyle(0x333333, 1);
    barBg.fillRoundedRect(barX, barY, barW, barH, 3);
    this.container.add(barBg);

    this.barGfx = scene.add.graphics();
    this.container.add(this.barGfx);

    this.hpText = scene.add.text(width - 8, iconY, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "10px",
      color: "#ffcc44",
      fontStyle: "bold",
    }).setOrigin(1, 0.5);
    this.container.add(this.hpText);

    this.drawBar(barX, barY, barW, barH);

    this.container.setPosition(x - width / 2, y - panelH / 2);
  }

  private drawBar(x: number, y: number, w: number, h: number) {
    this.barGfx.clear();
    const pct = Math.max(0, this.currentHP / this.maxHP);
    const fillW = Math.max(0, w * pct);
    if (fillW > 0) {
      this.barGfx.fillStyle(this.barColor, 1);
      this.barGfx.fillRoundedRect(x, y, fillW, h, 3);
    }
    this.hpText.setText(`${this.currentHP.toLocaleString("en-US")} / ${this.maxHP.toLocaleString("en-US")}`);
  }

  setHP(current: number, max?: number) {
    this.currentHP = current;
    if (max !== undefined) this.maxHP = max;
    const barX = 10 + 14 + 12;
    const iconY = 16;
    const barH = 14;
    const barY = iconY - barH / 2 + 2;
    const barW = (this.container.width || 400) - barX - 10;
    this.drawBar(barX, barY, barW, barH);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  destroy() {
    this.container.destroy();
  }
}
