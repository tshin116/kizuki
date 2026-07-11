import { describe, expect, it } from 'vitest';
import type { Mood } from '../conversation/types';
import { evaluateSupportRules, type SupportInputEntry } from './rules';

const TODAY = '2026-07-11';

function entry(overrides: Partial<SupportInputEntry> & { date: string }): SupportInputEntry {
  return {
    mood: 'futsuu' as Mood,
    moodVisible: true,
    categories: [],
    wantsConsultationToStaff: false,
    consultationTarget: null,
    wantsTeacherVoice: false,
    ...overrides,
  };
}

function ids(entries: SupportInputEntry[]) {
  return evaluateSupportRules(entries, TODAY).map((r) => r.id);
}

describe('evaluateSupportRules', () => {
  it('😥😡が3日連続で発火する', () => {
    const entries = [
      entry({ date: '2026-07-09', mood: 'kanashii' }),
      entry({ date: '2026-07-10', mood: 'kanashii' }),
      entry({ date: '2026-07-11', mood: 'okotteiru' }),
    ];
    expect(ids(entries)).toContain('consecutive_negative');
  });

  it('2日連続では発火しない', () => {
    const entries = [
      entry({ date: '2026-07-10', mood: 'kanashii' }),
      entry({ date: '2026-07-11', mood: 'kanashii' }),
    ];
    expect(ids(entries)).not.toContain('consecutive_negative');
  });

  it('共有されていない気持ちは連続判定に使わない', () => {
    const entries = [
      entry({ date: '2026-07-09', mood: 'kanashii' }),
      entry({ date: '2026-07-10', mood: 'kanashii', moodVisible: false }),
      entry({ date: '2026-07-11', mood: 'kanashii' }),
    ];
    expect(ids(entries)).not.toContain('consecutive_negative');
  });

  it('過去7日間に😥😡が4日で発火する（連続していなくても）', () => {
    const entries = [
      entry({ date: '2026-07-05', mood: 'okotteiru' }),
      entry({ date: '2026-07-07', mood: 'kanashii' }),
      entry({ date: '2026-07-09', mood: 'okotteiru' }),
      entry({ date: '2026-07-11', mood: 'kanashii' }),
    ];
    expect(ids(entries)).toContain('frequent_negative');
  });

  it('生徒本人の相談希望・声かけ希望で発火する', () => {
    expect(
      ids([
        entry({
          date: '2026-07-11',
          wantsConsultationToStaff: true,
          consultationTarget: '担任の先生',
        }),
      ]),
    ).toContain('consultation_requested');
    expect(
      ids([entry({ date: '2026-07-11', wantsTeacherVoice: true })]),
    ).toContain('voice_requested');
  });

  it('共有された会話の気になるカテゴリーで発火する', () => {
    const entries = [
      entry({ date: '2026-07-11', categories: ['strong_distress'] }),
    ];
    expect(ids(entries)).toContain('category_detected');
  });

  it('気にならないカテゴリーでは発火しない', () => {
    const entries = [entry({ date: '2026-07-11', categories: ['other'] })];
    expect(ids(entries)).not.toContain('category_detected');
  });

  it('記録が3日以上途切れたら発火する（継続記録があった生徒のみ）', () => {
    const stopped = [
      entry({ date: '2026-07-05' }),
      entry({ date: '2026-07-06' }),
      entry({ date: '2026-07-07' }),
    ];
    expect(ids(stopped)).toContain('missing_entries');

    // 記録が2件しかない生徒には適用しない
    const fewEntries = [entry({ date: '2026-07-05' }), entry({ date: '2026-07-06' })];
    expect(ids(fewEntries)).not.toContain('missing_entries');

    // 昨日も記録している生徒には適用しない
    const active = [
      entry({ date: '2026-07-08' }),
      entry({ date: '2026-07-09' }),
      entry({ date: '2026-07-10' }),
    ];
    expect(ids(active)).not.toContain('missing_entries');
  });

  it('問題のない生徒では何も発火しない', () => {
    const entries = [
      entry({ date: '2026-07-09', mood: 'ureshii' }),
      entry({ date: '2026-07-10', mood: 'futsuu' }),
      entry({ date: '2026-07-11', mood: 'ureshii' }),
    ];
    expect(ids(entries)).toHaveLength(0);
  });
});
