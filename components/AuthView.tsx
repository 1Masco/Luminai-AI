
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

interface AuthViewProps {
  onLogin: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'signup' | 'phone' | 'otp_verify';

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);

    if (!isSupabaseConfigured()) {
      // Fallback mock for development without Supabase
      setIsLoading(true);
      setTimeout(() => {
        onLogin({
          name: 'Alex Rivera',
          email: 'alex.rivera@gmail.com',
          avatar: 'https://i.pravatar.cc/150?u=alex',
          plan: 'free',
          connectedApps: { google: true, zoom: false, teams: false, dropbox: false }
        });
      }, 1500);
      return;
    }

    try {
      setIsLoading(true);
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
      // If successful, the page will redirect to Google and back
      // The onAuthStateChange listener in App.tsx will handle the session
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured()) {
      // Fallback mock for development without Supabase
      setIsLoading(true);
      setTimeout(() => {
        onLogin({
          name: name || 'New User',
          email: email,
          avatar: `https://i.pravatar.cc/150?u=${email}`,
          plan: 'free',
          connectedApps: { google: false, zoom: false, teams: false, dropbox: false }
        });
      }, 1500);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        // Sign up with email/password
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
          // Email confirmation required
          setMessage('Check your email for a confirmation link to complete sign up.');
        }
        // If session exists, onAuthStateChange in App.tsx handles it
      } else {
        // Sign in with email/password
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          setError(error.message);
        }
        // If successful, onAuthStateChange in App.tsx handles the session
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

    if (!isSupabaseConfigured()) {
      // Fallback mock
      setIsLoading(true);
      setTimeout(() => {
        onLogin({
          name: 'Phone User',
          email: `${phone}@lumina.auth`,
          phone,
          avatar: `https://i.pravatar.cc/150?u=${phone}`,
          plan: 'free',
          connectedApps: { google: false, zoom: false, teams: false, dropbox: false }
        });
      }, 1500);
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'phone') {
        // Send OTP
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
        // Verify OTP
        const { error } = await supabase.auth.verifyOtp({
          phone,
          token: otpCode,
          type: 'sms'
        });

        if (error) {
          setError(error.message);
        }
        // If successful, onAuthStateChange in App.tsx handles the session
      }
    } catch (err: any) {
      setError(err.message || 'Phone authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (mode === 'phone' || mode === 'otp_verify') {
      handlePhoneAuth(e);
    } else {
      handleEmailAuth(e);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-blue-50 rounded-full -mr-24 md:-mr-48 -mt-24 md:-mt-48 blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-purple-50 rounded-full -ml-24 md:-ml-48 -mb-24 md:-mb-48 blur-3xl opacity-50"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-6 md:mb-10">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 md:mb-6 shadow-xl shadow-blue-200">
            <i className="fas fa-microphone-lines text-xl md:text-2xl"></i>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">Welcome to Lumina</h1>
          <p className="text-sm md:text-base text-gray-500">Your meetings, intelligently captured.</p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[30px] md:rounded-[40px] border border-gray-100 shadow-2xl shadow-gray-200/50">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-start gap-2">
              <i className="fas fa-exclamation-circle mt-0.5 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Success/Info Message */}
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-start gap-2">
              <i className="fas fa-check-circle mt-0.5 shrink-0"></i>
              <span>{message}</span>
            </div>
          )}

          {mode !== 'otp_verify' && (
            <>
              <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-6 md:mb-8">
                <button
                  onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                  className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${mode === 'signup' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  Sign Up
                </button>
              </div>

              <div className="space-y-3 mb-6 md:mb-8">
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 md:gap-3 py-2.5 md:py-3 border border-gray-100 rounded-2xl font-bold text-xs md:text-sm text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4 md:w-5 md:h-5" alt="Google" />
                  Continue with Google
                </button>
                <button
                  disabled
                  className="w-full flex items-center justify-center gap-2 md:gap-3 py-2.5 md:py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs md:text-sm transition-all opacity-50 cursor-not-allowed relative"
                >
                  <i className="fas fa-phone-alt"></i>
                  Continue with Phone
                  <span className="absolute right-3 text-[8px] bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
                </button>
              </div>

              <div className="relative mb-6 md:mb-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
                <div className="relative flex justify-center text-[8px] md:text-[10px] uppercase"><span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or email</span></div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-gray-50 border-none rounded-xl md:rounded-2xl py-2.5 md:py-3 px-4 text-xs md:text-sm focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}

            {mode === 'otp_verify' ? (
              <div>
                <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Verification Code</label>
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full bg-gray-50 border-none rounded-xl md:rounded-2xl py-2.5 md:py-3 px-4 text-xs md:text-sm focus:ring-2 focus:ring-blue-500/20 text-center text-lg tracking-[0.5em]"
                />
                <button
                  type="button"
                  onClick={() => { setMode('login'); setOtpCode(''); setError(null); setMessage(null); }}
                  className="text-xs text-blue-600 font-bold mt-2 hover:underline"
                >
                  ← Back to login
                </button>
              </div>
            ) : mode === 'phone' ? (
              <div>
                <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-gray-50 border-none rounded-xl md:rounded-2xl py-2.5 md:py-3 px-4 text-xs md:text-sm focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  className="text-xs text-blue-600 font-bold mt-2 hover:underline"
                >
                  ← Back to email login
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-gray-50 border-none rounded-xl md:rounded-2xl py-2.5 md:py-3 px-4 text-xs md:text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-50 border-none rounded-xl md:rounded-2xl py-2.5 md:py-3 px-4 text-xs md:text-sm focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 md:py-4 bg-blue-600 text-white rounded-xl md:rounded-2xl font-bold text-xs md:text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            >
              {isLoading && <i className="fas fa-circle-notch fa-spin"></i>}
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'phone' ? 'Send Code' : 'Verify Code'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 md:mt-10 text-[10px] md:text-xs text-gray-400 leading-relaxed px-4 md:px-8">
          By continuing, you agree to Lumina's <span className="text-gray-600 font-bold hover:underline cursor-pointer">Terms</span> and <span className="text-gray-600 font-bold hover:underline cursor-pointer">Privacy</span>.
        </p>
      </div>
    </div>
  );
};

export default AuthView;
