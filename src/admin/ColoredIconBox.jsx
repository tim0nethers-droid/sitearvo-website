import { forwardRef } from 'react';

const themes = {
  blue: { color: '#3B82F6', background: 'rgba(59,130,246,.14)' },
  green: { color: '#22C55E', background: 'rgba(34,197,94,.14)' },
  purple: { color: '#8B5CF6', background: 'rgba(139,92,246,.14)' },
  orange: { color: '#F97316', background: 'rgba(249,115,22,.14)' },
  red: { color: '#EF4444', background: 'rgba(239,68,68,.14)' },
  cyan: { color: '#06B6D4', background: 'rgba(6,182,212,.14)' },
  gold: { color: '#F5A800', background: 'rgba(245,168,0,.14)' },
  pink: { color: '#EC4899', background: 'rgba(236,72,153,.14)' },
  gray: { color: '#B8BEC7', background: 'rgba(184,190,199,.12)' },
};

const ColoredIconBox = forwardRef(function ColoredIconBox({ icon: Icon, color = 'gold', size = 20, className = '', label, title, ...props }, ref) {
  const theme = themes[color] || themes.gold;
  return (
    <span
      ref={ref}
      className={`colored-icon-box ${className}`.trim()}
      style={{ color: theme.color, background: theme.background }}
      aria-hidden={label ? undefined : 'true'}
      title={title || label}
      {...props}
    >
      {Icon ? <Icon size={size} strokeWidth={2} aria-hidden="true" /> : null}
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
});

export default ColoredIconBox;
