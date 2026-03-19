
import React, { useState, useCallback } from 'react';
import { UserProfile } from '../types';
import { useSettings, AppSettings } from '../contexts/SettingsContext';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

type SettingsTab = 'general' | 'notifications' | 'recording' | 'privacy' | 'shortcuts';

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'fa-sliders' },
  { id: 'notifications', label: 'Notifications', icon: 'fa-bell' },
  { id: 'recording', label: 'Recording', icon: 'fa-microphone' },
  { id: 'privacy', label: 'Privacy & Data', icon: 'fa-shield-halved' },
  { id: 'shortcuts', label: 'Shortcuts', icon: 'fa-keyboard' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
];

const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];

const SHORTCUTS: { action: string; keys: string[] }[] = [
  { action: 'Start / Stop Recording', keys: ['Ctrl', 'Shift', 'R'] },
  { action: 'New Note', keys: ['Ctrl', 'N'] },
  { action: 'Quick Search', keys: ['Ctrl', 'K'] },
  { action: 'Toggle Sidebar', keys: ['Ctrl', 'B'] },
  { action: 'Go to Dashboard', keys: ['Ctrl', '1'] },
  { action: 'Go to AI Chat', keys: ['Ctrl', '2'] },
  { action: 'Go to Settings', keys: ['Ctrl', ','] },
  { action: 'Toggle Dark Mode', keys: ['Ctrl', 'Shift', 'D'] },
  { action: 'Export Meeting', keys: ['Ctrl', 'E'] },
  { action: 'Mute / Unmute', keys: ['Ctrl', 'M'] },
];

