import React, { startTransition, useDeferredValue, useMemo, useState } from 'react';
import { UserProfile } from '../types';
import { AppSettings, useSettings } from '../contexts/SettingsContext';
import AIControlsPage from './settings/AIControlsPage';
import AutomationsPage from './settings/AutomationsPage';
import CaptureSettingsPage from './settings/CaptureSettingsPage';
import GeneralSettingsPage from './settings/GeneralSettingsPage';
import MemorySettingsPage from './settings/MemorySettingsPage';
import PowerUserSettingsPage from './settings/PowerUserSettingsPage';
import PrivacySettingsPage from './settings/PrivacySettingsPage';
import RecapsSettingsPage from './settings/RecapsSettingsPage';
import WorkspaceSettingsPage from './settings/WorkspaceSettingsPage';
import { MiniStat, ScopeBadge } from './settings/SettingsPrimitives';
import { SETTINGS_PAGES, type SettingsPageDefinition, type SettingsPageId } from './settings/settingsConfig';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const GROUP_ORDER: Array<SettingsPageDefinition['group']> = ['Basic', 'Advanced', 'Power User'];

const SettingsView: React.FC<SettingsViewProps> = ({ user, isDark, onToggleTheme }) => {
  const { settings, updateSetting: ctxUpdateSetting, resetSettings } = useSettings();
  const [activePage, setActivePage] = useState<SettingsPageId>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showToast, setShowToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const deferredSearch = useDeferredValue(searchQuery);

  const filteredPages = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return SETTINGS_PAGES;

    return SETTINGS_PAGES.filter((page) => {
      const haystack = [page.label, page.description, ...page.keywords].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearch]);

  const groupedPages = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      pages: SETTINGS_PAGES.filter((page) => page.group === group),
    }));
  }, []);

  const activePreset = settings.aiOutputPresets.find((preset) => preset.id === settings.defaultAIPresetId);
  const activePageMeta = SETTINGS_PAGES.find((page) => page.id === activePage) || SETTINGS_PAGES[0];

  const triggerToast = (message: string) => {
    setShowToast({ show: true, message });
    window.setTimeout(() => setShowToast({ show: false, message: '' }), 2200);
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    ctxUpdateSetting(key, value);
    triggerToast('Settings saved');
  };

  const handleSelectPage = (pageId: SettingsPageId) => {
    startTransition(() => {
      setActivePage(pageId);
      setShowMobileMenu(false);
      setSearchQuery('');
    });
  };

  const handleSearchSubmit = () => {
    if (filteredPages.length === 0) return;
    handleSelectPage(filteredPages[0].id);
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
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumina-control-center-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast('Export ready');
  };

  const handleClearHistory = () => {
    localStorage.removeItem('lumina_meetings');
    setShowClearConfirm(false);
    triggerToast('Meeting history cleared');
  };

  const handleResetSettings = () => {
    resetSettings();
    setShowResetConfirm(false);
    triggerToast('Settings reset to defaults');
  };

  const renderPage = () => {
    switch (activePage) {
      case 'general':
        return (
          <GeneralSettingsPage
            settings={settings}
            isDark={isDark}
            onToggleTheme={() => {
              onToggleTheme();
              triggerToast('Theme updated');
            }}
            updateSetting={updateSetting}
          />
        );
      case 'capture':
        return <CaptureSettingsPage settings={settings} updateSetting={updateSetting} />;
      case 'recaps':
        return <RecapsSettingsPage settings={settings} updateSetting={updateSetting} />;
      case 'ai':
        return <AIControlsPage settings={settings} updateSetting={updateSetting} />;
      case 'memory':
        return <MemorySettingsPage settings={settings} updateSetting={updateSetting} />;
      case 'privacy':
        return (
          <PrivacySettingsPage
            settings={settings}
            updateSetting={updateSetting}
            onExportData={handleExportData}
            onClearHistory={() => setShowClearConfirm(true)}
          />
        );
      case 'automations':
        return <AutomationsPage settings={settings} updateSetting={updateSetting} />;
      case 'workspace':
        return <WorkspaceSettingsPage settings={settings} updateSetting={updateSetting} />;
      case 'power':
        return <PowerUserSettingsPage settings={settings} updateSetting={updateSetting} />;
      default:
        return null;
    }
  };

  const ConfirmModal: React.FC<{
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    danger?: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }> = ({ show, title, message, confirmText, danger = false, onClose, onConfirm }) => {
    if (!show) return null;
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ backgroundColor: 'var(--overlay-bg)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[28px] p-6 shadow-2xl"
          style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-primary)' }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: danger ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                color: danger ? '#fb7185' : '#fbbf24',
              }}
            >
              <i className={`fas ${danger ? 'fa-triangle-exclamation' : 'fa-circle-question'} text-sm`} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {message}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl px-4 py-2 text-sm font-semibold"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
              style={{
                background: danger
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #4f46e5, #6366f1)',
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {showToast.show && (
        <div
          className="fixed left-1/2 top-20 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-2xl px-5 py-3 shadow-2xl"
          style={{
            backgroundColor: isDark ? 'var(--card-bg)' : '#0f172a',
            color: '#fff',
            border: isDark ? '1px solid var(--border-primary)' : 'none',
          }}
        >
          <i className="fas fa-circle-check text-emerald-400" />
          <span className="text-sm font-bold">{showToast.message}</span>
        </div>
      )}

      <ConfirmModal
        show={showClearConfirm}
        title="Clear meeting history?"
        message="This removes locally stored meetings and transcripts from Lumina on this device."
        confirmText="Clear history"
        danger
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
      />

      <ConfirmModal
        show={showResetConfirm}
        title="Reset control center?"
        message="This restores your settings to the Lumina defaults described in the new settings architecture."
        confirmText="Reset settings"
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetSettings}
      />

      <header
        className="sticky top-0 z-20 border-b px-5 py-5 md:px-8"
        style={{
          borderColor: 'var(--border-primary)',
          background: isDark ? 'rgba(10,15,27,0.88)' : 'rgba(255,255,255,0.86)',
          backdropFilter: 'blur(22px)',
        }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ScopeBadge label="Control Center" tone="highlight" />
                <ScopeBadge label={user.plan === 'team' ? 'Team' : user.plan === 'pro' ? 'Pro' : 'Free'} tone="workspace" />
                {user.isAdmin && <ScopeBadge label="Admin" tone="policy" />}
              </div>
              <h1 className="text-2xl font-bold tracking-tight md:text-[30px]" style={{ color: 'var(--text-primary)' }}>
                Lumina Settings
              </h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 md:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                Configure how Lumina captures meetings, shapes AI output, applies memory, protects privacy, and fits your workflow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="rounded-2xl px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Reset defaults
              </button>
              <button
                type="button"
                onClick={handleExportData}
                className="rounded-2xl px-4 py-2 text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}
              >
                Export control pack
              </button>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="relative">
              <i
                className="fas fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
                placeholder='Search "external meetings", "client recap", "memory"...'
                className="w-full rounded-[22px] border py-3 pl-11 pr-4 text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-brand-500/20"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  borderColor: 'var(--border-primary)',
                }}
              />

              {searchQuery.trim() && (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[24px] border shadow-2xl"
                  style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-primary)' }}
                >
                  {filteredPages.length > 0 ? (
                    filteredPages.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => handleSelectPage(page.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={(event) => {
                          event.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                        }}
                        onMouseLeave={(event) => {
                          event.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <i className={`fas ${page.icon} text-xs`} style={{ color: 'var(--text-secondary)' }} />
                          <div>
                            <p className="text-sm font-semibold">{page.label}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {page.description}
                            </p>
                          </div>
                        </div>
                        <ScopeBadge label={page.group} tone="workspace" />
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      No matching settings. Try search terms like "privacy", "executive", or "export".
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMobileMenu((current) => !current)}
              className="flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold md:hidden"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-primary)',
              }}
            >
              <i className={`fas ${activePageMeta.icon} text-xs`} />
              {activePageMeta.label}
              <i className={`fas fa-chevron-${showMobileMenu ? 'up' : 'down'} text-xs`} />
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Default preset" value={activePreset?.name || 'Custom'} />
            <MiniStat label="Auto-join" value={settings.autoJoinMode.replace(/_/g, ' ')} tone="workspace" />
            <MiniStat
              label="Privacy posture"
              value={settings.transcribeWithoutAudioStorage ? 'Transcript only' : 'Audio retained'}
              tone="policy"
            />
            <MiniStat label="Memory" value={settings.memoryEnabled ? settings.memoryReviewMode : 'Disabled'} />
          </div>
        </div>
      </header>

      {showMobileMenu && (
        <div
          className="absolute left-5 right-5 top-[238px] z-20 rounded-[24px] border p-2 shadow-2xl md:hidden"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-primary)' }}
        >
          {SETTINGS_PAGES.map((page) => {
            const active = page.id === activePage;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => handleSelectPage(page.id)}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
                style={{
                  backgroundColor: active ? 'var(--bg-tertiary)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <i className={`fas ${page.icon} text-xs`} />
                {page.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="hidden w-[290px] shrink-0 border-r px-4 py-5 md:flex md:flex-col"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="space-y-5">
            {groupedPages.map((group) => (
              <div key={group.group}>
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                  {group.group}
                </p>
                <div className="space-y-1">
                  {group.pages.map((page) => {
                    const active = page.id === activePage;
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => handleSelectPage(page.id)}
                        className="w-full rounded-[22px] px-3 py-3 text-left transition-all"
                        style={{
                          background: active ? 'linear-gradient(135deg, rgba(79,70,229,0.16), rgba(59,130,246,0.06))' : 'transparent',
                          border: active ? '1px solid rgba(99,102,241,0.24)' : '1px solid transparent',
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor: active ? 'rgba(99,102,241,0.18)' : 'var(--bg-tertiary)',
                              color: active ? '#c7d2fe' : 'var(--text-secondary)',
                            }}
                          >
                            <i className={`fas ${page.icon} text-xs`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold" style={{ color: active ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                              {page.label}
                            </p>
                            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
                              {page.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-auto rounded-[28px] border p-4"
            style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                Why it matters
              </p>
              <ScopeBadge label="Lumina edge" tone="highlight" />
            </div>
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Settings are now organized around controllable outcomes: capture, AI behavior, memory, privacy, workflow, and speed.
            </p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-5 pb-24 md:p-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 rounded-[28px] border p-5 md:p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-primary)' }}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <ScopeBadge label={activePageMeta.group} tone={activePageMeta.group === 'Basic' ? 'personal' : activePageMeta.group === 'Advanced' ? 'workspace' : 'policy'} />
                    <ScopeBadge label="Fast save" tone="highlight" />
                  </div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {activePageMeta.label}
                  </h2>
                  <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                    {activePageMeta.description}
                  </p>
                </div>
                <div className="rounded-2xl border px-4 py-3" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                    Current posture
                  </p>
                  <p className="mt-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {settings.askBeforeExternalJoin ? 'External-safe' : 'Automation-forward'}
                  </p>
                </div>
              </div>
            </div>

            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsView;
