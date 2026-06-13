import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';

interface Props {
  onStart: () => void;
}

export default function IntroScreen({ onStart }: Props) {
  return (
    <div className="intro-screen">
      <motion.div
        className="intro-badge"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 12 }}
      >
        <Compass size={44} />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        Pathfinder
      </motion.h1>
      <motion.p
        className="intro-sub"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        Investment Discovery
      </motion.p>
      <motion.p
        className="intro-copy"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Thirteen quick questions. No jargon, no judgment — just an honest map of how you want your
        money to work, and a plan that fits the way you actually think.
      </motion.p>
      <motion.button
        className="btn primary large"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
      >
        Begin the journey
      </motion.button>
    </div>
  );
}
