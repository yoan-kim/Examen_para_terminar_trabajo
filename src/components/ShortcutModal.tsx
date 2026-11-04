import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { AppLanguage, I18N } from '../data/i18n';

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: AppLanguage;
}

export const ShortcutModal: React.FC<ShortcutModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const t = I18N[lang];

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t.shortcutModalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t.shortcutCloseTooltip}
            className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-extrabold border-b border-slate-200 dark:border-slate-800">
              <th className="text-left py-2.5 px-3 w-[30%]">
                {t.shortcutColKey}
              </th>
              <th className="text-left py-2.5 px-3">{t.shortcutColDesc}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {t.shortcutRows.map((row, idx) => (
              <tr key={idx}>
                <td className="py-2.5 px-3">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">
                    {row.key}
                  </span>
                </td>
                <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                  {row.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            title={t.shortcutCloseTooltip}
            className="w-full min-h-[44px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm cursor-pointer"
          >
            {t.shortcutCloseBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
