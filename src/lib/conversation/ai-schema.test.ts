import { describe, expect, it } from 'vitest';
import { validateAiOutput } from './ai-schema';

const validOutput = JSON.stringify({
  reply: 'そうだったんだね。そのとき、どんな気持ちだった？',
  questionType: 'feeling_detail',
  shouldContinue: true,
  suggestConsultation: false,
  categories: ['peer_relationship'],
  summaryDraft: '',
});

describe('validateAiOutput（Phase 2 用）', () => {
  it('正しい構造化出力を受け入れる', () => {
    const result = validateAiOutput(validOutput);
    expect(result.ok).toBe(true);
    expect(result.value?.questionType).toBe('feeling_detail');
  });

  it('JSONでない出力を拒否する', () => {
    expect(validateAiOutput('こんにちは！').ok).toBe(false);
  });

  it('スキーマに合わない出力を拒否する', () => {
    const bad = JSON.stringify({ reply: 'やあ', questionType: 'invalid' });
    expect(validateAiOutput(bad).ok).toBe(false);
  });

  it('禁止表現を含む出力を拒否する', () => {
    const forbidden = JSON.stringify({
      reply: '絶対に大丈夫だよ。秘密にするからね。',
      questionType: 'closing',
      shouldContinue: false,
      suggestConsultation: false,
      categories: [],
      summaryDraft: '',
    });
    const result = validateAiOutput(forbidden);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('forbidden');
  });
});
