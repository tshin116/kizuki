import { describe, expect, it } from 'vitest';
import { INITIAL_QUESTIONS } from './constants';
import { RuleBasedConversationService } from './rule-based-service';
import type {
  ConversationMessage,
  ConversationResponse,
  Mood,
} from './types';

const service = new RuleBasedConversationService();

function start(mood: Mood): {
  messages: ConversationMessage[];
  response: ConversationResponse;
} {
  const messages: ConversationMessage[] = [
    { role: 'student', content: mood, questionType: 'mood_select', viaChoice: true },
  ];
  const response = service.computeNextResponse({ mood, messages });
  messages.push({
    role: 'character',
    content: response.reply,
    questionType: response.questionType,
  });
  return { messages, response };
}

function reply(
  state: { messages: ConversationMessage[]; response: ConversationResponse },
  mood: Mood,
  content: string,
  viaChoice = true,
) {
  state.messages.push({
    role: 'student',
    content,
    questionType: state.response.questionType,
    viaChoice,
  });
  state.response = service.computeNextResponse({ mood, messages: state.messages });
  state.messages.push({
    role: 'character',
    content: state.response.reply,
    questionType: state.response.questionType,
  });
  return state.response;
}

describe('RuleBasedConversationService', () => {
  it('気持ちごとに定められた最初の質問を返す', () => {
    for (const mood of ['ureshii', 'kanashii', 'futsuu', 'okotteiru'] as Mood[]) {
      const { response } = start(mood);
      expect(response.reply).toBe(INITIAL_QUESTIONS[mood]);
      expect(response.questionType).toBe('reason');
      expect(response.allowText).toBe(true);
    }
  });

  it('通常フローで6つの質問を順に通り、6往復以内に終わる', () => {
    const state = start('kanashii');
    const path = [state.response.questionType];

    reply(state, 'kanashii', 'いやなことがあった', false);
    path.push(state.response.questionType);
    reply(state, 'kanashii', '友だちとのこと');
    path.push(state.response.questionType);
    reply(state, 'kanashii', '今日');
    path.push(state.response.questionType);
    reply(state, 'kanashii', 'かなしかった', false);
    path.push(state.response.questionType);
    reply(state, 'kanashii', 'まだ続いている');
    path.push(state.response.questionType);
    reply(state, 'kanashii', '担任の先生');
    path.push(state.response.questionType);

    expect(path).toEqual([
      'reason',
      'event_type',
      'event_time',
      'feeling_detail',
      'feeling_now',
      'consultation',
      'closing',
    ]);
    expect(state.response.isEnd).toBe(true);
    const studentTurns = state.messages.filter(
      (m) => m.role === 'student' && m.questionType !== 'mood_select',
    ).length;
    expect(studentTurns).toBeLessThanOrEqual(6);
  });

  it('「今日はここまで」で即座に会話を終了する', () => {
    const state = start('futsuu');
    reply(state, 'futsuu', '今日はここまで');
    expect(state.response.isEnd).toBe(true);
    expect(state.response.questionType).toBe('closing');
  });

  it('「今は話したくない」で無理に質問を続けない', () => {
    const state = start('okotteiru');
    reply(state, 'okotteiru', '今は話したくない');
    expect(state.response.isEnd).toBe(true);
  });

  it('「自分でもよく分からない」では時期や詳細を聞かず先へ進む', () => {
    const state = start('kanashii');
    reply(state, 'kanashii', 'なんかいやだった', false);
    reply(state, 'kanashii', '自分でもよく分からない');
    expect(state.response.questionType).toBe('feeling_now');
  });

  it('強い苦痛のキーワードを検出したら、やさしく相談へつなぐ', () => {
    const state = start('kanashii');
    const res = reply(state, 'kanashii', 'ずっとつらい。消えたい', false);
    expect(res.questionType).toBe('consultation');
    expect(res.suggestConsultation).toBe(true);
    expect(res.debug?.consultationTrigger).toBe('distress_detected');
  });

  it('相談質問で「今は話したくない」を選んでも受け入れて終了する', () => {
    const state = start('kanashii');
    reply(state, 'kanashii', 'ずっとつらい', false); // → 相談へ
    reply(state, 'kanashii', '今は話したくない');
    expect(state.response.isEnd).toBe(true);
    expect(state.response.reply).toContain('いつでも');
  });

  it('デバッグ情報に分岐が記録される', () => {
    const state = start('kanashii');
    reply(state, 'kanashii', 'いやなことがあった', false);
    expect(state.response.debug?.branch).toBe('normal:reason->event_type');
  });
});
