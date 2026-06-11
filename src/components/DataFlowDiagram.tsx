import { useLayoutEffect, useRef, useState } from 'react';
import { LogoIcon } from './LogoIcon';

// Data-flow diagram: founder proof (sources) → Apparent (processing) → investor
// thesis (destinations), in the Monad style — curved connectors fan from each
// tag into the central node, with data flowing along every curve.
const founderSources = ['PROOF OF WORK', 'GITHUB', 'TRACTION', 'LAUNCHES', 'NPX APPARENT'];
const investorCriteria = ['THESIS FIT', 'STAGE', 'SECTOR', 'CHECK SIZE'];
const agentStages = ['VERIFY', 'MATCH', 'RANK', 'INTRO'];

type Conn = { id: string; d: string; dir: 'in' | 'out'; delay: number };

const Tag = ({
  label,
  align,
  tone,
  index,
  tagRef,
}: {
  label: string;
  align: 'left' | 'right';
  tone: 'peach' | 'mint';
  index: number;
  tagRef: (el: HTMLSpanElement | null) => void;
}) => (
  <span
    ref={tagRef}
    data-reveal
    style={{ transitionDelay: `${index * 80}ms` }}
    className={`reveal inline-flex items-center gap-2.5 rounded-full border border-ink bg-parchment px-4 py-2 font-mono text-[12px] tracking-[-0.02em] text-ink ${
      align === 'right' ? 'flex-row-reverse' : ''
    }`}
  >
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{
        background: tone === 'peach' ? '#ff9473' : '#5fcf8e',
        boxShadow: `0 0 5px ${tone === 'peach' ? 'rgba(255,148,115,0.8)' : 'rgba(95,207,142,0.8)'}`,
      }}
    />
    {label}
  </span>
);

export const DataFlowDiagram = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const rightRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const node = nodeRef.current;
    if (!container || !node) return;

    const compute = () => {
      const cRect = container.getBoundingClientRect();
      setSize({ w: cRect.width, h: cRect.height });

      // Connectors only make sense in the side-by-side (md+) layout; below that
      // the columns stack vertically, so we draw nothing.
      if (!window.matchMedia('(min-width: 768px)').matches) {
        setConns([]);
        return;
      }

      const nRect = node.getBoundingClientRect();
      const nLeftX = nRect.left - cRect.left;
      const nRightX = nRect.right - cRect.left;
      const nY = nRect.top - cRect.top + nRect.height / 2;

      const next: Conn[] = [];
      leftRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const sx = r.right - cRect.left;
        const sy = r.top - cRect.top + r.height / 2;
        const mx = sx + (nLeftX - sx) * 0.5;
        next.push({
          id: `in-${i}`,
          dir: 'in',
          delay: i * -0.45,
          d: `M${sx},${sy} C${mx},${sy} ${mx},${nY} ${nLeftX},${nY}`,
        });
      });
      rightRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = r.left - cRect.left;
        const dy = r.top - cRect.top + r.height / 2;
        const mx = nRightX + (dx - nRightX) * 0.5;
        next.push({
          id: `out-${i}`,
          dir: 'out',
          delay: i * -0.55,
          d: `M${nRightX},${nY} C${mx},${nY} ${mx},${dy} ${dx},${dy}`,
        });
      });
      setConns(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    window.addEventListener('resize', compute);
    // Tag widths shift once the web fonts swap in, so re-measure after they load.
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    fonts?.ready.then(compute).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-20">
      <div ref={containerRef} className="relative grid items-center gap-10 md:grid-cols-[1fr_auto_1fr] md:gap-6">
        {/* Curved connectors, painted behind the tags and node */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{ zIndex: 0 }}
          viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
          preserveAspectRatio="none"
          fill="none"
        >
          {conns.map((c) => (
            <g key={c.id}>
              <path d={c.d} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
              <path
                d={c.d}
                pathLength={1}
                strokeLinecap="round"
                strokeWidth={1.6}
                className={`flow-line ${c.dir === 'in' ? 'flow-line--in' : 'flow-line--out'}`}
                style={{ animationDelay: `${c.delay}s` }}
              />
            </g>
          ))}
        </svg>

        {/* Left: founder proof */}
        <div className="relative z-10 flex flex-col items-center gap-3 md:items-end">
          <span className="mb-1 font-mono text-[11px] uppercase tracking-[0.1em] text-stone">Founder proof</span>
          {founderSources.map((tag, i) => (
            <Tag
              key={tag}
              label={tag}
              align="right"
              tone="peach"
              index={i}
              tagRef={(el) => {
                leftRefs.current[i] = el;
              }}
            />
          ))}
        </div>

        {/* Center: Apparent node */}
        <div className="relative z-10 flex flex-col items-center">
          <div
            aria-hidden
            className="flow-aura pointer-events-none absolute left-1/2 top-[3.5rem] -z-10 h-56 w-56 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(167,252,205,0.65) 0%, rgba(160,181,235,0.22) 52%, rgba(246,243,241,0) 74%)',
            }}
          />
          <div
            ref={nodeRef}
            className="flex h-28 w-28 items-center justify-center rounded-full border border-ink bg-parchment shadow-[0_0_10px_rgba(0,0,0,0.1)]"
          >
            <LogoIcon className="h-10 w-10 text-ink" />
          </div>
          <span className="mt-4 font-mono text-[13px] tracking-[-0.02em] text-ink">APPARENT</span>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {agentStages.map((stage, i) => (
              <span
                key={stage}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink/30 px-2.5 py-1 font-mono text-[11px] text-graphite"
              >
                <span className="flow-dot h-1.5 w-1.5 rounded-full bg-[#5fcf8e]" style={{ animationDelay: `${i * 0.6}s` }} />
                {stage}
              </span>
            ))}
          </div>
        </div>

        {/* Right: investor thesis */}
        <div className="relative z-10 flex flex-col items-center gap-3 md:items-start">
          <span className="mb-1 font-mono text-[11px] uppercase tracking-[0.1em] text-stone">Investor thesis</span>
          {investorCriteria.map((tag, i) => (
            <Tag
              key={tag}
              label={tag}
              align="left"
              tone="mint"
              index={i}
              tagRef={(el) => {
                rightRefs.current[i] = el;
              }}
            />
          ))}
        </div>
      </div>
      <p className="mt-10 text-center font-mono text-[13px] tracking-[-0.02em] text-stone">
        Founder proof in. Investor thesis out. Agents match both sides.
      </p>
    </section>
  );
};
