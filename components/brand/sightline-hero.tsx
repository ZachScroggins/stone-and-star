import { starPath } from './logo-mark';

// Decorative hero scene: a pyramid on the horizon, a field of stars, and a dashed
// sight line drawn from the apex to one star. Positions are deterministic so server
// and client markup match.

const W = 640;
const H = 440;
const HORIZON = 380;
const APEX = { x: 290, y: 220 };
const HALF_BASE = 150;
const TARGET = { x: 548, y: 74 };

function insidePyramid(x: number, y: number) {
  if (y < APEX.y - 12 || y > HORIZON) return false;
  const half = ((y - APEX.y + 12) / (HORIZON - APEX.y + 12)) * (HALF_BASE + 12);
  return Math.abs(x - APEX.x) < half;
}

function makeStars(count: number) {
  let seed = 20260111;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const stars: { x: number; y: number; r: number; o: number }[] = [];
  while (stars.length < count) {
    const x = 12 + rand() * (W - 24);
    const y = 10 + rand() * (HORIZON - 70);
    const r = 0.9 + rand() * rand() * 2.1;
    const o = 0.45 + rand() * 0.5;
    if (insidePyramid(x, y) || Math.hypot(x - TARGET.x, y - TARGET.y) < 22) continue;
    stars.push({ x: +x.toFixed(1), y: +y.toFixed(1), r: +r.toFixed(2), o: +o.toFixed(2) });
  }
  return stars;
}

const STARS = makeStars(64);

const COURSES = Array.from({ length: 9 }, (_, i) => {
  const y = APEX.y + 16 * (i + 1);
  const half = ((y - APEX.y) / (HORIZON - APEX.y)) * HALF_BASE;
  return { y, x1: APEX.x - half, x2: APEX.x + half };
});

export function SightlineHero({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden>
      <defs>
        <mask id="sightline-reveal" maskUnits="userSpaceOnUse">
          <path
            className="sightline-draw"
            d={`M${APEX.x} ${APEX.y}L${TARGET.x} ${TARGET.y}`}
            stroke="white"
            strokeWidth="6"
            pathLength={1}
          />
        </mask>
      </defs>

      <g fill="var(--star)">
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />
        ))}
      </g>

      <line x1="0" x2={W} y1={HORIZON} y2={HORIZON} stroke="currentColor" strokeOpacity="0.35" />

      <g stroke="var(--stone)" strokeLinejoin="round">
        <path
          d={`M${APEX.x - HALF_BASE} ${HORIZON}L${APEX.x} ${APEX.y}L${APEX.x + HALF_BASE} ${HORIZON}Z`}
          fill="var(--stone)"
          fillOpacity="0.1"
          strokeWidth="1.5"
        />
        {COURSES.map((c) => (
          <line key={c.y} x1={c.x1} x2={c.x2} y1={c.y} y2={c.y} strokeOpacity="0.35" />
        ))}
      </g>

      <path
        d={`M${APEX.x} ${APEX.y}L${TARGET.x} ${TARGET.y}`}
        stroke="var(--star)"
        strokeWidth="1.5"
        strokeDasharray="5 6"
        strokeLinecap="round"
        mask="url(#sightline-reveal)"
      />
      <circle
        className="sightline-target"
        cx={TARGET.x}
        cy={TARGET.y}
        r="14"
        fill="none"
        stroke="var(--star)"
        strokeOpacity="0.5"
      />
      <path d={starPath(TARGET.x, TARGET.y, 8)} fill="var(--star)" />
      <path d={starPath(APEX.x, APEX.y, 4)} fill="var(--star)" />
    </svg>
  );
}
