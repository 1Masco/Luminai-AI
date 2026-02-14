
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
      w-64 bg-white border-r border-gray-200 flex-col h-full z-30
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate(AppView.DASHBOARD)}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <i className="fas fa-microphone-lines"></i>
            </div>
            <span className="text-xl font-bold text-gray-800">Lumina</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-2">
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <button
          onClick={onStartRecording}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-200 mb-8"
        >
          <i className="fas fa-plus"></i>
          Record Meeting
        </button>

        <nav className="space-y-1 flex-1">
          <NavItem
            icon="fa-house"
            label="Home"
            isActive={currentView === AppView.DASHBOARD}
            onClick={() => onNavigate(AppView.DASHBOARD)}
          />
          <NavItem
            icon="fa-calendar-days"
            label="Calendar"
            isActive={currentView === AppView.CALENDAR}
            onClick={() => onNavigate(AppView.CALENDAR)}
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

        <div className="pt-4 border-t border-gray-100 mt-auto">
          <button
            onClick={() => onNavigate(AppView.PROFILE)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${currentView === AppView.PROFILE ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
          >
            <img
              src={user.avatar}
              className="w-10 h-10 rounded-full border border-gray-200"
              alt="Avatar"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = 'none';
                const fallback = img.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="avatar-fallback w-10 h-10 rounded-full border border-gray-200 bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white text-sm font-bold" style={{ display: 'none' }}>
              {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <i className="fas fa-cog text-gray-400 text-xs"></i>
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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }`}
  >
    <i className={`fas ${icon} w-5`}></i>
    {label}
  </button>
);

export default Sidebar;
