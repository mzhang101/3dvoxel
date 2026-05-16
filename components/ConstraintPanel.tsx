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
  /** Trigger a drop-test: let unsupported bricks fall with gravity. */
  onStructuralTest?: (brickIds: string[]) => void;
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

interface StructuralDropCta {
  onClick: () => void;
}

interface RowProps {
  result: ConstraintResult;
  state: 'pending' | 'checking' | 'revealed';
  compact?: boolean;
  /** Wider two-line layout: title + big score, then detail + action buttons (structural stability). */
  structuralTwoLineLayout?: boolean;
  onHighlight?: () => void;
  highlightActive?: boolean;
  structuralDropCta?: StructuralDropCta;
}

const ConstraintRow: React.FC<RowProps> = ({
  result,
  state,
  compact,
  structuralTwoLineLayout,
  onHighlight,
  highlightActive,
  structuralDropCta,
}) => {
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
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`font-bold text-slate-700 ${structuralTwoLineLayout ? 'text-base' : 'text-sm'}`}>{name}</span>
            <span className="text-[11px] text-indigo-500">{t('constraint.panel.checking')}</span>
          </div>
        </div>
        <span className={`font-mono text-slate-400 shrink-0 ${structuralTwoLineLayout ? 'text-lg font-black' : 'text-sm'}`}>…</span>
      </div>
    );
  }

  /** Structural stability: line 1 = title + big score; line 2 = full detail + action buttons without clipping. */
  if (structuralTwoLineLayout) {
    const hasActions = !!(onHighlight || structuralDropCta);

    const highlightBtn = onHighlight ? (
      <button
        type="button"
        onClick={onHighlight}
        title={highlightActive ? t('constraint.panel.unhighlight') : t('constraint.panel.highlight')}
        aria-label={highlightActive ? t('constraint.panel.unhighlight') : t('constraint.panel.highlight')}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-black uppercase tracking-wide transition-all shrink-0 ${
          highlightActive
            ? 'border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-800'
        }`}
      >
        {highlightActive ? <EyeOff size={14} className="shrink-0" /> : <Eye size={14} className="shrink-0" />}
        <span className="whitespace-nowrap">{highlightActive ? t('constraint.panel.unhighlight_short') : t('constraint.panel.highlight_short')}</span>
      </button>
    ) : null;

    const dropBtn = structuralDropCta ? (
      <button
        type="button"
        onClick={structuralDropCta.onClick}
        title={t('constraint.structural_test.tooltip')}
        aria-label={t('constraint.structural_test')}
        className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/90 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-amber-900 shadow-sm transition-all hover:border-amber-400 hover:from-amber-100 hover:to-amber-50 active:translate-y-[0.5px] shrink-0 whitespace-nowrap"
      >
        {t('constraint.structural_test')}
      </button>
    ) : null;

    return (
      <div className="border-b border-slate-100 last:border-0 animate-in fade-in slide-in-from-left-2 duration-300">
        <div className="flex gap-2 py-2 px-1">
          <div className="shrink-0 pt-1">
            <StatusIcon result={result} />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => hasViolations && setExpanded((v) => !v)}
              className={`flex w-full flex-wrap items-start justify-between gap-x-3 gap-y-1 text-left rounded-lg -mx-0.5 px-0.5 py-0.5 ${
                hasViolations ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
              }`}
              aria-expanded={hasViolations ? expanded : undefined}
              aria-disabled={!hasViolations}
            >
              <span className="text-base font-black text-slate-800 tracking-tight leading-snug">{name}</span>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                <span className={`font-mono text-2xl font-black tabular-nums tracking-tight ${scoreColor(result.score)}`}>
                  {result.score.toFixed(2)}
                </span>
                {hasViolations && (
                  <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
                )}
              </div>
            </button>

            <div className="flex flex-wrap gap-x-3 gap-y-2 items-start">
              <p className={`text-[12px] leading-snug text-slate-600 min-w-0 break-words ${hasActions ? 'flex-[1_1_10rem]' : 'w-full'}`}>{detail}</p>
              {hasActions && (
                <div className="flex flex-wrap gap-2 shrink-0 items-stretch justify-end ml-auto max-w-full">
                  {highlightBtn}
                  {dropBtn}
                </div>
              )}
            </div>
          </div>
        </div>

        {expanded && hasViolations && (
          <div className="pb-2 pr-1 pl-8">
            <ul className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 space-y-1 text-[11px] font-mono text-slate-600">
              {result.violations.map((v, i) => (
                <li key={i}>{t(v.key, v.params)}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-b border-slate-100 last:border-0 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className="flex items-center gap-2 py-2 px-1">
        <button
          type="button"
          onClick={() => hasViolations && setExpanded((v) => !v)}
          className={`flex-1 flex items-center gap-2 text-left min-w-0 ${hasViolations ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
        >
          <StatusIcon result={result} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-700">{name}</span>
              {!compact && (
                <span className="text-[11px] text-slate-500 break-words">{detail}</span>
              )}
            </div>
          </div>
          <span className={`font-mono text-sm font-bold shrink-0 tabular-nums ${scoreColor(result.score)}`}>
            {result.score.toFixed(2)}
          </span>
          {hasViolations && (
            <ChevronDown size={12} className={`text-slate-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
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

      {structuralDropCta && !compact && (
        <div className="pb-2 pl-7 pr-1">
          <button
            type="button"
            onClick={structuralDropCta.onClick}
            title={t('constraint.structural_test.tooltip')}
            aria-label={t('constraint.structural_test')}
            className="w-full rounded-lg border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/90 px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-amber-900 shadow-sm transition-all hover:border-amber-400 hover:from-amber-100 hover:to-amber-50 active:translate-y-[0.5px]"
          >
            {t('constraint.structural_test')}
          </button>
        </div>
      )}

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
  onStructuralTest,
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
          const showStructuralDropCta =
            c.nameKey === 'constraint.structural_stability.name' &&
            state === 'revealed' &&
            hasBrickData &&
            !!onStructuralTest;
          const overlappingStruct = c.overlappingBrickIds?.length ?? 0;
          const structuralDropCta: StructuralDropCta | undefined =
            showStructuralDropCta && overlappingStruct > 0
              ? { onClick: () => onStructuralTest!(c.overlappingBrickIds!) }
              : undefined;
          const structuralTwoLineLayout =
            c.nameKey === 'constraint.structural_stability.name' && !compact && state === 'revealed';
          return (
            <ConstraintRow
              key={c.nameKey + i}
              result={c}
              state={state}
              compact={compact}
              structuralTwoLineLayout={structuralTwoLineLayout}
              onHighlight={canHighlight ? () => onHighlightOverlaps!(c.overlappingBrickIds!) : undefined}
              highlightActive={canHighlight && highlightActive}
              structuralDropCta={structuralDropCta}
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
