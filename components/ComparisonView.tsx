import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoxelEngine } from '../services/VoxelEngine';
import { getGenerator } from '../services/generators';
import {
  type GeneratorSourceOption,
  GEMINI_MODEL_OPTIONS,
  getSelectionDisplay,
  isGeminiModelSelection,
  modelPickerSourceOptions,
  normalizeGeneratorSelection,
} from '../services/generators/catalog';
import { judgeGeneration } from '../services/llmJudge';
import { evaluateAll } from '../utils/voxelEvaluator';
import { evaluateConstraints, parseBrickData } from '../utils/constraintEvaluator';
import { voxelsToBricks } from '../utils/modelImport';
import type { ConstraintReport } from '../utils/constraintEvaluator';
import { MetricsPanel } from './MetricsPanel';
import { ConstraintPanel } from './ConstraintPanel';
import { EvalHistory, appendRecord } from './EvalHistory';
import { BenchmarkPicker } from './BenchmarkPicker';
import type { BenchmarkEntry } from '../utils/benchmarkData';
import { VoxelData, GenerationRecord, EvaluationScores, LLMJudgeScores } from '../types';
import { Sparkles, Loader2, History, X, ArrowLeftRight, BarChart3, Link2, Unlink2, RotateCcw, ChevronDown, ChevronRight, Database } from 'lucide-react';
import { useT } from '../i18n/LocaleContext';
import { providerOf, type Provider } from '../services/generators/keys';

interface ComparisonViewProps {
  savedApiKeys: Record<Provider, string>;
  onSaveApiKey: (provider: Provider, value: string) => void;
  leftModel: string;
  rightModel: string;
  onExit: () => void;
  /** When true, source menus only list Gemini models (Google). */
  modelPickerGoogleOnly: boolean;
}

import type { GenerationProgress } from '../services/generators';

interface SlotState {
  label: string;
  voxelData: VoxelData[] | null;
  evaluation: EvaluationScores | null;
  judge: LLMJudgeScores | null;
  constraints: ConstraintReport | null;
  generationTimeMs: number;
  isGenerating: boolean;
  progress: GenerationProgress | null;
}

