import {
  ANSWER_UNSURE,
  ANSWER_UNSURE_SHORT,
  CONSULTATION_CHOICES,
  EVENT_TIME_CHOICES,
  EVENT_TYPE_CHOICES,
  EVENT_TYPE_TO_CATEGORY,
  EXIT_CANT_VERBALIZE,
  EXIT_NO_TALK,
  EXIT_TODAY,
  MOOD_LABEL_TO_KEY,
  MOODS,
  SCHOOL_STAFF_TARGETS,
} from './constants';
import { categoriesFromKeywords, detectKeywords } from './keywords';
import type {
  AnalysisResult,
  Category,
  ConversationAnalyzer,
  ConversationMessage,
  SummaryFacts,
} from './types';

const SKIP_ANSWERS = new Set([
  EXIT_TODAY,
  EXIT_NO_TALK,
  EXIT_CANT_VERBALIZE,
  ANSWER_UNSURE,
  ANSWER_UNSURE_SHORT,
]);

/** 会話から「取得できた事実」だけを抽出する。推測で補わない。 */
export function extractFacts(messages: ConversationMessage[]): SummaryFacts {
  const facts: SummaryFacts = {
    moodLabel: null,
    hasReasonText: false,
    eventType: null,
    eventTime: null,
    hasFeelingDetailText: false,
    feelingNow: null,
    consultation: null,
    endedEarly: false,
  };

  for (const m of messages) {
    if (m.role !== 'student') continue;
    const content = m.content.trim();

    switch (m.questionType) {
      case 'mood_select':
        if (MOOD_LABEL_TO_KEY[content]) facts.moodLabel = content;
        break;
      case 'reason':
        if (!SKIP_ANSWERS.has(content) && content.length > 0) {
          facts.hasReasonText = true;
        }
        break;
      case 'event_type':
        if (
          EVENT_TYPE_CHOICES.includes(content) &&
          !SKIP_ANSWERS.has(content)
        ) {
          facts.eventType = content;
        }
        break;
      case 'event_time':
        if (
          EVENT_TIME_CHOICES.includes(content) &&
          !SKIP_ANSWERS.has(content)
        ) {
          facts.eventTime = content;
        }
        break;
      case 'feeling_detail':
        if (!SKIP_ANSWERS.has(content) && content.length > 0) {
          facts.hasFeelingDetailText = true;
        }
        break;
      case 'feeling_now':
        if (!SKIP_ANSWERS.has(content)) {
          facts.feelingNow = content;
        }
        break;
      case 'consultation':
        if (CONSULTATION_CHOICES.includes(content)) {
          facts.consultation = content;
        }
        break;
    }

    // 相談質問以外の場面で会話を打ち切る選択をしたか
    if (
      (content === EXIT_TODAY || content === EXIT_NO_TALK) &&
      m.questionType !== 'consultation'
    ) {
      facts.endedEarly = true;
    }
  }

  return facts;
}

const EVENT_TYPE_PHRASES: Record<string, string> = {
  友だちとのこと: '友だちとの出来事',
  先生とのこと: '先生との出来事',
  家族とのこと: '家族との出来事',
  勉強のこと: '勉強に関すること',
  習い事のこと: '習い事に関すること',
  体の調子: '体の調子に関すること',
  その他: 'その他の出来事',
};

const FEELING_NOW_PHRASES: Record<string, string> = {
  まだ続いている: '現在もその気持ちが続いていると回答しています。',
  少し落ち着いた: '現在は気持ちが少し落ち着いてきたと回答しています。',
  もう大丈夫: '現在はもう大丈夫だと回答しています。',
};

/**
 * テンプレートによる要約生成。
 * 取得できた情報のみを含め、情報がない場合は推測して補わない。
 */
export function buildSummary(facts: SummaryFacts): string {
  const parts: string[] = [];

  if (facts.moodLabel) {
    parts.push(
      `生徒は今日の気持ちとして『${facts.moodLabel}』を選択しました。`,
    );
  }

  if (facts.eventType) {
    parts.push(`${EVENT_TYPE_PHRASES[facts.eventType]}について話しています。`);
  } else if (facts.hasReasonText) {
    parts.push('出来事について自分の言葉で話しています。');
  }

  if (facts.eventTime) {
    parts.push(`その出来事は${facts.eventTime}あったと回答しています。`);
  }

  if (facts.feelingNow && FEELING_NOW_PHRASES[facts.feelingNow]) {
    parts.push(FEELING_NOW_PHRASES[facts.feelingNow]);
  }

  if (facts.consultation) {
    if (SCHOOL_STAFF_TARGETS.includes(facts.consultation)) {
      parts.push(`${facts.consultation}への相談を希望しています。`);
    } else if (facts.consultation === '家族' || facts.consultation === '友だち') {
      parts.push(`${facts.consultation}に話してみたいと回答しています。`);
    } else if (facts.consultation === EXIT_NO_TALK) {
      parts.push('今は誰かに相談することは希望していません。');
    } else if (facts.consultation === 'あとで考えたい') {
      parts.push('相談するかどうかは、あとで考えたいと回答しています。');
    }
  }

  if (facts.endedEarly) {
    parts.push('生徒は途中で会話を終えることを選びました。');
  }

  if (parts.length === 0) {
    return '生徒は今日の記録を行いましたが、会話からの情報はありません。';
  }

  return parts.join('');
}

/**
 * Phase 1 のルールベース分析。
 * Phase 2 では ConversationAnalyzer 実装を AI 版へ差し替える。
 */
export class RuleBasedConversationAnalyzer implements ConversationAnalyzer {
  analyze(messages: ConversationMessage[]): AnalysisResult {
    const detectedKeywords = detectKeywords(messages);
    const facts = extractFacts(messages);

    const categories: Category[] = [
      ...categoriesFromKeywords(detectedKeywords),
    ];
    // 選択肢による回答も参考カテゴリーに反映する
    if (facts.eventType && EVENT_TYPE_TO_CATEGORY[facts.eventType]) {
      const c = EVENT_TYPE_TO_CATEGORY[facts.eventType];
      if (!categories.includes(c)) categories.push(c);
    }

    return {
      categories,
      detectedKeywords,
      summary: buildSummary(facts),
      facts,
    };
  }
}

export function isNegativeMoodLabel(label: string): boolean {
  const key = MOOD_LABEL_TO_KEY[label];
  return key ? MOODS[key].negative : false;
}