const SettingsView: React.FC<SettingsViewProps> = ({ isDark, onToggleTheme }) => {
  const { settings, updateSetting: ctxUpdateSetting, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [showToast, setShowToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const triggerToast = useCallback((message: string) => {
    setShowToast({ show: true, message });
    setTimeout(() => setShowToast({ show: false, message: '' }), 2500);
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    ctxUpdateSetting(key, value);
    triggerToast('Setting updated');
  };

  const handleExportData = () => {
    const exportData = {
      settings,
      meetings: JSON.parse(localStorage.getItem('lumina_meetings') || '[]'),
      notes: JSON.parse(localStorage.getItem('lumina_notes') || '[]'),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumina-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Data exported successfully!');
  };

  const handleClearHistory = () => {
    localStorage.removeItem('lumina_meetings');
    setShowClearConfirm(false);
    triggerToast('Meeting history cleared');
  };

  const handleResetSettings = () => {
    resetSettings();
    triggerToast('Settings reset to defaults');
  };

  const handleJoinMeeting = () => {
    if (!meetingLink.trim()) return;
    setIsJoining(true);
    setJoinSuccess(false);
    // Simulate AI bot joining the meeting
    setTimeout(() => {
      setIsJoining(false);
      setJoinSuccess(true);
      triggerToast('AI bot is joining the meeting!');
      setTimeout(() => setJoinSuccess(false), 4000);
    }, 2000);
  };

  const detectPlatform = (link: string): { name: string; icon: string; color: string } | null => {
    if (link.includes('zoom.us') || link.includes('zoom.com')) return { name: 'Zoom', icon: 'fa-video', color: '#2D8CFF' };
    if (link.includes('meet.google.com')) return { name: 'Google Meet', icon: 'fa-video', color: '#00897B' };
    if (link.includes('teams.microsoft.com') || link.includes('teams.live.com')) return { name: 'Microsoft Teams', icon: 'fa-users', color: '#6264A7' };
    if (link.includes('webex.com')) return { name: 'Webex', icon: 'fa-video', color: '#07C160' };
    if (link.match(/^https?:\/\//)) return { name: 'Meeting', icon: 'fa-link', color: '#6366f1' };
    return null;
  };

  /* ═══════════════════════════ Sub-components ═══════════════════════════ */

  const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; id?: string }> = ({ checked, onChange, id }) => (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 ${
        checked ? 'bg-brand-500' : ''
      }`}
      style={!checked ? { backgroundColor: 'var(--border-secondary)' } : {}}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );

  const SettingRow: React.FC<{
    icon: string;
    iconColor?: string;
    title: string;
    description?: string;
    children: React.ReactNode;
  }> = ({ icon, iconColor, title, description, children }) => (
    <div className="flex items-center justify-between gap-4 py-4 px-1">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: iconColor || 'var(--text-secondary)' }}
        >
          <i className={`fas ${icon} text-sm`}></i>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
          {description && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{description}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const SectionCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`rounded-2xl p-5 md:p-6 mb-5 ${className}`} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}>
      <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>{title}</h3>
      <div className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>{children}</div>
    </div>
  );

  const SelectDropdown: React.FC<{ value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }> = ({ value, options, onChange }) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs font-semibold px-3 py-2 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  /* ═══════════════════════════ Tab content renderers ═══════════════════════════ */

  const renderGeneral = () => (
    <>
      <SectionCard title="Appearance">
        <SettingRow icon="fa-circle-half-stroke" iconColor="#6366f1" title="Dark Mode" description="Toggle between light and dark theme">
          <Toggle checked={isDark} onChange={onToggleTheme} id="settings-dark-mode" />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Preferences">
        <SettingRow icon="fa-language" iconColor="#3b82f6" title="Language" description="Interface display language">
          <SelectDropdown
            value={settings.language}
            options={LANGUAGES.map(l => ({ value: l.code, label: l.name }))}
            onChange={v => updateSetting('language', v)}
          />
        </SettingRow>
        <SettingRow icon="fa-globe" iconColor="#0ea5e9" title="Timezone" description={settings.timezone}>
          <span className="text-xs font-semibold px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
            {settings.timezone.split('/').pop()?.replace('_', ' ')}
          </span>
        </SettingRow>
        <SettingRow icon="fa-calendar" iconColor="#8b5cf6" title="Date Format" description="How dates are displayed">
          <SelectDropdown
            value={settings.dateFormat}
            options={DATE_FORMATS.map(f => ({ value: f, label: f }))}
            onChange={v => updateSetting('dateFormat', v)}
          />
        </SettingRow>
        <SettingRow icon="fa-floppy-disk" iconColor="#10b981" title="Auto-Save" description="Automatically save changes">
          <Toggle checked={settings.autoSave} onChange={v => updateSetting('autoSave', v)} id="settings-autosave" />
        </SettingRow>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={handleResetSettings}
          className="text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <i className="fas fa-rotate-left mr-2"></i>Reset to Defaults
        </button>
      </div>
    </>
  );

  const renderNotifications = () => (
    <>
      <SectionCard title="Email Notifications">
        <SettingRow icon="fa-envelope" iconColor="#3b82f6" title="Email Digest" description="Receive periodic summary emails">
          <Toggle checked={settings.emailDigest} onChange={v => updateSetting('emailDigest', v)} />
        </SettingRow>
        {settings.emailDigest && (
          <SettingRow icon="fa-clock" iconColor="#6366f1" title="Digest Frequency" description="How often to receive digests">
            <SelectDropdown
              value={settings.emailDigestFrequency}
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              onChange={v => updateSetting('emailDigestFrequency', v as AppSettings['emailDigestFrequency'])}
            />
          </SettingRow>
        )}
      </SectionCard>

      <SectionCard title="Meeting Alerts">
        <SettingRow icon="fa-bell" iconColor="#f59e0b" title="Meeting Reminders" description="Get notified before meetings start">
          <Toggle checked={settings.meetingReminders} onChange={v => updateSetting('meetingReminders', v)} />
        </SettingRow>
        {settings.meetingReminders && (
          <SettingRow icon="fa-stopwatch" iconColor="#f97316" title="Reminder Time" description="Minutes before meeting to notify">
            <SelectDropdown
              value={String(settings.reminderMinutesBefore)}
              options={[
                { value: '5', label: '5 min' },
                { value: '10', label: '10 min' },
                { value: '15', label: '15 min' },
                { value: '30', label: '30 min' },
              ]}
              onChange={v => updateSetting('reminderMinutesBefore', Number(v))}
            />
          </SettingRow>
        )}
        <SettingRow icon="fa-robot" iconColor="#8b5cf6" title="AI Summary Alerts" description="Notify when AI summaries are ready">
          <Toggle checked={settings.aiSummaryAlerts} onChange={v => updateSetting('aiSummaryAlerts', v)} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="System">
        <SettingRow icon="fa-desktop" iconColor="#10b981" title="Desktop Notifications" description="Show browser push notifications">
          <Toggle checked={settings.desktopNotifications} onChange={async (v) => {
            if (v && 'Notification' in window) {
              if (Notification.permission === 'granted') {
                updateSetting('desktopNotifications', true);
                new Notification('Lumina AI', { body: 'Desktop notifications are now enabled!', icon: '/favicon.ico' });
              } else if (Notification.permission !== 'denied') {
                const perm = await Notification.requestPermission();
                if (perm === 'granted') {
                  updateSetting('desktopNotifications', true);
                  new Notification('Lumina AI', { body: 'Desktop notifications are now enabled!', icon: '/favicon.ico' });
                } else {
                  triggerToast('Notification permission denied by browser');
                }
              } else {
                triggerToast('Notifications blocked. Please allow in browser settings.');
              }
            } else {
              updateSetting('desktopNotifications', false);
            }
          }} />
        </SettingRow>
      </SectionCard>
    </>
  );

  const renderRecording = () => {
    const detectedPlatform = detectPlatform(meetingLink);
    return (
    <>
      {/* AI Meeting Bot — hero section */}
      <div
        className="rounded-2xl p-5 md:p-6 mb-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(59,130,246,0.10) 100%)',
          border: '1px solid var(--border-primary)',
        }}
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
          >
            <i className="fas fa-robot text-sm"></i>
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>AI Meeting Bot</h3>
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Send Lumina AI to join and record meetings for you</p>
          </div>
        </div>

        {/* Auto-join toggle */}
        <div
          className="flex items-center justify-between gap-4 p-4 rounded-xl mb-4"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: settings.autoJoinMeetings ? 'rgba(16,185,129,0.15)' : 'var(--bg-tertiary)', color: '#10b981' }}>
              <i className="fas fa-bolt text-sm"></i>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Auto-Join Meetings</p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Automatically join calendar meetings to record & transcribe</p>
            </div>
          </div>
          <button
            id="settings-auto-join"
            onClick={() => updateSetting('autoJoinMeetings', !settings.autoJoinMeetings)}
            className="shrink-0 relative flex items-center w-[88px] h-10 rounded-full px-1 transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            style={{
              backgroundColor: settings.autoJoinMeetings ? '#10b981' : 'var(--bg-tertiary)',
              border: `2px solid ${settings.autoJoinMeetings ? '#10b981' : 'var(--border-secondary)'}`,
            }}
          >
            <span
              className="absolute text-[10px] font-extrabold uppercase tracking-wide transition-opacity duration-200"
              style={{
                left: '12px',
                color: '#fff',
                opacity: settings.autoJoinMeetings ? 1 : 0,
              }}
            >
              ON
            </span>
            <span
              className="absolute text-[10px] font-extrabold uppercase tracking-wide transition-opacity duration-200"
              style={{
                right: '10px',
                color: 'var(--text-tertiary)',
                opacity: settings.autoJoinMeetings ? 0 : 1,
              }}
            >
              OFF
            </span>
            <span
              className="block w-7 h-7 rounded-full bg-white shadow-md transition-all duration-300"
              style={{
                transform: settings.autoJoinMeetings ? 'translateX(52px)' : 'translateX(0px)',
              }}
            />
          </button>
        </div>

        {/* Meeting link input */}
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
        >
          <label className="text-xs font-bold uppercase tracking-wider block mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Join a Meeting Now
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                value={meetingLink}
                onChange={e => { setMeetingLink(e.target.value); setJoinSuccess(false); }}
                placeholder="Paste meeting link (Zoom, Meet, Teams...)"
                className="w-full rounded-xl px-4 py-3 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-primary)',
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleJoinMeeting(); }}
              />
              {detectedPlatform && meetingLink.trim() && (
                <div
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase"
                  style={{ backgroundColor: `${detectedPlatform.color}18`, color: detectedPlatform.color }}
                >
                  <i className={`fas ${detectedPlatform.icon} text-[9px]`}></i>
                  {detectedPlatform.name}
                </div>
              )}
            </div>
            <button
              onClick={handleJoinMeeting}
              disabled={!meetingLink.trim() || isJoining}
              className={`px-5 py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 shrink-0 ${
                joinSuccess
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'hover:opacity-90 disabled:opacity-40'
              }`}
              style={!joinSuccess ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}
            >
              {isJoining ? (
                <><i className="fas fa-circle-notch fa-spin text-xs"></i>Joining...</>
              ) : joinSuccess ? (
                <><i className="fas fa-check text-xs"></i>Joined!</>
              ) : (
                <><i className="fas fa-right-to-bracket text-xs"></i>Join</>
              )}
            </button>
          </div>
          {joinSuccess && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              <i className="fas fa-circle-check"></i>
              Lumina AI bot has joined the meeting and is recording. You'll get a summary when it ends.
            </div>
          )}
        </div>
      </div>

      <SectionCard title="Audio Settings">
        <SettingRow icon="fa-waveform-lines" iconColor="#6366f1" title="Audio Quality" description="Higher quality uses more storage">
          <SelectDropdown
            value={settings.audioQuality}
            options={[
              { value: 'low', label: 'Low (64 kbps)' },
              { value: 'standard', label: 'Standard (128 kbps)' },
              { value: 'high', label: 'High (256 kbps)' },
              { value: 'lossless', label: 'Lossless (WAV)' },
            ]}
            onChange={v => updateSetting('audioQuality', v as AppSettings['audioQuality'])}
          />
        </SettingRow>
        <SettingRow icon="fa-volume-xmark" iconColor="#ef4444" title="Noise Suppression" description="Filter background noise during recording">
          <Toggle checked={settings.noiseSuppression} onChange={v => updateSetting('noiseSuppression', v)} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Transcription">
        <SettingRow icon="fa-closed-captioning" iconColor="#3b82f6" title="Auto-Transcribe" description="Automatically transcribe after recording">
          <Toggle checked={settings.autoTranscribe} onChange={v => updateSetting('autoTranscribe', v)} />
        </SettingRow>
        <SettingRow icon="fa-users" iconColor="#8b5cf6" title="Speaker Diarization" description="Identify different speakers in recordings">
          <Toggle checked={settings.speakerDiarization} onChange={v => updateSetting('speakerDiarization', v)} />
        </SettingRow>
        <SettingRow icon="fa-language" iconColor="#0ea5e9" title="Auto-Detect Language" description="Automatically detect spoken language">
          <Toggle checked={settings.autoDetectLanguage} onChange={v => updateSetting('autoDetectLanguage', v)} />
        </SettingRow>
      </SectionCard>
    </>
  );
  };

  const renderPrivacy = () => (
    <>
      <SectionCard title="Privacy">
        <SettingRow icon="fa-eye" iconColor="#3b82f6" title="Online Status" description="Show your online status to team members">
          <Toggle checked={settings.showOnlineStatus} onChange={v => updateSetting('showOnlineStatus', v)} />
        </SettingRow>
        <SettingRow icon="fa-chart-pie" iconColor="#8b5cf6" title="Usage Analytics" description="Help improve Lumina by sharing anonymous usage data">
          <Toggle checked={settings.shareAnalytics} onChange={v => updateSetting('shareAnalytics', v)} />
        </SettingRow>
      </SectionCard>

      <SectionCard title="Data Management">
        <SettingRow icon="fa-database" iconColor="#0ea5e9" title="Data Retention" description="Automatically delete meetings after this period">
          <SelectDropdown
            value={String(settings.dataRetentionDays)}
            options={[
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: '180', label: '6 months' },
              { value: '365', label: '1 year' },
              { value: '0', label: 'Forever' },
            ]}
            onChange={v => updateSetting('dataRetentionDays', Number(v))}
          />
        </SettingRow>
        <SettingRow icon="fa-file-export" iconColor="#10b981" title="Export All Data" description="Download all your meetings, notes and settings">
          <button
            onClick={handleExportData}
            className="text-xs font-bold px-4 py-2 rounded-xl transition-colors text-white"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <i className="fas fa-download mr-1.5"></i>Export
          </button>
        </SettingRow>
      </SectionCard>

      <SectionCard title="Danger Zone">
        <SettingRow icon="fa-broom" iconColor="#f59e0b" title="Clear Meeting History" description="Remove all saved meeting recordings and transcripts">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs font-bold px-4 py-2 rounded-xl transition-colors border border-amber-200 text-amber-600 hover:bg-amber-50"
          >
            <i className="fas fa-trash-can mr-1.5"></i>Clear
          </button>
        </SettingRow>
        <SettingRow icon="fa-user-xmark" iconColor="#ef4444" title="Delete Account" description="Permanently delete your account and all data">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs font-bold px-4 py-2 rounded-xl transition-colors border border-red-200 text-red-600 hover:bg-red-50"
          >
            <i className="fas fa-skull-crossbones mr-1.5"></i>Delete
          </button>
        </SettingRow>
      </SectionCard>
    </>
  );

  const renderShortcuts = () => (
    <SectionCard title="Keyboard Shortcuts">
      {SHORTCUTS.map((s, i) => (
        <div key={i} className="flex items-center justify-between py-3.5 px-1">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.action}</span>
          <div className="flex items-center gap-1">
            {s.keys.map((k, j) => (
              <React.Fragment key={j}>
                <kbd
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-sm"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-secondary)',
                    boxShadow: '0 2px 0 var(--border-secondary)',
                  }}
                >
                  {k}
                </kbd>
                {j < s.keys.length - 1 && <span className="text-xs mx-0.5" style={{ color: 'var(--text-tertiary)' }}>+</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </SectionCard>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'general': return renderGeneral();
      case 'notifications': return renderNotifications();
      case 'recording': return renderRecording();
      case 'privacy': return renderPrivacy();
      case 'shortcuts': return renderShortcuts();
    }
  };

  /* ═══════════════════════════ Confirmation Modals ═══════════════════════════ */

  const ConfirmModal: React.FC<{
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText: string;
    danger?: boolean;
  }> = ({ show, onClose, onConfirm, title, message, confirmText, danger }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: 'var(--overlay-bg)' }} onClick={onClose}>
        <div className="rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in" style={{ backgroundColor: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: danger ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)', color: danger ? '#ef4444' : '#f59e0b' }}
            >
              <i className={`fas ${danger ? 'fa-triangle-exclamation' : 'fa-circle-question'}`}></i>
            </div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          </div>
          <p className="text-sm mb-6 pl-[52px]" style={{ color: 'var(--text-secondary)' }}>{message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors" style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════════════════════════ Main render ═══════════════════════════ */

  return (
    <div className="h-full flex flex-col relative">
      {/* Toast */}
      {showToast.show && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-down w-[90%] md:w-auto"
          style={{ backgroundColor: isDark ? 'var(--card-bg)' : '#0f172a', color: '#fff', border: isDark ? '1px solid var(--border-primary)' : 'none' }}
        >
          <i className="fas fa-circle-check text-green-400"></i>
          <span className="text-sm font-bold">{showToast.message}</span>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        show={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
        title="Clear History?"
        message="This will permanently delete all your saved meeting recordings and transcripts. This action cannot be undone."
        confirmText="Yes, Clear All"
      />
      <ConfirmModal
        show={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => { setShowDeleteConfirm(false); triggerToast('Account deletion is not available in this demo'); }}
        title="Delete Account?"
        message="This will permanently delete your account and all associated data. This action cannot be undone."
        confirmText="Delete Account"
        danger
      />

      {/* Header */}
      <header
        className="p-6 md:p-8 flex items-center justify-between z-10 sticky top-0 backdrop-blur-xl"
        style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: isDark ? 'rgba(11,18,32,0.85)' : 'rgba(255,255,255,0.85)' }}
      >
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Settings</h1>
          <p className="hidden md:block text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Customize your Lumina experience
          </p>
        </div>
        {/* Mobile tab selector */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
        >
          <i className={`fas ${TABS.find(t => t.id === activeTab)?.icon}`}></i>
          {TABS.find(t => t.id === activeTab)?.label}
          <i className={`fas fa-chevron-down text-xs transition-transform ${showMobileMenu ? 'rotate-180' : ''}`}></i>
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {showMobileMenu && (
        <div
          className="md:hidden absolute top-[73px] right-6 z-20 rounded-2xl shadow-xl overflow-hidden animate-slide-down"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowMobileMenu(false); }}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <i className={`fas ${tab.icon} w-5 text-center`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar tabs */}
        <div
          className="hidden md:flex flex-col w-56 shrink-0 p-4 gap-1 overflow-y-auto"
          style={{ borderRight: '1px solid var(--border-primary)' }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 relative group`}
              style={
                activeTab === tab.id
                  ? { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }
                  : { color: 'var(--text-secondary)' }
              }
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'var(--hover-bg)'; }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {activeTab === tab.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-brand-500 rounded-r-full"></div>
              )}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  activeTab === tab.id ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/25' : ''
                }`}
                style={activeTab !== tab.id ? { color: 'var(--text-secondary)' } : {}}
              >
                <i className={`fas ${tab.icon} text-xs`}></i>
              </div>
              {tab.label}
            </button>
          ))}

          {/* Version info at bottom */}
          <div className="mt-auto pt-4">
            <div className="px-4 py-3 rounded-xl" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Lumina AI</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>v2.4.0</p>
            </div>
          </div>
        </div>

        {/* Settings content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 pb-24 lg:pb-8">
          <div className="max-w-2xl mx-auto">
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
