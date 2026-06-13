import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, RotateCcw, Sun } from 'lucide-react';
import type { AllocationLine, Answers } from './types';
import { initialAnswers } from './types';
import { visibleQuestions } from './data/questions';
import { PROFILES, profileFor, riskScore } from './logic/scoring';
import { computeAllocation } from './logic/allocation';
import IntroScreen from './components/IntroScreen';
import QuestionScreen from './components/QuestionScreen';
import ResultsScreen from './components/ResultsScreen';
import ProjectionScreen from './components/ProjectionScreen';
import ProgressPath from './components/ProgressPath';
import StarfieldBackground from './components/StarfieldBackground';

type Phase = 'intro' | 'quiz' | 'results' | 'projection';

const STATE_KEY = 'pathfinder-progress-v1';

interface SavedState {
  phase: Phase;
  qIndex: number;
  answers: Answers;
  blendIdx: number | null;
  customAllocation: AllocationLine[] | null;
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedState;
    if (!s || typeof s !== 'object' || !s.answers) return null;
    return s;
  } catch {
    return null;
  }
}

export default function App() {
  const saved = loadState();
  const [phase, setPhase] = useState<Phase>(saved?.phase ?? 'intro');
  const [qIndex, setQIndex] = useState(saved?.qIndex ?? 0);
  const [answers, setAnswers] = useState<Answers>(saved?.answers ?? initialAnswers);
  const [blendIdx, setBlendIdx] = useState<number | null>(saved?.blendIdx ?? null);
  const [customAllocation, setCustomAllocation] = useState<AllocationLine[] | null>(
    saved?.customAllocation ?? null,
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('pathfinder-theme') as 'light' | 'dark') ?? 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('pathfinder-theme', theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const questions = useMemo(() => visibleQuestions(answers), [answers]);
  const profile = useMemo(() => PROFILES[profileFor(riskScore(answers))], [answers]);
  const allocation = useMemo(
    () =>
      computeAllocation(
        answers,
        profile.id,
        blendIdx === null ? undefined : profile.blends[blendIdx]?.weights,
      ),
    [answers, profile, blendIdx],
  );

  // Reset blend/custom when the profile changes — but not on the initial mount,
  // so a restored session keeps its saved blend and custom portfolio.
  const firstProfileRun = useRef(true);
  useEffect(() => {
    if (firstProfileRun.current) {
      firstProfileRun.current = false;
      return;
    }
    setBlendIdx(null);
    setCustomAllocation(null);
  }, [profile.id]);

  // Persist progress so a refresh resumes where the user left off.
  useEffect(() => {
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({ phase, qIndex, answers, blendIdx, customAllocation }),
      );
    } catch {
      /* storage unavailable */
    }
  }, [phase, qIndex, answers, blendIdx, customAllocation]);

  const startOver = () => {
    try {
      localStorage.removeItem(STATE_KEY);
    } catch {
      /* storage unavailable */
    }
    setAnswers(initialAnswers);
    setBlendIdx(null);
    setCustomAllocation(null);
    setQIndex(0);
    setPhase('intro');
  };

  const effectiveAllocation = customAllocation ?? allocation;

  const patch = (p: Partial<Answers>) => setAnswers((a) => ({ ...a, ...p }));

  const next = () => {
    if (qIndex < questions.length - 1) setQIndex(qIndex + 1);
    else setPhase('results');
  };
  const back = () => {
    if (qIndex > 0) setQIndex(qIndex - 1);
    else setPhase('intro');
  };

  const screenKey =
    phase === 'quiz' ? `q-${questions[Math.min(qIndex, questions.length - 1)].id}` : phase;

  return (
    <div className="app">
      {theme === 'dark' && <StarfieldBackground />}
      <header className="app-header">
        <span className="brand">
          Pathfinder <em>· Investment Discovery</em>
        </span>
        {phase === 'quiz' && <ProgressPath current={qIndex} total={questions.length} />}
        <div className="header-actions">
          {phase !== 'intro' && (
            <button
              className="theme-toggle"
              onClick={startOver}
              aria-label="Start over"
              title="Start over"
            >
              <RotateCcw size={17} />
            </button>
          )}
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle dark mode"
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={screenKey}
            className="screen"
            initial={{ opacity: 0, x: 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -48 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.8 }}
          >
            {phase === 'intro' && (
              <IntroScreen
                onStart={() => {
                  setQIndex(0);
                  setPhase('quiz');
                }}
              />
            )}
            {phase === 'quiz' && (
              <QuestionScreen
                question={questions[Math.min(qIndex, questions.length - 1)]}
                answers={answers}
                onChange={patch}
                onNext={next}
                onBack={back}
                canGoBack
              />
            )}
            {phase === 'results' && (
              <ResultsScreen
                profile={profile}
                allocation={allocation}
                customAllocation={customAllocation}
                onApplyCustom={setCustomAllocation}
                onClearCustom={() => setCustomAllocation(null)}
                answers={answers}
                blendIdx={blendIdx}
                onSelectBlend={(idx) => {
                  setCustomAllocation(null);
                  setBlendIdx(idx);
                }}
                onContinue={() => setPhase('projection')}
                onBack={() => {
                  setQIndex(questions.length - 1);
                  setPhase('quiz');
                }}
              />
            )}
            {phase === 'projection' && (
              <ProjectionScreen
                answers={answers}
                profile={profile}
                allocation={effectiveAllocation}
                onBack={() => setPhase('results')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="app-footer">
        Educational tool for discussion purposes. Not licensed financial advice.
      </footer>
    </div>
  );
}
