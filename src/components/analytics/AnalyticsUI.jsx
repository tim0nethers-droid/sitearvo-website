import { Download, LineChart } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const palette = {
  gold: '#f5a800',
  lightGold: '#ffc94a',
  green: '#35c67a',
  blue: '#4fa7ff',
  rose: '#ff7aa2',
  purple: '#9d7cff',
  muted: '#8b8f98',
};

const metricDefaults = {
  visits: { label: 'Visits', accent: 'gold' },
  visitors: { label: 'Visitors', accent: 'lightGold' },
  orders: { label: 'Orders', accent: 'green' },
  enquiries: { label: 'Enquiries', accent: 'blue' },
  revenue: { label: 'Revenue', accent: 'gold', isCurrency: true },
  conversion_rate: { label: 'Conversion Rate', accent: 'purple', isPercent: true },
};

const percentFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const integerFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

const moneyFormat = currency => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const startOfDay = date => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = date => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const toDateInput = date => new Date(date).toISOString().slice(0, 10);

const formatShortDate = date => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const formatLongDate = date => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function formatAnalyticsRangeLabel(range = 'last_7_days', start = '', end = '') {
  if (!start || !end) {
    const labels = {
      today: 'Today',
      yesterday: 'Yesterday',
      last_7_days: 'Last 7 Days',
      last_30_days: 'Last 30 Days',
      last_90_days: 'Last 90 Days',
      this_month: 'This Month',
      last_month: 'Last Month',
      this_year: 'This Year',
      custom: 'Custom Range',
    };
    return labels[range] || 'Analytics';
  }
  return `${formatRangeTitle(range)}: ${formatShortDate(start)} - ${formatShortDate(end)}`;
}

export function formatRangeTitle(range = 'last_7_days') {
  return ({
    today: 'Today',
    yesterday: 'Yesterday',
    last_7_days: 'Last 7 Days',
    last_30_days: 'Last 30 Days',
    last_90_days: 'Last 90 Days',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    custom: 'Custom Range',
  })[range] || 'Analytics';
}

export function formatAnalyticsValue(metric, value, currency = 'INR') {
  const defaults = metricDefaults[metric] || {};
  const numeric = Number(value || 0);
  if (defaults.isPercent) return `${percentFormat.format(numeric)}%`;
  if (defaults.isCurrency || metric === 'revenue') return moneyFormat(currency).format(numeric);
  return integerFormat.format(numeric);
}

export function AnalyticsSummaryCard({ label, value, change, detail, active = false, onClick, icon: Icon }) {
  const Element = onClick ? 'button' : 'article';
  const changeLabel = change === null || change === undefined ? 'No previous-period comparison' : `${change > 0 ? '↑' : change < 0 ? '↓' : '•'} ${percentFormat.format(Math.abs(change))}% vs previous period`;
  const elementProps = onClick ? { type: 'button' } : {};
  return (
    <Element {...elementProps} className={`analytics-summary-card ${active ? 'is-active' : ''}`} onClick={onClick}>
      <div className="analytics-summary-card__top">
        <span>{label}</span>
        {Icon && <Icon size={17} aria-hidden="true" />}
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
      <em>{changeLabel}</em>
    </Element>
  );
}

