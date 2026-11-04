import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Volume2,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Zap,
  PenTool,
  Eye,
  EyeOff,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { AppLanguage, I18N } from '../data/i18n';
import { VocabWord, getWordDisplay } from '../data/vocabData';
import { speakEcuadorSpanish } from '../utils/tts';
import { QuizEngine } from './QuizEngine';

export interface WrongRecordItem {
  word: VocabWord;
  label: string;
  userAns: string;
  missingTilde: boolean;
}

interface WrongNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  wrongList: WrongRecordItem[];
  lang: AppLanguage;
  focusIds: number[];
  onToggleFocus: (wordId: number) => void;
}

type ModalTab = 'list' | 'speed' | 'write';

export const WrongNoteModal: React.FC<WrongNoteModalProps> = ({
  isOpen,
  onClose,
  wrongList,
  lang,
  focusIds,
  onToggleFocus,
}) => {
  const t = I18N[lang];
  const [subTab, setSubTab] = useState<ModalTab>('list');
  const [maskTerm, setMaskTerm] = useState(false);
  const [maskMeaning, setMaskMeaning] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  // Reset tab & masking state when opened
  useEffect(() => {
    if (isOpen) {
      setSubTab('list');
      setMaskTerm(false);
      setMaskMeaning(false);
      setRevealedIds({});
    }
  }, [isOpen]);

  // Deduplicated wrong words for re-study quiz modes
  const uniqueWrongWords = useMemo(() => {
    const map = new Map<number, VocabWord>();
    for (const item of wrongList) {
      if (!map.has(item.word.id)) {
        map.set(item.word.id, item.word);
      }
    }
    return Array.from(map.values());
  }, [wrongList]);

  const allAddedToFocus = useMemo(() => {
    if (uniqueWrongWords.length === 0) return false;
    return uniqueWrongWords.every((w) => focusIds.includes(w.id));
  }, [uniqueWrongWords, focusIds]);

  const handleAddAllToFocus = () => {
    if (allAddedToFocus) return;
    uniqueWrongWords.forEach((w) => {
      if (!focusIds.includes(w.id)) {
        onToggleFocus(w.id);
      }
    });
  };

  // Esc key to close modal (when not typing in an input)
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

  const toggleRevealKey = (key: string) => {
    setRevealedIds((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                📝 실전 시험 오답 노트
              </h3>
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-xs font-extrabold font-mono tabular-nums">
                틀린 단어 {uniqueWrongWords.length}개
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              틀린 단어들만 모아서 다시 학습하고 집중 학습 폴더에 추가해 완벽히 복습하세요.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="오답 노트 닫기 (Esc)"
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Sub-tabs & Bulk Add Bar */}
        <div className="px-4 sm:px-6 pt-3 pb-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2.5 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setSubTab('list')}
              title="오답 단어 목록 및 집중 학습 추가"
              className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                subTab === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">오답 목록 ({wrongList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('speed')}
              title="틀린 단어들만 스피드 퀴즈로 다시 학습"
              className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                subTab === 'speed'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">오답 스피드 학습</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('write')}
              title="틀린 단어들만 철자/뜻 쓰기로 다시 학습"
              className={`min-h-[38px] px-2 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                subTab === 'write'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">오답 철자 학습</span>
            </button>
          </div>

          {subTab === 'list' && uniqueWrongWords.length > 0 && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {/* Self-test Masking Controls */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setMaskTerm((prev) => !prev);
                    setRevealedIds({});
                  }}
                  title="스페인어 단어 가리기/보이기"
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer ${
                    maskTerm
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {maskTerm ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  <span>{maskTerm ? t.maskTermShow : t.maskTermHide}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMaskMeaning((prev) => !prev);
                    setRevealedIds({});
                  }}
                  title="한국어 뜻 가리기/보이기"
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer ${
                    maskMeaning
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {maskMeaning ? (
                    <Eye className="w-3.5 h-3.5" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5" />
                  )}
                  <span>{maskMeaning ? t.maskDefShow : t.maskDefHide}</span>
                </button>
              </div>

              {/* Bulk Add All Wrong Words to Focus */}
              <button
                type="button"
                onClick={handleAddAllToFocus}
                disabled={allAddedToFocus}
                title="틀린 단어 전체를 집중공부 폴더에 한 번에 추가"
                className={`min-h-[34px] px-3 py-1 rounded-lg border text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:cursor-default ${
                  allAddedToFocus
                    ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 text-amber-900 dark:text-amber-200'
                    : 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-400 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300'
                }`}
              >
                {allAddedToFocus ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>전체 집중 학습 추가됨</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>전체 오답 집중 학습 추가</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {wrongList.length === 0 ? (
            <div className="py-10 text-center text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
              {t.examPerfectMsg}
            </div>
          ) : subTab === 'list' ? (
            <div className="flex flex-col gap-3">
              {wrongList.map((w, idx) => {
                const disp = getWordDisplay(w.word, lang);
                const inFocus = focusIds.includes(w.word.id);
                const termKey = `term-${idx}-${w.word.id}`;
                const meaningKey = `meaning-${idx}-${w.word.id}`;
                const isTermHidden = maskTerm && !revealedIds[termKey];
                const isMeaningHidden = maskMeaning && !revealedIds[meaningKey];

                return (
                  <div
                    key={`${w.word.id}-${idx}`}
                    className="p-3.5 sm:p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-[11px] font-extrabold text-rose-700 dark:text-rose-300">
                          {w.label}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {t.roundBadgeText(w.word.round)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Spanish Term */}
                        {isTermHidden ? (
                          <button
                            type="button"
                            onClick={() => toggleRevealKey(termKey)}
                            title={t.touchToRevealTooltip}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 cursor-pointer"
                          >
                            {t.touchToReveal}
                          </button>
                        ) : (
                          <span
                            onClick={() => maskTerm && toggleRevealKey(termKey)}
                            className={`font-extrabold text-base sm:text-lg text-slate-900 dark:text-white ${
                              maskTerm ? 'cursor-pointer underline decoration-dotted' : ''
                            }`}
                          >
                            {disp.term}
                          </span>
                        )}

                        <span className="text-slate-400 font-bold">=</span>

                        {/* Korean Meaning */}
                        {isMeaningHidden ? (
                          <button
                            type="button"
                            onClick={() => toggleRevealKey(meaningKey)}
                            title={t.touchToRevealTooltip}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 cursor-pointer"
                          >
                            {t.touchToReveal}
                          </button>
                        ) : (
                          <span
                            onClick={() =>
                              maskMeaning && toggleRevealKey(meaningKey)
                            }
                            className={`font-bold text-sm sm:text-base text-indigo-700 dark:text-indigo-300 ${
                              maskMeaning
                                ? 'cursor-pointer underline decoration-dotted'
                                : ''
                            }`}
                          >
                            {disp.meaning}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-bold text-rose-700 dark:text-rose-300">
                        {t.examMyAnswerLabel}{' '}
                        <span className="line-through">
                          {w.userAns || t.examNoAnswer}
                        </span>{' '}
                        {w.missingTilde ? `(${t.missingTildeWarning})` : ''}
                      </div>
                    </div>

                    {/* Right Action Buttons: Pronunciation + Add to Focus Study */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => speakEcuadorSpanish(w.word.es)}
                        title={t.listenPronunciationTooltip}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span className="hidden sm:inline">발음</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleFocus(w.word.id)}
                        title={
                          inFocus
                            ? '집중 학습 폴더에서 해제'
                            : '집중 학습 폴더에 추가'
                        }
                        className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                          inFocus
                            ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white shadow-2xs'
                        }`}
                      >
                        {inFocus ? (
                          <>
                            <BookmarkCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span>집중 학습 추가됨</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4" />
                            <span>집중 학습 추가</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : subTab === 'speed' ? (
            <QuizEngine
              mode="speed"
              wordsPool={uniqueWrongWords}
              lang={lang}
              isFocusQuiz={true}
              customBanner={`💡 이번 시험에서 틀린 ${uniqueWrongWords.length}개 단어만 모아서 양방향(한⇄스) 스피드 퀴즈로 다시 학습합니다.`}
              focusIds={focusIds}
              onToggleFocus={onToggleFocus}
              isActiveView={isOpen && subTab === 'speed'}
            />
          ) : (
            <QuizEngine
              mode="write"
              wordsPool={uniqueWrongWords}
              lang={lang}
              isFocusQuiz={true}
              customBanner={`💡 이번 시험에서 틀린 ${uniqueWrongWords.length}개 단어만 모아서 스페인어 철자 및 뜻 쓰기로 다시 학습합니다.`}
              focusIds={focusIds}
              onToggleFocus={onToggleFocus}
              isActiveView={isOpen && subTab === 'write'}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          {subTab === 'list' ? (
            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubTab('speed')}
                title="오답 단어만 스피드 퀴즈로 다시 풀기"
                className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>오답 스피드 다시 학습</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('write')}
                title="오답 단어만 철자 쓰기로 다시 풀기"
                className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <PenTool className="w-4 h-4" />
                <span>오답 철자 다시 학습</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSubTab('list')}
              title="오답 단어 전체 목록으로 돌아가기"
              className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>오답 단어 목록 보기</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="오답 노트 팝업 닫기 (Esc)"
            className="w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-extrabold cursor-pointer"
          >
            닫기 (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
