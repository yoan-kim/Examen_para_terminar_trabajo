// ============================================================================
// [스페인어 퇴근 단어 마스터] 구글 스프레드시트 자동 생성 & 지각자·미제출자 텔레그램 알림 스크립트
// - 텔레그램 방: https://t.me/c/2256338393/18129 (Chat ID: -1002256338393 / Thread ID: 18129)
// - 텔레그램 봇 토큰: 9161923664:AAGlBmy8mTt1Wp6O6BngDpOObhz-6ervxUU (이미 입력 완료!)
// - 사용법: 구글 스프레드시트 상단 [확장 프로그램] -> [Apps Script]에 이 코드를 그대로 붙여넣고
//   [initSheetsIfNeeded] 함수를 1회 실행하면 시트 탭 3개(제출기록, 수강생명단, 지각_미제출_누적로그)가
//   자동으로 만들어지며, [sendDailyDeadlineReport]를 일일 트리거로 걸어두면 매일 지각/미제출자를
//   추출해 텔레그램 방으로 자동 발송합니다.
// ============================================================================

const TELEGRAM_BOT_TOKEN = '9161923664:AAGlBmy8mTt1Wp6O6BngDpOObhz-6ervxUU';
const TELEGRAM_CHAT_ID = '-1002256338393';
const TELEGRAM_THREAD_ID = 18129;

const DEFAULT_DEADLINE_TIME = '22:00';
const TIMEZONE = 'America/Guayaquil';

const SHEET_SUBMISSIONS = '제출기록';
const SHEET_ROSTER = '수강생명단';
const SHEET_LATE_LOG = '지각_미제출_누적로그';

const PRESET_ROSTER_NAMES = [
  'Celeste',
  'Daniel',
  'Daniela',
  'Lucia',
  'Miguel',
  'Selina',
  'Lia'
];

function initSheetsIfNeeded() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let subSheet = ss.getSheetByName(SHEET_SUBMISSIONS);
  if (!subSheet) {
    subSheet = ss.insertSheet(SHEET_SUBMISSIONS);
    subSheet.appendRow([
      '전송날짜',
      '시간',
      '이름',
      '등급',
      '점수',
      '합격여부',
      '출결상태(정상/지각)'
    ]);
    subSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#e0e7ff');
  }

  let rosterSheet = ss.getSheetByName(SHEET_ROSTER);
  if (!rosterSheet) {
    rosterSheet = ss.insertSheet(SHEET_ROSTER);
    rosterSheet.appendRow([
      '이름',
      '활성여부(Y/N)',
      '누적 통과 횟수',
      '누적 지각 횟수',
      '누적 미제출 횟수',
      '최근 통과 회차',
      '최근 제출 일시'
    ]);
    rosterSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#dcfce7');
    for (let i = 0; i < PRESET_ROSTER_NAMES.length; i++) {
      rosterSheet.appendRow([PRESET_ROSTER_NAMES[i], 'Y', 0, 0, 0, '-', '-']);
    }
  }

  let logSheet = ss.getSheetByName(SHEET_LATE_LOG);
  if (!logSheet) {
    logSheet = ss.insertSheet(SHEET_LATE_LOG);
    logSheet.appendRow([
      '기록일시(에콰도르)',
      '기준날짜',
      '이름',
      '구분(지각/미제출)',
      '상세내용(제출시간 및 회차)'
    ]);
    logSheet.getRange('A1:E1').setFontWeight('bold').setBackground('#fee2e2');
  }

  return { ss, subSheet, rosterSheet, logSheet };
}

