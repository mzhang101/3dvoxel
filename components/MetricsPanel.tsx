import React from 'react';
import { EvaluationScores, LLMJudgeScores } from '../types';
import { BarChart3, Brain, CircleHelp } from 'lucide-react';
import { useT } from '../i18n/LocaleContext';

interface MetricsPanelProps {
  left: { label: string; eval: EvaluationScores; judge?: LLMJudgeScores } | null;
  right: { label: string; eval: EvaluationScores; judge?: LLMJudgeScores } | null;
}

interface MetricGuideItem {
  id: string;
  nameKey: string;
  meaningKey: string;
  betterKey: string;
}

const METRIC_GUIDE: readonly MetricGuideItem[] = [
  { id: 'voxel_count',     nameKey: 'metric.voxel_count',     meaningKey: 'metric.voxel_count.meaning',     betterKey: 'metric.voxel_count.better' },
  { id: 'connectivity',    nameKey: 'metric.connectivity',    meaningKey: 'metric.connectivity.meaning',    betterKey: 'metric.connectivity.better' },
  { id: 'symmetry',        nameKey: 'metric.symmetry',        meaningKey: 'metric.symmetry.meaning',        betterKey: 'metric.symmetry.better' },
  { id: 'color_diversity', nameKey: 'metric.color_diversity', meaningKey: 'metric.color_diversity.meaning', betterKey: 'metric.color_diversity.better' },
  { id: 'hsl_variance',    nameKey: 'metric.hsl_variance',    meaningKey: 'metric.hsl_variance.meaning',    betterKey: 'metric.hsl_variance.better' },
  { id: 'centering_error', nameKey: 'metric.centering_error', meaningKey: 'metric.centering_error.meaning', betterKey: 'metric.centering_error.better' },
  { id: 'surface_ratio',   nameKey: 'metric.surface_ratio',   meaningKey: 'metric.surface_ratio.meaning',   betterKey: 'metric.surface_ratio.better' },
  { id: 'floor_ok',        nameKey: 'metric.floor_ok',        meaningKey: 'metric.floor_ok.meaning',        betterKey: 'metric.floor_ok.better' },
] as const;

interface JudgeGuideItem {
  id: string;
  nameKey: string;
  meaningKey: string;
}

const JUDGE_GUIDE: readonly JudgeGuideItem[] = [
  { id: 'prompt',    nameKey: 'judge.prompt',    meaningKey: 'judge.prompt.meaning' },
  { id: 'structure', nameKey: 'judge.structure', meaningKey: 'judge.structure.meaning' },
  { id: 'aesthetic', nameKey: 'judge.aesthetic', meaningKey: 'judge.aesthetic.meaning' },
  { id: 'creative',  nameKey: 'judge.creative',  meaningKey: 'judge.creative.meaning' },
] as const;

function getMetricGuide(id: string): MetricGuideItem | undefined {
  return METRIC_GUIDE.find((item) => item.id === id);
}

// ---- Helpers ----

function fmt(v: number, decimals = 2): string {
  return Number.isFinite(v) ? v.toFixed(decimals) : '—';
}

type Direction = 'higher' | 'lower' | 'neutral';

function winner(a: number, b: number, dir: Direction): 'left' | 'right' | 'tie' {
  if (dir === 'neutral') return 'tie';
  const diff = a - b;
  if (Math.abs(diff) < 0.001) return 'tie';
  if (dir === 'higher') return diff > 0 ? 'left' : 'right';
  return diff < 0 ? 'left' : 'right';
}

function cellColor(side: 'left' | 'right', w: 'left' | 'right' | 'tie'): string {
  if (w === 'tie') return 'text-slate-600';
  return w === side ? 'text-emerald-600 font-bold' : 'text-slate-400';
}

// ---- SVG Radar ----

function RadarChart({ left, right }: { left: number[]; right: number[] }) {
  const labels = ['Prompt', 'Structure', 'Aesthetic', 'Creative'];
  const cx = 90, cy = 90, maxR = 70;
  const n = labels.length;

  function polygon(values: number[], color: string, fill: string) {
    const pts = values.map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (v / 10) * maxR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return (
      <polygon
        points={pts.join(' ')}
        fill={fill}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    );
  }

  const gridLines = [0.25, 0.5, 0.75, 1].map(s => {
    const pts = Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = s * maxR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    });
    return <polygon key={s} points={pts.join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
  });

  const axisLines = Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return (
      <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="#e2e8f0" strokeWidth="1" />
    );
  });

  const axisLabels = labels.map((label, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lr = maxR + 16;
    return (
      <text key={label} x={cx + lr * Math.cos(angle)} y={cy + lr * Math.sin(angle)} textAnchor="middle" dominantBaseline="central" className="fill-slate-500 text-[10px] font-semibold">
        {label}
      </text>
    );
  });

  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[200px] mx-auto">
      {gridLines}
      {axisLines}
      {right.length > 0 && polygon(right, '#6366f1', 'rgba(99,102,241,0.15)')}
      {left.length > 0 && polygon(left, '#d4d76a', 'rgba(212,215,106,0.2)')}
      {axisLabels}
    </svg>
  );
}

