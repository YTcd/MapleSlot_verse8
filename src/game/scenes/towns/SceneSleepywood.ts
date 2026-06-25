import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { CascadeSlotMachine } from "../../slots/CascadeSlotMachine";
import { SlotUI } from "../../slots/SlotUI";
import { SlotState } from "../../slots/SlotConstants";
import { SLEEPYWOOD_MOB_SYMBOLS } from "../../slots/SleepywoodSymbolData";
import {
  CASCADE_REEL_COUNT,
  CASCADE_VISIBLE_ROWS,
  CASCADE_PAYLINES,
} from "../../slots/CascadeSlotConstants";
import { updateBalanceOnServer, fetchBossHP, saveBossHP, markBossDead } from "../../utils/ServerBridge";
import { preloadDamageFont, showDamageNumber } from "../../utils/DamageFont";
import { MapleSprite, queueRenderPlan } from "../../../__system__/maple";
import { BossHPBar } from "../../slots/BossHPBar";
import bodyData from "../../../../data/maple/body_2000.json";
import headData from "../../../../data/maple/head_12000.json";
import faceData from "../../../../data/maple/face_20000.json";
import hairData from "../../../../data/maple/hair_30000.json";
import weaponData from "../../../../data/maple/weapon_1472001.json";
import coatData from "../../../../data/maple/coat_1040110.json";
import pantsData from "../../../../data/maple/pants_1060099.json";

const CELL = 100;
const GRID_WIDTH = CASCADE_REEL_COUNT * CELL;
const GRID_HEIGHT = CASCADE_VISIBLE_ROWS * CELL;
const BAR_HEIGHT = 72;

const BGM_URL = "https://resource-static.msu.io/data/Sound/Bgm00/SleepyWood.mp3";
const WIN_SFX_URL = "https://agent8-games.verse8.io/0xbd5fca74691be09be4a11386cc45c686f3ecf63d-1781021996644/static-assets/audio-a093ae4e-d8a9-493d-bf1c-3659ee66ff28.ogg";
const BOSS_URL = "https://resource-static.msu.io/data/Mob/8130100/stand/{frame}.png";
const BOSS_HIT_URL = "https://resource-static.msu.io/data/Mob/8130100/hit1/0.png";
const BOSS_DIE_URL = "https://resource-static.msu.io/data/Mob/8130100/die1/{frame}.png";
const BOSS_STAND_FRAMES = 2;
const BOSS_DIE_FRAMES = 3;
const KNIFE_URL = "https://resource-static.msu.io/data/Item/Consume/0207/02070003/info/icon.png";

