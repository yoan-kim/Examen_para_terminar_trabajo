import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Target,
  Volume2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Award,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { AppLanguage, I18N } from '../data/i18n';
import {
  VocabWord,
  VOCAB_DATABASE,
  ALL_WORDS_LIST,
  getWordDisplay,
  checkTermAnswer,
  checkMeaningAnswer,
} from '../data/vocabData';
import { speakEcuadorSpanish } from '../utils/tts';
import { EtymologyPromptBox } from './EtymologyPromptBox';
import { WrongNoteModal } from './WrongNoteModal';

type ExamQuestionType =
  | 'meaning-to-term-write'
  | 'term-to-meaning-write'
  | 'meaning-to-term-choice'
  | 'term-to-meaning-choice';

interface ExamQuestion {
  word: VocabWord;
  isReview: boolean;
  qType: ExamQuestionType;
  label: string;
  choices: VocabWord[];
}

interface WrongRecord {
  word: VocabWord;
  label: string;
  userAns: string;
  missingTilde: boolean;
}

interface ExamViewProps {
  currentRound: number;
  lang: AppLanguage;
  focusIds: number[];
  onToggleFocus: (wordId: number) => void;
  onSaveRoundScore: (round: number, score: number) => void;
  isActiveView: boolean;
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

export const ExamView: React.FC<ExamViewProps> = ({
  currentRound,
  lang,
  focusIds,
  onToggleFocus,
  onSaveRoundScore,
  isActiveView,
}) => {
  const t = I18N[lang];
  const [stage, setStage] = useState<'intro' | 'playing' | 'result'>('intro');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [stepAnswered, setStepAnswered] = useState(false);
  const [stepCorrect, setStepCorrect] = useState(false);
  const [stepMissingTilde, setStepMissingTilde] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Scores
  const [totalScore, setTotalScore] = useState(0);
  const [reviewScore, setReviewScore] = useState(0);
  const [currentRoundScore, setCurrentRoundScore] = useState(0);
  const [wrongList, setWrongList] = useState<WrongRecord[]>([]);
  const [wrongNoteOpen, setWrongNoteOpen] = useState(false);

  // Reset to intro when round or language changes
  useEffect(() => {
    setStage('intro');
    setWrongNoteOpen(false);
  }, [currentRound, lang]);

  const startExamSession = () => {
    const types: ExamQuestionType[] = [
      'meaning-to-term-write',
      'term-to-meaning-write',
      'meaning-to-term-choice',
      'term-to-meaning-choice',
    ];

    const buildChoices = (targetWord: VocabWord): VocabWord[] => {
      const distractors = shuffleArray(
        ALL_WORDS_LIST.filter((w) => w.id !== targetWord.id)
      ).slice(0, 3);
      return shuffleArray([targetWord, ...distractors]);
    };

    const generated: ExamQuestion[] = [];

    if (currentRound > 1) {
      let prevPool: VocabWord[] = [];
      for (let r = 1; r < currentRound; r++) {
        prevPool = prevPool.concat(VOCAB_DATABASE[r]?.words || []);
      }
      shuffleArray(prevPool)
        .slice(0, 10)
        .forEach((w, i) => {
          generated.push({
            word: w,
            isReview: true,
            qType: types[i % 4],
            label: t.examReviewLabel(currentRound - 1),
            choices: buildChoices(w),
          });
        });
    }

    const curPool = VOCAB_DATABASE[currentRound]?.words || [];
    shuffleArray(curPool)
      .slice(0, 10)
      .forEach((w, i) => {
        generated.push({
          word: w,
          isReview: false,
          qType: types[i % 4],
          label: t.examCurrentLabel(currentRound),
          choices: buildChoices(w),
        });
      });

    setQuestions(generated);
    setCurrentIdx(0);
    setTotalScore(0);
    setReviewScore(0);
    setCurrentRoundScore(0);
    setWrongList([]);
    setWrongNoteOpen(false);
    setStepAnswered(false);
    setStepCorrect(false);
    setStepMissingTilde(false);
    setSelectedChoiceId(null);
    setInputVal('');
    setStage('playing');
  };

  const curQ = questions[currentIdx];

  useEffect(() => {
    if (
      stage === 'playing' &&
      curQ &&
      !stepAnswered &&
      curQ.qType.endsWith('-write')
    ) {
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [stage, currentIdx, curQ, stepAnswered]);

  const recordAnswer = useCallback(
    (
      correct: boolean,
      qObj: ExamQuestion,
      userAnswerText: string,
      missingTilde: boolean
    ) => {
      const pts = currentRound === 1 ? 10 : 5;
      if (correct) {
        setTotalScore((prev) => prev + pts);
        if (qObj.isReview) {
          setReviewScore((prev) => prev + pts);
        } else {
          setCurrentRoundScore((prev) => prev + pts);
        }
      } else {
        setWrongList((prev) => [
          ...prev,
          {
            word: qObj.word,
            label: qObj.label,
            userAns: userAnswerText,
            missingTilde,
          },
        ]);
      }
    },
    [currentRound]
  );

  const handleSubmitWrite = useCallback(() => {
    if (!curQ || stepAnswered) return;
    if (!inputVal.trim()) {
      inputRef.current?.focus();
      return;
    }

    const isForward = curQ.qType.startsWith('meaning-to-term');
    const result = isForward
      ? checkTermAnswer(inputVal, curQ.word, lang)
      : checkMeaningAnswer(inputVal, curQ.word, lang);

    setStepAnswered(true);
    setStepCorrect(result.isCorrect);
    setStepMissingTilde(result.missingTilde);
    speakEcuadorSpanish(curQ.word.es);
    recordAnswer(result.isCorrect, curQ, inputVal.trim(), result.missingTilde);
  }, [curQ, stepAnswered, inputVal, lang, recordAnswer]);

  const handleSelectChoice = useCallback(
    (choice: VocabWord) => {
      if (!curQ || stepAnswered) return;
      const correct = choice.id === curQ.word.id;
      const disp = getWordDisplay(choice, lang);
      const isForward = curQ.qType.startsWith('meaning-to-term');
      const chosenText = isForward ? disp.term : disp.meaning;

      setSelectedChoiceId(choice.id);
      setStepAnswered(true);
      setStepCorrect(correct);
      setStepMissingTilde(false);
      speakEcuadorSpanish(curQ.word.es);
      recordAnswer(correct, curQ, chosenText, false);
    },
    [curQ, stepAnswered, lang, recordAnswer]
  );

  const handleNextExamQuestion = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setStage('result');
      if (wrongList.length > 0) {
        setWrongNoteOpen(true);
      }
    } else {
      setCurrentIdx((prev) => prev + 1);
      setStepAnswered(false);
      setStepCorrect(false);
      setStepMissingTilde(false);
      setSelectedChoiceId(null);
      setInputVal('');
    }
  }, [currentIdx, questions.length, wrongList.length]);

