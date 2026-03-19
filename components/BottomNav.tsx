
import React from 'react';
import { AppView } from '../types';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  return (
    <nav
      className="lg:hidden fixed bottom-4 left-4 right-4 glass rounded-2xl grid grid-cols-6 items-center h-16 px-2 z-40 shadow-lg"
      style={{ borderColor: 'var(--glass-border)', border: '1px solid var(--glass-border)' }}
    >
      <BottomNavItem
        icon="fa-house"
        label="Home"
        isActive={currentView === AppView.DASHBOARD}
        onClick={() => onNavigate(AppView.DASHBOARD)}
      />
      <BottomNavItem
        icon="fa-robot"
        label="AI Chat"
        isActive={currentView === AppView.AI_CHAT}
        onClick={() => onNavigate(AppView.AI_CHAT)}
      />
      <BottomNavItem
        icon="fa-microphone-lines"
        label="Memos"
        isActive={currentView === AppView.VOICE_MEMOS}
        onClick={() => onNavigate(AppView.VOICE_MEMOS)}
      />
      <BottomNavItem
        icon="fa-folder-open"
        label="Notes"
        isActive={currentView === AppView.NOTES}
        onClick={() => onNavigate(AppView.NOTES)}
      />
      <BottomNavItem
        icon="fa-wand-magic-sparkles"
        label="Templates"
        isActive={currentView === AppView.AI_TEMPLATES}
        onClick={() => onNavigate(AppView.AI_TEMPLATES)}
      />
      <BottomNavItem
        icon="fa-gear"
        label="Settings"
        isActive={currentView === AppView.SETTINGS}
        onClick={() => onNavigate(AppView.SETTINGS)}
      />
    </nav>
  );
};

interface BottomNavItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl transition-all duration-200 ${isActive ? 'text-brand-600' : 'active:scale-95'
      }`}
    style={!isActive ? { color: 'var(--text-tertiary)' } : {}}
  >
    <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 ${isActive ? 'bg-brand-50 text-brand-600 shadow-sm' : 'bg-transparent'
      }`}>
      <i className={`fas ${icon} text-sm`}></i>
    </div>
    <span className={`text-[9px] font-bold uppercase tracking-tight transition-all ${isActive ? 'opacity-100 text-brand-600' : 'opacity-60'
      }`}>
      {label}
    </span>
  </button>
);

export default BottomNav;
