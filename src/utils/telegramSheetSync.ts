import { savePassToCloudSpreadsheet } from './cloudSpreadsheet';

const STUDENT_NAME_KEY = 'es_master_student_name_v1';

export const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN ||
  '9161923664:AAGlBmy8mTt1Wp6O6BngDpOObhz-6ervxUU';

export const DEFAULT_TELEGRAM_CHAT_ID = '-1002256338393';
export const DEFAULT_TELEGRAM_THREAD_ID = 18129; // 퇴근스페인어 토픽 전용
export const ECUADOR_TIMEZONE = 'America/Guayaquil';
export const DEFAULT_DEADLINE_TIME = '23:59'; // 당일 밤 자정 마감

export const GOOGLE_SHEET_WEBAPP_URL =
  import.meta.env.VITE_GAS_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbz4YJyiKLQS020xsM5ccadDIykoqJVOl_wlQqavZZEdqSb1J1b-HT98_gBDveHtyww/exec';

export const CENTRAL_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1FAJLVZp_--2xhFt9eI7l3YXQKbi59FvSfrh9d7cZz4E/edit';

export const PRESET_STUDENT_NAMES = [
  'Celeste',
  'Daniel',
  'Daniela',
  'Lia',
  'Lucia',
  'Miguel',
  'Selina',
] as const;

export const SPANISH_EXAM_DAYS = [
  '월요일',
  '화요일',
  '수요일',
  '목요일',
  '금요일',
] as const;

export function getSavedStudentName(): string {
  try {
    return localStorage.getItem(STUDENT_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function setSavedStudentName(name: string): void {
  try {
    localStorage.setItem(STUDENT_NAME_KEY, name.trim());
  } catch {
    /* ignore */
  }
}

export function getDefaultEcuadorWeekday(): string {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: ECUADOR_TIMEZONE,
      weekday: 'short',
    }).format(new Date());
    const map: Record<string, string> = {
      Mon: '월요일',
      Tue: '화요일',
      Wed: '수요일',
      Thu: '목요일',
      Fri: '금요일',
    };
    return map[weekday] || '월요일';
  } catch {
    return '월요일';
  }
}

export function getEcuadorTimestamp(): {
  fullTimestamp: string;
  dateOnly: string;
  timeOnly: string;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: ECUADOR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const dateOnly = `${map.year}-${map.month}-${map.day}`;
  const timeOnly = `${map.hour}:${map.minute}:${map.second}`;
  return { fullTimestamp: `${dateOnly} ${timeOnly}`, dateOnly, timeOnly };
}

export interface PassSubmissionResponse {
  ok: boolean;
  status?: '정상' | '지각';
  telegramSent?: boolean;
  sheetRecorded?: boolean;
  message?: string;
  error?: string;
}

export async function sendTelegramMessageDirect(
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    // 오직 퇴근스페인어 토픽(18129)으로만 전송 (General로 폴백하지 않음)
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: DEFAULT_TELEGRAM_CHAT_ID,
        message_thread_id: DEFAULT_TELEGRAM_THREAD_ID,
        text,
      }),
    });
    const tgJson = (await tgRes.json()) as {
      ok?: boolean;
      description?: string;
    };
    if (tgJson.ok) return { ok: true };

    return {
      ok: false,
      error:
        tgJson.description ||
        '텔레그램 봇이 퇴근스페인어 토픽(18129)에 메시지 전송 권한이 있는지 확인해주세요.',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '텔레그램 API 호출 실패',
    };
  }
}

export async function submitExamPassToTelegramAndSheet(params: {
  name: string;
  round: number;
  score: number;
  reviewScore: number;
  currentRoundScore: number;
  levelLabel?: string;
  examDay?: string;
}): Promise<{ response: PassSubmissionResponse; timestamp: string }> {
  const cleanName = params.name.trim();
  const levelLabel = params.levelLabel || '고급';
  const levelTag = `[${levelLabel}] `;
  const passStatus: '합격' | '불합격' = params.score >= 80 ? '합격' : '불합격';
  const ecTime = getEcuadorTimestamp();
  const selectedDay = params.examDay || getDefaultEcuadorWeekday();
  const submitHHMM = ecTime.timeOnly.slice(0, 5);
  const isLate = submitHHMM > DEFAULT_DEADLINE_TIME;
  const statusLabel: '정상' | '지각' = isLate ? '지각' : '정상';

  const messageText =
    `🎉 ${cleanName}님이 ${levelTag}${params.round}회차를 ${params.score}점으로 통과했습니다 축하해주세요! 👏 (${ecTime.fullTimestamp})\n` +
    `📌 [${ecTime.dateOnly} ${selectedDay} 퇴근스페인어 시험]`;

  // 1) Save to Live Cloud Spreadsheet (Firestore)
  let sheetRecorded = false;
  try {
    await savePassToCloudSpreadsheet({
      name: cleanName,
      round: params.round,
      score: params.score,
      reviewScore: params.reviewScore,
      currentRoundScore: params.currentRoundScore,
      levelLabel,
      passStatus,
      fullTimestamp: ecTime.fullTimestamp,
      dateOnly: ecTime.dateOnly,
      timeOnly: ecTime.timeOnly,
      deadlineTime: DEFAULT_DEADLINE_TIME,
      status: statusLabel,
    });
    sheetRecorded = true;
  } catch (err) {
    console.error('Cloud spreadsheet record error:', err);
  }

  // 2) Direct Telegram Bot API Call to Topic 18129 (퇴근스페인어)
  const tgResult = await sendTelegramMessageDirect(messageText);
  const telegramOk = tgResult.ok;

  // 3) 중앙 구글 시트 누적 + 퇴근스페인어 방(18129) 실시간 현황 리스트 자동 갱신
  let centralSheetOk = false;
  if (GOOGLE_SHEET_WEBAPP_URL) {
    try {
      const gasRes = await fetch(GOOGLE_SHEET_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          workerName: cleanName,
          examType: '퇴근스페인어',
          targetDate: ecTime.dateOnly,
          examSlot: selectedDay,
          scoreText: `${params.score}점`,
          passStatus: `${passStatus} (${params.score}점)`,
          examLevelTitle: `${levelLabel} ${params.round}회차`,
          telegramSent: telegramOk,
        }),
      });
      const gasJson = (await gasRes.json()) as { ok?: boolean };
      centralSheetOk = Boolean(gasJson && gasJson.ok);
    } catch (err) {
      console.error('Central Google Sheets GAS sync error:', err);
    }
  }

  const finalSheetOk = centralSheetOk || sheetRecorded;

  return {
    timestamp: ecTime.fullTimestamp,
    response: {
      ok: telegramOk || finalSheetOk,
      status: statusLabel,
      telegramSent: telegramOk,
      sheetRecorded: finalSheetOk,
      message:
        telegramOk && finalSheetOk
          ? `퇴근스페인어 방(18129) 전송 + 실시간 현황 리스트 갱신 및 중앙 시트 기록 완료! (${selectedDay} · ${ecTime.fullTimestamp})`
          : finalSheetOk
            ? `중앙 시트 기록 완료! (텔레그램 알림: ${tgResult.error})`
            : `텔레그램 전송 완료! (${ecTime.fullTimestamp})`,
      error: !telegramOk && !finalSheetOk ? tgResult.error : undefined,
    },
  };
}
