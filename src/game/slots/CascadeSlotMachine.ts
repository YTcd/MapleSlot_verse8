import Phaser from "phaser";
import { SlotBase, SlotWin } from "./SlotBase";
import { SlotState } from "./SlotConstants";
import {
  CASCADE_REEL_COUNT,
  CASCADE_VISIBLE_ROWS,
  CASCADE_BUFFER_ROWS,
  CASCADE_TOTAL_ROWS,
  CASCADE_SYMBOL_COUNT,
  CASCADE_PAY_TABLE,
  CASCADE_PAYLINES,
  CASCADE_LINE_COLORS,
  SYMBOL_WILD,
  SYMBOL_SCATTER,
  FREE_SPINS_TRIGGER_COUNT,
  FREE_SPINS_COUNT,
  CASCADE_MULTIPLIER_STEPS,
} from "./CascadeSlotConstants";

const CELL = 100;
const CELL_INNER = 96;

const SYMBOL_COLORS: Record<number, { bg: number; text: string }> = {
  0: { bg: 0xcc3333, text: "#ff6666" },
  1: { bg: 0xcc6633, text: "#ff9966" },
  2: { bg: 0xcc9933, text: "#ffcc66" },
  3: { bg: 0x339933, text: "#66ff66" },
  4: { bg: 0x3366cc, text: "#6699ff" },
  5: { bg: 0x7733aa, text: "#cc99ff" },
  6: { bg: 0xaa8833, text: "#ffdd66" },
};

interface GridCell {
  text: Phaser.GameObjects.Text;
  bg: Phaser.GameObjects.Graphics;
  container: Phaser.GameObjects.Container;
}

interface PaylineWin {
  lineIndex: number;
  matchCount: number;
  cells: { col: number; row: number }[];
}

interface WinInfo {
  cells: { col: number; row: number }[];
  paylineWins: PaylineWin[];
}

export class CascadeSlotMachine extends SlotBase {
  readonly gridX: number;
  readonly gridY: number;

  private grid: number[][] = [];
  private cells: (GridCell | null)[][] = [];
  private gridContainer: Phaser.GameObjects.Container;
  private highlightGfx: Phaser.GameObjects.Graphics;
  private cascadeMultiplier: number = 1;
  private freeSpinsRemaining: number = 0;
  private isFreeSpinMode: boolean = false;
  constructor(scene: Phaser.Scene, gridX: number, gridY: number, balance: number) {
    super(scene, balance);
    this.gridX = gridX;
    this.gridY = gridY;

    this.highlightGfx = scene.add.graphics();
    this.highlightGfx.setDepth(5);
    this.highlightGfx.setVisible(false);

    this.gridContainer = scene.add.container(0, 0);
    this.gridContainer.setDepth(1);

    const GRID_WIDTH = CASCADE_REEL_COUNT * CELL;
    const GRID_HEIGHT = CASCADE_VISIBLE_ROWS * CELL;
    const maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(this.gridX, this.gridY, GRID_WIDTH, GRID_HEIGHT);
    const mask = maskGfx.createGeometryMask();
    this.gridContainer.setMask(mask);

    this.buildGrid();
    this.fillInitialGrid();
  }

  get multiplier(): number { return this.cascadeMultiplier; }
  get freeSpinMode(): boolean { return this.isFreeSpinMode; }
  get freeSpinsLeft(): number { return this.freeSpinsRemaining; }

