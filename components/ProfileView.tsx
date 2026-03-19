
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import ContrastSwitch from './common/ContrastSwitch';

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
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState<{ show: boolean, message: string }>({ show: false, message: '' });
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralEmail, setReferralEmail] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);

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

  const handleInvite = () => {
    setShowReferralModal(true);
    setReferralEmail('');
    setReferralCopied(false);
  };

  const handleCopyReferralLink = () => {
    const referralLink = `https://lumina.ai/refer/${user.name.toLowerCase().replace(/\s+/g, '-')}`;
    navigator.clipboard.writeText(referralLink);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const handleSendReferralEmail = () => {
    if (!referralEmail.trim()) return;
    const referralLink = `https://lumina.ai/refer/${user.name.toLowerCase().replace(/\s+/g, '-')}`;
    const subject = encodeURIComponent(`${user.name} invited you to Lumina`);
    const body = encodeURIComponent(`Hey!\n\n${user.name} wants you to try Lumina — an AI-powered meeting transcription tool.\n\nJoin here: ${referralLink}\n\nYou'll both get 3 months of Lumina Pro free!`);
    window.open(`mailto:${referralEmail}?subject=${subject}&body=${body}`, '_blank');
    setReferralEmail('');
    triggerToast('Email client opened with referral invite!');
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



      {/* ===== REFERRAL MODAL ===== */}
      {showReferralModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowReferralModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <i className="fas fa-gift text-blue-500"></i>
                Refer a Friend
              </h3>
              <button onClick={() => setShowReferralModal(false)} className="text-gray-400 hover:text-gray-600">
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium">
                <i className="fas fa-star text-yellow-500 mr-1"></i>
                You and your friend both get <strong>3 months of Lumina Pro free</strong> when they sign up!
              </p>
            </div>

            {/* Copy Link */}
            <div className="mb-5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Your Referral Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://lumina.ai/refer/${user.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm text-gray-600 truncate"
                />
                <button
                  onClick={handleCopyReferralLink}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${referralCopied
                    ? 'bg-green-50 text-green-600 border border-green-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  <i className={`fas ${referralCopied ? 'fa-check' : 'fa-copy'}`}></i>
                  {referralCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-white px-3 text-gray-400 font-bold tracking-widest">Or invite by email</span></div>
            </div>

            {/* Email Invite */}
            <div className="flex gap-2">
              <input
                type="email"
                value={referralEmail}
                onChange={(e) => setReferralEmail(e.target.value)}
                placeholder="friend@email.com"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={handleSendReferralEmail}
                disabled={!referralEmail.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <i className="fas fa-paper-plane"></i>
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="p-6 md:p-8 flex justify-between items-center z-10 sticky top-0" style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--card-bg)' }}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Account Settings</h1>
          <p className="hidden md:block text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your profile and connected meeting platforms.</p>
        </div>
        <div className="flex gap-2 md:gap-4">
          <button
            onClick={onLogout}
            className="px-3 py-1.5 md:px-4 md:py-2 border border-red-100 text-red-500 rounded-xl font-bold text-xs md:text-sm hover:bg-red-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 lg:pb-8">
        <section className="mb-10 md:mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] md:text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Profile Information</h2>
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

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-6 rounded-3xl" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)' }}>
            <div className="relative group shrink-0">
              <img
                src={user.avatar}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-md"
                alt="Profile"
                onError={(e) => {
                  const img = e.currentTarget;
                  img.style.display = 'none';
                  const fallback = img.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="avatar-fallback w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-blue-500 to-purple-600 items-center justify-center text-white text-2xl font-bold" style={{ display: 'none' }}>
                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <button className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fas fa-camera text-white"></i>
              </button>
            </div>
            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="col-span-1">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--text-tertiary)' }}>Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)' }}
                    />
                  ) : (
                    <p className="font-bold text-base md:text-lg" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                  )}
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--text-tertiary)' }}>Account Type</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] md:text-xs font-bold uppercase px-3 py-1 rounded-full bg-green-100 text-green-700">
                      Free Account
                    </span>
                  </div>
                </div>
                <div className="col-span-1">
                  <label className="text-[9px] md:text-[10px] font-bold uppercase block mb-1" style={{ color: 'var(--text-tertiary)' }}>Email Address</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)' }}
                    />
                  ) : (
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
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



        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] md:text-sm font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>Connected Apps</h2>
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
      </div >
    </div >
  );
};

const AppCard: React.FC<{ name: string, icon: string, color: string, isConnected: boolean, onToggle: () => void }> = ({ name, icon, color, isConnected, onToggle }) => (
  <div className="p-4 md:p-5 rounded-2xl shadow-sm flex items-center gap-4 transition-colors" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-lg md:text-xl ${color}`} style={{ backgroundColor: 'var(--bg-tertiary)' }}>
      <i className={icon}></i>
    </div>
    <div className="flex-1">
      <h4 className="font-bold text-xs md:text-sm" style={{ color: 'var(--text-primary)' }}>{name}</h4>
      <p className="text-[9px] md:text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>{isConnected ? 'Syncing active' : 'Not connected'}</p>
    </div>
    <div className="flex flex-col items-end gap-1.5">
      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tight" style={{ color: isConnected ? '#16a34a' : 'var(--text-tertiary)' }}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
      <ContrastSwitch checked={isConnected} onChange={() => onToggle()} size="sm" />
    </div>
  </div>
);

export default ProfileView;
