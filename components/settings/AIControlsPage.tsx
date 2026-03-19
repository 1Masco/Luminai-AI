import React from 'react';
import type { AIOutputPreset, AppSettings } from '../../contexts/SettingsContext';
import {
  ACTION_ITEM_STRICTNESS_OPTIONS,
  DECISION_TRACKING_OPTIONS,
  FOCUS_AREA_OPTIONS,
  IGNORE_AREA_OPTIONS,
  STAKEHOLDER_MODE_OPTIONS,
  SUMMARY_STYLE_OPTIONS,
  SUMMARY_TONE_OPTIONS,
  SUMMARY_VERBOSITY_OPTIONS,
} from './settingsConfig';
import {
  ChipGroup,
  HighlightCard,
  ScopeBadge,
  SelectControl,
  SettingRow,
  SettingsSection,
  TextAreaControl,
} from './SettingsPrimitives';

interface AIControlsPageProps {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const AIControlsPage: React.FC<AIControlsPageProps> = ({ settings, updateSetting }) => {
  const activePreset =
    settings.aiOutputPresets.find((preset) => preset.id === settings.defaultAIPresetId) || settings.aiOutputPresets[0];

  const applyPreset = (preset: AIOutputPreset) => {
    updateSetting('defaultAIPresetId', preset.id);
    updateSetting('summaryStyle', preset.style);
    updateSetting('summaryTone', preset.tone);
    updateSetting('summaryVerbosity', preset.verbosity);
    updateSetting('actionItemStrictness', preset.actionItemStrictness);
    updateSetting('decisionTrackingMode', preset.decisionTracking);
    updateSetting('stakeholderOutputMode', preset.audience);
    updateSetting('summaryFocusAreas', preset.prioritize);
    updateSetting('summaryIgnoreAreas', preset.ignore);
    updateSetting('recapDeliveryChannels', preset.deliveryChannels);
  };

  const toggleListValue = (key: 'summaryFocusAreas' | 'summaryIgnoreAreas', value: string) => {
    const currentValues = settings[key];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value];
    updateSetting(key, nextValues as AppSettings[typeof key]);
  };

