import { NextRequest } from 'next/server';
import { GET as getWalletBalance } from '@/app/api/wallet/balance/route';
import { GET as getTransactions } from '@/app/api/wallet/transactions/route';

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-user-id',
              full_name: 'Test User',
              email: 'test@example.com',
            },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

describe('/api/wallet/balance', () => {
  it('should return wallet balance successfully', async () => {
    // Mock wallet data

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createServerClient } = require('@/lib/supabase');
    const mockClient = createServerClient();

    mockClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { balance: 100000 },
            error: null,
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost:3000/api/wallet/balance');
    const response = await getWalletBalance(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.balance).toBe(100000);
    expect(data.user.full_name).toBe('Test User');
    expect(data.user.email).toBe('test@example.com');
  });

  it('should handle unauthorized requests', async () => {
    // Mock unauthorized user
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createServerClient } = require('@/lib/supabase');
    createServerClient.mockReturnValue({
      auth: {
        getUser: jest.fn(() => ({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })),
      },
    });

    const request = new NextRequest('http://localhost:3000/api/wallet/balance');
    const response = await getWalletBalance(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});

describe('/api/wallet/transactions', () => {
  it('should return transactions successfully', async () => {
    // Mock transactions data

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createServerClient } = require('@/lib/supabase');
    const mockClient = createServerClient();

    mockClient.from.mockReturnValue({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              data: [
                {
                  id: '1',
                  transaction_type: 'topup',
                  amount: 50000,
                  balance_after: 100000,
                  description: 'Nạp tiền',
                  created_at: '2024-01-01T00:00:00Z',
                },
              ],
              error: null,
            })),
          })),
        })),
      })),
    });

    const request = new NextRequest(
      'http://localhost:3000/api/wallet/transactions'
    );
    const response = await getTransactions(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].transaction_type).toBe('topup');
  });

  it('should handle unauthorized requests', async () => {
    // Mock unauthorized user
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createServerClient } = require('@/lib/supabase');
    createServerClient.mockReturnValue({
      auth: {
        getUser: jest.fn(() => ({
          data: { user: null },
          error: { message: 'Unauthorized' },
        })),
      },
    });

    const request = new NextRequest(
      'http://localhost:3000/api/wallet/transactions'
    );
    const response = await getTransactions(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});
