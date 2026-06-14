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
import { clearHoldings, type CustomHolding } from './logic/customPortfolio';

type Phase = 'intro' | 'quiz' | 'results' | 'projection';

const STATE_KEY = 'nelli-progress-v1';
const IDLE_LIMIT_MS = 20 * 60 * 1000; // reset a client session after 20 min idle
const WARN_SECONDS = 60;              // grace period (seconds) once the "still there?" warning shows
// Idle auto-reset is for shared/kiosk screens only — opt in with ?kiosk. On the
// public site each visitor is on their own device, so we never interrupt them
// and their session persists.
const KIOSK = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('kiosk');

interface SavedState {
  phase: Phase;
  qIndex: number;
  answers: Answers;
  blendIdx: number | null;
  customAllocation: AllocationLine[] | null;
  customHoldings?: CustomHolding[] | null;
  savedAt?: number;     // ms timestamp of last change — used to drop a stale session on load
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedState;
    if (!s || typeof s !== 'object' || !s.answers) return null;
    // Drop a session that has sat idle past the reset window (tab left open or
    // reopened much later) so the next person starts fresh.
    if (KIOSK && typeof s.savedAt === 'number' && Date.now() - s.savedAt > IDLE_LIMIT_MS) {
      localStorage.removeItem(STATE_KEY);
      return null;
    }
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
  const [customHoldings, setCustomHoldings] = useState<CustomHolding[] | null>(
    saved?.customHoldings ?? null,
  );
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('nelli-theme') as 'light' | 'dark') ?? 'light';
    } catch {
      return 'light';
    }
  });

  // Idle auto-reset: warn after IDLE_LIMIT_MS of no interaction, then reset.
  const [idleWarn, setIdleWarn] = useState(false);
  const [graceLeft, setGraceLeft] = useState(WARN_SECONDS);
  const lastActivityRef = useRef(0); // ms of last interaction; seeded in the effect below
  const idleWarnRef = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('nelli-theme', theme);
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
    setCustomHoldings(null);
  }, [profile.id]);

  // Persist progress so a refresh resumes where the user left off.
  useEffect(() => {
    try {
      localStorage.setItem(
        STATE_KEY,
        JSON.stringify({ phase, qIndex, answers, blendIdx, customAllocation, customHoldings, savedAt: Date.now() }),
      );
    } catch {
      /* storage unavailable */
    }
  }, [phase, qIndex, answers, blendIdx, customAllocation, customHoldings]);

  const applyCustom = (lines: AllocationLine[], holdings: CustomHolding[]) => {
    setCustomAllocation(lines);
    setCustomHoldings(holdings);
  };
  const clearCustom = () => {
    setCustomAllocation(null);
    setCustomHoldings(null);
  };

  const startOver = () => {
    try {
      localStorage.removeItem(STATE_KEY);
      clearHoldings(); // also drop the builder's saved working holdings (nelli-custom-portfolio)
    } catch {
      /* storage unavailable */
    }
    setAnswers(initialAnswers);
    setBlendIdx(null);
    setCustomAllocation(null);
    setCustomHoldings(null);
    setQIndex(0);
    setPhase('intro');
    setIdleWarn(false);
  };

  // Mirror the warning flag into a ref so the (window-level) activity listener
  // can read it without re-subscribing on every toggle.
  useEffect(() => {
    idleWarnRef.current = idleWarn;
  }, [idleWarn]);

  // Track interaction; once IDLE_LIMIT_MS passes with none, raise the warning.
  // Any interaction (incl. moving the mouse) dismisses a showing warning.
  useEffect(() => {
    if (!KIOSK) return; // auto-reset only in kiosk mode (?kiosk); public sessions persist
    lastActivityRef.current = Date.now(); // seed on mount; refresh on phase change
    const bump = () => {
      lastActivityRef.current = Date.now();
      if (idleWarnRef.current) setIdleWarn(false);
    };
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const watch = window.setInterval(() => {
      if (phase !== 'intro' && Date.now() - lastActivityRef.current > IDLE_LIMIT_MS) {
        setGraceLeft(WARN_SECONDS);
        setIdleWarn(true);
      }
    }, 5000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(watch);
    };
  }, [phase]);

  // While the warning is up, count down and reset when it runs out.
  useEffect(() => {
    if (!idleWarn) return;
    const deadline = Date.now() + WARN_SECONDS * 1000;
    const iv = window.setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left <= 0) {
        window.clearInterval(iv);
        startOver();
      } else {
        setGraceLeft(left);
      }
    }, 250);
    return () => window.clearInterval(iv);
  }, [idleWarn]);

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
          <img className="brand-mark" src="/celestial-horse.jpg" alt="" aria-hidden="true" />
          Nelli <em>· Financial Vision Casting</em>
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
                customHoldings={customHoldings}
                onApplyCustom={applyCustom}
                onClearCustom={clearCustom}
                answers={answers}
                blendIdx={blendIdx}
                onSelectBlend={(idx) => {
                  clearCustom();
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
                customHoldings={customAllocation ? customHoldings : null}
                onBack={() => setPhase('results')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="app-footer">
        Educational tool for discussion purposes. Not licensed financial advice.
      </footer>

      {idleWarn && (
        <div className="modal-overlay" role="alertdialog" aria-label="Session about to reset">
          <div className="modal-box session-timeout">
            <h2>Still there?</h2>
            <p>
              For privacy between client sessions, this will reset to a fresh start in{' '}
              <strong>{graceLeft}s</strong>.
            </p>
            <div className="modal-actions">
              <button
                className="btn primary"
                onClick={() => {
                  lastActivityRef.current = Date.now();
                  setIdleWarn(false);
                }}
              >
                Keep going
              </button>
              <button className="btn ghost" onClick={startOver}>
                Start fresh now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
