import type { ReactNode } from 'react';
import {
  Anchor,
  Banknote,
  Bitcoin,
  CalendarClock,
  CalendarRange,
  Coins,
  Compass,
  Eye,
  Flame,
  Gem,
  GraduationCap,
  HandCoins,
  Hand,
  Heart,
  HeartHandshake,
  Hourglass,
  Landmark,
  LandPlot,
  LifeBuoy,
  PiggyBank,
  Rocket,
  Scale,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  TrendingDown,
  TrendingUp,
  Umbrella,
  Wallet,
  Waves,
} from 'lucide-react';
import type { Answers } from '../types';

export interface CardOption {
  value: string;
  label: string;
  desc?: string;
  icon: ReactNode;
}

export type Question =
  | {
      kind: 'slider';
      id: string;
      field: 'capital' | 'monthly' | 'sleep' | 'premium';
      title: string;
      subtitle?: string;
      min: number;
      max: number;
      step: number;
      chips?: number[];
      money?: boolean;
      endLabels?: [string, string];
    }
  | {
      kind: 'single';
      id: string;
      field: 'timeline' | 'temperament' | 'cushion' | 'handsOn' | 'cryptoComfort' | 'tangibility' | 'insurance' | 'goal';
      title: string;
      subtitle?: string;
      options: CardOption[];
    }
  | {
      kind: 'multi';
      id: string;
      field: 'assets';
      title: string;
      subtitle?: string;
      options: CardOption[];
    };

