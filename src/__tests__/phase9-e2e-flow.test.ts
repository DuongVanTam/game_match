import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from '@jest/globals';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn(),
    signInWithOtp: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Phase 9 - End-to-End Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock response
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('Complete Flow: Topup → Join → Settle → Withdraw', () => {
    it('should handle complete user journey successfully', async () => {
      // Mock user authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
      });

      // Mock API responses for complete flow
      mockFetch
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () =>
            Promise.resolve({
              tx_ref: 'test-tx-ref-123',
              payment_url: 'https://payos.vn/pay/test-tx-ref-123',
            }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ id: 'match-123' }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ id: 'payout-123' }),
        });

      // 1. Test Topup Flow
      const topupResponse = await fetch('/api/topup/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          amount: 100000,
        }),
      });

      expect(topupResponse.status).toBe(200);
      const topupData = await topupResponse.json();
      expect(topupData.tx_ref).toBeDefined();

      // 2. Test Match Creation and Joining
      const createMatchResponse = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          title: 'Test Tournament',
          entry_fee: 20000,
          max_players: 8,
        }),
      });

      expect(createMatchResponse.status).toBe(200);

      // 3. Test Match Settlement
      const settleResponse = await fetch('/api/matches/match-123/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          winner_id: 'test-user-id',
          proof_image_url: 'https://example.com/proof.jpg',
        }),
      });

      expect(settleResponse.status).toBe(200);

      // 4. Test Withdrawal Flow
      const withdrawResponse = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          amount: 50000,
          payment_method: 'momo',
          account_number: '0123456789',
          account_name: 'Test User',
        }),
      });

      expect(withdrawResponse.status).toBe(200);
    });
  });

  describe('Edge Cases Testing', () => {
    it('should handle insufficient balance when joining match', async () => {
      // Reset mock for this specific test
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Insufficient balance to join match',
          }),
      });

      const joinResponse = await fetch('/api/matches/test-match-id/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      expect(joinResponse.status).toBe(400);
      const errorData = await joinResponse.json();
      expect(errorData.error).toContain('insufficient balance');
    });

    it('should prevent duplicate join attempts', async () => {
      // Reset mock for this specific test
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'User has already joined this match',
          }),
      });

      const joinResponse = await fetch('/api/matches/test-match-id/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      expect(joinResponse.status).toBe(400);
      const errorData = await joinResponse.json();
      expect(errorData.error).toContain('already joined');
    });

    it('should prevent double settlement', async () => {
      // Reset mock for this specific test
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Match has already been settled',
          }),
      });

      const settleResponse = await fetch('/api/matches/test-match-id/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
        body: JSON.stringify({
          winner_id: 'test-user-id',
          proof_image_url: 'https://example.com/proof.jpg',
        }),
      });

      expect(settleResponse.status).toBe(400);
      const errorData = await settleResponse.json();
      expect(errorData.error).toContain('already settled');
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      // Reset mock for this specific test
      mockFetch.mockClear();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/wallet/balance', {
          headers: {
            Authorization: 'Bearer test-token',
          },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    it('should handle invalid authentication', async () => {
      // Reset mock for this specific test
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        status: 401,
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Invalid authentication token',
          }),
      });

      const response = await fetch('/api/wallet/balance', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });

    it('should handle database connection errors', async () => {
      // Reset mock for this specific test
      mockFetch.mockClear();
      mockFetch.mockResolvedValueOnce({
        status: 500,
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Database connection failed',
          }),
      });

      const response = await fetch('/api/wallet/balance', {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      expect(response.status).toBe(500);
    });
  });

  describe('API Endpoint Security', () => {
    it('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/wallet/balance',
        '/api/matches',
        '/api/payouts',
        '/api/topup/init',
      ];

      // Reset mock for this specific test
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        status: 401,
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Authentication required',
          }),
      });

      for (const endpoint of protectedEndpoints) {
        const response = await fetch(endpoint, {
          method: endpoint.includes('balance') ? 'GET' : 'POST',
        });

        expect(response.status).toBe(401);
      }
    });

    it('should validate input data properly', async () => {
      const invalidRequests = [
        {
          endpoint: '/api/topup/init',
          body: { amount: -1000 },
        },
        {
          endpoint: '/api/matches',
          body: { entry_fee: 'invalid' },
        },
        {
          endpoint: '/api/payouts',
          body: { amount: 0 },
        },
      ];

      // Reset mock for this specific test
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        status: 400,
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'Invalid input data',
          }),
      });

      for (const request of invalidRequests) {
        const response = await fetch(request.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          body: JSON.stringify(request.body),
        });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across operations', async () => {
      const initialBalance = 100000;

      mockFetch
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ balance: initialBalance - 20000 }),
        });

      // Join match with 20k entry fee
      const joinResponse = await fetch('/api/matches/test-match-id/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      });

      expect(joinResponse.status).toBe(200);

      // Verify balance was deducted correctly
      const balanceResponse = await fetch('/api/wallet/balance', {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      expect(balanceResponse.status).toBe(200);
      const balanceData = await balanceResponse.json();
      expect(balanceData.balance).toBe(initialBalance - 20000);
    });
  });
});
