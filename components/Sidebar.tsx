
import React from 'react';
import { AppView, UserProfile } from '../types';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onStartRecording: () => void;
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, onStartRecording, user, isOpen, onClose }) => {
  return (
    <aside className={`
      fixed lg:relative lg:flex lg:translate-x-0
      w-[272px] bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex-col h-full z-30
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-6 h-full flex flex-col">
        {/* Logo */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate(AppView.DASHBOARD)}>
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-shadow">
              <i className="fas fa-microphone-lines text-sm"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-gray-900">Lumina</span>
              <span className="text-[9px] font-bold text-brand-500 uppercase tracking-widest -mt-0.5">AI Meeting</span>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {/* Record Button */}
        <button
          onClick={onStartRecording}
          className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-semibold py-3.5 px-5 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] mb-10 group"
        >
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <i className="fas fa-plus text-xs"></i>
          </div>
          <span>Record Meeting</span>
        </button>

        {/* Navigation */}
        <nav className="space-y-1 flex-1">
          <NavItem
            icon="fa-house"
            label="Home"
            isActive={currentView === AppView.DASHBOARD}
            onClick={() => onNavigate(AppView.DASHBOARD)}
          />
          <NavItem
            icon="fa-chart-line"
            label="Analytics"
            isActive={currentView === AppView.ANALYTICS}
            onClick={() => onNavigate(AppView.ANALYTICS)}
          />
          <NavItem
            icon="fa-robot"
            label="AI Chat"
            isActive={currentView === AppView.AI_CHAT}
            onClick={() => onNavigate(AppView.AI_CHAT)}
          />
          <NavItem
            icon="fa-calendar-days"
            label="Calendar"
            isActive={currentView === AppView.CALENDAR}
            onClick={() => onNavigate(AppView.CALENDAR)}
          />
          <NavItem
            icon="fa-microphone-lines"
            label="Voice Memos"
            isActive={currentView === AppView.VOICE_MEMOS}
            onClick={() => onNavigate(AppView.VOICE_MEMOS)}
          />
          <NavItem
            icon="fa-clipboard-list"
            label="Meeting Prep"
            isActive={currentView === AppView.MEETING_PREP}
            onClick={() => onNavigate(AppView.MEETING_PREP)}
          />
          <NavItem
            icon="fa-wand-magic-sparkles"
            label="AI Templates"
            isActive={currentView === AppView.AI_TEMPLATES}
            onClick={() => onNavigate(AppView.AI_TEMPLATES)}
          />
          <NavItem
            icon="fa-folder-open"
            label="My Notes"
            isActive={currentView === AppView.NOTES}
            onClick={() => onNavigate(AppView.NOTES)}
          />
          <NavItem
            icon="fa-share-nodes"
            label="Shared with me"
            isActive={currentView === AppView.SHARED}
            onClick={() => onNavigate(AppView.SHARED)}
          />
        </nav>

        {/* User Profile */}
        <div className="pt-5 border-t border-gray-100/80 mt-auto">
          <button
            onClick={() => onNavigate(AppView.PROFILE)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 ${currentView === AppView.PROFILE
              ? 'bg-brand-50 shadow-sm'
              : 'hover:bg-gray-50'
              }`}
          >
            <div className="relative">
              <img
                src={user.avatar}
                className="w-10 h-10 rounded-xl border-2 border-white shadow-sm object-cover"
                alt="Avatar"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const fallback = img.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="avatar-fallback w-10 h-10 rounded-xl border-2 border-white shadow-sm bg-gradient-to-br from-brand-500 to-purple-600 items-center justify-center text-white text-sm font-bold" style={{ display: 'none' }}>
                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
            </div>
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center">
              <i className="fas fa-chevron-right text-[10px] text-gray-300"></i>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 relative group ${isActive
      ? 'bg-brand-50/80 text-brand-700'
      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }`}
  >
    {isActive && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-500 rounded-r-full"></div>
    )}
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isActive ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25' : 'bg-transparent text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-500'
      }`}>
      <i className={`fas ${icon} text-xs`}></i>
    </div>
    {label}
  </button>
);

export default Sidebar;
