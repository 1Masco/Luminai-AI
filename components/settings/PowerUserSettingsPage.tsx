import React from 'react';
import type { AppSettings, ExportFormat, SearchMode } from '../../contexts/SettingsContext';
import { EXPORT_FORMAT_OPTIONS, SEARCH_MODE_OPTIONS, STARTUP_PAGE_OPTIONS } from './settingsConfig';
import { HighlightCard, ScopeBadge, SelectControl, SettingRow, SettingsSection, Toggle } from './SettingsPrimitives';

interface PowerUserSettingsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const PowerUserSettingsPage: React.FC<PowerUserSettingsPageProps> = ({ settings, updateSetting }) => {
  return (
    <div className="space-y-5">
      <HighlightCard
        title="Reward repeat use"
        description="This page is about speed, rhythm, and working-memory relief. Lumina should feel closer to Raycast and Superhuman here than a normal SaaS settings page."
        icon="fa-keyboard"
      />

      <SettingsSection
        title="Keyboard and command flow"
        description="Make the interface faster for people who live in it all day."
        badge={<ScopeBadge label="Power user" tone="highlight" />}
      >
        <SettingRow
          title="Command palette"
          description="Keep universal search and actions one shortcut away."
          icon="fa-terminal"
          iconColor="#818cf8"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.commandPaletteEnabled} onChange={(value) => updateSetting('commandPaletteEnabled', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Shortcut hints"
          description="Show keyboard affordances for people learning the faster path."
          icon="fa-keyboard"
          iconColor="#38bdf8"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.keyboardShortcutHints} onChange={(value) => updateSetting('keyboardShortcutHints', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Automation hotkeys"
          description="Reserve quick keys for high-frequency actions like export, share, and rule execution."
          icon="fa-bolt"
          iconColor="#22c55e"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.automationHotkeys} onChange={(value) => updateSetting('automationHotkeys', value)} />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Output and startup defaults"
        description="Personalize the surfaces you land on and the formats you use most."
        badge={<ScopeBadge label="Personal" />}
      >
        <SettingRow
          title="Startup page"
          description="A second shortcut to your preferred landing zone for power users who live in one surface."
          icon="fa-rocket"
          iconColor="#fb7185"
        >
          <SelectControl
            value={settings.startupPage}
            options={STARTUP_PAGE_OPTIONS}
            onChange={(value) => updateSetting('startupPage', value as AppSettings['startupPage'])}
          />
        </SettingRow>

        <SettingRow
          title="Default export format"
          description="Choose the format Lumina should reach for when you export a recap or transcript."
          icon="fa-file-export"
          iconColor="#f59e0b"
        >
          <SelectControl
            value={settings.defaultExportFormat}
            options={EXPORT_FORMAT_OPTIONS}
            onChange={(value) => updateSetting('defaultExportFormat', value as ExportFormat)}
          />
        </SettingRow>

        <SettingRow
          title="Search behavior"
          description="Bias global search toward the most relevant match or the most recent activity."
          icon="fa-magnifying-glass"
          iconColor="#a78bfa"
        >
          <SelectControl
            value={settings.advancedSearchMode}
            options={SEARCH_MODE_OPTIONS}
            onChange={(value) => updateSetting('advancedSearchMode', value as SearchMode)}
          />
        </SettingRow>
      </SettingsSection>
    </div>
  );
};

export default PowerUserSettingsPage;
