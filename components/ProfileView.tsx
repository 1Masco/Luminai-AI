
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../utils/supabaseClient';

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
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showUpgradeConfirm, setShowUpgradeConfirm] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [referralEmail, setReferralEmail] = useState('');
  const [referralCopied, setReferralCopied] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<'pro' | 'team'>('pro');

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

  const handleUpgrade = (targetPlan: 'pro' | 'team' = 'pro') => {
    setUpgradePlan(targetPlan);
    setShowUpgradeConfirm(true);
  };

  const confirmUpgrade = async () => {
    setIsUpgrading(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        // Fallback for mock environment
        console.warn('No authenticated user found for upgrade flow');
        // Just mock success for dev/demo if not using real auth
        setTimeout(() => {
          onUpdateUser({ ...user, plan: upgradePlan });
          setIsUpgrading(false);
          setShowUpgradeConfirm(false);
          triggerToast(`🎉 Successfully upgraded to Lumina ${upgradePlan === 'team' ? 'Team' : 'Pro'}!`);
        }, 1500);
        return;
      }

      // Call backend to create Stripe Checkout Session
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: upgradePlan,
          userId: authUser.id,
          userEmail: authUser.email
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start checkout');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      triggerToast('Failed to start upgrade. Please try again.');
      setIsUpgrading(false);
      setShowUpgradeConfirm(false);
    }
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

  const handleViewPricing = () => {
    setShowPricingModal(true);
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

      {/* ===== PRICING MODAL ===== */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowPricingModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900">Choose Your Plan</h2>
                <p className="text-sm text-gray-500">Simple, transparent pricing for everyone.</p>
              </div>
              <button onClick={() => setShowPricingModal(false)} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <i className="fas fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Free Plan */}
              <div className={`p-6 rounded-2xl border-2 ${user.plan === 'free' ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100'}`}>
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Free</h3>
                  <div className="mt-2"><span className="text-3xl font-extrabold text-gray-900">$0</span><span className="text-sm text-gray-500">/forever</span></div>
                </div>
                <ul className="space-y-3 mb-6 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> 60 minutes total</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Basic transcription</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> AI meeting chat</li>
                  <li className="flex items-center gap-2 text-gray-400"><i className="fas fa-xmark text-xs"></i> Calendar sync</li>
                  <li className="flex items-center gap-2 text-gray-400"><i className="fas fa-xmark text-xs"></i> Team sharing</li>
                </ul>
                {user.plan === 'free' ? (
                  <div className="w-full py-2.5 text-center text-sm font-bold text-blue-600 bg-blue-50 rounded-xl">Current Plan</div>
                ) : (
                  <div className="w-full py-2.5 text-center text-sm font-bold text-gray-400 bg-gray-50 rounded-xl">Included</div>
                )}
              </div>

              {/* Pro Plan */}
              <div className={`p-6 rounded-2xl border-2 relative ${user.plan === 'pro' ? 'border-purple-500 bg-purple-50/30' : 'border-blue-500 bg-gradient-to-b from-blue-50/50 to-white'}`}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-1 rounded-full">Most Popular</div>
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Pro</h3>
                  <div className="mt-2"><span className="text-3xl font-extrabold text-gray-900">$10</span><span className="text-sm text-gray-500">/month</span></div>
                </div>
                <ul className="space-y-3 mb-6 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> 6,000 minutes/month</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Advanced AI summaries</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Calendar sync</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Cloud import</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Priority support</li>
                </ul>
                {user.plan === 'pro' ? (
                  <div className="w-full py-2.5 text-center text-sm font-bold text-purple-600 bg-purple-50 rounded-xl">Current Plan</div>
                ) : (
                  <button onClick={() => { setShowPricingModal(false); handleUpgrade(); }} className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
                    Upgrade to Pro
                  </button>
                )}
              </div>

              {/* Team Plan */}
              <div className={`p-6 rounded-2xl border-2 ${user.plan === 'team' ? 'border-green-500 bg-green-50/30' : 'border-gray-100'}`}>
                <div className="mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Team</h3>
                  <div className="mt-2"><span className="text-3xl font-extrabold text-gray-900">$20</span><span className="text-sm text-gray-500">/user/mo</span></div>
                </div>
                <ul className="space-y-3 mb-6 text-sm text-gray-600">
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Unlimited minutes</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Everything in Pro</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Shared workspaces</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Team analytics</li>
                  <li className="flex items-center gap-2"><i className="fas fa-check text-green-500 text-xs"></i> Admin dashboard</li>
                </ul>
                {user.plan === 'team' ? (
                  <div className="w-full py-2.5 text-center text-sm font-bold text-green-600 bg-green-50 rounded-xl">Current Plan</div>
                ) : (
                  <button onClick={() => { setShowPricingModal(false); handleUpgrade('team'); }} className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors">
                    Upgrade to Team
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== UPGRADE CONFIRMATION MODAL ===== */}
      {showUpgradeConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowUpgradeConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg ${upgradePlan === 'team' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200' : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-200'}`}>
              <i className={`fas ${upgradePlan === 'team' ? 'fa-users' : 'fa-crown'} text-white text-2xl`}></i>
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">
              Upgrade to {upgradePlan === 'team' ? 'Team' : 'Pro'}
            </h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              {upgradePlan === 'team' ? (
                <>Unlimited minutes, shared workspaces, team analytics, and admin dashboard for <strong className="text-gray-900">$20/user/month</strong>.</>
              ) : (
                <>Get 6,000 minutes/month, AI summaries, calendar sync, and priority support for <strong className="text-gray-900">$10/month</strong>.</>
              )}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
              {upgradePlan === 'team' ? (
                <>
                  <div className="flex items-center gap-2 text-sm"><i className="fas fa-check-circle text-green-500"></i><span className="text-gray-700">Unlimited transcription minutes</span></div>
                  <div className="flex items-center gap-2 text-sm"><i className="fas fa-check-circle text-green-500"></i><span className="text-gray-700">Everything in Pro included</span></div>
                  <div className="flex items-center gap-2 text-sm"><i className="fas fa-check-circle text-green-500"></i><span className="text-gray-700">Shared workspaces & team analytics</span></div>
                  <div className="flex items-center gap-2 text-sm"><i className="fas fa-check-circle text-green-500"></i><span className="text-gray-700">Admin dashboard</span></div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm"><i className="fas fa-check-circle text-green-500"></i><span className="text-gray-700">100x more transcription minutes</span></div>
                  <div className="flex items-center gap-2 text-sm"><i className="fas fa-check-circle text-green-500"></i><span className="text-gray-700">Advanced AI-powered summaries</span></div>
                  <div className="flex items-center gap-2 text-sm"><i className="fas fa-check-circle text-green-500"></i><span className="text-gray-700">Google Calendar integration</span></div>
                  <div className="flex items-center gap-2 text-sm"><i className="fas fa-check-circle text-green-500"></i><span className="text-gray-700">Cloud file import</span></div>
                </>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowUpgradeConfirm(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
                Maybe Later
              </button>
              <button onClick={confirmUpgrade} disabled={isUpgrading} className={`flex-1 py-2.5 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${upgradePlan === 'team' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-blue-200'}`}>
                {isUpgrading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className={`fas ${upgradePlan === 'team' ? 'fa-users' : 'fa-crown'}`}></i>}
                Confirm Upgrade
              </button>
            </div>
          </div>
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
              onClick={() => handleUpgrade('pro')}
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
                    onClick={() => handleUpgrade('pro')}
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

const AppCard: React.FC<{ name: string, icon: string, color: string, isConnected: boolean, onToggle: () => void }> = ({ name, icon, color, isConnected, onToggle }) => (
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
      className={`px-3 py-1.5 md:px-4 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-tight transition-colors ${isConnected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
    >
      {isConnected ? 'Off' : 'On'}
    </button>
  </div>
);

export default ProfileView;
