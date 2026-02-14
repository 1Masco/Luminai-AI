import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthView from '../AuthView';

// Mock the API service
jest.mock('../../utils/apiService', () => ({
  signup: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
}));

// Mock Supabase client
jest.mock('../../utils/supabaseClient', () => ({
  signUpWithEmail: jest.fn(),
  signInWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
  isConfigured: jest.fn(() => true),
}));

describe('AuthView', () => {
  const mockOnAuthSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Email authentication', () => {
    test('renders login form by default', () => {
      render(<AuthView onAuthSuccess={mockOnAuthSuccess} />);
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    });

    test('switches to signup view when signup button is clicked', async () => {
      const user = userEvent.setup();
      render(<AuthView onAuthSuccess={mockOnAuthSuccess} />);

      const signupLink = screen.getByText(/don't have an account/i);
      await user.click(signupLink);

      expect(screen.getByText(/create your account/i)).toBeInTheDocument();
    });

    test('submits login form with valid credentials', async () => {
      const user = userEvent.setup();
      render(<AuthView onAuthSuccess={mockOnAuthSuccess} />);

      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnAuthSuccess).toHaveBeenCalled();
      });
    });

    test('displays error message on invalid credentials', async () => {
      const user = userEvent.setup();
      const supabaseClient = require('../../utils/supabaseClient');
      supabaseClient.signInWithEmail.mockRejectedValue(
        new Error('Invalid login credentials')
      );

      render(<AuthView onAuthSuccess={mockOnAuthSuccess} />);

      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
      });
    });

    test('requires email and password fields', async () => {
      const user = userEvent.setup();
      render(<AuthView onAuthSuccess={mockOnAuthSuccess} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Form should not submit
      expect(mockOnAuthSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Signup flow', () => {
    test('submits signup form with valid data', async () => {
      const user = userEvent.setup();
      render(<AuthView onAuthSuccess={mockOnAuthSuccess} />);

      const signupLink = screen.getByText(/don't have an account/i);
      await user.click(signupLink);

      const nameInput = screen.getByPlaceholderText(/name/i);
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const signupButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signupButton);

      await waitFor(() => {
        expect(mockOnAuthSuccess).toHaveBeenCalled();
      });
    });
  });
});
