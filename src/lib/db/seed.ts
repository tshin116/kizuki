/**
 * デモ用データ投入スクリプト。
 *   npm run seed
 *
 * サポート候補判定の各ルールが確認できるよう、
 * 状況の異なる6名の生徒を作成する。
 */
import { RuleBasedConversationAnalyzer } from '../conversation/analyzer';
import { INITIAL_QUESTIONS, MOODS } from '../conversation/constants';
import type {
  ConversationMessage,
  Mood,
  ShareScope,
} from '../conversation/types';
import { addDaysISO, toLocalISODate } from '../date';
import { clearAll, insertEntry, insertStudent } from './repository';

const analyzer = new RuleBasedConversationAnalyzer();
const today = toLocalISODate();

interface SeedConversation {
  reason?: string;
  eventType?: string;
  eventTime?: string;
  feelingDetail?: string;
  feelingNow?: string;
  consultation?: string;
}

/** 通常フローに沿った会話メッセージ列を組み立てる */
function buildMessages(mood: Mood, conv: SeedConversation): ConversationMessage[] {
  const m: ConversationMessage[] = [
    { role: 'student', content: MOODS[mood].label, questionType: 'mood_select', viaChoice: true },
    { role: 'character', content: INITIAL_QUESTIONS[mood], questionType: 'reason' },
  ];
  if (conv.reason !== undefined) {
    m.push({ role: 'student', content: conv.reason, questionType: 'reason' });
  }
  if (conv.eventType !== undefined) {
    m.push({ role: 'character', content: 'そのお話は、どれにいちばん近いかな？', questionType: 'event_type' });
    m.push({ role: 'student', content: conv.eventType, questionType: 'event_type', viaChoice: true });
  }
  if (conv.eventTime !== undefined) {
    m.push({ role: 'character', content: 'それは、いつ頃あったの？', questionType: 'event_time' });
    m.push({ role: 'student', content: conv.eventTime, questionType: 'event_time', viaChoice: true });
  }
  if (conv.feelingDetail !== undefined) {
    m.push({ role: 'character', content: 'そのとき、どんな気持ちだった？', questionType: 'feeling_detail' });
    m.push({ role: 'student', content: conv.feelingDetail, questionType: 'feeling_detail' });
  }
  if (conv.feelingNow !== undefined) {
    m.push({ role: 'character', content: '今も、その気持ちは続いている？', questionType: 'feeling_now' });
    m.push({ role: 'student', content: conv.feelingNow, questionType: 'feeling_now', viaChoice: true });
  }
  if (conv.consultation !== undefined) {
    m.push({ role: 'character', content: 'このお話、誰かに話してみたい？', questionType: 'consultation' });
    m.push({ role: 'student', content: conv.consultation, questionType: 'consultation', viaChoice: true });
  }
  m.push({ role: 'character', content: '今日はお話ししてくれてありがとう。', questionType: 'closing' });
  return m;
}

function seedEntry(opts: {
  studentId: string;
  daysAgo: number;
  mood: Mood;
  shareScope: ShareScope;
  conv?: SeedConversation;
  wantsTeacherVoice?: boolean;
}) {
  const conv = opts.conv ?? {};
  const messages = buildMessages(opts.mood, conv);
  const analysis = analyzer.analyze(messages);
  const target = conv.consultation;
  const wantsConsultation =
    target !== undefined && target !== '今は話したくない' && target !== 'あとで考えたい';
  const date = addDaysISO(today, -opts.daysAgo);

  insertEntry({
    studentId: opts.studentId,
    date,
    mood: opts.mood,
    shareScope: opts.shareScope,
    wantsConsultation,
    consultationTarget: wantsConsultation ? (target ?? null) : null,
    wantsTeacherVoice: opts.wantsTeacherVoice ?? false,
    summary: analysis.summary,
    categories: analysis.categories,
    detectedKeywords: analysis.detectedKeywords,
    debugInfo: {
      turns: [],
      questionPath: messages
        .filter((m) => m.role === 'character')
        .map((m) => m.questionType!)
        .filter(Boolean),
      consultationTrigger: conv.consultation !== undefined ? 'reached_normally' : null,
      facts: analysis.facts,
    },
    messages,
    createdAt: new Date(`${date}T16:00:00`).toISOString(),
  });
}

