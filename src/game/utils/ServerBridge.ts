import { GameServer } from "@agent8/gameserver";

const FALLBACK_BALANCE = 300_000_000;

async function getGS(): Promise<GameServer | null> {
  const gs = GameServer.getInstance();
  if (gs.connected) return gs;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (gs.connected) return gs;
  }
  return null;
}

export async function fetchBalance(): Promise<number> {
  const gs = await getGS();
  if (!gs) {
    console.warn("[ServerBridge] Server not connected, using fallback balance");
    return FALLBACK_BALANCE;
  }
  const result: { balance: number } = await gs.remoteFunction("getBalance");
  return result.balance;
}

export async function isNewUser(): Promise<boolean> {
  const gs = await getGS();
  if (!gs) return false;
  const result: { isNew: boolean } = await gs.remoteFunction("isNewUser");
  return result.isNew;
}

export async function updateBalanceOnServer(
  balance: number,
  reason: string,
): Promise<{ balance: number; reason: string }> {
  const gs = await getGS();
  if (!gs) throw new Error("Server not connected");
  const result: { balance: number; reason: string } =
    await gs.remoteFunction("updateBalance", [balance, reason]);
  return result;
}

export async function resetBalance(): Promise<number> {
  const gs = await getGS();
  if (!gs) throw new Error("Server not connected");
  const result: { balance: number } = await gs.remoteFunction("resetBalance");
  return result.balance;
}

export async function clearUserState(): Promise<void> {
  const gs = await getGS();
  if (!gs) throw new Error("Server not connected");
  await gs.remoteFunction("clearBalance");
}

export async function fetchBossHP(bossName: string): Promise<number> {
  const gs = await getGS();
  if (!gs) return 50_000_000;
  const result: { bossName: string; hp: number } = await gs.remoteFunction("getBossHP", [bossName]);
  return result.hp;
}

export async function saveBossHP(bossName: string, hp: number): Promise<void> {
  const gs = await getGS();
  if (!gs) return;
  await gs.remoteFunction("updateBossHP", [bossName, hp]);
}

export async function markBossDead(bossName: string): Promise<void> {
  const gs = await getGS();
  if (!gs) return;
  await gs.remoteFunction("markBossDead", [bossName]);
}

export async function checkAllCleared(): Promise<boolean> {
  const gs = await getGS();
  if (!gs) return false;
  const bosses: Record<string, { hp: number; alive: boolean }> = await gs.remoteFunction("getBossesAlive");
  return Object.values(bosses).every(b => !b.alive);
}

export async function resetAllBosses(): Promise<void> {
  const gs = await getGS();
  if (!gs) return;
  await gs.remoteFunction("resetAllBosses");
}