const INITIAL_SLOT: SlotState = {
  label: '',
  voxelData: null,
  evaluation: null,
  judge: null,
  constraints: null,
  generationTimeMs: 0,
  isGenerating: false,
  progress: null,
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  savedApiKeys,
  onSaveApiKey: _onSaveApiKey,
  leftModel,
  rightModel,
  onExit,
  modelPickerGoogleOnly,
}) => {
  const t = useT();
  const modelSourceOptions = React.useMemo(
    () => modelPickerSourceOptions(modelPickerGoogleOnly),
    [modelPickerGoogleOnly],
  );
  const leftContainerRef = useRef<HTMLDivElement>(null);
  const rightContainerRef = useRef<HTMLDivElement>(null);
  const leftEngineRef = useRef<VoxelEngine | null>(null);
  const rightEngineRef = useRef<VoxelEngine | null>(null);
  const syncRef = useRef<number>(0);

  const [prompt, setPrompt] = useState('');
  const [leftSource, setLeftSource] = useState(() => normalizeGeneratorSelection(leftModel));
  const [rightSource, setRightSource] = useState(() => normalizeGeneratorSelection(rightModel));
  const [leftSlot, setLeftSlot] = useState<SlotState>({ ...INITIAL_SLOT, label: leftModel });
  const [rightSlot, setRightSlot] = useState<SlotState>({ ...INITIAL_SLOT, label: rightModel });
  const [showHistory, setShowHistory] = useState(false);
  const [showBenchmark, setShowBenchmark] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [leftHighlight, setLeftHighlight] = useState(false);
  const [rightHighlight, setRightHighlight] = useState(false);
  const [isViewsLinked, setIsViewsLinked] = useState(false);
  const [openSourceMenu, setOpenSourceMenu] = useState<'left' | 'right' | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    const closeMenus = () => setOpenSourceMenu(null);
    window.addEventListener('click', closeMenus);
    return () => window.removeEventListener('click', closeMenus);
  }, []);

  useEffect(() => {
    if (!modelPickerGoogleOnly) return;
    const first = GEMINI_MODEL_OPTIONS[0].key;
    const second = GEMINI_MODEL_OPTIONS[1]?.key ?? first;
    setLeftSource((prev) => (isGeminiModelSelection(prev) ? prev : first));
    setRightSource((prev) => (isGeminiModelSelection(prev) ? prev : second));
  }, [modelPickerGoogleOnly]);

  // ---- Engine lifecycle ----
  useEffect(() => {
    if (!leftContainerRef.current || !rightContainerRef.current) return;

    const noop = () => {};
    const leftEngine = new VoxelEngine(leftContainerRef.current, noop, noop);
    const rightEngine = new VoxelEngine(rightContainerRef.current, noop, noop);

    leftEngineRef.current = leftEngine;
    rightEngineRef.current = rightEngine;

    leftEngine.setAutoRotate(true);
    rightEngine.setAutoRotate(true);

    // Resize listener
    const handleResize = () => {
      leftEngine.handleResize();
      rightEngine.handleResize();
    };
    window.addEventListener('resize', handleResize);
    // Trigger initial resize after mount
    requestAnimationFrame(handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(syncRef.current);
      leftEngine.cleanup();
      rightEngine.cleanup();
      leftEngineRef.current = null;
      rightEngineRef.current = null;
    };
  }, []);

  useEffect(() => {
    cancelAnimationFrame(syncRef.current);

    if (!isViewsLinked || !leftEngineRef.current || !rightEngineRef.current) {
      return;
    }

    const syncCamera = () => {
      if (leftEngineRef.current && rightEngineRef.current) {
        const state = leftEngineRef.current.getCameraState();
        rightEngineRef.current.setCameraState(state.position, state.target);
      }
      syncRef.current = requestAnimationFrame(syncCamera);
    };

    syncCamera();

    return () => {
      cancelAnimationFrame(syncRef.current);
    };
  }, [isViewsLinked]);

  // ---- Generation ----

  const generateForSlot = useCallback(async (
    modelKey: string,
    engineRef: React.MutableRefObject<VoxelEngine | null>,
    setSlot: React.Dispatch<React.SetStateAction<SlotState>>,
    promptText: string,
  ) => {
    setSlot(prev => ({ ...prev, label: modelKey, isGenerating: true, evaluation: null, judge: null, constraints: null, progress: null }));

    const provider = providerOf(modelKey);
    const apiKey = savedApiKeys[provider] ?? '';
    const start = performance.now();
    try {
      const gen = getGenerator(modelKey);
      const voxels = await gen.generate(promptText, apiKey, {
        onProgress: (p) => setSlot(prev => ({ ...prev, progress: p })),
      });
      const elapsed = Math.round(performance.now() - start);
      const evaluation = evaluateAll(voxels);

      // Enrich constraints with brick-level data when the generator exposes it.
      let bricks: ReturnType<typeof parseBrickData> | undefined;
      let sourceBricksText: string | undefined;
      const brickText = gen.lastBrickText;
      if (brickText) {
        sourceBricksText = brickText;
        bricks = parseBrickData(brickText);
        if (bricks.length === 0) bricks = undefined;
      }
      const constraints = evaluateConstraints(voxels, bricks);

      if (engineRef.current) {
        const brickPieces = gen.lastBricks && gen.lastBricks.length > 0
          ? gen.lastBricks
          : voxelsToBricks(voxels);
        engineRef.current.generateBrickEffect(brickPieces);
      }

      setSlot(prev => ({ ...prev, voxelData: voxels, evaluation, constraints, generationTimeMs: elapsed, isGenerating: false, progress: null }));

      // LLM judge (fire-and-forget, skip if no Gemini key)
      const geminiKey = savedApiKeys.gemini ?? '';
      if (geminiKey) {
        judgeGeneration(promptText, voxels, geminiKey)
          .then(judge => setSlot(prev => ({ ...prev, judge })))
          .catch(() => {});
      }

      // Persist record
      const record: GenerationRecord = {
        id: crypto.randomUUID(),
        prompt: promptText,
        model: modelKey,
        timestamp: Date.now(),
        generationTimeMs: elapsed,
        voxelData: voxels,
        evaluation,
        constraintReport: constraints,
        sourceBricks: sourceBricksText,
      };
      appendRecord(record);
      setHistoryRefresh(prev => prev + 1);
    } catch (err) {
      setSlot(prev => ({ ...prev, isGenerating: false, progress: null }));
      const msg = err instanceof Error ? err.message : t('app.alert.generation_failed', { message: '' });
      alert(`${modelKey}: ${msg}`);
    }
  }, [savedApiKeys, t]);

  const handleGenerateBoth = () => {
    if (!prompt.trim()) return;
    generateForSlot(leftSource, leftEngineRef, setLeftSlot, prompt);
    generateForSlot(rightSource, rightEngineRef, setRightSlot, prompt);
  };

  const handleLoadRecord = (record: GenerationRecord, slot: 'left' | 'right') => {
    const engineRef = slot === 'left' ? leftEngineRef : rightEngineRef;
    const setSlot = slot === 'left' ? setLeftSlot : setRightSlot;
    const normalizedModel = normalizeGeneratorSelection(record.model);

    if (slot === 'left') {
      setLeftSource(normalizedModel);
    } else {
      setRightSource(normalizedModel);
    }

    if (engineRef.current) {
      engineRef.current.generateEffect(record.voxelData);
    }

    setSlot({
      label: record.model,
      voxelData: record.voxelData,
      evaluation: record.evaluation,
      judge: record.llmJudge ?? null,
      constraints: record.constraintReport ?? evaluateConstraints(record.voxelData),
      generationTimeMs: record.generationTimeMs,
      isGenerating: false,
    });
  };

  const handleHighlightLeft = (brickIds: string[]) => {
    if (!leftEngineRef.current) return;
    if (leftHighlight) {
      leftEngineRef.current.clearHighlightedBricks();
      setLeftHighlight(false);
    } else {
      leftEngineRef.current.setHighlightedBricks(brickIds);
      setLeftHighlight(true);
    }
  };

  const handleHighlightRight = (brickIds: string[]) => {
    if (!rightEngineRef.current) return;
    if (rightHighlight) {
      rightEngineRef.current.clearHighlightedBricks();
      setRightHighlight(false);
    } else {
      rightEngineRef.current.setHighlightedBricks(brickIds);
      setRightHighlight(true);
    }
  };

  const handleBenchmarkLoad = (entry: BenchmarkEntry, side: 'left' | 'right') => {
    setPrompt(entry.prompt);
    setShowBenchmark(false);
    if (side === 'left') {
      setLeftSource('geo3d-grpo');
      generateForSlot('geo3d-grpo', leftEngineRef, setLeftSlot, entry.prompt);
    } else {
      setRightSource('geo3d-grpo');
      generateForSlot('geo3d-grpo', rightEngineRef, setRightSlot, entry.prompt);
    }
  };

  const handleResetView = (slot: 'left' | 'right') => {
    if (isViewsLinked) {
      leftEngineRef.current?.resetView();
      rightEngineRef.current?.resetView();
      return;
    }

    const engineRef = slot === 'left' ? leftEngineRef : rightEngineRef;
    engineRef.current?.resetView();
  };

  const isAnyGenerating = leftSlot.isGenerating || rightSlot.isGenerating;
  const hasMetrics = !!leftSlot.evaluation || !!rightSlot.evaluation;
  const hasConstraints = !!leftSlot.constraints || !!rightSlot.constraints;

  return (
    <div className="fixed inset-0 z-50 bg-[#f0f2f5] flex flex-col font-sans">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm z-10">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm transition-colors"
        >
          <X size={16} strokeWidth={2.5} /> {t('compare.exit')}
        </button>

        <div className="h-5 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <ArrowLeftRight size={16} className="text-[#a1a43a]" />
          <span className="font-black text-slate-800 tracking-tight text-sm">{t('compare.title')}</span>
        </div>

        <div className="flex-1" />

        {/* Prompt input */}
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !isAnyGenerating) handleGenerateBoth(); }}
          placeholder={t('compare.prompt_placeholder')}
          disabled={isAnyGenerating}
          className="flex-1 max-w-[400px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#d4d76a]/30 focus:border-[#d4d76a] transition-all placeholder:text-slate-400"
        />

        <button
          onClick={handleGenerateBoth}
          disabled={!prompt.trim() || isAnyGenerating}
          className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm bg-[#d4d76a] text-slate-900 hover:bg-[#c5c85a] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {isAnyGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {t('compare.generate_both')}
        </button>

        <button
          onClick={() => setShowMetrics(prev => !prev)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${showMetrics ? 'bg-[#f4f5d3] text-[#8e9234]' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
        >
          <BarChart3 size={16} />
          {t('compare.metrics')}
        </button>

        <button
          onClick={() => setIsViewsLinked(prev => !prev)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${isViewsLinked ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700 border border-transparent'}`}
          title={isViewsLinked ? t('compare.linked_views.tooltip') : t('compare.free_views.tooltip')}
        >
          {isViewsLinked ? <Link2 size={16} /> : <Unlink2 size={16} />}
          {isViewsLinked ? t('compare.linked_views') : t('compare.free_views')}
        </button>

        <button
          onClick={() => setShowBenchmark(true)}
          title={t('ui.icon.benchmark')}
          aria-label={t('ui.icon.benchmark')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200"
        >
          <Database size={16} />
          {t('ui.icon.benchmark')}
        </button>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-2 rounded-xl transition-all ${showHistory ? 'bg-[#f4f5d3] text-[#a1a43a]' : 'bg-slate-100 text-slate-500 hover:text-slate-700'}`}
        >
          <History size={18} />
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Viewports */}
        <div className="flex-1 flex min-h-0">
          {/* Left viewport */}
          <div className="flex-1 relative border-r border-slate-200">
            <div ref={leftContainerRef} className="absolute inset-0" />
            <ViewportSourceControl
              side="left"
              source={leftSource}
              sourceOptions={modelSourceOptions}
              accentClass="bg-[#d4d76a]"
              generationTimeMs={leftSlot.generationTimeMs}
              open={openSourceMenu === 'left'}
              onToggle={(event) => {
                event.stopPropagation();
                setOpenSourceMenu((prev) => (prev === 'left' ? null : 'left'));
              }}
              onSelect={(source) => {
                setLeftSource(source);
                setOpenSourceMenu(null);
              }}
            />
            <button
              onClick={() => handleResetView('left')}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-xl border border-white/50 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-md transition-all hover:border-slate-300 hover:text-slate-800"
              title={isViewsLinked ? t('compare.reset.tooltip.linked') : t('compare.reset.tooltip.left')}
            >
              <RotateCcw size={13} />
              {t('compare.reset')}
            </button>
            {leftSlot.isGenerating && <LoadingOverlay progress={leftSlot.progress} />}
          </div>

          {/* Right viewport */}
          <div className="flex-1 relative">
            <div ref={rightContainerRef} className="absolute inset-0" />
            <ViewportSourceControl
              side="right"
              source={rightSource}
              sourceOptions={modelSourceOptions}
              accentClass="bg-indigo-500"
              generationTimeMs={rightSlot.generationTimeMs}
              open={openSourceMenu === 'right'}
              onToggle={(event) => {
                event.stopPropagation();
                setOpenSourceMenu((prev) => (prev === 'right' ? null : 'right'));
              }}
              onSelect={(source) => {
                setRightSource(source);
                setOpenSourceMenu(null);
              }}
            />
            <button
              onClick={() => handleResetView('right')}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-xl border border-white/50 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-md transition-all hover:border-slate-300 hover:text-slate-800"
              title={isViewsLinked ? t('compare.reset.tooltip.linked') : t('compare.reset.tooltip.right')}
            >
              <RotateCcw size={13} />
              {t('compare.reset')}
            </button>
            {rightSlot.isGenerating && <LoadingOverlay progress={rightSlot.progress} />}
          </div>
        </div>

        {/* Metrics dock */}
        {hasMetrics && showMetrics && (
          <aside className="w-[420px] max-w-[36vw] min-w-[340px] bg-white/70 backdrop-blur-xl border-l border-slate-200 shadow-[-18px_0_40px_rgba(148,163,184,0.08)] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-gradient-to-b from-white/95 to-white/75 backdrop-blur-xl border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-[#a1a43a]" />
                <span className="text-sm font-black tracking-tight text-slate-800">{t('compare.live_eval')}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{t('compare.live_eval.subtitle')}</p>
            </div>

            <div className="p-4 space-y-4">
              {hasConstraints && (
                <div className="space-y-3">
                  {leftSlot.constraints && (
                    <ConstraintPanel
                      report={leftSlot.constraints}
                      compact
                      title={`Left · ${getSelectionDisplay(leftSource).fullLabel}`}
                      onHighlightOverlaps={handleHighlightLeft}
                      highlightActive={leftHighlight}
                    />
                  )}
                  {rightSlot.constraints && (
                    <ConstraintPanel
                      report={rightSlot.constraints}
                      compact
                      title={`Right · ${getSelectionDisplay(rightSource).fullLabel}`}
                      onHighlightOverlaps={handleHighlightRight}
                      highlightActive={rightHighlight}
                    />
                  )}
                </div>
              )}

              <MetricsPanel
                left={leftSlot.evaluation ? { label: getSelectionDisplay(leftSource).fullLabel, eval: leftSlot.evaluation, judge: leftSlot.judge ?? undefined } : null}
                right={rightSlot.evaluation ? { label: getSelectionDisplay(rightSource).fullLabel, eval: rightSlot.evaluation, judge: rightSlot.judge ?? undefined } : null}
              />
            </div>
          </aside>
        )}
      </div>

      {/* History sidebar */}
      <EvalHistory
        visible={showHistory}
        onLoadRecord={handleLoadRecord}
        onClose={() => setShowHistory(false)}
        refreshKey={historyRefresh}
      />

      {/* Benchmark picker */}
      <BenchmarkPicker
        open={showBenchmark}
        onClose={() => setShowBenchmark(false)}
        onLoad={handleBenchmarkLoad}
      />
    </div>
  );
};

// ---- Sub-components ----

function LoadingOverlay({ progress }: { progress: GenerationProgress | null }) {
  const t = useT();
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-sm z-20 pointer-events-none">
      <div className="bg-white/90 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-3 max-w-[280px]">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="text-[#a1a43a] animate-spin" />
          <span className="text-sm font-bold text-slate-700">{t('compare.generating')}</span>
        </div>
        {progress && (
          <div className="w-full mt-1 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
              {t('ui.loading.progress', { lines: progress.lines, chars: progress.chars })}
            </p>
            <div className="h-12 overflow-hidden rounded-md bg-slate-50 border border-slate-200 px-2 py-1 font-mono text-[9px] text-slate-500 leading-tight whitespace-pre-wrap break-all">
              {progress.tail}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ViewportSourceControlProps {
  side: 'left' | 'right';
  source: string;
  sourceOptions: readonly GeneratorSourceOption[];
  accentClass: string;
  generationTimeMs: number;
  open: boolean;
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onSelect: (source: string) => void;
}

function ViewportSourceControl({
  side,
  source,
  sourceOptions,
  accentClass,
  generationTimeMs,
  open,
  onToggle,
  onSelect,
}: ViewportSourceControlProps) {
  const t = useT();
  const [isGeminiExpanded, setIsGeminiExpanded] = useState(true);
  const display = getSelectionDisplay(source);

  useEffect(() => {
    if (!open) {
      setIsGeminiExpanded(false);
      return;
    }

    if (display.primary === 'Gemini') {
      setIsGeminiExpanded(true);
    }
  }, [display.primary, open]);

  return (
    <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
      <div className="relative">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 rounded-xl border border-white/50 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:border-slate-300 hover:text-slate-900"
          title={t('compare.source.tooltip')}
        >
          <span className={`h-2 w-2 rounded-full ${accentClass}`} />
          <span className="uppercase tracking-wider">{display.primary}</span>
          {display.secondary && (
            <span className="text-[10px] font-semibold tracking-normal text-slate-400 normal-case">
              {display.secondary}
            </span>
          )}
          <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div
            className="absolute left-0 top-full mt-2 min-w-[180px] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{t('ui.model.source')}</p>
            <div className="mt-1 flex flex-col gap-1">
              {sourceOptions.map((option) => {
                const isGeminiGroup = option.key === 'gemini';
                const isActive = isGeminiGroup ? display.primary === 'Gemini' : source === option.key;

                return (
                  <div key={`${side}-${option.key}`} className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        if (!option.enabled) return;
                        if (option.children) {
                          setIsGeminiExpanded((prev) => !prev);
                          return;
                        }
                        onSelect(option.key);
                      }}
                      disabled={!option.enabled}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-semibold transition-all ${isActive ? 'bg-[#f4f5d3] text-[#8e9234]' : option.enabled ? 'text-slate-700 hover:bg-slate-100' : 'cursor-not-allowed text-slate-300'}`}
                    >
                      <span>{option.label}</span>
                      {option.children ? (
                        <ChevronRight size={14} className={`transition-transform ${isGeminiExpanded ? 'rotate-90' : ''}`} />
                      ) : !option.enabled ? (
                        <span className="text-[10px] font-black uppercase tracking-wide">{t('ui.model.soon')}</span>
                      ) : null}
                    </button>

                    {option.children && isGeminiExpanded && (
                      <div className="ml-3 rounded-xl border border-slate-100 bg-slate-50/80 p-1.5">
                        {option.children.map((child) => {
                          const childActive = source === child.key;

                          return (
                            <button
                              key={`${side}-${option.key}-${child.key}`}
                              onClick={() => child.enabled && onSelect(child.key)}
                              disabled={!child.enabled}
                              className={`mt-1 first:mt-0 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all ${childActive ? 'bg-white text-[#8e9234] shadow-sm ring-1 ring-[#d4d76a]/40' : child.enabled ? 'text-slate-600 hover:bg-white hover:text-slate-800' : 'cursor-not-allowed text-slate-300'}`}
                            >
                              <span>{child.label}</span>
                              {!child.enabled && <span className="text-[10px] font-black uppercase tracking-wide">{t('ui.model.soon')}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {generationTimeMs > 0 && (
        <span className="rounded-full border border-white/50 bg-white/75 px-2 py-1 text-[10px] font-mono text-slate-400 shadow-sm backdrop-blur-md">
          {generationTimeMs}ms
        </span>
      )}
    </div>
  );
}
