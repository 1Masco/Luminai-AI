import React from 'react';
import type { AppSettings, ProcessingMode } from '../../contexts/SettingsContext';
import { PROCESSING_MODE_OPTIONS } from './settingsConfig';
import { HighlightCard, ScopeBadge, SelectControl, SettingRow, SettingsSection, Toggle } from './SettingsPrimitives';

interface PrivacySettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onExportData: () => void;
  onClearHistory: () => void;
}

const PrivacySettingsPage: React.FC<PrivacySettingsPageProps> = ({
  settings,
  updateSetting,
  onExportData,
  onClearHistory,
}) => {
  return (
    <div className="space-y-5">
      <HighlightCard
        title="Privacy should be operational, not abstract"
        description="Users should be able to understand capture, storage, sharing, and deletion in a glance. This is where Lumina can feel safer than generic meeting bots."
        icon="fa-shield-halved"
        accent="#10b981"
      >
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ['External joins', settings.askBeforeExternalJoin ? 'Ask first' : 'Automatic'],
            ['Audio storage', settings.transcribeWithoutAudioStorage ? 'Transcript only' : 'Audio retained'],
            ['Sensitive mode', settings.sensitiveMeetingMode === 'off' ? 'Manual' : settings.sensitiveMeetingMode],
            ['Audit visibility', settings.auditVisibility ? 'Visible' : 'Off'],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border px-4 py-3"
              style={{ backgroundColor: 'rgba(15,23,42,0.08)', borderColor: 'rgba(16,185,129,0.2)' }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
                {label}
              </p>
              <p className="mt-1 text-sm font-bold" style={{ color: '#6ee7b7' }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </HighlightCard>

      <SettingsSection
        title="Trust controls"
        description="Make the safe thing automatic and the risky thing explicit."
        badge={<ScopeBadge label="Recommended" tone="workspace" />}
      >
        <SettingRow
          title="Ask before joining external meetings"
          description="Require confirmation before capture starts in meetings with outside attendees."
          icon="fa-user-shield"
          iconColor="#f59e0b"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.askBeforeExternalJoin} onChange={(value) => updateSetting('askBeforeExternalJoin', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Transcribe but do not store audio"
          description="Keep transcript value while reducing retained raw media."
          icon="fa-file-audio"
          iconColor="#22c55e"
        >
          <div className="flex items-center justify-end">
            <Toggle
              checked={settings.transcribeWithoutAudioStorage}
              onChange={(value) => updateSetting('transcribeWithoutAudioStorage', value)}
            />
          </div>
        </SettingRow>

        <SettingRow
          title="Sensitive meeting mode"
          description="A safer default for legal, HR, finance, board, and interview conversations."
          icon="fa-user-secret"
          iconColor="#fb7185"
        >
          <SelectControl
            value={settings.sensitiveMeetingMode}
            options={[
              { value: 'off', label: 'Off by default' },
              { value: 'manual_only', label: 'Manual quick action' },
              { value: 'external_only', label: 'Default for external meetings' },
            ]}
            onChange={(value) => updateSetting('sensitiveMeetingMode', value as AppSettings['sensitiveMeetingMode'])}
          />
        </SettingRow>

        <SettingRow
          title="Audit visibility"
          description="Show privacy-relevant activity and setting changes to give users reassurance."
          icon="fa-eye"
          iconColor="#38bdf8"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.auditVisibility} onChange={(value) => updateSetting('auditVisibility', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Online status visibility"
          description="Control whether teammates can see when you are active in Lumina."
          icon="fa-signal"
          iconColor="#22c55e"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.showOnlineStatus} onChange={(value) => updateSetting('showOnlineStatus', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Processing preference"
          description="Choose whether Lumina should favor standard speed, privacy-first cloud handling, or local processing when available."
          icon="fa-server"
          iconColor="#a78bfa"
        >
          <SelectControl
            value={settings.processingMode}
            options={PROCESSING_MODE_OPTIONS}
            onChange={(value) => updateSetting('processingMode', value as ProcessingMode)}
          />
        </SettingRow>

        <SettingRow
          title="Anonymous product analytics"
          description="Share aggregate usage data to help improve Lumina reliability and UX."
          icon="fa-chart-column"
          iconColor="#a78bfa"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.shareAnalytics} onChange={(value) => updateSetting('shareAnalytics', value)} />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Retention"
        description="Give users clear control over how long different artifacts survive."
        badge={<ScopeBadge label="Personal" />}
      >
        <SettingRow
          title="Local meeting retention"
          description="Automatically remove stored meetings from this device after the selected period."
          icon="fa-database"
          iconColor="#22d3ee"
        >
          <SelectControl
            value={String(settings.dataRetentionDays)}
            options={[
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: '180', label: '180 days' },
              { value: '365', label: '1 year' },
              { value: '0', label: 'Never auto-delete' },
            ]}
            onChange={(value) => updateSetting('dataRetentionDays', Number(value))}
          />
        </SettingRow>

        <SettingRow
          title="Audio retention"
          description="How long to keep captured audio when audio storage is enabled."
          icon="fa-waveform"
          iconColor="#34d399"
        >
          <SelectControl
            value={String(settings.audioRetentionDays)}
            options={[
              { value: '7', label: '7 days' },
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: '365', label: '1 year' },
            ]}
            onChange={(value) => updateSetting('audioRetentionDays', Number(value))}
          />
        </SettingRow>

        <SettingRow
          title="Transcript retention"
          description="How long generated transcripts and recaps should remain available."
          icon="fa-file-lines"
          iconColor="#818cf8"
        >
          <SelectControl
            value={String(settings.transcriptRetentionDays)}
            options={[
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: '365', label: '1 year' },
              { value: '730', label: '2 years' },
            ]}
            onChange={(value) => updateSetting('transcriptRetentionDays', Number(value))}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Data actions"
        description="Portable exports and explicit cleanup are part of trust."
        badge={<ScopeBadge label="User control" tone="policy" />}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={onExportData}
            className="rounded-2xl border px-4 py-4 text-left transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
          >
            <div className="mb-2 flex items-center gap-2">
              <i className="fas fa-download text-sm" style={{ color: '#38bdf8' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Export my data
              </span>
            </div>
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Download your settings, notes, and meetings as a portable JSON package.
            </p>
          </button>

          <button
            type="button"
            onClick={onClearHistory}
            className="rounded-2xl border px-4 py-4 text-left transition-all hover:opacity-90"
            style={{ backgroundColor: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.26)' }}
          >
            <div className="mb-2 flex items-center gap-2">
              <i className="fas fa-trash-can text-sm" style={{ color: '#fb7185' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Clear meeting history
              </span>
            </div>
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              Remove locally stored meetings and transcripts from this workspace view.
            </p>
          </button>
        </div>
      </SettingsSection>
    </div>
  );
};

export default PrivacySettingsPage;
