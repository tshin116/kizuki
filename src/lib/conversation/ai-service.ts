import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { getClaudeClient, getClaudeModel } from './claude-client';
import { CHILD_SUPPORT_SYSTEM_PROMPT } from './prompts/child-support-system-prompt';
import { AI_REPLY_MAX_LENGTH, aiOutputSchema, containsForbiddenExpression } from './ai-schema';
import { RuleBasedConversationService } from './rule-based-service';
import type {
  AnalysisResult,
  ConversationContext,
  ConversationMessage,
  ConversationResponse,
  ConversationService,
  ConversationSummary,
  QuestionType,
} from './types';

/**
 * Phase 2：生成AI（Claude API）を利用する会話サービス。
 *
 * 会話の制御（最大会話回数・終了条件・「今日はここまで」の扱い・強い苦痛の
 * 検出・相談質問への遷移・選択肢の内容）は、常に RuleBasedConversationService
 * が決定する。生成AIが担当するのは、次にする質問が決まったあとの
 * 「reply（返答の文面）」を、より自然でやさしい言葉に書き換えることだけ。
 * これにより、生成AIがシステム全体の権限判定や共有範囲の判断・会話終了条件を
 * 変更することはできない。
 *
 * APIキー未設定時・API呼び出し失敗時・出力がスキーマ/禁止表現チェックに
 * 通らない場合は、すべてルールベースの文面へフォールバックする。
 */

/**
 * ルールベースの分岐のうち、生成AIによる文面の書き換えを許可するもの。
 * 終了・相談への遷移・強い苦痛検出時の応答など、安全に関わる固定文言は
 * 対象外とし、常にルールベースの文面のまま返す。
 */
export function shouldUseAiRewrite(branch: string): boolean {
  return branch === 'initial' || branch.startsWith('normal:');
}

function toAnthropicMessages(
  messages: ConversationMessage[],
): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter((m) => m.questionType !== 'mood_select')
    .map((m) => ({
      role: m.role === 'character' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    }));
}

export class AIConversationService implements ConversationService {
  private fallback = new RuleBasedConversationService();

  private hasApiKey(): boolean {
    return Boolean(process.env.AI_API_KEY);
  }

  async getNextResponse(
    context: ConversationContext,
  ): Promise<ConversationResponse> {
    const ruleResponse = this.fallback.computeNextResponse(context);

    if (
      !this.hasApiKey() ||
      !ruleResponse.debug ||
      !shouldUseAiRewrite(ruleResponse.debug.branch)
    ) {
      return ruleResponse;
    }

    const aiReply = await this.generateReply(
      context,
      ruleResponse.questionType,
    ).catch(() => null);

    if (!aiReply) return ruleResponse;

    return {
      ...ruleResponse,
      reply: aiReply,
      debug: { ...ruleResponse.debug, branch: `${ruleResponse.debug.branch}+ai` },
    };
  }

  /**
   * Claude API を呼び出し、次の質問（questionType は固定で指定）にふさわしい
   * 短い返答文を生成する。検証に失敗した場合は null を返し、呼び出し元で
   * ルールベースの文面にフォールバックさせる。
   */
  private async generateReply(
    context: ConversationContext,
    targetQuestionType: QuestionType,
  ): Promise<string | null> {
    const client = getClaudeClient();
    const history = toAnthropicMessages(context.messages);
    const instruction =
      `次に生徒にする質問の種類は "${targetQuestionType}" です。` +
      'この種類の質問を1つだけ、子どもに寄り添うやさしい短い言葉でしてください。';

    const response = await client.messages.parse({
      model: getClaudeModel(),
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      system: CHILD_SUPPORT_SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(aiOutputSchema) },
      messages: [...history, { role: 'user', content: instruction }],
    });

    const parsed = response.parsed_output;
    if (!parsed) return null;
    // 質問の種類はアプリ側が決定した値と一致する場合のみ信用する
    if (parsed.questionType !== targetQuestionType) return null;
    if (parsed.reply.length === 0 || parsed.reply.length > AI_REPLY_MAX_LENGTH) {
      return null;
    }
    if (containsForbiddenExpression(parsed.reply)) return null;

    return parsed.reply;
  }

  async createSummary(
    messages: ConversationMessage[],
  ): Promise<ConversationSummary> {
    // 要約は「取得できた事実のみ・推測で補わない」という安全要件を
    // 確実に満たすため、Phase 2 でもルールベースの要約を使用する。
    return this.fallback.createSummary(messages);
  }

  async analyzeConversation(
    messages: ConversationMessage[],
  ): Promise<AnalysisResult> {
    return this.fallback.analyzeConversation(messages);
  }
}
