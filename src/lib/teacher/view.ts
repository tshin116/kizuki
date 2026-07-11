import { CATEGORY_LABELS, MOODS, SCHOOL_STAFF_TARGETS } from '../conversation/constants';
import type { ConversationMessage } from '../conversation/types';
import { addDaysISO } from '../date';
import type { Entry, Student } from '../db/repository';
import { getEntryMessages, listEntriesByStudent, listStudents } from '../db/repository';
import type { FiredRule, SupportInputEntry } from '../support/rules';
import { evaluateSupportRules } from '../support/rules';

/**
 * 共有範囲（生徒本人の選択）に基づいて、先生に見せてよい情報だけを
 * 組み立てる。生成AI導入後（Phase 2）もこの層がアクセス制御を担い、
 * AIには共有範囲の判断を任せない。
 *
 * 共有範囲の意味:
 *   none      : 記録の存在自体を先生に表示しない
 *   mood_only : 気持ち（絵文字）のみ表示
 *   summary   : 気持ち + 要約 + 参考カテゴリー
 *   full      : 上記 + 会話の全文
 *
 * 例外: 生徒本人が「先生に相談したい」「声をかけてほしい」を選んだ場合、
 * その希望自体は共有範囲によらず先生に伝わる（生徒への画面でも明示する）。
 */

export interface TeacherEntryView {
  id: string;
  date: string;
  shareScope: Entry['shareScope'];
  mood: { label: string; emoji: string } | null;
  summary: string | null;
  categoryLabels: string[] | null;
  messages: ConversationMessage[] | null;
  wantsConsultationToStaff: boolean;
  consultationTarget: string | null;
  wantsTeacherVoice: boolean;
}

export function wantsConsultationToStaff(entry: Entry): boolean {
  return (
    entry.wantsConsultation &&
    entry.consultationTarget !== null &&
    SCHOOL_STAFF_TARGETS.includes(entry.consultationTarget)
  );
}

/** 1件の記録を、先生に見せてよい形へ変換する。none は null（非表示） */
export function toTeacherEntryView(entry: Entry): TeacherEntryView | null {
  const consultToStaff = wantsConsultationToStaff(entry);

  if (entry.shareScope === 'none') {
    // 相談・声かけ希望だけは本人の意思として伝える（内容は伝えない）
    if (consultToStaff || entry.wantsTeacherVoice) {
      return {
        id: entry.id,
        date: entry.date,
        shareScope: entry.shareScope,
        mood: null,
        summary: null,
        categoryLabels: null,
        messages: null,
        wantsConsultationToStaff: consultToStaff,
        consultationTarget: consultToStaff ? entry.consultationTarget : null,
        wantsTeacherVoice: entry.wantsTeacherVoice,
      };
    }
    return null;
  }

  const mood = MOODS[entry.mood];
  return {
    id: entry.id,
    date: entry.date,
    shareScope: entry.shareScope,
    mood: { label: mood.label, emoji: mood.emoji },
    summary:
      entry.shareScope === 'summary' || entry.shareScope === 'full'
        ? entry.summary
        : null,
    categoryLabels:
      entry.shareScope === 'summary' || entry.shareScope === 'full'
        ? entry.categories.map((c) => CATEGORY_LABELS[c])
        : null,
    messages: entry.shareScope === 'full' ? getEntryMessages(entry.id) : null,
    wantsConsultationToStaff: consultToStaff,
    consultationTarget: consultToStaff ? entry.consultationTarget : null,
    wantsTeacherVoice: entry.wantsTeacherVoice,
  };
}

/** サポート候補判定への入力（共有範囲を反映） */
export function toSupportInput(entry: Entry): SupportInputEntry {
  const shared = entry.shareScope !== 'none';
  const categoriesShared =
    entry.shareScope === 'summary' || entry.shareScope === 'full';
  return {
    date: entry.date,
    mood: entry.mood,
    moodVisible: shared,
    categories: categoriesShared ? entry.categories : [],
    wantsConsultationToStaff: wantsConsultationToStaff(entry),
    consultationTarget: entry.consultationTarget,
    wantsTeacherVoice: entry.wantsTeacherVoice,
  };
}

export interface MoodStripDay {
  date: string;
  emoji: string | null;
}

export interface TeacherStudentSummary {
  student: Student;
  moodStrip: MoodStripDay[];
  firedRules: FiredRule[];
  lastSharedEntryDate: string | null;
  entryCount: number;
}

export function buildTeacherStudentSummary(
  student: Student,
  todayISO: string,
  stripDays = 14,
): TeacherStudentSummary {
  const entries = listEntriesByStudent(student.id);
  const visible = entries.filter((e) => e.shareScope !== 'none');

  const moodByDate = new Map<string, string>();
  for (const e of visible) {
    moodByDate.set(e.date, MOODS[e.mood].emoji);
  }

  const moodStrip: MoodStripDay[] = [];
  for (let i = stripDays - 1; i >= 0; i--) {
    const date = addDaysISO(todayISO, -i);
    moodStrip.push({ date, emoji: moodByDate.get(date) ?? null });
  }

  return {
    student,
    moodStrip,
    firedRules: evaluateSupportRules(entries.map(toSupportInput), todayISO),
    lastSharedEntryDate: visible.map((e) => e.date).sort().at(-1) ?? null,
    entryCount: visible.length,
  };
}

export function buildTeacherDashboard(todayISO: string): {
  supportCandidates: TeacherStudentSummary[];
  allStudents: TeacherStudentSummary[];
} {
  const all = listStudents().map((s) =>
    buildTeacherStudentSummary(s, todayISO),
  );
  return {
    supportCandidates: all.filter((s) => s.firedRules.length > 0),
    allStudents: all,
  };
}
