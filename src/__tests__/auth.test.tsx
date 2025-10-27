/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/auth/login/page';
import RegisterPage from '@/app/auth/register/page';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Mock Supabase client
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    auth: {
      signInWithOtp: mockSignIn,
      signUp: mockSignUp,
      signOut: mockSignOut,
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      getSession: jest.fn(() => ({ data: { session: null } })),
    },
  }),
}));

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe('Login Page', () => {
    it('renders login form correctly', () => {
      render(<LoginPage />);

      expect(screen.getByText('Sign in to TFT Match')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByText('Send magic link')).toBeInTheDocument();
    });

    it('handles email submission', async () => {
      mockSignIn.mockResolvedValueOnce({ error: null });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByText('Send magic link');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'test@example.com',
          options: {
            emailRedirectTo: expect.stringContaining('/auth/callback'),
          },
        });
      });
    });

    it('displays error on sign in failure', async () => {
      mockSignIn.mockRejectedValueOnce(new Error('Invalid email'));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByText('Send magic link');

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email')).toBeInTheDocument();
      });
    });
  });

  describe('Register Page', () => {
    it('renders register form correctly', () => {
      render(<RegisterPage />);

      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });

    it('handles registration submission', async () => {
      mockSignUp.mockResolvedValueOnce({ error: null });

      render(<RegisterPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByText('Create Account');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          {
            emailRedirectTo: expect.stringContaining('/auth/callback'),
          }
        );
      });
    });

    it('displays error on registration failure', async () => {
      mockSignUp.mockRejectedValueOnce(new Error('Email already exists'));

      render(<RegisterPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByText('Create Account');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });
  });
});
