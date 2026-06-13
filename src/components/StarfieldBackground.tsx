import { useEffect, useRef } from 'react';

// A lush, animated constellation backdrop for dark mode. Twinkling stars on a
// deep-navy nebula gradient, with slow parallax drift and the occasional
// shooting star. Renders to a full-screen canvas behind all app content.
// Honours prefers-reduced-motion by drawing a single static frame.

interface Star {
  x: number;       // 0..1 normalised
  y: number;       // 0..1 normalised
  r: number;       // radius px
  base: number;    // base alpha
  speed: number;   // twinkle speed
  phase: number;   // twinkle phase
  gold: boolean;   // gold vs white
  drift: number;   // vertical drift px/sec
}

interface Shooter {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

export default function StarfieldBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let shooters: Shooter[] = [];
    let raf = 0;
    let nextShooter = 2.5;

    const buildStars = () => {
      const density = (w * h) / 9000; // ~ area based
      const count = Math.max(120, Math.min(320, Math.round(density)));
      stars = Array.from({ length: count }, () => {
        const big = Math.random() < 0.12;
        return {
          x: Math.random(),
          y: Math.random(),
          r: big ? 1.3 + Math.random() * 1.4 : 0.5 + Math.random() * 1,
          base: 0.35 + Math.random() * 0.55,
          speed: 0.4 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
          gold: Math.random() < 0.22,
          drift: 1 + Math.random() * 5,
        };
      });
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    };

    const paintBackdrop = () => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#070b16');
      g.addColorStop(0.55, '#0a1020');
      g.addColorStop(1, '#0b1224');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const n1 = ctx.createRadialGradient(w * 0.5, -h * 0.12, 0, w * 0.5, -h * 0.12, h * 0.8);
      n1.addColorStop(0, 'rgba(31, 48, 94, 0.5)');
      n1.addColorStop(1, 'rgba(31, 48, 94, 0)');
      ctx.fillStyle = n1;
      ctx.fillRect(0, 0, w, h);

      const n2 = ctx.createRadialGradient(w * 0.9, h * 1.05, 0, w * 0.9, h * 1.05, h * 0.7);
      n2.addColorStop(0, 'rgba(217, 164, 65, 0.10)');
      n2.addColorStop(1, 'rgba(217, 164, 65, 0)');
      ctx.fillStyle = n2;
      ctx.fillRect(0, 0, w, h);
    };

    const drawStar = (s: Star, alpha: number) => {
      const px = s.x * w;
      const py = s.y * h;
      ctx.beginPath();
      ctx.arc(px, py, s.r, 0, Math.PI * 2);
      ctx.fillStyle = s.gold
        ? `rgba(217, 164, 65, ${alpha})`
        : `rgba(233, 237, 246, ${alpha})`;
      ctx.fill();
      if (s.r > 1.5) {
        ctx.beginPath();
        ctx.arc(px, py, s.r * 2.6, 0, Math.PI * 2);
        ctx.fillStyle = s.gold
          ? `rgba(217, 164, 65, ${alpha * 0.12})`
          : `rgba(233, 237, 246, ${alpha * 0.1})`;
        ctx.fill();
      }
    };

    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      paintBackdrop();

      for (const s of stars) {
        s.y += (s.drift * dt) / h;
        if (s.y > 1.02) {
          s.y = -0.02;
          s.x = Math.random();
        }
        const tw = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        drawStar(s, Math.min(1, s.base * (0.45 + 0.7 * tw)));
      }

      // shooting stars
      nextShooter -= dt;
      if (nextShooter <= 0) {
        nextShooter = 5 + Math.random() * 8;
        const startX = Math.random() * w * 0.7;
        const startY = Math.random() * h * 0.4;
        const ang = Math.PI * (0.12 + Math.random() * 0.12);
        const sp = 520 + Math.random() * 260;
        shooters.push({
          x: startX,
          y: startY,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          life: 0,
          max: 0.9 + Math.random() * 0.5,
        });
      }
      shooters = shooters.filter((sh) => sh.life < sh.max);
      for (const sh of shooters) {
        sh.life += dt;
        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;
        const fade = 1 - sh.life / sh.max;
        const tailX = sh.x - sh.vx * 0.06;
        const tailY = sh.y - sh.vy * 0.06;
        const grad = ctx.createLinearGradient(tailX, tailY, sh.x, sh.y);
        grad.addColorStop(0, 'rgba(233, 237, 246, 0)');
        grad.addColorStop(1, `rgba(233, 237, 246, ${0.8 * fade})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(sh.x, sh.y);
        ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    if (reduced) {
      paintBackdrop();
      for (const s of stars) drawStar(s, s.base);
    } else {
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={ref} className="starfield-bg" aria-hidden="true" />;
}
