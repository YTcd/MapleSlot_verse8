import Phaser from "phaser";
import { SlotState, BET_OPTIONS, LINE_OPTIONS } from "./SlotConstants";

const BAR_HEIGHT = 72;
const BAR_BG = 0x1a1a2e;
const BAR_ALPHA = 0.92;

const BTN_W = 100;
const BTN_H = 44;
const BTN_GAP = 12;

function formatBet(value: number): string {
  if (value >= 10000000) return (value / 1000000).toFixed(0) + "M";
  if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (value >= 10000) return (value / 1000).toFixed(0) + "K";
  if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(value);
}

interface PanelOption {
  value: number;
  label: string;
}

export class SlotUI {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private width: number;

  private container: Phaser.GameObjects.Container;
  private playBtn!: Phaser.GameObjects.Rectangle;
  private playText!: Phaser.GameObjects.Text;
  private autoBtn!: Phaser.GameObjects.Rectangle;
  private autoText!: Phaser.GameObjects.Text;
  private betBtn!: Phaser.GameObjects.Rectangle;
  private betText!: Phaser.GameObjects.Text;
  private lineBtn!: Phaser.GameObjects.Rectangle;
  private lineText!: Phaser.GameObjects.Text;
  private winText!: Phaser.GameObjects.Text;
  private tooltipContainer: Phaser.GameObjects.Container | null = null;
  private tooltipTimer: Phaser.Time.TimerEvent | null = null;
  private playBtnCenterX = 0;
  private playBtnCenterY = 0;

  private panelOpen: "bet" | "line" | null = null;
  private panelContainer: Phaser.GameObjects.Container | null = null;

  private onPlay: () => void;
  private onAuto: () => void;
  private onStopAuto: () => void;
  private onBetChange: (value: number) => void;
  private onLineChange: (value: number) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    callbacks: {
      onPlay: () => void;
      onAuto: () => void;
      onStopAuto: () => void;
      onBetChange: (value: number) => void;
      onLineChange: (value: number) => void;
    },
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.onPlay = callbacks.onPlay;
    this.onAuto = callbacks.onAuto;
    this.onStopAuto = callbacks.onStopAuto;
    this.onBetChange = callbacks.onBetChange;
    this.onLineChange = callbacks.onLineChange;

