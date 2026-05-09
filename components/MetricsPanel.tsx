import React from 'react';
import { EvaluationScores, LLMJudgeScores } from '../types';
import { BarChart3, Brain, CircleHelp } from 'lucide-react';

interface MetricsPanelProps {
  left: { label: string; eval: EvaluationScores; judge?: LLMJudgeScores } | null;
  right: { label: string; eval: EvaluationScores; judge?: LLMJudgeScores } | null;
}

const METRIC_GUIDE = [
  {
    name: 'Voxel Count',
    meaning: 'The total number of voxels used in the model. It mainly reflects scale and detail density.',
    better: 'Contextual',
  },
  {
    name: 'Connectivity',
    meaning: 'How many separate voxel components exist. A value of 1 means the model is fully connected.',
    better: 'Lower is better',
  },
  {
    name: 'Symmetry',
    meaning: 'Mirror consistency across the x-axis. Higher values mean the left and right halves align more closely.',
    better: 'Higher is better',
  },
  {
    name: 'Color Diversity',
    meaning: 'The number of distinct colors used. Higher values usually indicate a richer palette.',
    better: 'Higher is better',
  },
  {
    name: 'HSL Variance',
    meaning: 'How much the hue, saturation, and lightness vary across the palette. Higher values mean more tonal spread.',
    better: 'Higher is better',
  },
  {
    name: 'Centering Error',
    meaning: 'Distance from the model center to x=0, z=0. Lower values mean the asset is better centered in the scene.',
    better: 'Lower is better',
  },
  {
    name: 'Surface Ratio',
    meaning: 'Share of voxel faces exposed to the outside. Higher values often indicate less solid mass and more visible shape detail.',
    better: 'Higher is usually better',
  },
  {
    name: 'Floor OK',
    meaning: 'Checks whether the model sits on or above the ground plane without dipping below the expected floor.',
    better: '1 is better',
  },
] as const;

const JUDGE_GUIDE = [
  {
    name: 'Prompt',
    meaning: 'How well the generated structure matches the requested object or concept.',
  },
  {
    name: 'Structure',
    meaning: 'How plausible, stable, and physically connected the voxel form appears.',
  },
  {
    name: 'Aesthetic',
    meaning: 'How well the proportions, silhouette, and color choices work visually.',
  },
  {
    name: 'Creative',
    meaning: 'How original or interesting the output feels beyond a plain baseline solution.',
  },
] as const;

