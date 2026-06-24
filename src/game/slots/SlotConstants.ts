/** Slot machine state machine */
export const enum SlotState {
  IDLE = "IDLE",
  SPINNING = "SPINNING",
  EVALUATING = "EVALUATING",
  WIN_PRESENTATION = "WIN_PRESENTATION",
  AUTO_SPINNING = "AUTO_SPINNING",
}

/** Reel strip data — each array is a 50-symbol reel strip (symbols 0–6) */
export const REELS: Int8Array[] = [
  new Int8Array([5,0,3,1,4,1,0,3,6,0,3,3,2,6,0,4,1,2,5,1,0,2,6,0,0,0,5,5,4,1,3,5,0,4,1,0,5,1,4,2,3,2,2,3,3,1,0,2,6,2]),
  new Int8Array([0,1,6,0,2,3,6,0,6,1,1,3,3,2,6,2,4,4,1,2,4,2,5,4,3,0,0,1,5,2,2,1,5,0,3,5,0,5,0,1,2,5,3,3,3,0,1,0,4,0]),
  new Int8Array([2,3,6,4,0,1,0,2,0,3,3,2,1,4,2,2,0,5,1,6,3,5,1,4,1,1,0,0,3,0,5,3,6,3,2,3,5,4,0,5,1,4,1,2,5,0,2,6,0,0]),
  new Int8Array([2,6,1,1,0,2,2,6,0,0,5,2,2,6,1,2,0,0,1,0,0,4,3,4,3,3,0,5,3,2,3,3,5,1,1,4,1,5,0,5,0,6,5,3,4,2,0,3,4,1]),
  new Int8Array([4,2,4,2,1,6,5,6,5,5,0,1,3,3,3,1,0,0,3,4,5,5,3,2,3,2,0,6,0,4,2,1,1,2,3,1,0,1,4,5,0,0,0,0,3,2,6,0,2,1]),
];

/**
 * Pay table: multipliers at bet=1
 * [matchCount_3, matchCount_4, matchCount_5] → array of [symbol0, ..., symbol6]
 */
export const PAY_TABLE: Record<number, number[]> = {
  3: [6, 10, 12, 14, 18, 28, 47],
  4: [47, 70, 93, 141, 233, 466, 931],
  5: [347, 585, 931, 1863, 2794, 5827, 11653],
};

/** Total number of distinct symbols on reel strips */
export const SYMBOL_COUNT = 7;

/** Default configuration */
export const DEFAULT_BET = 1000;
export const BET_OPTIONS = [1000, 5000, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000];
export const LINE_OPTIONS = [1, 5, 9, 15, 25];

/** Slot grid layout */
export const REEL_COUNT = 5;
export const VISIBLE_ROWS = 3;
export const SYMBOL_SIZE = 96;
export const SYMBOL_GAP = 4;
export const POOL_PADDING = 2; // extra symbols above/below visible area for smooth scroll

/** Spin animation timing (ms) */
export const SPIN_DURATION_BASE = 1500;
export const SPIN_DURATION_PER_REEL = 200; // stagger each reel
export const SPIN_EASING = "Quad.easeOut";

/** All 25 paylines (0-based row indices per reel: 0=top, 1=center, 2=bottom) */
export const PAYLINES: number[][] = [
  [1,1,1,1,1], // 1
  [0,0,0,0,0], // 2
  [2,2,2,2,2], // 3
  [2,1,0,1,2], // 4
  [0,1,2,1,0], // 5
  [1,0,0,0,1], // 6
  [1,2,2,2,1], // 7
  [0,0,1,2,2], // 8
  [2,2,1,0,0], // 9
  [1,0,1,2,1], // 10
  [1,2,1,0,1], // 11
  [0,1,1,1,0], // 12
  [2,1,1,1,2], // 13
  [0,1,0,1,0], // 14
  [2,1,2,1,2], // 15
  [1,1,2,1,1], // 16
  [1,1,0,1,1], // 17
  [0,0,2,0,0], // 18
  [2,2,0,2,2], // 19
  [0,2,2,2,0], // 20
  [2,0,0,0,2], // 21
  [1,0,2,0,1], // 22
  [1,2,0,2,1], // 23
  [0,2,0,2,0], // 24
  [2,0,2,0,2], // 25
];

/** Unique colors for each payline visualization */
export const LINE_COLORS: number[] = [
  0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
  0x44ffff, 0xff8844, 0x88ff44, 0x4488ff, 0xff4488,
  0x88ff88, 0x8888ff, 0xffaa44, 0xaaff44, 0x44aaff,
  0xff44aa, 0x44ffaa, 0xaa44ff, 0xdddd44, 0x44dddd,
  0xdd44dd, 0xff6644, 0x66ff44, 0x4466ff, 0xcc88ff,
];
