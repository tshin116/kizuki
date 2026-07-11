import { RuleBasedConversationAnalyzer } from './analyzer';
import {
  ANSWER_UNSURE,
  ANSWER_UNSURE_SHORT,
  CONSULTATION_CHOICES,
  EVENT_TIME_CHOICES,
  EVENT_TYPE_CHOICES,
  EXIT_CANT_VERBALIZE,
  EXIT_NO_TALK,
  EXIT_TODAY,
  FEELING_NOW_CHOICES,
  FREE_TEXT_QUICK_CHOICES,
  INITIAL_QUESTIONS,
  MAX_TURNS,
  SCHOOL_STAFF_TARGETS,
} from './constants';
import { detectKeywords, detectKeywordsInText } from './keywords';
import type {
  Category,
  ConversationContext,
  ConversationMessage,
  ConversationResponse,
  ConversationService,
  ConversationSummary,
  AnalysisResult,
  Mood,
  QuestionType,
} from './types';

const QUESTION_TEXTS: Partial<Record<QuestionType, string>> = {
  event_time: 'それは、いつ頃あったの？',
  feeling_detail: 'そのとき、どんな気持ちだった？',
  feeling_now: '今も、その気持ちは続いている？',
  consultation: 'このお話、誰かに話してみたい？',
};

function findLast<T>(
  arr: T[],
  pred: (item: T) => boolean,
): T | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (pred(arr[i])) return arr[i];
  }
  return undefined;
}

interface StepConfig {
  choices: string[];
  allowText: boolean;
}

const STEP_CONFIG: Partial<Record<QuestionType, StepConfig>> = {
  reason: { choices: FREE_TEXT_QUICK_CHOICES, allowText: true },
  event_type: { choices: EVENT_TYPE_CHOICES, allowText: false },
  event_time: { choices: EVENT_TIME_CHOICES, allowText: false },
  feeling_detail: { choices: FREE_TEXT_QUICK_CHOICES, allowText: true },
  feeling_now: { choices: FEELING_NOW_CHOICES, allowText: false },
  consultation: { choices: CONSULTATION_CHOICES, allowText: false },
};

/** 通常フローでの「次の質問」 */
const NEXT_STEP: Partial<Record<QuestionType, QuestionType>> = {
  reason: 'event_type',
  event_type: 'event_time',
  event_time: 'feeling_detail',
  feeling_detail: 'feeling_now',
  feeling_now: 'consultation',
};

/**
 * Phase 1 のルールベース会話サービス。
 * 固定された質問・選択肢・キーワード検出・条件分岐のみで会話を進める。
 * 外部の生成AI APIは使用しない。
 */
export class RuleBasedConversationService implements ConversationService {
  private analyzer = new RuleBasedConversationAnalyzer();

  async getNextResponse(
    context: ConversationContext,
  ): Promise<ConversationResponse> {
    return this.computeNextResponse(context);
  }

  async createSummary(
    messages: ConversationMessage[],
  ): Promise<ConversationSummary> {
    return { text: this.analyzer.analyze(messages).summary };
  }

  async analyzeConversation(
    messages: ConversationMessage[],
  ): Promise<AnalysisResult> {
    return this.analyzer.analyze(messages);
  }

