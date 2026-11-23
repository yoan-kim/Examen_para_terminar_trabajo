/**
 * Direct Telegram Topic Room + Live Cloud Spreadsheet (Firestore) Sync
 * Target Telegram Room: https://t.me/c/2256338393/18129
 * -> Supergroup Chat ID: -1002256338393
 * -> Topic Thread ID (message_thread_id): 18129
 * Timezone: America/Guayaquil (Ecuador Time, UTC-5)
 */

import { savePassToCloudSpreadsheet } from './cloudSpreadsheet';

const STUDENT_NAME_KEY = 'es_master_student_name_v1';

export const TELEGRAM_BOT_TOKEN =
  import.meta.env.VITE_TELEGRAM_BOT_TOKEN ||
  '9161923664:AAGlBmy8mTt1Wp6O6BngDpOObhz-6ervxUU';

export const DEFAULT_TELEGRAM_CHAT_ID = '-1002256338393';
export const DEFAULT_TELEGRAM_THREAD_ID = 18129;
export const ECUADOR_TIMEZONE = 'America/Guayaquil';
export const DEFAULT_DEADLINE_TIME = '22:00';

export const GOOGLE_SHEET_WEBAPP_URL =
  import.meta.env.VITE_GAS_WEBHOOK_URL || '';

export const PRESET_STUDENT_NAMES = [
  'Celeste',
  'Daniel',
  'Daniela',
  'Lucia',
  'Miguel',
  'Selina',
  'Lia',
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
    // ignore
  }
}

/**
 * Formats the current timestamp in Ecuador local time (America/Guayaquil, UTC-5)
 */
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
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const dateOnly = `${map.year}-${map.month}-${map.day}`;
  const timeOnly = `${map.hour}:${map.minute}:${map.second}`;
  return {
    fullTimestamp: `${dateOnly} ${timeOnly}`,
    dateOnly,
    timeOnly,
  };
}

export interface PassSubmissionResponse {
  ok: boolean;
  status?: '정상' | '지각';
  telegramSent?: boolean;
  sheetRecorded?: boolean;
  message?: string;
  error?: string;
}

/**
 * Sends any custom message directly to the Telegram Topic Room (18129)
 */
export async function sendTelegramMessageDirect(text: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    if (tgJson.ok) {
      return { ok: true };
    }

    const retryRes = await fetch(tgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: DEFAULT_TELEGRAM_CHAT_ID,
        text,
      }),
    });
    const retryJson = (await retryRes.json()) as {
      ok?: boolean;
      description?: string;
    };
    if (retryJson.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error:
        tgJson.description ||
        retryJson.description ||
        '텔레그램 봇이 해당 그룹방에 초대되어 있고 메시지 전송 권한이 있는지 확인해주세요.',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : '텔레그램 API 호출 실패',
    };
  }
}

/**
 * Directly sends the exam pass celebration message to the Telegram Topic Room
 * and simultaneously records it into the live Cloud Spreadsheet (Firestore).
 */
export async function submitExamPassToTelegramAndSheet(params: {
  name: string;
  round: number;
  score: number;
  reviewScore: number;
  currentRoundScore: number;
  levelLabel?: string;
}): Promise<{
  response: PassSubmissionResponse;
  timestamp: string;
}> {
  const cleanName = params.name.trim();
  const levelTag = params.levelLabel ? `[${params.levelLabel}] ` : '';
  const ecTime = getEcuadorTimestamp();
  const submitHHMM = ecTime.timeOnly.slice(0, 5);
  const isLate = submitHHMM > DEFAULT_DEADLINE_TIME;
  const statusLabel: '정상' | '지각' = isLate ? '지각' : '정상';

  const messageText = `🎉 ${cleanName}님이 ${levelTag}${params.round}회차를 ${params.score}점으로 통과했습니다 축하해주세요! 👏 (${ecTime.fullTimestamp})`;

  // 1) Save to Live Cloud Spreadsheet (Firestore)
  let sheetRecorded = false;
  try {
    await savePassToCloudSpreadsheet({
      name: params.levelLabel
        ? `${cleanName} (${params.levelLabel})`
        : cleanName,
      round: params.round,
      score: params.score,
      reviewScore: params.reviewScore,
      currentRoundScore: params.currentRoundScore,
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

  // 2) Direct Telegram Bot API Call to Topic 18129
  const tgResult = await sendTelegramMessageDirect(messageText);
  const telegramOk = tgResult.ok;

  // 3) Optional GAS Webhook Sync
  if (GOOGLE_SHEET_WEBAPP_URL) {
    try {
      await fetch(GOOGLE_SHEET_WEBAPP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          action: 'submit_pass_sheet_only',
          name: params.levelLabel
            ? `${cleanName} (${params.levelLabel})`
            : cleanName,
          round: params.round,
          score: params.score,
          reviewScore: params.reviewScore,
          currentRoundScore: params.currentRoundScore,
          timestamp: ecTime.fullTimestamp,
          dateOnly: ecTime.dateOnly,
          timeOnly: ecTime.timeOnly,
          deadlineTime: DEFAULT_DEADLINE_TIME,
          skipTelegram: telegramOk,
        }),
      });
    } catch {
      // ignore
    }
  }

  return {
    timestamp: ecTime.fullTimestamp,
    response: {
      ok: telegramOk || sheetRecorded,
      status: statusLabel,
      telegramSent: telegramOk,
      sheetRecorded,
      message:
        telegramOk && sheetRecorded
          ? `퇴근스페인어 텔레그램 방 및 실시간 출결 스프레드시트에 자동 기록되었습니다! (${ecTime.fullTimestamp})`
          : sheetRecorded
          ? `출결 스프레드시트 기록 완료! (텔레그램 알림: ${tgResult.error})`
          : `텔레그램 전송 완료! (${ecTime.fullTimestamp})`,
      error: !telegramOk && !sheetRecorded ? tgResult.error : undefined,
    },
  };
}
