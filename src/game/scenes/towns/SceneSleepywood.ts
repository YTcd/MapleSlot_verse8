import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { CascadeSlotMachine } from "../../slots/CascadeSlotMachine";
import { SlotUI } from "../../slots/SlotUI";
import { SlotState } from "../../slots/SlotConstants";
import { updateBalanceOnServer, fetchBossHP, saveBossHP, markBossDead } from "../../utils/ServerBridge";
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
import capData from "../../../../data/maple/cap_1002330.json";
import coatData from "../../../../data/maple/coat_1040110.json";
import pantsData from "../../../../data/maple/pants_1060099.json";
import shoesData from "../../../../data/maple/shoes_1072174.json";

const CELL = 100;
const GRID_WIDTH = CASCADE_REEL_COUNT * CELL;
const GRID_HEIGHT = CASCADE_VISIBLE_ROWS * CELL;
const BAR_HEIGHT = 72;
const BOSS_URL = "https://resource-static.msu.io/data/Mob/9300203/stand/{frame}.png";
const BOSS_HIT_URL = "https://resource-static.msu.io/data/Mob/9300203/hit1/0.png";
const BOSS_DIE_URL = "https://resource-static.msu.io/data/Mob/9300203/die1/{frame}.png";
const BOSS_STAND_FRAMES = 2;
const BOSS_DIE_FRAMES = 3;
const KNIFE_URL = "https://resource-static.msu.io/data/Item/Consume/0207/02070001/info/icon.png";

export class SceneSleepywood extends BaseScene {
  private slotMachine!: CascadeSlotMachine;
  private slotUI!: SlotUI;
  private player!: MapleSprite;
  private attackQueue = 0;
  private isAttacking = false;
  private attackToggle = 0;
  private bossImg!: Phaser.GameObjects.Sprite;
  private bossHPBar!: BossHPBar;
  private bossHP = 30_000_000;
  private bossMaxHP = 30_000_000;

  constructor() {
    super({ key: "SceneSleepywood" });
  }

  preload() {
    this.preloadTopBarIcons();

    for (const d of [bodyData, headData, faceData, hairData, weaponData, capData, coatData, pantsData, shoesData]) {
      queueRenderPlan(this, d.cdnBase, d.render_plan);
    }

    for (let f = 0; f < BOSS_STAND_FRAMES; f++) {
      this.load.image(`boss_stand_${f}`, BOSS_URL.replace("{frame}", String(f)));
    }
    for (let f = 0; f < BOSS_DIE_FRAMES; f++) {
      this.load.image(`boss_die_${f}`, BOSS_DIE_URL.replace("{frame}", String(f)));
    }
    this.load.image("boss_hit", BOSS_HIT_URL);
    this.load.image("knife_wolbi", KNIFE_URL);
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#2d5a1e");

    const topBar = this.createTopBar();
    const barH = height * 0.1;

    const title = this.add
      .text(width / 2, barH / 2, "Sleepywood", {
        fontFamily: '"Gowun Batang", "Noto Serif KR", serif',
        fontSize: "24px",
        color: "#f5e6c8",
        fontStyle: "bold",
        stroke: "#2a1a0a",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1);

    const gridX = (width - GRID_WIDTH) / 2;
    const titleBottom = barH + 8;
    const hpBarH = 46;
    const hpBarY = titleBottom + 14;
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
      this.setBackButtonEnabled(isIdle);
    });

    this.slotMachine.setOnWin((win) => {
      if (win.totalWin > 0) {
        this.slotUI.showWin(win.totalWin);
        this.queueAttack();
        this.throwKnife(win.totalWin);
      }
    });

    this.slotMachine.setOnAutoEnd(() => {
      this.slotUI.setAutoMode(false);
      const needed = this.slotMachine.currentBet * this.slotMachine.currentLines;
      if (this.slotMachine.currentBalance < needed) {
        this.slotUI.showTooltip(
          `잔액 부족으로 Auto 중단\n필요: ${needed.toLocaleString("en-US")} | 보유: ${this.slotMachine.currentBalance.toLocaleString("en-US")}`,
        );
      }
    });

    const gridBorder = this.add.graphics();
    gridBorder.lineStyle(3, 0x4488cc, 0.6);
    gridBorder.strokeRect(gridX - 4, gridY - 4, GRID_WIDTH + 8, GRID_HEIGHT + 8);
    gridBorder.setDepth(0);

    const charPad = 24;
    const displayAreaMidY = contentTop + topPad + charH / 2;
    const displayH = Math.min(charH * 0.85, 100);