export function AnalyticsDateRange({ range, start, end, onRangeChange, onStartChange, onEndChange, compact = false, hideLabel = false }) {
  const options = [
    ['today', 'Today'],
    ['yesterday', 'Yesterday'],
    ['last_7_days', 'Last 7 Days'],
    ['last_30_days', 'Last 30 Days'],
    ['last_90_days', 'Last 90 Days'],
    ['this_month', 'This Month'],
    ['last_month', 'Last Month'],
    ['this_year', 'This Year'],
    ['custom', 'Custom Range'],
  ];

  return (
    <div className={`analytics-range ${compact ? 'is-compact' : ''}`}>
      <label className="analytics-range__select">
        {!hideLabel && <span>Date Range</span>}
        <select value={range} onChange={event => onRangeChange(event.target.value)}>
          {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      {range === 'custom' && (
        <>
          <label className="analytics-range__select">
            <span>Start</span>
            <input type="date" value={start} onChange={event => onStartChange(event.target.value)} />
          </label>
          <label className="analytics-range__select">
            <span>End</span>
            <input type="date" value={end} onChange={event => onEndChange(event.target.value)} />
          </label>
        </>
      )}
    </div>
  );
}

export function AnalyticsLineChart({
  title,
  subtitle,
  data = [],
  series = [],
  currency = 'INR',
  loading = false,
  compact = false,
  height = 380,
  action = null,
  emptyMessage = 'No analytics data for this period. Try selecting another date range.',
}) {
  const [activeIndex, setActiveIndex] = useState(data.length ? data.length - 1 : null);
  useEffect(() => {
    setActiveIndex(data.length ? data.length - 1 : null);
  }, [data]);

  const chart = useMemo(() => {
    const width = 980;
    const padding = compact ? { top: 22, right: 24, bottom: 48, left: 54 } : { top: 28, right: 28, bottom: 58, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const visibleSeries = series.slice(0, 2).map(item => ({
      ...item,
      color: item.color || 'gold',
      values: data.map(row => Number(row?.[item.key] || 0)),
    }));
    const maxValue = Math.max(1, ...visibleSeries.flatMap(item => item.values));
    const axisMetric = visibleSeries[0]?.key || 'visits';
    const points = data.map((row, index) => {
      const x = padding.left + (data.length <= 1 ? chartWidth / 2 : (index / Math.max(1, data.length - 1)) * chartWidth);
      return {
        index,
        x,
        yValues: visibleSeries.map(item => padding.top + chartHeight - (Number(row?.[item.key] || 0) / maxValue) * chartHeight),
        row,
      };
    });
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(tick => ({
      tick,
      value: maxValue * tick,
      y: padding.top + chartHeight - tick * chartHeight,
    }));
    return { width, height, padding, chartWidth, chartHeight, visibleSeries, maxValue, points, yTicks, axisMetric };
  }, [data, series, compact, height]);

  const activePoint = activeIndex !== null ? chart.points[activeIndex] : null;
  const activeSeriesValues = activePoint
    ? chart.visibleSeries.map((item, index) => ({
        ...item,
        value: Number(activePoint.row?.[item.key] || 0),
        y: activePoint.yValues[index],
      }))
    : [];

  const buildPath = values => values.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  const renderPath = key => {
    const coords = chart.points.map(point => ({
      x: point.x,
      y: point.yValues[chart.visibleSeries.findIndex(item => item.key === key)],
    }));
    return buildPath(coords);
  };

  const activeTooltip = activeSeriesValues.length ? {
    left: `${clamp((activePoint.x / chart.width) * 100, 8, 88)}%`,
    top: `${clamp((activePoint.yValues[0] / chart.height) * 100, 10, 76)}%`,
  } : null;

  const maxLabelStep = data.length > 12 ? Math.ceil(data.length / 8) : 1;
  const formatYAxisLabel = value => formatAnalyticsValue(chart.axisMetric, value, currency).replace(/\.00$/, '');

  return (
    <section className={`analytics-chart ${loading ? 'is-loading' : ''}`}>
      <header className="analytics-chart__header">
        <div>
          <span className="eyebrow">{title}</span>
          <h2>{subtitle || title}</h2>
        </div>
        <div className="analytics-chart__header-actions">
          {action}
          <span className="analytics-chart__badge"><LineChart size={16} /> {data.length ? `${data.length} points` : 'No data'}</span>
        </div>
      </header>
      {loading ? (
        <div className="analytics-chart__skeleton" aria-hidden="true">
          <div className="analytics-chart__skeleton-bars" />
          <div className="analytics-chart__skeleton-line" />
        </div>
      ) : data.length ? (
        <div className="analytics-chart__wrap">
          <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={title}>
            <defs>
              {chart.visibleSeries.map(item => (
                <linearGradient key={item.key} id={`analytics-fill-${item.key}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={palette[item.color] || palette.gold} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={palette[item.color] || palette.gold} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>

            {chart.yTicks.map(tick => (
              <g key={tick.tick} className="analytics-chart__grid">
                <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={tick.y} y2={tick.y} />
                <text x={chart.padding.left - 12} y={tick.y + 4} textAnchor="end">{formatYAxisLabel(tick.value)}</text>
              </g>
            ))}

            {chart.visibleSeries.map((item, seriesIndex) => {
              const points = chart.points.map(point => ({
                x: point.x,
                y: point.yValues[seriesIndex],
              }));
              const path = buildPath(points);
              const area = `${path} L ${chart.points.at(-1)?.x || chart.padding.left} ${chart.height - chart.padding.bottom} L ${chart.points[0]?.x || chart.padding.left} ${chart.height - chart.padding.bottom} Z`;
              return (
                <g key={item.key}>
                  <path d={area} fill={`url(#analytics-fill-${item.key})`} className={`analytics-chart__area tone-${item.color}`} />
                  <path d={path} className={`analytics-chart__line tone-${item.color} ${seriesIndex === 1 ? 'is-secondary' : ''}`} />
                  {points.map((point, index) => (
                    <g key={`${item.key}-${index}`}>
                      <circle cx={point.x} cy={point.y} r={seriesIndex === 0 ? 4.5 : 4} className={`analytics-chart__point tone-${item.color}`} />
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="15"
                        className="analytics-chart__hotspot"
                        tabIndex={0}
                        role="button"
                        aria-label={`${item.label || item.key} ${chart.points[index].row?.label || chart.points[index].row?.date || ''}`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onFocus={() => setActiveIndex(index)}
                        onClick={() => setActiveIndex(index)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setActiveIndex(index);
                          }
                        }}
                      />
                    </g>
                  ))}
                </g>
              );
            })}

            {chart.points.map((point, index) => (
              <g key={`label-${point.index}`} className="analytics-chart__axis-label">
                <text x={point.x} y={chart.height - 16} textAnchor="middle">{index === 0 || index === chart.points.length - 1 || index % maxLabelStep === 0 ? (point.row?.label || point.row?.date || '') : ''}</text>
              </g>
            ))}
          </svg>

          {activeTooltip && activePoint && (
            <div className="analytics-chart__tooltip" style={activeTooltip}>
              <strong>{activePoint.row?.label || activePoint.row?.date}</strong>
              {chart.visibleSeries.map(item => {
                const value = Number(activePoint.row?.[item.key] || 0);
                return (
                  <div key={item.key}>
                    <span><i className={`tone-${item.color}`} />{item.label || metricDefaults[item.key]?.label || item.key}</span>
                    <b>{formatAnalyticsValue(item.key, value, currency)}</b>
                  </div>
                );
              })}
              {activePoint.row?.visitors !== undefined && (
                <small>
                  Visitors: {integerFormat.format(Number(activePoint.row.visitors || 0))}
                </small>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="analytics-chart__empty" role="status">
          <div>
            <p>{emptyMessage}</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function AnalyticsExportButton({ filename, rows = [], currency = 'INR', label = 'Export CSV' }) {
  const exportCsv = () => {
    if (!rows.length || typeof document === 'undefined') return;
    const headers = ['Date', 'Visits', 'Visitors', 'Orders', 'Enquiries', 'Revenue'];
    const csv = [
      headers.join(','),
      ...rows.map(row => [
        JSON.stringify(row.date || ''),
        Number(row.visits || 0),
        Number(row.visitors || 0),
        Number(row.orders || 0),
        Number(row.enquiries || 0),
        Number(row.revenue || 0),
      ].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'sitearvo-analytics.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button type="button" className="button button--secondary analytics-export" onClick={exportCsv}>
      <Download size={16} /> {label}
    </button>
  );
}

export function AnalyticsRangeSummary({ rangeLabel, updatedLabel }) {
  return (
    <div className="analytics-range-summary">
      <strong>{rangeLabel}</strong>
      {updatedLabel && <span>{updatedLabel}</span>}
    </div>
  );
}
