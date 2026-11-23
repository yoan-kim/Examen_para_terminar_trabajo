import React from 'react';
import {
  CheckCircle2,
  ArrowRight,
  Target,
  Zap,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { StudyLevel, LEVEL_CONFIGS } from '../data/vocabData';

interface LevelSelectViewProps {
  currentLevel: StudyLevel;
  onSelectLevel: (level: StudyLevel) => void;
  levelScoresMap: Record<StudyLevel, Record<number, number>>;
}

export const LevelSelectView: React.FC<LevelSelectViewProps> = ({
  currentLevel,
  onSelectLevel,
  levelScoresMap,
}) => {
  const levels: StudyLevel[] = ['beginner', 'intermediate', 'advanced'];

  const getPassedCount = (lv: StudyLevel) => {
    const scores = levelScoresMap[lv] || {};
    return Object.values(scores).filter((s) => s >= 80).length;
  };

  return (
    <div className="max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center gap-7">
      {/* Header Banner */}
      <div className="text-center space-y-2.5 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>에콰도르 현지 실전 스페인어 1,200단어 완전 정복</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
          오늘의 퇴근 스페인어 학습 레벨을 선택하세요
        </h1>

        <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
          모든 레벨의 테스트 방식(스피드·철자·객관식+주관식 혼합 실전 시험·80점 합격 기준)은 동일하며,
          <br className="hidden sm:inline" />
          <strong>1회차당 학습할 단어 개수(10개 / 15개 / 20개)</strong>에 따라 나에게 맞는 호흡으로 도전할 수 있습니다.
        </p>
      </div>

      {/* 3 Level Cards */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
        {levels.map((lv) => {
          const cfg = LEVEL_CONFIGS[lv];
          const passedCnt = getPassedCount(lv);
          const isCurrent = currentLevel === lv;

          let cardAccent =
            'border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500';
          let badgeColor =
            'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
          let btnColor =
            'bg-emerald-600 hover:bg-emerald-700 text-white';

          if (lv === 'intermediate') {
            cardAccent =
              'border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500';
            badgeColor =
              'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
            btnColor = 'bg-indigo-600 hover:bg-indigo-700 text-white';
          } else if (lv === 'advanced') {
            cardAccent =
              'border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500';
            badgeColor =
              'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800';
            btnColor = 'bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950';
          }

          return (
            <div
              key={lv}
              onClick={() => onSelectLevel(lv)}
              className={`group relative rounded-2xl bg-white dark:bg-slate-900 border-2 p-6 flex flex-col justify-between gap-5 shadow-xs hover:shadow-xl transition-all cursor-pointer ${cardAccent} ${
                isCurrent ? 'ring-2 ring-indigo-500/40' : ''
              }`}
            >
              <div className="space-y-4">
                {/* Level Badge & Passed Count */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl border text-xs font-extrabold inline-flex items-center gap-1.5 ${badgeColor}`}
                  >
                    <span>{cfg.badgeIcon}</span>
                    <span>
                      {cfg.labelKo} ({cfg.labelEs})
                    </span>
                  </span>

                  <span className="text-xs font-extrabold font-mono text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>
                      {passedCnt} / {cfg.totalRounds}회차 통과
                    </span>
                  </span>
                </div>

                {/* Big Title */}
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    1회차당{' '}
                    <span className="text-indigo-600 dark:text-indigo-400">
                      {cfg.wordsPerRound}단어
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                    {cfg.description}
                  </p>
                </div>

                {/* Specs List */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>전체 구성</span>
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      총 {cfg.totalRounds}회차 (1,200단어)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span>스피드·철자 퀴즈</span>
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      회차당 {cfg.quizQuestionsPerRound}문제 (한⇄스)
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Target className="w-3.5 h-3.5" />
                      <span>실전 퇴근 시험</span>
                    </span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      복습 10 + 본시험 10 (80점 합격)
                    </span>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 leading-relaxed">
                  💡 {cfg.targetAudience}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLevel(lv);
                }}
                className={`w-full min-h-[48px] py-3 px-4 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${btnColor}`}
              >
                <span>
                  {cfg.badgeIcon} {cfg.labelKo} ({cfg.wordsPerRound}단어) 시작하기
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