    const hpBarW = GRID_WIDTH * 1.3;
    this.bossHPBar = new BossHPBar(this, width / 2, hpBarY, hpBarW, {
      bossName: "Jr.Balrog",
      bossIconKey: "boss_stand_0",
      maxHP: 30000000,
      currentHP: 30000000,
      barColor: 0xcc3333,
    });

    fetchBossHP("JrBalrog").then((hp) => {
      this.bossHP = Math.min(hp, this.bossMaxHP);
      this.bossHPBar.setHP(this.bossHP);
      if (hp > this.bossMaxHP) saveBossHP("JrBalrog", this.bossHP);
    });

    if (!this.anims.exists("jrbalrog_stand")) {
      this.anims.create({
        key: "jrbalrog_stand",
        frames: Array.from({ length: BOSS_STAND_FRAMES }, (_, f) => ({ key: `boss_stand_${f}` })),
        frameRate: 1000 / 150,
        repeat: -1,
      });
    }
    if (!this.anims.exists("jrbalrog_die")) {
      this.anims.create({
        key: "jrbalrog_die",
        frames: Array.from({ length: BOSS_DIE_FRAMES }, (_, f) => ({ key: `boss_die_${f}` })),
        frameRate: 1000 / 233,
        repeat: 0,
      });
    }

    const merged = [
      ...bodyData.render_plan,
      ...headData.render_plan,
      ...faceData.render_plan,
      ...hairData.render_plan,
      ...capData.render_plan,
      ...coatData.render_plan,
      ...pantsData.render_plan,
      ...shoesData.render_plan,
      ...weaponData.render_plan,
    ];
    this.player = new MapleSprite(this, gridX + charPad, displayAreaMidY, merged, {
      zmap: bodyData.zmap,
      weapon: weaponData.info,
      cap: capData.info,
      race: "human",
      facing: "right",
    });
    this.player.stand();

    this.bossImg = this.add.sprite(gridX + GRID_WIDTH - charPad, displayAreaMidY, "boss_stand_0");
    this.bossImg.setDisplaySize(displayH, displayH);
    this.bossImg.setOrigin(1, 0.5);
    this.bossImg.play("jrbalrog_stand");

    this.time.delayedCall(500, () => this.checkAndShowAllClear());

    return [...topBar, title, this.bossHPBar.getContainer(), this.player, this.bossImg, gridBorder];
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
    if (!this.slotMachine.play()) {
      const needed = this.slotMachine.currentBet * this.slotMachine.currentLines;
      this.slotUI.showTooltip(
        `잔액 부족\n필요: ${needed.toLocaleString("en-US")} | 보유: ${this.slotMachine.currentBalance.toLocaleString("en-US")}`,
      );
    }
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
    const actions = ["swingO1", "stabO1", "stabO2"];
    const action = actions[this.attackToggle % actions.length];
    this.attackToggle++;
    this.player.setAction(action);
    this.time.delayedCall(600, () => {
      this.player.stand();
      this.isAttacking = false;
      if (this.attackQueue > 0) this.playNextAttack();
    });
  }

  private throwKnife(damage: number) {
    const px = this.player.x + 40;
    const py = this.player.y - 20;
    const bx = this.bossImg.x - 30;
    const by = this.bossImg.y;

    const knife = this.add.image(px, py, "knife_wolbi").setDepth(10);

    this.tweens.add({
      targets: knife,
      x: bx,
      y: by,
      angle: 720,
      duration: 350,
      ease: "Sine.easeIn",
      onUpdate: () => {
        const progress = (knife.x - px) / (bx - px);
        knife.setScale(1 - progress * 0.5);
      },
      onComplete: () => {
        knife.destroy();
        this.bossHP = Math.max(0, this.bossHP - damage);
        this.bossHPBar.setHP(this.bossHP, this.bossMaxHP);
        saveBossHP("JrBalrog", this.bossHP);

        if (this.bossHP <= 0) {
          this.bossImg.setTexture("boss_hit");
          markBossDead("JrBalrog");
          this.time.delayedCall(200, () => {
            this.bossImg.play("jrbalrog_die");
            this.tweens.add({
              targets: this.bossImg,
              alpha: 0,
              duration: 600,
              delay: 500,
            });
          });
          this.time.delayedCall(1200, () => this.checkAndShowAllClear());
        } else {
          this.bossImg.setTexture("boss_hit");
          this.time.delayedCall(200, () => {
            this.bossImg.play("jrbalrog_stand");
          });
        }
      },
    });
  }

  shutdown() {
    this.player?.destroy();
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}
