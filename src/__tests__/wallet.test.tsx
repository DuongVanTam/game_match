import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WalletPage from '@/app/wallet/page';

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/wallet',
    query: {},
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock React Hook Form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: (fn: unknown) => (e: unknown) => {
      e.preventDefault();
      fn({ amount: 50000, paymentMethod: 'payos' });
    },
    formState: { errors: {} },
    reset: jest.fn(),
  }),
}));

// Mock window.open
Object.defineProperty(window, 'open', {
  writable: true,
  value: jest.fn(),
});

describe('WalletPage', () => {
  const mockWalletData = {
    balance: 100000,
    user: {
      full_name: 'Test User',
      email: 'test@example.com',
    },
  };

  const mockTransactions = [
    {
      id: '1',
      transaction_type: 'topup',
      amount: 50000,
      balance_after: 100000,
      description: 'Nạp tiền qua PayOS',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      transaction_type: 'join_match',
      amount: -10000,
      balance_after: 90000,
      description: 'Tham gia trận đấu',
      created_at: '2024-01-01T01:00:00Z',
    },
  ];

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    (window.open as jest.Mock).mockClear();
  });

  it('should render wallet page with loading state', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<WalletPage />);

    expect(screen.getByText('Đang tải thông tin ví...')).toBeInTheDocument();
  });

  it('should display wallet balance and user info', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWalletData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactions,
      });

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('100.000 ₫')).toBeInTheDocument();
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('should display recent transactions', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWalletData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactions,
      });

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Nạp tiền qua PayOS')).toBeInTheDocument();
      expect(screen.getByText('Tham gia trận đấu')).toBeInTheDocument();
    });
  });

  it('should handle topup form submission', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWalletData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactions,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          paymentUrl: 'https://payos.vn/checkout/123',
        }),
      });

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Nạp tiền')).toBeInTheDocument();
    });

    // Click on topup tab
    fireEvent.click(screen.getByText('Nạp tiền'));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Nhập số tiền muốn nạp'), {
      target: { value: '50000' },
    });

    fireEvent.click(screen.getByLabelText('PayOS'));

    // Submit form
    fireEvent.click(screen.getByText('Nạp tiền'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/topup/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 50000,
          paymentMethod: 'payos',
        }),
      });
    });

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        'https://payos.vn/checkout/123',
        '_blank'
      );
    });
  });

  it('should validate topup form', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWalletData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactions,
      });

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Nạp tiền')).toBeInTheDocument();
    });

    // Click on topup tab
    fireEvent.click(screen.getByText('Nạp tiền'));

    // Try to submit without filling form
    fireEvent.click(screen.getByText('Nạp tiền'));

    await waitFor(() => {
      expect(screen.getByText('Số tiền là bắt buộc')).toBeInTheDocument();
      expect(
        screen.getByText('Vui lòng chọn phương thức thanh toán')
      ).toBeInTheDocument();
    });
  });

  it('should handle topup form validation errors', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWalletData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactions,
      });

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Nạp tiền')).toBeInTheDocument();
    });

    // Click on topup tab
    fireEvent.click(screen.getByText('Nạp tiền'));

    // Enter invalid amount
    fireEvent.change(screen.getByPlaceholderText('Nhập số tiền muốn nạp'), {
      target: { value: '5000' }, // Below minimum
    });

    fireEvent.click(screen.getByLabelText('PayOS'));

    // Submit form
    fireEvent.click(screen.getByText('Nạp tiền'));

    await waitFor(() => {
      expect(
        screen.getByText('Số tiền tối thiểu là 10,000 VNĐ')
      ).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockWalletData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockTransactions,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Insufficient balance' }),
      });

    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<WalletPage />);

    await waitFor(() => {
      expect(screen.getByText('Nạp tiền')).toBeInTheDocument();
    });

    // Click on topup tab
    fireEvent.click(screen.getByText('Nạp tiền'));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText('Nhập số tiền muốn nạp'), {
      target: { value: '50000' },
    });

    fireEvent.click(screen.getByLabelText('PayOS'));

    // Submit form
    fireEvent.click(screen.getByText('Nạp tiền'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Lỗi: Insufficient balance');
    });

    alertSpy.mockRestore();
  });
});