    this.container = scene.add.container(0, 0);
    this.build();
  }

  get containerRef(): Phaser.GameObjects.Container {
    return this.container;
  }

  private build() {
    const gfx = this.scene.add.graphics();
    gfx.fillStyle(BAR_BG, BAR_ALPHA);
    gfx.fillRect(this.x, this.y, this.width, BAR_HEIGHT);
    this.container.add(gfx);

    // Win text (centered above buttons, shown on win)
    this.winText = this.scene.add
      .text(this.x + this.width / 2, this.y + 12, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#66ff66",
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);
    this.container.add(this.winText);

    // --- Left: Line & Bet buttons ---
    const btnStartX = this.x + 16;

    this.lineBtn = this.makeButton(btnStartX, this.y + (BAR_HEIGHT - BTN_H) / 2, BTN_W, BTN_H, 0x3a5a8a);
    this.container.add(this.lineBtn);
    this.lineText = this.scene.add
      .text(btnStartX + BTN_W / 2, this.y + BAR_HEIGHT / 2, "Lines: 1", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container.add(this.lineText);
    this.lineBtn.setInteractive({ useHandCursor: true });
    this.lineBtn.on("pointerdown", () => this.togglePanel("line", btnStartX, this.y));

    this.betBtn = this.makeButton(btnStartX + BTN_W + BTN_GAP, this.y + (BAR_HEIGHT - BTN_H) / 2, BTN_W, BTN_H, 0x3a5a8a);
    this.container.add(this.betBtn);
    this.betText = this.scene.add
      .text(btnStartX + BTN_W + BTN_GAP + BTN_W / 2, this.y + BAR_HEIGHT / 2, "Bet: 1K", {
        fontFamily: "Arial, sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container.add(this.betText);
    this.betBtn.setInteractive({ useHandCursor: true });
    this.betBtn.on("pointerdown", () => this.togglePanel("bet", btnStartX + BTN_W + BTN_GAP, this.y));

    // --- Right: Play & Auto buttons ---
    const rightX = this.x + this.width - BTN_W * 2 - BTN_GAP * 2 - 12;
    this.playBtn = this.makeButton(rightX, this.y + (BAR_HEIGHT - BTN_H) / 2, BTN_W, BTN_H, 0x338833);
    this.container.add(this.playBtn);
    this.playBtnCenterX = rightX + BTN_W / 2;
    this.playBtnCenterY = this.y + BAR_HEIGHT / 2;
    this.playText = this.scene.add
      .text(rightX + BTN_W / 2, this.y + BAR_HEIGHT / 2, "PLAY", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container.add(this.playText);
    this.playBtn.setInteractive({ useHandCursor: true });
    this.playBtn.on("pointerdown", () => this.onPlay());

    this.autoBtn = this.makeButton(
      rightX + BTN_W + BTN_GAP,
      this.y + (BAR_HEIGHT - BTN_H) / 2,
      BTN_W,
      BTN_H,
      0x666688,
    );
    this.container.add(this.autoBtn);
    this.autoText = this.scene.add
      .text(rightX + BTN_W + BTN_GAP + BTN_W / 2, this.y + BAR_HEIGHT / 2, "AUTO", {
        fontFamily: "Arial, sans-serif",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.container.add(this.autoText);
    this.autoBtn.setInteractive({ useHandCursor: true });
    this.autoBtn.on("pointerdown", () => {
      if (this.autoText.text === "STOP") {
        this.onStopAuto();
      } else {
        this.onAuto();
      }
    });
  }

  overrideLinesButton(handler: () => void, label: string) {
    this.lineText.setText(label);
    this.lineBtn.removeAllListeners("pointerdown");
    this.lineBtn.on("pointerdown", handler);
  }

  private makeButton(x: number, y: number, w: number, h: number, color: number): Phaser.GameObjects.Rectangle {
    const rect = this.scene.add.rectangle(x + w / 2, y + h / 2, w, h, color, 0.85);
    rect.setStrokeStyle(2, 0x88aacc);
    return rect;
  }

  private togglePanel(type: "bet" | "line", anchorX: number, anchorY: number) {
    if (this.panelOpen === type) {
      this.closePanel();
      return;
    }
    this.closePanel();
    this.panelOpen = type;

    const options: PanelOption[] =
      type === "bet"
        ? BET_OPTIONS.map((v) => ({ value: v, label: formatBet(v) }))
        : LINE_OPTIONS.map((v) => ({ value: v, label: String(v) }));

    const panelW = 100;
    const panelH = options.length * 32 + 8;
    const panelY = anchorY - panelH - 4;

    this.panelContainer = this.scene.add.container(0, 0);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x222244, 0.95);
    bg.fillRoundedRect(anchorX, panelY, panelW, panelH, 6);
    bg.lineStyle(2, 0x4488cc);
    bg.strokeRoundedRect(anchorX, panelY, panelW, panelH, 6);
    this.panelContainer.add(bg);

    options.forEach((opt, i) => {
      const optY = panelY + 8 + i * 32 + 16;
      const optBg = this.scene.add.rectangle(
        anchorX + panelW / 2,
        optY,
        panelW - 8,
        28,
        0x333366,
        0.85,
      );
      optBg.setInteractive({ useHandCursor: true });
      optBg.on("pointerover", () => optBg.setFillStyle(0x4444aa, 0.85));
      optBg.on("pointerout", () => optBg.setFillStyle(0x333366, 0.85));
      optBg.on("pointerdown", () => {
        if (type === "bet") this.updateBetDisplay(opt.value);
        else this.updateLineDisplay(opt.value);
        this.closePanel();
      });

      const optText = this.scene.add
        .text(anchorX + panelW / 2, optY, opt.label, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      this.panelContainer.add([optBg, optText]);
    });
  }

  updateBetDisplay(value: number) {
    this.betText.setText(`Bet: ${formatBet(value)}`);
    this.onBetChange(value);
  }
  updateLineDisplay(value: number) {
    this.lineText.setText(`Lines: ${value}`);
    this.onLineChange(value);
  }

  private closePanel() {
    this.panelOpen = null;
    if (this.panelContainer) {
      this.panelContainer.destroy();
      this.panelContainer = null;
    }
  }

  showWin(amount: number) {
    this.winText.setText(`WIN +${amount.toLocaleString("en-US")}`);
    this.winText.setAlpha(1);
    this.scene.tweens.add({
      targets: this.winText,
      alpha: 0,
      delay: 2000,
      duration: 500,
    });
  }

  setAutoMode(active: boolean) {
    this.autoText.setText(active ? "STOP" : "AUTO");
    this.autoBtn.setFillStyle(active ? 0x883333 : 0x666688, 0.85);
  }

  setButtonsEnabled(enabled: boolean) {
    this.playBtn.setAlpha(enabled ? 1 : 0.4);
    this.autoBtn.setAlpha(enabled ? 1 : 0.4);
    this.betBtn.setAlpha(enabled ? 1 : 0.4);
    this.lineBtn.setAlpha(enabled ? 1 : 0.4);
    if (enabled) {
      this.playBtn.setInteractive({ useHandCursor: true });
      this.autoBtn.setInteractive({ useHandCursor: true });
      this.betBtn.setInteractive({ useHandCursor: true });
      this.lineBtn.setInteractive({ useHandCursor: true });
    } else {
      this.playBtn.disableInteractive();
      this.autoBtn.disableInteractive();
      this.betBtn.disableInteractive();
      this.lineBtn.disableInteractive();
    }
  }

  showTooltip(message: string) {
    this.hideTooltip();

    const tipW = 220;
    const tipH = 48;
    const tailH = 8;
    const tailW = 12;
    const tipX = this.playBtnCenterX;
    const tipY = this.y - tipH - 6;

    this.tooltipContainer = this.scene.add.container(0, 0);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x333344, 0.95);
    bg.fillRoundedRect(tipX - tipW / 2, tipY, tipW, tipH, 6);
    bg.lineStyle(2, 0x8888cc, 0.8);
    bg.strokeRoundedRect(tipX - tipW / 2, tipY, tipW, tipH, 6);
    bg.fillTriangle(
      tipX, tipY + tipH + tailH,
      tipX - tailW / 2, tipY + tipH,
      tipX + tailW / 2, tipY + tipH,
    );
    this.tooltipContainer.add(bg);

    const text = this.scene.add.text(tipX, tipY + tipH / 2, message, {
      fontFamily: "Arial, sans-serif",
      fontSize: "11px",
      color: "#ff8888",
      align: "center",
    }).setOrigin(0.5);
    this.tooltipContainer.add(text);

    bg.setInteractive(
      new Phaser.Geom.Rectangle(tipX - tipW / 2, tipY, tipW, tipH + tailH),
      Phaser.Geom.Rectangle.Contains,
    );
    bg.on("pointerdown", () => this.hideTooltip());

    this.tooltipTimer = this.scene.time.delayedCall(5000, () => this.hideTooltip());
  }

  hideTooltip() {
    this.tooltipTimer?.destroy();
    this.tooltipTimer = null;
    this.tooltipContainer?.destroy();
    this.tooltipContainer = null;
  }

  destroy() {
    this.hideTooltip();
    this.closePanel();
    this.container.destroy();
  }
}
