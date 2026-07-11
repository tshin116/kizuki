import { RuleBasedConversationService } from './rule-based-service';
import type {
  AnalysisResult,
  ConversationContext,
  ConversationMessage,
  ConversationResponse,
  ConversationService,
  ConversationSummary,
} from './types';

/**
 * Phase 2：生成AI APIを利用する会話サービス（現在はモック実装）。
 *
 * Phase 2 で実装する内容：
 * 1. prompts/child-support-system-prompt.ts のシステムプロンプトと
 *    会話履歴を、サーバー側から生成AI APIへ送信する
 *    （APIキーは環境変数 AI_API_KEY で管理し、ブラウザへは公開しない）
 * 2. 応答を ai-schema.ts の validateAiOutput で検証する
 * 3. 不正な出力・禁止表現は SAFE_FALLBACK_REPLY へ置き換える
 * 4. タイムアウト・再試行を実装し、失敗時はルールベースへフォールバックする
 * 5. 最大会話回数・会話終了条件・共有範囲の管理はアプリ側（このクラスの
 *    呼び出し元とルート層）が行い、生成AIには任せない
 *
 * 現在（Phase 1）は、すべてルールベース実装へ委譲する。
 */
export class AIConversationService implements ConversationService {
  private fallback = new RuleBasedConversationService();

  private hasApiKey(): boolean {
    return Boolean(process.env.AI_API_KEY);
  }

  async getNextResponse(
    context: ConversationContext,
  ): Promise<ConversationResponse> {
    if (!this.hasApiKey()) {
      // APIキー未設定時はルールベースで会話を継続する（Phase 1 の動作）
      return this.fallback.getNextResponse(context);
    }
    // TODO(Phase 2): 生成AI API呼び出し + validateAiOutput + フォールバック
    return this.fallback.getNextResponse(context);
  }

  async createSummary(
    messages: ConversationMessage[],
  ): Promise<ConversationSummary> {
    if (!this.hasApiKey()) {
      return this.fallback.createSummary(messages);
    }
    // TODO(Phase 2): 生成AIによる要約（事実のみ・推測禁止）+ フォールバック
    return this.fallback.createSummary(messages);
  }

  async analyzeConversation(
    messages: ConversationMessage[],
  ): Promise<AnalysisResult> {
    if (!this.hasApiKey()) {
      return this.fallback.analyzeConversation(messages);
    }
    // TODO(Phase 2): 生成AIによる気になる表現の候補抽出 + ルールベース結果との統合
    return this.fallback.analyzeConversation(messages);
  }
}
