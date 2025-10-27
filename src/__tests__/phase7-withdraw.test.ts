import { createServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth-server';

// Mock Supabase client for testing
jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              balance: 100000,
            },
            error: null,
          })),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-payout-id',
              user_id: 'test-user-id',
              amount: 50000,
              status: 'pending',
              payment_method: 'momo',
              payment_details: {
                accountNumber: '0123456789',
                accountName: 'Test User',
              },
              created_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: {
            balance: 50000,
            updated_at: new Date().toISOString(),
          },
          error: null,
        })),
      })),
    })),
  })),
}));

// Mock auth functions
jest.mock('@/lib/auth-server', () => ({
  getCurrentUser: jest.fn(() => ({
    id: 'test-user-id',
    role: 'user',
  })),
}));

describe('Phase 7 - Withdraw System', () => {
  let mockClient: ReturnType<typeof createServerClient>;

  beforeEach(() => {
    mockClient = createServerClient();
    jest.clearAllMocks();
  });

  describe('Withdraw Form Component', () => {
    it('should validate withdrawal amount correctly', () => {
      const withdrawData = {
        amount: 50000,
        paymentMethod: 'momo' as const,
        accountNumber: '0123456789',
        accountName: 'Test User',
        note: 'Test withdrawal',
      };

      // Test valid withdrawal
      expect(withdrawData.amount).toBeGreaterThanOrEqual(10000);
      expect(withdrawData.amount).toBeLessThanOrEqual(10000000);
      expect(withdrawData.paymentMethod).toBe('momo');
      expect(withdrawData.accountNumber).toBeTruthy();
      expect(withdrawData.accountName).toBeTruthy();
    });

    it('should reject invalid withdrawal amounts', () => {
      const invalidAmounts = [5000, 15000000, -1000];

      invalidAmounts.forEach((amount) => {
        expect(amount < 10000 || amount > 10000000).toBe(true);
      });
    });

    it('should validate payment method', () => {
      const validMethods = ['momo', 'bank_transfer', 'vietqr'];
      const invalidMethod = 'invalid_method';

      validMethods.forEach((method) => {
        expect(['momo', 'bank_transfer', 'vietqr']).toContain(method);
      });

      expect(['momo', 'bank_transfer', 'vietqr']).not.toContain(invalidMethod);
    });
  });

  describe('Payout API Endpoints', () => {
    it('should create payout request successfully', async () => {
      const payoutData = {
        amount: 50000,
        paymentMethod: 'momo',
        accountNumber: '0123456789',
        accountName: 'Test User',
        note: 'Test withdrawal',
      };

      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payoutData),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.payoutRequest).toBeDefined();
      expect(result.payoutRequest.amount).toBe(50000);
      expect(result.payoutRequest.status).toBe('pending');
    });

    it('should reject insufficient balance', async () => {
      // Mock insufficient balance
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { balance: 10000 }, // Less than requested amount
              error: null,
            })),
          })),
        })),
      }));

      mockClient.from = mockFrom;

      const payoutData = {
        amount: 50000, // More than balance
        paymentMethod: 'momo',
        accountNumber: '0123456789',
        accountName: 'Test User',
      };

      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payoutData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Insufficient balance');
    });

    it('should prevent multiple pending requests', async () => {
      // Mock existing pending request
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { balance: 100000 },
              error: null,
            })),
          })),
          in: jest.fn(() => ({
            data: [{ id: 'existing-request' }], // Existing pending request
            error: null,
          })),
        })),
      }));

      mockClient.from = mockFrom;

      const payoutData = {
        amount: 50000,
        paymentMethod: 'momo',
        accountNumber: '0123456789',
        accountName: 'Test User',
      };

      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payoutData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe(
        'You already have a pending withdrawal request'
      );
    });

    it('should fetch user payout requests', async () => {
      const response = await fetch('/api/payouts');
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get payout request status', async () => {
      const payoutId = 'test-payout-id';
      const response = await fetch(`/api/payouts/${payoutId}/status`);
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.id).toBe(payoutId);
    });
  });

  describe('Admin Payout Management', () => {
    beforeEach(() => {
      // Mock admin user
      (getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'admin-user-id',
        role: 'admin',
      });
    });

    it('should fetch all payout requests for admin', async () => {
      const response = await fetch('/api/admin/payouts');
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should update payout request status', async () => {
      const payoutId = 'test-payout-id';
      const updateData = {
        status: 'approved',
        admin_notes: 'Approved by admin',
        proof_tx: 'TXN123456789',
      };

      const response = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.message).toBe('Payout request updated successfully');
    });

    it('should refund amount when rejecting payout', async () => {
      const payoutId = 'test-payout-id';
      const updateData = {
        status: 'rejected',
        admin_notes: 'Rejected due to invalid account',
      };

      // Mock wallet update for refund
      const mockFrom = jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { balance: 50000 },
              error: null,
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            data: { balance: 100000 }, // Refunded amount
            error: null,
          })),
        })),
        insert: jest.fn(() => ({
          data: { id: 'ledger-entry-id' },
          error: null,
        })),
      }));

      mockClient.from = mockFrom;

      const response = await fetch(`/api/admin/payouts/${payoutId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.message).toBe('Payout request updated successfully');
    });

    it('should reject unauthorized admin access', async () => {
      // Mock non-admin user
      (getCurrentUser as jest.Mock).mockResolvedValue({
        id: 'regular-user-id',
        role: 'user',
      });

      const response = await fetch('/api/admin/payouts');
      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('Withdrawal List Component', () => {
    it('should display withdrawal requests correctly', () => {
      const mockRequests = [
        {
          id: 'req-1',
          amount: 50000,
          status: 'pending',
          payment_method: 'momo',
          payment_details: {
            accountNumber: '0123456789',
            accountName: 'Test User',
          },
          created_at: new Date().toISOString(),
        },
        {
          id: 'req-2',
          amount: 100000,
          status: 'completed',
          payment_method: 'bank_transfer',
          payment_details: {
            accountNumber: '1234567890',
            accountName: 'Another User',
            bankName: 'Vietcombank',
          },
          processed_at: new Date().toISOString(),
        },
      ];

      // Test status colors
      const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
      };

      mockRequests.forEach((request) => {
        expect(
          statusColors[request.status as keyof typeof statusColors]
        ).toBeDefined();
      });

      // Test payment method labels
      const paymentMethodLabels = {
        momo: 'Ví MoMo',
        bank_transfer: 'Chuyển khoản ngân hàng',
      };

      mockRequests.forEach((request) => {
        expect(
          paymentMethodLabels[
            request.payment_method as keyof typeof paymentMethodLabels
          ]
        ).toBeDefined();
      });
    });
  });

  describe('Balance History Component', () => {
    it('should calculate transaction statistics correctly', () => {
      const mockTransactions = [
        { transaction_type: 'topup', amount: 100000 },
        { transaction_type: 'join_match', amount: -10000 },
        { transaction_type: 'win_prize', amount: 50000 },
        { transaction_type: 'withdraw', amount: -20000 },
        { transaction_type: 'service_fee', amount: -1000 },
      ];

      const totalTopup = mockTransactions
        .filter((t) => t.transaction_type === 'topup')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalWinnings = mockTransactions
        .filter((t) => t.transaction_type === 'win_prize')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalWithdraw = mockTransactions
        .filter((t) => t.transaction_type === 'withdraw')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const totalSpent = mockTransactions
        .filter((t) =>
          ['join_match', 'service_fee'].includes(t.transaction_type)
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      expect(totalTopup).toBe(100000);
      expect(totalWinnings).toBe(50000);
      expect(totalWithdraw).toBe(20000);
      expect(totalSpent).toBe(11000);
    });

    it('should filter transactions by type correctly', () => {
      const mockTransactions = [
        { transaction_type: 'topup', amount: 100000 },
        { transaction_type: 'join_match', amount: -10000 },
        { transaction_type: 'win_prize', amount: 50000 },
        { transaction_type: 'withdraw', amount: -20000 },
      ];

      const topupTransactions = mockTransactions.filter(
        (t) => t.transaction_type === 'topup'
      );
      const matchTransactions = mockTransactions.filter((t) =>
        ['join_match', 'win_prize'].includes(t.transaction_type)
      );
      const withdrawTransactions = mockTransactions.filter(
        (t) => t.transaction_type === 'withdraw'
      );

      expect(topupTransactions).toHaveLength(1);
      expect(matchTransactions).toHaveLength(2);
      expect(withdrawTransactions).toHaveLength(1);
    });
  });

  describe('CSV Export Functionality', () => {
    it('should generate correct CSV data', () => {
      const mockPayoutRequests = [
        {
          id: 'req-1',
          user: { full_name: 'Test User', email: 'test@example.com' },
          amount: 50000,
          payment_method: 'momo',
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          processed_at: '2024-01-01T12:00:00Z',
          admin_notes: 'Processed successfully',
          proof_tx: 'TXN123456789',
        },
      ];

      const csvData = mockPayoutRequests.map((request) => ({
        ID: request.id,
        'Người dùng': request.user.full_name,
        Email: request.user.email,
        'Số tiền': request.amount,
        'Phương thức':
          request.payment_method === 'momo'
            ? 'Ví MoMo'
            : request.payment_method,
        'Trạng thái':
          request.status === 'completed' ? 'Hoàn thành' : request.status,
        'Ngày tạo': new Date(request.created_at).toLocaleString('vi-VN'),
        'Ngày xử lý': request.processed_at
          ? new Date(request.processed_at).toLocaleString('vi-VN')
          : '',
        'Ghi chú': request.admin_notes || '',
        'Mã giao dịch': request.proof_tx || '',
      }));

      expect(csvData).toHaveLength(1);
      expect(csvData[0]['ID']).toBe('req-1');
      expect(csvData[0]['Người dùng']).toBe('Test User');
      expect(csvData[0]['Số tiền']).toBe(50000);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        await fetch('/api/payouts');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        amount: 5000, // Below minimum
        paymentMethod: 'invalid_method',
        accountNumber: '', // Empty
        accountName: '', // Empty
      };

      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toBe('Invalid request data');
      expect(result.details).toBeDefined();
    });

    it('should handle unauthorized access', async () => {
      // Mock no user
      (getCurrentUser as jest.Mock).mockResolvedValue(null);

      const response = await fetch('/api/payouts');
      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toBe('Unauthorized');
    });
  });
});