export class SceneSleepywood extends BaseScene {
  private slotMachine!: CascadeSlotMachine;
  private slotUI!: SlotUI;
  private bgMusic: Phaser.Sound.BaseSound | null = null;
  private audioLoaded: boolean = false;
  private player!: MapleSprite;
  private attackQueue = 0;
  private isAttacking = false;
  private shootToggle = false;
  private bossImg!: Phaser.GameObjects.Sprite;
  private bossHPBar!: BossHPBar;
  private bossHP = 150_000_000;
  private bossMaxHP = 150_000_000;
  private bossAlive = true;
  private paylinePreviewGfx!: Phaser.GameObjects.Graphics;
  private paylinePreviewTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: "SceneSleepywood" });
  }

  preload() {
    this.preloadTopBarIcons();
    preloadDamageFont(this);

    for (const mob of SLEEPYWOOD_MOB_SYMBOLS) {
      const key = `sleepy_mob_${mob.symbolIndex}`;
      this.load.image(key, `${mob.cdnBase}/${mob.renderPlan[0].path}`);
    }

    for (const d of [bodyData, headData, faceData, hairData, weaponData, coatData, pantsData]) {
      queueRenderPlan(this, d.cdnBase, d.render_plan);
    }

    for (let f = 0; f < BOSS_STAND_FRAMES; f++) {
      this.load.image(`sleepy_boss_stand_${f}`, BOSS_URL.replace("{frame}", String(f)));
    }
    for (let f = 0; f < BOSS_DIE_FRAMES; f++) {
      this.load.image(`sleepy_boss_die_${f}`, BOSS_DIE_URL.replace("{frame}", String(f)));
    }
    this.load.image("sleepy_boss_hit", BOSS_HIT_URL);
    this.load.image("sleepy_knife", KNIFE_URL);
    this.load.audio("bgm_sleepywood", BGM_URL);
    this.load.audio("sfx_win", WIN_SFX_URL);
    this.load.once("complete", () => { this.audioLoaded = true; });
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

    const symbolTex: Record<number, string> = {};
    for (const mob of SLEEPYWOOD_MOB_SYMBOLS) {
      symbolTex[mob.symbolIndex] = `sleepy_mob_${mob.symbolIndex}`;
    }
    this.slotMachine = new CascadeSlotMachine(this, gridX, gridY, this.balance, symbolTex);

    const barY = height - BAR_HEIGHT;
    this.slotUI = new SlotUI(this, 0, barY, width, {
      onPlay: () => this.handlePlay(),
      onAuto: () => this.handleAuto(),
      onStopAuto: () => this.handleStopAuto(),
      onBetChange: (value) => this.slotMachine.setBet(value),
      onLineChange: (value) => this.slotMachine.setLines(value),
    }, [10000, 30000, 50000]);

    this.slotMachine.setLines(CASCADE_PAYLINES.length);
    this.setupPaylinePreview(width, gridX, gridY);

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
        if (this.bossAlive) {
          this.queueAttack();
          this.throwKnife(win.totalWin);
        }
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

    const charPad = 24;
    const displayAreaMidY = contentTop + topPad + charH / 2;
    const displayH = Math.min(charH * 0.85, 100);

    const gridBorder = this.add.graphics();
    gridBorder.lineStyle(3, 0x4488cc, 0.6);
    gridBorder.strokeRect(gridX - 4, gridY - 4, GRID_WIDTH + 8, GRID_HEIGHT + 8);
    gridBorder.setDepth(0);

    const hpBarW = GRID_WIDTH * 1.3;
    this.bossHPBar = new BossHPBar(this, width / 2, hpBarY, hpBarW, {
      bossName: "Jr. Balrog",
      bossIconKey: "sleepy_boss_stand_0",
      maxHP: 150000000,
      currentHP: 150000000,
      barColor: 0xcc3333,
    });

    fetchBossHP("JrBalrog").then((hp) => {
      this.bossHP = Math.min(hp, this.bossMaxHP);
      this.bossHPBar.setHP(this.bossHP);
      if (hp > this.bossMaxHP) saveBossHP("JrBalrog", this.bossHP);
      if (this.bossHP <= 0) {
        this.bossAlive = false;
        this.bossImg.play("jrbalrog_die");
      }
    });

    if (!this.anims.exists("jrbalrog_stand")) {
      this.anims.create({
        key: "jrbalrog_stand",
        frames: Array.from({ length: BOSS_STAND_FRAMES }, (_, f) => ({ key: `sleepy_boss_stand_${f}` })),
        frameRate: 1000 / 150,
        repeat: -1,
      });
    }
    if (!this.anims.exists("jrbalrog_die")) {
      this.anims.create({
        key: "jrbalrog_die",
        frames: Array.from({ length: BOSS_DIE_FRAMES }, (_, f) => ({ key: `sleepy_boss_die_${f}` })),
        frameRate: 1000 / 233,
        repeat: 0,
      });
    }

    const merged = [
      ...bodyData.render_plan,
      ...headData.render_plan,
      ...faceData.render_plan,
      ...hairData.render_plan,
      ...coatData.render_plan,
      ...pantsData.render_plan,
      ...weaponData.render_plan,
    ];
    this.player = new MapleSprite(this, gridX + charPad, displayAreaMidY, merged, {
      zmap: bodyData.zmap,
      weapon: weaponData.info,
      race: "human",
      facing: "right",
    });
    this.player.stand();

    this.bossImg = this.add.sprite(gridX + GRID_WIDTH - charPad, displayAreaMidY, "sleepy_boss_stand_0");
    this.bossImg.setDisplaySize(displayH, displayH);
    this.bossImg.setOrigin(1, 0.5);
    this.bossImg.play("jrbalrog_stand");

    this.time.delayedCall(200, () => this.startBgm());

    return [...topBar, title, this.bossHPBar.getContainer(), this.player, this.bossImg, gridBorder];
  }

  private startBgm() {
    if (this.bgMusic) return;
    if (!this.audioLoaded) return;
    try {
      this.bgMusic = this.sound.add("bgm_sleepywood", { loop: true, volume: 0.35 });
      this.bgMusic.play();
    } catch {
      // audio unavailable
    }
  }

  private playWinSound() {
    if (!this.audioLoaded) return;
    try {
      if (this.bgMusic?.isPlaying) this.bgMusic!.setVolume(0.21);
      this.sound.play("sfx_win", { volume: 0.6 });
      this.time.delayedCall(3000, () => {
        if (this.bgMusic?.isPlaying) this.bgMusic!.setVolume(0.35);
      });
    } catch {
      // audio unavailable
    }
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
    this.paylinePreviewTimer?.destroy();
    this.paylinePreviewTimer = null;
    this.paylinePreviewGfx?.clear();
    this.paylinePreviewGfx?.setVisible(false);
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
    const actions = ["swingO1", "swingO2", "swingO3"];
    const action = actions[Math.floor(Math.random() * actions.length)];
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

    const knife = this.add.image(px, py, "sleepy_knife").setDepth(10);

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
        const headX = this.bossImg.x - this.bossImg.displayWidth / 2;
        const headY = this.bossImg.y - this.bossImg.displayHeight / 2;
        showDamageNumber(this, headX, headY, damage);

        this.bossHP = Math.max(0, this.bossHP - damage);
        this.bossHPBar.setHP(this.bossHP, this.bossMaxHP);
        saveBossHP("JrBalrog", this.bossHP);

        if (this.bossHP <= 0) {
          this.bossAlive = false;
          this.bossImg.setTexture("sleepy_boss_hit");
          markBossDead("JrBalrog");
          this.time.delayedCall(200, () => this.bossImg.play("jrbalrog_die"));
          this.time.delayedCall(1500, () => this.checkAndShowAllClear());
        } else {
          this.bossImg.setTexture("sleepy_boss_hit");
          this.time.delayedCall(200, () => this.bossImg.play("jrbalrog_stand"));
        }
      },
    });
  }

  private setupPaylinePreview(width: number, gridX: number, gridY: number) {
    const CELL = 100;
    this.paylinePreviewGfx = this.add.graphics().setDepth(5).setVisible(false);
    const paylineGfx = this.paylinePreviewGfx;
    const LINE_COLORS = [
      0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
      0x44ffff, 0xff8844, 0x88ff44, 0x4488ff, 0xff4488,
      0x88ff88, 0x8888ff, 0xffaa44, 0xaaff44, 0x44aaff,
      0xff44aa, 0x44ffaa, 0xaa44ff, 0xdddd44, 0x44dddd,
      0xdd44dd, 0xff6644, 0x66ff44, 0x4466ff, 0xcc88ff,
    ];

    const drawPaylines = () => {
      paylineGfx.clear();
      for (let l = 0; l < CASCADE_PAYLINES.length; l++) {
        const payline = CASCADE_PAYLINES[l];
        const color = LINE_COLORS[l % LINE_COLORS.length];
        const yOff = (l - 12) * 3;
        paylineGfx.lineStyle(4, color, 0.6);
        paylineGfx.beginPath();
        for (let r = 0; r < CASCADE_PAYLINES[0].length; r++) {
          const row = payline[r];
          const cx = gridX + r * CELL + CELL / 2;
          const cy = gridY + row * CELL + CELL / 2 + yOff;
          if (r === 0) paylineGfx.moveTo(cx, cy); else paylineGfx.lineTo(cx, cy);
        }
        paylineGfx.strokePath();
      }
    };

    let showTimer: Phaser.Time.TimerEvent | null = null;

    const showPreview = () => {
      this.paylinePreviewTimer?.destroy();
      drawPaylines();
      paylineGfx.setVisible(true);
      this.paylinePreviewTimer = this.time.delayedCall(2000, () => {
        paylineGfx.clear();
        paylineGfx.setVisible(false);
        this.paylinePreviewTimer = null;
      });
    };

    const hidePreview = () => {
      this.paylinePreviewTimer?.destroy();
      this.paylinePreviewTimer = null;
      paylineGfx.clear();
      paylineGfx.setVisible(false);
    };

    this.slotUI.overrideLinesButton(() => {
      if (paylineGfx.visible) hidePreview();
      else showPreview();
    }, "Lines: 25");

    this.slotUI.updateLineDisplay(CASCADE_PAYLINES.length);
  }

  shutdown() {
    try { this.bgMusic?.stop(); } catch { /* ignore */ }
    this.bgMusic = null;
    this.player?.destroy();
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}
