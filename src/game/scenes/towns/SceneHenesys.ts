import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { SlotMachine } from "../../slots/SlotMachine";
import { SlotUI } from "../../slots/SlotUI";
import { SlotWinPresentation } from "../../slots/SlotWinPresentation";
import { SlotState, REEL_COUNT, SYMBOL_SIZE, SYMBOL_GAP } from "../../slots/SlotConstants";
import { preloadMobTextures } from "../../slots/SlotSymbolData";
import { updateBalanceOnServer, fetchBossHP, saveBossHP } from "../../utils/ServerBridge";
import { MapleSprite, queueRenderPlan } from "../../../__system__/maple";
import { BossHPBar } from "../../slots/BossHPBar";
import bodyData from "../../../../data/maple/body_2000.json";
import headData from "../../../../data/maple/head_12000.json";
import faceData from "../../../../data/maple/face_20000.json";
import hairData from "../../../../data/maple/hair_30000.json";
import weaponData from "../../../../data/maple/weapon_1472263.json";

const CELL = SYMBOL_SIZE + SYMBOL_GAP;
const GRID_WIDTH = REEL_COUNT * CELL - SYMBOL_GAP;
const GRID_HEIGHT = 3 * CELL - SYMBOL_GAP;
const BAR_HEIGHT = 72;

const BGM_URL = "https://resource-static.msu.io/data/Sound/Bgm00/GoPicnic.mp3";
const WIN_SFX_URL = "https://agent8-games.verse8.io/0xbd5fca74691be09be4a11386cc45c686f3ecf63d-1781021996644/static-assets/audio-a093ae4e-d8a9-493d-bf1c-3659ee66ff28.ogg";
const BOSS_URL = "https://resource-static.msu.io/data/Mob/9300191/move/{frame}.png";
const BOSS_HIT_URL = "https://resource-static.msu.io/data/Mob/9300191/hit1/0.png";
const BOSS_MOVE_FRAMES = 5;
const KNIFE_URL = "https://resource-static.msu.io/data/Item/Consume/0207/02070001/info/icon.png";

export class SceneHenesys extends BaseScene {
  private slotMachine!: SlotMachine;
  private slotUI!: SlotUI;
  private winPresentation!: SlotWinPresentation;
  private bgMusic: Phaser.Sound.BaseSound | null = null;
  private audioLoaded: boolean = false;
  private player!: MapleSprite;
  private attackQueue = 0;
  private isAttacking = false;
  private shootToggle = false;
  private bossImg!: Phaser.GameObjects.Sprite;
  private bossHPBar!: BossHPBar;
  private bossHP = 30_000_000;
  private bossMaxHP = 30_000_000;

  constructor() {
    super({ key: "SceneHenesys" });
  }

