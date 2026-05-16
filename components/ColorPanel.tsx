import React, { useState } from 'react';
import { Palette, Sparkles, RotateCcw, Save, Brush, Loader2, X } from 'lucide-react';
import { useT } from '../i18n/LocaleContext';
import { BrickPiece } from '../types';

const PRESET_SWATCHES = [
  '#d62828', // red
  '#f77f00', // orange
  '#fcbf49', // yellow
  '#74c69d', // green
  '#1d3557', // navy
  '#457b9d', // blue
  '#9d4edd', // purple
  '#f4a261', // tan
  '#2b2d42', // near-black
  '#e9ecef', // off-white
];

export interface ColorPanelProps {
  open: boolean;
  onClose: () => void;
  /** Current bricks in the model (for AI coloring + save). */
  bricks: BrickPiece[];
  /** The prompt that produced the model (passed to AI coloring). */
  modelPrompt: string;
  /** Apply a uniform color across every brick. */
  onUniformColor: (hex: string) => void;
  /** Run AI coloring with the given hex map produced by an LLM. */
  onAiColor: () => Promise<void>;
  /** Toggle manual click-to-paint mode in the 3D viewport. */
  manualMode: boolean;
  onSetManualMode: (active: boolean) => void;
  /** Color currently armed for manual painting. */
  manualColor: string;
  onSetManualColor: (hex: string) => void;
  /** Clear all overrides (back to per-size palette defaults). */
  onReset: () => void;
  /** Save the current model + colors as a preset. */
  onSave: () => void;
  /** Whether AI coloring is currently in-flight. */
  aiPending: boolean;
}

export const ColorPanel: React.FC<ColorPanelProps> = ({
  open,
  onClose,
  bricks,
  onUniformColor,
  onAiColor,
  manualMode,
  onSetManualMode,
  manualColor,
  onSetManualColor,
  onReset,
  onSave,
  aiPending,
}) => {
  const t = useT();
  const [customHex, setCustomHex] = useState('#74c69d');

  if (!open) return null;

  const handleAi = async () => {
    if (aiPending) return;
    try {
      await onAiColor();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed top-28 right-6 z-30 w-[300px] max-w-[calc(100vw-3rem)] pointer-events-auto">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#f4f5d3] to-white border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-[#a1a43a]" />
            <span className="font-black tracking-tight text-slate-800 text-sm uppercase">{t('color.panel.title')}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* AI 着色 */}
          <button
            onClick={handleAi}
            disabled={aiPending || bricks.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#d4d76a] text-slate-900 font-bold text-sm shadow-sm hover:bg-[#c5c85a] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {aiPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {aiPending ? t('color.ai.pending') : t('color.ai')}
          </button>

          {/* 调色板 */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">{t('color.uniform')}</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  onClick={() => onUniformColor(hex)}
                  title={hex}
                  className="aspect-square rounded-lg border-2 border-white shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                className="h-9 w-12 rounded-lg border border-slate-200 cursor-pointer"
              />
              <button
                onClick={() => onUniformColor(customHex)}
                className="flex-1 text-xs font-bold text-slate-700 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                {t('color.uniform.apply')}
              </button>
            </div>
          </div>

          {/* 手动涂色 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('color.manual')}</p>
              <button
                onClick={() => onSetManualMode(!manualMode)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                  manualMode ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-slate-100 text-slate-500 border border-transparent hover:text-slate-700'
                }`}
              >
                <Brush size={11} /> {manualMode ? t('color.manual.on') : t('color.manual.off')}
              </button>
            </div>
            {manualMode && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={manualColor}
                  onChange={(e) => onSetManualColor(e.target.value)}
                  className="h-9 w-12 rounded-lg border border-slate-200 cursor-pointer"
                />
                <span className="text-xs text-slate-500 font-mono">{manualColor.toUpperCase()}</span>
              </div>
            )}
            <p className="mt-1 text-[10px] text-slate-400 leading-snug">{t('color.manual.hint')}</p>
          </div>

          {/* 重置 / 保存 */}
          <div className="flex gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={onReset}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors"
            >
              <RotateCcw size={12} /> {t('color.reset')}
            </button>
            <button
              onClick={onSave}
              disabled={bricks.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#f4f5d3] text-[#8e9234] hover:bg-[#eaedb6] text-xs font-bold transition-colors disabled:opacity-40"
            >
              <Save size={12} /> {t('color.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
