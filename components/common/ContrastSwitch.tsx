import React from 'react';

type ContrastSwitchSize = 'sm' | 'md';

interface ContrastSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  id?: string;
  disabled?: boolean;
  size?: ContrastSwitchSize;
  showStateLabels?: boolean;
  ariaLabel?: string;
}

const SIZE_MAP: Record<ContrastSwitchSize, {
  width: number;
  height: number;
  knob: number;
  translate: number;
  paddingX: number;
  onLeft: number;
  offRight: number;
  fontSize: number;
}> = {
  sm: {
    width: 54,
    height: 30,
    knob: 22,
    translate: 22,
    paddingX: 4,
    onLeft: 9,
    offRight: 8,
    fontSize: 8,
  },
  md: {
    width: 58,
    height: 32,
    knob: 24,
    translate: 26,
    paddingX: 4,
    onLeft: 10,
    offRight: 9,
    fontSize: 9,
  },
};

const ContrastSwitch: React.FC<ContrastSwitchProps> = ({
  checked,
  onChange,
  id,
  disabled = false,
  size = 'md',
  showStateLabels = true,
  ariaLabel,
}) => {
  const metrics = SIZE_MAP[size];

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        width: `${metrics.width}px`,
        height: `${metrics.height}px`,
        paddingLeft: `${metrics.paddingX}px`,
        paddingRight: `${metrics.paddingX}px`,
        background: checked ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : 'linear-gradient(135deg, #dbe4f0, #a8b6ca)',
        border: checked ? '1px solid rgba(79,70,229,0.72)' : '1px solid rgba(100,116,139,0.55)',
        boxShadow: checked
          ? '0 8px 18px rgba(79,70,229,0.22), inset 0 1px 0 rgba(255,255,255,0.16)'
          : 'inset 0 1px 2px rgba(15,23,42,0.18)',
      }}
    >
      {showStateLabels && (
        <>
          <span
            aria-hidden="true"
            className="absolute font-black tracking-[0.14em] transition-opacity"
            style={{
              left: `${metrics.onLeft}px`,
              fontSize: `${metrics.fontSize}px`,
              color: 'rgba(255,255,255,0.92)',
              opacity: checked ? 1 : 0.28,
            }}
          >
            ON
          </span>
          <span
            aria-hidden="true"
            className="absolute font-black tracking-[0.12em] transition-opacity"
            style={{
              right: `${metrics.offRight}px`,
              fontSize: `${metrics.fontSize}px`,
              color: checked ? 'rgba(255,255,255,0.45)' : '#334155',
              opacity: checked ? 0.35 : 0.96,
            }}
          >
            OFF
          </span>
        </>
      )}

      <span
        className="inline-block rounded-full transition-transform"
        style={{
          width: `${metrics.knob}px`,
          height: `${metrics.knob}px`,
          transform: checked ? `translateX(${metrics.translate}px)` : 'translateX(0px)',
          background: checked ? '#ffffff' : 'linear-gradient(135deg, #ffffff, #f8fafc)',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 2px 8px rgba(15,23,42,0.18)',
        }}
      />
    </button>
  );
};

export default ContrastSwitch;
