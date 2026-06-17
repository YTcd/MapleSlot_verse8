export const CASCADE_REEL_COUNT = 5;
export const CASCADE_VISIBLE_ROWS = 3;
export const CASCADE_BUFFER_ROWS = 8;
export const CASCADE_TOTAL_ROWS = CASCADE_VISIBLE_ROWS + CASCADE_BUFFER_ROWS;

export const CASCADE_SYMBOL_COUNT = 7;

export const SYMBOL_WILD = 5;
export const SYMBOL_SCATTER = 6;

export const CASCADE_PAY_TABLE: Record<number, number[]> = {
  3: [3, 5, 7, 10, 15, 25, 0],
  4: [14, 23, 37, 60, 90, 150, 0],
  5: [75, 113, 188, 300, 450, 750, 0],
};

export const CASCADE_PAYLINES: number[][] = [
  [1,1,1,1,1], [0,0,0,0,0], [2,2,2,2,2],
  [2,1,0,1,2], [0,1,2,1,0],
  [1,0,0,0,1], [1,2,2,2,1],
  [0,0,1,2,2], [2,2,1,0,0],
  [1,0,1,2,1], [1,2,1,0,1],
  [0,1,1,1,0], [2,1,1,1,2],
  [0,1,0,1,0], [2,1,2,1,2],
  [1,1,2,1,1], [1,1,0,1,1],
  [0,0,2,0,0], [2,2,0,2,2],
  [0,2,2,2,0], [2,0,0,0,2],
  [1,0,2,0,1], [1,2,0,2,1],
  [0,2,0,2,0], [2,0,2,0,2],
];

export const CASCADE_LINE_COLORS: number[] = [
  0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff,
  0x44ffff, 0xff8844, 0x88ff44, 0x4488ff, 0xff4488,
  0x88ff88, 0x8888ff, 0xffaa44, 0xaaff44, 0x44aaff,
  0xff44aa, 0x44ffaa, 0xaa44ff, 0xdddd44, 0x44dddd,
  0xdd44dd, 0xff6644, 0x66ff44, 0x4466ff, 0xcc88ff,
];

export const FREE_SPINS_TRIGGER_COUNT = 3;
export const FREE_SPINS_COUNT = 10;

export const CASCADE_MULTIPLIER_STEPS = [1, 2, 3, 5, 10];