const ALL_QUESTIONS: Question[] = [
  {
    kind: 'slider',
    id: 'capital',
    field: 'capital',
    title: 'Where does the journey begin?',
    subtitle: 'Your starting capital — the seed we are planting today.',
    min: 5000,
    max: 250000,
    step: 1000,
    money: true,
  },
  {
    kind: 'slider',
    id: 'monthly',
    field: 'monthly',
    title: 'What can you add along the way?',
    subtitle: 'Expendable income you can comfortably commit to investing each month.',
    min: 0,
    max: 3000,
    step: 25,
    money: true,
    chips: [100, 250, 500, 1000],
  },
  {
    kind: 'single',
    id: 'timeline',
    field: 'timeline',
    title: 'When might you need this money?',
    subtitle: 'Time is the most powerful ingredient in any plan.',
    options: [
      { value: 'lt2', label: 'Under 2 years', desc: 'Short trip — keep it safe', icon: <Hourglass /> },
      { value: 'y2_5', label: '2–5 years', desc: 'A medium horizon', icon: <CalendarClock /> },
      { value: 'y5_10', label: '5–10 years', desc: 'Room to grow', icon: <CalendarRange /> },
      { value: 'y10p', label: '10+ years', desc: 'The long game', icon: <Sprout /> },
    ],
  },
  {
    kind: 'single',
    id: 'temperament',
    field: 'temperament',
    title: 'Your portfolio drops 25% in a month. You...',
    subtitle: 'Be honest — there is no wrong answer, only the right plan for you.',
    options: [
      { value: 'sellAll', label: 'Sell everything', desc: 'Get me out of here', icon: <Umbrella /> },
      { value: 'sellSome', label: 'Sell some', desc: 'Trim the risk, breathe', icon: <Scale /> },
      { value: 'hold', label: 'Hold steady', desc: 'Storms pass', icon: <Anchor /> },
      { value: 'buyMore', label: 'Buy more', desc: 'Everything is on sale!', icon: <TrendingDown /> },
    ],
  },
  {
    kind: 'slider',
    id: 'sleep',
    field: 'sleep',
    title: 'The sleep test',
    subtitle: 'Slide to wherever feels true.',
    min: 0,
    max: 100,
    step: 1,
    endLabels: ['Boring & safe, please', 'Maximum growth — bring the swings'],
  },
  {
    kind: 'single',
    id: 'cushion',
    field: 'cushion',
    title: 'Do you have 3–6 months of expenses saved separately?',
    subtitle: 'An emergency fund is the foundation under every plan.',
    options: [
      { value: 'full', label: 'Yes, fully', desc: 'My cushion is comfy', icon: <ShieldCheck /> },
      { value: 'partial', label: 'Partially', desc: 'Working on it', icon: <Shield /> },
      { value: 'none', label: 'Not yet', desc: 'Let’s build one in', icon: <LifeBuoy /> },
    ],
  },
  {
    kind: 'multi',
    id: 'assets',
    field: 'assets',
    title: 'Which of these excites you?',
    subtitle: 'Pick as many as you like — your plan should feel like yours.',
    options: [
      { value: 'metals', label: 'Physical metals', desc: 'Gold & silver in hand', icon: <Gem /> },
      { value: 'stocks', label: 'Stocks & index funds', desc: 'Own the market', icon: <TrendingUp /> },
      { value: 'crypto', label: 'Cryptocurrency', desc: 'Digital frontier', icon: <Bitcoin /> },
      { value: 'land', label: 'Land & real estate', desc: 'They aren’t making more of it', icon: <LandPlot /> },
      { value: 'bonds', label: 'Bonds & CDs', desc: 'Steady income', icon: <Landmark /> },
      { value: 'cash', label: 'Cash equivalents', desc: 'Liquid & ready', icon: <Banknote /> },
    ],
  },
  {
    kind: 'single',
    id: 'handsOn',
    field: 'handsOn',
    title: 'How hands-on do you want to be?',
    options: [
      { value: 'set', label: 'Set & forget', desc: 'Automate it, I have a life', icon: <Coins /> },
      { value: 'monthly', label: 'Check monthly', desc: 'A regular pulse-check', icon: <Eye /> },
      { value: 'active', label: 'Actively manage', desc: 'I want my hands on the wheel', icon: <Hand /> },
    ],
  },
  {
    kind: 'single',
    id: 'cryptoComfort',
    field: 'cryptoComfort',
    title: 'How do you feel about crypto?',
    subtitle: 'This sets a hard ceiling — your plan will never exceed it.',
    options: [
      { value: 'none', label: 'None for me', desc: '0% — not my thing', icon: <Shield /> },
      { value: 'small', label: 'A small taste', desc: 'Up to 5%', icon: <Waves /> },
      { value: 'meaningful', label: 'A meaningful slice', desc: 'Up to 15%', icon: <Flame /> },
      { value: 'believer', label: 'I’m a believer', desc: 'Make it count', icon: <Rocket /> },
    ],
  },
  {
    kind: 'single',
    id: 'tangibility',
    field: 'tangibility',
    title: 'Do you like owning things you can touch?',
    options: [
      { value: 'strong', label: 'Strongly yes', desc: 'Metals & land speak to me', icon: <Gem /> },
      { value: 'somewhat', label: 'Somewhat', desc: 'A nice bonus', icon: <HandCoins /> },
      { value: 'indifferent', label: 'No preference', desc: 'Paper assets are fine', icon: <Wallet /> },
    ],
  },
  {
    kind: 'single',
    id: 'insurance',
    field: 'insurance',
    title: 'Protection that doubles as opportunity',
    subtitle:
      'Permanent life insurance builds cash value you can later borrow against (typically after a 2–5 year seasoning period) while protecting your family. Interested?',
    options: [
      { value: 'core', label: 'Yes — core piece', desc: 'Build it into the plan', icon: <HeartHandshake /> },
      { value: 'slice', label: 'Yes — small slice', desc: 'A modest premium', icon: <Heart /> },
      { value: 'later', label: 'Tell me more later', desc: 'Curious, not committing', icon: <Compass /> },
      { value: 'no', label: 'Not for me', desc: 'Skip it', icon: <Umbrella /> },
    ],
  },
  {
    kind: 'slider',
    id: 'premium',
    field: 'premium',
    title: 'What monthly premium feels comfortable?',
    subtitle: 'This comes out of your monthly contribution — your starting capital stays fully invested.',
    min: 50,
    max: 500,
    step: 10,
    money: true,
  },
  {
    kind: 'single',
    id: 'goal',
    field: 'goal',
    title: 'What is this money really for?',
    options: [
      { value: 'foundation', label: 'Wealth foundation', desc: 'The base of something big', icon: <Landmark /> },
      { value: 'purchase', label: 'A specific purchase', desc: 'Home, business, dream', icon: <ShoppingBag /> },
      { value: 'retirement', label: 'Retirement seed', desc: 'Future me says thanks', icon: <PiggyBank /> },
      { value: 'income', label: 'Passive income', desc: 'Money that makes money', icon: <HandCoins /> },
      { value: 'learning', label: 'Learning to invest', desc: 'Skills compound too', icon: <GraduationCap /> },
    ],
  },
];

export function visibleQuestions(a: Answers): Question[] {
  return ALL_QUESTIONS.filter((q) => {
    if (q.id === 'premium') return a.insurance === 'core' || a.insurance === 'slice';
    return true;
  });
}
