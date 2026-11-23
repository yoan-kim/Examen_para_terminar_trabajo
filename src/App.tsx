/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Sun,
  Moon,
  Zap,
  PenTool,
  List,
  FolderHeart,
  Target,
  CheckCircle2,
  Sparkles,
  Volume2,
  VolumeX,
  Layers,
} from 'lucide-react';
import { AppLanguage, I18N } from './data/i18n';
import {
  StudyLevel,
  LEVEL_CONFIGS,
  getVocabDatabaseByLevel,
} from './data/vocabData';
import { initEcuadorTTS } from './utils/tts';
import { useAdvancedStudy } from './utils/advancedStudy';
import { useSoundEffects } from './utils/soundEffects';
import { QuizEngine } from './components/QuizEngine';
import { VocabListView } from './components/VocabListView';
import { FocusStudyView } from './components/FocusStudyView';
import { ExamView } from './components/ExamView';
import { ShortcutModal } from './components/ShortcutModal';
import { FireworksOverlay } from './components/FireworksOverlay';
import { LiveSheetView } from './components/LiveSheetView';
import { LevelSelectView } from './components/LevelSelectView';

type ActiveTab = 'speed' | 'write' | 'list' | 'focus' | 'exam';

const FOCUS_STORAGE_KEY = 'es_focus_ids_v3';
const SCORES_STORAGE_KEY = 'es_round_best_scores_v1';
const LEVEL_SCORES_STORAGE_KEY = 'es_level_round_scores_v2';
const LEVEL_ROUNDS_STORAGE_KEY = 'es_level_current_round_v1';
const LAST_LEVEL_STORAGE_KEY = 'es_selected_study_level_v1';
const THEME_STORAGE_KEY = 'es_master_theme_v1';

