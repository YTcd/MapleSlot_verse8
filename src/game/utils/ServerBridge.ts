import { GameServer } from "@agent8/gameserver";

const FALLBACK_BALANCE = 300_000_000;

async function waitForConnection(gs: GameServer): Promise<boolean> {
  if (gs.connected) return true;

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 100));
    if (gs.connected) return true;
  }
  return false;
}

export async function fetchBalance(): Promise<number> {
  const gs = GameServer.getInstance();

  const ok = await waitForConnection(gs);
  if (!ok) {
    console.warn("[ServerBridge] Server not connected, using fallback balance");
    return FALLBACK_BALANCE;
  }

  const result: { balance: number } = await gs.remoteFunction("getBalance");
  return result.balance;
}

export async function updateBalanceOnServer(
  balance: number,
  reason: string,
): Promise<{ balance: number; reason: string }> {
  const gs = GameServer.getInstance();

  const ok = await waitForConnection(gs);
  if (!ok) {
    throw new Error("Server not connected");
  }

  const result: { balance: number; reason: string } =
    await gs.remoteFunction("updateBalance", [balance, reason]);
  return result;
}