function main() {
  clearAll();

  // --- さくら: 😥が3日連続 + 友人関係の話題 + 担任へ相談希望 ---
  insertStudent({ id: 's-sakura', name: 'さくら', grade: '5年2組' });
  seedEntry({ studentId: 's-sakura', daysAgo: 5, mood: 'futsuu', shareScope: 'mood_only' });
  seedEntry({ studentId: 's-sakura', daysAgo: 4, mood: 'futsuu', shareScope: 'mood_only' });
  seedEntry({
    studentId: 's-sakura', daysAgo: 2, mood: 'kanashii', shareScope: 'mood_only',
    conv: { reason: '友だちにへんなこと言われた', eventType: '友だちとのこと', eventTime: '今日', feelingNow: 'まだ続いている', consultation: 'あとで考えたい' },
  });
  seedEntry({
    studentId: 's-sakura', daysAgo: 1, mood: 'kanashii', shareScope: 'summary',
    conv: { reason: 'きょうも同じことがあった', eventType: '友だちとのこと', eventTime: '今日', feelingNow: 'まだ続いている', consultation: 'あとで考えたい' },
  });
  seedEntry({
    studentId: 's-sakura', daysAgo: 0, mood: 'kanashii', shareScope: 'summary',
    conv: { reason: 'グループのみんなに無視された', eventType: '友だちとのこと', eventTime: '今日', feelingDetail: 'かなしくて、ちょっと怖い', feelingNow: 'まだ続いている', consultation: '担任の先生' },
  });

  // --- たろう: おおむね元気、昨日けんかして保健室の先生へ相談希望 ---
  insertStudent({ id: 's-taro', name: 'たろう', grade: '5年2組' });
  seedEntry({ studentId: 's-taro', daysAgo: 4, mood: 'ureshii', shareScope: 'mood_only' });
  seedEntry({ studentId: 's-taro', daysAgo: 3, mood: 'futsuu', shareScope: 'mood_only' });
  seedEntry({ studentId: 's-taro', daysAgo: 2, mood: 'ureshii', shareScope: 'mood_only' });
  seedEntry({
    studentId: 's-taro', daysAgo: 1, mood: 'okotteiru', shareScope: 'full',
    conv: { reason: '休み時間に友だちとけんかした', eventType: '友だちとのこと', eventTime: '今日', feelingDetail: 'くやしかった', feelingNow: '少し落ち着いた', consultation: '保健室の先生' },
  });
  seedEntry({ studentId: 's-taro', daysAgo: 0, mood: 'futsuu', shareScope: 'mood_only' });

  // --- ゆい: 記録を続けていたが4日前から途切れている ---
  insertStudent({ id: 's-yui', name: 'ゆい', grade: '5年2組' });
  for (const [daysAgo, mood] of [
    [10, 'futsuu'], [9, 'ureshii'], [8, 'futsuu'], [7, 'futsuu'],
    [6, 'kanashii'], [5, 'futsuu'], [4, 'futsuu'],
  ] as [number, Mood][]) {
    seedEntry({ studentId: 's-yui', daysAgo, mood, shareScope: 'mood_only' });
  }

  // --- けんた: 直近1週間で😥😡が4日（連続はしていない） ---
  insertStudent({ id: 's-kenta', name: 'けんた', grade: '5年2組' });
  seedEntry({ studentId: 's-kenta', daysAgo: 6, mood: 'okotteiru', shareScope: 'mood_only' });
  seedEntry({ studentId: 's-kenta', daysAgo: 5, mood: 'futsuu', shareScope: 'mood_only' });
  seedEntry({
    studentId: 's-kenta', daysAgo: 4, mood: 'kanashii', shareScope: 'mood_only',
    conv: { reason: '今は話したくない' },
  });
  seedEntry({ studentId: 's-kenta', daysAgo: 3, mood: 'futsuu', shareScope: 'mood_only' });
  seedEntry({ studentId: 's-kenta', daysAgo: 2, mood: 'okotteiru', shareScope: 'mood_only' });
  seedEntry({
    studentId: 's-kenta', daysAgo: 0, mood: 'kanashii', shareScope: 'mood_only',
    conv: { reason: 'うまく言葉にできない', feelingNow: 'よく分からない', consultation: '今は話したくない' },
  });

  // --- みお: 元気に記録を継続（サポート候補に出ないことの確認用） ---
  insertStudent({ id: 's-mio', name: 'みお', grade: '5年2組' });
  for (const [daysAgo, mood] of [
    [4, 'ureshii'], [3, 'futsuu'], [2, 'ureshii'], [1, 'ureshii'], [0, 'futsuu'],
  ] as [number, Mood][]) {
    seedEntry({ studentId: 's-mio', daysAgo, mood, shareScope: 'mood_only' });
  }
  seedEntry({
    studentId: 's-mio', daysAgo: 0, mood: 'ureshii', shareScope: 'summary',
    conv: { reason: 'リレーの選手にえらばれた', eventType: 'その他', eventTime: '今日', feelingNow: 'まだ続いている', consultation: '家族' },
  });

  // --- だいち: 今日の記録は共有しない（非共有情報の扱い確認用） ---
  insertStudent({ id: 's-daichi', name: 'だいち', grade: '5年2組' });
  seedEntry({ studentId: 's-daichi', daysAgo: 3, mood: 'futsuu', shareScope: 'mood_only' });
  seedEntry({ studentId: 's-daichi', daysAgo: 2, mood: 'futsuu', shareScope: 'mood_only' });
  seedEntry({
    studentId: 's-daichi', daysAgo: 0, mood: 'kanashii', shareScope: 'none',
    conv: { reason: '学校に行きたくない', eventType: '勉強のこと', eventTime: '数日前', feelingNow: 'まだ続いている', consultation: '今は話したくない' },
  });

  console.log('シードデータを投入しました。');
  console.log(`基準日: ${today}`);
}

main();