export default function App() {
  const lang: AppLanguage = 'ko';
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  // Always show Level Selection View on initial app entry so the user can choose Beginner / Intermediate / Advanced
  const [levelSelectedInSession, setLevelSelectedInSession] =
    useState<boolean>(false);

  const [studyLevel, setStudyLevel] = useState<StudyLevel>(() => {
    try {
      const saved = localStorage.getItem(LAST_LEVEL_STORAGE_KEY);
      if (
        saved === 'beginner' ||
        saved === 'intermediate' ||
        saved === 'advanced'
      ) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'advanced';
  });

  // Track current round per level independently
  const [levelRoundsMap, setLevelRoundsMap] = useState<
    Record<StudyLevel, number>
  >(() => {
    try {
      const raw = localStorage.getItem(LEVEL_ROUNDS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          beginner: parsed.beginner || 1,
          intermediate: parsed.intermediate || 1,
          advanced: parsed.advanced || 1,
        };
      }
    } catch {
      // ignore
    }
    return {
      beginner: 1,
      intermediate: 1,
      advanced: 1,
    };
  });

  const currentRound = levelRoundsMap[studyLevel] || 1;
  const levelConfig = LEVEL_CONFIGS[studyLevel];
  const totalRoundsForLevel = levelConfig.totalRounds;
  const roundDatabase = useMemo(
    () => getVocabDatabaseByLevel(studyLevel),
    [studyLevel]
  );

  const setCurrentRound = useCallback(
    (nextRoundOrUpdater: number | ((prev: number) => number)) => {
      setLevelRoundsMap((prevMap) => {
        const prevRound = prevMap[studyLevel] || 1;
        const rawNext =
          typeof nextRoundOrUpdater === 'function'
            ? nextRoundOrUpdater(prevRound)
            : nextRoundOrUpdater;
        const clamped = Math.max(
          1,
          Math.min(LEVEL_CONFIGS[studyLevel].totalRounds, rawNext)
        );
        const updated = { ...prevMap, [studyLevel]: clamped };
        try {
          localStorage.setItem(
            LEVEL_ROUNDS_STORAGE_KEY,
            JSON.stringify(updated)
          );
        } catch {
          // ignore
        }
        return updated;
      });
    },
    [studyLevel]
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('speed');
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);
  const [shortcutOpen, setShortcutOpen] = useState<boolean>(false);
  const [isSheetRoute, setIsSheetRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.search.includes('sheet=1') ||
      window.location.hash.includes('sheet')
    );
  });
  const { isAdvancedMode, toggleAdvancedMode } = useAdvancedStudy();
  const { sfxEnabled, toggleSfx } = useSoundEffects();

  // Persisted Focus Study word IDs
  const [focusIds, setFocusIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(FOCUS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persisted Best Exam Scores per Level & Round
  const [levelScoresMap, setLevelScoresMap] = useState<
    Record<StudyLevel, Record<number, number>>
  >(() => {
    try {
      const rawV2 = localStorage.getItem(LEVEL_SCORES_STORAGE_KEY);
      if (rawV2) {
        const parsed = JSON.parse(rawV2);
        return {
          beginner: parsed.beginner || {},
          intermediate: parsed.intermediate || {},
          advanced: parsed.advanced || {},
        };
      }
      // Migrate legacy v1 scores into advanced (20 words/round)
      const legacyV1 = localStorage.getItem(SCORES_STORAGE_KEY);
      const advScores = legacyV1 ? JSON.parse(legacyV1) : {};
      return {
        beginner: {},
        intermediate: {},
        advanced: advScores,
      };
    } catch {
      return {
        beginner: {},
        intermediate: {},
        advanced: {},
      };
    }
  });

  const roundScores = levelScoresMap[studyLevel] || {};

  // Initialize Ecuadorian TTS on mount
  useEffect(() => {
    initEcuadorTTS();
  }, []);

  // Sync dark mode class on <html> and <body>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      document.body.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDark]);

  const handleSelectLevel = useCallback((lv: StudyLevel) => {
    setStudyLevel(lv);
    setLevelSelectedInSession(true);
    setShuffleSeed((prev) => prev + 1);
    try {
      localStorage.setItem(LAST_LEVEL_STORAGE_KEY, lv);
    } catch {
      // ignore
    }
  }, []);

  const handleToggleFocus = useCallback((wordId: number) => {
    setFocusIds((prev) => {
      const next = prev.includes(wordId)
        ? prev.filter((id) => id !== wordId)
        : [...prev, wordId];
      try {
        localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleClearAllFocus = useCallback(() => {
    setFocusIds([]);
    try {
      localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify([]));
    } catch {
      // ignore
    }
  }, []);

  const handleSaveRoundScore = useCallback(
    (round: number, score: number) => {
      setLevelScoresMap((prevMap) => {
        const curLevelScores = prevMap[studyLevel] || {};
        const prevBest = curLevelScores[round] ?? -1;
        if (score <= prevBest) return prevMap;
        const nextLevelScores = { ...curLevelScores, [round]: score };
        const nextMap = { ...prevMap, [studyLevel]: nextLevelScores };
        try {
          localStorage.setItem(
            LEVEL_SCORES_STORAGE_KEY,
            JSON.stringify(nextMap)
          );
        } catch {
          // ignore
        }
        return nextMap;
      });
    },
    [studyLevel]
  );

  const stepRound = useCallback(
    (delta: number) => {
      setCurrentRound((prev) =>
        Math.max(1, Math.min(totalRoundsForLevel, prev + delta))
      );
    },
    [setCurrentRound, totalRoundsForLevel]
  );

  // Global [ and ] round navigation shortcuts
  useEffect(() => {
    if (!levelSelectedInSession) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (isTyping) return;

      if (e.key === '[') {
        e.preventDefault();
        stepRound(-1);
      } else if (e.key === ']') {
        e.preventDefault();
        stepRound(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stepRound, levelSelectedInSession]);

  const t = I18N[lang];
  const currentRoundWords = roundDatabase[currentRound]?.words || [];

  const tabs: {
    id: ActiveTab;
    label: string;
    tooltip: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'speed',
      label: t.tabSpeed,
      tooltip: `스피드 4지선다 퀴즈 모드 (${levelConfig.quizQuestionsPerRound}문제)`,
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: 'write',
      label: t.tabWrite,
      tooltip: '스페인어 철자 및 뜻 주관식 연습 모드',
      icon: <PenTool className="w-4 h-4" />,
    },
    {
      id: 'list',
      label: t.tabList,
      tooltip: '스페인어 단어장 및 한국어 뜻 목록 보기',
      icon: <List className="w-4 h-4" />,
    },
    {
      id: 'focus',
      label: t.tabFocus,
      tooltip: '집중공부 북마크 폴더 및 전용 퀴즈',
      icon: <FolderHeart className="w-4 h-4" />,
    },
    {
      id: 'exam',
      label: t.tabExam,
      tooltip: '누적 실전 고사 모드',
      icon: <Target className="w-4 h-4" />,
    },
  ];

  if (isSheetRoute) {
    return (
      <div className={isDark ? 'dark' : ''}>
        <LiveSheetView
          onBackToApp={() => {
            window.history.replaceState(null, '', window.location.pathname);
            setIsSheetRoute(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${
        isDark ? 'dark' : ''
      } min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors`}
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Brand Title & Top Level Change Tab */}
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  onClick={() => setLevelSelectedInSession(false)}
                  title="클릭하여 첫 화면(레벨 선택 화면)으로 이동"
                  className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {t.appTitle}
                </h1>

                {levelSelectedInSession && (
                  <button
                    type="button"
                    onClick={() => setLevelSelectedInSession(false)}
                    title="클릭하여 첫 화면으로 이동해 초급 / 중급 / 고급 레벨 선택하기"
                    className="min-h-[34px] px-3 py-1 rounded-xl border-2 border-indigo-500 dark:border-indigo-400 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-all"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      레벨변경 ({levelConfig.badgeIcon} {levelConfig.labelKo})
                    </span>
                  </button>
                )}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {levelSelectedInSession
                  ? `[${levelConfig.labelKo}] 1회차부터 ${totalRoundsForLevel}회차까지 핵심 1200단어 완전 정복 (회차당 ${levelConfig.wordsPerRound}단어)`
                  : t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Right Controls: Sound Toggle, Theme Toggle, Shortcuts, Advanced Mode */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Sound Effects Toggle */}
            <button
              type="button"
              onClick={toggleSfx}
              title={
                sfxEnabled
                  ? '효과음 켜짐 (클릭하여 효과음 끄기)'
                  : '효과음 꺼짐 (클릭하여 효과음 켜기)'
              }
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
            >
              {sfxEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              title={isDark ? t.themeLight : t.themeDark}
              className="min-h-[38px] min-w-[38px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Keyboard Shortcuts Modal Trigger */}
            <button
              type="button"
              onClick={() => setShortcutOpen(true)}
              title={t.shortcutTooltip}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-indigo-500/60 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden md:inline">{t.shortcutBtn}</span>
            </button>

            {/* Advanced Study Feature Toggle Button */}
            <button
              type="button"
              onClick={toggleAdvancedMode}
              title={
                isAdvancedMode
                  ? '고급학습기능 켜짐 (클릭하여 끄기)'
                  : '고급학습기능 켜기 (단어별 암기팁 노트 기록 기능 활성화)'
              }
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                isAdvancedMode
                  ? 'border-indigo-500 bg-slate-900 dark:bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                  : 'border-slate-800 dark:border-slate-700 bg-slate-900/90 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
              }`}
            >
              <Sparkles
                className={`w-4 h-4 ${
                  isAdvancedMode ? 'text-amber-300' : 'text-slate-200'
                }`}
              />
              <span>고급학습기능</span>
              {isAdvancedMode && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black leading-none">
                  ON
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Initial Entry: Level Selection Gate (Beginner 10 / Intermediate 15 / Advanced 20) */}
      {!levelSelectedInSession ? (
        <main className="flex-1 flex items-center justify-center">
          <LevelSelectView
            currentLevel={studyLevel}
            onSelectLevel={handleSelectLevel}
            levelScoresMap={levelScoresMap}
          />
        </main>
      ) : (
        /* Main Study Workspace */
        <main className="max-w-6xl w-full mx-auto px-4 py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Sidebar on Desktop: Rounds Progress & Quick Jump */}
          <aside className="hidden lg:flex lg:col-span-4 flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{levelConfig.badgeIcon}</span>
                <span>
                  {levelConfig.labelKo} 회차별 현황 (1~{totalRoundsForLevel}회)
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setLevelSelectedInSession(false)}
                className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                레벨 변경
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[68vh] overflow-y-auto pr-1">
              {Array.from({ length: totalRoundsForLevel }, (_, i) => i + 1).map(
                (r) => {
                  const best = roundScores[r];
                  const isPassed = best !== undefined && best >= 80;
                  const isSelected = r === currentRound;

                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCurrentRound(r)}
                      title={`[${levelConfig.labelKo}] ${r}회차 선택`}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-extrabold'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-extrabold font-mono tabular-nums">
                        {t.roundBadgeText(r)}
                      </span>
                      {best !== undefined ? (
                        <span
                          className={`text-[11px] font-extrabold font-mono tabular-nums inline-flex items-center gap-1 ${
                            isPassed
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isPassed && <CheckCircle2 className="w-3 h-3" />}
                          {t.roundBestScore(best)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {t.roundNoRecord}
                        </span>
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </aside>

          {/* Right / Main Study Stage */}
          <section className="lg:col-span-8 flex flex-col gap-3.5">
            {/* Round Navigation Bar */}
            <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <button
                type="button"
                onClick={() => stepRound(-1)}
                disabled={currentRound <= 1}
                title={t.prevRoundTooltip}
                className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{t.prevRound}</span>
              </button>

              <select
                value={currentRound}
                onChange={(e) => setCurrentRound(parseInt(e.target.value, 10))}
                title={`[${levelConfig.labelKo}] 학습 회차 선택 (1회 ~ ${totalRoundsForLevel}회)`}
                className="flex-1 min-h-[42px] px-3 py-2 rounded-xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-sm sm:text-base text-center outline-none cursor-pointer"
              >
                {Array.from(
                  { length: totalRoundsForLevel },
                  (_, i) => i + 1
                ).map((r) => (
                  <option key={r} value={r}>
                    [{levelConfig.labelKo}] {r}회차 ({levelConfig.wordsPerRound}
                    단어)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => stepRound(1)}
                disabled={currentRound >= totalRoundsForLevel}
                title={t.nextRoundTooltip}
                className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
              >
                <span>{t.nextRound}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 5 Mode Tabs */}
            <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-slate-200/90 dark:bg-slate-800">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShuffleSeed((prev) => prev + 1);
                    }}
                    title={tab.tooltip}
                    className={`min-h-[42px] px-1.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="hidden sm:inline-flex">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {isAdvancedMode && (
              <div className="rounded-xl bg-slate-900 dark:bg-indigo-950/80 border border-slate-800 dark:border-indigo-700 px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-extrabold text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    고급학습기능 활성화됨 — 각 단어의 정답 확인 후 나만의
                    &apos;암기팁 노트&apos;를 단어별로 기록할 수 있습니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleAdvancedMode}
                  className="px-2 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  끄기
                </button>
              </div>
            )}

            {/* Active View Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
              {activeTab === 'speed' && (
                <QuizEngine
                  mode="speed"
                  wordsPool={currentRoundWords}
                  lang={lang}
                  focusIds={focusIds}
                  onToggleFocus={handleToggleFocus}
                  isActiveView={activeTab === 'speed' && !shortcutOpen}
                  shuffleSeed={shuffleSeed}
                  onCompleteAllQuestions={() => {
                    setActiveTab('write');
                    setShuffleSeed((prev) => prev + 1);
                  }}
                />
              )}

              {activeTab === 'write' && (
                <QuizEngine
                  mode="write"
                  wordsPool={currentRoundWords}
                  lang={lang}
                  focusIds={focusIds}
                  onToggleFocus={handleToggleFocus}
                  isActiveView={activeTab === 'write' && !shortcutOpen}
                  shuffleSeed={shuffleSeed}
                  onCompleteAllQuestions={() => {
                    setShuffleSeed((prev) => prev + 1);
                  }}
                />
              )}

              {activeTab === 'list' && (
                <VocabListView
                  currentRound={currentRound}
                  roundDatabase={roundDatabase}
                  lang={lang}
                  focusIds={focusIds}
                  onToggleFocus={handleToggleFocus}
                />
              )}

              {activeTab === 'focus' && (
                <FocusStudyView
                  lang={lang}
                  focusIds={focusIds}
                  onToggleFocus={handleToggleFocus}
                  onClearAllFocus={handleClearAllFocus}
                  isActiveView={activeTab === 'focus' && !shortcutOpen}
                />
              )}

              {activeTab === 'exam' && (
                <ExamView
                  currentRound={currentRound}
                  studyLevel={studyLevel}
                  roundDatabase={roundDatabase}
                  lang={lang}
                  focusIds={focusIds}
                  onToggleFocus={handleToggleFocus}
                  onSaveRoundScore={handleSaveRoundScore}
                  isActiveView={activeTab === 'exam' && !shortcutOpen}
                />
              )}
            </div>
          </section>
        </main>
      )}

      {/* Shortcut Guide Modal */}
      <ShortcutModal
        isOpen={shortcutOpen}
        onClose={() => setShortcutOpen(false)}
        lang={lang}
      />

      {/* Fireworks Canvas Overlay */}
      <FireworksOverlay />
    </div>
  );
}
