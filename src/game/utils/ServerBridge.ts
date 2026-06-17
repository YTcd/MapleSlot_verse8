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
