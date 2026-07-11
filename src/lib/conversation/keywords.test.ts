import { describe, expect, it } from 'vitest';
import { detectKeywords, detectKeywordsInText, normalizeText } from './keywords';
import type { ConversationMessage } from './types';

describe('normalizeText', () => {
  it('カタカナをひらがなへ変換する', () => {
    expect(normalizeText('イジメ')).toBe('いじめ');
  });

  it('空白と全角英数を正規化する', () => {
    expect(normalizeText('いじめ られた')).toBe('いじめられた');
  });
});

describe('detectKeywordsInText', () => {
  it('部分一致で検出する（いじめられた）', () => {
    const result = detectKeywordsInText('きょう、いじめられた');
    expect(result.map((r) => r.category)).toContain('peer_relationship');
  });

  it('表記揺れ（カタカナ）でも検出する', () => {
    const result = detectKeywordsInText('ムシされた');
    expect(result.map((r) => r.category)).toContain('peer_relationship');
  });

  it('強い苦痛の可能性を検出する', () => {
    expect(
      detectKeywordsInText('消えたい').map((r) => r.category),
    ).toContain('strong_distress');
    expect(
      detectKeywordsInText('だれにもいえない').map((r) => r.category),
    ).toContain('strong_distress');
  });

  it('食事・睡眠のキーワードを検出する', () => {
    expect(
      detectKeywordsInText('よる、ねむれない').map((r) => r.category),
    ).toContain('food_sleep');
  });

  it('無関係な文章からは検出しない', () => {
    expect(detectKeywordsInText('きょうは晴れて気持ちよかった')).toHaveLength(0);
  });
});

describe('detectKeywords（会話全体）', () => {
  it('選択肢による回答はキーワード検出の対象にしない', () => {
    const messages: ConversationMessage[] = [
      {
        role: 'student',
        content: '友だちとのこと',
        questionType: 'event_type',
        viaChoice: true,
      },
    ];
    expect(detectKeywords(messages)).toHaveLength(0);
  });

  it('自由入力からは検出し、重複は除外する', () => {
    const messages: ConversationMessage[] = [
      { role: 'student', content: '無視された', questionType: 'reason' },
      { role: 'student', content: 'また無視された', questionType: 'feeling_detail' },
    ];
    const result = detectKeywords(messages);
    expect(result.filter((r) => r.keyword === '無視され')).toHaveLength(1);
  });
});
