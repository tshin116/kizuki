/**
 * 会話機能のドメイン型定義。
 * Phase 1（ルールベース）/ Phase 2（生成AI）で共通に使用する。
 */

export type Mood = 'ureshii' | 'kanashii' | 'futsuu' | 'okotteiru';

export type ShareScope = 'none' | 'mood_only' | 'summary' | 'full';

export type QuestionType =
  | 'mood_select'
  | 'reason'
  | 'event_type'
  | 'event_time'
  | 'feeling_detail'
  | 'feeling_now'
  | 'consultation'
  | 'closing';

export type Category =
  | 'peer_relationship'
  | 'school_life'
  | 'family'
  | 'food_sleep'
  | 'physical_condition'
  | 'strong_distress'
  | 'other';

export interface ConversationMessage {
  role: 'character' | 'student';
  content: string;
  /** 生徒メッセージの場合：どの質問への回答か。キャラクターの場合：どの質問を発したか */
  questionType?: QuestionType;
  /** 選択肢を押して回答したかどうか（自由入力と区別する） */
  viaChoice?: boolean;
}

export interface ConversationContext {
  mood: Mood;
  messages: ConversationMessage[];
}

/** 開発用モードでのみクライアントへ返すデバッグ情報 */
export interface ConversationDebugInfo {
  /** どの分岐を通ったか（例: 'initial', 'normal:event_type->event_time', 'distress_detected'） */
  branch: string;
  /** 直前に回答された質問 */
  answeredQuestion: QuestionType | null;
  /** このターンの入力から検出されたカテゴリー */
  categoriesThisTurn: Category[];
  /** 会話全体でこれまでに検出されたカテゴリー */
  categoriesTotal: Category[];
  /** 相談質問へ遷移した理由（'reached_normally' | 'distress_detected' | 'max_turns' など） */
  consultationTrigger: string | null;
}

export interface ConversationResponse {
  reply: string;
  questionType: QuestionType;
  choices: string[];
  /** 自由入力欄を表示するか */
  allowText: boolean;
  isEnd: boolean;
  suggestConsultation: boolean;
  debug?: ConversationDebugInfo;
}

export interface DetectedKeyword {
  keyword: string;
  category: Category;
  /** マッチした生徒の発言（デバッグ表示用） */
  source: string;
}

/** 要約の材料となる、会話から取得できた事実。取得できなかった項目は null */
export interface SummaryFacts {
  moodLabel: string | null;
  hasReasonText: boolean;
  eventType: string | null;
  eventTime: string | null;
  hasFeelingDetailText: boolean;
  feelingNow: string | null;
  consultation: string | null;
  endedEarly: boolean;
}

export interface AnalysisResult {
  categories: Category[];
  detectedKeywords: DetectedKeyword[];
  summary: string;
  /** 要約に使用した事実スロット（デバッグ用） */
  facts: SummaryFacts;
}

export interface ConversationSummary {
  text: string;
}

/**
 * 会話サービスの共通インターフェース。
 * Phase 1: RuleBasedConversationService / Phase 2: AIConversationService
 */
export interface ConversationService {
  getNextResponse(context: ConversationContext): Promise<ConversationResponse>;
  createSummary(messages: ConversationMessage[]): Promise<ConversationSummary>;
  analyzeConversation(messages: ConversationMessage[]): Promise<AnalysisResult>;
}

/** 要約・検出処理のインターフェース（Phase 2 で AI 版に置き換え可能） */
export interface ConversationAnalyzer {
  analyze(messages: ConversationMessage[]): AnalysisResult;
}