  preload() {
    this.preloadTopBarIcons();
    preloadMobTextures(this);

    for (const d of [bodyData, headData, faceData, hairData, weaponData]) {
      queueRenderPlan(this, d.cdnBase, d.render_plan);
    }

    for (let f = 0; f < BOSS_MOVE_FRAMES; f++) {
      this.load.image(`boss_move_${f}`, BOSS_URL.replace("{frame}", String(f)));
    }
    this.load.image("boss_hit", BOSS_HIT_URL);
    this.load.audio("bgm_gopicnic", BGM_URL);
    this.load.audio("sfx_win", WIN_SFX_URL);
    this.load.once("complete", () => { this.audioLoaded = true; });
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#1a3a5c");

    const topBar = this.createTopBar();
    const barH = height * 0.1;

    const title = this.add
      .text(width / 2, barH / 2, "Henesys", {
        fontFamily: '"Gowun Batang", "Noto Serif KR", serif',
        fontSize: "24px",
        color: "#a0d8f0",
        fontStyle: "bold",
        stroke: "#0a2a3c",
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

    this.slotMachine = new SlotMachine(this, gridX, gridY, this.balance);
    this.winPresentation = new SlotWinPresentation(this, gridX, gridY, this.slotMachine);

    const barY = height - BAR_HEIGHT;
    this.slotUI = new SlotUI(this, 0, barY, width, {
      onPlay: () => this.handlePlay(),
      onAuto: () => this.handleAuto(),
      onStopAuto: () => this.handleStopAuto(),
      onBetChange: (value) => this.slotMachine.setBet(value),
      onLineChange: (value) => this.slotMachine.setLines(value),
    }, [1000, 5000, 10000]);

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
        this.winPresentation.start(win.lineWins);
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

    this.winPresentation.onButtonsReady = () => {
      this.slotMachine.setPresentationDone();
    };

    const charPad = 24;
    const displayAreaMidY = contentTop + topPad + charH / 2;
    const displayH = Math.min(charH * 0.85, 100);

    const hpBarW = GRID_WIDTH * 1.3;
    this.bossHPBar = new BossHPBar(this, width / 2, hpBarY, hpBarW, {
      bossName: "MushMom",
      bossIconKey: "boss_move_0",
      maxHP: 30000000,
      currentHP: 30000000,
      barColor: 0xcc3333,
    });

    fetchBossHP("MushMom").then((hp) => {
      this.bossHP = hp;
      this.bossHPBar.setHP(hp);
    });

    if (!this.anims.exists("mushmom_move")) {
      this.anims.create({
        key: "mushmom_move",
        frames: Array.from({ length: BOSS_MOVE_FRAMES }, (_, f) => ({ key: `boss_move_${f}` })),
        frameRate: 1000 / 220,
        repeat: -1,
      });
    }

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

    this.bossImg = this.add.sprite(gridX + GRID_WIDTH - charPad, displayAreaMidY, "boss_move_0");
    this.bossImg.setDisplaySize(displayH, displayH);
    this.bossImg.setOrigin(1, 0.5);
    this.bossImg.play("mushmom_move");

    return [...topBar, title, this.bossHPBar.getContainer(), this.player, this.bossImg];
  }

  private startBgm() {
    if (this.bgMusic) return;
    if (!this.audioLoaded) return;
    try {
      this.bgMusic = this.sound.add("bgm_gopicnic", { loop: true, volume: 0.35 });
      this.bgMusic.play();
    } catch {
      // audio unavailable
    }
  }

  private lastSyncedBalance = 0;

  private persistBalance(newBalance: number) {
    if (newBalance === this.lastSyncedBalance) return;
    this.lastSyncedBalance = newBalance;

    updateBalanceOnServer(newBalance, "slot").catch((err) => {
      console.warn("[SceneHenesys] Failed to sync balance:", err);
    });
  }

  private handlePlay() {
    this.winPresentation.stop();
    if (!this.slotMachine.play()) {
      const needed = this.slotMachine.currentBet * this.slotMachine.currentLines;
      this.slotUI.showTooltip(
        `잔액 부족\n필요: ${needed.toLocaleString("en-US")} | 보유: ${this.slotMachine.currentBalance.toLocaleString("en-US")}`,
      );
    }
  }

  private handleAuto() {
    this.winPresentation.stop();
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
        this.bossImg.setTexture("boss_hit");
        this.time.delayedCall(200, () => {
          this.bossImg.play("mushmom_move");
        });

        this.bossHP = Math.max(0, this.bossHP - damage);
        this.bossHPBar.setHP(this.bossHP, this.bossMaxHP);
        saveBossHP("MushMom", this.bossHP);
      },
    });
  }

  shutdown() {
    try { this.bgMusic?.stop(); } catch { /* ignore */ }
    this.bgMusic = null;
    this.player?.destroy();
    this.winPresentation?.destroy();
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}

  constructor() {
    super({ key: "SceneHenesys" });
  }

  preload() {
    this.preloadTopBarIcons();
    preloadMobTextures(this);

    for (const d of [bodyData, headData, faceData, hairData, weaponData]) {
      queueRenderPlan(this, d.cdnBase, d.render_plan);
    }

    for (let f = 0; f < BOSS_MOVE_FRAMES; f++) {
      this.load.image(`boss_move_${f}`, BOSS_URL.replace("{frame}", String(f)));
    }
    this.load.image("boss_hit", BOSS_HIT_URL);
    this.load.image("knife_wolbi", KNIFE_URL);
    this.load.audio("bgm_gopicnic", BGM_URL);
    this.load.audio("sfx_win", WIN_SFX_URL);
    this.load.once("complete", () => { this.audioLoaded = true; });
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#1a3a5c");

    const topBar = this.createTopBar();
    const barH = height * 0.1;

    const title = this.add
      .text(width / 2, barH / 2, "Henesys", {
        fontFamily: '"Gowun Batang", "Noto Serif KR", serif',
        fontSize: "24px",
        color: "#a0d8f0",
        fontStyle: "bold",
        stroke: "#0a2a3c",
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

    this.slotMachine = new SlotMachine(this, gridX, gridY, this.balance);
    this.winPresentation = new SlotWinPresentation(this, gridX, gridY, this.slotMachine);

    const barY = height - BAR_HEIGHT;
    this.slotUI = new SlotUI(this, 0, barY, width, {
      onPlay: () => this.handlePlay(),
      onAuto: () => this.handleAuto(),
      onStopAuto: () => this.handleStopAuto(),
      onBetChange: (value) => this.slotMachine.setBet(value),
      onLineChange: (value) => this.slotMachine.setLines(value),
    }, [1000, 5000, 10000]);

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
        this.playWinSound();
        this.winPresentation.start(win.lineWins);
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

    this.winPresentation.onButtonsReady = () => {
      this.slotMachine.setPresentationDone();
    };

    const gridBorder = this.add.graphics();
    gridBorder.lineStyle(3, 0x4488cc, 0.6);
    gridBorder.strokeRect(gridX - 4, gridY - 4, GRID_WIDTH + 8, GRID_HEIGHT + 8);
    gridBorder.setDepth(0);

    const charPad = 24;
    const displayAreaMidY = contentTop + topPad + charH / 2;
    const displayH = Math.min(charH * 0.85, 100);

    const hpBarW = GRID_WIDTH * 1.3;
    this.bossHPBar = new BossHPBar(this, width / 2, hpBarY, hpBarW, {
      bossName: "MushMom",
      bossIconKey: "boss_move_0",
      maxHP: 50000000,
      currentHP: 50000000,
      barColor: 0xcc3333,
    });

    fetchBossHP("MushMom").then((hp) => {
      this.bossHP = hp;
      this.bossHPBar.setHP(hp);
    });

    if (!this.anims.exists("mushmom_move")) {
      this.anims.create({
        key: "mushmom_move",
        frames: Array.from({ length: BOSS_MOVE_FRAMES }, (_, f) => ({ key: `boss_move_${f}` })),
        frameRate: 1000 / 220,
        repeat: -1,
      });
    }

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

    this.bossImg = this.add.sprite(gridX + GRID_WIDTH - charPad, displayAreaMidY, "boss_move_0");
    this.bossImg.setDisplaySize(displayH, displayH);
    this.bossImg.setOrigin(1, 0.5);
    this.bossImg.play("mushmom_move");

    this.time.delayedCall(200, () => this.startBgm());

    return [...topBar, title, this.bossHPBar.getContainer(), this.player, this.bossImg, gridBorder];
  }

  private startBgm() {
    if (this.bgMusic) return;
    if (!this.audioLoaded) return;
    try {
      this.bgMusic = this.sound.add("bgm_gopicnic", { loop: true, volume: 0.35 });
      this.bgMusic.play();
    } catch {
      // audio unavailable
    }
  }

  private playWinSound() {
    if (!this.audioLoaded) return;
    try {
      if (this.bgMusic?.isPlaying) {
        this.bgMusic.setVolume(0.21);
      }
      this.sound.play("sfx_win", { volume: 0.6 });
      this.time.delayedCall(3000, () => {
        if (this.bgMusic?.isPlaying) {
          this.bgMusic.setVolume(0.35);
        }
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
      console.warn("[SceneHenesys] Failed to sync balance:", err);
    });
  }

  private handlePlay() {
    this.winPresentation.stop();
    if (!this.slotMachine.play()) {
      const needed = this.slotMachine.currentBet * this.slotMachine.currentLines;
      this.slotUI.showTooltip(
        `잔액 부족\n필요: ${needed.toLocaleString("en-US")} | 보유: ${this.slotMachine.currentBalance.toLocaleString("en-US")}`,
      );
    }
  }

  private handleAuto() {
    this.winPresentation.stop();
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
        this.bossImg.setTexture("boss_hit");
        this.time.delayedCall(200, () => {
          this.bossImg.play("mushmom_move");
        });

        this.bossHP = Math.max(0, this.bossHP - damage);
        this.bossHPBar.setHP(this.bossHP, this.bossMaxHP);
        saveBossHP("MushMom", this.bossHP);
      },
    });
  }

  shutdown() {
    try { this.bgMusic?.stop(); } catch { /* ignore */ }
    this.bgMusic = null;
    this.player?.destroy();
    this.winPresentation?.destroy();
    this.slotMachine?.destroy();
    this.slotUI?.destroy();
  }
}
