import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, PiggyBank, X } from 'lucide-react';
import type { Question } from '../data/questions';
import type { Answers } from '../types';
import { fmtMoney } from '../logic/projections';

interface Props {
  question: Question;
  answers: Answers;
  onChange: (patch: Partial<Answers>) => void;
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.3 },
  }),
};

export default function QuestionScreen({ question, answers, onChange, onNext, onBack, canGoBack }: Props) {
  const q = question;
  const [showSavings, setShowSavings] = useState(false);
  const [goalAmt, setGoalAmt] = useState(answers.savingsGoal > 0 ? answers.savingsGoal : 3000);
  const [goalMonths, setGoalMonths] = useState(answers.savingsMonths > 0 ? answers.savingsMonths : 12);

  const answered = (() => {
    if (q.kind === 'slider') return true;
    if (q.kind === 'multi') return answers.assets.length > 0;
    return answers[q.field] !== null;
  })();

  const handleSingle = (field: string, value: string) => {
    if (field === 'cushion') {
      if (value === 'partial' || value === 'none') {
        onChange({ cushion: value as Answers['cushion'] });
        setShowSavings(true);
        return;
      }
      onChange({ cushion: 'full', savingsGoal: 0 });
      setTimeout(onNext, 320);
      return;
    }
    onChange({ [field]: value } as Partial<Answers>);
    setTimeout(onNext, 320);
  };

  const perMonth = Math.ceil(goalAmt / Math.max(1, goalMonths));

  return (
    <div className="question-screen">
      <motion.h2
        className="question-title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {q.title}
      </motion.h2>
      {q.subtitle && (
        <motion.p
          className="question-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          {q.subtitle}
        </motion.p>
      )}

      {q.kind === 'slider' && (
        <motion.div className="slider-block" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <div className="slider-value">
            {q.money ? fmtMoney(answers[q.field]) : `${answers[q.field]}`}
            {q.field === 'monthly' || q.field === 'premium' ? <span className="per-month"> / month</span> : null}
          </div>
          <input
            type="range"
            min={q.min}
            max={q.max}
            step={q.step}
            value={answers[q.field]}
            onChange={(e) => onChange({ [q.field]: Number(e.target.value) } as Partial<Answers>)}
          />
          {q.endLabels && (
            <div className="slider-ends">
              <span>{q.endLabels[0]}</span>
              <span>{q.endLabels[1]}</span>
            </div>
          )}
          {q.chips && (
            <div className="chips">
              {q.chips.map((c) => (
                <button
                  key={c}
                  className={`chip ${answers[q.field] === c ? 'active' : ''}`}
                  onClick={() => onChange({ [q.field]: c } as Partial<Answers>)}
                >
                  {fmtMoney(c)}
                </button>
              ))}
            </div>
          )}
          {q.field === 'premium' && (
            <div className="premium-note">
              Remaining for investments:{' '}
              <strong>{fmtMoney(Math.max(0, answers.monthly - answers.premium))} / month</strong>
              {answers.premium > answers.monthly && (
                <span className="warn"> — premium exceeds your monthly contribution</span>
              )}
            </div>
          )}
        </motion.div>
      )}

      {q.kind === 'single' && (
        <div className={`card-grid n${q.options.length}`}>
          {q.options.map((opt, i) => {
            const selected = answers[q.field] === opt.value;
            return (
              <motion.button
                key={opt.value}
                className={`answer-card ${selected ? 'selected' : ''}`}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                whileHover={{ y: -4, scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSingle(q.field, opt.value)}
              >
                <span className="card-icon">{opt.icon}</span>
                <span className="card-label">{opt.label}</span>
                {opt.desc && <span className="card-desc">{opt.desc}</span>}
                {selected && (
                  <motion.span className="card-check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={14} />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {q.kind === 'multi' && (
        <div className={`card-grid n${q.options.length}`}>
          {q.options.map((opt, i) => {
            const selected = answers.assets.includes(opt.value);
            return (
              <motion.button
                key={opt.value}
                className={`answer-card ${selected ? 'selected' : ''}`}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                whileHover={{ y: -4, scale: 1.015 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const assets = selected
                    ? answers.assets.filter((v) => v !== opt.value)
                    : [...answers.assets, opt.value];
                  onChange({ assets });
                }}
              >
                <span className="card-icon">{opt.icon}</span>
                <span className="card-label">{opt.label}</span>
                {opt.desc && <span className="card-desc">{opt.desc}</span>}
                {selected && (
                  <motion.span className="card-check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check size={14} />
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="nav-row">
        <button className="btn ghost" onClick={onBack} disabled={!canGoBack}>
          <ArrowLeft size={16} /> Back
        </button>
        {(q.kind === 'slider' || q.kind === 'multi') && (
          <button className="btn primary" onClick={onNext} disabled={!answered}>
            Continue <ArrowRight size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSavings && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-box savings-modal"
              initial={{ scale: 0.92, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => {
                  setShowSavings(false);
                  onChange({ savingsGoal: 0 });
                  onNext();
                }}
                aria-label="Skip"
              >
                <X size={18} />
              </button>
              <div className="savings-head">
                <span className="savings-icon">
                  <PiggyBank size={26} />
                </span>
                <h3>Set a cash savings goal</h3>
                <p>
                  Let’s build that cushion in. How much would you like set aside, and by when? We’ll
                  bake the monthly amount into your plan.
                </p>
              </div>
              <div className="dial">
                <label>
                  Savings goal <strong>{fmtMoney(goalAmt)}</strong>
                </label>
                <input
                  type="range"
                  min={500}
                  max={30000}
                  step={250}
                  value={goalAmt}
                  onChange={(e) => setGoalAmt(Number(e.target.value))}
                />
              </div>
              <div className="dial">
                <label>
                  Timeframe <strong>{goalMonths} months</strong>
                </label>
                <input
                  type="range"
                  min={3}
                  max={36}
                  step={1}
                  value={goalMonths}
                  onChange={(e) => setGoalMonths(Number(e.target.value))}
                />
              </div>
              <div className="savings-result">
                That’s <strong>{fmtMoney(perMonth)}/mo</strong> toward your safety net
                {perMonth > answers.monthly && (
                  <span className="warn"> — more than your monthly contribution; consider a longer timeframe</span>
                )}
              </div>
              <div className="modal-actions">
                <button
                  className="btn primary"
                  onClick={() => {
                    onChange({ savingsGoal: goalAmt, savingsMonths: goalMonths });
                    setShowSavings(false);
                    onNext();
                  }}
                >
                  Set goal & continue
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    onChange({ savingsGoal: 0 });
                    setShowSavings(false);
                    onNext();
                  }}
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
