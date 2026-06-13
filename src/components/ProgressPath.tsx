import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';

interface Props {
  current: number; // 0-based index
  total: number;
}

export default function ProgressPath({ current, total }: Props) {
  const pct = total <= 1 ? 0 : (current / (total - 1)) * 100;
  return (
    <div className="progress-path" aria-label={`Question ${current + 1} of ${total}`}>
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        />
        {Array.from({ length: total }).map((_, i) => {
          const done = i <= current;
          return (
            <motion.div
              key={i}
              className={`progress-dot ${done ? 'done' : ''}`}
              style={{ left: `${(i / (total - 1)) * 100}%` }}
              animate={{ scale: i === current ? 1.45 : done ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
            />
          );
        })}
        <motion.div
          className="progress-pin"
          animate={{ left: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        >
          <MapPin size={18} />
        </motion.div>
      </div>
      <span className="progress-label">
        Step {current + 1} of {total}
      </span>
    </div>
  );
}
