import { NextResponse } from 'next/server';
import { MOODS } from '@/lib/conversation/constants';
import {
  getConversationService,
  RuleBasedConversationService,
} from '@/lib/conversation';
import type {
  ConversationMessage,
  ConversationResponse,
  Mood,
} from '@/lib/conversation/types';
import { isDebugEnabled } from '@/lib/debug';

const MAX_MESSAGES = 40;
const MAX_CONTENT_LENGTH = 300;

/** 会話を1往復進める。会話の状態はクライアントが保持し、毎回全履歴を送る。 */
export async function POST(req: Request) {
  let body: { mood?: string; messages?: ConversationMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const mood = body.mood as Mood | undefined;
  if (!mood || !MOODS[mood]) {
    return NextResponse.json({ error: 'invalid_mood' }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'too_many_messages' }, { status: 400 });
  }
  for (const m of messages) {
    if (
      typeof m.content !== 'string' ||
      m.content.length > MAX_CONTENT_LENGTH ||
      (m.role !== 'character' && m.role !== 'student')
    ) {
      return NextResponse.json({ error: 'invalid_message' }, { status: 400 });
    }
  }

  let response: ConversationResponse;
  try {
    response = await getConversationService().getNextResponse({
      mood,
      messages,
    });
  } catch {
    // 生成AI版でエラーが起きた場合もルールベースで会話を継続する
    response = await new RuleBasedConversationService().getNextResponse({
      mood,
      messages,
    });
  }

  // 内部的な判定情報は開発用モードでのみ返す
  if (!isDebugEnabled()) {
    delete response.debug;
  }

  return NextResponse.json(response);
}
