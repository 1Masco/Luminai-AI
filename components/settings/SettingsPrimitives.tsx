import React from 'react';
import ContrastSwitch from '../common/ContrastSwitch';

type ScopeTone = 'personal' | 'workspace' | 'policy' | 'highlight';

const SCOPE_STYLES: Record<ScopeTone, { bg: string; text: string }> = {
  personal: { bg: 'rgba(37,99,235,0.14)', text: '#60a5fa' },
  workspace: { bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
  policy: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
  highlight: { bg: 'rgba(99,102,241,0.14)', text: '#a5b4fc' },
};

export const ScopeBadge: React.FC<{ label: string; tone?: ScopeTone }> = ({ label, tone = 'personal' }) => {
  const style = SCOPE_STYLES[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
};

export const SettingsSection: React.FC<{
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, badge, children }) => (
  <section
    className="rounded-[28px] border p-5 md:p-6"
    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-primary)' }}
  >
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      {badge}
    </div>
    <div className="space-y-3">{children}</div>
  </section>
);

export const SettingRow: React.FC<{
  title: string;
  description?: string;
  icon: string;
  iconColor?: string;
  scope?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, icon, iconColor = '#93c5fd', scope, children }) => (
  <div
    className="flex flex-col gap-4 rounded-2xl border px-4 py-4 md:flex-row md:items-center md:justify-between"
    style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)' }}
  >
    <div className="flex min-w-0 items-start gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${iconColor}18`, color: iconColor }}
      >
        <i className={`fas ${icon} text-sm`} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h4>
          {scope}
        </div>
        {description && (
          <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
    <div className="md:max-w-[360px] md:min-w-[220px]">{children}</div>
  </div>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (value: boolean) => void; id?: string }> = ({
  checked,
  onChange,
  id,
}) => <ContrastSwitch id={id} checked={checked} onChange={onChange} />;

export const SelectControl: React.FC<{
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ value, options, onChange }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-brand-500/20"
    style={{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-primary)',
    }}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export const ChipGroup: React.FC<{
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}> = ({ options, selected, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => {
      const active = selected.includes(option);
      return (
        <button
          key={option}
          type="button"
          onClick={() => onToggle(option)}
          className="rounded-full border px-3 py-2 text-xs font-bold capitalize transition-all"
          style={{
            backgroundColor: active ? 'rgba(99,102,241,0.16)' : 'var(--card-bg)',
            color: active ? '#c7d2fe' : 'var(--text-secondary)',
            borderColor: active ? 'rgba(99,102,241,0.45)' : 'var(--border-primary)',
          }}
        >
          {option}
        </button>
      );
    })}
  </div>
);

export const SegmentedControl: React.FC<{
  value: string;
  options: Array<{ value: string; label: string; description?: string }>;
  onChange: (value: string) => void;
}> = ({ value, options, onChange }) => (
  <div
    className="grid gap-2 rounded-3xl border p-2"
    style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-primary)' }}
  >
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className="rounded-2xl px-4 py-3 text-left transition-all"
          style={{
            background: active ? 'linear-gradient(135deg, rgba(79,70,229,0.25), rgba(15,23,42,0.08))' : 'transparent',
            border: active ? '1px solid rgba(99,102,241,0.35)' : '1px solid transparent',
          }}
        >
          <div className="text-sm font-bold" style={{ color: active ? '#c7d2fe' : 'var(--text-primary)' }}>
            {option.label}
          </div>
          {option.description && (
            <p className="mt-1 text-xs leading-5" style={{ color: 'var(--text-secondary)' }}>
              {option.description}
            </p>
          )}
        </button>
      );
    })}
  </div>
);

export const HighlightCard: React.FC<{
  title: string;
  description: string;
  icon: string;
  accent?: string;
  children?: React.ReactNode;
}> = ({ title, description, icon, accent = '#6366f1', children }) => (
  <div
    className="rounded-[28px] border p-5 md:p-6"
    style={{
      background: `linear-gradient(135deg, ${accent}14 0%, rgba(15,23,42,0.06) 100%)`,
      borderColor: 'rgba(99,102,241,0.22)',
    }}
  >
    <div className="mb-4 flex items-start gap-3">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${accent}22`, color: accent }}
      >
        <i className={`fas ${icon} text-sm`} />
      </div>
      <div>
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p className="mt-1 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
    </div>
    {children}
  </div>
);

export const MiniStat: React.FC<{ label: string; value: string; tone?: ScopeTone }> = ({
  label,
  value,
  tone = 'highlight',
}) => {
  const style = SCOPE_STYLES[tone];
  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-primary)' }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      <p className="mt-1 text-sm font-bold" style={{ color: style.text }}>
        {value}
      </p>
    </div>
  );
};

export const TextAreaControl: React.FC<{
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}> = ({ value, placeholder, onChange }) => (
  <textarea
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    className="min-h-[110px] w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/20"
    style={{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-primary)',
    }}
  />
);

export const TextInputControl: React.FC<{
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({ value, placeholder, onChange }) => (
  <input
    type="text"
    value={value}
    placeholder={placeholder}
    onChange={(event) => onChange(event.target.value)}
    className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-brand-500/20"
    style={{
      backgroundColor: 'var(--card-bg)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-primary)',
    }}
  />
);
