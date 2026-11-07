import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Trash2, Save, PenLine } from 'lucide-react';
import { VocabWord } from '../data/vocabData';
import { useAdvancedStudy } from '../utils/advancedStudy';

interface WordTipNoteBoxProps {
  word: VocabWord;
  compact?: boolean;
}

export const WordTipNoteBox: React.FC<WordTipNoteBoxProps> = ({
  word,
  compact = false,
}) => {
  const { isAdvancedMode, wordNotes, saveWordNote } = useAdvancedStudy();
  const savedNote = wordNotes[word.id] || '';
  const [draft, setDraft] = useState<string>(savedNote);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [isEditingCompact, setIsEditingCompact] = useState<boolean>(false);

  // Sync draft when word changes or external storage updates
  useEffect(() => {
    setDraft(wordNotes[word.id] || '');
    setJustSaved(false);
  }, [word.id, wordNotes]);

  if (!isAdvancedMode) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(val);
    saveWordNote(word.id, val);
    setJustSaved(false);
  };

  const handleExplicitSave = () => {
    saveWordNote(word.id, draft);
    setJustSaved(true);
    if (compact && !draft.trim()) {
      setIsEditingCompact(false);
    }
    setTimeout(() => {
      setJustSaved(false);
    }, 1800);
  };

  const handleClear = () => {
    setDraft('');
    saveWordNote(word.id, '');
    setJustSaved(false);
  };

  // Compact mode for Vocabulary List / Focus Study List / Wrong Note List
  if (compact) {
    const hasNote = Boolean(savedNote.trim());
    return (
      <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/80 w-full">
        {!isEditingCompact && !hasNote ? (
          <button
            type="button"
            onClick={() => setIsEditingCompact(true)}
            title="이 단어에 대한 나만의 암기팁 노트 작성하기"
            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>+ 암기팁 노트 작성</span>
          </button>
        ) : !isEditingCompact && hasNote ? (
          <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 px-3 py-2 flex items-start justify-between gap-2">
            <div className="text-left min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-800 dark:text-amber-300 mb-0.5">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>나만의 암기팁 노트</span>
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed">
                {savedNote}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingCompact(true)}
              title="암기팁 노트 수정하기"
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold shrink-0 cursor-pointer hover:bg-amber-100/60"
            >
              수정
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-100/90 dark:bg-slate-800/70 border border-indigo-300 dark:border-indigo-700 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  암기팁 노트 — {word.es} ({word.ko})
                </span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditingCompact(false)}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                접기
              </button>
            </div>
            <textarea
              value={draft}
              onChange={handleChange}
              onKeyDown={(e) => e.stopPropagation()}
              rows={2}
              placeholder="이 단어를 쉽게 외우기 위한 나만의 연상법, 어원, 학습팁 등 이해를 돕는 내용을 기록하세요..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 resize-y"
            />
            <div className="flex items-center justify-end gap-2">
              {draft.trim() && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>삭제</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handleExplicitSave();
                  setIsEditingCompact(false);
                }}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>저장 완료</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Standard full mode shown after checking the answer in QuizEngine and ExamView
  return (
    <div className="rounded-2xl border-2 border-indigo-400/80 dark:border-indigo-500/70 bg-indigo-50/50 dark:bg-slate-900/90 p-4 space-y-2.5 text-left">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
            나만의 암기팁 노트
          </span>
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            ({word.es} = {word.ko})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {justSaved ? (
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold inline-flex items-center gap-1">
              <Check className="w-3 h-3" />
              노트 저장됨
            </span>
          ) : savedNote.trim() ? (
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              ✓ 기록됨 (자동 저장)
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              단어별 학습팁 자동 저장
            </span>
          )}
        </div>
      </div>

      <textarea
        value={draft}
        onChange={handleChange}
        onKeyDown={(e) => e.stopPropagation()}
        rows={3}
        placeholder="이 단어를 쉽게 암기하기 위한 나만의 연상법, 발음 팁, 어원 메모, 예문 등 이해를 돕는 내용을 자유롭게 기록하세요..."
        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-600 dark:focus:border-indigo-400 resize-y leading-relaxed"
      />

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          💡 여기에 적은 암기팁은 이 단어가 다시 나올 때마다 함께 표시됩니다.
        </p>

        <div className="flex items-center gap-1.5 shrink-0">
          {draft.trim() && (
            <button
              type="button"
              onClick={handleClear}
              title="이 단어의 암기팁 노트 지우기"
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>지우기</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExplicitSave}
            title="작성한 암기팁 노트 저장하기"
            className="min-h-[34px] px-3.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>노트 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