  /** 同期版（テスト・内部利用向け） */
  computeNextResponse(context: ConversationContext): ConversationResponse {
    const { mood, messages } = context;

    const lastCharacter = findLast(messages, (m) => m.role === 'character');
    const lastStudent = findLast(
      messages,
      (m) => m.role === 'student' && m.questionType !== 'mood_select',
    );

    const categoriesTotal = [
      ...new Set(detectKeywords(messages).map((d) => d.category)),
    ];

    // --- 最初の質問（気持ち選択直後） ---
    if (!lastCharacter) {
      return this.question('reason', INITIAL_QUESTIONS[mood], {
        branch: 'initial',
        answeredQuestion: null,
        categoriesThisTurn: [],
        categoriesTotal,
        consultationTrigger: null,
      });
    }

    const answeredQuestion = (lastCharacter.questionType ?? null) as
      | QuestionType
      | null;
    const answer = lastStudent?.content.trim() ?? '';

    const categoriesThisTurn: Category[] =
      lastStudent && !lastStudent.viaChoice
        ? [...new Set(detectKeywordsInText(answer).map((d) => d.category))]
        : [];

    const debugBase = {
      answeredQuestion,
      categoriesThisTurn,
      categoriesTotal,
      consultationTrigger: null as string | null,
    };

    // --- 会話終了の選択（無理に質問を続けない） ---
    if (answer === EXIT_TODAY) {
      return this.closing(
        '今日はここまでにするね。お話ししてくれてありがとう。また明日も来てね。',
        { ...debugBase, branch: 'exit:today' },
      );
    }

    if (answer === EXIT_NO_TALK) {
      if (answeredQuestion === 'consultation') {
        return this.closing(
          'わかったよ。話したくなったら、いつでも聞くからね。今日はお話ししてくれてありがとう。',
          { ...debugBase, branch: 'consultation:no_talk' },
        );
      }
      return this.closing(
        'わかったよ。話したくないことは、話さなくてだいじょうぶ。今日は気持ちを教えてくれてありがとう。',
        { ...debugBase, branch: 'exit:no_talk' },
      );
    }

    // --- 強い苦痛の可能性を検出したら、やさしく相談へ ---
    const consultationAlreadyAsked = messages.some(
      (m) => m.role === 'character' && m.questionType === 'consultation',
    );
    if (
      categoriesThisTurn.includes('strong_distress') &&
      !consultationAlreadyAsked
    ) {
      return this.question(
        'consultation',
        '話してくれてありがとう。つらい気持ちを、ひとりでかかえなくていいんだよ。よかったら、だれかに話してみない？',
        {
          ...debugBase,
          branch: 'distress_detected',
          consultationTrigger: 'distress_detected',
        },
        { suggestConsultation: true },
      );
    }

    // --- 相談質問への回答 → 会話終了 ---
    if (answeredQuestion === 'consultation') {
      return this.closing(this.consultationClosingText(answer), {
        ...debugBase,
        branch: `consultation:${answer || 'unknown'}`,
      });
    }

    // --- 往復数の上限に達したら相談質問へ ---
    const studentTurns = messages.filter(
      (m) => m.role === 'student' && m.questionType !== 'mood_select',
    ).length;
    if (studentTurns >= MAX_TURNS) {
      return this.question(
        'consultation',
        `${this.ackFor(answeredQuestion, answer, mood)}${QUESTION_TEXTS.consultation}`,
        {
          ...debugBase,
          branch: 'max_turns',
          consultationTrigger: 'max_turns',
        },
      );
    }

    // --- 「うまく言葉にできない」→ 選択肢だけで答えられる質問へ ---
    if (answer === EXIT_CANT_VERBALIZE) {
      if (answeredQuestion === 'reason') {
        return this.question(
          'event_type',
          'うまく言葉にできないときも、あるよね。ことばにしなくてもだいじょうぶ。えらぶだけでもいいよ。',
          { ...debugBase, branch: 'cant_verbalize:reason->event_type' },
        );
      }
      return this.question(
        'feeling_now',
        'むりに言葉にしなくて、だいじょうぶだよ。' + QUESTION_TEXTS.feeling_now,
        { ...debugBase, branch: 'cant_verbalize->feeling_now' },
      );
    }

    // --- 「自分でもよく分からない」→ 詳しく聞かずに先へ進む ---
    if (answer === ANSWER_UNSURE || answer === ANSWER_UNSURE_SHORT) {
      if (answeredQuestion === 'reason' || answeredQuestion === 'event_type') {
        return this.question(
          'feeling_now',
          'よく分からないときも、あるよね。それでだいじょうぶだよ。' +
            QUESTION_TEXTS.feeling_now,
          { ...debugBase, branch: `unsure:${answeredQuestion}->feeling_now` },
        );
      }
      if (answeredQuestion === 'feeling_now') {
        return this.question(
          'consultation',
          'そういうときも、あるよね。' + QUESTION_TEXTS.consultation,
          {
            ...debugBase,
            branch: 'unsure:feeling_now->consultation',
            consultationTrigger: 'reached_normally',
          },
        );
      }
      // event_time など、その他は通常フローで先へ
    }

    // --- 通常フロー ---
    const next = answeredQuestion ? NEXT_STEP[answeredQuestion] : undefined;
    if (!next) {
      // 想定外の状態は安全に会話を締める
      return this.closing(
        '今日はお話ししてくれてありがとう。また明日も来てね。',
        { ...debugBase, branch: 'fallback:unknown_state' },
      );
    }

    const ack = this.ackFor(answeredQuestion, answer, mood);
    const questionText = this.questionTextFor(next, answeredQuestion, answer);

    return this.question(next, `${ack}${questionText}`, {
      ...debugBase,
      branch: `normal:${answeredQuestion}->${next}`,
      consultationTrigger: next === 'consultation' ? 'reached_normally' : null,
    });
  }

