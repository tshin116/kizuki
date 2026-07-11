import type {
  Category,
  ConversationMessage,
  DetectedKeyword,
} from './types';

/**
 * ルールベースのキーワード検出。
 * 部分一致・表記揺れ（全角/半角、カタカナ/ひらがな、空白）を考慮する。
 * キーワードが含まれているだけで生徒の状態を断定しないこと。
 * カテゴリーはあくまで「参考」として扱う。
 */

export interface KeywordRule {
  category: Category;
  patterns: string[];
}

export const KEYWORD_RULES: KeywordRule[] = [
  {
    category: 'peer_relationship',
    patterns: [
      'いじめ',
      '仲間外れ',
      '仲間はずれ',
      'なかまはずれ',
      '無視され',
      'むしされ',
      '悪口',
      'わるぐち',
      '叩かれ',
      'たたかれ',
      '蹴られ',
      'けられ',
      'ぶたれ',
      'からかわれ',
      'ひとりぼっち',
      '一人ぼっち',
      '友だちがいない',
      '友達がいない',
      'けんか',
      '喧嘩',
    ],
  },
  {
    category: 'school_life',
    patterns: [
      '学校に行きたくない',
      '学校いきたくない',
      'がっこうにいきたくない',
      'がっこういきたくない',
      '授業がわからない',
      '勉強がわからない',
      'べんきょうがわからない',
      '宿題が終わらない',
      'しゅくだいがおわらない',
    ],
  },
  {
    category: 'family',
    patterns: [
      '家に帰りたくない',
      'いえにかえりたくない',
      'おうちに帰りたくない',
      '家がいや',
      'いえがいや',
      '親に怒られ',
      'おやにおこられ',
      '家族とけんか',
      'かぞくとけんか',
    ],
  },
  {
    category: 'food_sleep',
    patterns: [
      'ご飯を食べていない',
      'ごはんをたべていない',
      'ご飯が食べられない',
      'ごはんがたべられない',
      'ご飯を食べられない',
      '食べられない',
      'たべられない',
      '食べていない',
      'たべていない',
      '眠れない',
      'ねむれない',
      '寝られない',
      'ねられない',
      '寝れない',
      'ねれない',
    ],
  },
  {
    category: 'physical_condition',
    patterns: [
      '頭が痛い',
      'あたまがいたい',
      'おなかが痛い',
      'お腹が痛い',
      'おなかがいたい',
      '気持ち悪い',
      'きもちわるい',
      'だるい',
      '熱がある',
      'ねつがある',
      '体が痛い',
      'からだがいたい',
    ],
  },
  {
    category: 'strong_distress',
    patterns: [
      '怖い',
      'こわい',
      'ずっとつらい',
      'ずっと辛い',
      'ずっとしんどい',
      '消えたい',
      'きえたい',
      '死にたい',
      'しにたい',
      'いなくなりたい',
      '自分を傷つけ',
      'じぶんをきずつけ',
      'リストカット',
      '誰にも言えない',
      'だれにもいえない',
      '誰にもいえない',
    ],
  },
];

/**
 * 表記揺れ吸収のための正規化。
 * NFKC（全角/半角統一）→ 小文字化 → 空白除去 → カタカナをひらがなへ変換。
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[ァ-ヶ]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60),
    );
}

/** 1つのテキストからキーワードを検出する（部分一致） */
export function detectKeywordsInText(text: string): DetectedKeyword[] {
  const normalized = normalizeText(text);
  const results: DetectedKeyword[] = [];
  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      if (normalized.includes(normalizeText(pattern))) {
        results.push({ keyword: pattern, category: rule.category, source: text });
      }
    }
  }
  return results;
}

/**
 * 会話全体からキーワードを検出する。
 * 対象は生徒の「自由入力」のみ。選択肢による回答（viaChoice）と
 * 気持ち選択は構造化データとして別途扱うため、キーワード検出しない。
 */
export function detectKeywords(
  messages: ConversationMessage[],
): DetectedKeyword[] {
  const seen = new Set<string>();
  const results: DetectedKeyword[] = [];
  for (const m of messages) {
    if (m.role !== 'student') continue;
    if (m.viaChoice) continue;
    if (m.questionType === 'mood_select') continue;
    for (const d of detectKeywordsInText(m.content)) {
      const key = `${d.category}:${d.keyword}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(d);
    }
  }
  return results;
}

export function categoriesFromKeywords(
  detected: DetectedKeyword[],
): Category[] {
  return [...new Set(detected.map((d) => d.category))];
}
