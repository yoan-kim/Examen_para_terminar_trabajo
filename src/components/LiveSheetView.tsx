import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Send,
  Download,
  Copy,
  UserPlus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import {
  CloudPassRecord,
  CloudRosterMember,
  subscribePassRecords,
  subscribeRosterMembers,
  addRosterStudent,
  removeRosterStudent,
} from '../utils/cloudSpreadsheet';
import {
  getEcuadorTimestamp,
  sendTelegramMessageDirect,
  DEFAULT_DEADLINE_TIME,
  PRESET_STUDENT_NAMES,
} from '../utils/telegramSheetSync';

interface LiveSheetViewProps {
  onBackToApp?: () => void;
}

type SheetTab = 'submissions' | 'late_missing' | 'roster';

export const LiveSheetView: React.FC<LiveSheetViewProps> = ({
  onBackToApp,
}) => {
  const [activeTab, setActiveTab] = useState<SheetTab>('submissions');
  const [records, setRecords] = useState<CloudPassRecord[]>([]);
  const [roster, setRoster] = useState<CloudRosterMember[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [targetDate, setTargetDate] = useState(
    () => getEcuadorTimestamp().dateOnly
  );
  const [filterByDateInSheet, setFilterByDateInSheet] = useState<string>('ALL');
  const [deadlineTime, setDeadlineTime] = useState(DEFAULT_DEADLINE_TIME);
  const [sendingReport, setSendingReport] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState(false);
  const [copiedReportText, setCopiedReportText] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  useEffect(() => {
    const unsubRecords = subscribePassRecords(setRecords);
    const unsubRoster = subscribeRosterMembers(setRoster);
    return () => {
      unsubRecords();
      unsubRoster();
    };
  }, []);

  const normalizeStudentBaseName = (rawName: string) =>
    rawName.replace(/\s*\([^)]*\)\s*$/, '').trim();

  // Compute per-student cumulative stats from all records
  const rosterStats = useMemo(() => {
    const map: Record<
      string,
      {
        passCount: number;
        lateCount: number;
        lastLevel: string;
        lastRound: string;
        lastTime: string;
        submittedDates: Set<string>;
      }
    > = {};

    for (const r of records) {
      const name = normalizeStudentBaseName(r.name);
      if (!map[name]) {
        map[name] = {
          passCount: 0,
          lateCount: 0,
          lastLevel: r.levelLabel || '고급',
          lastRound: `[${r.levelLabel || '고급'}] ${r.round}회차 (${r.score}점)`,
          lastTime: r.fullTimestamp,
          submittedDates: new Set(),
        };
      }
      map[name].passCount += 1;
      if (r.timeOnly.slice(0, 5) > deadlineTime) {
        map[name].lateCount += 1;
      }
      map[name].submittedDates.add(r.dateOnly);
    }
    return map;
  }, [records, deadlineTime]);

  // All distinct dates that had any submissions (plus today)
  const allActiveDates = useMemo(() => {
    const s = new Set<string>();
    s.add(targetDate);
    for (const r of records) {
      if (r.dateOnly) s.add(r.dateOnly);
    }
    return Array.from(s).sort().reverse();
  }, [records, targetDate]);

  // Filtered rows for Tab 1 (Cumulative Spreadsheet)
  const displayedRecords = useMemo(() => {
    if (filterByDateInSheet === 'ALL') return records;
    return records.filter((r) => r.dateOnly === filterByDateInSheet);
  }, [records, filterByDateInSheet]);

  // Daily breakdown for targetDate (합격한 사람 / 지각한 사람 / 합격 못한 사람(올리지 않은 사람))
  const dailySummary = useMemo(() => {
    const dayRecords = records.filter((r) => r.dateOnly === targetDate);
    const passedAllList: CloudPassRecord[] = [];
    const onTimeList: CloudPassRecord[] = [];
    const lateList: CloudPassRecord[] = [];
    const submittedNames = new Set<string>();

    // Keep latest/best record per student on that date or all submissions
    for (const r of dayRecords) {
      const baseName = normalizeStudentBaseName(r.name);
      submittedNames.add(baseName);
      if (r.passStatus !== '불합격' && r.score >= 80) {
        passedAllList.push(r);
        if (r.timeOnly.slice(0, 5) > deadlineTime) {
          lateList.push(r);
        } else {
          onTimeList.push(r);
        }
      }
    }

    // All known students from preset roster + cloud roster + previous submissions
    const allStudentNames = new Set<string>(PRESET_STUDENT_NAMES);
    for (const m of roster) {
      if (m.active === 'Y') {
        allStudentNames.add(normalizeStudentBaseName(m.name));
      }
    }
    for (const r of records) {
      allStudentNames.add(normalizeStudentBaseName(r.name));
    }

    const missingList: { name: string; missingCount: number }[] = [];
    allStudentNames.forEach((studentName) => {
      if (!submittedNames.has(studentName)) {
        const subDates = rosterStats[studentName]?.submittedDates;
        let missedDays = 0;
        for (const d of allActiveDates) {
          if (!subDates || !subDates.has(d)) {
            missedDays += 1;
          }
        }
        missingList.push({
          name: studentName,
          missingCount: Math.max(1, missedDays),
        });
      }
    });

    return {
      passedAllList,
      onTimeList,
      lateList,
      missingList,
      allStudentNames,
    };
  }, [records, roster, targetDate, deadlineTime, rosterStats, allActiveDates]);

  // Formatted Telegram summary text for targetDate
  const telegramSummaryPreview = useMemo(() => {
    const { passedAllList, onTimeList, lateList, missingList } = dailySummary;

    let msg = `📊 [퇴근스페인어 일일 합격·미합격 정산 명단]\n`;
    msg += `📅 기준 날짜: ${targetDate} (마감 기준: ${deadlineTime})\n\n`;

    msg += `✅ 합격한 사람 명단 (${passedAllList.length}명):\n`;
    msg +=
      passedAllList.length > 0
        ? passedAllList
            .map((x) => {
              const isLate = x.timeOnly.slice(0, 5) > deadlineTime;
              return `  • ${x.name} — [${x.levelLabel || '고급'}] ${x.round}회차 ${x.score}점 (${x.timeOnly} / ${isLate ? '합격·지각⏰' : '합격·정상'})`;
            })
            .join('\n')
        : '  • 없음';

    msg += `\n\n⏰ 지각한 사람 명단 (${lateList.length}명):\n`;
    msg +=
      lateList.length > 0
        ? lateList
            .map(
              (x) =>
                `  • ${x.name} — [${x.levelLabel || '고급'}] ${x.round}회차 (${x.timeOnly} 제출 / 누적 지각 ${
                  rosterStats[normalizeStudentBaseName(x.name)]?.lateCount || 1
                }회)`
            )
            .join('\n')
        : '  • 없음 (전원 제시간 제출)';

    msg += `\n\n🚨 합격 못한 사람 / 미제출 명단 (${missingList.length}명):\n`;
    msg +=
      missingList.length > 0
        ? missingList
            .map((x) => `  • ${x.name} (미제출 / 누적 미제출 ${x.missingCount}회)`)
            .join('\n')
        : '  • 전원 합격 완료! 🎉';

    msg += `\n\n📌 요약: 제시간 합격 ${onTimeList.length}명 / 지각 합격 ${lateList.length}명 / 미합격(미제출) ${missingList.length}명`;
    return msg;
  }, [dailySummary, targetDate, deadlineTime, rosterStats]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    await addRosterStudent(newStudentName.trim());
    setNewStudentName('');
  };

  const handleSendTelegramReport = async () => {
    setSendingReport(true);
    setReportFeedback(null);

    const res = await sendTelegramMessageDirect(telegramSummaryPreview);
    setSendingReport(false);
    setReportFeedback({
      ok: res.ok,
      msg: res.ok
        ? `퇴근스페인어 텔레그램 방(18129)으로 [${targetDate}] 합격한 사람 / 합격 못한 사람 / 지각한 사람 정리 명단을 전송했습니다!`
        : `전송 실패: ${res.error}`,
    });
  };

  const handleCopyReportText = async () => {
    try {
      await navigator.clipboard.writeText(telegramSummaryPreview);
      setCopiedReportText(true);
      setTimeout(() => setCopiedReportText(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyForGoogleSheets = async () => {
    const header = [
      '전송날짜',
      '시간',
      '이름',
      '등급',
      '회차',
      '점수',
      '합격여부',
      '출결상태',
    ].join('\t');
    const lines = displayedRecords.map((r) => {
      const isLate = r.timeOnly.slice(0, 5) > deadlineTime;
      return [
        r.dateOnly,
        r.timeOnly,
        r.name,
        r.levelLabel || '고급',
        `${r.round}회차`,
        `${r.score}점`,
        r.passStatus || '합격',
        isLate ? '지각' : '정상',
      ].join('\t');
    });
    try {
      await navigator.clipboard.writeText([header, ...lines].join('\n'));
      setCopiedSheet(true);
      setTimeout(() => setCopiedSheet(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDownloadCsv = () => {
    const bom = '\uFEFF';
    const rows = [
      [
        '전송날짜',
        '시간',
        '이름',
        '등급',
        '회차',
        '점수',
        '합격여부',
        '출결상태(정상/지각)',
      ].join(','),
      ...displayedRecords.map((r) =>
        [
          r.dateOnly,
          r.timeOnly,
          r.name,
          r.levelLabel || '고급',
          `${r.round}회차`,
          `${r.score}점`,
          r.passStatus || '합격',
          r.timeOnly.slice(0, 5) > deadlineTime ? '지각' : '정상',
        ].join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([bom + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `퇴근스페인어_누적스프레드시트_${targetDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Top Spreadsheet Header */}
        <div className="px-5 py-4 bg-emerald-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold">
                퇴근스페인어 — 실시간 누적 구글 스프레드시트 & 일일 합격·미합격 정산
              </h1>
              <p className="text-xs text-emerald-100 font-semibold">
                텔레그램 전송 버튼을 누를 때마다 [전송날짜 · 시간 · 이름 · 등급 · 점수 · 합격여부]가 실시간 자동 누적됩니다
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleCopyForGoogleSheets}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>
                {copiedSheet
                  ? '✅ 복사 완료 (구글시트에 Ctrl+V)'
                  : '구글시트 붙여넣기용 전체 복사'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>스프레드시트(CSV) 다운로드</span>
            </button>

            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="px-3.5 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>단어 시험장으로 돌아가기</span>
              </button>
            )}
          </div>
        </div>

        {/* Sheet Tabs */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer transition-all ${
                activeTab === 'submissions'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              1. 누적 스프레드시트 ({records.length}건)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('late_missing')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer transition-all ${
                activeTab === 'late_missing'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              2. 날짜별 합격·미합격·지각 명단 정리 & 텔레방 전송
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer transition-all ${
                activeTab === 'roster'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              3. 전체 수강생 명단 ({dailySummary.allStudentNames.size}명)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-extrabold">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>지각 마감 기준:</span>
            <input
              type="time"
              value={deadlineTime}
              onChange={(e) => setDeadlineTime(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
            />
          </div>
        </div>

        {/* Sheet Content */}
        <div className="p-4 sm:p-6">
          {activeTab === 'submissions' && (
            <div className="space-y-3">
              {/* Date Filter Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>날짜별 조회:</span>
                  <select
                    value={filterByDateInSheet}
                    onChange={(e) => setFilterByDateInSheet(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-extrabold"
                  >
                    <option value="ALL">전체 날짜 누적 보기 ({records.length}건)</option>
                    {allActiveDates.map((d) => (
                      <option key={d} value={d}>
                        {d} 기록만 보기
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (filterByDateInSheet !== 'ALL') {
                      setTargetDate(filterByDateInSheet);
                    }
                    setActiveTab('late_missing');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold hover:bg-emerald-100 cursor-pointer"
                >
                  📊 특정날짜 합격자·미합격자·지각자 정리해서 텔레방 올리기 →
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-slate-200 dark:border-slate-800 text-emerald-950 dark:text-emerald-200 font-extrabold">
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        #
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        전송날짜
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        시간
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        이름
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        등급 (회차)
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        점수
                      </th>
                      <th className="py-3 px-3">합격여부 (출결)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
                    {displayedRecords.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-10 text-center text-slate-400 font-bold"
                        >
                          아직 누적된 전송 기록이 없습니다. 시험 합격 후 텔레그램
                          [전송] 버튼을 누를 때마다 전송날짜, 시간, 이름, 등급, 점수,
                          합격여부가 여기에 실시간으로 누적됩니다.
                        </td>
                      </tr>
                    ) : (
                      displayedRecords.map((r, idx) => {
                        const isLate = r.timeOnly.slice(0, 5) > deadlineTime;
                        const isPass =
                          r.passStatus !== '불합격' && r.score >= 80;
                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-400">
                              {displayedRecords.length - idx}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono font-bold">
                              {r.dateOnly}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono">
                              {r.timeOnly}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-white">
                              {r.name}
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-extrabold text-indigo-600 dark:text-indigo-400">
                              {r.levelLabel || '고급'} ({r.round}회차)
                            </td>
                            <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-extrabold font-mono">
                              {r.score}점
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="inline-flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                                    isPass
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                  }`}
                                >
                                  {isPass ? '✅ 합격' : '❌ 불합격'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
                                    isLate
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {isLate ? '⏰ 지각' : '정상'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'late_missing' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs sm:text-sm font-extrabold">
                    📅 정산할 특정 날짜 선택:
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-extrabold"
                  />
                  {allActiveDates.length > 0 && (
                    <select
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-extrabold"
                    >
                      {allActiveDates.map((d) => (
                        <option key={d} value={d}>
                          기록 있는 날짜: {d}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyReportText}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>
                      {copiedReportText ? '✅ 명단 복사됨' : '정리 명단 복사'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendTelegramReport}
                    disabled={sendingReport}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {sendingReport
                        ? '텔레그램 방으로 전송 중...'
                        : '합격한 사람 · 합격 못한 사람 · 지각자 명단 텔레방(18129) 즉시 올리기'}
                    </span>
                  </button>
                </div>
              </div>

              {reportFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center gap-2 ${
                    reportFeedback.ok
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                      : 'bg-rose-50 border-rose-400 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200'
                  }`}
                >
                  {reportFeedback.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{reportFeedback.msg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Passed List */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300 mb-2">
                    ✅ 합격한 사람 명단 ({dailySummary.passedAllList.length}명)
                  </h3>
                  <div className="space-y-1.5 text-xs font-bold">
                    {dailySummary.passedAllList.length === 0 ? (
                      <div className="text-slate-400">해당 날짜 합격 기록 없음</div>
                    ) : (
                      dailySummary.passedAllList.map((r) => {
                        const isLate = r.timeOnly.slice(0, 5) > deadlineTime;
                        return (
                          <div key={r.id}>
                            • <strong>{r.name}</strong> — [{r.levelLabel || '고급'}]{' '}
                            {r.round}회차 {r.score}점 ({r.timeOnly} /{' '}
                            {isLate ? '지각⏰' : '정상'})
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Late List */}
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300 mb-2">
                    ⏰ 지각한 사람 명단 ({dailySummary.lateList.length}명)
                  </h3>
                  <div className="space-y-1.5 text-xs font-bold">
                    {dailySummary.lateList.length === 0 ? (
                      <div className="text-slate-400">지각자 없음</div>
                    ) : (
                      dailySummary.lateList.map((r) => (
                        <div key={r.id}>
                          • <strong>{r.name}</strong> — [{r.levelLabel || '고급'}]{' '}
                          {r.round}회차 ({r.timeOnly} 제출 / 누적 지각{' '}
                          {rosterStats[normalizeStudentBaseName(r.name)]
                            ?.lateCount || 1}
                          회)
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Not Passed / Missing List */}
                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <h3 className="text-sm font-extrabold text-rose-900 dark:text-rose-300 mb-2">
                    🚨 합격 못한 사람 / 올리지 않은 사람 ({dailySummary.missingList.length}명)
                  </h3>
                  <div className="space-y-1.5 text-xs font-bold">
                    {dailySummary.missingList.length === 0 ? (
                      <div className="text-slate-400">전원 합격 완료! 🎉</div>
                    ) : (
                      dailySummary.missingList.map((m) => (
                        <div key={m.name}>
                          • <strong>{m.name}</strong> (미제출 / 누적 미제출{' '}
                          {m.missingCount}회)
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Telegram Message Preview Box */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 mb-2">
                  📨 텔레그램 방 전송 메시지 미리보기
                </div>
                <pre className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {telegramSummaryPreview}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="space-y-4">
              <form
                onSubmit={handleAddStudent}
                className="flex items-center gap-2 max-w-md"
              >
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="수강생 이름 추가 (미제출자 자동 체크용)"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>명단 추가</span>
                </button>
              </form>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-slate-200 dark:border-slate-800 text-emerald-950 dark:text-emerald-200 font-extrabold">
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        이름
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        누적 합격 횟수
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        누적 지각 횟수
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        최근 합격 등급·회차
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        최근 제출 일시
                      </th>
                      <th className="py-3 px-3">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
                    {Array.from(dailySummary.allStudentNames).map((name) => {
                      const st = rosterStats[name];
                      const rosterDoc = roster.find(
                        (m) => normalizeStudentBaseName(m.name) === name
                      );
                      return (
                        <tr key={name}>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-extrabold">
                            {name}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                            {st?.passCount || 0}회
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-amber-600 dark:text-amber-400 font-extrabold">
                            {st?.lateCount || 0}회
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800">
                            {st?.lastRound || '-'}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono">
                            {st?.lastTime || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            {rosterDoc && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeRosterStudent(rosterDoc.id)
                                }
                                className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                                title="명단에서 삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
