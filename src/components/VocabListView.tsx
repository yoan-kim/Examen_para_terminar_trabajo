import React, { useState, useMemo, useEffect } from 'react';
import { Volume2, Search, Eye, EyeOff, Bookmark, X } from 'lucide-react';
import { AppLanguage, I18N } from '../data/i18n';
import {
  VocabWord,
  VOCAB_DATABASE,
  ALL_WORDS_LIST,
  getWordDisplay,
} from '../data/vocabData';
import { speakEcuadorSpanish } from '../utils/tts';
import { WordTipNoteBox } from './WordTipNoteBox';

interface VocabListViewProps {
  currentRound: number;
  lang: AppLanguage;
  focusIds: number[];
  onToggleFocus: (wordId: number) => void;
}

export const VocabListView: React.FC<VocabListViewProps> = ({
  currentRound,
  lang,
  focusIds,
  onToggleFocus,
}) => {
  const t = I18N[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'round' | 'all'>('round');
  const [maskTermAll, setMaskTermAll] = useState(false);
  const [maskDefAll, setMaskDefAll] = useState(false);
  const [unmaskedTermIds, setUnmaskedTermIds] = useState<number[]>([]);
  const [unmaskedDefIds, setUnmaskedDefIds] = useState<number[]>([]);

  useEffect(() => {
    setUnmaskedTermIds([]);
    setUnmaskedDefIds([]);
  }, [currentRound, maskTermAll, maskDefAll, searchScope]);

  const filteredWords: VocabWord[] = useMemo(() => {
    const basePool =
      searchScope === 'all'
        ? ALL_WORDS_LIST
        : VOCAB_DATABASE[currentRound]?.words || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return basePool;

    return basePool.filter((w) => {
      const disp = getWordDisplay(w, lang);
      return (
        disp.term.toLowerCase().includes(q) ||
        disp.meaning.toLowerCase().includes(q)
      );
    });
  }, [currentRound, searchScope, searchQuery, lang]);

  const isTermMasked = (id: number) =>
    maskTermAll && !unmaskedTermIds.includes(id);
  const isDefMasked = (id: number) =>
    maskDefAll && !unmaskedDefIds.includes(id);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs sm:text-sm font-extrabold text-slate-600 dark:text-slate-400">
          {searchScope === 'all'
            ? t.vocabAllRoundsTitle(filteredWords.length)
            : t.vocabListTitle(currentRound, filteredWords.length)}
        </span>
        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
          {t.ecuadorBadge}
        </span>
      </div>

      {/* Search & Scope Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            title={t.searchPlaceholder}
            className="w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              title={t.searchClearTooltip}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scope Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setSearchScope('round')}
            title="현재 회차(20단어) 내에서 검색"
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
              searchScope === 'round'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.searchScopeRound}
          </button>
          <button
            type="button"
            onClick={() => setSearchScope('all')}
            title="1~30회차 전체 600단어에서 검색"
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-extrabold transition-colors cursor-pointer whitespace-nowrap ${
              searchScope === 'all'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.searchScopeAll}
          </button>
        </div>
      </div>

      {/* Masking Header Buttons */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setMaskTermAll((prev) => !prev)}
          title={maskTermAll ? t.maskTermShow : t.maskTermHide}
          className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            maskTermAll
              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {maskTermAll ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
          <span>{maskTermAll ? t.maskTermShow : t.maskTermHide}</span>
        </button>

        <button
          type="button"
          onClick={() => setMaskDefAll((prev) => !prev)}
          title={maskDefAll ? t.maskDefShow : t.maskDefHide}
          className={`min-h-[42px] px-3 py-2 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            maskDefAll
              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {maskDefAll ? (
            <Eye className="w-4 h-4" />
          ) : (
            <EyeOff className="w-4 h-4" />
          )}
          <span>{maskDefAll ? t.maskDefShow : t.maskDefHide}</span>
        </button>
      </div>

      {/* Word List */}
      <div className="max-h-[62vh] overflow-y-auto flex flex-col gap-2 pr-1">
        {filteredWords.length === 0 ? (
          <div className="py-12 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
            {t.noSearchResults}
          </div>
        ) : (
          filteredWords.map((v, idx) => {
            const disp = getWordDisplay(v, lang);
            const termMasked = isTermMasked(v.id);
            const defMasked = isDefMasked(v.id);
            const inFocus = focusIds.includes(v.id);

            return (
              <div
                key={v.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col gap-1"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => speakEcuadorSpanish(v.es)}
                      title={t.listenPronunciationTooltip}
                      className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-mono font-extrabold text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                      {searchScope === 'all'
                        ? `${t.roundBadgeText(v.round)} ·`
                        : `${idx + 1}.`}
                    </span>

                    {termMasked ? (
                      <button
                        type="button"
                        onClick={() =>
                          setUnmaskedTermIds((prev) => [...prev, v.id])
                        }
                        title={t.touchToRevealTooltip}
                        className="min-h-[30px] min-w-[90px] px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-400 dark:text-slate-500 cursor-pointer"
                      >
                        {t.touchToReveal}
                      </button>
                    ) : (
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-base break-words">
                        {disp.term}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 pl-11 sm:pl-0">
                    {defMasked ? (
                      <button
                        type="button"
                        onClick={() =>
                          setUnmaskedDefIds((prev) => [...prev, v.id])
                        }
                        title={t.touchToRevealTooltip}
                        className="min-h-[30px] min-w-[110px] px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-400 dark:text-slate-500 cursor-pointer"
                      >
                        {t.touchToReveal}
                      </button>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 sm:text-right leading-snug">
                        {disp.meaning}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleFocus(v.id)}
                      title={t.moveToFocusTooltip}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        inFocus
                          ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-600 dark:text-amber-400'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>

                <WordTipNoteBox word={v} compact />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
