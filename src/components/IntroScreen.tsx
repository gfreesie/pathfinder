import { motion } from 'framer-motion';

interface Props {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: Props) {
  return (
    <div className="intro-screen">
      <motion.div
        className="nelli-hero"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16 }}
      >
        <img src="/celestial-horse.jpg" alt="Nelli — a celestial horse cast in the stars" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        Nelli
      </motion.h1>
      <motion.p
        className="intro-sub"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Financial Vision Casting
      </motion.p>
      <motion.p
        className="intro-copy"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        Thirteen quick questions. No jargon, no judgment — just an honest map of how you want your
        money to work, and a plan that fits the way you actually think.
      </motion.p>
      <motion.button
        className="btn primary large"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
      >
        Begin the journey
      </motion.button>
    </div>
  );
}
