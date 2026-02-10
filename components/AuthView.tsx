
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface AuthViewProps {
  onLogin: (user: UserProfile) => void;
}

type AuthMode = 'login' | 'signup' | 'phone';

const AuthView: React.FC<AuthViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Simulate OAuth
    setTimeout(() => {
      onLogin({
        name: 'Alex Rivera',
        email: 'alex.rivera@gmail.com',
        avatar: 'https://i.pravatar.cc/150?u=alex',
        plan: 'free',
        connectedApps: { google: true, zoom: false, teams: false, dropbox: false }
      });
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin({
        name: name || 'New User',
        email: email || `${phone}@lumina.auth`,
        phone: phone || undefined,
        avatar: `https://i.pravatar.cc/150?u=${name || 'user'}`,
        plan: 'free',
        connectedApps: { google: false, zoom: false, teams: false, dropbox: false }
      });
    }, 1500);
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
          <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-6 md:mb-8">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${mode === 'login' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Log In
            </button>
            <button 
              onClick={() => setMode('signup')}
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
              onClick={() => setMode('phone')}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 md:gap-3 py-2.5 md:py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs md:text-sm hover:bg-black transition-all disabled:opacity-50"
            >
              <i className="fas fa-phone-alt"></i>
              Continue with Phone
            </button>
          </div>

          <div className="relative mb-6 md:mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-[8px] md:text-[10px] uppercase"><span className="bg-white px-4 text-gray-400 font-bold tracking-widest">Or email</span></div>
          </div>

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
            
            {mode === 'phone' ? (
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
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Code'}
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
