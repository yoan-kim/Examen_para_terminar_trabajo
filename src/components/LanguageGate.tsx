import React from 'react';
import { Volume2, Sun, Moon, CheckCircle2 } from 'lucide-react';
import { AppLanguage } from '../data/i18n';
import { speakEcuadorSpanish } from '../utils/tts';

interface LanguageGateProps {
  onSelectLanguage: (lang: AppLanguage) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const LanguageGate: React.FC<LanguageGateProps> = ({
  onSelectLanguage,
  isDark,
  onToggleTheme,
}) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-8 transition-colors">
      {/* Top right theme button */}
      <div className="max-w-3xl w-full mx-auto flex justify-end">
        <button
          type="button"
          onClick={onToggleTheme}
          className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          <span>{isDark ? '밝은 화면 / Claro' : '어두운 화면 / Oscuro'}</span>
        </button>
      </div>

      {/* Center Language Selection Stage */}
      <div className="max-w-3xl w-full mx-auto my-auto py-8">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
            1 ~ 30 · 600 VOCABULARY MASTER · ECUADOR (es-EC)
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            학습할 언어를 선택하세요
          </h1>
          <p className="text-base sm:text-lg font-medium text-slate-600 dark:text-slate-400">
            Selecciona tu idioma para comenzar el estudio
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Korean Option Card */}
          <div className="group rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-600 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 p-7 transition-all flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  한국어 전용 모드
                </span>
                <CheckCircle2 className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
                한국어
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                모든 화면, 안내문, 버튼, 단어 뜻풀이와 발음 표기가 온전히 한국어로만 표시됩니다. 발음 듣기는 라틴아메리카 에콰도르 원어민 발음으로 재생됩니다.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakEcuadorSpanish('Hola, bienvenidos al curso de vocabulario');
                }}
                className="w-full min-h-[42px] py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>에콰도르 발음 미리듣기</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectLanguage('ko')}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-base transition-all cursor-pointer shadow-sm"
              >
                한국어로 시작하기
              </button>
            </div>
          </div>

          {/* Español Option Card */}
          <div className="group rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-emerald-600 dark:hover:border-emerald-500 bg-white dark:bg-slate-900 p-7 transition-all flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Modo 100% en Español
                </span>
                <CheckCircle2 className="w-5 h-5 text-slate-300 dark:text-slate-700 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
                Español
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                Toda la interfaz, botones, cuestionarios, exámenes y definiciones se muestran íntegramente en español, con audio de pronunciación latinoamericana de Ecuador.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  speakEcuadorSpanish('Hola, bienvenidos al maestro de vocabulario');
                }}
                className="w-full min-h-[42px] py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Probar pronunciación de Ecuador</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectLanguage('es')}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base transition-all cursor-pointer shadow-sm"
              >
                Comenzar en Español
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <footer className="max-w-3xl w-full mx-auto text-center text-xs text-slate-400 dark:text-slate-500">
        <span>한국어 / Español · 1~30 (600) · Pronunciación de Ecuador (es-EC)</span>
      </footer>
    </div>
  );
};