  /** 回答へのみじかい受けとめ（共感）を返す */
  private ackFor(
    answeredQuestion: QuestionType | null,
    answer: string,
    mood: Mood,
  ): string {
    switch (answeredQuestion) {
      case 'reason':
        return mood === 'ureshii'
          ? 'そうなんだ、教えてくれてありがとう。'
          : 'そうだったんだね。話してくれてありがとう。';
      case 'event_type':
        return EVENT_TYPE_CHOICES.includes(answer) &&
          answer !== ANSWER_UNSURE &&
          answer !== EXIT_NO_TALK
          ? `${answer}なんだね。`
          : 'そうなんだね。';
      case 'event_time':
        return '教えてくれてありがとう。';
      case 'feeling_detail':
        return 'そうか、そんな気持ちだったんだね。';
      case 'feeling_now':
        if (answer === 'まだ続いている') {
          return mood === 'ureshii'
            ? 'いい気持ちが続いているんだね。'
            : 'まだ続いているんだね。むりしなくていいんだよ。';
        }
        if (answer === '少し落ち着いた') return '少し落ち着いてきたんだね。';
        if (answer === 'もう大丈夫') return 'もう大丈夫なんだね。よかった。';
        return 'そういうときも、あるよね。';
      default:
        return '';
    }
  }

  private questionTextFor(
    next: QuestionType,
    answeredQuestion: QuestionType | null,
    answer: string,
  ): string {
    if (next === 'event_type') {
      // 直前に自由入力で出来事を話している場合は、分類をお願いする言い方にする
      return answeredQuestion === 'reason' && answer.length > 0
        ? 'そのお話は、どれにいちばん近いかな？'
        : 'どんなことがあったの？';
    }
    return QUESTION_TEXTS[next] ?? '';
  }

  private consultationClosingText(answer: string): string {
    if (SCHOOL_STAFF_TARGETS.includes(answer)) {
      return `わかったよ。${answer}に話したい気持ち、ちゃんと伝わるようにするね。今日はお話ししてくれてありがとう。`;
    }
    if (answer === '家族' || answer === '友だち') {
      return `${answer}に話してみるんだね。おうえんしてるよ。今日はお話ししてくれてありがとう。`;
    }
    if (answer === 'あとで考えたい') {
      return 'うん、ゆっくり考えてだいじょうぶだよ。今日はお話ししてくれてありがとう。';
    }
    return 'わかったよ。今日はお話ししてくれてありがとう。また明日も来てね。';
  }

  private question(
    type: QuestionType,
    reply: string,
    debug: NonNullable<ConversationResponse['debug']>,
    opts: { suggestConsultation?: boolean } = {},
  ): ConversationResponse {
    const config = STEP_CONFIG[type] ?? { choices: [], allowText: false };
    return {
      reply,
      questionType: type,
      choices: config.choices,
      allowText: config.allowText,
      isEnd: false,
      suggestConsultation: opts.suggestConsultation ?? false,
      debug,
    };
  }

  private closing(
    reply: string,
    debug: NonNullable<ConversationResponse['debug']>,
  ): ConversationResponse {
    return {
      reply,
      questionType: 'closing',
      choices: [],
      allowText: false,
      isEnd: true,
      suggestConsultation: false,
      debug,
    };
  }
}