  private buildGrid() {
    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      this.cells[col] = [];
      for (let row = 0; row < CASCADE_TOTAL_ROWS; row++) {
        if (row < CASCADE_BUFFER_ROWS) {
          this.cells[col][row] = null;
        } else {
          const cell = this.createCell(col, row - CASCADE_BUFFER_ROWS);
          this.cells[col][row] = cell;
        }
      }
    }
  }

  private createCell(col: number, visibleRow: number): GridCell {
    const cx = this.gridX + col * CELL + CELL / 2;
    const cy = this.gridY + visibleRow * CELL + CELL / 2;

    const container = this.scene.add.container(cx, cy);
    this.gridContainer.add(container);

    const bg = this.scene.add.graphics();
    const text = this.scene.add.text(0, 0, "", {
      fontFamily: "Arial, sans-serif",
      fontSize: "36px",
      fontStyle: "bold",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    container.add([bg, text]);
    return { text, bg, container };
  }

  private fillInitialGrid() {
    this.grid = [];
    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      this.grid[col] = [];
      for (let row = 0; row < CASCADE_TOTAL_ROWS; row++) {
        this.grid[col][row] = this.randomSymbol();
      }
    }
    this.renderAll();
  }

  private randomSymbol(): number {
    const weights = this.isFreeSpinMode
      ? [25, 22, 18, 16, 14, 7, 5]
      : [30, 25, 20, 15, 10, 5, 3];
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return 0;
  }

  private renderAll() {
    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      for (let row = CASCADE_BUFFER_ROWS; row < CASCADE_TOTAL_ROWS; row++) {
        const cell = this.cells[col]?.[row];
        if (!cell) continue;
        const visibleRow = row - CASCADE_BUFFER_ROWS;
        cell.container.y = this.gridY + visibleRow * CELL + CELL / 2;
        cell.container.setAlpha(1);
        cell.container.setScale(1);
        const sym = this.grid[col]?.[row] ?? 0;
        this.drawCell(cell, sym);
      }
    }
  }

  private drawCell(cell: GridCell, symbol: number) {
    const color = SYMBOL_COLORS[symbol] ?? SYMBOL_COLORS[0];
    cell.bg.clear();
    cell.bg.fillStyle(0x111122, 1);
    cell.bg.fillRoundedRect(-CELL_INNER / 2, -CELL_INNER / 2, CELL_INNER, CELL_INNER, 6);
    cell.bg.lineStyle(3, color.bg, 1);
    cell.bg.strokeRoundedRect(-CELL_INNER / 2, -CELL_INNER / 2, CELL_INNER, CELL_INNER, 6);
    cell.text.setText(String(symbol));
    cell.text.setColor(color.text);
    cell.container.setVisible(true);
  }

  protected executeSpin(): void {
    this.cascadeMultiplier = 1;
    this.highlightGfx.clear();
    this.highlightGfx.setVisible(false);

    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      for (let row = CASCADE_BUFFER_ROWS; row < CASCADE_TOTAL_ROWS; row++) {
        const cell = this.cells[col]?.[row];
        if (cell) {
          cell.container.y = this.gridY + (row - CASCADE_BUFFER_ROWS) * CELL + CELL / 2;
          cell.container.setVisible(false);
        }
      }
    }

    this.grid = [];
    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      this.grid[col] = [];
      for (let row = 0; row < CASCADE_TOTAL_ROWS; row++) {
        this.grid[col][row] = this.randomSymbol();
      }
    }

    const dropDuration = 800;
    const rowStagger = 200;

    for (let visibleRow = CASCADE_VISIBLE_ROWS - 1; visibleRow >= 0; visibleRow--) {
      const delay = (CASCADE_VISIBLE_ROWS - 1 - visibleRow) * rowStagger;
      for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
        const gridRow = CASCADE_BUFFER_ROWS + visibleRow;
        const cell = this.cells[col]?.[gridRow];
        if (!cell) continue;

        const sym = this.grid[col]?.[gridRow] ?? 0;
        this.drawCell(cell, sym);

        const finalY = this.gridY + visibleRow * CELL + CELL / 2;
        cell.container.y = this.gridY - CELL * 2;
        cell.container.setAlpha(1);
        cell.container.setVisible(true);

        this.scene.tweens.add({
          targets: cell.container,
          y: finalY,
          duration: dropDuration,
          delay,
          ease: "Bounce.easeOut",
        });
      }
    }

    const totalDelay = (CASCADE_VISIBLE_ROWS - 1) * rowStagger + dropDuration + 100;
    this.scene.time.delayedCall(totalDelay, () => {
      this.renderAll();
      this.evaluateCascade();
    });
  }

  override stopAllSymbolAnimations(): void {
    this.highlightGfx.clear();
    this.highlightGfx.setVisible(false);
    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      for (let row = CASCADE_BUFFER_ROWS; row < CASCADE_TOTAL_ROWS; row++) {
        const cell = this.cells[col]?.[row];
        if (cell) {
          cell.container.setScale(1);
          this.scene.tweens.killTweensOf(cell.container);
        }
      }
    }
  }

  private evaluateCascade() {
    this.setState(SlotState.EVALUATING);

    const lineWins = this.calculateAllLineWins();

    if (lineWins.length > 0 || this.checkFreeSpinTrigger()) {
      let totalWin = 0;
      const finalLineWins: SlotWin["lineWins"] = [];

      for (const lw of lineWins) {
        const multiplierIndex = Math.min(this.cascadeMultiplier - 1, CASCADE_MULTIPLIER_STEPS.length - 1);
        const cascadeMult = CASCADE_MULTIPLIER_STEPS[multiplierIndex];
        const winAmount = lw.win * cascadeMult;
        totalWin += winAmount;
        finalLineWins.push({ ...lw, win: winAmount, multiplier: lw.multiplier * cascadeMult });
      }

      const win: SlotWin = { totalWin, lineWins: finalLineWins };
      this.applyWin(totalWin, win);

      this.scene.time.delayedCall(400, () => {
        this.processCascade();
      });
    } else {
      this.afterEvaluation();
    }
  }

  private calculateAllLineWins(): SlotWin["lineWins"] {
    const lineWins: SlotWin["lineWins"] = [];
    const visibleGrid = this.getVisibleGrid();

    for (let l = 0; l < Math.min(this.lines, CASCADE_PAYLINES.length); l++) {
      const payline = CASCADE_PAYLINES[l];
      const symbols = payline.map((rowIdx, reelIdx) => visibleGrid[reelIdx]?.[rowIdx] ?? -1);

      const firstSym = symbols[0];
      if (firstSym < 0) continue;

      let matchCount = 1;
      for (let r = 1; r < CASCADE_REEL_COUNT; r++) {
        const sym = symbols[r];
        if (sym === firstSym || sym === SYMBOL_WILD) {
          matchCount++;
        } else {
          break;
        }
      }

      if (matchCount >= 3 && firstSym !== SYMBOL_SCATTER) {
        const multipliers = CASCADE_PAY_TABLE[matchCount];
        if (multipliers && firstSym < multipliers.length) {
          const multiplier = multipliers[firstSym];
          const win = multiplier * this.bet;
          lineWins.push({ lineIndex: l, symbol: firstSym, matchCount, multiplier, win });
        }
      }
    }

    return lineWins;
  }

  private getVisibleGrid(): number[][] {
    const visible: number[][] = [];
    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      visible[col] = [];
      for (let row = 0; row < CASCADE_VISIBLE_ROWS; row++) {
        visible[col][row] = this.grid[col]?.[CASCADE_BUFFER_ROWS + row] ?? 0;
      }
    }
    return visible;
  }

  private checkFreeSpinTrigger(): boolean {
    let scatterCount = 0;
    const visible = this.getVisibleGrid();
    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      for (let row = 0; row < CASCADE_VISIBLE_ROWS; row++) {
        if (visible[col]?.[row] === SYMBOL_SCATTER) scatterCount++;
      }
    }
    if (scatterCount >= FREE_SPINS_TRIGGER_COUNT && !this.isFreeSpinMode) {
      this.freeSpinsRemaining += FREE_SPINS_COUNT;
      this.isFreeSpinMode = true;
      return true;
    }
    return false;
  }

  private processCascade() {
    const visible = this.getVisibleGrid();
    const winInfo = this.findWinningInfo(visible);

    if (this.isFreeSpinMode) {
      this.freeSpinsRemaining--;
      if (this.freeSpinsRemaining <= 0) {
        this.isFreeSpinMode = false;
      }
    }

    if (winInfo.paylineWins.length === 0) {
      this.cascadeMultiplier = 1;
      this.afterEvaluation();
      return;
    }

    this.cascadeMultiplier++;

    this.highlightGfx.clear();
    this.highlightGfx.setVisible(true);

    for (const pw of winInfo.paylineWins) {
      this.drawPaylineOverlay(pw.lineIndex, pw.matchCount);
    }

    for (const { col, row } of winInfo.cells) {
      const gridRow = CASCADE_BUFFER_ROWS + row;
      const cell = this.cells[col]?.[gridRow];
      if (!cell) continue;

      cell.container.setScale(1);
      this.scene.tweens.killTweensOf(cell.container);

      this.scene.tweens.add({
        targets: cell.container,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 200,
        yoyo: true,
        repeat: 2,
        ease: "Sine.easeInOut",
        onComplete: () => {
          cell.container.setScale(1);
        },
      });
    }

    const savedOldVisible = this.getVisibleGrid();

    this.scene.time.delayedCall(1100, () => {
      this.highlightGfx.clear();
      this.highlightGfx.setVisible(false);

      for (const { col, row } of winInfo.cells) {
        const gridRow = CASCADE_BUFFER_ROWS + row;
        this.grid[col][gridRow] = -1;
        const cell = this.cells[col]?.[gridRow];
        if (cell) {
          cell.container.setScale(1);
          this.scene.tweens.killTweensOf(cell.container);
          this.scene.tweens.add({
            targets: cell.container,
            alpha: 0,
            duration: 500,
            ease: "Sine.easeIn",
          });
        }
      }

      this.scene.time.delayedCall(550, () => {
        for (const { col, row } of winInfo.cells) {
          const gridRow = CASCADE_BUFFER_ROWS + row;
          const cell = this.cells[col]?.[gridRow];
          if (cell) {
            cell.container.setVisible(false);
            cell.container.setAlpha(1);
            cell.container.setScale(1);
            cell.container.y = this.gridY + row * CELL + CELL / 2;
          }
        }

        this.dropSymbols();
        const dropMap = this.dropSymbols();

        const newVisible = this.getVisibleGrid();

        for (let row = CASCADE_VISIBLE_ROWS - 1; row >= 0; row--) {
          for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
            const oldSym = savedOldVisible[col]?.[row] ?? -1;
            const newSym = newVisible[col]?.[row] ?? -1;

            if (oldSym === newSym) continue;

            const gridRow = CASCADE_BUFFER_ROWS + row;
            const cell = this.cells[col]?.[gridRow];
            if (!cell) continue;

            this.drawCell(cell, newSym);

            const dropCells = dropMap[col]?.[row] ?? CASCADE_VISIBLE_ROWS;

            const finalY = this.gridY + row * CELL + CELL / 2;
            cell.container.y = finalY - dropCells * CELL;
            cell.container.setAlpha(1);
            cell.container.setVisible(true);

            const stagger = (CASCADE_VISIBLE_ROWS - 1 - row) * 65;
            this.scene.tweens.add({
              targets: cell.container,
              y: finalY,
              duration: 1000,
              delay: stagger,
              ease: "Bounce.easeOut",
            });
          }
        }

        this.scene.time.delayedCall(1000 + 2 * 65 + 100, () => {
          this.renderAll();
          this.evaluateCascade();
        });
      });
    });
  }

  private findWinningInfo(visible: number[][]): WinInfo {
    const allCells: { col: number; row: number }[] = [];
    const paylineWins: PaylineWin[] = [];

    for (let l = 0; l < Math.min(this.lines, CASCADE_PAYLINES.length); l++) {
      const payline = CASCADE_PAYLINES[l];
      const symbols = payline.map((rowIdx, reelIdx) => visible[reelIdx]?.[rowIdx] ?? -1);
      const firstSym = symbols[0];
      if (firstSym < 0) continue;

      let matchCount = 1;
      for (let r = 1; r < CASCADE_REEL_COUNT; r++) {
        const sym = symbols[r];
        if (sym === firstSym || sym === SYMBOL_WILD) matchCount++;
        else break;
      }

      if (matchCount >= 3 && firstSym !== SYMBOL_SCATTER) {
        const cells: { col: number; row: number }[] = [];
        for (let r = 0; r < matchCount; r++) {
          const rowIdx = payline[r];
          cells.push({ col: r, row: rowIdx });
          const existing = allCells.find(c => c.col === r && c.row === rowIdx);
          if (!existing) {
            allCells.push({ col: r, row: rowIdx });
          }
        }
        paylineWins.push({ lineIndex: l, matchCount, cells });
      }
    }

    return { cells: allCells, paylineWins };
  }

  private drawPaylineOverlay(lineIndex: number, matchCount: number) {
    const payline = CASCADE_PAYLINES[lineIndex];
    if (!payline) return;

    const color = CASCADE_LINE_COLORS[lineIndex % CASCADE_LINE_COLORS.length];
    const gfx = this.highlightGfx;

    for (let r = 0; r < matchCount; r++) {
      const row = payline[r];
      const rx = this.gridX + r * CELL + 2;
      const ry = this.gridY + row * CELL + 2;
      gfx.lineStyle(3, color, 0.8);
      gfx.strokeRect(rx, ry, CELL_INNER - 4, CELL_INNER - 4);
    }

    const points: { x: number; y: number }[] = [];
    for (let r = 0; r < matchCount; r++) {
      const row = payline[r];
      points.push({
        x: this.gridX + r * CELL + CELL / 2,
        y: this.gridY + row * CELL + CELL / 2,
      });
    }

    gfx.lineStyle(4, color, 0.7);
    gfx.beginPath();
    gfx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      gfx.lineTo(points[i].x, points[i].y);
    }
    gfx.strokePath();
  }

  private dropSymbols(): number[][] {
    const dropMap: number[][] = [];

    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      const survivors: { symbol: number; oldIndex: number }[] = [];
      for (let row = CASCADE_TOTAL_ROWS - 1; row >= 0; row--) {
        if (this.grid[col][row] >= 0) {
          survivors.push({ symbol: this.grid[col][row], oldIndex: row });
        }
      }
      const newCount = CASCADE_TOTAL_ROWS - survivors.length;
      while (survivors.length < CASCADE_TOTAL_ROWS) {
        survivors.push({ symbol: this.randomSymbol(), oldIndex: -1 });
      }
      survivors.reverse();
      this.grid[col] = survivors.map(s => s.symbol);

      dropMap[col] = [];
      for (let vr = 0; vr < CASCADE_VISIBLE_ROWS; vr++) {
        const absIdx = CASCADE_BUFFER_ROWS + vr;
        const entry = survivors[absIdx];
        if (entry.oldIndex >= 0) {
          dropMap[col][vr] = absIdx - entry.oldIndex;
        } else {
          dropMap[col][vr] = newCount + vr;
        }
      }
    }

    return dropMap;
  }

  override play(): boolean {
    if (this.state !== SlotState.IDLE) return false;

    const cost = this.bet * this.lines;
    if (this.balance < cost) return false;

    this.balance -= cost;
    this.setBalance(this.balance);
    this.setState(SlotState.SPINNING);
    this.executeSpin();
    return true;
  }

  override getSpritesForPayline(_lineIndex: number): (Phaser.GameObjects.Sprite | null)[] {
    return [];
  }

  override destroy() {
    this.highlightGfx.destroy();
    for (let col = 0; col < CASCADE_REEL_COUNT; col++) {
      for (let row = 0; row < CASCADE_TOTAL_ROWS; row++) {
        this.cells[col]?.[row]?.container.destroy();
      }
    }
    this.cells = [];
    this.gridContainer.destroy();
  }
}
