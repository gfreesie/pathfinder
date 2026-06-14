// The "Nelli" logotype: Playfair Display with a shiny radial star dotting the i.
// Size is controlled by the parent's font-size; the star scales with it (em-based).
// The shared #nelliStar gradient is rendered once by App (see NelliStarDefs).

interface Props {
  className?: string;
}

export default function Wordmark({ className = '' }: Props) {
  return (
    <span className={`nelli-wm ${className}`} aria-label="Nelli">
      <span aria-hidden="true">Nell</span>
      <span className="nelli-i" aria-hidden="true">
        i
        <svg className="nelli-star" viewBox="0 0 24 24">
          <polygon
            points="12,0 14.1,9.9 24,12 14.1,14.1 12,24 9.9,14.1 0,12 9.9,9.9"
            fill="url(#nelliStar)"
          />
        </svg>
      </span>
    </span>
  );
}

// Renders the shared radial-gradient definition once (the star references it by id).
// Stop colors come from CSS vars so the star re-tints per theme (blue / gold).
export function NelliStarDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <defs>
        <radialGradient id="nelliStar" cx="0.38" cy="0.34" r="0.75">
          <stop className="nelli-g0" offset="0" />
          <stop className="nelli-g1" offset="0.5" />
          <stop className="nelli-g2" offset="1" />
        </radialGradient>
      </defs>
    </svg>
  );
}