function doPost(e) {
  try {
    const { subSheet, rosterSheet, logSheet } = initSheetsIfNeeded();
    const body = JSON.parse(e.postData.contents || '{}');
    const name = String(body.name || '').trim();
    const levelLabel = String(body.levelLabel || '고급').trim();
    const round = Number(body.round || 1);
    const score = Number(body.score || 80);
    const passStatus = String(body.passStatus || (score >= 80 ? '합격' : '불합격'));
    const now = new Date();
    const dateOnly = body.dateOnly || Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
    const timeOnly = body.timeOnly || Utilities.formatDate(now, TIMEZONE, 'HH:mm:ss');
    const fullTimestamp = body.timestamp || (dateOnly + ' ' + timeOnly);
    const deadline = String(body.deadlineTime || DEFAULT_DEADLINE_TIME).trim();

    const isLate = timeOnly.slice(0, 5) > deadline;
    const statusLabel = isLate ? '지각' : '정상';

    subSheet.appendRow([
      dateOnly,
      timeOnly,
      name,
      levelLabel + ' (' + round + '회차)',
      score + '점',
      passStatus,
      statusLabel
    ]);

    updateRosterOnSubmit(rosterSheet, name, levelLabel + ' ' + round, fullTimestamp, isLate);

    if (isLate) {
      logSheet.appendRow([
        fullTimestamp,
        dateOnly,
        name,
        '지각',
        round + '회차 ' + score + '점 (' + timeOnly + ' 제출 / 마감 ' + deadline + ')'
      ]);
    }

    if (!body.skipTelegram) {
      const tgText =
        '🎉 ' + name + '님이 ' + round + '회차를 ' + score + '점으로 통과했습니다 축하해주세요! 👏 (' + fullTimestamp + ')';
      sendTelegramTopicMessage(tgText);
    }

    return ContentService.createTextOutput(JSON.stringify({ ok: true, status: statusLabel }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateRosterOnSubmit(rosterSheet, name, round, fullTimestamp, isLate) {
  const data = rosterSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowName = String(data[i][0] || '').trim();
    if (rowName === name) {
      const rowNum = i + 1;
      rosterSheet.getRange(rowNum, 3).setValue(Number(data[i][2] || 0) + 1);
      rosterSheet.getRange(rowNum, 4).setValue(Number(data[i][3] || 0) + (isLate ? 1 : 0));
      rosterSheet.getRange(rowNum, 6).setValue(round + '회차');
      rosterSheet.getRange(rowNum, 7).setValue(fullTimestamp);
      return;
    }
  }
  rosterSheet.appendRow([name, 'Y', 1, isLate ? 1 : 0, 0, round + '회차', fullTimestamp]);
}

function sendDailyDeadlineReport() {
  const { subSheet, rosterSheet, logSheet } = initSheetsIfNeeded();
  const targetDate = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const nowStr = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

  const rosterData = rosterSheet.getDataRange().getValues();
  const activeRoster = [];
  const rosterRowMap = {};

  for (let i = 1; i < rosterData.length; i++) {
    const rName = String(rosterData[i][0] || '').trim();
    const active = String(rosterData[i][1] || 'Y').trim().toUpperCase();
    if (rName && active !== 'N') {
      activeRoster.push(rName);
      rosterRowMap[rName] = {
        rowNum: i + 1,
        lateCount: Number(rosterData[i][3] || 0),
        missingCount: Number(rosterData[i][4] || 0)
      };
    }
  }

  const subData = subSheet.getDataRange().getValues();
  const onTimeList = [];
  const lateList = [];
  const submittedNames = {};

  for (let i = 1; i < subData.length; i++) {
    const rowDate = subData[i][1] instanceof Date
      ? Utilities.formatDate(subData[i][1], TIMEZONE, 'yyyy-MM-dd')
      : String(subData[i][1] || '').trim().slice(0, 10);
    if (rowDate !== targetDate) continue;

    const rowTime = subData[i][2] instanceof Date
      ? Utilities.formatDate(subData[i][2], TIMEZONE, 'HH:mm:ss')
      : String(subData[i][2] || '').trim();
    const rName = String(subData[i][3] || '').trim();
    const rRound = String(subData[i][4] || '');
    const rScore = String(subData[i][5] || '');
    if (!rName) continue;

    submittedNames[rName] = true;
    if (rowTime.slice(0, 5) > DEFAULT_DEADLINE_TIME) {
      lateList.push(rName + ' (' + rRound + ' ' + rowTime + ' 제출)');
    } else {
      onTimeList.push(rName + ' (' + rRound + ' ' + rScore + ', ' + rowTime + ')');
    }
  }

  const missingList = [];
  for (let i = 0; i < activeRoster.length; i++) {
    const studentName = activeRoster[i];
    if (!submittedNames[studentName]) {
      const info = rosterRowMap[studentName];
      const nextMissing = info ? info.missingCount + 1 : 1;
      if (info) rosterSheet.getRange(info.rowNum, 5).setValue(nextMissing);
      logSheet.appendRow([nowStr, targetDate, studentName, '미제출', '마감(' + DEFAULT_DEADLINE_TIME + ') 미제출 (누적 ' + nextMissing + '회)']);
      missingList.push(studentName + ' (누적 미제출 ' + nextMissing + '회)');
    }
  }

  let msg = '📊 [퇴근스페인어 일일 마감 정산] (' + targetDate + ')\\n\\n';
  msg += '✅ 제시간 통과 (' + onTimeList.length + '명):\\n' + (onTimeList.length ? '  - ' + onTimeList.join('\\n  - ') : '  - 없음') + '\\n\\n';
  msg += '⏰ 지각 제출자 (' + lateList.length + '명):\\n' + (lateList.length ? '  - ' + lateList.join('\\n  - ') : '  - 없음') + '\\n\\n';
  msg += '🚨 미제출자 (' + missingList.length + '명):\\n' + (missingList.length ? '  - ' + missingList.join('\\n  - ') : '  - 전원 제출 완료! 🎉');

  sendTelegramTopicMessage(msg);
}

function sendTelegramTopicMessage(text) {
  const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      message_thread_id: TELEGRAM_THREAD_ID,
      text: text
    }),
    muteHttpExceptions: true
  });
}
