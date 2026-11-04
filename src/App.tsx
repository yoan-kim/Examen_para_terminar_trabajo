/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { AppLanguage, I18N } from './data/i18n';
import { VOCAB_DATABASE } from './data/vocabData';
import { initEcuadorTTS } from './utils/tts';
import { QuizEngine } from './components/QuizEngine';
import { VocabListView } from './components/VocabListView';
import { FocusStudyView } from './components/FocusStudyView';
import { ExamView } from './components/ExamView';
import { ShortcutModal } from './components/ShortcutModal';

type ActiveTab = 'speed' | 'write' | 'list' | 'focus' | 'exam';

const FOCUS_STORAGE_KEY = 'es_focus_ids_v3';
const SCORES_STORAGE_KEY = 'es_round_best_scores_v1';
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

  const [currentRound, setCurrentRound] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>('speed');
  const [shortcutOpen, setShortcutOpen] = useState<boolean>(false);

  // Persisted Focus Study word IDs
  const [focusIds, setFocusIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(FOCUS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persisted Best Exam Scores per Round
  const [roundScores, setRoundScores] = useState<Record<number, number>>(() => {
    try {
      const raw = localStorage.getItem(SCORES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Initialize Ecuadorian TTS on mount
  useEffect(() => {
    initEcuadorTTS();
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDark]);

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

  const handleSaveRoundScore = useCallback((round: number, score: number) => {
    setRoundScores((prev) => {
      const prevBest = prev[round] ?? -1;
      if (score <= prevBest) return prev;
      const next = { ...prev, [round]: score };
      try {
        localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const stepRound = useCallback((delta: number) => {
    setCurrentRound((prev) => Math.max(1, Math.min(30, prev + delta)));
  }, []);

  // Global [ and ] round navigation shortcuts
  useEffect(() => {
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
  }, [stepRound]);

  const t = I18N[lang];
  const currentRoundWords = VOCAB_DATABASE[currentRound]?.words || [];

  const tabs: {
    id: ActiveTab;
    label: string;
    tooltip: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'speed',
      label: t.tabSpeed,
      tooltip: '스피드 4지선다 퀴즈 모드 (40문제)',
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Brand Title */}
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              {t.appTitle}
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
              {t.appSubtitle}
            </p>
          </div>

          {/* Right Controls: Theme Toggle, Shortcuts */}
          <div className="flex items-center gap-2 shrink-0">
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
              <span>{t.shortcutBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container (2-Column on Desktop, Single-Column on Mobile) */}
      <main className="max-w-6xl w-full mx-auto px-4 py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar on Desktop: 30 Rounds Progress & Quick Jump */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {t.roundSidebarTitle}
            </h2>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {t.ecuadorBadge}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[68vh] overflow-y-auto pr-1">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((r) => {
              const best = roundScores[r];
              const isPassed = best !== undefined && best >= 80;
              const isSelected = r === currentRound;

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCurrentRound(r)}
                  title={`${r}회차 선택`}
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
            })}
          </div>
        </aside>

        {/* Right / Main Study Stage */}
        <section className="lg:col-span-8 flex flex-col gap-3.5">
          {/* 30-Round Navigation Bar */}
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
              title="학습 회차 선택 (1회 ~ 30회)"
              className="flex-1 min-h-[42px] px-3 py-2 rounded-xl border-2 border-indigo-600 dark:border-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-extrabold text-sm sm:text-base text-center outline-none cursor-pointer"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map((r) => (
                <option key={r} value={r}>
                  {t.roundOptionLabel(r)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => stepRound(1)}
              disabled={currentRound >= 30}
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
                  onClick={() => setActiveTab(tab.id)}
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
              />
            )}

            {activeTab === 'list' && (
              <VocabListView
                currentRound={currentRound}
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

      {/* Shortcut Guide Modal */}
      <ShortcutModal
        isOpen={shortcutOpen}
        onClose={() => setShortcutOpen(false)}
        lang={lang}
      />
    </div>
  );
}
