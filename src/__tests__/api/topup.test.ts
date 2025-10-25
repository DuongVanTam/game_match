import { NextRequest } from 'next/server';
import { POST as topupInit } from '@/app/api/topup/init/route';
import { POST as topupConfirm } from '@/app/api/topup/confirm/route';

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
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-topup-id',
              user_id: 'test-user-id',
              amount: 50000,
              tx_ref: 'TFT_1234567890_abc123',
              payment_method: 'payos',
              status: 'pending',
            },
            error: null,
          })),
        })),
      })),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-topup-id',
              user_id: 'test-user-id',
              amount: 50000,
              tx_ref: 'TFT_1234567890_abc123',
              payment_method: 'payos',
              status: 'pending',
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
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

// Mock PayOS service
jest.mock('@/lib/payos', () => ({
  payosService: {
    isAvailable: jest.fn(() => true),
    createPaymentLink: jest.fn(() => ({
      checkoutUrl: 'https://payos.vn/checkout/123',
      orderCode: 1234567890,
    })),
  },
}));

describe('/api/topup/init', () => {
  it('should create topup request successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/topup/init', {
      method: 'POST',
      body: JSON.stringify({
        amount: 50000,
        paymentMethod: 'payos',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupInit(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.amount).toBe(50000);
    expect(data.paymentMethod).toBe('payos');
    expect(data.txRef).toMatch(/^TFT_\d+_[a-zA-Z0-9]+$/);
    expect(data.paymentUrl).toBe('https://payos.vn/checkout/123');
  });

  it('should validate minimum amount', async () => {
    const request = new NextRequest('http://localhost:3000/api/topup/init', {
      method: 'POST',
      body: JSON.stringify({
        amount: 5000, // Below minimum
        paymentMethod: 'payos',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupInit(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('should validate maximum amount', async () => {
    const request = new NextRequest('http://localhost:3000/api/topup/init', {
      method: 'POST',
      body: JSON.stringify({
        amount: 20000000, // Above maximum
        paymentMethod: 'payos',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupInit(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('should validate payment method', async () => {
    const request = new NextRequest('http://localhost:3000/api/topup/init', {
      method: 'POST',
      body: JSON.stringify({
        amount: 50000,
        paymentMethod: 'invalid', // Invalid payment method
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupInit(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
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

    const request = new NextRequest('http://localhost:3000/api/topup/init', {
      method: 'POST',
      body: JSON.stringify({
        amount: 50000,
        paymentMethod: 'payos',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupInit(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
});

describe('/api/topup/confirm', () => {
  it('should confirm topup successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/topup/confirm', {
      method: 'POST',
      body: JSON.stringify({
        txRef: 'TFT_1234567890_abc123',
        paymentData: {
          transactionId: 'payos_123',
          paymentMethod: 'payos',
          paidAt: '2024-01-01T00:00:00Z',
        },
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupConfirm(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Topup confirmed successfully');
    expect(data.amount).toBe(50000);
    expect(data.ledgerId).toBe('test-ledger-id');
  });

  it('should handle already confirmed topup', async () => {
    // Mock already confirmed topup
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createServerClient } = require('@/lib/supabase');
    createServerClient.mockReturnValue({
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
                id: 'test-topup-id',
                user_id: 'test-user-id',
                amount: 50000,
                tx_ref: 'TFT_1234567890_abc123',
                payment_method: 'payos',
                status: 'confirmed', // Already confirmed
              },
              error: null,
            })),
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost:3000/api/topup/confirm', {
      method: 'POST',
      body: JSON.stringify({
        txRef: 'TFT_1234567890_abc123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupConfirm(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Topup already confirmed');
  });

  it('should handle topup not found', async () => {
    // Mock topup not found
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createServerClient } = require('@/lib/supabase');
    createServerClient.mockReturnValue({
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
              data: null,
              error: { message: 'Not found' },
            })),
          })),
        })),
      })),
    });

    const request = new NextRequest('http://localhost:3000/api/topup/confirm', {
      method: 'POST',
      body: JSON.stringify({
        txRef: 'TFT_1234567890_abc123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupConfirm(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Topup record not found');
  });

  it('should validate transaction reference', async () => {
    const request = new NextRequest('http://localhost:3000/api/topup/confirm', {
      method: 'POST',
      body: JSON.stringify({
        txRef: '', // Empty txRef
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await topupConfirm(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });
});
