
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';

interface ProfileViewProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onLogout: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ user, onUpdateUser, onLogout }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });

  // Sync edit states when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditName(user.name);
      setEditEmail(user.email);
      setEditPhone(user.phone || '');
    }
  }, [isEditing, user]);

  const triggerToast = (message: string) => {
    setShowToast({ show: true, message });
    setTimeout(() => setShowToast({ show: false, message: '' }), 3000);
  };

  const toggleApp = (app: keyof UserProfile['connectedApps']) => {
    onUpdateUser({
      ...user,
      connectedApps: {
        ...user.connectedApps,
        [app]: !user.connectedApps[app]
      }
    });
    triggerToast(`${app.charAt(0).toUpperCase() + app.slice(1)} ${!user.connectedApps[app] ? 'connected' : 'disconnected'}`);
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdateUser({
        ...user,
        name: editName,
        email: editEmail,
        phone: editPhone
      });
      setIsSaving(false);
      setIsEditing(false);
      triggerToast('Profile updated successfully!');
    }, 800);
  };

  const handleUpgrade = () => {
    setIsUpgrading(true);
    setTimeout(() => {
      onUpdateUser({
        ...user,
        plan: 'pro'
      });
      setIsUpgrading(false);
      triggerToast('Successfully upgraded to Lumina Pro!');
    }, 1500);
  };

  const handleInvite = () => {
    const referralLink = `https://lumina.ai/refer/${user.name.toLowerCase().replace(/\s+/g, '-')}`;
    navigator.clipboard.writeText(referralLink);
    triggerToast('Referral link copied to clipboard!');
  };

  const handleViewPricing = () => {
    alert("Pricing plans:\n\nFree: 60 mins total\nPro: 6000 mins/mo + AI Summaries ($10/mo)\nTeam: Unlimited + Shared Workspaces ($20/mo)");
  };

  return (
    <div className="h-full bg-white flex flex-col relative">
      {/* Toast Notification */}
      {showToast.show && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 w-[90%] md:w-auto">
          <i className="fas fa-circle-check text-green-400"></i>
          <span className="text-sm font-bold">{showToast.message}</span>
        </div>
      )}

      <header className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white z-10 sticky top-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="hidden md:block text-sm text-gray-500">Manage your profile and connected meeting platforms.</p>
        </div>
        <div className="flex gap-2 md:gap-4">
          <button 
            onClick={onLogout}
            className="px-3 py-1.5 md:px-4 md:py-2 border border-red-100 text-red-500 rounded-xl font-bold text-xs md:text-sm hover:bg-red-50 transition-colors"
          >
            Logout
          </button>
          {user.plan === 'free' && (
            <button 
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="px-4 py-1.5 md:px-6 md:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-50 text-xs md:text-sm"
            >
              {isUpgrading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-crown"></i>}
              Upgrade
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 lg:pb-8">
        <section className="mb-10 md:mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest">Profile Information</h2>
            {isEditing ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditing(false)} 
                  disabled={isSaving}
                  className="text-xs font-bold text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving && <i className="fas fa-circle-notch fa-spin"></i>}
                  Save Changes
                </button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-blue-600 hover:text-blue-700 underline">Edit Profile</button>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
            <div className="relative group shrink-0">
              <img src={user.avatar} className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-md" alt="Profile" />
              <button className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fas fa-camera text-white"></i>
              </button>
            </div>
            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="col-span-1">
                  <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase block mb-1">Full Name</label>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  ) : (
                    <p className="font-bold text-gray-900 text-base md:text-lg">{user.name}</p>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase block mb-1">Plan Status</label>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] md:text-xs font-bold uppercase px-3 py-1 rounded-full ${user.plan === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'}`}>
                      {user.plan} Account
                    </span>
                    {user.plan === 'pro' && <i className="fas fa-crown text-yellow-500 text-xs"></i>}
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase block mb-1">Email Address</label>
                  {isEditing ? (
                    <input 
                      type="email" 
                      value={editEmail} 
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-600">{user.email}</p>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase block mb-1">Phone Number</label>
                  {isEditing ? (
                    <input 
                      type="tel" 
                      value={editPhone} 
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-600">{user.phone || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {user.plan === 'free' && (
          <section className="mb-12 bg-[#F3F6FF] p-6 md:p-8 rounded-[32px] border border-[#E0E7FF] relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start gap-5 relative z-10">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center text-[#2D60FF] shadow-sm shrink-0 border border-white">
                <i className="fas fa-bolt text-xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-extrabold text-[#1F2B5B] mb-2">Running out of minutes?</h3>
                <p className="text-xs md:text-sm text-[#475569] mb-8 leading-relaxed max-w-lg">
                  Free users are limited to 60 minutes of transcription total. 
                  Upgrade to Pro for 6000 minutes, real-time sync with Google Calendar, and advanced AI summaries.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={handleUpgrade} 
                    disabled={isUpgrading}
                    className="px-6 py-2.5 md:px-8 md:py-3 bg-[#2D60FF] text-white rounded-2xl font-bold text-sm hover:bg-[#1E4DFF] transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2"
                  >
                    {isUpgrading && <i className="fas fa-circle-notch fa-spin"></i>}
                    Upgrade Now
                  </button>
                  <button 
                    onClick={handleViewPricing}
                    className="px-6 py-2.5 md:px-8 md:py-3 bg-white text-[#1F2B5B] border border-[#E2E8F0] rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
                  >
                    View Pricing
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] md:text-sm font-bold text-gray-400 uppercase tracking-widest">Connected Apps</h2>
            <span className="text-[10px] bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded-full uppercase">Real-time Sync</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AppCard 
              name="Google Drive & Meet" 
              icon="fab fa-google" 
              color="text-blue-500"
              isConnected={user.connectedApps.google}
              onToggle={() => toggleApp('google')}
            />
            <AppCard 
              name="Zoom Video" 
              icon="fas fa-video" 
              color="text-blue-600"
              isConnected={user.connectedApps.zoom}
              onToggle={() => toggleApp('zoom')}
            />
            <AppCard 
              name="Microsoft Teams" 
              icon="fab fa-microsoft" 
              color="text-purple-600"
              isConnected={user.connectedApps.teams}
              onToggle={() => toggleApp('teams')}
            />
            <AppCard 
              name="Dropbox Import" 
              icon="fab fa-dropbox" 
              color="text-blue-400"
              isConnected={user.connectedApps.dropbox}
              onToggle={() => toggleApp('dropbox')}
            />
          </div>
        </section>

        <section className="mt-12 p-6 md:p-8 bg-blue-600 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="text-center md:text-left">
             <h3 className="text-lg md:text-xl font-bold mb-1">Refer a Friend</h3>
             <p className="text-blue-100 text-sm">Get 3 months of Lumina Pro for every friend who joins.</p>
           </div>
           <button 
             onClick={handleInvite}
             className="w-full md:w-auto px-8 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg shadow-blue-900/20"
           >
             Invite Now
           </button>
        </section>
      </div>
    </div>
  );
};

const AppCard: React.FC<{name: string, icon: string, color: string, isConnected: boolean, onToggle: () => void}> = ({name, icon, color, isConnected, onToggle}) => (
  <div className="bg-white border border-gray-100 p-4 md:p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:border-blue-100 transition-colors">
    <div className={`w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl flex items-center justify-center text-lg md:text-xl ${color}`}>
      <i className={icon}></i>
    </div>
    <div className="flex-1">
      <h4 className="font-bold text-gray-900 text-xs md:text-sm">{name}</h4>
      <p className="text-[9px] md:text-[10px] text-gray-500 font-medium">{isConnected ? 'Syncing active' : 'Not connected'}</p>
    </div>
    <button 
      onClick={onToggle}
      className={`px-3 py-1.5 md:px-4 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-tight transition-colors ${
        isConnected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {isConnected ? 'Off' : 'On'}
    </button>
  </div>
);

export default ProfileView;
