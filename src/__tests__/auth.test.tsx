/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/auth/login/page';
import RegisterPage from '@/app/auth/register/page';
import { AuthProvider } from '@/lib/auth';

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

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: () => ({
    auth: {
      signInWithOtp: mockSignIn,
      signUp: jest.fn((email, password, options) => mockSignUp(email, password, options.data?.full_name)),
      signOut: mockSignOut,
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      getSession: jest.fn(() => ({ data: { session: null } })),
    },
  }),
}));

// Helper function to render components with AuthProvider
const renderWithAuth = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe('Login Page', () => {
    it('renders login form correctly', () => {
      renderWithAuth(<LoginPage />);

      expect(screen.getByText('Sign in to TFT Match')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByText('Send magic link')).toBeInTheDocument();
    });

    it('handles email submission', async () => {
      mockSignIn.mockResolvedValueOnce({ error: null });

      renderWithAuth(<LoginPage />);

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

      renderWithAuth(<LoginPage />);

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
      renderWithAuth(<RegisterPage />);

      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Game Account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
    });

    it('handles registration submission', async () => {
      mockSignUp.mockResolvedValueOnce({ error: null });

      renderWithAuth(<RegisterPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const gameAccountInput = screen.getByLabelText('Game Account');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(gameAccountInput, { target: { value: 'TestPlayer' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          'test@example.com',
          'password123',
          'TestPlayer'
        );
      });
    });

    it('displays error on registration failure', async () => {
      mockSignUp.mockRejectedValueOnce(new Error('Email already exists'));

      renderWithAuth(<RegisterPage />);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const gameAccountInput = screen.getByLabelText('Game Account');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(gameAccountInput, { target: { value: 'TestPlayer' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });
  });
});
