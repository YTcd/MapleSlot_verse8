/**
 * MapleSlot Server Tests
 *
 * Test framework API:
 * - describe(name, fn) - Group tests
 * - test(name, fn) - Define test
 * - expect(value) - Assertions
 * - server.connect(sender) - Change user context
 */

describe('balance', () => {
  test('getBalance returns initial value for new user', async (server) => {
    server.connect({ account: 'new-user-1' });

    const result = await server.getBalance();
    expect(result.balance).toBe(300_000_000);
  });

  test('getBalance persists across calls for same user', async (server) => {
    server.connect({ account: 'returning-user' });

    await server.getBalance();

    const result = await server.getBalance();
    expect(result.balance).toBe(300_000_000);
  });

  test('updateBalance changes the balance', async (server) => {
    server.connect({ account: 'player-1' });

    const result = await server.updateBalance(250_000_000, 'slot_bet');
    expect(result.balance).toBe(250_000_000);
    expect(result.reason).toBe('slot_bet');
  });

  test('getBalance returns updated balance after updateBalance', async (server) => {
    server.connect({ account: 'player-2' });

    await server.getBalance();
    await server.updateBalance(500_000_000, 'slot_win');

    const result = await server.getBalance();
    expect(result.balance).toBe(500_000_000);
  });

  test('updateBalance rejects negative balance', async (server) => {
    server.connect({ account: 'player-3' });

    let errorThrown = false;
    try {
      await server.updateBalance(-1, 'bug');
    } catch {
      errorThrown = true;
    }
    expect(errorThrown).toBe(true);
  });

  test('different users have independent balances', async (server) => {
    server.connect({ account: 'alice' });
    await server.getBalance();
    await server.updateBalance(100_000_000, 'bet');

    server.connect({ account: 'bob' });
    const result = await server.getBalance();
    expect(result.balance).toBe(300_000_000);
  });
});
