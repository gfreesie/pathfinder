import type { AllocationLine, Answers, ProfileDef } from '../types';
import type { YearPoint } from './projections';
import { blendedReturns, fmtMoney, savingsPlan } from './projections';
import { allocationWeights } from './allocation';

const LABELS: Record<string, Record<string, string>> = {
  timeline: { lt2: 'Under 2 years', y2_5: '2–5 years', y5_10: '5–10 years', y10p: '10+ years' },
  temperament: { sellAll: 'Sell everything', sellSome: 'Sell some', hold: 'Hold steady', buyMore: 'Buy more' },
  cushion: { full: 'Yes, fully funded', partial: 'Partially funded', none: 'Not yet' },
  handsOn: { set: 'Set & forget', monthly: 'Check monthly', active: 'Actively manage' },
  cryptoComfort: { none: 'None (0%)', small: 'Small taste (≤5%)', meaningful: 'Meaningful slice (≤15%)', believer: 'Believer' },
  tangibility: { strong: 'Strongly tangible', somewhat: 'Somewhat', indifferent: 'No preference' },
  insurance: { core: 'Yes — core piece', slice: 'Yes — small slice', later: 'Tell me more later', no: 'Not for me' },
  goal: { foundation: 'Wealth foundation', purchase: 'Specific purchase', retirement: 'Retirement seed', income: 'Passive income', learning: 'Learning to invest' },
};

export function buildSummary(
  answers: Answers,
  profile: ProfileDef,
  allocation: AllocationLine[],
  points: YearPoint[],
  monthlyInvest: number,
  premium: number,
  insuranceOn: boolean,
): string {
  const l = (field: keyof typeof LABELS, v: string | null) => (v ? LABELS[field][v] : '—');
  const [rc, re, ro] = blendedReturns(allocationWeights(allocation));
  const horizons = [5, 10, 20, 30];

  const lines: string[] = [
    '=== PATHFINDER — INVESTMENT DISCOVERY SUMMARY ===',
    `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
    '--- ANSWERS ---',
    `Starting capital: ${fmtMoney(answers.capital)}`,
    `Monthly contribution: ${fmtMoney(answers.monthly)}/mo`,
    `Timeline: ${l('timeline', answers.timeline)}`,
    `Risk temperament (25% drop): ${l('temperament', answers.temperament)}`,
    `Sleep test (0 safe – 100 aggressive): ${answers.sleep}`,
    `Emergency fund: ${l('cushion', answers.cushion)}`,
    `Asset attraction: ${answers.assets.length ? answers.assets.join(', ') : 'none selected'}`,
    `Hands-on level: ${l('handsOn', answers.handsOn)}`,
    `Crypto comfort: ${l('cryptoComfort', answers.cryptoComfort)}`,
    `Tangibility preference: ${l('tangibility', answers.tangibility)}`,
    `Life insurance interest: ${l('insurance', answers.insurance)}`,
    insuranceOn ? `Insurance premium: ${fmtMoney(premium)}/mo (from monthly contribution)` : 'Insurance premium: n/a',
    (() => {
      const sp = savingsPlan(answers);
      return sp.active
        ? `Safety-net savings goal: ${fmtMoney(sp.goal)} in ${sp.months} months → ${fmtMoney(sp.perMonth)}/mo (from monthly contribution; redirects to investing once funded)`
        : 'Safety-net savings goal: n/a';
    })(),
    `Goal: ${l('goal', answers.goal)}`,
    '',
    '--- PROFILE ---',
    `${profile.name} — ${profile.tagline}`,
    '',
    '--- SUGGESTED ALLOCATION ---',
    ...allocation.map(
      (a) => `${a.label}: ${a.pct}% (${fmtMoney(a.dollars)})${a.note ? ` [${a.note}]` : ''}`,
    ),
    `Monthly investing (after premium): ${fmtMoney(monthlyInvest)}/mo, auto-split across the same mix (DCA)`,
    '',
    '--- PROJECTIONS (illustrative, not guarantees) ---',
    `Blended annual return assumptions — Conservative ${rc.toFixed(1)}%, Expected ${re.toFixed(1)}%, Optimistic ${ro.toFixed(1)}%`,
    ...horizons.map((h) => {
      const p = points[h];
      const ins = insuranceOn ? ` | Insurance cash value (expected): ${fmtMoney(p.cvExp)}` : '';
      return `Year ${h}: contributed ${fmtMoney(p.contributed)} → Conservative ${fmtMoney(p.cons + p.cvCons)}, Expected ${fmtMoney(p.exp + p.cvExp)}, Optimistic ${fmtMoney(p.opt + p.cvOpt)}${ins}`;
    }),
    insuranceOn
      ? `Insurance note: cash value typically borrowable (~90%) after a 2–5 year seasoning period.`
      : '',
    '',
    'Educational tool for discussion purposes. Not licensed financial advice.',
  ];
  return lines.filter((x) => x !== '').join('\n');
}
