import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ImageDown, Unlock } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts';
import type { AllocationLine, Answers, ProfileDef } from '../types';
import { allocationWeights } from '../logic/allocation';
import { fmtCompact, fmtMoney, project, savingsPlan } from '../logic/projections';
import SummaryModal from './SummaryModal';

interface Props {
  answers: Answers;
  profile: ProfileDef;
  allocation: AllocationLine[];
  onBack: () => void;
}

const HORIZONS = [5, 10, 20, 30];

export default function ProjectionScreen({ answers, profile, allocation, onBack }: Props) {
  const insuranceOn = answers.insurance === 'core' || answers.insurance === 'slice';
  const savings = savingsPlan(answers);
  const [monthly, setMonthly] = useState(answers.monthly);
  const [premium, setPremium] = useState(insuranceOn ? answers.premium : 0);
  const [showSummary, setShowSummary] = useState(false);

  const investMonthly = Math.max(0, monthly - premium - savings.perMonth);
  const weights = useMemo(() => allocationWeights(allocation), [allocation]);
  const points = useMemo(
    () =>
      project(
        answers.capital,
        investMonthly,
        insuranceOn ? premium : 0,
        weights,
        30,
        savings.perMonth,
        savings.active ? savings.months : 0,
      ),
    [answers.capital, investMonthly, premium, insuranceOn, weights, savings],
  );

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        year: p.year,
        Conservative: p.cons + p.cvCons,
        Expected: p.exp + p.cvExp,
        Optimistic: p.opt + p.cvOpt,
        'Insurance cash value': insuranceOn ? p.cvExp : 0,
      })),
    [points, insuranceOn],
  );

  const borrowable = insuranceOn ? Math.round(points[3].cvExp * 0.9) : 0;

  return (
    <div className="projection-screen">
      <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        Where this path leads
      </motion.h2>
      <motion.p className="question-subtitle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        Adjust the dials and watch the future redraw itself.
      </motion.p>

      <motion.div className="dials" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="dial">
          <label>
            Monthly contribution <strong>{fmtMoney(monthly)}</strong>
          </label>
          <input type="range" min={0} max={3000} step={25} value={monthly} onChange={(e) => setMonthly(Number(e.target.value))} />
        </div>
        {insuranceOn && (
          <div className="dial">
            <label>
              Insurance premium <strong>{fmtMoney(premium)}</strong>
            </label>
            <input type="range" min={0} max={500} step={10} value={premium} onChange={(e) => setPremium(Number(e.target.value))} />
          </div>
        )}
        <div className="dial readout">
          <span>Investing {fmtMoney(investMonthly)}/mo</span>
          {insuranceOn && <span> · Premium {fmtMoney(premium)}/mo</span>}
          {savings.active && <span> · Safety net {fmtMoney(savings.perMonth)}/mo</span>}
        </div>
      </motion.div>

      {savings.active && (
        <motion.p className="savings-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          Safety net fully funded ({fmtMoney(savings.goal)}) around month {savings.months} — after
          that, the {fmtMoney(savings.perMonth)}/mo flows into investments. Already modeled in.
        </motion.p>
      )}

      <motion.div className="chart-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={chartData} margin={{ top: 12, right: 18, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="#E8E2D6" />
            <XAxis dataKey="year" tick={{ fill: '#6B7A86', fontSize: 12 }} tickFormatter={(v) => `Yr ${v}`} />
            <YAxis tick={{ fill: '#6B7A86', fontSize: 12 }} tickFormatter={(v) => fmtCompact(Number(v))} width={64} />
            <Tooltip formatter={(v) => fmtMoney(Number(v))} labelFormatter={(l) => `Year ${l}`} />
            <Legend />
            {insuranceOn && (
              <Area
                type="monotone"
                dataKey="Insurance cash value"
                fill="#E26D8C33"
                stroke="#E26D8C"
                strokeDasharray="5 4"
              />
            )}
            <Line type="monotone" dataKey="Conservative" stroke="#5B8DB8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Expected" stroke="#2F8F7B" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="Optimistic" stroke="#D9A441" strokeWidth={2} dot={false} />
            {insuranceOn && (
              <ReferenceLine
                x={3}
                stroke="#E26D8C"
                strokeDasharray="4 4"
                label={{ value: 'borrowing typically unlocks', position: 'top', fill: '#E26D8C', fontSize: 11 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {insuranceOn && (
          <div className="borrow-callout">
            <Unlock size={16} /> Around year 3, an estimated <strong>{fmtMoney(borrowable)}</strong> of
            insurance cash value (~90%) becomes borrowable — opportunity capital without selling a thing.
          </div>
        )}
        <p className="chart-caption">Projections are illustrative assumptions, not guarantees.</p>
      </motion.div>

      <div className="stat-grid">
        {HORIZONS.map((h, i) => {
          const p = points[h];
          return (
            <motion.div
              key={h}
              className="stat-card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <h4>Year {h}</h4>
              <div className="stat-row contributed">
                <span>Contributed</span>
                <span>{fmtMoney(p.contributed)}</span>
              </div>
              <div className="stat-row">
                <span>Conservative</span>
                <span>{fmtCompact(p.cons + p.cvCons)}</span>
              </div>
              <div className="stat-row expected">
                <span>Expected</span>
                <span>{fmtCompact(p.exp + p.cvExp)}</span>
              </div>
              <div className="stat-row">
                <span>Optimistic</span>
                <span>{fmtCompact(p.opt + p.cvOpt)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="nav-row center">
        <button className="btn ghost" onClick={onBack}>
          <ArrowLeft size={16} /> Back to plan
        </button>
        <button className="btn primary" onClick={() => setShowSummary(true)}>
          <ImageDown size={16} /> Create summary
        </button>
      </div>

      <AnimatePresence>
        {showSummary && (
          <SummaryModal
            answers={answers}
            profile={profile}
            allocation={allocation}
            points={points}
            monthly={monthly}
            premium={insuranceOn ? premium : 0}
            insuranceOn={insuranceOn}
            onClose={() => setShowSummary(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
