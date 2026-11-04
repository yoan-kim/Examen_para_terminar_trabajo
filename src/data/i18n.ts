export type AppLanguage = 'ko' | 'es';

export interface I18nStrings {
  appTitle: string;
  appSubtitle: string;
  ecuadorBadge: string;
  shortcutBtn: string;
  shortcutTooltip: string;
  langSwitchLabel: string;
  themeLight: string;
  themeDark: string;
  prevRound: string;
  nextRound: string;
  prevRoundTooltip: string;
  nextRoundTooltip: string;
  roundOptionLabel: (round: number) => string;
  roundSidebarTitle: string;
  roundBestScore: (score: number) => string;
  roundNoRecord: string;

  // Tabs
  tabSpeed: string;
  tabWrite: string;
  tabList: string;
  tabFocus: string;
  tabExam: string;

  // Study Card & Instructional Banners
  banner40Questions: string;
  bannerFocusQuiz: (count: number) => string;
  speedBadgeForward: string;
  speedBadgeReverse: string;
  writeBadgeForward: string;
  writeBadgeReverse: string;
  listenPronunciation: string;
  listenPronunciationTooltip: string;
  prevWordBtn: string;
  showAnswerBtn: string;
  hideAnswerBtn: string;
  answerRevealPrefix: string;
  choiceSelectHint: string;

  // Feedback
  correctTitle: string;
  wrongTitle: string;
  correctAnswerLabel: string;
  missingTildeWarning: string;
  moveToFocusLabel: string;
  moveToFocusTooltip: string;

  // Bonus Spelling in Speed Mode
  bonusSpellingTitle: string;
  bonusSpellingSkipTip: string;
  bonusSpellingPlaceholder: string;
  bonusConfirmBtn: string;
  bonusCorrectMsg: string;
  bonusWrongMsg: string;
  touchToReveal: string;
  touchToRevealTooltip: string;

  // Action Buttons
  retryBtn: string;
  nextQuestionBtn: string;
  checkAnswerBtn: string;
  writePlaceholderForward: string;
  writePlaceholderReverse: string;
  firstWordNotice: string;

  // Vocabulary List
  vocabListTitle: (round: number, count: number) => string;
  vocabAllRoundsTitle: (count: number) => string;
  searchPlaceholder: string;
  searchClearTooltip: string;
  searchScopeRound: string;
  searchScopeAll: string;
  maskTermShow: string;
  maskTermHide: string;
  maskDefShow: string;
  maskDefHide: string;
  noSearchResults: string;

  // Focus Study
  focusFolderTitle: string;
  focusCountText: (count: number) => string;
  clearAllFocusBtn: string;
  cancelClearBtn: string;
  clearFocusConfirm: string;
  focusEmptyTitle: string;
  focusEmptyDesc: string;
  focusSubTabList: string;
  focusSubTabSpeed: string;
  focusSubTabWrite: string;
  deleteWordTitle: string;
  roundBadgeText: (round: number) => string;

  // Exam
  examIntroTitle: (round: number) => string;
  examIntroSubtitle: string;
  examRuleRound1: string[];
  examRuleCumulative: (round: number) => string[];
  startExamBtn: string;
  examReviewLabel: (maxRound: number) => string;
  examCurrentLabel: (round: number) => string;
  examTypeWriteForward: string;
  examTypeWriteReverse: string;
  examTypeChoiceForward: string;
  examTypeChoiceReverse: string;
  submitExamBtn: string;
  examFinalScoreLabel: string;
  examPassBadge: string;
  examPassDesc: string;
  examFailBadge: string;
  examFailDesc: string;
  examReviewScoreTitle: string;
  examCurrentScoreTitle: string;
  examScoreUnit: (score: number, max: number) => string;
  examWrongNoteTitle: string;
  examPerfectMsg: string;
  examMyAnswerLabel: string;
  examNoAnswer: string;
  examRetakeBtn: string;

  // Shortcut Modal
  shortcutModalTitle: string;
  shortcutColKey: string;
  shortcutColDesc: string;
  shortcutCloseBtn: string;
  shortcutCloseTooltip: string;
  shortcutRows: { key: string; desc: string }[];
}

