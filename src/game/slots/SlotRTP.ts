/**
 * Slot RTP (Return To Player) Monte Carlo Simulation
 * Run: bun run src/game/slots/SlotRTP.ts
 *
 * Simulates >= 1,000,000 spins and calculates the RTP.
 */

const REELS: number[][] = [
  [5,0,3,1,4,1,0,3,6,0,3,3,2,6,0,4,1,2,5,1,0,2,6,0,0,0,5,5,4,1,3,5,0,4,1,0,5,1,4,2,3,2,2,3,3,1,0,2,6,2],
  [0,1,6,0,2,3,6,0,6,1,1,3,3,2,6,2,4,4,1,2,4,2,5,4,3,0,0,1,5,2,2,1,5,0,3,5,0,5,0,1,2,5,3,3,3,0,1,0,4,0],
  [2,3,6,4,0,1,0,2,0,3,3,2,1,4,2,2,0,5,1,6,3,5,1,4,1,1,0,0,3,0,5,3,6,3,2,3,5,4,0,5,1,4,1,2,5,0,2,6,0,0],
  [2,6,1,1,0,2,2,6,0,0,5,2,2,6,1,2,0,0,1,0,0,4,3,4,3,3,0,5,3,2,3,3,5,1,1,4,1,5,0,5,0,6,5,3,4,2,0,3,4,1],
  [4,2,4,2,1,6,5,6,5,5,0,1,3,3,3,1,0,0,3,4,5,5,3,2,3,2,0,6,0,4,2,1,1,2,3,1,0,1,4,5,0,0,0,0,3,2,6,0,2,1],
];

const PAY_TABLE: Record<number, number[]> = {
  3: [4.5, 6, 7.5, 9, 12, 18, 30],
  4: [30, 45, 60, 90, 150, 300, 600],
  5: [225, 375, 600, 1200, 1800, 3750, 7500],
};

const REEL_COUNT = 5;
const STRIP_LENGTH = 50;
const BET = 100;
const LINES = 1;
const SIM_COUNT = 1_000_000;

function spin(): number[][] {
  const result: number[][] = [];
  for (let r = 0; r < REEL_COUNT; r++) {
    const pos = Math.floor(Math.random() * STRIP_LENGTH);
    const reel: number[] = [];
    for (let row = 0; row < 3; row++) {
      reel.push(REELS[r][(pos + row) % STRIP_LENGTH]);
    }
    result.push(reel);
  }
  return result;
}

function evaluate(allSymbols: number[][]): number {
  // Center row only (row index 1)
  const rowIdx = 1;
  const rowSymbols = allSymbols.map((reel) => reel[rowIdx]);
  const firstSym = rowSymbols[0];
  if (firstSym < 0) return 0;

  let matchCount = 1;
  for (let r = 1; r < REEL_COUNT; r++) {
    if (rowSymbols[r] === firstSym) {
      matchCount++;
    } else {
      break;
    }
  }

  if (matchCount >= 3) {
    const multipliers = PAY_TABLE[matchCount];
    if (multipliers && firstSym < multipliers.length) {
      return multipliers[firstSym] * BET;
    }
  }

  return 0;
}

console.log(`Running ${SIM_COUNT.toLocaleString()} spin simulation...`);

let totalBet = 0;
let totalWin = 0;
let winCount = 0;
const hitCounts: Record<number, number> = { 3: 0, 4: 0, 5: 0 };

for (let i = 0; i < SIM_COUNT; i++) {
  totalBet += BET * LINES;
  const symbols = spin();
  const win = evaluate(symbols);
  totalWin += win;
  if (win > 0) {
    winCount++;
    // Determine match count from win amount
    const rowSymbol = symbols.map((r) => r[1]);
    const sym = rowSymbol[0];
    let matchCount = 1;
    for (let r = 1; r < REEL_COUNT; r++) {
      if (rowSymbol[r] === sym) matchCount++;
      else break;
    }
    if (matchCount >= 3) hitCounts[matchCount] = (hitCounts[matchCount] || 0) + 1;
  }
}

const rtp = (totalWin / totalBet) * 100;

console.log("\n=== RTP Results ===");
console.log(`Spins:         ${SIM_COUNT.toLocaleString()}`);
console.log(`Total Bet:     ${totalBet.toLocaleString()}`);
console.log(`Total Win:     ${totalWin.toLocaleString()}`);
console.log(`RTP:           ${rtp.toFixed(2)}%`);
console.log(`Winning spins: ${winCount.toLocaleString()} (${((winCount / SIM_COUNT) * 100).toFixed(2)}%)`);
console.log(`\nHit counts:`);
console.log(`  3-of-a-kind: ${hitCounts[3]?.toLocaleString() ?? 0}`);
console.log(`  4-of-a-kind: ${hitCounts[4]?.toLocaleString() ?? 0}`);
console.log(`  5-of-a-kind: ${hitCounts[5]?.toLocaleString() ?? 0}`);