// ---- Component ----

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ left, right }) => {
  const t = useT();
  const [showGuide, setShowGuide] = React.useState(false);

  if (!left && !right) return null;

  const hasBoth = !!left && !!right;

  type Row = {
    id: string;
    label: string;
    lVal: string;
    rVal: string;
    dir: Direction;
    lNum: number;
    rNum: number;
    guide?: MetricGuideItem;
  };

  function buildRows(): Row[] {
    const le = left?.eval;
    const re = right?.eval;
    const rows: Row[] = [];

    const push = (id: string, nameKey: string, lv: number | undefined, rv: number | undefined, dir: Direction, dec = 2) => {
      rows.push({
        id,
        label: t(nameKey),
        lVal: lv != null ? fmt(lv, dec) : '—',
        rVal: rv != null ? fmt(rv, dec) : '—',
        dir,
        lNum: lv ?? 0,
        rNum: rv ?? 0,
        guide: getMetricGuide(id),
      });
    };

    push('voxel_count',     'metric.voxel_count',     le?.voxelCount,                           re?.voxelCount,                           'neutral', 0);
    push('connectivity',    'metric.connectivity',    le?.connectivity.componentCount,          re?.connectivity.componentCount,          'lower', 0);
    push('symmetry',        'metric.symmetry',        le?.symmetryScore,                         re?.symmetryScore,                         'higher');
    push('color_diversity', 'metric.color_diversity', le?.colorDiversity.uniqueColorCount,       re?.colorDiversity.uniqueColorCount,       'higher', 0);
    push('hsl_variance',    'metric.hsl_variance',    le?.colorDiversity.hslVariance,            re?.colorDiversity.hslVariance,            'higher', 4);
    push('centering_error', 'metric.centering_error', le?.centeringError.distance,               re?.centeringError.distance,               'lower');
    push('surface_ratio',   'metric.surface_ratio',   le?.surfaceRatio,                          re?.surfaceRatio,                          'higher');
    push('floor_ok',        'metric.floor_ok',        le?.floorCompliance ? 1 : 0,               re?.floorCompliance ? 1 : 0,               'higher', 0);

    return rows;
  }

  const rows = buildRows();

  const leftJudge = left?.judge ? [left.judge.promptAdherence, left.judge.structuralQuality, left.judge.aestheticScore, left.judge.creativity] : [];
  const rightJudge = right?.judge ? [right.judge.promptAdherence, right.judge.structuralQuality, right.judge.aestheticScore, right.judge.creativity] : [];
  const hasRadar = leftJudge.length > 0 || rightJudge.length > 0;

  return (
    <div className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg p-5 font-sans w-full max-w-[560px] mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-[#a1a43a]" />
          <span className="font-bold text-slate-800 tracking-tight">{t('metrics.title')}</span>
        </div>

        <button
          onClick={() => setShowGuide(prev => !prev)}
          className={`w-8 h-8 rounded-full border text-sm font-black transition-all ${showGuide ? 'bg-[#f4f5d3] text-[#8e9234] border-[#d4d76a]/60' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300'}`}
          title={t('metrics.help_aria')}
          aria-label={t('metrics.help_aria')}
        >
          ?
        </button>
      </div>

      {showGuide && (
        <div className="mb-4 rounded-2xl border border-[#dfe4a6] bg-[#fbfce8] px-4 py-4 shadow-sm">
          <div className="grid gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8e9234]">{t('metrics.guide_title')}</p>
              <div className="mt-2 grid gap-2">
                {METRIC_GUIDE.map((item) => (
                  <div key={item.id} className="rounded-xl bg-white/70 px-3 py-2 border border-white/60">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-800">{t(item.nameKey)}</span>
                      <span className="text-[10px] font-black uppercase tracking-wide text-[#8e9234]">{t(item.betterKey)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{t(item.meaningKey)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">{t('metrics.judge_guide_title')}</p>
              <div className="mt-2 grid gap-2">
                {JUDGE_GUIDE.map((item) => (
                  <div key={item.id} className="rounded-xl bg-white/70 px-3 py-2 border border-white/60">
                    <span className="text-sm font-bold text-slate-800">{t(item.nameKey)}</span>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{t(item.meaningKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 pr-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">{t('metrics.column.metric')}</th>
              <th className="text-right py-2 px-3 text-[#a1a43a] font-bold text-xs uppercase tracking-wider">{left?.label ?? t('metrics.column.left')}</th>
              {hasBoth && (
                <th className="text-right py-2 pl-3 text-indigo-500 font-bold text-xs uppercase tracking-wider">{right?.label ?? t('metrics.column.right')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, index) => {
              const w = hasBoth ? winner(r.lNum, r.rNum, r.dir) : 'tie';
              const preferAbove = index >= rows.length - 3;

              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-1.5 pr-3 text-slate-600 font-medium">
                    <div className="inline-flex items-center gap-2">
                      <span>{r.label}</span>
                      {r.guide && <MetricHelpBadge item={r.guide} preferAbove={preferAbove} />}
                    </div>
                  </td>
                  <td className={`py-1.5 px-3 text-right font-mono ${hasBoth ? cellColor('left', w) : 'text-slate-700'}`}>{r.lVal}</td>
                  {hasBoth && (
                    <td className={`py-1.5 pl-3 text-right font-mono ${cellColor('right', w)}`}>{r.rVal}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* LLM Judge Radar */}
      {hasRadar && (
        <div className="mt-5 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-[#a1a43a]" />
            <span className="font-bold text-slate-800 text-sm tracking-tight">{t('metrics.judge_title')}</span>
            <JudgeHelpBadge />
          </div>
          <RadarChart left={leftJudge} right={rightJudge} />

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-2 text-xs font-semibold">
            {leftJudge.length > 0 && <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-[#d4d76a] inline-block" />{left?.label}</span>}
            {rightJudge.length > 0 && <span className="flex items-center gap-1"><span className="w-3 h-1 rounded bg-indigo-500 inline-block" />{right?.label}</span>}
          </div>

          {/* Commentary */}
          {(left?.judge?.commentary || right?.judge?.commentary) && (
            <div className="mt-3 space-y-2">
              {left?.judge?.commentary && (
                <p className="text-xs text-slate-500 italic bg-slate-50 rounded-xl px-3 py-2">
                  <span className="font-semibold text-[#a1a43a] not-italic">{left.label}:</span> {left.judge.commentary}
                </p>
              )}
              {right?.judge?.commentary && (
                <p className="text-xs text-slate-500 italic bg-slate-50 rounded-xl px-3 py-2">
                  <span className="font-semibold text-indigo-500 not-italic">{right.label}:</span> {right.judge.commentary}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function MetricHelpBadge({ item, preferAbove = false }: { item: MetricGuideItem; preferAbove?: boolean }) {
  const t = useT();
  const name = t(item.nameKey);
  const meaning = t(item.meaningKey);
  const better = t(item.betterKey);
  return (
    <div className="relative inline-flex items-center group/metric-help">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-[#d4d76a]/70 hover:text-[#8e9234] focus:border-[#d4d76a]/70 focus:text-[#8e9234] focus:outline-none"
        aria-label={name}
        title={`${name}: ${meaning}`}
      >
        <CircleHelp size={11} strokeWidth={2.3} />
      </button>

      <div className={`pointer-events-none absolute left-0 z-20 w-64 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 text-left shadow-xl opacity-0 transition-all duration-150 group-hover/metric-help:opacity-100 group-focus-within/metric-help:opacity-100 ${preferAbove ? 'bottom-full mb-2 -translate-y-1 group-hover/metric-help:translate-y-0 group-focus-within/metric-help:translate-y-0' : 'top-full mt-2 translate-y-1 group-hover/metric-help:translate-y-0 group-focus-within/metric-help:translate-y-0'}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-wide text-slate-700">{name}</span>
          <span className="text-[10px] font-black uppercase tracking-wide text-[#8e9234]">{better}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">{meaning}</p>
      </div>
    </div>
  );
}

function JudgeHelpBadge() {
  const t = useT();
  return (
    <div className="relative inline-flex items-center group/judge-help">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-indigo-300 hover:text-indigo-500 focus:border-indigo-300 focus:text-indigo-500 focus:outline-none"
        aria-label={t('metrics.judge_guide_title')}
        title={t('metrics.judge_guide_title')}
      >
        <CircleHelp size={11} strokeWidth={2.3} />
      </button>

      <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 text-left shadow-xl opacity-0 translate-y-1 transition-all duration-150 group-hover/judge-help:opacity-100 group-hover/judge-help:translate-y-0 group-focus-within/judge-help:opacity-100 group-focus-within/judge-help:translate-y-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">{t('metrics.judge_axes_title')}</p>
        <div className="mt-2 grid gap-2">
          {JUDGE_GUIDE.map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-xs font-bold text-slate-800">{t(item.nameKey)}</span>
              <p className="mt-1 text-xs leading-5 text-slate-600">{t(item.meaningKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
