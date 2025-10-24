// Mock Supabase client for testing
jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-id',
              email: 'test@example.com',
              full_name: 'Test User',
            },
            error: null,
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-id',
              email: 'test@example.com',
              full_name: 'Test User',
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'test-id',
                email: 'test@example.com',
                full_name: 'Updated Test User',
              },
              error: null,
            })),
          })),
        })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: null,
          error: null,
        })),
      })),
    })),
    rpc: jest.fn(() => ({
      data: 'test-ledger-id',
      error: null,
    })),
  })),
}));

describe('Database CRUD Operations', () => {
  let client: ReturnType<typeof createServerClient>;
  let testUserId: string;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createServerClient } = require('@/lib/supabase');
    client = createServerClient();
    testUserId = 'test-user-id-' + Date.now();
  });

  describe('Users Table', () => {
    it('should create a user', async () => {
      const { data, error } = await client
        .from('users')
        .insert({
          id: testUserId,
          email: 'test@example.com',
          full_name: 'Test User',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.email).toBe('test@example.com');
    });

    it('should read a user', async () => {
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.email).toBe('test@example.com');
    });

    it('should update a user', async () => {
      const { data, error } = await client
        .from('users')
        .update({ full_name: 'Updated Test User' })
        .eq('id', testUserId)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.full_name).toBe('Updated Test User');
    });
  });

  describe('Wallets Table', () => {
    it('should create a wallet for user', async () => {
      const { data, error } = await client
        .from('wallets')
        .insert({
          user_id: testUserId,
          balance: 100.0,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.balance).toBe(100.0);
    });

    it('should read wallet balance', async () => {
      const { data, error } = await client
        .from('wallets')
        .select('balance')
        .eq('user_id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.balance).toBe(100.0);
    });
  });

  describe('Matches Table', () => {
    let matchId: string;

    it('should create a match', async () => {
      const { data, error } = await client
        .from('matches')
        .insert({
          title: 'Test Match',
          description: 'Test match description',
          entry_fee: 10.0,
          created_by: testUserId,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.title).toBe('Test Match');
      matchId = data?.id;
    });

    it('should read matches', async () => {
      const { data, error } = await client
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.title).toBe('Test Match');
    });
  });

  describe('Database Functions', () => {
    it('should call update_wallet_balance function', async () => {
      const { data, error } = await client.rpc('update_wallet_balance', {
        p_user_id: testUserId,
        p_amount: 50.0,
        p_transaction_type: 'topup',
        p_description: 'Test topup',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await client.from('wallets').delete().eq('user_id', testUserId);
    await client.from('matches').delete().eq('created_by', testUserId);
    await client.from('users').delete().eq('id', testUserId);
  });
});
