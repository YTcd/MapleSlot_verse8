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
const BOSS_URL = "https://resource-static.msu.io/data/Mob/2600631/stand/{frame}.png";
const BOSS_HIT_URL = "https://resource-static.msu.io/data/Mob/2600631/hit1/0.png";
const BOSS_STAND_FRAMES = 6;
const KNIFE_URL = "https://resource-static.msu.io/data/Item/Consume/0207/02070001/info/icon.png";

const LUDI_PAYLINES = [
  [1,1,1,1,1],
  [0,0,0,0,0],
  [1,1,2,2,2],
  [0,1,0,1,0],
  [1,0,1,0,1],
  [0,0,1,1,1],
  [1,1,0,0,0],
  [0,0,2,2,1],
  [1,1,0,1,1],
  [0,1,1,0,0],
];

export class SceneLudibrium extends BaseScene {
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
  private bossHP = 50_000_000;
  private bossMaxHP = 50_000_000;

  constructor() {
    super({ key: "SceneLudibrium" });
  }

  preload() {
    this.preloadTopBarIcons();
    preloadMobTextures(this);

    for (const d of [bodyData, headData, faceData, hairData, weaponData]) {
      queueRenderPlan(this, d.cdnBase, d.render_plan);
    }

    for (let f = 0; f < BOSS_STAND_FRAMES; f++) {
      this.load.image(`boss_stand_${f}`, BOSS_URL.replace("{frame}", String(f)));
    }
    this.load.image("boss_hit", BOSS_HIT_URL);
    this.load.audio("bgm_gopicnic", BGM_URL);
    this.load.audio("sfx_win", WIN_SFX_URL);
    this.load.once("complete", () => { this.audioLoaded = true; });
  }

  protected buildScene(): Phaser.GameObjects.GameObject[] {
    const { width, height } = this.cameras.main;

    this.cameras.main.setBackgroundColor("#2d1a4a");

    const topBar = this.createTopBar();
    const barH = height * 0.1;

    const title = this.add
      .text(width / 2, barH / 2, "Ludibrium", {
        fontFamily: '"Gowun Batang", "Noto Serif KR", serif',
        fontSize: "24px",
        color: "#c0a0f0",
        fontStyle: "bold",
        stroke: "#1a0a3a",
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

    this.slotMachine = new SlotMachine(this, gridX, gridY, this.balance, [2, 2, 3, 3, 3], LUDI_PAYLINES, [CELL / 2, CELL / 2, 0, 0, 0]);
    this.winPresentation = new SlotWinPresentation(this, gridX, gridY, this.slotMachine, [CELL / 2, CELL / 2, 0, 0, 0]);

    const barY = height - BAR_HEIGHT;
    this.slotUI = new SlotUI(this, 0, barY, width, {
      onPlay: () => this.handlePlay(),
      onAuto: () => this.handleAuto(),
      onStopAuto: () => this.handleStopAuto(),
      onBetChange: (value) => this.slotMachine.setBet(value),
      onLineChange: (value) => this.slotMachine.setLines(value),
    });

    this.slotMachine.setLines(LUDI_PAYLINES.length);

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

    const charPad = 24;
    const displayAreaMidY = contentTop + topPad + charH / 2;
    const displayH = Math.min(charH, 220);

    const hpBarW = GRID_WIDTH * 1.3;
    this.bossHPBar = new BossHPBar(this, width / 2, hpBarY, hpBarW, {
      bossName: "Papulatus",
      bossIconKey: "boss_stand_0",
      maxHP: 50000000,
      currentHP: 50000000,
      barColor: 0xcc3333,
    });

    fetchBossHP("Papulatus").then((hp) => {
      this.bossHP = hp;
      this.bossHPBar.setHP(hp);
    });

    if (!this.anims.exists("papulatus_stand")) {
      this.anims.create({
        key: "papulatus_stand",
        frames: Array.from({ length: BOSS_STAND_FRAMES }, (_, f) => ({ key: `boss_stand_${f}` })),
        frameRate: 10,
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

    this.bossImg = this.add.sprite(gridX + GRID_WIDTH - charPad, displayAreaMidY, "boss_stand_0");
    this.bossImg.setDisplaySize(displayH, displayH);
    this.bossImg.setOrigin(1, 0.5);
    this.bossImg.play("papulatus_stand");

    this.time.delayedCall(200, () => this.startBgm());

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
      console.warn("[SceneLudibrium] Failed to sync balance:", err);
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
          this.bossImg.play("papulatus_stand");
        });

        this.bossHP = Math.max(0, this.bossHP - damage);
        this.bossHPBar.setHP(this.bossHP, this.bossMaxHP);
        saveBossHP("Papulatus", this.bossHP);
      },
    });
  }

  private setupPaylinePreview(width: number, gridX: number, gridY: number) {
    const CELL = SYMBOL_SIZE + SYMBOL_GAP;
    const paylineGfx = this.add.graphics().setDepth(5).setVisible(false);
    const reelOffsets = [CELL / 2, CELL / 2, 0, 0, 0];

    const LINE_COLORS = [
      0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
      0x44ffff, 0xff8844, 0x88ff44, 0x4488ff, 0xff4488,
    ];

    const drawPaylines = () => {
      paylineGfx.clear();
      for (let l = 0; l < LUDI_PAYLINES.length; l++) {
        const payline = LUDI_PAYLINES[l];
        const color = LINE_COLORS[l % LINE_COLORS.length];
        for (let r = 0; r < LUDI_PAYLINES[0].length; r++) {
          const row = payline[r];
          const rx = gridX + r * CELL + 2;
          const ry = gridY + reelOffsets[r] + row * CELL + 2;
          paylineGfx.lineStyle(2, color, 0.6);
          paylineGfx.strokeRect(rx, ry, SYMBOL_SIZE - 4, SYMBOL_SIZE - 4);
        }
        paylineGfx.lineStyle(3, color, 0.5);
        paylineGfx.beginPath();
        for (let r = 0; r < LUDI_PAYLINES[0].length; r++) {
          const row = payline[r];
          const cx = gridX + r * CELL + SYMBOL_SIZE / 2;
          const cy = gridY + reelOffsets[r] + row * CELL + SYMBOL_SIZE / 2;
          if (r === 0) paylineGfx.moveTo(cx, cy);
          else paylineGfx.lineTo(cx, cy);
        }
        paylineGfx.strokePath();
      }
    };

    let showLines = false;
    this.slotUI.overrideLinesButton(() => {
      showLines = !showLines;
      if (showLines) {
        drawPaylines();
        paylineGfx.setVisible(true);
      } else {
        paylineGfx.clear();
        paylineGfx.setVisible(false);
      }
    }, `Lines: ${LUDI_PAYLINES.length}`);
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
