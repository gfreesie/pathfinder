import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import type { AllocationLine, Answers, ProfileDef } from '../types';
import type { YearPoint } from '../logic/projections';
import { fmtCompact, fmtMoney, savingsPlan } from '../logic/projections';
import { buildSummary } from '../logic/exportSummary';

interface Props {
  answers: Answers;
  profile: ProfileDef;
  allocation: AllocationLine[];
  points: YearPoint[];
  monthly: number;
  premium: number;
  insuranceOn: boolean;
  onClose: () => void;
}

type CardTheme = 'light' | 'dark';

const W = 900;
const H = 1560;

const PALETTES = {
  light: {
    bg: '#FAF8F4',
    ink: '#22303A',
    muted: '#6B7A86',
    headerFrom: '#2F8F7B',
    headerTo: '#1F6B5B',
    headerText: '#FFFFFF',
    headerSub: 'rgba(255,255,255,0.85)',
    gold: '#D9A441',
    box: '#E3F2EE',
    boxText: '#22303A',
    insurance: '#8C3A52',
    projection: '#2F8F7B',
    stars: false,
  },
  dark: {
    bg: '#0A101F',
    ink: '#E9EDF6',
    muted: '#8B97AC',
    headerFrom: '#101B36',
    headerTo: '#0A101F',
    headerText: '#D9A441',
    headerSub: 'rgba(233,237,246,0.7)',
    gold: '#D9A441',
    box: 'rgba(217,164,65,0.12)',
    boxText: '#E9EDF6',
    insurance: '#E8A2B8',
    projection: '#D9A441',
    stars: true,
  },
} as const;

function draw(
  cv: HTMLCanvasElement,
  theme: CardTheme,
  { answers, profile, allocation, points, monthly, premium, insuranceOn }: Omit<Props, 'onClose'>,
) {
  const ctx = cv.getContext('2d')!;
  const P = PALETTES[theme];
  const savings = savingsPlan(answers);
  const investMonthly = Math.max(0, monthly - (insuranceOn ? premium : 0) - savings.perMonth);

  // background
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);

  // constellation stars (dark only)
  if (P.stars) {
    const pts = [
      [80, 240], [200, 320], [340, 210], [620, 250], [760, 330], [840, 210],
      [120, 700], [820, 660], [90, 1100], [810, 1060], [160, 1380], [760, 1420],
      [450, 1480], [300, 1180], [640, 1200], [520, 180],
    ];
    pts.forEach(([x, y], i) => {
      ctx.beginPath();
      ctx.arc(x, y, i % 4 === 0 ? 2.2 : 1.4, 0, Math.PI * 2);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(217,164,65,0.6)' : 'rgba(233,237,246,0.45)';
      ctx.fill();
    });
    // a few constellation lines
    ctx.strokeStyle = 'rgba(233,237,246,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 240); ctx.lineTo(200, 320); ctx.lineTo(340, 210);
    ctx.moveTo(620, 250); ctx.lineTo(760, 330); ctx.lineTo(840, 210);
    ctx.stroke();
  }

  // header band
  const grad = ctx.createLinearGradient(0, 0, W, 180);
  grad.addColorStop(0, P.headerFrom);
  grad.addColorStop(1, P.headerTo);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 180);
  if (theme === 'dark') {
    ctx.strokeStyle = 'rgba(217,164,65,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 180.5);
    ctx.lineTo(W, 180.5);
    ctx.stroke();
  }
  ctx.fillStyle = P.headerText;
  ctx.font = '800 52px Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Pathfinder', W / 2, 82);
  ctx.font = '500 24px Segoe UI, system-ui, sans-serif';
  ctx.fillStyle = P.headerSub;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillText('Investment Discovery · ' + date, W / 2, 128);

  // profile
  ctx.fillStyle = theme === 'dark' ? P.gold : profile.color;
  ctx.font = '800 46px Segoe UI, system-ui, sans-serif';
  ctx.fillText(profile.name, W / 2, 260);
  ctx.fillStyle = theme === 'dark' ? P.muted : P.gold;
  ctx.font = '600 24px Segoe UI, system-ui, sans-serif';
  ctx.fillText(profile.tagline, W / 2, 300);

  // donut
  const cx = W / 2;
  const cy = 500;
  const rOut = 150;
  const rIn = 95;
  let ang = -Math.PI / 2;
  const total = allocation.reduce((s, a) => s + a.pct, 0);
  for (const a of allocation) {
    const sweep = (a.pct / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + rIn * Math.cos(ang), cy + rIn * Math.sin(ang));
    ctx.arc(cx, cy, rOut, ang, ang + sweep);
    ctx.arc(cx, cy, rIn, ang + sweep, ang, true);
    ctx.closePath();
    ctx.fillStyle = a.color;
    ctx.fill();
    ang += sweep;
  }
  ctx.fillStyle = P.ink;
  ctx.font = '800 38px Segoe UI, system-ui, sans-serif';
  ctx.fillText(fmtMoney(answers.capital), cx, cy + 4);
  ctx.fillStyle = P.muted;
  ctx.font = '500 20px Segoe UI, system-ui, sans-serif';
  ctx.fillText('invested', cx, cy + 34);

  // allocation rows
  let y = 720;
  ctx.textAlign = 'left';
  for (const a of allocation) {
    ctx.fillStyle = a.color;
    ctx.beginPath();
    ctx.roundRect(80, y - 18, 22, 22, 6);
    ctx.fill();
    ctx.fillStyle = P.ink;
    ctx.font = '600 26px Segoe UI, system-ui, sans-serif';
    ctx.fillText(a.label + (a.note ? ' · ' + a.note : ''), 118, y);
    ctx.textAlign = 'right';
    ctx.font = '700 26px Segoe UI, system-ui, sans-serif';
    ctx.fillText(a.pct + '%  ·  ' + fmtMoney(a.dollars), W - 80, y);
    ctx.textAlign = 'left';
    y += 46;
  }

  // monthly + insurance + savings box
  y += 14;
  const boxLines: Array<[string, string]> = [
    [P.boxText, 'Adding ' + fmtMoney(investMonthly) + '/mo across the same mix (DCA)'],
  ];
  if (savings.active) {
    boxLines.push([
      P.boxText,
      'Safety net: ' + fmtMoney(savings.perMonth) + '/mo → ' + fmtMoney(savings.goal) + ' by month ' + savings.months,
    ]);
  }
  if (insuranceOn) {
    boxLines.push([
      P.insurance,
      'Life insurance: ' + fmtMoney(premium) + '/mo — cash value borrowable after ~yr 3',
    ]);
  }
  const boxH = 40 + boxLines.length * 40;
  ctx.fillStyle = P.box;
  ctx.beginPath();
  ctx.roundRect(70, y - 30, W - 140, boxH, 16);
  ctx.fill();
  if (theme === 'dark') {
    ctx.strokeStyle = 'rgba(217,164,65,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.font = '600 25px Segoe UI, system-ui, sans-serif';
  boxLines.forEach(([color, text], i) => {
    ctx.fillStyle = color;
    ctx.fillText(text, 95, y + 12 + i * 40);
  });
  y += boxH + 30;

  // projections
  ctx.fillStyle = P.ink;
  ctx.font = '800 30px Segoe UI, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Where this path leads', W / 2, y);
  y += 20;
  const horizons = [10, 20, 30];
  const colW = (W - 160) / 3;
  horizons.forEach((h, i) => {
    const p = points[h];
    const x = 80 + colW * i + colW / 2;
    ctx.fillStyle = P.muted;
    ctx.font = '600 22px Segoe UI, system-ui, sans-serif';
    ctx.fillText('Year ' + h, x, y + 36);
    ctx.fillStyle = P.projection;
    ctx.font = '800 36px Segoe UI, system-ui, sans-serif';
    ctx.fillText(fmtCompact(p.exp + p.cvExp), x, y + 82);
    ctx.fillStyle = P.muted;
    ctx.font = '500 18px Segoe UI, system-ui, sans-serif';
    ctx.fillText(fmtCompact(p.cons + p.cvCons) + ' – ' + fmtCompact(p.opt + p.cvOpt), x, y + 112);
  });
  y += 150;
  ctx.fillStyle = P.muted;
  ctx.font = '500 17px Segoe UI, system-ui, sans-serif';
  ctx.fillText('Expected scenario, with conservative–optimistic range below', W / 2, y);

  // footer
  ctx.fillStyle = P.muted;
  ctx.font = '500 17px Segoe UI, system-ui, sans-serif';
  ctx.fillText('Projections are illustrative assumptions, not guarantees.', W / 2, H - 70);
  ctx.fillText('Educational tool for discussion purposes. Not licensed financial advice.', W / 2, H - 42);
}

