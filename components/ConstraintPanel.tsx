import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Shield, ChevronDown, RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react';
import { ConstraintReport, ConstraintResult } from '../utils/constraintEvaluator';
import { useT } from '../i18n/LocaleContext';

interface ConstraintPanelProps {
  report: ConstraintReport | null;
  loading?: boolean;
  compact?: boolean;
  title?: string;
  /** Toggle highlighting of overlapping bricks in the 3D viewport. */
  onHighlightOverlaps?: (brickIds: string[]) => void;
  /** Whether overlap highlighting is currently active (for button styling). */
  highlightActive?: boolean;
}

const STEP_MS = 350;

function scoreColor(score: number): string {
  if (score >= 0.9) return 'text-emerald-600';
  if (score >= 0.7) return 'text-amber-600';
  return 'text-rose-600';
}

function scoreBg(score: number): string {
  if (score >= 0.9) return 'bg-emerald-50 border-emerald-200';
  if (score >= 0.7) return 'bg-amber-50 border-amber-200';
  return 'bg-rose-50 border-rose-200';
}

function StatusIcon({ result }: { result: ConstraintResult }) {
  if (result.passed) return <CheckCircle size={16} className="text-emerald-500 shrink-0" />;
  if (result.score >= 0.7) return <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
  return <XCircle size={16} className="text-rose-500 shrink-0" />;
}

interface RowProps {
  result: ConstraintResult;
  state: 'pending' | 'checking' | 'revealed';
  compact?: boolean;
  onHighlight?: () => void;
  highlightActive?: boolean;
}

