import type { Category, Mood, QuestionType } from './types';

export const CHARACTER_NAME = 'きづきん';

/** きづきん（Kizuki マスコット）の表情イラスト。生徒が選んだ気持ちに合わせて切り替える */
export const CHARACTER_IMAGES: Record<Mood, string> = {
  ureshii: '/character/ureshii.png',
  kanashii: '/character/kanashii.png',
  futsuu: '/character/futsuu.png',
  okotteiru: '/character/okotteiru.png',
};

/** 気持ちが決まっていない場面（トップページ・気持ち選択前）で使うデフォルト表情 */
export const CHARACTER_DEFAULT_IMAGE = CHARACTER_IMAGES.futsuu;

/** 会話の最大往復数（気持ち選択は含まない） */
export const MAX_TURNS = 6;

export const MOODS: Record<
  Mood,
  { label: string; emoji: string; image: string; negative: boolean }
> = {
  ureshii: {
    label: 'うれしい',
    emoji: '😊',
    image: '/moods/ureshii.png',
    negative: false,
  },
  kanashii: {
    label: 'かなしい',
    emoji: '😥',
    image: '/moods/kanashii.png',
    negative: true,
  },
  futsuu: {
    label: 'ふつう',
    emoji: '😐',
    image: '/moods/futsuu.png',
    negative: false,
  },
  okotteiru: {
    label: 'おこっている',
    emoji: '😡',
    image: '/moods/okotteiru.png',
    negative: true,
  },
};

export const MOOD_LABEL_TO_KEY: Record<string, Mood> = Object.fromEntries(
  (Object.keys(MOODS) as Mood[]).map((k) => [MOODS[k].label, k]),
) as Record<string, Mood>;

/** 気持ちごとの最初の質問 */
export const INITIAL_QUESTIONS: Record<Mood, string> = {
  ureshii: '今日はうれしい気持ちなんだね。どんなことがあったの？',
  kanashii: '今日はかなしい気持ちなんだね。何かあったのかな？',
  futsuu: '今日はふつうの気持ちなんだね。今日はどんな一日だった？',
  okotteiru: '今日はおこっているんだね。何があったか話してみる？',
};

/* ---- 会話を無理に続けないための選択肢 ---- */
export const EXIT_TODAY = '今日はここまで';
export const EXIT_NO_TALK = '今は話したくない';
export const EXIT_CANT_VERBALIZE = 'うまく言葉にできない';
export const ANSWER_UNSURE = '自分でもよく分からない';
export const ANSWER_UNSURE_SHORT = 'よく分からない';

/** 自由入力の質問に常に添えるクイック選択肢 */
export const FREE_TEXT_QUICK_CHOICES = [
  EXIT_CANT_VERBALIZE,
  EXIT_NO_TALK,
  EXIT_TODAY,
];

/* ---- 選択式の質問 ---- */
export const EVENT_TYPE_CHOICES = [
  '友だちとのこと',
  '先生とのこと',
  '家族とのこと',
  '勉強のこと',
  '習い事のこと',
  '体の調子',
  'その他',
  ANSWER_UNSURE,
  EXIT_NO_TALK,
];

export const EVENT_TIME_CHOICES = [
  '今日',
  '昨日',
  '数日前',
  'もっと前',
  ANSWER_UNSURE_SHORT,
];

export const FEELING_NOW_CHOICES = [
  'まだ続いている',
  '少し落ち着いた',
  'もう大丈夫',
  ANSWER_UNSURE_SHORT,
];

export const CONSULTATION_CHOICES = [
  '担任の先生',
  '保健室の先生',
  'スクールカウンセラー',
  '家族',
  '友だち',
  EXIT_NO_TALK,
  'あとで考えたい',
];

/** 相談先のうち、学校の先生側に「相談希望」として通知される対象 */
export const SCHOOL_STAFF_TARGETS = [
  '担任の先生',
  '保健室の先生',
  'スクールカウンセラー',
];

/** 出来事の種類（選択肢）から参考カテゴリーへの対応 */
export const EVENT_TYPE_TO_CATEGORY: Record<string, Category> = {
  友だちとのこと: 'peer_relationship',
  先生とのこと: 'school_life',
  家族とのこと: 'family',
  勉強のこと: 'school_life',
  習い事のこと: 'other',
  体の調子: 'physical_condition',
  その他: 'other',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  peer_relationship: '友人関係',
  school_life: '学校生活',
  family: '家庭に関すること',
  food_sleep: '食事や睡眠',
  physical_condition: '身体的不調',
  strong_distress: '強い苦痛を示す可能性',
  other: 'その他',
};

/** 質問の順序（通常フロー） */
export const QUESTION_ORDER: QuestionType[] = [
  'reason',
  'event_type',
  'event_time',
  'feeling_detail',
  'feeling_now',
  'consultation',
];

export const SHARE_SCOPE_LABELS: Record<string, string> = {
  none: '先生には伝えない',
  mood_only: '気持ちだけ伝える',
  summary: '気持ちとまとめを伝える',
  full: 'お話をぜんぶ伝える',
};
