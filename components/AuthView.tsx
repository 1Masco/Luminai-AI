
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabaseClient';

interface AuthViewProps {
  onLogin: (user: UserProfile) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

type AuthMode = 'login' | 'signup' | 'phone' | 'otp_verify' | 'forgot_password' | 'reset_password';

const getPasswordStrength = (pw: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
};

const AuthView: React.FC<AuthViewProps> = ({ onLogin, isDark, onToggleTheme }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authContext, setAuthContext] = useState<'user' | 'admin'>('user');
  const [adminCode, setAdminCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isAdminMode = authContext === 'admin';
  const adminAccessCode = import.meta.env.VITE_ADMIN_ACCESS_CODE;

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const showPasswordStrength = (mode === 'signup' || mode === 'reset_password') && password.length > 0;

  // Detect password recovery redirect from Supabase (URL contains type=recovery)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setMode('reset_password');
      setError(null);
      setMessage('Enter your new password below.');
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setError('Password reset requires Supabase to be configured.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#type=recovery`
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for a password reset link. It may take a minute to arrive.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (passwordStrength.score <= 2) {
      setError('Please choose a stronger password. Include uppercase, lowercase, numbers, and special characters.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setError('Password reset requires Supabase to be configured.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Password updated successfully! You can now sign in with your new password.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        // Clean up the recovery hash from the URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setError('Email verification requires Supabase to be configured.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({ type: 'signup', email });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Verification email resent. Check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);

    if (isAdminMode) {
      setError('Admin login uses email and password.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setIsLoading(true);
      setTimeout(() => {
        onLogin({
          name: 'Alex Rivera',
          email: 'alex.rivera@gmail.com',
          avatar: 'https://i.pravatar.cc/150?u=alex',
          plan: 'free',
          isAdmin: false,
          connectedApps: { google: true, zoom: false, teams: false, dropbox: false }
        });
      }, 1500);
      return;
    }

    try {
      setIsLoading(true);
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        setError(error.message);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (isAdminMode && mode === 'signup') {
      setMode('login');
      setError('Admin accounts cannot be created here.');
      return;
    }

    if (!isSupabaseConfigured()) {
      if (isAdminMode) {
        if (adminAccessCode && adminCode.trim() !== adminAccessCode) {
          setError('Invalid admin access code.');
          return;
        }

        setIsLoading(true);
        setTimeout(() => {
          onLogin({
            name: name || 'Admin',
            email: email || 'admin@lumina.ai',
            avatar: `https://i.pravatar.cc/150?u=${email || 'admin'}`,
            plan: 'team',
            isAdmin: true,
            connectedApps: { google: false, zoom: false, teams: false, dropbox: false }
          });
        }, 800);
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        onLogin({
          name: name || 'New User',
          email: email,
          avatar: `https://i.pravatar.cc/150?u=${email}`,
          plan: 'free',
          isAdmin: false,
          connectedApps: { google: false, zoom: false, teams: false, dropbox: false }
        });
      }, 1500);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (mode === 'signup') {
        if (password.length < 8) {
          setError('Password must be at least 8 characters.');
          setIsLoading(false);
          return;
        }

        if (passwordStrength.score <= 2) {
          setError('Please choose a stronger password. Include uppercase, lowercase, numbers, and special characters.');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || 'New User',
              avatar_url: `https://i.pravatar.cc/150?u=${email}`
            }
          }
        });

        if (error) {
          setError(error.message);
        } else if (data.user && !data.session) {
          setMessage('Check your email for a confirmation link to complete sign up.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          setError(error.message);
          return;
        }

        // Enforce email verification
        if (data.user && !data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          setError('Please verify your email before logging in.');
          setMessage(null);
          return;
        }

        if (isAdminMode) {
          const adminUserId = data.user?.id;
          if (!adminUserId) {
            await supabase.auth.signOut();
            setError('Failed to verify admin access.');
            return;
          }

          const { data: adminProfile, error: adminError } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', adminUserId)
            .single();

          if (adminError) {
            await supabase.auth.signOut();
            setError('Failed to verify admin access.');
            return;
          }

          if (!adminProfile?.is_admin) {
            await supabase.auth.signOut();
            setError('This account is not an admin.');
            return;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (isAdminMode) {
      setError('Admin login uses email and password.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setIsLoading(true);
      setTimeout(() => {
        onLogin({
          name: 'Phone User',
          email: `${phone}@lumina.auth`,
          phone,
          avatar: `https://i.pravatar.cc/150?u=${phone}`,
          plan: 'free',
          isAdmin: false,
          connectedApps: { google: false, zoom: false, teams: false, dropbox: false }
        });
      }, 1500);
      return;
    }

    setIsLoading(true);

    try {
      const supabase = getSupabaseClient();
      if (mode === 'phone') {
        const { error } = await supabase.auth.signInWithOtp({
          phone
        });

        if (error) {
          setError(error.message);
        } else {
          setMode('otp_verify');
          setMessage('A verification code has been sent to your phone.');
        }
      } else if (mode === 'otp_verify') {
        const { error } = await supabase.auth.verifyOtp({
          phone,
          token: otpCode,
          type: 'sms'
        });

        if (error) {
          setError(error.message);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Phone authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === 'forgot_password') {
      handleForgotPassword(e);
    } else if (mode === 'reset_password') {
      handleResetPassword(e);
    } else if (mode === 'phone' || mode === 'otp_verify') {
      handlePhoneAuth(e);
    } else {
      handleEmailAuth(e);
    }
  };

  const getSubmitLabel = () => {
    switch (mode) {
      case 'login': return isAdminMode ? 'Admin Sign In' : 'Sign In';
      case 'signup': return 'Create Account';
      case 'phone': return 'Send Code';
      case 'otp_verify': return 'Verify Code';
      case 'forgot_password': return 'Send Reset Link';
      case 'reset_password': return 'Update Password';
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4 md:p-6 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <button
        onClick={onToggleTheme}
        className="absolute top-5 right-5 z-20 h-10 px-3 rounded-xl flex items-center gap-2 text-xs font-semibold transition-colors"
        style={{ backgroundColor: 'var(--glass-bg)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
        {isDark ? 'Light' : 'Dark'}
      </button>

      {/* Floating orbs */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-brand-300/20 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-300/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-200/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }}></div>

      <div className="w-full max-w-[420px] z-10 animate-scale-in">
        {/* Logo + Heading */}
        <div className="text-center mb-8 md:mb-10">
          <div className="relative inline-block">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-2xl shadow-brand-500/30 animate-glow">
              <i className="fas fa-microphone-lines text-2xl"></i>
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-[3px] flex items-center justify-center" style={{ borderColor: 'var(--bg-secondary)' }}>
              <i className="fas fa-sparkles text-[6px] text-white"></i>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>Welcome to <span className="gradient-text">Lumina</span></h1>
          <p className="text-sm md:text-base font-medium" style={{ color: 'var(--text-secondary)' }}>Your meetings, intelligently captured.</p>
        </div>

        {/* Auth Card */}
        <div className="glass p-7 md:p-8 rounded-[28px] shadow-2xl shadow-gray-900/5" style={{ border: '1px solid var(--glass-border)' }}>
          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50/80 backdrop-blur border border-red-100 rounded-2xl text-sm text-red-600 flex items-start gap-2.5 animate-slide-down">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <i className="fas fa-exclamation text-[8px]"></i>
              </div>
              <div>
                <span className="font-medium">{error}</span>
                {error.includes('verify your email') && (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isLoading}
                    className="block text-xs text-brand-600 font-bold mt-1.5 hover:underline disabled:opacity-50"
                  >
                    Resend verification email
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success/Info Message */}
          {message && (
            <div className="mb-5 p-3.5 bg-emerald-50/80 backdrop-blur border border-emerald-100 rounded-2xl text-sm text-emerald-700 flex items-start gap-2.5 animate-slide-down">
              <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <i className="fas fa-check text-[8px]"></i>
              </div>
              <span className="font-medium">{message}</span>
            </div>
          )}

          {/* User/Admin context switcher - hide on forgot/reset password */}
          {mode !== 'forgot_password' && mode !== 'reset_password' && (
            <div className="flex bg-gray-100/60 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthContext('user');
                  setMode('login');
                  setAdminCode('');
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${!isAdminMode ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthContext('admin');
                  setMode('login');
                  setError(null);
                  setMessage(null);
                }}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${isAdminMode ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Admin
              </button>
            </div>
          )}

          {mode !== 'otp_verify' && mode !== 'forgot_password' && mode !== 'reset_password' && !isAdminMode && (
            <>
              {/* Tab Switcher */}
              <div className="flex bg-gray-100/60 p-1 rounded-2xl mb-7">
                <button
                  onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${mode === 'login' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${mode === 'signup' ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Sign Up
                </button>
              </div>

              {/* Social Login */}
              <div className="space-y-3 mb-7">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-white border border-gray-200/80 rounded-2xl font-semibold text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300/80 transition-all disabled:opacity-50 shadow-sm hover:shadow"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                  Continue with Google
                </button>
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-3 py-3 bg-gray-900 text-white rounded-2xl font-semibold text-sm transition-all opacity-40 cursor-not-allowed relative"
                >
                  <i className="fas fa-phone-alt text-xs"></i>
                  Continue with Phone
                  <span className="absolute right-3 text-[8px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Soon</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-7">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200/60"></div></div>
                <div className="relative flex justify-center text-[9px] uppercase"><span className="glass px-5 text-gray-400 font-bold tracking-[0.2em]">Or email</span></div>
              </div>
            </>
          )}

          {mode !== 'otp_verify' && mode !== 'forgot_password' && mode !== 'reset_password' && isAdminMode && (
            <div className="mb-6 p-3.5 bg-blue-50/70 backdrop-blur border border-blue-100 rounded-2xl text-sm text-blue-700 flex items-start gap-2.5 animate-slide-down">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <i className="fas fa-shield-halved text-[8px]"></i>
              </div>
              <span className="font-medium">Admin access only. Use your admin credentials to continue.</span>
            </div>
          )}

          {/* Forgot Password Header */}
          {mode === 'forgot_password' && (
            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-key text-brand-600"></i>
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enter your email and we'll send you a reset link.</p>
            </div>
          )}

          {/* Reset Password Header */}
          {mode === 'reset_password' && (
            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-lock text-emerald-600"></i>
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>New Password</h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Choose a strong password for your account.</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                />
              </div>
            )}

            {mode === 'otp_verify' ? (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">Verification Code</label>
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm text-center text-lg tracking-[0.5em] placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                />
                <button
                  type="button"
                  onClick={() => { setMode('login'); setOtpCode(''); setError(null); setMessage(null); }}
                  className="text-xs text-brand-600 font-bold mt-3 hover:underline"
                >
                  &larr; Back to login
                </button>
              </div>
            ) : mode === 'phone' ? (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                />
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  className="text-xs text-brand-600 font-bold mt-3 hover:underline"
                >
                  &larr; Back to email login
                </button>
              </div>
            ) : mode === 'forgot_password' ? (
              <>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  className="text-xs text-brand-600 font-bold hover:underline"
                >
                  &larr; Back to login
                </button>
              </>
            ) : mode === 'reset_password' ? (
              <>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">New Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                  />
                  {showPasswordStrength && (
                    <div className="mt-2 px-1">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'}`}
                          />
                        ))}
                      </div>
                      <p className={`text-[10px] font-semibold ${passwordStrength.score <= 2 ? 'text-red-500' : passwordStrength.score <= 4 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                  />
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1 px-1">Passwords do not match</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                  />
                  {showPasswordStrength && (
                    <div className="mt-2 px-1">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'}`}
                          />
                        ))}
                      </div>
                      <p className={`text-[10px] font-semibold ${passwordStrength.score <= 2 ? 'text-red-500' : passwordStrength.score <= 4 ? 'text-yellow-600' : 'text-emerald-600'}`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot_password'); setError(null); setMessage(null); }}
                    className="text-xs text-brand-600 font-bold hover:underline -mt-1"
                  >
                    Forgot password?
                  </button>
                )}
                {isAdminMode && !isSupabaseConfigured() && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1 mb-1.5 block">Admin Access Code</label>
                    <input
                      type="password"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      placeholder="Enter admin access code"
                      className="w-full bg-gray-50/80 border border-gray-200/60 rounded-xl py-3 px-4 text-sm placeholder:text-gray-300 focus:bg-white focus:border-brand-300 transition-all"
                    />
                    {!adminAccessCode && (
                      <p className="text-[10px] mt-2 px-1" style={{ color: 'var(--text-tertiary)' }}>
                        Optional in local mode. Set VITE_ADMIN_ACCESS_CODE to require a code.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-2xl font-bold text-sm hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
            >
              {isLoading && <i className="fas fa-circle-notch fa-spin"></i>}
              {getSubmitLabel()}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-8 text-[11px] leading-relaxed px-4" style={{ color: 'var(--text-tertiary)' }}>
          By continuing, you agree to Lumina's <span className="font-semibold hover:underline cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Terms</span> and <span className="font-semibold hover:underline cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Privacy</span>.
        </p>
      </div>
    </div>
  );
};

export default AuthView;