function getMetricGuide(name: string) {
  return METRIC_GUIDE.find((item) => item.name === name);
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
  if (!left && !right) return null;

  const hasBoth = !!left && !!right;
  const [showGuide, setShowGuide] = React.useState(false);

  type Row = {
    label: string;
    lVal: string;
    rVal: string;
    dir: Direction;
    lNum: number;
    rNum: number;
    guide?: (typeof METRIC_GUIDE)[number];
  };

  function buildRows(): Row[] {
    const le = left?.eval;
    const re = right?.eval;
    const rows: Row[] = [];

    const push = (label: string, lv: number | undefined, rv: number | undefined, dir: Direction, dec = 2) => {
      rows.push({
        label,
        lVal: lv != null ? fmt(lv, dec) : '—',
        rVal: rv != null ? fmt(rv, dec) : '—',
        dir,
        lNum: lv ?? 0,
        rNum: rv ?? 0,
        guide: getMetricGuide(label),
      });
    };

    push('Voxel Count', le?.voxelCount, re?.voxelCount, 'neutral', 0);
    push('Connectivity', le?.connectivity.componentCount, re?.connectivity.componentCount, 'lower', 0);
    push('Symmetry', le?.symmetryScore, re?.symmetryScore, 'higher');
    push('Color Diversity', le?.colorDiversity.uniqueColorCount, re?.colorDiversity.uniqueColorCount, 'higher', 0);
    push('HSL Variance', le?.colorDiversity.hslVariance, re?.colorDiversity.hslVariance, 'higher', 4);
    push('Centering Error', le?.centeringError.distance, re?.centeringError.distance, 'lower');
    push('Surface Ratio', le?.surfaceRatio, re?.surfaceRatio, 'higher');
    push('Floor OK', le?.floorCompliance ? 1 : 0, re?.floorCompliance ? 1 : 0, 'higher', 0);

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
          <span className="font-bold text-slate-800 tracking-tight">Evaluation Metrics</span>
        </div>

        <button
          onClick={() => setShowGuide(prev => !prev)}
          className={`w-8 h-8 rounded-full border text-sm font-black transition-all ${showGuide ? 'bg-[#f4f5d3] text-[#8e9234] border-[#d4d76a]/60' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300'}`}
          title="Explain each metric"
          aria-label="Explain each metric"
        >
          ?
        </button>
      </div>

      {showGuide && (
        <div className="mb-4 rounded-2xl border border-[#dfe4a6] bg-[#fbfce8] px-4 py-4 shadow-sm">
          <div className="grid gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8e9234]">Metric Guide</p>
              <div className="mt-2 grid gap-2">
                {METRIC_GUIDE.map((item) => (
                  <div key={item.name} className="rounded-xl bg-white/70 px-3 py-2 border border-white/60">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-800">{item.name}</span>
                      <span className="text-[10px] font-black uppercase tracking-wide text-[#8e9234]">{item.better}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.meaning}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500">LLM Judge Guide</p>
              <div className="mt-2 grid gap-2">
                {JUDGE_GUIDE.map((item) => (
                  <div key={item.name} className="rounded-xl bg-white/70 px-3 py-2 border border-white/60">
                    <span className="text-sm font-bold text-slate-800">{item.name}</span>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{item.meaning}</p>
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
              <th className="text-left py-2 pr-3 text-slate-400 font-semibold text-xs uppercase tracking-wider">Metric</th>
              <th className="text-right py-2 px-3 text-[#a1a43a] font-bold text-xs uppercase tracking-wider">{left?.label ?? 'Left'}</th>
              {hasBoth && (
                <th className="text-right py-2 pl-3 text-indigo-500 font-bold text-xs uppercase tracking-wider">{right?.label ?? 'Right'}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, index) => {
              const w = hasBoth ? winner(r.lNum, r.rNum, r.dir) : 'tie';
              const preferAbove = index >= rows.length - 3;

              return (
                <tr key={r.label} className="border-b border-slate-100 last:border-0">
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
            <span className="font-bold text-slate-800 text-sm tracking-tight">LLM Judge Scores</span>
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

function MetricHelpBadge({ item, preferAbove = false }: { item: (typeof METRIC_GUIDE)[number]; preferAbove?: boolean }) {
  return (
    <div className="relative inline-flex items-center group/metric-help">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-[#d4d76a]/70 hover:text-[#8e9234] focus:border-[#d4d76a]/70 focus:text-[#8e9234] focus:outline-none"
        aria-label={`Explain ${item.name}`}
        title={`${item.name}: ${item.meaning}`}
      >
        <CircleHelp size={11} strokeWidth={2.3} />
      </button>

      <div className={`pointer-events-none absolute left-0 z-20 w-64 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 text-left shadow-xl opacity-0 transition-all duration-150 group-hover/metric-help:opacity-100 group-focus-within/metric-help:opacity-100 ${preferAbove ? 'bottom-full mb-2 -translate-y-1 group-hover/metric-help:translate-y-0 group-focus-within/metric-help:translate-y-0' : 'top-full mt-2 translate-y-1 group-hover/metric-help:translate-y-0 group-focus-within/metric-help:translate-y-0'}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-wide text-slate-700">{item.name}</span>
          <span className="text-[10px] font-black uppercase tracking-wide text-[#8e9234]">{item.better}</span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">{item.meaning}</p>
      </div>
    </div>
  );
}

function JudgeHelpBadge() {
  return (
    <div className="relative inline-flex items-center group/judge-help">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-all hover:border-indigo-300 hover:text-indigo-500 focus:border-indigo-300 focus:text-indigo-500 focus:outline-none"
        aria-label="Explain LLM judge scores"
        title="Explain LLM judge scores"
      >
        <CircleHelp size={11} strokeWidth={2.3} />
      </button>

      <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-72 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 text-left shadow-xl opacity-0 translate-y-1 transition-all duration-150 group-hover/judge-help:opacity-100 group-hover/judge-help:translate-y-0 group-focus-within/judge-help:opacity-100 group-focus-within/judge-help:translate-y-0">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">LLM Judge Axes</p>
        <div className="mt-2 grid gap-2">
          {JUDGE_GUIDE.map((item) => (
            <div key={item.name} className="rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-xs font-bold text-slate-800">{item.name}</span>
              <p className="mt-1 text-xs leading-5 text-slate-600">{item.meaning}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
