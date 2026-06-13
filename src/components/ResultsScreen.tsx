import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  ChevronDown,
  PiggyBank,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { AllocationLine, Answers, ProfileDef } from '../types';
import { BREAKDOWNS } from '../logic/allocation';
import { fmtMoney, savingsPlan } from '../logic/projections';
import CustomPortfolioBuilder from './CustomPortfolioBuilder';

interface Props {
  profile: ProfileDef;
  allocation: AllocationLine[];
  customAllocation: AllocationLine[] | null;
  onApplyCustom: (lines: AllocationLine[]) => void;
  onClearCustom: () => void;
  answers: Answers;
  blendIdx: number | null;
  onSelectBlend: (idx: number | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function ResultsScreen({
  profile,
  allocation,
  customAllocation,
  onApplyCustom,
  onClearCustom,
  answers,
  blendIdx,
  onSelectBlend,
  onContinue,
  onBack,
}: Props) {
  const [showBuilder, setShowBuilder] = useState(false);
  const customActive = customAllocation !== null;
  const display = customAllocation ?? allocation;
  const insuranceOn = answers.insurance === 'core' || answers.insurance === 'slice';
  const savings = savingsPlan(answers);
  const investMonthly = Math.max(
    0,
    answers.monthly - (insuranceOn ? answers.premium : 0) - savings.perMonth,
  );
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="results-screen">
      <motion.div
        className="profile-badge"
        style={{ background: profile.color }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 110, damping: 13, delay: 0.2 }}
      >
        <Award size={42} />
      </motion.div>

      <motion.p className="reveal-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        Your investor profile
      </motion.p>
      <motion.h2
        className="profile-name"
        style={{ color: profile.color }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {profile.name}
      </motion.h2>
      <motion.p className="profile-tagline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>
        {profile.tagline}
      </motion.p>
      <motion.p className="profile-desc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        {profile.description}
      </motion.p>

      <motion.div
        className="allocation-panel"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05 }}
      >
        <h3>Your {fmtMoney(answers.capital)}, put to work</h3>
        <p className="panel-hint">Only assets you said excite you are included. Tap any row to see what it’s made of.</p>

        {customActive ? (
          <div className="custom-banner">
            <Sparkles size={16} />
            <span>You’re using your own custom portfolio.</span>
            <button className="custom-edit" onClick={() => setShowBuilder(true)}>
              <SlidersHorizontal size={14} /> Edit
            </button>
            <button className="custom-reset" onClick={onClearCustom}>
              <RotateCcw size={14} /> Reset to suggested
            </button>
          </div>
        ) : (
          <div className="blend-chips">
            <button className={`chip ${blendIdx === null ? 'active' : ''}`} onClick={() => onSelectBlend(null)}>
              Suggested
            </button>
            {profile.blends.map((b, i) => (
              <button key={b.label} className={`chip ${blendIdx === i ? 'active' : ''}`} onClick={() => onSelectBlend(i)}>
                {b.label}
              </button>
            ))}
            <button className="chip build-custom" onClick={() => setShowBuilder(true)}>
              <SlidersHorizontal size={14} /> Build custom
            </button>
          </div>
        )}

        <div className="allocation-flex">
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  key={display.map((a) => a.key + a.pct).join('-')}
                  data={display}
                  dataKey="dollars"
                  nameKey="label"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  strokeWidth={0}
                  isAnimationActive
                >
                  {display.map((a) => (
                    <Cell key={a.key} fill={a.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">
              <span>{fmtMoney(answers.capital)}</span>
              <small>invested</small>
            </div>
          </div>
          <ul className="allocation-list">
            {display.map((a) => {
              const bd = BREAKDOWNS[a.key];
              const open = openKey === a.key;
              return (
                <li key={a.key} className={`alloc-item ${open ? 'open' : ''}`}>
                  <button className="alloc-row" onClick={() => setOpenKey(open ? null : a.key)}>
                    <span className="swatch" style={{ background: a.color }} />
                    <span className="alloc-label">
                      {a.label}
                      {a.note && <em className="alloc-note"> · {a.note}</em>}
                    </span>
                    <span className="alloc-num">
                      {a.pct}% · <strong>{fmtMoney(a.dollars)}</strong>
                    </span>
                    <ChevronDown size={16} className="alloc-chev" />
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        className="breakdown"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <p className="bd-intro">{bd.intro}</p>
                        {bd.lines.map((l) => (
                          <div key={l.name} className="bd-line">
                            <span className="bd-name">{l.name}</span>
                            <span className="bd-num">
                              {l.pct}% · {fmtMoney(Math.round((l.pct / 100) * a.dollars))}
                            </span>
                            {l.note && <span className="bd-note">{l.note}</span>}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>

        {savings.active && (
          <div className="savings-card">
            <PiggyBank size={22} />
            <div>
              <strong>
                Safety net first — {fmtMoney(savings.perMonth)}/mo for {savings.months} months
              </strong>
              <p>
                Builds your {fmtMoney(savings.goal)} cash cushion by month {savings.months}. Once
                funded, that {fmtMoney(savings.perMonth)}/mo automatically flows into your
                investments — it’s already modeled into your projections.
              </p>
            </div>
          </div>
        )}

        {insuranceOn && (
          <div className="insurance-card">
            <ShieldCheck size={22} />
            <div>
              <strong>Cash-value life insurance — {fmtMoney(answers.premium)}/mo premium</strong>
              <p>
                Cash value becomes borrowable after a typical 2–5 year seasoning period — a future
                source of opportunity capital. Funded from your monthly contribution, so your{' '}
                {fmtMoney(answers.capital)} stays fully invested.
              </p>
            </div>
          </div>
        )}

        <div className="dca-note">
          Your <strong>{fmtMoney(investMonthly)}/mo</strong> contribution
          {insuranceOn || savings.active
            ? ` (after ${[
                insuranceOn ? `the ${fmtMoney(answers.premium)} premium` : '',
                savings.active ? `${fmtMoney(savings.perMonth)} safety-net savings` : '',
              ]
                .filter(Boolean)
                .join(' and ')})`
            : ''}{' '}
          auto-splits across
          this same mix every month — that steady rhythm is called <em>dollar-cost averaging</em>,
          and it quietly buys more when prices dip.
        </div>
      </motion.div>

      <motion.div className="nav-row center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
        <button className="btn ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Change my answers
        </button>
        <motion.button
          className="btn primary large"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onContinue}
        >
          See your growth projection <ArrowRight size={18} />
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showBuilder && (
          <CustomPortfolioBuilder
            capital={answers.capital}
            suggested={display}
            onApply={(lines) => {
              onApplyCustom(lines);
              setShowBuilder(false);
            }}
            onClose={() => setShowBuilder(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
