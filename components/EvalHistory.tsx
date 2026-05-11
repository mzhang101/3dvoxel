import React from 'react';
import { GenerationRecord } from '../types';
import { getSelectionDisplay } from '../services/generators/catalog';
import { History, Trash2, Download, ChevronRight } from 'lucide-react';
import { useT } from '../i18n/LocaleContext';

const MAX_HISTORY = 50;
const STORAGE_KEY = 'voxel_eval_history';

// ---- Persistence helpers ----

export function loadHistory(): GenerationRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveHistory(records: GenerationRecord[]) {
  const trimmed = records.slice(-MAX_HISTORY);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export function appendRecord(record: GenerationRecord) {
  const history = loadHistory();
  history.push(record);
  saveHistory(history);
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportHistoryJson(): string {
  return JSON.stringify(loadHistory(), null, 2);
}

export function exportHistoryCsv(): string {
  const records = loadHistory();
  if (records.length === 0) return '';

  const headers = [
    'id', 'prompt', 'model', 'timestamp', 'generationTimeMs',
    'voxelCount', 'connectivity', 'symmetry', 'colorDiversity',
    'centeringError', 'surfaceRatio', 'floorCompliance',
    'llm_promptAdherence', 'llm_structural', 'llm_aesthetic', 'llm_creativity',
  ];

  const rows = records.map(r => [
    r.id,
    `"${r.prompt.replace(/"/g, '""')}"`,
    r.model,
    r.timestamp,
    r.generationTimeMs,
    r.evaluation.voxelCount,
    r.evaluation.connectivity.componentCount,
    r.evaluation.symmetryScore.toFixed(3),
    r.evaluation.colorDiversity.uniqueColorCount,
    r.evaluation.centeringError.distance.toFixed(3),
    r.evaluation.surfaceRatio.toFixed(3),
    r.evaluation.floorCompliance ? 1 : 0,
    r.llmJudge?.promptAdherence ?? '',
    r.llmJudge?.structuralQuality ?? '',
    r.llmJudge?.aestheticScore ?? '',
    r.llmJudge?.creativity ?? '',
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// ---- Component ----

interface EvalHistoryProps {
  visible: boolean;
  onLoadRecord: (record: GenerationRecord, slot: 'left' | 'right') => void;
  onClose: () => void;
  refreshKey?: number;
}

export const EvalHistory: React.FC<EvalHistoryProps> = ({ visible, onLoadRecord, onClose, refreshKey }) => {
  const t = useT();
  const [records, setRecords] = React.useState<GenerationRecord[]>([]);

  React.useEffect(() => {
    setRecords(loadHistory());
  }, [refreshKey, visible]);

  if (!visible) return null;

  const handleExport = (format: 'json' | 'csv') => {
    const content = format === 'json' ? exportHistoryJson() : exportHistoryCsv();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eval-history.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm(t('history.clear.confirm'))) {
      clearHistory();
      setRecords([]);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-[340px] bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl z-[60] flex flex-col font-sans animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#a1a43a]" />
          <span className="font-bold text-slate-800 tracking-tight">{t('history.title')}</span>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{records.length}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold transition-colors">✕</button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 py-3 border-b border-slate-100">
        <button onClick={() => handleExport('json')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#a1a43a] transition-colors">
          <Download size={13} /> {t('history.export.json')}
        </button>
        <button onClick={() => handleExport('csv')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#a1a43a] transition-colors">
          <Download size={13} /> {t('history.export.csv')}
        </button>
        <div className="flex-1" />
        <button onClick={handleClear} className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-600 transition-colors">
          <Trash2 size={13} /> {t('history.clear')}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {records.length === 0 && (
          <p className="text-sm text-slate-400 text-center mt-10">{t('history.empty')}</p>
        )}
        {[...records].reverse().map((r) => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-3 hover:border-[#d4d76a] transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{r.prompt}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {getSelectionDisplay(r.model).fullLabel} · {t('history.subtitle', { count: r.evaluation.voxelCount, ms: r.generationTimeMs })}
                </p>
                <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                  {new Date(r.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => onLoadRecord(r, 'left')}
                className="flex items-center gap-1 text-[11px] font-bold text-[#a1a43a] hover:text-[#828534] bg-[#f4f5d3] px-2.5 py-1 rounded-lg transition-colors"
              >
                <ChevronRight size={12} /> {t('history.load.left')}
              </button>
              <button
                onClick={() => onLoadRecord(r, 'right')}
                className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg transition-colors"
              >
                <ChevronRight size={12} /> {t('history.load.right')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
