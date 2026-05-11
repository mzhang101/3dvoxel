import React, { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import { useT } from '../i18n/LocaleContext';

interface ModelSourceSettingsProps {
  googleOnly: boolean;
  onGoogleOnlyChange: (googleOnly: boolean) => void;
}

export const ModelSourceSettings: React.FC<ModelSourceSettingsProps> = ({
  googleOnly,
  onGoogleOnlyChange,
}) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="fixed bottom-[5.75rem] right-6 z-40 pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t('settings.model_sources.tooltip')}
        aria-label={t('settings.model_sources.tooltip')}
        aria-expanded={open}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border shadow-lg backdrop-blur-md text-sm font-bold transition-all active:scale-95 ${
          open || googleOnly
            ? 'bg-[#f4f5d3] border-[#d4d76a]/60 text-slate-800'
            : 'bg-white/85 hover:bg-white border-white/50 text-slate-700 hover:text-slate-900'
        }`}
      >
        <Settings size={16} className="text-slate-500" />
        <span className="max-w-[10rem] truncate hidden sm:inline">{t('settings.model_sources.short_label')}</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full right-0 mb-3 w-[min(20rem,calc(100vw-3rem))] rounded-2xl border border-white/50 bg-white/95 p-4 shadow-xl backdrop-blur-xl"
          role="dialog"
          aria-label={t('settings.model_sources.title')}
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {t('settings.model_sources.title')}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">{t('settings.model_sources.hint')}</p>

          <div className="mt-4 flex flex-col gap-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-slate-50/90 ${
                googleOnly ? 'border-[#d4d76a]/60 bg-[#f4f5d3]/60' : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <input
                type="radio"
                name="model-source-scope"
                className="mt-0.5"
                checked={googleOnly}
                onChange={() => {
                  onGoogleOnlyChange(true);
                  setOpen(false);
                }}
              />
              <span className="text-sm font-semibold text-slate-800">{t('settings.model_sources.google_only')}</span>
            </label>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-slate-50/90 ${
                !googleOnly ? 'border-[#d4d76a]/60 bg-[#f4f5d3]/60' : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <input
                type="radio"
                name="model-source-scope"
                className="mt-0.5"
                checked={!googleOnly}
                onChange={() => {
                  onGoogleOnlyChange(false);
                  setOpen(false);
                }}
              />
              <span className="text-sm font-semibold text-slate-800">{t('settings.model_sources.all_vendors')}</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
