import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { CascadeSlotMachine } from "../../slots/CascadeSlotMachine";
import { SlotUI } from "../../slots/SlotUI";
import { SlotState } from "../../slots/SlotConstants";
import { updateBalanceOnServer } from "../../utils/ServerBridge";
import {
  CASCADE_REEL_COUNT,
  CASCADE_VISIBLE_ROWS,
} from "../../slots/CascadeSlotConstants";
import { MapleSprite, queueRenderPlan } from "../../../__system__/maple";
import { BossHPBar } from "../../slots/BossHPBar";
import bodyData from "../../../../data/maple/body_2000.json";
import headData from "../../../../data/maple/head_12000.json";
import faceData from "../../../../data/maple/face_20000.json";
import hairData from "../../../../data/maple/hair_30000.json";
import weaponData from "../../../../data/maple/weapon_1472263.json";

const CELL = 100;
const GRID_WIDTH = CASCADE_REEL_COUNT * CELL;
const GRID_HEIGHT = CASCADE_VISIBLE_ROWS * CELL;
const BAR_HEIGHT = 72;
const BOSS_URL = "https://resource-static.msu.io/data/Mob/9303082/stand/0.png";

export class SceneSleepywood extends BaseScene {
  private slotMachine!: CascadeSlotMachine;
  private slotUI!: SlotUI;
  private player!: MapleSprite;
  private attackQueue = 0;
  private isAttacking = false;
  private shootToggle = false;

  constructor() {
    super({ key: "SceneSleepywood" });
  }

  preload() {
    this.preloadTopBarIcons();

    for (const d of [bodyData, headData, faceData, hairData, weaponData]) {
      queueRenderPlan(this, d.cdnBase, d.render_plan);
    }

    this.load.image("boss_balrog", BOSS_URL);
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#2d5a1e");

    const topBar = this.createTopBar();

    const title = this.add
      .text(width / 2, height * 0.08, "Sleepywood", {
        fontFamily: '"Gowun Batang", "Noto Serif KR", serif',
        fontSize: "40px",
        color: "#f5e6c8",
        fontStyle: "bold",
        stroke: "#2a1a0a",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(1);

    const gridX = (width - GRID_WIDTH) / 2;
    const titleBottom = height * 0.08 + 40;
    const hpBarH = 36;
    const hpBarY = titleBottom + 6;
    const contentTop = hpBarY + hpBarH + 4;
    const availableH = height - BAR_HEIGHT - contentTop;
    const charH = availableH * 0.20;
    const totalBlockH = charH + GRID_HEIGHT;
    const topPad = Math.max(0, (availableH - totalBlockH) / 2);
    const gridY = contentTop + topPad + charH;

    this.slotMachine = new CascadeSlotMachine(this, gridX, gridY, this.balance);

    const barY = height - BAR_HEIGHT;
    this.slotUI = new SlotUI(this, 0, barY, width, {
      onPlay: () => this.handlePlay(),
      onAuto: () => this.handleAuto(),
      onStopAuto: () => this.handleStopAuto(),
      onBetChange: (value) => this.slotMachine.setBet(value),
      onLineChange: (value) => this.slotMachine.setLines(value),
    });

    this.slotUI.updateLineDisplay(25);

    this.slotMachine.setOnBalanceChange((newBalance) => {
      this.setTopBarNumber(newBalance);
      this.persistBalance(newBalance);
    });

    this.slotMachine.setOnStateChange((state) => {
      const isIdle = state === SlotState.IDLE;
      this.slotUI.setButtonsEnabled(isIdle);
    });

    this.slotMachine.setOnWin((win) => {
      if (win.totalWin > 0) {
        this.slotUI.showWin(win.totalWin);
        this.queueAttack();
      }
    });

    this.slotMachine.setOnAutoEnd(() => {
      this.slotUI.setAutoMode(false);
    });

    const gridBorder = this.add.graphics();
    gridBorder.lineStyle(3, 0x4488cc, 0.6);
    gridBorder.strokeRect(gridX - 4, gridY - 4, GRID_WIDTH + 8, GRID_HEIGHT + 8);
    gridBorder.setDepth(0);

    const charPad = 24;
    const displayAreaMidY = contentTop + topPad + charH / 2;
    const displayH = Math.min(charH * 0.85, 100);

    const hpBarW = GRID_WIDTH * 1.3;
    const bossHPBar = new BossHPBar(this, width / 2, hpBarY, hpBarW, {
      bossName: "Balrog",
      bossIconKey: "boss_balrog",
      maxHP: 50000000,
      currentHP: 50000000,
      barColor: 0xcc3333,
    });

    const merged = [
      ...bodyData.render_plan,
      ...headData.render_plan,
      ...faceData.render_plan,
      ...hairData.render_plan,
      ...weaponData.render_plan,
    ];
    this.player = new MapleSprite(this, gridX + charPad, displayAreaMidY, merged, {
      zmap: bodyData.zmap,
      weapon: weaponData.info,
      race: "human",
      facing: "right",
    });
    this.player.stand();

    const bossImg = this.add.image(gridX + GRID_WIDTH - charPad, displayAreaMidY, "boss_balrog");
    bossImg.setDisplaySize(displayH, displayH);
    bossImg.setOrigin(1, 0.5);

    return [...topBar, title, bossHPBar.getContainer(), this.player, bossImg, gridBorder];
  }

  private lastSyncedBalance = 0;

  private persistBalance(newBalance: number) {
    if (newBalance === this.lastSyncedBalance) return;
    this.lastSyncedBalance = newBalance;

    updateBalanceOnServer(newBalance, "slot").catch((err) => {
      console.warn("[SceneSleepywood] Failed to sync balance:", err);
    });
  }

  private handlePlay() {
    this.slotMachine.play();
  }

  private handleAuto() {
    this.slotUI.setAutoMode(true);
    this.slotMachine.startAuto();
  }

  private handleStopAuto() {
    this.slotMachine.stopAuto();
    this.slotUI.setAutoMode(false);
  }

  private queueAttack() {
    this.attackQueue++;
    if (!this.isAttacking) this.playNextAttack();
  }

  private playNextAttack() {
    if (this.attackQueue <= 0) return;
    this.attackQueue--;
    this.isAttacking = true;
    this.shootToggle = !this.shootToggle;
    this.player.attack(this.shootToggle ? 1 : 0);
    this.time.delayedCall(600, () => {
      this.player.stand();
      this.isAttacking = false;
      if (this.attackQueue > 0) this.playNextAttack();
    });
  }

  shutdown() {
    this.player?.destroy();
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}
