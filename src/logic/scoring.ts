import type { Answers, ProfileDef, ProfileId } from '../types';

export function riskScore(a: Answers): number {
  const timeline = { lt2: 0, y2_5: 30, y5_10: 70, y10p: 100 }[a.timeline ?? 'y5_10'];
  const temperament = { sellAll: 0, sellSome: 33, hold: 66, buyMore: 100 }[a.temperament ?? 'hold'];
  const cushion = { full: 100, partial: 50, none: 0 }[a.cushion ?? 'partial'];
  const hands = { set: 45, monthly: 60, active: 85 }[a.handsOn ?? 'monthly'];
  const crypto = { none: 0, small: 33, meaningful: 66, believer: 100 }[a.cryptoComfort ?? 'none'];

  return (
    0.22 * timeline +
    0.26 * temperament +
    0.26 * a.sleep +
    0.1 * cushion +
    0.06 * hands +
    0.1 * crypto
  );
}

export function profileFor(score: number): ProfileId {
  if (score < 22) return 'guardian';
  if (score < 42) return 'builder';
  if (score < 62) return 'navigator';
  if (score < 80) return 'trailblazer';
  return 'maverick';
}

export const PROFILES: Record<ProfileId, ProfileDef> = {
  guardian: {
    id: 'guardian',
    name: 'The Guardian',
    tagline: 'Protect first, grow second',
    description:
      'You value certainty and sleep-at-night security above chasing returns. Your plan leans on income-producing, stable assets with a generous cash cushion — growth happens slowly, deliberately, and without drama.',
    color: '#5B8DB8',
    blends: [
      { label: 'Classic shelter', weights: { usStocks: 15, intlStocks: 5, metals: 10, landReit: 5, bonds: 45, cash: 20 } },
      { label: 'Income lean', weights: { usStocks: 20, intlStocks: 5, metals: 10, landReit: 10, bonds: 40, cash: 15 } },
    ],
  },
  builder: {
    id: 'builder',
    name: 'The Steady Builder',
    tagline: 'Brick by brick, year by year',
    description:
      'You want real growth but with guardrails. Your plan blends a solid core of index funds with steady income assets and a touch of tangible value — designed to compound quietly while limiting the size of any bad year.',
    color: '#2F8F7B',
    blends: [
      { label: 'Steady core', weights: { usStocks: 25, intlStocks: 10, metals: 10, crypto: 3, landReit: 10, bonds: 32, cash: 10 } },
      { label: 'Tangible tilt', weights: { usStocks: 20, intlStocks: 8, metals: 15, crypto: 3, landReit: 14, bonds: 30, cash: 10 } },
    ],
  },
  navigator: {
    id: 'navigator',
    name: 'The Navigator',
    tagline: 'Balanced, with a compass',
    description:
      'You can handle waves as long as the ship is pointed somewhere good. Your plan is the classic balanced course: growth assets do the heavy lifting, tangible assets add ballast, and a modest crypto sleeve adds upside without steering the ship.',
    color: '#D9A441',
    blends: [
      { label: 'Balanced classic', weights: { usStocks: 32, intlStocks: 13, metals: 12, crypto: 7, landReit: 15, bonds: 16, cash: 5 } },
      { label: 'Tangible tilt', weights: { usStocks: 27, intlStocks: 10, metals: 15, crypto: 10, landReit: 18, bonds: 15, cash: 5 } },
      { label: 'Equity lean', weights: { usStocks: 38, intlStocks: 14, metals: 10, crypto: 5, landReit: 13, bonds: 15, cash: 5 } },
    ],
  },
  trailblazer: {
    id: 'trailblazer',
    name: 'The Trailblazer',
    tagline: 'Growth is the plan',
    description:
      'You think in decades and treat downturns as discounts. Your plan is growth-forward — a large equity engine, meaningful alternative assets, and just enough defense to stay confident when markets get loud.',
    color: '#C97B4A',
    blends: [
      { label: 'Growth engine', weights: { usStocks: 47, intlStocks: 16, metals: 6, crypto: 12, landReit: 11, bonds: 5, cash: 3 } },
      { label: 'Alt heavy', weights: { usStocks: 35, intlStocks: 12, metals: 8, crypto: 15, landReit: 20, bonds: 7, cash: 3 } },
    ],
  },
  maverick: {
    id: 'maverick',
    name: 'The Maverick',
    tagline: 'Fortune favors the focused',
    description:
      'You have the stomach, the timeline, and the conviction for an aggressive ride. Your plan maximizes growth engines — equities and crypto — while keeping a small tangible anchor so bold never becomes reckless.',
    color: '#8B6FD8',
    blends: [
      { label: 'Full throttle', weights: { usStocks: 45, intlStocks: 15, metals: 8, crypto: 18, landReit: 10, bonds: 2, cash: 2 } },
      { label: 'Crypto conviction', weights: { usStocks: 40, intlStocks: 12, metals: 5, crypto: 25, landReit: 12, bonds: 4, cash: 2 } },
    ],
  },
};
