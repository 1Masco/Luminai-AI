
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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | { name: string, url: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Minutes constants
  const PLAN_LIMITS = {
    free: 60,   // 60 minutes
    pro: 6000   // 6000 minutes
  };

  useEffect(() => {
    const savedAuth = localStorage.getItem('lumina_auth');
    const savedMeetings = localStorage.getItem('lumina_meetings');
    const savedNotes = localStorage.getItem('lumina_notes');
    const savedUser = localStorage.getItem('lumina_user');
    
    if (savedAuth === 'true' && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
    
    if (savedMeetings) setMeetings(JSON.parse(savedMeetings));
    if (savedNotes) setNotes(JSON.parse(savedNotes));
  }, []);

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

  const isLimitReached = user?.plan === 'free' && totalMinutesUsed >= PLAN_LIMITS.free;

  const handleStartRecording = () => {
    if (isLimitReached) {
      alert("Minutes limit reached! Please upgrade your plan in settings.");
      setCurrentView(AppView.PROFILE);
      return;
    }
    setCurrentView(AppView.RECORDING);
    setIsSidebarOpen(false);
  };

  const handleFileSelect = (file: File | { name: string, url: string }) => {
    if (isLimitReached) {
      alert("Minutes limit reached! Please upgrade your plan in settings.");
      setCurrentView(AppView.PROFILE);
      return;
    }
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
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCurrentView(AppView.DASHBOARD);
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
              minutesLimit={user!.plan === 'pro' ? PLAN_LIMITS.pro : PLAN_LIMITS.free}
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
            <CalendarSync onBack={() => navigateTo(AppView.DASHBOARD)} />
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
