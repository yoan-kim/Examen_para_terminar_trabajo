import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Send,
  Download,
  UserPlus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
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

type SheetTab = 'submissions' | 'roster' | 'late_missing';

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
  const [deadlineTime, setDeadlineTime] = useState(DEFAULT_DEADLINE_TIME);
  const [sendingReport, setSendingReport] = useState(false);
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
          lastRound: `${r.round}회차 (${r.score}점)`,
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
    return Array.from(s).sort();
  }, [records, targetDate]);

  // Daily breakdown for targetDate
  const dailySummary = useMemo(() => {
    const dayRecords = records.filter((r) => r.dateOnly === targetDate);
    const onTimeList: CloudPassRecord[] = [];
    const lateList: CloudPassRecord[] = [];
    const submittedNames = new Set<string>();

    for (const r of dayRecords) {
      submittedNames.add(normalizeStudentBaseName(r.name));
      if (r.timeOnly.slice(0, 5) > deadlineTime) {
        lateList.push(r);
      } else {
        onTimeList.push(r);
      }
    }

    // All known students from preset roster + cloud roster + previous submissions
    const allStudentNames = new Set<string>(PRESET_STUDENT_NAMES);
    for (const m of roster) {
      if (m.active === 'Y') allStudentNames.add(normalizeStudentBaseName(m.name));
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

    return { onTimeList, lateList, missingList, allStudentNames };
  }, [records, roster, targetDate, deadlineTime, rosterStats, allActiveDates]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    await addRosterStudent(newStudentName.trim());
    setNewStudentName('');
  };

  const handleSendTelegramReport = async () => {
    setSendingReport(true);
    setReportFeedback(null);

    const { onTimeList, lateList, missingList } = dailySummary;

    let msg = `📊 [퇴근스페인어 출결·마감 정산 리포트]\n`;
    msg += `• 기준일: ${targetDate} (마감 기준: ${deadlineTime})\n\n`;

    msg += `✅ 제시간 통과 (${onTimeList.length}명):\n`;
    msg +=
      onTimeList.length > 0
        ? onTimeList
            .map(
              (x) =>
                `  - ${x.name} (${x.round}회차 ${x.score}점, ${x.timeOnly})`
            )
            .join('\n')
        : '  - 없음';

    msg += `\n\n⏰ 지각 제출자 (${lateList.length}명):\n`;
    msg +=
      lateList.length > 0
        ? lateList
            .map(
              (x) =>
                `  - ${x.name} (${x.round}회차 ${x.timeOnly} 제출 / 누적 지각 ${
                  rosterStats[x.name]?.lateCount || 1
                }회)`
            )
            .join('\n')
        : '  - 없음';

    msg += `\n\n🚨 미제출자 (${missingList.length}명):\n`;
    msg +=
      missingList.length > 0
        ? missingList
            .map((x) => `  - ${x.name} (누적 미제출 ${x.missingCount}회)`)
            .join('\n')
        : '  - 전원 제출 완료! 🎉';

    const res = await sendTelegramMessageDirect(msg);
    setSendingReport(false);
    setReportFeedback({
      ok: res.ok,
      msg: res.ok
        ? '퇴근스페인어 텔레그램 소주제 방(18129)으로 지각자·미제출자 정산 리포트를 전송했습니다!'
        : `전송 실패: ${res.error}`,
    });
  };

  const handleDownloadCsv = () => {
    const bom = '\uFEFF';
    const rows = [
      [
        '제출일시(에콰도르)',
        '날짜',
        '제출시간',
        '이름',
        '통과회차',
        '점수',
        '마감기준시간',
        '출결상태(정상/지각)',
      ].join(','),
      ...records.map((r) =>
        [
          r.fullTimestamp,
          r.dateOnly,
          r.timeOnly,
          r.name,
          `${r.round}회차`,
          `${r.score}점`,
          deadlineTime,
          r.timeOnly.slice(0, 5) > deadlineTime ? '지각' : '정상',
        ].join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([bom + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `퇴근스페인어_합격출결시트_${targetDate}.csv`;
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
                스페인어 퇴근 단어 마스터 — 실시간 합격·출결 클라우드 스프레드시트
              </h1>
              <p className="text-xs text-emerald-100 font-semibold">
                시험 합격 전송 시 이 스프레드시트에 실시간 자동 누적됩니다 (에콰도르 현지 시간 UTC-5 기준)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>엑셀/구글시트(CSV) 다운로드</span>
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

        {/* Sheet Tabs (Like Google Sheets bottom/top tabs) */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex-wrap">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('submissions')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold cursor-pointer transition-all ${
                activeTab === 'submissions'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
              }`}
            >
              1. 제출기록 시트 ({records.length}건)
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
              2. 수강생명단 시트 ({dailySummary.allStudentNames.size}명)
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
              3. 지각·미제출 추출 및 텔레그램 발송
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-extrabold">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>마감 기준 시간:</span>
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
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-slate-200 dark:border-slate-800 text-emerald-950 dark:text-emerald-200 font-extrabold">
                    <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                      #
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                      제출일시 (에콰도르)
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                      날짜
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                      제출시간
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                      이름
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                      통과회차
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                      점수
                    </th>
                    <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                      마감기준
                    </th>
                    <th className="py-3 px-3">출결상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
                  {records.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-10 text-center text-slate-400 font-bold"
                      >
                        아직 제출된 시험 합격 기록이 없습니다. 시험 합격 후 이름을
                        입력해 전송하면 여기에 실시간으로 누적됩니다.
                      </td>
                    </tr>
                  ) : (
                    records.map((r, idx) => {
                      const isLate = r.timeOnly.slice(0, 5) > deadlineTime;
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-400">
                            {records.length - idx}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono">
                            {r.fullTimestamp}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono">
                            {r.dateOnly}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono">
                            {r.timeOnly}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-extrabold text-slate-900 dark:text-white">
                            {r.name}
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-indigo-600 dark:text-indigo-400">
                            {r.round}회차
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-extrabold">
                            {r.score}점
                          </td>
                          <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500">
                            {deadlineTime}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                                isLate
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                              }`}
                            >
                              {isLate ? '⏰ 지각' : '✅ 정상'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
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
                        누적 통과 횟수
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        누적 지각 횟수
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        최근 통과 회차
                      </th>
                      <th className="py-3 px-3 border-r border-slate-200 dark:border-slate-800">
                        최근 제출 일시
                      </th>
                      <th className="py-3 px-3">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-semibold">
                    {Array.from(dailySummary.allStudentNames).length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-slate-400 font-bold"
                        >
                          등록된 수강생이 없습니다. 위 입력칸에서 이름을 추가하거나
                          시험 합격 메시지를 전송하면 자동 등록됩니다.
                        </td>
                      </tr>
                    ) : (
                      Array.from(dailySummary.allStudentNames).map((name) => {
                        const st = rosterStats[name];
                        const rosterDoc = roster.find(
                          (m) => m.name.trim() === name
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
                    기준 날짜 (에콰도르):
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-extrabold"
                  />
                </div>

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
                      : '지각자·미제출자 명단 텔레그램 방(18129)으로 즉시 발송'}
                  </span>
                </button>
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
                {/* On Time */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-300 mb-2">
                    ✅ 제시간 통과 ({dailySummary.onTimeList.length}명)
                  </h3>
                  <div className="space-y-1.5 text-xs font-bold">
                    {dailySummary.onTimeList.length === 0 ? (
                      <div className="text-slate-400">없음</div>
                    ) : (
                      dailySummary.onTimeList.map((r) => (
                        <div key={r.id}>
                          • {r.name} ({r.round}회차 {r.score}점, {r.timeOnly})
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Late */}
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-300 mb-2">
                    ⏰ 마감({deadlineTime}) 이후 지각자 (
                    {dailySummary.lateList.length}명)
                  </h3>
                  <div className="space-y-1.5 text-xs font-bold">
                    {dailySummary.lateList.length === 0 ? (
                      <div className="text-slate-400">없음</div>
                    ) : (
                      dailySummary.lateList.map((r) => (
                        <div key={r.id}>
                          • {r.name} ({r.round}회차 {r.timeOnly} 제출 / 누적 지각{' '}
                          {rosterStats[r.name]?.lateCount || 1}회)
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Missing */}
                <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <h3 className="text-sm font-extrabold text-rose-900 dark:text-rose-300 mb-2">
                    🚨 미제출자 ({dailySummary.missingList.length}명)
                  </h3>
                  <div className="space-y-1.5 text-xs font-bold">
                    {dailySummary.missingList.length === 0 ? (
                      <div className="text-slate-400">없음</div>
                    ) : (
                      dailySummary.missingList.map((m) => (
                        <div key={m.name}>
                          • {m.name} (누적 미제출 {m.missingCount}회)
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
