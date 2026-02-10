
import React from 'react';
import { AppView } from '../types';

interface BottomNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-around items-center h-20 px-4 z-40 pb-safe">
      <BottomNavItem 
        icon="fa-house" 
        label="Home" 
        isActive={currentView === AppView.DASHBOARD} 
        onClick={() => onNavigate(AppView.DASHBOARD)} 
      />
      <BottomNavItem 
        icon="fa-calendar-days" 
        label="Calendar" 
        isActive={currentView === AppView.CALENDAR} 
        onClick={() => onNavigate(AppView.CALENDAR)} 
      />
      <BottomNavItem 
        icon="fa-folder-open" 
        label="Notes" 
        isActive={currentView === AppView.NOTES} 
        onClick={() => onNavigate(AppView.NOTES)} 
      />
      <BottomNavItem 
        icon="fa-share-nodes" 
        label="Shared" 
        isActive={currentView === AppView.SHARED} 
        onClick={() => onNavigate(AppView.SHARED)} 
      />
      <BottomNavItem 
        icon="fa-user" 
        label="Profile" 
        isActive={currentView === AppView.PROFILE} 
        onClick={() => onNavigate(AppView.PROFILE)} 
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
    className={`flex flex-col items-center gap-1 min-w-[64px] transition-all ${
      isActive ? 'text-blue-600 scale-110' : 'text-gray-400'
    }`}
  >
    <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${
      isActive ? 'bg-blue-50' : 'bg-transparent'
    }`}>
      <i className={`fas ${icon} text-sm`}></i>
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-tight transition-opacity ${
      isActive ? 'opacity-100' : 'opacity-70'
    }`}>
      {label}
    </span>
  </button>
);

export default BottomNav;
