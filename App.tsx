
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppView, Meeting, Note, UserProfile } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import RecordingSession from './components/RecordingSession';
import MeetingDetail from './components/MeetingDetail';
import AudioProcessor from './components/AudioProcessor';
import CalendarSync from './components/CalendarSync';
import NotesView from './components/NotesView';
import SharedView from './components/SharedView';
import ProfileView from './components/ProfileView';
import AuthView from './components/AuthView';
import BottomNav from './components/BottomNav';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AIChatView from './components/AIChatView';
import VoiceMemosView from './components/VoiceMemosView';
import MeetingPrepView from './components/MeetingPrepView';
import AITemplatesView from './components/AITemplatesView';
import TranslationView from './components/TranslationView';
import AdminPanel from './components/AdminPanel';
import { getSupabaseClient, isSupabaseConfigured } from './utils/supabaseClient';

const getInitialTheme = (): boolean => {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('lumina_theme');
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | { name: string, url: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingMeetingTitle, setPendingMeetingTitle] = useState<string | undefined>(undefined);
  const [translationMeeting, setTranslationMeeting] = useState<Meeting | null>(null);
  const [isDark, setIsDark] = useState<boolean>(getInitialTheme);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const normalizeUserProfile = useCallback((profile: UserProfile): UserProfile => {
    return {
      ...profile,
      isAdmin: Boolean(profile.isAdmin),
      connectedApps: profile.connectedApps || { google: false, zoom: false, teams: false, dropbox: false }
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemTheme = (event: MediaQueryListEvent) => {
      if (!localStorage.getItem('lumina_theme')) {
        setIsDark(event.matches);
      }
    };

    media.addEventListener('change', handleSystemTheme);
    return () => media.removeEventListener('change', handleSystemTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('lumina_theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  useEffect(() => {
    const savedMeetings = localStorage.getItem('lumina_meetings');
    const savedNotes = localStorage.getItem('lumina_notes');

    if (savedMeetings) setMeetings(JSON.parse(savedMeetings));
    if (savedNotes) setNotes(JSON.parse(savedNotes));
  }, []);

  // Supabase auth state listener
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Fallback: check localStorage for mock auth
      const savedAuth = localStorage.getItem('lumina_auth');
      const savedUser = localStorage.getItem('lumina_user');
      if (savedAuth === 'true' && savedUser) {
        const parsed = JSON.parse(savedUser);
        setIsAuthenticated(true);
        setUser(normalizeUserProfile(parsed));
      }
      return;
    }
    const supabase = getSupabaseClient();

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        hydrateUser(session.user);
      }
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSessionExpiredMessage(null);
        hydrateUser(session.user);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Session token was refreshed successfully - update stored profile
        hydrateUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
        setCurrentView(AppView.DASHBOARD);
        localStorage.removeItem('lumina_auth');
        localStorage.removeItem('lumina_user');
      }
    });

    // Periodically verify that the session is still valid
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && isAuthenticated) {
        setIsAuthenticated(false);
        setUser(null);
        setCurrentView(AppView.DASHBOARD);
        localStorage.removeItem('lumina_auth');
        localStorage.removeItem('lumina_user');
        setSessionExpiredMessage('Your session has expired. Please sign in again.');
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
    };
  }, []);

  // Helper to build UserProfile from Supabase user
  const hydrateUser = async (supabaseUser: any) => {
    const supabase = getSupabaseClient();
    let profile: UserProfile = {
      name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
      email: supabaseUser.email || '',
      phone: supabaseUser.phone || undefined,
      avatar: supabaseUser.user_metadata?.avatar_url || `https://i.pravatar.cc/150?u=${supabaseUser.email}`,
      plan: 'free',
      isAdmin: false,
      connectedApps: { google: false, zoom: false, teams: false, dropbox: false }
    };

    // Try to fetch profile from database
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('name, avatar, plan, connected_apps, is_admin')
        .eq('id', supabaseUser.id)
        .single();

      if (dbProfile) {
        profile = {
          ...profile,
          name: dbProfile.name || profile.name,
          avatar: dbProfile.avatar || profile.avatar,
          plan: dbProfile.plan || 'free',
          isAdmin: Boolean(dbProfile.is_admin),
          connectedApps: dbProfile.connected_apps || profile.connectedApps
        };
      }
    } catch (err) {
      console.warn('Could not fetch profile from database:', err);
    }

    setUser(normalizeUserProfile(profile));
    setIsAuthenticated(true);
    localStorage.setItem('lumina_user', JSON.stringify(profile));
    localStorage.setItem('lumina_auth', 'true');
  };

  useEffect(() => {
    if (meetings.length > 0) localStorage.setItem('lumina_meetings', JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    if (notes.length > 0) localStorage.setItem('lumina_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('lumina_user', JSON.stringify(user));
      localStorage.setItem('lumina_auth', 'true');
    } else {
      localStorage.removeItem('lumina_auth');
      localStorage.removeItem('lumina_user');
    }
  }, [user]);

  const totalMinutesUsed = useMemo(() => {
    const totalSeconds = meetings.reduce((acc, m) => acc + (m.duration || 0), 0);
    return Math.ceil(totalSeconds / 60);
  }, [meetings]);

  const handleStartRecording = () => {
    setPendingMeetingTitle(undefined);
    setCurrentView(AppView.RECORDING);
    setIsSidebarOpen(false);
  };

  const handleJoinAndRecord = (meetingTitle: string) => {
    setPendingMeetingTitle(meetingTitle);
    setCurrentView(AppView.RECORDING);
    setIsSidebarOpen(false);
  };

  const handleFileSelect = (file: File | { name: string, url: string }) => {
    setPendingFile(file);
    setCurrentView(AppView.PROCESSING);
    setIsSidebarOpen(false);
  };

  const handleFinishProcessing = (newMeeting: Meeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
    setSelectedMeetingId(newMeeting.id);
    setPendingFile(null);
    setCurrentView(AppView.MEETING_DETAIL);
  };

  const handleViewMeeting = (id: string) => {
    setSelectedMeetingId(id);
    setCurrentView(AppView.MEETING_DETAIL);
    setIsSidebarOpen(false);
  };

  const handleUpdateMeeting = (updatedMeeting: Meeting) => {
    setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
  };

  const handleDeleteMeeting = (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
    if (selectedMeetingId === id) setCurrentView(AppView.DASHBOARD);
  };

  const handleSaveNote = (note: Note) => {
    setNotes(prev => {
      const exists = prev.find(n => n.id === note.id);
      if (exists) return prev.map(n => n.id === note.id ? note : n);
      return [note, ...prev];
    });
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
  };

  const handleLogin = (userData: UserProfile) => {
    // For mock/fallback auth when Supabase is not configured
    setUser(normalizeUserProfile(userData));
    setIsAuthenticated(true);
    localStorage.setItem('lumina_user', JSON.stringify(userData));
    localStorage.setItem('lumina_auth', 'true');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    }
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView(AppView.DASHBOARD);
    localStorage.removeItem('lumina_auth');
    localStorage.removeItem('lumina_user');
  };

  const navigateTo = (view: AppView) => {
    if (view === AppView.ADMIN && !user?.isAdmin) {
      setCurrentView(AppView.DASHBOARD);
      return;
    }
    setCurrentView(view);
    setIsSidebarOpen(false);
  }

  const handleTranslateMeeting = (meeting: Meeting) => {
    setTranslationMeeting(meeting);
    navigateTo(AppView.TRANSLATION);
  };

  if (!isAuthenticated) {
    return (
      <>
        {sessionExpiredMessage && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2.5 px-4 text-sm font-semibold shadow-lg">
            <i className="fas fa-clock mr-2"></i>
            {sessionExpiredMessage}
            <button onClick={() => setSessionExpiredMessage(null)} className="ml-3 text-white/80 hover:text-white">
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        <AuthView onLogin={handleLogin} isDark={isDark} onToggleTheme={toggleTheme} />
      </>
    );
  }

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  // Hide mobile navigation in specific focus-heavy views
  const hideMobileNav = [AppView.RECORDING, AppView.PROCESSING, AppView.MEETING_DETAIL].includes(currentView);

  return (
    <div className="relative flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-20 -top-20 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 68%)' }}
        />
        <div
          className="absolute -right-20 bottom-10 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)' }}
        />
      </div>

      {/* Sidebar - Desktop Always Visible */}
      <Sidebar
        currentView={currentView}
        onNavigate={navigateTo}
        onStartRecording={handleStartRecording}
        user={user!}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: 'var(--overlay-bg)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="relative z-10 flex h-full flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        {!hideMobileNav && (
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b shrink-0 backdrop-blur-xl" style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                <i className="fas fa-bars text-sm"></i>
              </button>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 55%, #7c3aed 100%)' }}
                >
                  <i className="fas fa-microphone-lines"></i>
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-extrabold text-brand-700 dark:text-brand-200">Lumina</p>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Workspace</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
              </button>
              <button
                onClick={handleStartRecording}
                className="w-9 h-9 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"
              >
                <i className="fas fa-plus text-xs"></i>
              </button>
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth ${!hideMobileNav ? 'pb-20 lg:pb-0' : ''}`}>
          {currentView === AppView.DASHBOARD && (
            <Dashboard
              meetings={meetings}
              minutesUsed={totalMinutesUsed}
              onViewMeeting={handleViewMeeting}
              onDeleteMeeting={handleDeleteMeeting}
              onStartRecording={handleStartRecording}
              onFileSelect={handleFileSelect}
              onOpenCalendar={() => navigateTo(AppView.CALENDAR)}
            />
          )}

          {currentView === AppView.RECORDING && (
            <RecordingSession onFinish={handleFinishProcessing} onCancel={() => navigateTo(AppView.DASHBOARD)} meetingTitle={pendingMeetingTitle} />
          )}

          {currentView === AppView.PROCESSING && pendingFile && (
            <AudioProcessor
              fileOrUrl={pendingFile}
              onFinish={handleFinishProcessing}
              onCancel={() => {
                setPendingFile(null);
                navigateTo(AppView.DASHBOARD);
              }}
            />
          )}

          {currentView === AppView.CALENDAR && (
            <CalendarSync
              onBack={() => navigateTo(AppView.DASHBOARD)}
              onJoinAndRecord={handleJoinAndRecord}
            />
          )}

          {currentView === AppView.NOTES && (
            <NotesView
              notes={notes}
              meetings={meetings}
              onSaveNote={handleSaveNote}
              onDeleteNote={handleDeleteNote}
              onViewMeeting={handleViewMeeting}
            />
          )}

          {currentView === AppView.SHARED && (
            <SharedView onViewMeeting={handleViewMeeting} />
          )}

          {currentView === AppView.ANALYTICS && (
            <AnalyticsDashboard meetings={meetings} />
          )}

          {currentView === AppView.AI_CHAT && (
            <AIChatView meetings={meetings} onViewMeeting={handleViewMeeting} />
          )}

          {currentView === AppView.VOICE_MEMOS && (
            <VoiceMemosView meetings={meetings} onViewMeeting={handleViewMeeting} />
          )}

          {currentView === AppView.MEETING_PREP && (
            <MeetingPrepView meetings={meetings} onViewMeeting={handleViewMeeting} />
          )}

          {currentView === AppView.AI_TEMPLATES && (
            <AITemplatesView />
          )}

          {currentView === AppView.TRANSLATION && translationMeeting && (
            <TranslationView meeting={translationMeeting} onBack={() => {
              if (selectedMeeting && selectedMeeting.id === translationMeeting.id) {
                navigateTo(AppView.MEETING_DETAIL);
              } else {
                navigateTo(AppView.DASHBOARD);
              }
            }} />
          )}

          {currentView === AppView.ADMIN && (
            user?.isAdmin ? (
              <AdminPanel
                meetings={meetings}
                notes={notes}
                user={user!}
                onDeleteMeeting={handleDeleteMeeting}
                onDeleteNote={handleDeleteNote}
                onUpdateUser={handleUpdateUser}
              />
            ) : (
              <div className="p-8">
                <div
                  className="max-w-lg mx-auto rounded-3xl p-8 text-center"
                  style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
                >
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                    <i className="fas fa-lock"></i>
                  </div>
                  <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Admin access required</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                    This area is restricted to admin accounts. Please log in with an admin profile to continue.
                  </p>
                  <button
                    onClick={() => navigateTo(AppView.DASHBOARD)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            )
          )}

          {currentView === AppView.PROFILE && (
            <ProfileView user={user!} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />
          )}

          {currentView === AppView.MEETING_DETAIL && selectedMeeting && (
            <MeetingDetail
              meeting={selectedMeeting}
              onBack={() => navigateTo(AppView.DASHBOARD)}
              onUpdateMeeting={handleUpdateMeeting}
              onTranslate={handleTranslateMeeting}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        {!hideMobileNav && (
          <BottomNav
            currentView={currentView}
            onNavigate={navigateTo}
          />
        )}
      </main>
    </div>
  );
};

export default App;
