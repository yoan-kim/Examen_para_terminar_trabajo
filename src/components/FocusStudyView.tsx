import React, { useState, useMemo, useEffect } from 'react';
import {
  Volume2,
  Trash2,
  Eye,
  EyeOff,
  FolderOpen,
  Zap,
  PenTool,
  List,
} from 'lucide-react';
import { AppLanguage, I18N } from '../data/i18n';
import { ALL_WORDS_MAP, VocabWord, getWordDisplay } from '../data/vocabData';
import { speakEcuadorSpanish } from '../utils/tts';
import { QuizEngine } from './QuizEngine';

interface FocusStudyViewProps {
  lang: AppLanguage;
  focusIds: number[];
  onToggleFocus: (wordId: number) => void;
  onClearAllFocus: () => void;
  isActiveView: boolean;
}

export const FocusStudyView: React.FC<FocusStudyViewProps> = ({
  lang,
  focusIds,
  onToggleFocus,
  onClearAllFocus,
  isActiveView,
}) => {
  const t = I18N[lang];
  const [subMode, setSubMode] = useState<'list' | 'speed' | 'write'>('list');
  const [maskTermAll, setMaskTermAll] = useState(false);
  const [maskDefAll, setMaskDefAll] = useState(false);
  const [unmaskedTermIds, setUnmaskedTermIds] = useState<number[]>([]);
  const [unmaskedDefIds, setUnmaskedDefIds] = useState<number[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const focusWords: VocabWord[] = useMemo(() => {
    return focusIds
      .map((id) => ALL_WORDS_MAP[id])
      .filter((w): w is VocabWord => Boolean(w));
  }, [focusIds]);

  useEffect(() => {
    if (focusWords.length === 0 && subMode !== 'list') {
      setSubMode('list');
    }
  }, [focusWords.length, subMode]);

  useEffect(() => {
    setUnmaskedTermIds([]);
    setUnmaskedDefIds([]);
  }, [maskTermAll, maskDefAll]);

  const isTermMasked = (id: number) =>
    maskTermAll && !unmaskedTermIds.includes(id);
  const isDefMasked = (id: number) =>
    maskDefAll && !unmaskedDefIds.includes(id);

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Clear Action */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
            {t.focusFolderTitle}
          </h3>
          <span className="text-xs font-extrabold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
            {t.focusCountText(focusWords.length)}
          </span>
        </div>

        {focusWords.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearAllFocus();
                    setConfirmClear(false);
                  }}
                  title="집중공부 폴더 전체 비우기 확인"
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold cursor-pointer"
                >
                  {t.clearAllFocusBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  title={t.cancelClearBtn}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  {t.cancelClearBtn}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                title="저장된 집중공부 단어 모두 비우기"
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer"
              >
                {t.clearAllFocusBtn}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub-mode Switcher (List / Focus Speed Quiz / Focus Write Quiz) */}
      {focusWords.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setSubMode('list')}
            title="저장된 집중공부 단어 목록 보기"
            className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              subMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.focusSubTabList}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('speed')}
            title="저장된 단어로 스피드 퀴즈 풀기"
            className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              subMode === 'speed'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.focusSubTabSpeed}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('write')}
            title="저장된 단어로 철자 연습하기"
            className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              subMode === 'write'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{t.focusSubTabWrite}</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {focusWords.length === 0 ? (
        <div className="py-14 px-4 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <FolderOpen className="w-7 h-7" />
          </div>
          <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
            {t.focusEmptyTitle}
          </p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
            {t.focusEmptyDesc}
          </p>
        </div>
      ) : subMode === 'list' ? (
        <>
          {/* Masking Controls */}
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

          {/* Saved Focus Words List */}
          <div className="max-h-[58vh] overflow-y-auto flex flex-col gap-2 pr-1">
            {focusWords.map((v) => {
              const disp = getWordDisplay(v, lang);
              const termMasked = isTermMasked(v.id);
              const defMasked = isDefMasked(v.id);

              return (
                <div
                  key={v.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => speakEcuadorSpanish(v.es)}
                      title={t.listenPronunciationTooltip}
                      className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>

                    <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 font-mono tabular-nums shrink-0">
                      {t.roundBadgeText(v.round)} ·
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
                      title={t.deleteWordTitle}
                      className="w-8 h-8 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-500 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <QuizEngine
          mode={subMode}
          wordsPool={focusWords}
          lang={lang}
          isFocusQuiz={true}
          focusIds={focusIds}
          onToggleFocus={onToggleFocus}
          isActiveView={isActiveView}
        />
      )}
    </div>
  );
};
