import { NextResponse } from 'next/server';
import {
  getConversationService,
  RuleBasedConversationService,
} from '@/lib/conversation';
import {
  CONSULTATION_CHOICES,
  MOODS,
  SCHOOL_STAFF_TARGETS,
} from '@/lib/conversation/constants';
import type {
  AnalysisResult,
  ConversationDebugInfo,
  ConversationMessage,
  Mood,
  QuestionType,
  ShareScope,
} from '@/lib/conversation/types';
import { toLocalISODate } from '@/lib/date';
import { getStudent, insertEntry } from '@/lib/db/repository';

const SHARE_SCOPES: ShareScope[] = ['none', 'mood_only', 'summary', 'full'];

interface SaveEntryBody {
  studentId?: string;
  mood?: string;
  messages?: ConversationMessage[];
  shareScope?: string;
  wantsTeacherVoice?: boolean;
  /** 開発用モードで収集した各ターンのデバッグ情報（任意） */
  turnDebug?: ConversationDebugInfo[];
}

/** 会話終了後の記録保存。要約・カテゴリー検出はサーバー側で行う。 */
export async function POST(req: Request) {
  let body: SaveEntryBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const mood = body.mood as Mood | undefined;
  const shareScope = body.shareScope as ShareScope | undefined;
  const messages = Array.isArray(body.messages) ? body.messages : [];

  if (!body.studentId || !getStudent(body.studentId)) {
    return NextResponse.json({ error: 'unknown_student' }, { status: 400 });
  }
  if (!mood || !MOODS[mood]) {
    return NextResponse.json({ error: 'invalid_mood' }, { status: 400 });
  }
  if (!shareScope || !SHARE_SCOPES.includes(shareScope)) {
    return NextResponse.json({ error: 'invalid_share_scope' }, { status: 400 });
  }

  // 相談先は会話の中での回答から取得する（クライアントの別入力を信用しない）
  const consultationAnswer = [...messages]
    .reverse()
    .find(
      (m) => m.role === 'student' && m.questionType === 'consultation',
    )?.content;
  const wantsConsultation =
    consultationAnswer !== undefined &&
    CONSULTATION_CHOICES.includes(consultationAnswer) &&
    consultationAnswer !== '今は話したくない' &&
    consultationAnswer !== 'あとで考えたい';
  const consultationTarget = wantsConsultation ? consultationAnswer : null;

  let analysis: AnalysisResult;
  try {
    analysis = await getConversationService().analyzeConversation(messages);
  } catch {
    analysis = await new RuleBasedConversationService().analyzeConversation(
      messages,
    );
  }

  const questionPath = messages
    .filter((m) => m.role === 'character' && m.questionType)
    .map((m) => m.questionType as QuestionType);

  const turnDebug = Array.isArray(body.turnDebug) ? body.turnDebug : [];
  const consultationTrigger =
    turnDebug.find((t) => t.consultationTrigger)?.consultationTrigger ??
    (questionPath.includes('consultation') ? 'reached_normally' : null);

  const entryId = insertEntry({
    studentId: body.studentId,
    date: toLocalISODate(),
    mood,
    shareScope,
    wantsConsultation,
    consultationTarget,
    wantsTeacherVoice: body.wantsTeacherVoice === true,
    summary: analysis.summary,
    categories: analysis.categories,
    detectedKeywords: analysis.detectedKeywords,
    debugInfo: {
      turns: turnDebug,
      questionPath,
      consultationTrigger,
      facts: analysis.facts,
    },
    messages,
  });

  return NextResponse.json({
    entryId,
    consultationSharedWithTeacher:
      consultationTarget !== null &&
      SCHOOL_STAFF_TARGETS.includes(consultationTarget),
  });
}