  // Save best score when entering result screen
  useEffect(() => {
    if (stage === 'result') {
      onSaveRoundScore(currentRound, totalScore);
    }
  }, [stage, currentRound, totalScore, onSaveRoundScore]);

  const insertTilde = (ch: string) => {
    const ref = inputRef.current;
    if (!ref || ref.disabled) return;
    const start = ref.selectionStart ?? inputVal.length;
    const end = ref.selectionEnd ?? inputVal.length;
    const nextVal = inputVal.slice(0, start) + ch + inputVal.slice(end);
    setInputVal(nextVal);
    setTimeout(() => {
      ref.focus();
      ref.setSelectionRange(start + ch.length, start + ch.length);
    }, 0);
  };

  // Keyboard shortcuts during exam
  useEffect(() => {
    if (!isActiveView || stage !== 'playing' || !curQ) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && activeEl.tagName === 'INPUT';
      const isChoiceQ = curQ.qType.endsWith('-choice');

      // 1~7 tilde while typing Spanish (meaning-to-term-write)
      if (
        isTyping &&
        curQ.qType === 'meaning-to-term-write' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        ['1', '2', '3', '4', '5', '6', '7'].includes(e.key)
      ) {
        const idx = parseInt(e.key, 10) - 1;
        const ch = TILDE_CHARS[idx];
        if (ch) {
          e.preventDefault();
          insertTilde(ch);
          return;
        }
      }

      // 1~4 choice selection
      if (
        isChoiceQ &&
        !stepAnswered &&
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

      // Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        if (stepAnswered) {
          handleNextExamQuestion();
        } else if (!isChoiceQ && inputVal.trim()) {
          handleSubmitWrite();
        }
        return;
      }

      if (!isTyping) {
        const keyLower = e.key.toLowerCase();
        if (e.key === '0') {
          e.preventDefault();
          speakEcuadorSpanish(curQ.word.es);
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
    stage,
    curQ,
    lang,
    stepAnswered,
    inputVal,
    handleSelectChoice,
    handleNextExamQuestion,
    handleSubmitWrite,
    onToggleFocus,
  ]);

  if (stage === 'intro') {
    const rules =
      currentRound === 1
        ? t.examRuleRound1
        : t.examRuleCumulative(currentRound);

    return (
      <div className="py-6 px-2 text-center flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <Target className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {t.examIntroTitle(currentRound)}
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
            {t.examIntroSubtitle}
          </p>
        </div>

        <div className="w-full rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-left space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {rules.map((line, i) => (
            <div key={i} className="flex items-start gap-2 font-semibold">
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                •
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={startExamSession}
          title="실전 고사 응시 시작하기"
          className="w-full min-h-[52px] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <span>{t.startExamBtn}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  if (stage === 'result') {
    const passed = totalScore >= 80;

    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 p-6 text-center">
          <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">
            {t.examFinalScoreLabel}
          </p>

          <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums my-3">
            {totalScore}
          </div>

          <div className="mb-4">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-extrabold text-sm sm:text-base mb-2 ${
                passed
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300'
              }`}
            >
              {passed ? (
                <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              )}
              <span>{passed ? t.examPassBadge : t.examFailBadge}</span>
            </div>
            <p
              className={`text-xs sm:text-sm font-bold ${
                passed
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {passed ? t.examPassDesc : t.examFailDesc}
            </p>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                {t.examReviewScoreTitle}
              </span>
              <strong className="text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1 block">
                {currentRound === 1 ? '—' : t.examScoreUnit(reviewScore, 50)}
              </strong>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                {t.examCurrentScoreTitle}
              </span>
              <strong className="text-base font-extrabold text-slate-900 dark:text-white font-mono tabular-nums mt-1 block">
                {currentRound === 1
                  ? t.examScoreUnit(totalScore, 100)
                  : t.examScoreUnit(currentRoundScore, 50)}
              </strong>
            </div>
          </div>
        </div>

        {/* Wrong Answers Review */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200">
              {t.examWrongNoteTitle}
            </h4>

            {wrongList.length > 0 && (
              <button
                type="button"
                onClick={() => setWrongNoteOpen(true)}
                title="오답 노트 팝업 열기 및 틀린 단어 다시 학습하기"
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xs transition-transform active:scale-95 cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>오답 노트 팝업으로 다시 학습 ({wrongList.length})</span>
              </button>
            )}
          </div>

          <div className="max-h-[38vh] overflow-y-auto flex flex-col gap-2 pr-1">
            {wrongList.length === 0 ? (
              <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                {t.examPerfectMsg}
              </div>
            ) : (
              wrongList.map((w, idx) => {
                const disp = getWordDisplay(w.word, lang);
                const inFocus = focusIds.includes(w.word.id);

                return (
                  <div
                    key={`${w.word.id}-${idx}`}
                    className="p-3.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 text-left">
                      <span className="text-[11px] font-extrabold text-rose-700 dark:text-rose-400">
                        {w.label}
                      </span>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                        {disp.term}{' '}
                        <span className="font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          = {disp.meaning}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-rose-800 dark:text-rose-300">
                        {t.examMyAnswerLabel} {w.userAns || t.examNoAnswer}{' '}
                        {w.missingTilde ? `(${t.missingTildeWarning})` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => speakEcuadorSpanish(w.word.es)}
                        title={t.listenPronunciationTooltip}
                        className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleFocus(w.word.id)}
                        title={
                          inFocus
                            ? '집중 학습 폴더에서 해제'
                            : '집중 학습 폴더에 추가'
                        }
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-extrabold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer select-none ${
                          inFocus
                            ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white'
                        }`}
                      >
                        {inFocus ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            <span>집중 학습 추가됨</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-3.5 h-3.5" />
                            <span>집중 학습 추가</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {wrongList.length > 0 && (
            <button
              type="button"
              onClick={() => setWrongNoteOpen(true)}
              title="틀린 단어만 모아서 오답 노트 팝업에서 다시 학습하기"
              className="w-full min-h-[50px] py-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>오답 노트 · 다시 학습하기</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setStage('intro')}
            title={t.examRetakeBtn}
            className={`w-full min-h-[50px] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              wrongList.length === 0 ? 'sm:col-span-2' : ''
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.examRetakeBtn}</span>
          </button>
        </div>

        {/* Wrong Note Re-Study Popup Modal */}
        <WrongNoteModal
          isOpen={wrongNoteOpen}
          onClose={() => setWrongNoteOpen(false)}
          wrongList={wrongList}
          lang={lang}
          focusIds={focusIds}
          onToggleFocus={onToggleFocus}
        />
      </div>
    );
  }

  // Playing Stage
  if (!curQ) return null;

  const disp = getWordDisplay(curQ.word, lang);
  const isForward = curQ.qType.startsWith('meaning-to-term');
  const isWriteQ = curQ.qType.endsWith('-write');
  const promptText = isForward ? disp.meaning : disp.term;
  const targetAnswerText = isForward ? disp.term : disp.meaning;
  const inFocus = focusIds.includes(curQ.word.id);

  let typeLabel = '';
  if (curQ.qType === 'meaning-to-term-write') typeLabel = t.examTypeWriteForward;
  else if (curQ.qType === 'term-to-meaning-write')
    typeLabel = t.examTypeWriteReverse;
  else if (curQ.qType === 'meaning-to-term-choice')
    typeLabel = t.examTypeChoiceForward;
  else typeLabel = t.examTypeChoiceReverse;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
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

      {/* Question Card */}
      <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 text-center">
        <div className="mb-2">
          <span
            className={`text-xs font-extrabold ${
              curQ.isReview
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-indigo-600 dark:text-indigo-400'
            }`}
          >
            {curQ.label} · {typeLabel}
          </span>
        </div>

        <div className="min-h-[56px] flex items-center justify-center my-2 px-2">
          <h2
            className={`font-extrabold text-slate-900 dark:text-white tracking-tight ${
              promptText.length > 35
                ? 'text-lg sm:text-xl leading-snug'
                : 'text-2xl sm:text-3xl'
            }`}
          >
            {promptText}
          </h2>
        </div>

        {!isForward && (
          <div className="mt-2 flex justify-center">
            <button
              type="button"
              onClick={() => speakEcuadorSpanish(curQ.word.es)}
              title={t.listenPronunciationTooltip}
              className="min-h-[38px] px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{t.listenPronunciation}</span>
              <span className="font-mono text-[11px] text-slate-500">(0)</span>
            </button>
          </div>
        )}
      </div>

      {/* Write Input or Multiple Choice */}
      {isWriteQ ? (
        <div className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            disabled={stepAnswered}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder={
              isForward ? t.writePlaceholderForward : t.writePlaceholderReverse
            }
            title={
              isForward ? t.writePlaceholderForward : t.writePlaceholderReverse
            }
            autoComplete="off"
            autoCapitalize="none"
            className={`w-full min-h-[52px] px-4 py-3 rounded-xl border-2 text-center text-base sm:text-lg font-extrabold outline-none ${
              stepAnswered
                ? stepCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                  : 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-indigo-600'
            }`}
          />

          {isForward && (
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {TILDE_CHARS.map((ch, idx) => (
                <button
                  key={ch}
                  type="button"
                  disabled={stepAnswered}
                  onClick={() => insertTilde(ch)}
                  title={`${ch} 특수문자 입력 (단축키: ${idx + 1})`}
                  className="relative w-11 h-11 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold text-base flex items-center justify-center pt-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="absolute top-1 left-1.5 text-[10px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400">
                    {idx + 1}
                  </span>
                  {ch}
                </button>
              ))}
            </div>
          )}

          {!stepAnswered && (
            <button
              type="button"
              onClick={handleSubmitWrite}
              title="작성한 정답 제출하기 (단축키: Enter)"
              className="w-full min-h-[50px] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base cursor-pointer"
            >
              {t.submitExamBtn}
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {curQ.choices.map((choice, idx) => {
            const cDisp = getWordDisplay(choice, lang);
            const choiceText = isForward ? cDisp.term : cDisp.meaning;
            const isTargetCorrect = choice.id === curQ.word.id;
            const isSelected = selectedChoiceId === choice.id;

            let btnStyle =
              'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:border-indigo-400';
            let numStyle =
              'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-slate-200 dark:border-slate-700';

            if (stepAnswered) {
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
                  'border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 text-slate-400 opacity-70';
              }
            }

            return (
              <button
                key={choice.id}
                type="button"
                disabled={stepAnswered}
                onClick={() => handleSelectChoice(choice)}
                title={`${idx + 1}번 보기 선택 (단축키: ${idx + 1})`}
                className={`w-full min-h-[52px] px-4 py-3 rounded-xl border-2 text-left font-bold text-sm sm:text-base flex items-center justify-between gap-3 transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`w-7 h-7 rounded-lg border text-xs font-extrabold font-mono tabular-nums flex items-center justify-center shrink-0 ${numStyle}`}
                  >
                    {idx + 1}
                  </span>
                  <span className="break-words leading-snug">{choiceText}</span>
                </div>
                <span className="text-xs font-semibold opacity-50 shrink-0">
                  {t.choiceSelectHint}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback Banner */}
      {stepAnswered && (
        <div
          className={`rounded-xl border-2 p-4 ${
            stepCorrect
              ? 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200'
              : 'border-rose-500 bg-rose-50/90 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-1.5 font-extrabold text-base">
                {stepCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                )}
                <span>{stepCorrect ? t.correctTitle : t.wrongTitle}</span>
              </div>
              {stepMissingTilde && (
                <p className="text-xs font-extrabold text-amber-700 dark:text-amber-300">
                  {t.missingTildeWarning}
                </p>
              )}
              <div className="font-bold">
                <span>{t.correctAnswerLabel} </span>
                <strong className="underline">{targetAnswerText}</strong>
              </div>
            </div>

            <label
              title={t.moveToFocusTooltip}
              className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer select-none shrink-0 ${
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

      {/* Etymology Recommended Prompt Button & Box (Directly above Next Question / Retake) */}
      <EtymologyPromptBox resetKey={`exam-${currentIdx}`} />

      {/* Bottom Action Bar: Next Question (when answered) + Bottom-Right Instant Retake Button */}
      <div className="flex items-center justify-end gap-2.5">
        {stepAnswered && (
          <button
            type="button"
            onClick={handleNextExamQuestion}
            title="다음 고사 문제로 이동 (단축키: Enter)"
            className="flex-1 min-h-[50px] py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t.nextQuestionBtn}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={startExamSession}
          title="현재 시험을 처음(1번 문제)부터 새로운 문제로 즉시 다시 시작"
          className="min-h-[50px] px-4 py-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-400 dark:hover:border-rose-700 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 font-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          <span>재시험</span>
        </button>
      </div>
    </div>
  );
};