const ConstraintRow: React.FC<RowProps> = ({ result, state, compact, onHighlight, highlightActive }) => {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const hasViolations = result.violations.length > 0;
  const name = t(result.nameKey);
  const detail = t(result.detailKey, result.detailParams);

  if (state === 'pending') {
    return (
      <div className="flex items-center gap-2 py-2 px-1 border-b border-slate-100 last:border-0 opacity-50">
        <div className="w-4 h-4 rounded-full border border-dashed border-slate-300 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-400">{name}</span>
        </div>
        <span className="font-mono text-sm text-slate-300">—</span>
      </div>
    );
  }

  if (state === 'checking') {
    return (
      <div className="flex items-center gap-2 py-2 px-1 border-b border-slate-100 last:border-0 animate-in fade-in slide-in-from-left-2 duration-200">
        <Loader2 size={16} className="text-indigo-500 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-700">{name}</span>
            <span className="text-[11px] text-indigo-500">{t('constraint.panel.checking')}</span>
          </div>
        </div>
        <span className="font-mono text-sm text-slate-400">…</span>
      </div>
    );
  }

  return (
    <div className="border-b border-slate-100 last:border-0 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex items-center gap-2 py-2 px-1">
        <button
          type="button"
          onClick={() => hasViolations && setExpanded((v) => !v)}
          className={`flex-1 flex items-center gap-2 text-left ${hasViolations ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
        >
          <StatusIcon result={result} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-slate-700">{name}</span>
              {!compact && (
                <span className="text-[11px] text-slate-500 truncate">{detail}</span>
              )}
            </div>
          </div>
          <span className={`font-mono text-sm font-bold ${scoreColor(result.score)}`}>
            {result.score.toFixed(2)}
          </span>
          {hasViolations && (
            <ChevronDown size={12} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          )}
        </button>
        {onHighlight && (
          <button
            type="button"
            onClick={onHighlight}
            title={highlightActive ? t('constraint.panel.unhighlight') : t('constraint.panel.highlight')}
            aria-label={highlightActive ? t('constraint.panel.unhighlight') : t('constraint.panel.highlight')}
            className={`p-1.5 rounded-lg border transition-all shrink-0 ${
              highlightActive
                ? 'border-rose-300 bg-rose-50 text-rose-600'
                : 'border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {highlightActive ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>

      {expanded && hasViolations && (
        <div className="pb-2 pl-7 pr-1">
          <ul className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 space-y-1 text-[11px] font-mono text-slate-600">
            {result.violations.map((v, i) => (
              <li key={i}>{t(v.key, v.params)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Phase = 'idle' | 'running' | 'done';

export const ConstraintPanel: React.FC<ConstraintPanelProps> = ({
  report,
  loading,
  compact,
  title,
  onHighlightOverlaps,
  highlightActive = false,
}) => {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('idle');
  const [index, setIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const timersRef = useRef<number[]>([]);

  const runAnimation = (rep: ConstraintReport) => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (prefersReducedMotion()) {
      setPhase('done');
      setIndex(rep.constraints.length);
      return;
    }

    setPhase('running');
    setIndex(0);
    rep.constraints.forEach((_, i) => {
      const id = window.setTimeout(() => setIndex(i + 1), STEP_MS * (i + 1));
      timersRef.current.push(id);
    });
    const finalId = window.setTimeout(() => setPhase('done'), STEP_MS * (rep.constraints.length + 0.5));
    timersRef.current.push(finalId);
  };

  // Start animation when report changes or the user clicks Re-run
  useEffect(() => {
    if (!report) {
      setPhase('idle');
      setIndex(0);
      return;
    }
    runAnimation(report);
    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, runId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500">
        {t('constraint.panel.evaluating')}
      </div>
    );
  }

  if (!report) return null;

  const { validityScore, overallValid, constraints, hasBrickData } = report;
  const summary = t(report.summaryKey, report.summaryParams);
  const isDone = phase === 'done';
  const headerScoreClass = isDone ? scoreBg(validityScore) : 'bg-slate-50 border-slate-200';

  const handleRerun = () => setRunId((n) => n + 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 backdrop-blur-md shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${headerScoreClass} transition-colors`}>
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-slate-700" />
          <span className="font-black tracking-tight text-slate-800 text-sm uppercase">
            {title ?? t('constraint.panel.title')}
          </span>
          {!hasBrickData && (
            <span
              className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 bg-white/70 border border-slate-200 rounded-full px-2 py-0.5"
              title={t('constraint.panel.voxel_only.tooltip')}
            >
              {t('constraint.panel.voxel_only')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRerun}
            title={t('constraint.panel.rerun')}
            aria-label={t('constraint.panel.rerun')}
            className={`p-1.5 rounded-lg border border-slate-200 bg-white/70 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all ${phase === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={phase === 'running'}
          >
            <RefreshCw size={13} className={phase === 'running' ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end leading-none">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                {t('ui.validity.label')}
              </span>
              {isDone ? (
                <span className={`font-mono font-black text-lg animate-in fade-in zoom-in-95 duration-300 ${scoreColor(validityScore)}`}>
                  {validityScore.toFixed(2)}
                </span>
              ) : (
                <span className="font-mono font-black text-lg text-slate-300">—</span>
              )}
            </div>
            {isDone ? (
              <span
                className={`px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-full animate-in fade-in zoom-in-95 duration-300 ${
                  overallValid ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {overallValid ? t('constraint.panel.pass') : t('constraint.panel.fail')}
              </span>
            ) : (
              <span className="px-2 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-200 text-slate-400">
                …
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress strip while running */}
      {phase === 'running' && index < constraints.length && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-[11px] text-indigo-600 font-semibold tracking-wide">
          {t('constraint.panel.progress', {
            current: index + 1,
            total: constraints.length,
            name: t(constraints[index].nameKey),
          })}
        </div>
      )}

      {/* Constraint rows */}
      <div className="px-3 py-1">
        {constraints.map((c, i) => {
          let state: 'pending' | 'checking' | 'revealed' = 'revealed';
          if (phase === 'running') {
            if (i < index) state = 'revealed';
            else if (i === index) state = 'checking';
            else state = 'pending';
          }
          const canHighlight =
            !!onHighlightOverlaps &&
            state === 'revealed' &&
            !!c.overlappingBrickIds &&
            c.overlappingBrickIds.length > 0;
          return (
            <ConstraintRow
              key={c.nameKey + i}
              result={c}
              state={state}
              compact={compact}
              onHighlight={canHighlight ? () => onHighlightOverlaps!(c.overlappingBrickIds!) : undefined}
              highlightActive={canHighlight && highlightActive}
            />
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
        {isDone ? (
          <>
            <p className="animate-in fade-in duration-300">{summary}</p>
            {!compact && (
              <p className="mt-1 text-slate-400">
                {t('constraint.panel.footer')}
              </p>
            )}
          </>
        ) : (
          <p className="text-slate-400">{t('constraint.panel.evaluating')}</p>
        )}
      </div>
    </div>
  );
};
