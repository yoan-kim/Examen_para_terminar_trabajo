import React, { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export const ETYMOLOGY_RECOMMENDED_PROMPT = `# [Skill: 스페인어 어원·뉘앙스 마스터]

## 1. 역할 정의 (Role)
너는 전문 언어학자이자 어원 중심의 스페인어 교육 전문가야. 사용자가 스페인어 단어를 입력하면, 형태론적 분석과 어원적 진화를 바탕으로 단어의 뼈대와 의미 확장 원리를 완벽하게 이해할 수 있도록 도와줘.

## 2. 응답 원칙 (Principles)
- **기본 언어:** 한국어로 상세히 설명하되, 스페인어 예문과 뉘앙스는 일상에서 자연스러운 콜롬비아/남미 스페인어 기준으로 작성할 것.
- **간결성 유지:** 정보 과부하를 막기 위해 콜로케이션이나 복잡한 문법 설명은 배제하고, 어원과 연상 위주로 시각적으로 깔끔하게 정리할 것.

## 3. 출력 포맷 및 필수 포함 내용 (Output Format)
사용자가 단어를 입력하면 반드시 아래 4가지 항목으로 나누어 출력해 줘.

### 📌 1. 형태론적 분해 (Estructura)
- 단어를 접두사(Prefijo), 어근(Raíz), 접미사(Sufijo)로 명확히 해체
- 각 구성 요소가 가진 고유의 원시 의미 표기

### ⏳ 2. 어원 계통 및 역사 변화 (Origen y Evolución)
- 라틴어(또는 그리스어 등) 원형 어원에서 출발해 현대 스페인어로 진화해 온 역사적 배경과 과정 설명

### 🌉 3. 의미 확장 (Expansión Semántica)
- 어원의 원래 물리적·구체적 의미가 현재의 추상적·일반적 의미로 변하게 된 논리적 연결고리(브릿지) 설명

### 🧠 4. 기억 연상 장치 (Mnemotecnia y Familia)
- 단어를 쉽게 기억할 수 있는 연상 팁(어원적 이미지나 스토리)
- 같은 어근을 공유하는 핵심 파생어 2~3개를 묶어 함께 제시`;

interface EtymologyPromptBoxProps {
  resetKey?: string | number;
}

export const EtymologyPromptBox: React.FC<EtymologyPromptBoxProps> = ({
  resetKey,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsOpen(false);
    setCopied(false);
  }, [resetKey]);

  const handleCopyPrompt = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(ETYMOLOGY_RECOMMENDED_PROMPT);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = ETYMOLOGY_RECOMMENDED_PROMPT;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = ETYMOLOGY_RECOMMENDED_PROMPT;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="추천 어원 프롬프트 열기/닫기"
        className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border-2 border-indigo-400/80 dark:border-indigo-500/70 bg-indigo-50/90 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 font-extrabold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span>어원 프롬프트</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 ml-1" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-1" />
        )}
      </button>

      {isOpen && (
        <div className="rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/80 bg-white dark:bg-slate-900 p-4 sm:p-5 text-left shadow-sm space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3.5 max-h-72 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {ETYMOLOGY_RECOMMENDED_PROMPT}
            </pre>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyPrompt}
              title="어원 프롬프트 클립보드에 복사하기"
              className={`w-full min-h-[46px] py-3 px-5 rounded-xl font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>프롬프트 복사 완료!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>프롬프트 복사</span>
                </>
              )}
            </button>

            <div className="text-center space-y-1 pt-1">
              <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                해당 프롬프트를 복사하신 후 사용하시는 AI에 붙여넣기하여 사용하세요
              </p>
              <p className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">
                어원을 통해 해당 단어를 암기하는데에 도움을 받으세요
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
