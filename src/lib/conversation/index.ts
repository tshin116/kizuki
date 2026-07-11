import { AIConversationService } from './ai-service';
import { RuleBasedConversationService } from './rule-based-service';
import type { ConversationService } from './types';

export type ConversationMode = 'rule' | 'ai';

export function getConversationMode(): ConversationMode {
  return process.env.CONVERSATION_MODE === 'ai' ? 'ai' : 'rule';
}

/**
 * 環境変数 CONVERSATION_MODE によってルールベース版と生成AI版を切り替える。
 *   CONVERSATION_MODE=rule → RuleBasedConversationService（Phase 1）
 *   CONVERSATION_MODE=ai   → AIConversationService（Phase 2）
 */
export function getConversationService(): ConversationService {
  return getConversationMode() === 'ai'
    ? new AIConversationService()
    : new RuleBasedConversationService();
}

export { RuleBasedConversationService } from './rule-based-service';
export { AIConversationService } from './ai-service';
export { RuleBasedConversationAnalyzer } from './analyzer';
export * from './types';
