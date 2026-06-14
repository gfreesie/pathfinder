import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Download, Share2, X } from 'lucide-react';
import type { AllocationLine, Answers, AssetKey, ProfileDef } from '../types';
import type { YearPoint } from '../logic/projections';
import { fmtCompact, fmtMoney, savingsPlan } from '../logic/projections';
import { ASSET_META } from '../logic/allocation';
import {
  ACQUISITION_DISCLAIMER,
  type CustomHolding,
  whereToBuy,
} from '../logic/customPortfolio';
import { buildSummary } from '../logic/exportSummary';

interface Props {
  answers: Answers;
  profile: ProfileDef;
  allocation: AllocationLine[];
  points: YearPoint[];
  monthly: number;
  premium: number;
  insuranceOn: boolean;
  sblocSplit?: number;   // 0-100 share of the lever directed to SBLOC
  sblocLtv?: number;     // advance rate %
  sblocBorrow?: number;  // borrowing power at the long horizon
  holdings?: CustomHolding[] | null;
  clientName?: string;
  onClose: () => void;
}

const KEY_ORDER: AssetKey[] = [
  'usStocks', 'intlStocks', 'metals', 'crypto', 'landReit', 'bonds', 'cash',
];

// Wrap text to a width, drawing at most maxLines lines; returns the y after.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineH: number,
  maxLines = 2,
): number {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      lines += 1;
      y += lineH;
      line = words[i];
      if (lines >= maxLines - 1) {
        // last allowed line: dump the rest (may slightly overflow width)
        let rest = words.slice(i).join(' ');
        while (ctx.measureText(rest + '…').width > maxWidth && rest.length > 4) {
          rest = rest.slice(0, -1);
        }
        ctx.fillText(rest + (words.slice(i).join(' ') !== rest ? '…' : ''), x, y);
        return y + lineH;
      }
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

type CardTheme = 'light' | 'dark';

const W = 900;
const BASE_H = 1560;

// The card grows when a custom holdings breakdown is appended.
function computeHeight(p: Omit<Props, 'onClose'>): number {
  const holdings = p.holdings ?? [];
  if (holdings.length === 0) return BASE_H;
  const savings = savingsPlan(p.answers);
  const split = p.sblocSplit ?? 0;
  const boxLineCount =
    1 +
    (savings.active ? 1 : 0) +
    (p.insuranceOn && split < 100 ? 1 : 0) +
    (p.insuranceOn && split > 0 ? 1 : 0);
  const boxH = 40 + boxLineCount * 40;
  const yAfterProj = 934 + p.allocation.length * 46 + boxH;
  const groups = new Set(holdings.map((h) => h.assetClass)).size;
  const breakdownH = 140 + groups * 120 + holdings.length * 30;
  return Math.max(BASE_H, yAfterProj + breakdownH + 110);
}

const PALETTES = {
  light: {
    bg: '#FAF8F4',
    ink: '#22303A',
    muted: '#6B7A86',
    headerFrom: '#3A72C4',
    headerTo: '#27538F',
    headerText: '#FFFFFF',
    headerSub: 'rgba(255,255,255,0.85)',
    gold: '#D9A441',
    box: '#E8F0FB',
    boxText: '#22303A',
    insurance: '#8C3A52',
    projection: '#2F6FB0',
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

// Draw an image cover-fitting a box (like CSS background-size: cover).
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  focusY = 0.5,
) {
  const ir = img.width / img.height;
  const br = dw / dh;
  let sw = img.width;
  let sh = img.height;
  let sx = 0;
  let sy = 0;
  if (ir > br) {
    sw = img.height * br;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / br;
    sy = (img.height - sh) * focusY;
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

// A shiny four-point star (radial white→gold) — the dot of the i on the card.
function drawSparkle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const k = 0.175;
  const p: Array<[number, number]> = [
    [0, -r], [k * r, -k * r], [r, 0], [k * r, k * r],
    [0, r], [-k * r, k * r], [-r, 0], [-k * r, -k * r],
  ];
  ctx.save();
  ctx.beginPath();
  p.forEach(([dx, dy], i) => (i ? ctx.lineTo(cx + dx, cy + dy) : ctx.moveTo(cx + dx, cy + dy)));
  ctx.closePath();
  const g = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#f1dca0');
  g.addColorStop(1, '#d9a441');
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(217,164,65,0.55)';
  ctx.shadowBlur = r * 0.8;
  ctx.fill();
  ctx.restore();
}

// The "Nelli" logotype in Playfair, centered at cx, with the star dotting the i.
// Uses the caller's current fillStyle for the lettering; restores textAlign=center.
function drawWordmark(ctx: CanvasRenderingContext2D, cx: number, baselineY: number, size: number) {
  ctx.font = `700 ${size}px "Playfair Display", Georgia, serif`;
  ctx.textAlign = 'left';
  const x0 = cx - ctx.measureText('Nelli').width / 2;
  ctx.fillText('Nelli', x0, baselineY);
  const sx = x0 + ctx.measureText('Nell').width + ctx.measureText('i').width / 2;
  drawSparkle(ctx, sx, baselineY - size * 0.66, size * 0.16);
  ctx.textAlign = 'center';
}

function draw(
  cv: HTMLCanvasElement,
  theme: CardTheme,
  { answers, profile, allocation, points, monthly, premium, insuranceOn, sblocSplit, sblocLtv, sblocBorrow, holdings }: Omit<Props, 'onClose'>,
  clientName: string,
  horse: HTMLImageElement | null,
) {
  const ctx = cv.getContext('2d')!;
  const P = PALETTES[theme];
  const H = cv.height;
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

  // header band — celestial nebula in dark mode, calm gradient in light
  if (theme === 'dark' && horse) {
    drawCover(ctx, horse, 0, 0, W, 200, 0.32);
    const ov = ctx.createLinearGradient(0, 0, 0, 200);
    ov.addColorStop(0, 'rgba(7,11,22,0.10)');
    ov.addColorStop(0.6, 'rgba(7,11,22,0.45)');
    ov.addColorStop(1, 'rgba(10,16,31,0.92)');
    ctx.fillStyle = ov;
    ctx.fillRect(0, 0, W, 200);
  } else {
    const grad = ctx.createLinearGradient(0, 0, W, 180);
    grad.addColorStop(0, P.headerFrom);
    grad.addColorStop(1, P.headerTo);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 180);
  }
  if (theme === 'dark') {
    ctx.strokeStyle = 'rgba(217,164,65,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 180.5);
    ctx.lineTo(W, 180.5);
    ctx.stroke();
  }
  ctx.fillStyle = P.headerText;
  drawWordmark(ctx, W / 2, 82, 52);
  ctx.font = '500 24px Segoe UI, system-ui, sans-serif';
  ctx.fillStyle = P.headerSub;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillText('Financial Vision Casting · ' + date, W / 2, 128);
  const name = clientName.trim();
  if (name) {
    ctx.font = '600 22px Segoe UI, system-ui, sans-serif';
    ctx.fillStyle = theme === 'dark' ? P.gold : '#FFFFFF';
    ctx.fillText('Prepared for ' + name, W / 2, 158);
  }

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
  const split = sblocSplit ?? 0;
  if (insuranceOn && split < 100) {
    boxLines.push([
      P.insurance,
      'Life insurance: ' + fmtMoney(premium) + '/mo — cash value borrowable after ~yr 3',
    ]);
  }
  if (insuranceOn && split > 0) {
    boxLines.push([
      P.projection,
      'SBLOC: ' + split + '% of the lever at ' + (sblocLtv ?? 70) + '% advance' +
        (sblocBorrow ? ' — ~' + fmtMoney(sblocBorrow) + ' borrowable by yr 30' : ''),
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
  ctx.font = '600 22px Segoe UI, system-ui, sans-serif';
  boxLines.forEach(([color, text], i) => {
    ctx.fillStyle = color;
    // Clamp to the box's inner width so a long SBLOC/insurance line can't run off the card.
    ctx.fillText(text, 95, y + 12 + i * 40, W - 190);
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

  // custom holdings breakdown (grouped by asset class, with where-to-buy)
  const hold = holdings ?? [];
  if (hold.length > 0) {
    y += 56;
    ctx.textAlign = 'left';
    ctx.fillStyle = P.ink;
    ctx.font = '800 28px Segoe UI, system-ui, sans-serif';
    ctx.fillText('Your holdings & where to get them', 70, y);
    ctx.strokeStyle = theme === 'dark' ? 'rgba(217,164,65,0.35)' : 'rgba(0,0,0,0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, y + 16);
    ctx.lineTo(W - 70, y + 16);
    ctx.stroke();
    y += 22;
    const groups = new Map<AssetKey, CustomHolding[]>();
    for (const h of hold) {
      const arr = groups.get(h.assetClass) ?? [];
      arr.push(h);
      groups.set(h.assetClass, arr);
    }
    for (const k of KEY_ORDER) {
      const hs = groups.get(k);
      if (!hs) continue;
      y += 40;
      ctx.fillStyle = theme === 'dark' ? P.gold : ASSET_META[k].color;
      ctx.font = '700 23px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ASSET_META[k].label, 70, y);
      for (const h of hs) {
        y += 30;
        ctx.fillStyle = P.ink;
        ctx.font = '500 20px Segoe UI, system-ui, sans-serif';
        ctx.textAlign = 'left';
        const label = h.symbol + (h.name && h.name !== h.symbol ? ' · ' + h.name : '');
        ctx.fillText(label.length > 46 ? label.slice(0, 45) + '…' : label, 96, y);
        ctx.font = '600 20px Segoe UI, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(fmtMoney(h.dollars), W - 70, y);
      }
      y += 30;
      ctx.fillStyle = P.muted;
      ctx.font = 'italic 16px Segoe UI, system-ui, sans-serif';
      ctx.textAlign = 'left';
      y = wrapText(ctx, 'Where: ' + whereToBuy(hs[0].category, k), 96, y, W - 170, 22, 2);
    }
    y += 26;
    ctx.fillStyle = P.muted;
    ctx.font = 'italic 15px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ACQUISITION_DISCLAIMER, 70, y);
    ctx.textAlign = 'center';
  }

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
  const [clientName, setClientName] = useState(props.clientName ?? '');
  const [cardTheme, setCardTheme] = useState<CardTheme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  );

  const cardH = computeHeight(props);

  // Preload the celestial nebula so the dark card can come alive.
  const horseRef = useRef<HTMLImageElement | null>(null);
  const [horseReady, setHorseReady] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      horseRef.current = img;
      setHorseReady(true);
    };
    img.src = '/celestial-horse.jpg';
  }, []);

  // Wait for Playfair Display so the canvas wordmark renders in the brand font,
  // not a serif fallback, then redraw.
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let ok = true;
    const done = () => { if (ok) setFontReady(true); };
    if (document.fonts?.load) {
      document.fonts.load('700 1em "Playfair Display"').then(done, done);
    } else {
      Promise.resolve().then(done);
    }
    return () => { ok = false; };
  }, []);

  useEffect(() => {
    if (ref.current) draw(ref.current, cardTheme, props, clientName, horseRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.allocation, props.monthly, props.premium, props.holdings, cardTheme, clientName, cardH, horseReady, fontReady]);

  const fileSlug = () =>
    clientName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
    cardTheme;

  const savePng = () => {
    const a = document.createElement('a');
    a.download = `nelli-${fileSlug()}.png`;
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
      const file = new File([blob], `nelli-${fileSlug()}.png`, { type: 'image/png' });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Nelli plan',
            text: 'My investment discovery summary from Nelli.',
          });
        } else {
          await navigator.share({
            title: 'My Nelli plan',
            text: 'My investment discovery summary from Nelli.',
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
      props.sblocSplit ?? 0,
      props.sblocLtv ?? 70,
      props.sblocBorrow ?? 0,
      clientName.trim(),
      props.holdings ?? [],
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
        className="modal-box summary-modal"
        initial={{ scale: 0.92, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 24 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <div className="card-theme-chips">
          <input
            className="client-name-input"
            type="text"
            placeholder="Client name (optional)"
            value={clientName}
            maxLength={40}
            onChange={(e) => setClientName(e.target.value)}
          />
          <button className={`chip ${cardTheme === 'light' ? 'active' : ''}`} onClick={() => setCardTheme('light')}>
            Light card
          </button>
          <button className={`chip ${cardTheme === 'dark' ? 'active' : ''}`} onClick={() => setCardTheme('dark')}>
            Celestial dark
          </button>
        </div>
        <div className="summary-canvas-scroll">
          <canvas ref={ref} width={W} height={cardH} className="summary-canvas" />
        </div>
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
