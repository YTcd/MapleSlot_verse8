/**
 * MapleSlot GameServer
 *
 * Install types: npm install -D @agent8/gameserver-node
 * Types are automatically available: $global, $sender, $room, $asset
 */

/** 변경해서 사용할 초기 balance 값 */
const INITIAL_BALANCE = 300_000_000;

export class Server {
  async ping(): Promise<string> {
    return 'pong';
  }

  async getMyAccount(): Promise<string> {
    return $sender.account;
  }

  /**
   * 현재 유저의 balance를 조회한다.
   * 처음 접속한 유저라면 INITIAL_BALANCE로 초기화한 뒤 반환한다.
   */
  async getBalance(): Promise<{ balance: number }> {
    const myState = await $global.getMyState();
    if (myState.balance === undefined || myState.balance === null) {
      await $global.updateMyState({ balance: INITIAL_BALANCE });
      return { balance: INITIAL_BALANCE };
    }
    return { balance: myState.balance };
  }

  /**
   * 신규 유저인지 확인한다. balance가 초기화된 적 없으면 true.
   */
  async isNewUser(): Promise<{ isNew: boolean }> {
    const myState = await $global.getMyState();
    return { isNew: myState.balance === undefined || myState.balance === null };
  }

  /**
   * balance를 INITIAL_BALANCE로 리셋한다 (개발/테스트용).
   */
  async resetBalance(): Promise<{ balance: number }> {
    await $global.updateMyState({ balance: INITIAL_BALANCE });
    return { balance: INITIAL_BALANCE };
  }

  /**
   * balance를 완전히 삭제하여 신규 유저 상태로 되돌린다.
   */
  async clearBalance(): Promise<{ cleared: boolean }> {
    await $global.updateMyState({
      balance: undefined,
      bosses: {
        MushMom: 30_000_000,
        JrBalrog: 150_000_000,
        Papulatus: 650_000_000,
      },
    });
    return { cleared: true };
  }

  /**
   * 특정 보스의 HP를 조회한다.
   */
  async getBossHP(bossName: string): Promise<{ bossName: string; hp: number }> {
    const myState = await $global.getMyState();
    const bosses = myState.bosses || {};
    if (bosses[bossName] === undefined || bosses[bossName] === null) {
      const defaults: Record<string, number> = {
        MushMom: 30_000_000,
        JrBalrog: 150_000_000,
        Papulatus: 650_000_000,
        Balrog: 30_000_000,
      };
      return { bossName, hp: defaults[bossName] ?? 30_000_000 };
    }
    return { bossName, hp: bosses[bossName] };
  }

  /**
   * 특정 보스의 HP를 저장한다.
   */
  async updateBossHP(bossName: string, hp: number): Promise<{ bossName: string; hp: number }> {
    if (typeof hp !== 'number' || hp < 0) hp = 0;
    const myState = await $global.getMyState();
    const bosses = myState.bosses || {};
    bosses[bossName] = hp;
    await $global.updateMyState({ bosses });
    return { bossName, hp };
  }

  async markBossDead(bossName: string): Promise<{ bossName: string; dead: boolean }> {
    const myState = await $global.getMyState();
    const bosses = myState.bosses || {};
    bosses[bossName] = 0;
    await $global.updateMyState({ bosses });
    return { bossName, dead: true };
  }

  async getBossesAlive(): Promise<Record<string, { hp: number; alive: boolean }>> {
    const myState = await $global.getMyState();
    const bosses = myState.bosses || {};
    const defaults: Record<string, number> = {
      MushMom: 30_000_000,
      JrBalrog: 150_000_000,
      Papulatus: 650_000_000,
    };
    const result: Record<string, { hp: number; alive: boolean }> = {};
    for (const [name, defaultHP] of Object.entries(defaults)) {
      result[name] = {
        hp: bosses[name] ?? defaultHP,
        alive: (bosses[name] ?? defaultHP) > 0,
      };
    }
    return result;
  }

  async resetAllBosses(): Promise<{ reset: boolean }> {
    await $global.updateMyState({
      bosses: {
        MushMom: 30_000_000,
        JrBalrog: 150_000_000,
        Papulatus: 650_000_000,
      },
    });
    return { reset: true };
  }

  /**
   * balance를 변경하고 변경 사유를 기록한다.
   * @param balance - 변경할 balance 값
   * @param reason - 변경 사유 (예: "slot_win", "slot_bet", "daily_reward")
   */
  async updateBalance(
    balance: number,
    reason: string,
  ): Promise<{ balance: number; reason: string }> {
    if (typeof balance !== 'number' || isNaN(balance)) {
      throw new Error('Invalid balance value');
    }
    if (balance < 0) {
      throw new Error('Balance cannot be negative');
    }

    await $global.updateMyState({ balance });
    return { balance, reason };
  }
}
