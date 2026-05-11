import React from 'react';
import { Languages } from 'lucide-react';
import { useLocale } from '../i18n/LocaleContext';

export const LanguageToggle: React.FC = () => {
  const { locale, setLocale, t } = useLocale();
  const next = locale === 'zh' ? 'en' : 'zh';
  const label = next === 'en' ? t('ui.lang.toggle_to_en') : t('ui.lang.toggle_to_zh');

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      title={t('ui.lang.tooltip')}
      aria-label={t('ui.lang.tooltip')}
      className="fixed bottom-6 right-6 z-40 pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/85 hover:bg-white border border-white/50 shadow-lg backdrop-blur-md text-slate-700 hover:text-slate-900 transition-all active:scale-95 font-bold text-sm"
    >
      <Languages size={16} className="text-slate-500" />
      <span className="font-mono tracking-wider">{label}</span>
    </button>
  );
};