  return (
    <div className="space-y-5">
      <HighlightCard
        title="This is where Lumina becomes yours"
        description="Competitors let you manage capture. Lumina should let you control the intelligence layer itself."
        icon="fa-sparkles"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {settings.aiOutputPresets.map((preset) => {
            const active = preset.id === settings.defaultAIPresetId;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-[24px] border p-4 text-left transition-all"
                style={{
                  backgroundColor: active ? 'rgba(99,102,241,0.14)' : 'var(--card-bg)',
                  borderColor: active ? 'rgba(99,102,241,0.35)' : 'var(--border-primary)',
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {preset.name}
                  </h3>
                  {active && <ScopeBadge label="Default" tone="highlight" />}
                </div>
                <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
                  {preset.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                  <span>{preset.style}</span>
                  <span>{preset.tone}</span>
                  <span>{preset.verbosity}</span>
                </div>
              </button>
            );
          })}
        </div>
      </HighlightCard>

      <SettingsSection
        title="Output profile"
        description="Set the default structure, tone, and density of Lumina recaps."
        badge={<ScopeBadge label="Preset-aware" tone="highlight" />}
      >
        <SettingRow title="Summary style" description="Choose the base format for outputs." icon="fa-file-lines" iconColor="#818cf8">
          <SelectControl
            value={settings.summaryStyle}
            options={SUMMARY_STYLE_OPTIONS}
            onChange={(value) => updateSetting('summaryStyle', value as AppSettings['summaryStyle'])}
          />
        </SettingRow>

        <SettingRow title="Tone" description="Shape how professional, direct, or client-friendly the copy feels." icon="fa-pen-ruler" iconColor="#22d3ee">
          <SelectControl
            value={settings.summaryTone}
            options={SUMMARY_TONE_OPTIONS}
            onChange={(value) => updateSetting('summaryTone', value as AppSettings['summaryTone'])}
          />
        </SettingRow>

        <SettingRow title="Verbosity" description="Decide how much detail Lumina should keep by default." icon="fa-align-left" iconColor="#34d399">
          <SelectControl
            value={settings.summaryVerbosity}
            options={SUMMARY_VERBOSITY_OPTIONS}
            onChange={(value) => updateSetting('summaryVerbosity', value as AppSettings['summaryVerbosity'])}
          />
        </SettingRow>

        <SettingRow
          title="Stakeholder mode"
          description="Bias the output for yourself, leaders, clients, teams, or interview panels."
          icon="fa-user-gear"
          iconColor="#f59e0b"
        >
          <SelectControl
            value={settings.stakeholderOutputMode}
            options={STAKEHOLDER_MODE_OPTIONS}
            onChange={(value) => updateSetting('stakeholderOutputMode', value as AppSettings['stakeholderOutputMode'])}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Extraction and prioritization"
        description="Control what Lumina should surface, what it should ignore, and how strict the extraction logic should be."
        badge={<ScopeBadge label="Advanced" tone="workspace" />}
      >
        <SettingRow
          title="Action item strictness"
          description="Loose captures more possibilities. Strict requires stronger evidence and ownership."
          icon="fa-list-check"
          iconColor="#22c55e"
        >
          <SelectControl
            value={settings.actionItemStrictness}
            options={ACTION_ITEM_STRICTNESS_OPTIONS}
            onChange={(value) => updateSetting('actionItemStrictness', value as AppSettings['actionItemStrictness'])}
          />
        </SettingRow>

        <SettingRow
          title="Decision tracking"
          description="Choose whether Lumina logs only major decisions or also includes rationale."
          icon="fa-scale-balanced"
          iconColor="#fb7185"
        >
          <SelectControl
            value={settings.decisionTrackingMode}
            options={DECISION_TRACKING_OPTIONS}
            onChange={(value) => updateSetting('decisionTrackingMode', value as AppSettings['decisionTrackingMode'])}
          />
        </SettingRow>

        <SettingRow
          title="Prioritize"
          description="Tell Lumina what it should actively bias toward in summaries."
          icon="fa-bullseye"
          iconColor="#a78bfa"
        >
          <ChipGroup
            options={FOCUS_AREA_OPTIONS}
            selected={settings.summaryFocusAreas}
            onToggle={(value) => toggleListValue('summaryFocusAreas', value)}
          />
        </SettingRow>

        <SettingRow
          title="Ignore"
          description="Reduce clutter by explicitly removing noise categories from recap generation."
          icon="fa-eye-slash"
          iconColor="#f97316"
        >
          <ChipGroup
            options={IGNORE_AREA_OPTIONS}
            selected={settings.summaryIgnoreAreas}
            onToggle={(value) => toggleListValue('summaryIgnoreAreas', value)}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Prompt guidance"
        description="Use lightweight instruction notes for edge cases without turning the product into a raw prompt editor."
        badge={<ScopeBadge label="Power user" tone="workspace" />}
      >
        <TextAreaControl
          value={settings.customPromptNotes}
          placeholder="Example: For product review meetings, always capture tradeoffs, owner names, and explicit unresolved questions."
          onChange={(value) => updateSetting('customPromptNotes', value)}
        />

        <div
          className="rounded-2xl border p-4"
          style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
            Preview
          </p>
          <h4 className="mt-2 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {activePreset?.name}
          </h4>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            {settings.summaryVerbosity === 'brief'
              ? 'Lead with the key decision, risks, and next step owners.'
              : settings.summaryVerbosity === 'detailed'
                ? 'Capture full rationale, tradeoffs, blockers, and accountable next steps with context.'
                : 'Summarize the core conversation with clear owners, deadlines, and decisions.'}
          </p>
        </div>
      </SettingsSection>
    </div>
  );
};

export default AIControlsPage;
