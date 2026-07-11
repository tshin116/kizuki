import { describe, expect, it } from 'vitest';
import { RuleBasedConversationAnalyzer } from './analyzer';
import type { ConversationMessage } from './types';

const analyzer = new RuleBasedConversationAnalyzer();

function fullConversation(): ConversationMessage[] {
  return [
    { role: 'student', content: 'かなしい', questionType: 'mood_select', viaChoice: true },
    { role: 'character', content: '今日はかなしい気持ちなんだね。何かあったのかな？', questionType: 'reason' },
    { role: 'student', content: '友だちにいやなことを言われた', questionType: 'reason' },
    { role: 'character', content: 'そのお話は、どれにいちばん近いかな？', questionType: 'event_type' },
    { role: 'student', content: '友だちとのこと', questionType: 'event_type', viaChoice: true },
    { role: 'character', content: 'それは、いつ頃あったの？', questionType: 'event_time' },
    { role: 'student', content: '今日', questionType: 'event_time', viaChoice: true },
    { role: 'character', content: '今も、その気持ちは続いている？', questionType: 'feeling_now' },
    { role: 'student', content: '少し落ち着いた', questionType: 'feeling_now', viaChoice: true },
    { role: 'character', content: 'このお話、誰かに話してみたい？', questionType: 'consultation' },
    { role: 'student', content: '担任の先生', questionType: 'consultation', viaChoice: true },
  ];
}

describe('RuleBasedConversationAnalyzer', () => {
  it('取得できた事実だけで要約を作成する', () => {
    const { summary } = analyzer.analyze(fullConversation());
    expect(summary).toContain('『かなしい』を選択しました');
    expect(summary).toContain('友だちとの出来事について話しています');
    expect(summary).toContain('その出来事は今日あったと回答しています');
    expect(summary).toContain('気持ちが少し落ち着いてきたと回答しています');
    expect(summary).toContain('担任の先生への相談を希望しています');
  });

  it('情報がない項目は要約に含めず、推測で補わない', () => {
    const messages: ConversationMessage[] = [
      { role: 'student', content: 'かなしい', questionType: 'mood_select', viaChoice: true },
      { role: 'character', content: '何かあったのかな？', questionType: 'reason' },
      { role: 'student', content: '今は話したくない', questionType: 'reason', viaChoice: true },
    ];
    const { summary } = analyzer.analyze(messages);
    expect(summary).toContain('『かなしい』を選択しました');
    expect(summary).toContain('途中で会話を終えることを選びました');
    // 断定・推測の表現が含まれないこと
    expect(summary).not.toContain('いじめ');
    expect(summary).not.toContain('可能性が高い');
    expect(summary).not.toContain('出来事');
  });

  it('キーワードと選択肢の両方から参考カテゴリーを抽出する', () => {
    const messages = fullConversation();
    messages[2] = {
      role: 'student',
      content: 'グループのみんなに無視された',
      questionType: 'reason',
    };
    const { categories, detectedKeywords } = analyzer.analyze(messages);
    expect(categories).toContain('peer_relationship');
    expect(detectedKeywords.map((k) => k.keyword)).toContain('無視され');
  });

  it('会話情報がない場合は固定文を返す', () => {
    const { summary } = analyzer.analyze([]);
    expect(summary).toBe(
      '生徒は今日の記録を行いましたが、会話からの情報はありません。',
    );
  });
});
