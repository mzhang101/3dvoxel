import React, { useEffect, useMemo, useState } from 'react';
import { X, Database, Search, ChevronRight, Loader2, AlertTriangle, Shield, Boxes } from 'lucide-react';
import { useT } from '../i18n/LocaleContext';
import { loadBenchmarks, type BenchmarkEntry } from '../utils/benchmarkData';

interface BenchmarkPickerProps {
  open: boolean;
  onClose: () => void;
  onLoad: (entry: BenchmarkEntry, side: 'left' | 'right') => void;
  /** When true, show a single "Load" button (passes 'left' to onLoad). */
  singleMode?: boolean;
}

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; entries: BenchmarkEntry[] }
  | { kind: 'error'; message: string };

export const BenchmarkPicker: React.FC<BenchmarkPickerProps> = ({ open, onClose, onLoad, singleMode }) => {
  const t = useT();
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    if (state.kind === 'ready' || state.kind === 'loading') return;

    setState({ kind: 'loading' });
    loadBenchmarks()
      .then((entries) => setState({ kind: 'ready', entries }))
      .catch((err) => setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = useMemo(() => {
    if (state.kind !== 'ready') return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.entries;
    return state.entries.filter((e) => e.prompt.toLowerCase().includes(q));
  }, [state, query]);

  if (!open) return null;

  const total = state.kind === 'ready' ? state.entries.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-[#f4f5d3] text-[#a1a43a] shrink-0">
              <Database size={22} strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight truncate">{t('benchmark.title')}</h2>
              <p className="text-xs font-medium text-slate-500">
                {t('benchmark.subtitle', { total })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('benchmark.search')}
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50/40">
          {state.kind === 'loading' && (
            <div className="flex items-center justify-center gap-3 py-12 text-slate-500 text-sm">
              <Loader2 size={18} className="animate-spin text-[#a1a43a]" />
              {t('benchmark.loading')}
            </div>
          )}

          {state.kind === 'error' && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
              <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{t('benchmark.error', { message: state.message })}</p>
                <button
                  onClick={() => setState({ kind: 'idle' })}
                  className="mt-2 text-xs font-bold text-rose-600 hover:text-rose-800 underline"
                >
                  {t('benchmark.retry')}
                </button>
              </div>
            </div>
          )}

          {state.kind === 'ready' && filtered.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-12">{t('benchmark.empty')}</p>
          )}

          {state.kind === 'ready' && filtered.map((entry) => (
            <BenchmarkRow key={entry.promptIdx} entry={entry} onLoad={onLoad} singleMode={singleMode} />
          ))}
        </div>
      </div>
    </div>
  );
};

interface BenchmarkRowProps {
  entry: BenchmarkEntry;
  onLoad: (entry: BenchmarkEntry, side: 'left' | 'right') => void;
  singleMode?: boolean;
}

const BenchmarkRow: React.FC<BenchmarkRowProps> = ({ entry, onLoad, singleMode }) => {
  const t = useT();
  const validity = entry.best.validity_score;
  const voxel = entry.best.voxel_score;
  const bricks = entry.best.num_bricks;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:border-[#d4d76a] transition-colors shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 leading-snug" title={entry.prompt}>
            {entry.prompt}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <ScoreChip
              icon={<Shield size={11} />}
              label={t('benchmark.score.validity', { score: validity.toFixed(2) })}
              tone={validity >= 0.9 ? 'green' : validity >= 0.7 ? 'amber' : 'rose'}
            />
            <ScoreChip
              icon={<Boxes size={11} />}
              label={t('benchmark.score.voxel', { score: voxel.toFixed(2) })}
              tone="slate"
            />
            <ScoreChip
              label={t('benchmark.score.bricks', { count: bricks })}
              tone="indigo"
            />
            <span className="text-[10px] font-mono text-slate-300 ml-auto">#{entry.promptIdx}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {singleMode ? (
          <button
            onClick={() => onLoad(entry, 'left')}
            className="flex items-center gap-1 text-[11px] font-bold text-[#a1a43a] hover:text-[#828534] bg-[#f4f5d3] hover:bg-[#eaedb6] px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ChevronRight size={12} /> {t('benchmark.load')}
          </button>
        ) : (
          <>
            <button
              onClick={() => onLoad(entry, 'left')}
              className="flex items-center gap-1 text-[11px] font-bold text-[#a1a43a] hover:text-[#828534] bg-[#f4f5d3] hover:bg-[#eaedb6] px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <ChevronRight size={12} /> {t('benchmark.load.left')}
            </button>
            <button
              onClick={() => onLoad(entry, 'right')}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <ChevronRight size={12} /> {t('benchmark.load.right')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

interface ScoreChipProps {
  icon?: React.ReactNode;
  label: string;
  tone: 'green' | 'amber' | 'rose' | 'slate' | 'indigo';
}

const TONE_STYLES: Record<ScoreChipProps['tone'], string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

const ScoreChip: React.FC<ScoreChipProps> = ({ icon, label, tone }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md border ${TONE_STYLES[tone]}`}>
    {icon}
    {label}
  </span>
);
