import { z } from 'zod';

/**
 * Phase 2：生成AIからの構造化出力のスキーマ検証。
 * 不正な形式・禁止表現を含む出力は表示せず、安全な固定メッセージへ置き換える。
 */

export const AI_REPLY_MAX_LENGTH = 200;

export const aiOutputSchema = z.object({
  reply: z.string().min(1).max(AI_REPLY_MAX_LENGTH),
  questionType: z.enum([
    'reason',
    'event_type',
    'event_time',
    'feeling_detail',
    'feeling_now',
    'consultation',
    'closing',
  ]),
  shouldContinue: z.boolean(),
  suggestConsultation: z.boolean(),
  categories: z
    .array(
      z.enum([
        'peer_relationship',
        'school_life',
        'family',
        'food_sleep',
        'physical_condition',
        'strong_distress',
        'other',
      ]),
    )
    .default([]),
  summaryDraft: z.string().default(''),
});

export type AiOutput = z.infer<typeof aiOutputSchema>;

/** 子どもに表示してはいけない表現（AI出力の検査に使用） */
export const FORBIDDEN_EXPRESSIONS = [
  '絶対に大丈夫',
  '絶対大丈夫',
  '絶対に秘密',
  '必ず秘密',
  '秘密にするから',
  '診断',
  '病気です',
  'うつ病',
  '障害があります',
  'あなたが悪い',
  '相談しなさい',
  '話しなさい',
];

export const SAFE_FALLBACK_REPLY =
  'そうなんだね。よかったら、もう少しお話きかせてね。';

export interface AiOutputCheckResult {
  ok: boolean;
  value: AiOutput | null;
  reason: string | null;
}

/** 禁止表現が含まれていれば、その表現を返す（含まれていなければ null） */
export function containsForbiddenExpression(text: string): string | null {
  return FORBIDDEN_EXPRESSIONS.find((f) => text.includes(f)) ?? null;
}

/**
 * AI出力の検証。
 * 1. JSONとしてパースできるか
 * 2. スキーマに適合するか
 * 3. 禁止表現を含まないか
 */
export function validateAiOutput(raw: string): AiOutputCheckResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, value: null, reason: 'invalid_json' };
  }

  const result = aiOutputSchema.safeParse(parsed);
  if (!result.success) {
    return { ok: false, value: null, reason: 'schema_mismatch' };
  }

  const forbidden = containsForbiddenExpression(result.data.reply);
  if (forbidden) {
    return { ok: false, value: null, reason: `forbidden:${forbidden}` };
  }

  return { ok: true, value: result.data, reason: null };
}