const KOREAN_STRINGS: I18nStrings = {
  appTitle: '스페인어 퇴근 단어 마스터',
  appSubtitle: '1회차부터 30회차까지 핵심 600단어 완전 정복',
  ecuadorBadge: '라틴아메리카 에콰도르 발음',
  shortcutBtn: '단축키 안내',
  shortcutTooltip: '키보드 단축키 안내 열기',
  langSwitchLabel: '언어 변경',
  themeLight: '밝은 화면으로 전환',
  themeDark: '어두운 화면으로 전환',
  prevRound: '이전',
  nextRound: '다음',
  prevRoundTooltip: '이전 회차로 이동 ([)',
  nextRoundTooltip: '다음 회차로 이동 (])',
  roundOptionLabel: (round) => `${round}회차 (20단어)`,
  roundSidebarTitle: '회차별 학습 현황',
  roundBestScore: (score) => `최고 ${score}점`,
  roundNoRecord: '미응시',

  tabSpeed: '스피드',
  tabWrite: '철자',
  tabList: '단어장',
  tabFocus: '집중공부',
  tabExam: '시험',

  banner40Questions:
    '💡 20단어에 대해 한➔스(20개), 스➔한(20개) 총 40문제가 제공됩니다.',
  bannerFocusQuiz: (count) =>
    `💡 집중공부 폴더에 저장된 ${count}개 단어로 구성된 맞춤형 반복 학습입니다.`,
  speedBadgeForward: '스피드 퀴즈 (한➔스)',
  speedBadgeReverse: '스피드 퀴즈 (스➔한)',
  writeBadgeForward: '철자 쓰기 (한➔스)',
  writeBadgeReverse: '한국어 뜻 쓰기 (스➔한)',
  listenPronunciation: '발음 듣기',
  listenPronunciationTooltip: '라틴아메리카 에콰도르 발음 듣기 (단축키: 0)',
  prevWordBtn: '이전',
  showAnswerBtn: '정답확인',
  hideAnswerBtn: '정답숨김',
  answerRevealPrefix: '정답:',
  choiceSelectHint: '선택',

  correctTitle: '정답입니다!',
  wrongTitle: '오답입니다!',
  correctAnswerLabel: '정답:',
  missingTildeWarning: '⚠️ 띨데(강세 부호)가 누락되었습니다!',
  moveToFocusLabel: '집중공부로 이동',
  moveToFocusTooltip: '집중공부 폴더에 추가/해제 (단축키: C)',

  bonusSpellingTitle: '보너스 철자 테스트 (가려진 스페인어 쓰기)',
  bonusSpellingSkipTip: '안 쓰고 바로 다음 버튼 눌러도 OK!',
  bonusSpellingPlaceholder: '스페인어 철자 입력 (1~7로 띨데 입력)',
  bonusConfirmBtn: '확인',
  bonusCorrectMsg: '완벽합니다! 철자 정답:',
  bonusWrongMsg: '정답:',
  touchToReveal: '터치하여 확인',
  touchToRevealTooltip: '클릭하여 가려진 단어 확인',

  retryBtn: '다시 풀기',
  nextQuestionBtn: '다음 문제 (Enter)',
  checkAnswerBtn: '정답 확인 (Enter)',
  writePlaceholderForward: '스페인어 철자 입력 (1~7로 띨데 입력 가능)',
  writePlaceholderReverse: '한국어 뜻 입력',
  firstWordNotice: '첫 번째 단어입니다.',

  vocabListTitle: (round, count) => `${round}회차 퇴근 단어 (${count}단어)`,
  vocabAllRoundsTitle: (count) => `전체 회차 검색 결과 (${count}단어)`,
  searchPlaceholder: '스페인어 단어 또는 한국어 뜻 검색...',
  searchClearTooltip: '검색어 지우기',
  searchScopeRound: '현재 회차',
  searchScopeAll: '전체 600단어',
  maskTermShow: '스페인어 보이기',
  maskTermHide: '스페인어 가리기',
  maskDefShow: '한국어 보이기',
  maskDefHide: '한국어 가리기',
  noSearchResults: '일치하는 단어가 없습니다.',

  focusFolderTitle: '내 집중공부 단어장',
  focusCountText: (count) => `(${count}개)`,
  clearAllFocusBtn: '전체 비우기',
  cancelClearBtn: '취소',
  clearFocusConfirm: '집중공부 폴더의 모든 단어를 비우시겠습니까?',
  focusEmptyTitle: '집중공부 폴더가 비어 있습니다.',
  focusEmptyDesc:
    '스피드, 철자 퀴즈나 시험 중 헷갈리는 단어에서 [집중공부로 이동 (C)] 체크박스를 눌러보세요!',
  focusSubTabList: '저장 목록',
  focusSubTabSpeed: '집중 스피드 퀴즈',
  focusSubTabWrite: '집중 철자 연습',
  deleteWordTitle: '보관함에서 삭제',
  roundBadgeText: (round) => `${round}회차`,

  examIntroTitle: (round) => `${round}회차 누적 실전 시험`,
  examIntroSubtitle:
    '80점 이상 달성 시 퇴근 가능! (시험 중 힌트·다시풀기 불가)',
  examRuleRound1: [
    '시험 범위: 1회차 전체 20단어 중 10문제 무작위 출제',
    '출제 구성: 쓰기(한⇄스) + 객관식(한⇄스) 양방향 혼합 출제',
    '배점 및 합격 기준: 문항당 10점 / 80점 이상 시 퇴근 가능!',
    '편법 방지: 실전 시험 중에는 힌트·이전단어·다시풀기가 금지됩니다.',
  ],
  examRuleCumulative: (round) => [
    `1단계 (누적 복습 10문항): 1~${round - 1}회차 누적 전체에서 무작위 10문제 추출`,
    `2단계 (금회차 본시험 10문항): ${round}회차 전체에서 무작위 10문제 추출`,
    '총 문항 수: 20문항 (문항당 5점 / 80점 이상 시 퇴근 가능!)',
    '편법 방지: 실전 시험 중에는 힌트·이전단어·다시풀기가 금지됩니다.',
  ],
  startExamBtn: '시험 시작하기',
  examReviewLabel: (maxRound) => `복습 (1~${maxRound}회차)`,
  examCurrentLabel: (round) => `본시험 (${round}회차)`,
  examTypeWriteForward: '스페인어 쓰기',
  examTypeWriteReverse: '한국어 뜻 쓰기',
  examTypeChoiceForward: '스페인어 고르기',
  examTypeChoiceReverse: '한국어 뜻 고르기',
  submitExamBtn: '답안 제출 (Enter)',
  examFinalScoreLabel: '최종 점수',
  examPassBadge: '칼퇴 확정! [퇴근 가능!]',
  examPassDesc:
    '오늘 분량 완벽 마스터! 가벼운 발걸음으로 즐겁게 퇴근하세요!',
  examFailBadge: '퇴근 불가! (야근 확정...)',
  examFailDesc:
    '기준 점수(80점) 미달! 책상 앞에 다시 앉아 오답 노트를 정복하세요.',
  examReviewScoreTitle: '누적 복습 (10문항)',
  examCurrentScoreTitle: '금회차 본시험 (10문항)',
  examScoreUnit: (score, max) => `${score} / ${max}점`,
  examWrongNoteTitle: '📝 오답 복습 노트 (체크 시 집중공부로 이동)',
  examPerfectMsg: '틀린 문제가 하나도 없습니다! 100점 만점!',
  examMyAnswerLabel: '내 답:',
  examNoAnswer: '(미입력)',
  examRetakeBtn: '다시 응시하기',

  shortcutModalTitle: '키보드 단축키 안내',
  shortcutColKey: '단축키',
  shortcutColDesc: '기능 설명',
  shortcutCloseBtn: '닫기 (Esc)',
  shortcutCloseTooltip: '단축키 안내 창 닫기 (Esc)',
  shortcutRows: [
    { key: '1 ~ 7', desc: '철자 입력 중: á, é, í, ó, ú, ñ, / 자동 입력' },
    { key: '1 ~ 4', desc: '스피드/시험 객관식: 1번~4번 보기 선택' },
    { key: 'Enter', desc: '정답 확인 / 채점 ➔ 다음 문제 진행' },
    { key: '8', desc: '직전 단어로 넘어가기 (스피드/철자 모드)' },
    { key: '9', desc: '다시 풀기 (스피드/철자 모드 즉시 리셋)' },
    { key: 'H', desc: '정답확인 (제출 전 정답 미리보기)' },
    { key: '0', desc: '원어민 발음 듣기 (라틴아메리카 에콰도르 발음)' },
    { key: 'C', desc: '집중공부 폴더 체크/해제' },
    { key: '[ / ]', desc: '이전 회차(◀) / 다음 회차(▶) 이동' },
    { key: 'Esc', desc: '모달 창 닫기' },
  ],
};

export const I18N: Record<AppLanguage, I18nStrings> = {
  ko: KOREAN_STRINGS,
  es: KOREAN_STRINGS,
};
