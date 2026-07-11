import { describe, expect, it } from 'vitest';
import { shouldUseAiRewrite } from './ai-service';

describe('shouldUseAiRewrite（Phase 2 の書き換え許可範囲）', () => {
  it('初回質問と通常フローの分岐は書き換えを許可する', () => {
    expect(shouldUseAiRewrite('initial')).toBe(true);
    expect(shouldUseAiRewrite('normal:reason->event_type')).toBe(true);
    expect(shouldUseAiRewrite('normal:feeling_now->consultation')).toBe(true);
  });

  it('会話終了・相談・強い苦痛検出などの安全に関わる分岐は書き換えを許可しない', () => {
    expect(shouldUseAiRewrite('exit:today')).toBe(false);
    expect(shouldUseAiRewrite('exit:no_talk')).toBe(false);
    expect(shouldUseAiRewrite('distress_detected')).toBe(false);
    expect(shouldUseAiRewrite('consultation:担任の先生')).toBe(false);
    expect(shouldUseAiRewrite('max_turns')).toBe(false);
    expect(shouldUseAiRewrite('unsure:reason->feeling_now')).toBe(false);
    expect(shouldUseAiRewrite('cant_verbalize:reason->event_type')).toBe(false);
    expect(shouldUseAiRewrite('fallback:unknown_state')).toBe(false);
  });
});
