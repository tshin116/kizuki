import { CATEGORY_LABELS } from '../conversation/constants';
import type { Category, Mood } from '../conversation/types';

/**
 * 「サポートが必要かもしれない生徒」の判定ルール。
 * 数値や条件は後から変更しやすいよう、この定数にまとめて管理する。
 */
export const SUPPORT_RULES = {
  /** ネガティブとして扱う気持ち */
  negativeMoods: ['kanashii', 'okotteiru'] as Mood[],
  /** 😥😡がこの日数以上連続したら候補に表示 */
  consecutiveNegativeDays: 3,
  /** 直近1週間で😥😡がこの日数以上記録されたら候補に表示 */
  negativeDaysWithinWeek: 4,
  /** 「1週間」の定義（日数） */
  weekWindowDays: 7,
  /** 記録がこの日数以上途切れたら候補に表示 */
  missingEntryDays: 3,
  /** 記録途切れルールを適用する最低記録数（もともと記録していた生徒に限る） */
  minEntriesBeforeMissingRule: 3,
  /** 検出されたら候補に表示する参考カテゴリー */
  attentionCategories: [
    'strong_distress',
    'peer_relationship',
    'family',
    'food_sleep',
  ] as Category[],
  /** 連続日数などを評価する対象期間（日数） */
  lookbackDays: 14,
};

export type SupportRuleConfig = typeof SUPPORT_RULES;

/**
 * 判定への入力。共有範囲を尊重するため、先生に見えない情報は
 * 呼び出し側で除外・マスクして渡す。
 * - moodVisible: 共有範囲により先生が気持ちを見られるか
 * - categories: 共有範囲が summary / full の場合のみ値が入る
 */
export interface SupportInputEntry {
  date: string; // YYYY-MM-DD
  mood: Mood;
  moodVisible: boolean;
  categories: Category[];
  wantsConsultationToStaff: boolean;
  consultationTarget: string | null;
  wantsTeacherVoice: boolean;
}

export interface FiredRule {
  id:
    | 'consecutive_negative'
    | 'frequent_negative'
    | 'consultation_requested'
    | 'voice_requested'
    | 'category_detected'
    | 'missing_entries';
  label: string;
  detail: string;
}

function addDays(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function diffDays(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`).getTime();
  const to = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((to - from) / 86400000);
}

/**
 * サポート候補判定。発火したルールとその理由を返す。
 * 判定には「先生に共有されている情報」のみを使用する。
 */
export function evaluateSupportRules(
  entries: SupportInputEntry[],
  todayISO: string,
  config: SupportRuleConfig = SUPPORT_RULES,
): FiredRule[] {
  const fired: FiredRule[] = [];
  const visible = entries.filter((e) => e.moodVisible);
  const lookbackStart = addDays(todayISO, -config.lookbackDays);
  const weekStart = addDays(todayISO, -(config.weekWindowDays - 1));

  // 日付 → その日にネガティブな気持ちが記録されたか（対象期間内・共有分のみ）
  const negativeDates = new Set(
    visible
      .filter(
        (e) =>
          config.negativeMoods.includes(e.mood) && e.date >= lookbackStart,
      )
      .map((e) => e.date),
  );

  // --- ルール1: ネガティブな気持ちの連続日数 ---
  let maxRun = 0;
  let runEnd = '';
  for (const date of [...negativeDates].sort()) {
    let run = 1;
    let cursor = date;
    while (negativeDates.has(addDays(cursor, 1))) {
      cursor = addDays(cursor, 1);
      run++;
    }
    if (run > maxRun) {
      maxRun = run;
      runEnd = cursor;
    }
  }
  if (maxRun >= config.consecutiveNegativeDays) {
    fired.push({
      id: 'consecutive_negative',
      label: 'つらい気持ちの連続',
      detail: `😥😡の記録が${maxRun}日連続しています（${runEnd}まで）`,
    });
  }

  // --- ルール2: 直近1週間のネガティブ日数 ---
  const negativeInWeek = [...negativeDates].filter((d) => d >= weekStart);
  if (negativeInWeek.length >= config.negativeDaysWithinWeek) {
    fired.push({
      id: 'frequent_negative',
      label: 'つらい気持ちが多い',
      detail: `過去${config.weekWindowDays}日間で😥😡が${negativeInWeek.length}日記録されています`,
    });
  }

  // --- ルール3: 先生への相談希望 ---
  const consultEntries = entries.filter(
    (e) => e.wantsConsultationToStaff && e.date >= weekStart,
  );
  if (consultEntries.length > 0) {
    const latest = consultEntries[consultEntries.length - 1];
    fired.push({
      id: 'consultation_requested',
      label: '相談希望あり',
      detail: `生徒本人が${latest.consultationTarget ?? '先生'}への相談を希望しています（${latest.date}）`,
    });
  }

  // --- ルール4: 先生からの声かけ希望 ---
  const voiceEntries = entries.filter(
    (e) => e.wantsTeacherVoice && e.date >= weekStart,
  );
  if (voiceEntries.length > 0) {
    fired.push({
      id: 'voice_requested',
      label: '声かけ希望あり',
      detail: `生徒本人が先生からの声かけを希望しています（${voiceEntries[voiceEntries.length - 1].date}）`,
    });
  }

  // --- ルール5: 共有された会話からの気になるカテゴリー ---
  const categorySet = new Set<Category>();
  for (const e of entries) {
    if (e.date < weekStart) continue;
    for (const c of e.categories) {
      if (config.attentionCategories.includes(c)) categorySet.add(c);
    }
  }
  if (categorySet.size > 0) {
    fired.push({
      id: 'category_detected',
      label: '気になる話題',
      detail: `共有された会話から「${[...categorySet]
        .map((c) => CATEGORY_LABELS[c])
        .join('、')}」に関する話題が見られます`,
    });
  }

  // --- ルール6: 記録の途切れ ---
  if (visible.length >= config.minEntriesBeforeMissingRule) {
    const lastDate = visible.map((e) => e.date).sort().at(-1)!;
    const gap = diffDays(lastDate, todayISO);
    if (gap >= config.missingEntryDays) {
      fired.push({
        id: 'missing_entries',
        label: '記録が途切れています',
        detail: `それまで記録を続けていましたが、最後の記録（${lastDate}）から${gap}日間入力がありません`,
      });
    }
  }

  return fired;
}
