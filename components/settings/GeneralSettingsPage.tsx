import React from 'react';
import type { AppSettings } from '../../contexts/SettingsContext';
import {
  DATE_FORMAT_OPTIONS,
  LANGUAGE_OPTIONS,
  SEARCH_MODE_OPTIONS,
  STARTUP_PAGE_OPTIONS,
} from './settingsConfig';
import {
  HighlightCard,
  ScopeBadge,
  SelectControl,
  SettingRow,
  SettingsSection,
  TextInputControl,
  Toggle,
} from './SettingsPrimitives';

interface GeneralSettingsPageProps {
  settings: AppSettings;
  isDark: boolean;
  onToggleTheme: () => void;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const GeneralSettingsPage: React.FC<GeneralSettingsPageProps> = ({
  settings,
  isDark,
  onToggleTheme,
  updateSetting,
}) => {
  return (
    <div className="space-y-5">
      <HighlightCard
        title="Daily control without drag"
        description="Shape the workspace around how you move: startup surface, density, motion, and search behavior."
        icon="fa-bolt"
      />

      <SettingsSection
        title="Appearance and rhythm"
        description="These controls make Lumina feel fast and personal every time you open it."
        badge={<ScopeBadge label="Personal" />}
      >
        <SettingRow
          title="Dark mode"
          description="Keep the workspace aligned with your current theme preference."
          icon="fa-circle-half-stroke"
          iconColor="#818cf8"
          scope={<ScopeBadge label={isDark ? 'Dark' : 'Light'} tone="highlight" />}
        >
          <div className="flex items-center justify-end">
            <Toggle checked={isDark} onChange={onToggleTheme} id="settings-dark-mode" />
          </div>
        </SettingRow>

        <SettingRow
          title="Compact mode"
          description="Reduce spacing in transcript-heavy and note-heavy views."
          icon="fa-table-cells-large"
          iconColor="#38bdf8"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.compactMode} onChange={(value) => updateSetting('compactMode', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Speed mode"
          description="Keep transitions snappy and optimize the interface for high-frequency use."
          icon="fa-gauge-high"
          iconColor="#22c55e"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.speedMode} onChange={(value) => updateSetting('speedMode', value)} />
          </div>
        </SettingRow>

        <SettingRow
          title="Reduced motion"
          description="Tone down movement and animated transitions while preserving layout clarity."
          icon="fa-person-walking-arrow-loop-left"
          iconColor="#f59e0b"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.reducedMotion} onChange={(value) => updateSetting('reducedMotion', value)} />
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Language and region"
        description="Keep dates, timezone, and copy behavior aligned with your operating context."
        badge={<ScopeBadge label="Personal" />}
      >
        <SettingRow title="Language" description="Interface and default UI language." icon="fa-language" iconColor="#60a5fa">
          <SelectControl
            value={settings.language}
            options={LANGUAGE_OPTIONS}
            onChange={(value) => updateSetting('language', value)}
          />
        </SettingRow>

        <SettingRow title="Timezone" description="Used in meeting timestamps, reminders, and exports." icon="fa-globe" iconColor="#22d3ee">
          <TextInputControl
            value={settings.timezone}
            placeholder="Africa/Accra"
            onChange={(value) => updateSetting('timezone', value)}
          />
        </SettingRow>

        <SettingRow title="Date format" description="How Lumina displays dates across recaps and notes." icon="fa-calendar" iconColor="#c084fc">
          <SelectControl
            value={settings.dateFormat}
            options={DATE_FORMAT_OPTIONS}
            onChange={(value) => updateSetting('dateFormat', value)}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Startup and navigation"
        description="Shape what Lumina opens first and how power features behave."
        badge={<ScopeBadge label="Power-ready" tone="highlight" />}
      >
        <SettingRow
          title="Default startup page"
          description="Choose the surface Lumina should open into after sign-in."
          icon="fa-house"
          iconColor="#4ade80"
        >
          <SelectControl
            value={settings.startupPage}
            options={STARTUP_PAGE_OPTIONS}
            onChange={(value) => updateSetting('startupPage', value as AppSettings['startupPage'])}
          />
        </SettingRow>

        <SettingRow
          title="Command palette"
          description="Keep the keyboard-first launcher available throughout the workspace."
          icon="fa-terminal"
          iconColor="#a78bfa"
        >
          <div className="flex items-center justify-end">
            <Toggle
              checked={settings.commandPaletteEnabled}
              onChange={(value) => updateSetting('commandPaletteEnabled', value)}
            />
          </div>
        </SettingRow>

        <SettingRow
          title="Shortcut hints"
          description="Show subtle keyboard callouts on power surfaces like search, export, and quick actions."
          icon="fa-keyboard"
          iconColor="#f472b6"
        >
          <div className="flex items-center justify-end">
            <Toggle
              checked={settings.keyboardShortcutHints}
              onChange={(value) => updateSetting('keyboardShortcutHints', value)}
            />
          </div>
        </SettingRow>

        <SettingRow
          title="Advanced search mode"
          description="Choose whether search feels more like command look-up or recent activity recall."
          icon="fa-magnifying-glass"
          iconColor="#fb7185"
        >
          <SelectControl
            value={settings.advancedSearchMode}
            options={SEARCH_MODE_OPTIONS}
            onChange={(value) => updateSetting('advancedSearchMode', value as AppSettings['advancedSearchMode'])}
          />
        </SettingRow>

        <SettingRow
          title="Auto-save"
          description="Save note edits continuously so scratchpads and working notes stay current."
          icon="fa-floppy-disk"
          iconColor="#34d399"
        >
          <div className="flex items-center justify-end">
            <Toggle checked={settings.autoSave} onChange={(value) => updateSetting('autoSave', value)} />
          </div>
        </SettingRow>
      </SettingsSection>
    </div>
  );
};

export default GeneralSettingsPage;