export default function SummaryModal(props: Props) {
  const { onClose } = props;
  const ref = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [cardTheme, setCardTheme] = useState<CardTheme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );

  useEffect(() => {
    if (ref.current) draw(ref.current, cardTheme, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.allocation, props.monthly, props.premium, cardTheme]);

  const savePng = () => {
    const a = document.createElement('a');
    a.download = `pathfinder-summary-${cardTheme}.png`;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const shareImage = () => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `pathfinder-summary-${cardTheme}.png`, { type: 'image/png' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Pathfinder plan',
            text: 'My investment discovery summary from Pathfinder.',
          });
        } else {
          await navigator.share({
            title: 'My Pathfinder plan',
            text: 'My investment discovery summary from Pathfinder.',
          });
        }
      } catch {
        /* user cancelled or share failed — no-op */
      }
    }, 'image/png');
  };

  const copyText = async () => {
    const live = { ...props.answers, monthly: props.monthly, premium: props.premium };
    const investMonthly = Math.max(0, props.monthly - (props.insuranceOn ? props.premium : 0));
    const text = buildSummary(
      live,
      props.profile,
      props.allocation,
      props.points,
      investMonthly,
      props.premium,
      props.insuranceOn,
    );
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="modal-box"
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="card-theme-chips">
          <button className={`chip ${cardTheme === 'light' ? 'active' : ''}`} onClick={() => setCardTheme('light')}>
            Light card
          </button>
          <button className={`chip ${cardTheme === 'dark' ? 'active' : ''}`} onClick={() => setCardTheme('dark')}>
            Telos dark
          </button>
        </div>
        <canvas ref={ref} width={W} height={H} className="summary-canvas" />
        <div className="modal-actions">
          <button className="btn primary" onClick={savePng}>
            <Download size={16} /> Save image
          </button>
          {canShare && (
            <button className="btn ghost" onClick={shareImage}>
              <Share2 size={16} /> Share
            </button>
          )}
          <button className="btn ghost" onClick={copyText}>
            {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy as text</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
