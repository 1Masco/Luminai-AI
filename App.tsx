
import React, { useState, useEffect, useMemo } from 'react';
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
import { getSupabaseClient, isSupabaseConfigured } from './utils/supabaseClient';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | { name: string, url: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        setIsAuthenticated(true);
        setUser(JSON.parse(savedUser));
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
        hydrateUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUser(null);
        setCurrentView(AppView.DASHBOARD);
        localStorage.removeItem('lumina_auth');
        localStorage.removeItem('lumina_user');
      }
    });

    return () => subscription.unsubscribe();
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
      connectedApps: { google: false, zoom: false, teams: false, dropbox: false }
    };

    // Try to fetch profile from database
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('name, avatar, plan, connected_apps')
        .eq('id', supabaseUser.id)
        .single();

      if (dbProfile) {
        profile = {
          ...profile,
          name: dbProfile.name || profile.name,
          avatar: dbProfile.avatar || profile.avatar,
          plan: dbProfile.plan || 'free',
          connectedApps: dbProfile.connected_apps || profile.connectedApps
        };
      }
    } catch (err) {
      console.warn('Could not fetch profile from database:', err);
    }

    setUser(profile);
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
    setUser(userData);
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
    setCurrentView(view);
    setIsSidebarOpen(false);
  }

  if (!isAuthenticated) {
    return <AuthView onLogin={handleLogin} />;
  }

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  // Hide mobile navigation in specific focus-heavy views
  const hideMobileNav = [AppView.RECORDING, AppView.PROCESSING, AppView.MEETING_DETAIL].includes(currentView);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">


      {/* Sidebar - Desktop Always Visible */}
      <Sidebar
        currentView={currentView}
        onNavigate={navigateTo}
        onStartRecording={handleStartRecording}
        user={user!}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-hidden relative flex flex-col h-full">
        {/* Mobile Header (Simplified) */}
        {!hideMobileNav && (
          <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs">
                <i className="fas fa-microphone-lines"></i>
              </div>
              <span className="font-bold text-gray-800">Lumina</span>
            </div>
            <button
              onClick={handleStartRecording}
              className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"
            >
              <i className="fas fa-plus text-xs"></i>
            </button>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto overflow-x-hidden ${!hideMobileNav ? 'pb-20 lg:pb-0' : ''}`}>
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
            <RecordingSession onFinish={handleFinishProcessing} onCancel={() => navigateTo(AppView.DASHBOARD)} />
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

          {currentView === AppView.PROFILE && (
            <ProfileView user={user!} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />
          )}

          {currentView === AppView.MEETING_DETAIL && selectedMeeting && (
            <MeetingDetail
              meeting={selectedMeeting}
              onBack={() => navigateTo(AppView.DASHBOARD)}
              onUpdateMeeting={handleUpdateMeeting}
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
