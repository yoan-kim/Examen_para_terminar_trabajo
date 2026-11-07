import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  ChevronLeft,
  Eye,
  EyeOff,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Bookmark,
} from 'lucide-react';
import { AppLanguage, I18N } from '../data/i18n';
import {
  VocabWord,
  ALL_WORDS_LIST,
  getWordDisplay,
  checkTermAnswer,
  checkMeaningAnswer,
} from '../data/vocabData';
import { speakEcuadorSpanish } from '../utils/tts';
import { playFeedbackAndSpeak } from '../utils/soundEffects';
import { triggerFireworks } from './FireworksOverlay';
import { EtymologyPromptBox } from './EtymologyPromptBox';
import { WordTipNoteBox } from './WordTipNoteBox';

export type QuizMode = 'speed' | 'write';
export type QuestionDirection = 'meaning-to-term' | 'term-to-meaning';

export interface QuizQuestion {
  word: VocabWord;
  dir: QuestionDirection;
  choices: VocabWord[];
}

interface QuizEngineProps {
  mode: QuizMode;
  wordsPool: VocabWord[];
  lang: AppLanguage;
  isFocusQuiz?: boolean;
  customBanner?: string;
  focusIds: number[];
  onToggleFocus: (wordId: number) => void;
  isActiveView: boolean;
  shuffleSeed?: number;
  onCompleteAllQuestions?: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const TILDE_CHARS = ['á', 'é', 'í', 'ó', 'ú', 'ñ', '/'];

export const QuizEngine: React.FC<QuizEngineProps> = ({
  mode,
  wordsPool,
  lang,
  isFocusQuiz = false,
  customBanner,
  focusIds,
  onToggleFocus,
  isActiveView,
  shuffleSeed = 0,
  onCompleteAllQuestions,
}) => {
  const t = I18N[lang];
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [internalShuffleTick, setInternalShuffleTick] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [missingTilde, setMissingTilde] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [showAnswerHint, setShowAnswerHint] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Write mode input state
  const [writeInputVal, setWriteInputVal] = useState('');
  const writeInputRef = useRef<HTMLInputElement | null>(null);

  // Speed mode bonus spelling state
  const [bonusInputVal, setBonusInputVal] = useState('');
  const [bonusChecked, setBonusChecked] = useState(false);
  const [bonusCorrect, setBonusCorrect] = useState(false);
  const [bonusMissingTilde, setBonusMissingTilde] = useState(false);
  const [termUnmasked, setTermUnmasked] = useState(false);
  const bonusInputRef = useRef<HTMLInputElement | null>(null);

  const resetQuestionState = useCallback(() => {
    setAnswered(false);
    setIsCorrect(false);
    setMissingTilde(false);
    setSelectedChoiceId(null);
    setShowAnswerHint(false);
    setNoticeMsg(null);
    setWriteInputVal('');
    setBonusInputVal('');
    setBonusChecked(false);
    setBonusCorrect(false);
    setBonusMissingTilde(false);
    setTermUnmasked(false);
  }, []);

  // Build shuffled 2x question deck whenever wordsPool changes
  useEffect(() => {
    if (!wordsPool || wordsPool.length === 0) {
      setQuestions([]);
      return;
    }

    const buildChoices = (targetWord: VocabWord): VocabWord[] => {
      const distractorsPool =
        wordsPool.length >= 4
          ? wordsPool.filter((w) => w.id !== targetWord.id)
          : ALL_WORDS_LIST.filter((w) => w.id !== targetWord.id);
      const picked = shuffleArray(distractorsPool).slice(0, 3);
      return shuffleArray([targetWord, ...picked]);
    };

    const forwardQs: QuizQuestion[] = wordsPool.map((w) => ({
      word: w,
      dir: 'meaning-to-term',
      choices: buildChoices(w),
    }));

    const reverseQs: QuizQuestion[] = wordsPool.map((w) => ({
      word: w,
      dir: 'term-to-meaning',
      choices: buildChoices(w),
    }));

    setQuestions(shuffleArray([...forwardQs, ...reverseQs]));
    setCurrentIdx(0);
    resetQuestionState();
  }, [wordsPool, shuffleSeed, internalShuffleTick, resetQuestionState]);

  useEffect(() => {
    if (mode === 'write' && isActiveView && !answered) {
      setTimeout(() => {
        writeInputRef.current?.focus();
      }, 40);
    }
  }, [currentIdx, mode, isActiveView, answered]);

  const curQ = questions[currentIdx];

  const handleSelectChoice = useCallback(
    (choiceWord: VocabWord) => {
      if (!curQ || answered) return;
      const correct = choiceWord.id === curQ.word.id;
      setSelectedChoiceId(choiceWord.id);
      setIsCorrect(correct);
      setAnswered(true);
      setShowAnswerHint(false);
      setTermUnmasked(false);
      playFeedbackAndSpeak(
        correct ? 'speed-correct' : 'wrong',
        curQ.word.es
      );
    },
    [curQ, answered]
  );

  const handleCheckWrite = useCallback(() => {
    if (!curQ || answered) return;
    if (!writeInputVal.trim()) {
      writeInputRef.current?.focus();
      return;
    }

    const result =
      curQ.dir === 'meaning-to-term'
        ? checkTermAnswer(writeInputVal, curQ.word, lang)
        : checkMeaningAnswer(writeInputVal, curQ.word, lang);

    setIsCorrect(result.isCorrect);
    setMissingTilde(result.missingTilde);
    setAnswered(true);
    setShowAnswerHint(false);

    if (result.isCorrect) {
      playFeedbackAndSpeak('write-correct', curQ.word.es);
      triggerFireworks('small');
    } else {
      playFeedbackAndSpeak('wrong', curQ.word.es);
    }
  }, [curQ, answered, writeInputVal, lang]);

  const handleCheckBonusSpelling = useCallback(() => {
    if (!curQ || !bonusInputVal.trim()) {
      bonusInputRef.current?.focus();
      return;
    }

    const result = checkTermAnswer(bonusInputVal, curQ.word, lang);
    setBonusChecked(true);
    setBonusCorrect(result.isCorrect);
    setBonusMissingTilde(result.missingTilde);
    if (result.isCorrect) {
      setTermUnmasked(true);
      playFeedbackAndSpeak('write-correct', curQ.word.es);
      triggerFireworks('small');
    } else {
      playFeedbackAndSpeak('wrong', curQ.word.es);
    }
  }, [curQ, bonusInputVal, lang]);

  const handleNextQuestion = useCallback(() => {
    if (questions.length === 0) return;
    if (currentIdx + 1 >= questions.length) {
      if (onCompleteAllQuestions) {
        onCompleteAllQuestions();
      } else {
        setInternalShuffleTick((prev) => prev + 1);
      }
      return;
    }
    setCurrentIdx((prev) => prev + 1);
    resetQuestionState();
  }, [
    questions.length,
    currentIdx,
    onCompleteAllQuestions,
    resetQuestionState,
  ]);

  const handlePrevQuestion = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((prev) => prev - 1);
      resetQuestionState();
    } else {
      setNoticeMsg(t.firstWordNotice);
      setTimeout(() => setNoticeMsg(null), 2000);
    }
  }, [currentIdx, resetQuestionState, t.firstWordNotice]);

  const handleRetryCurrent = useCallback(() => {
    resetQuestionState();
    if (mode === 'write') {
      setTimeout(() => writeInputRef.current?.focus(), 40);
    }
  }, [resetQuestionState, mode]);

  const insertCharToInput = (target: 'write' | 'bonus', ch: string) => {
    const ref =
      target === 'write' ? writeInputRef.current : bonusInputRef.current;
    const setter = target === 'write' ? setWriteInputVal : setBonusInputVal;
    const currentVal = target === 'write' ? writeInputVal : bonusInputVal;

    if (!ref || ref.disabled) return;
    const start = ref.selectionStart ?? currentVal.length;
    const end = ref.selectionEnd ?? currentVal.length;
    const nextVal = currentVal.slice(0, start) + ch + currentVal.slice(end);
    setter(nextVal);
    setTimeout(() => {
      ref.focus();
      ref.setSelectionRange(start + ch.length, start + ch.length);
    }, 0);
  };

  // Keyboard shortcuts handler for active quiz view
  useEffect(() => {
    if (!isActiveView || !curQ) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName === 'TEXTAREA') {
        return;
      }
      const isTyping = activeEl && activeEl.tagName === 'INPUT';
      const isBonusFocused = activeEl === bonusInputRef.current;
      const isWriteFocused = activeEl === writeInputRef.current;

      // 1~7 tilde insertion while typing Spanish (bonus input or 한➔스 write input)
      const isSpanishInput =
        isBonusFocused || (isWriteFocused && curQ.dir === 'meaning-to-term');

      if (
        isSpanishInput &&
        isTyping &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        ['1', '2', '3', '4', '5', '6', '7'].includes(e.key)
      ) {
        const idx = parseInt(e.key, 10) - 1;
        const ch = TILDE_CHARS[idx];
        if (ch) {
          e.preventDefault();
          insertCharToInput(isBonusFocused ? 'bonus' : 'write', ch);
          return;
        }
      }

      // 8: Previous question
      if (e.key === '8' && !isTyping) {
        e.preventDefault();
        handlePrevQuestion();
        return;
      }

      // 9: Retry current question
      if (e.key === '9' && !isTyping && answered) {
        e.preventDefault();
        handleRetryCurrent();
        return;
      }

      // 1~4: Multiple choice selection in Speed mode
      if (
        mode === 'speed' &&
        !answered &&
        !isTyping &&
        ['1', '2', '3', '4'].includes(e.key)
      ) {
        const idx = parseInt(e.key, 10) - 1;
        const picked = curQ.choices[idx];
        if (picked) {
          e.preventDefault();
          handleSelectChoice(picked);
          return;
        }
      }

      // Enter: Submit or Next
      if (e.key === 'Enter') {
        if (mode === 'speed') {
          if (isBonusFocused) {
            e.preventDefault();
            if (bonusInputVal.trim() && !bonusChecked) {
              handleCheckBonusSpelling();
            } else {
              handleNextQuestion();
            }
            return;
          }
          if (answered) {
            e.preventDefault();
            handleNextQuestion();
            return;
          }
        } else if (mode === 'write') {
          e.preventDefault();
          if (answered) {
            handleNextQuestion();
          } else if (isWriteFocused || writeInputVal.trim()) {
            handleCheckWrite();
          }
          return;
        }
      }

      // Non-typing shortcuts: 0 (Audio), H (Answer hint), C (Focus toggle)
      if (!isTyping) {
        const keyLower = e.key.toLowerCase();
        if (e.key === '0') {
          e.preventDefault();
          speakEcuadorSpanish(curQ.word.es);
        } else if (keyLower === 'h' || e.key === 'ㅎ') {
          e.preventDefault();
          setShowAnswerHint((prev) => !prev);
        } else if (keyLower === 'c' || e.key === 'ㅊ') {
          e.preventDefault();
          onToggleFocus(curQ.word.id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isActiveView,
    curQ,
    lang,
    mode,
    answered,
    bonusInputVal,
    bonusChecked,
    writeInputVal,
    handlePrevQuestion,
    handleRetryCurrent,
    handleSelectChoice,
    handleCheckBonusSpelling,
    handleNextQuestion,
    handleCheckWrite,
    onToggleFocus,
  ]);

  if (!curQ) {
    return null;
  }

  const display = getWordDisplay(curQ.word, lang);
  const isForward = curQ.dir === 'meaning-to-term';
  const promptText = isForward ? display.meaning : display.term;
  const targetAnswerText = isForward ? display.term : display.meaning;
  const inFocus = focusIds.includes(curQ.word.id);

  // In Speed mode, after answering, mask the Spanish word so the user can test themselves in the bonus box without copying
  const shouldMaskTerm = mode === 'speed' && answered && !termUnmasked;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Info Banner */}
      <div className="rounded-xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 px-4 py-2.5 text-center text-xs sm:text-sm font-bold text-emerald-800 dark:text-emerald-300">
        {customBanner
          ? customBanner
          : isFocusQuiz
          ? t.bannerFocusQuiz(wordsPool.length)
          : t.banner40Questions}
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-200"
            style={{
              width: `${((currentIdx + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
        <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 font-mono tabular-nums">
          {currentIdx + 1}/{questions.length}
        </span>
      </div>

      {/* Notice Toast if user presses Prev on first item */}
      {noticeMsg && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-3 py-2 text-center text-xs font-bold text-amber-800 dark:text-amber-300">
          {noticeMsg}
        </div>
      )}

      {/* Main Question Box */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 text-center">
        {/* Direction Kicker */}
        <div className="mb-2">
          <span
            className={`text-xs font-extrabold tracking-tight ${
              isForward
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {mode === 'speed'
              ? isForward
                ? t.speedBadgeForward
                : t.speedBadgeReverse
              : isForward
              ? t.writeBadgeForward
              : t.writeBadgeReverse}
          </span>
        </div>

        {/* Prompt Word */}
        <div className="min-h-[56px] flex items-center justify-center my-2 px-2">
          {!isForward && shouldMaskTerm ? (
            <button
              type="button"
              onClick={() => setTermUnmasked(true)}
              title={t.touchToRevealTooltip}
              className="px-5 py-2 rounded-xl bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 cursor-pointer hover:border-indigo-500 transition-colors"
            >
              {t.touchToReveal}
            </button>
          ) : (
            <h2
              className={`font-extrabold text-slate-900 dark:text-white tracking-tight ${
                promptText.length > 35
                  ? 'text-lg sm:text-xl leading-snug'
                  : 'text-2xl sm:text-3xl'
              }`}
            >
              {promptText}
            </h2>
          )}
        </div>

        {/* Pronunciation Trigger Button */}
        {(!isForward || answered) && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => speakEcuadorSpanish(curQ.word.es)}
              title={t.listenPronunciationTooltip}
              className="min-h-[38px] px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{t.listenPronunciation}</span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                (0)
              </span>
            </button>
          </div>
        )}

        {/* Study Tool Bar — 이전 (8) and 정답확인 (H) */}
        <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrevQuestion}
            title="이전 문제로 이동 (단축키: 8)"
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.prevWordBtn}</span>
            <span className="font-mono text-[11px] text-slate-400">(8)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAnswerHint((prev) => !prev)}
            title="정답 미리보기 열기/닫기 (단축키: H)"
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            {showAnswerHint ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span>{showAnswerHint ? t.hideAnswerBtn : t.showAnswerBtn}</span>
            <span className="font-mono text-[11px] opacity-75">(H)</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFocus(curQ.word.id)}
            title={t.moveToFocusTooltip}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer ${
              inFocus
                ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${
                inFocus ? 'fill-amber-500 text-amber-600 dark:text-amber-400' : ''
              }`}
            />
            <span>{inFocus ? '집중 학습 추가됨' : '집중 학습 추가'}</span>
            <span className="font-mono text-[11px] opacity-75">(C)</span>
          </button>
        </div>

        {/* Inline Answer Reveal Panel */}
        {showAnswerHint && (
          <div className="mt-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-400 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-sm font-extrabold">
            <span>{t.answerRevealPrefix} </span>
            <span className="text-indigo-700 dark:text-indigo-300 underline underline-offset-4">
              {targetAnswerText}
            </span>
          </div>
        )}
      </div>

      {/* MODE 1: SPEED QUIZ CHOICES */}
      {mode === 'speed' && (
        <div className="flex flex-col gap-2.5">
          {curQ.choices.map((choice, idx) => {
            const cDisp = getWordDisplay(choice, lang);
            const choiceText = isForward ? cDisp.term : cDisp.meaning;
            const isTargetCorrect = choice.id === curQ.word.id;
            const isSelected = selectedChoiceId === choice.id;

            let btnStyle =
              'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-indigo-400 dark:hover:border-indigo-500';
            let numStyle =
              'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700';

            if (answered) {
              if (isTargetCorrect) {
                btnStyle =
                  'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200';
                numStyle = 'bg-emerald-600 text-white border-emerald-600';
              } else if (isSelected && !isTargetCorrect) {
                btnStyle =
                  'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200';
                numStyle = 'bg-rose-600 text-white border-rose-600';
              } else {
                btnStyle =
                  'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 opacity-70';
              }
            }

            const isMaskedTargetChoice =
              answered && isTargetCorrect && isForward && shouldMaskTerm;

            return (
              <button
                key={choice.id}
                type="button"
                disabled={answered && !isMaskedTargetChoice}
                onClick={() => {
                  if (!answered) {
                    handleSelectChoice(choice);
                  } else if (isMaskedTargetChoice) {
                    setTermUnmasked(true);
                  }
                }}
                title={
                  isMaskedTargetChoice
                    ? t.touchToRevealTooltip
                    : `${idx + 1}번 보기 선택 (단축키: ${idx + 1})`
                }
                className={`w-full min-h-[52px] px-4 py-3 rounded-xl border-2 text-left font-bold text-sm sm:text-base flex items-center justify-between gap-3 transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`w-7 h-7 rounded-lg border text-xs font-extrabold font-mono tabular-nums flex items-center justify-center shrink-0 ${numStyle}`}
                  >
                    {idx + 1}
                  </span>
                  {isMaskedTargetChoice ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setTermUnmasked(true);
                      }}
                      title={t.touchToRevealTooltip}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 border border-dashed border-emerald-500 text-xs font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer transition-colors"
                    >
                      {t.touchToReveal}
                    </span>
                  ) : (
                    <span className="break-words leading-snug">{choiceText}</span>
                  )}
                </div>
                <span className="text-xs font-semibold opacity-50 shrink-0">
                  {isMaskedTargetChoice ? '클릭하여 정답 보기' : t.choiceSelectHint}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* MODE 2: WRITE / SPELLING QUIZ INPUT */}
      {mode === 'write' && (
        <div className="flex flex-col gap-3">
          <input
            ref={writeInputRef}
            type="text"
            disabled={answered}
            value={writeInputVal}
            onChange={(e) => setWriteInputVal(e.target.value)}
            placeholder={
              isForward ? t.writePlaceholderForward : t.writePlaceholderReverse
            }
            title={
              isForward ? t.writePlaceholderForward : t.writePlaceholderReverse
            }
            autoComplete="off"
            autoCapitalize="none"
            className={`w-full min-h-[52px] px-4 py-3 rounded-xl border-2 text-center text-base sm:text-lg font-extrabold outline-none transition-colors ${
              answered
                ? isCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                  : 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-600 dark:focus:border-indigo-400'
            }`}
          />

          {/* Tilde Toolbar (Shown when typing Spanish: 한➔스) */}
          {isForward && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {TILDE_CHARS.map((ch, idx) => (
                <button
                  key={ch}
                  type="button"
                  disabled={answered}
                  onClick={() => insertCharToInput('write', ch)}
                  title={`${ch} 입력 (단축키: ${idx + 1})`}
                  className="relative w-11 h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-extrabold text-base flex items-center justify-center pt-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span className="absolute top-1 left-1.5 text-[10px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                    {idx + 1}
                  </span>
                  {ch}
                </button>
              ))}
            </div>
          )}

          {!answered && (
            <button
              type="button"
              onClick={handleCheckWrite}
              title="입력한 답안 확인 (단축키: Enter)"
              className="w-full min-h-[50px] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-base transition-all cursor-pointer"
            >
              {t.checkAnswerBtn}
            </button>
          )}
        </div>
      )}

      {/* Feedback Banner (Shown when answered) */}
      {answered && (
        <div
          className={`rounded-xl border-2 p-4 transition-all ${
            isCorrect
              ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
              : 'border-rose-500 bg-rose-50/90 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="space-y-1 text-sm leading-relaxed">
              <div className="flex items-center gap-1.5 font-extrabold text-base">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{isCorrect ? t.correctTitle : t.wrongTitle}</span>
              </div>

              {missingTilde && (
                <p className="text-xs font-extrabold text-amber-700 dark:text-amber-300">
                  {t.missingTildeWarning}
                </p>
              )}

              <div className="font-bold">
                <span>{t.correctAnswerLabel} </span>
                {shouldMaskTerm ? (
                  <button
                    type="button"
                    onClick={() => setTermUnmasked(true)}
                    title={t.touchToRevealTooltip}
                    className="px-2.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    {t.touchToReveal}
                  </button>
                ) : (
                  <strong className="underline underline-offset-4">
                    {display.term}
                  </strong>
                )}
                <span> = </span>
                <strong>{display.meaning}</strong>
              </div>
            </div>

            {/* Move to Focus Study Checkbox */}
            <label
              title={t.moveToFocusTooltip}
              className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer select-none shrink-0 transition-colors ${
                inFocus
                  ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <input
                type="checkbox"
                checked={inFocus}
                onChange={() => onToggleFocus(curQ.word.id)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
              <Bookmark className="w-3.5 h-3.5" />
              <span>{t.moveToFocusLabel} (C)</span>
            </label>
          </div>
        </div>
      )}

      {/* Bonus Spelling Box in Speed Mode */}
      {mode === 'speed' && answered && (
        <div className="rounded-2xl border-2 border-dashed border-indigo-400/80 dark:border-indigo-500/60 bg-slate-50/80 dark:bg-slate-900/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
              {t.bonusSpellingTitle}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {t.bonusSpellingSkipTip}
            </span>
          </div>

          <div className="flex gap-2">
            <input
              ref={bonusInputRef}
              type="text"
              value={bonusInputVal}
              onChange={(e) => setBonusInputVal(e.target.value)}
              placeholder={t.bonusSpellingPlaceholder}
              title={t.bonusSpellingPlaceholder}
              autoComplete="off"
              autoCapitalize="none"
              className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl border-2 text-center text-sm sm:text-base font-extrabold outline-none ${
                bonusChecked
                  ? bonusCorrect
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                    : 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-500'
              }`}
            />
            <button
              type="button"
              onClick={handleCheckBonusSpelling}
              title="보너스 스페인어 철자 확인"
              className="min-h-[44px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-extrabold shrink-0 cursor-pointer"
            >
              {t.bonusConfirmBtn}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {TILDE_CHARS.map((ch, idx) => (
              <button
                key={ch}
                type="button"
                onClick={() => insertCharToInput('bonus', ch)}
                title={`${ch} 입력 (단축키: ${idx + 1})`}
                className="relative w-10 h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-900 dark:text-white font-extrabold text-sm flex items-center justify-center pt-1 cursor-pointer"
              >
                <span className="absolute top-0.5 left-1 text-[9px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                  {idx + 1}
                </span>
                {ch}
              </button>
            ))}
          </div>

          {bonusChecked && (
            <div
              className={`text-center text-xs sm:text-sm font-extrabold ${
                bonusCorrect
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-300'
              }`}
            >
              {bonusMissingTilde ? `${t.missingTildeWarning} ` : ''}
              {bonusCorrect ? t.bonusCorrectMsg : t.bonusWrongMsg}{' '}
              <span className="underline">{display.term}</span>
            </div>
          )}
        </div>
      )}

      {/* Per-Word Memory Tip Note (shown after answer confirmation when Advanced Study Mode is active) */}
      {(answered || showAnswerHint) && <WordTipNoteBox word={curQ.word} />}

      {/* Etymology Recommended Prompt Button & Box (Directly above Retry & Next) */}
      <EtymologyPromptBox resetKey={`${mode}-${currentIdx}`} />

      {/* Retry & Next Action Bar */}
      {answered && (
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleRetryCurrent}
            title="현재 문제 다시 풀기 (단축키: 9)"
            className="flex-1 min-h-[48px] px-3 py-3 rounded-xl border-2 border-amber-500 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.retryBtn}</span>
            <span className="font-mono text-xs">(9)</span>
          </button>

          <button
            type="button"
            onClick={handleNextQuestion}
            title="다음 문제로 이동 (단축키: Enter)"
            className="flex-[2] min-h-[48px] px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>{t.nextQuestionBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
