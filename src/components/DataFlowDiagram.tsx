import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Braces, GitBranch, Radar, Sparkles } from 'lucide-react';
import { LogoIcon } from './LogoIcon';

const founderSources = [
  { label: 'Proof of work', meta: 'commits, demos', icon: GitBranch },
  { label: 'Traction', meta: 'usage, revenue', icon: Sparkles },
  { label: 'Launches', meta: 'products shipped', icon: Braces },
  { label: 'Signal', meta: 'fresh context', icon: Radar },
];

const investorCriteria = [
  { label: 'Thesis fit', meta: 'what they back' },
  { label: 'Stage', meta: 'round and timing' },
  { label: 'Sector', meta: 'market taste' },
  { label: 'Warm path', meta: 'right next step' },
];

const agentStages = ['Verify', 'Score', 'Rank', 'Draft'];

type Conn = { id: string; d: string; dir: 'in' | 'out'; delay: number; duration: number };

const FlowChip = ({
  label,
  meta,
  align,
  index,
  chipRef,
  Icon,
}: {
  label: string;
  meta: string;
  align: 'left' | 'right';
  index: number;
  chipRef: (el: HTMLDivElement | null) => void;
  Icon?: typeof GitBranch;
}) => (
  <div
    ref={chipRef}
    data-reveal
    style={{ transitionDelay: `${index * 80}ms` }}
    className={`monad-flow-chip reveal ${align === 'right' ? 'monad-flow-chip--left' : 'monad-flow-chip--right'}`}
  >
    <span className="monad-flow-chip__mark">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
    </span>
    <span className="min-w-0">
      <span className="block truncate font-mono text-[12px] font-semibold text-ink">{label}</span>
      <span className="mt-0.5 block truncate font-mono text-[10px] text-stone">{meta}</span>
    </span>
  </div>
);

export const DataFlowDiagram = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rightRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [conns, setConns] = useState<Conn[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const node = nodeRef.current;
    if (!container || !node) return;

    const compute = () => {
      const cRect = container.getBoundingClientRect();
      setSize({ w: cRect.width, h: cRect.height });

      if (!window.matchMedia('(min-width: 768px)').matches) {
        setConns([]);
        return;
      }

      const nRect = node.getBoundingClientRect();
      const nLeftX = nRect.left - cRect.left + 10;
      const nRightX = nRect.right - cRect.left - 10;
      const nY = nRect.top - cRect.top + nRect.height / 2;

      const next: Conn[] = [];
      leftRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const sx = r.right - cRect.left;
        const sy = r.top - cRect.top + r.height / 2;
        const bend = sx + (nLeftX - sx) * 0.48;
        next.push({
          id: `in-${i}`,
          dir: 'in',
          delay: i * 0.34,
          duration: 2.7 + i * 0.14,
          d: `M${sx},${sy} C${bend},${sy} ${bend},${nY} ${nLeftX},${nY}`,
        });
      });

      rightRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = r.left - cRect.left;
        const dy = r.top - cRect.top + r.height / 2;
        const bend = nRightX + (dx - nRightX) * 0.5;
        next.push({
          id: `out-${i}`,
          dir: 'out',
          delay: i * 0.38,
          duration: 2.9 + i * 0.12,
          d: `M${nRightX},${nY} C${bend},${nY} ${bend},${dy} ${dx},${dy}`,
        });
      });

      setConns(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(container);
    window.addEventListener('resize', compute);
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    fonts?.ready.then(compute).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);

  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-20">
      <div ref={containerRef} className="monad-flow-stage relative isolate overflow-hidden rounded-[44px] border border-ink/12 px-5 py-8 md:px-8 md:py-10">
        <div className="monad-flow-grid" aria-hidden />
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 hidden md:block"
          viewBox={`0 0 ${size.w || 1} ${size.h || 1}`}
          preserveAspectRatio="none"
          fill="none"
        >
          {conns.map((c) => (
            <g key={c.id}>
              <path d={c.d} className="flow-path flow-path--base" />
              <path d={c.d} pathLength={1} className={`flow-path ${c.dir === 'in' ? 'flow-path--in' : 'flow-path--out'}`} />
              <circle r="3.4" className={`flow-packet ${c.dir === 'in' ? 'flow-packet--in' : 'flow-packet--out'}`}>
                <animateMotion dur={`${c.duration}s`} begin={`${c.delay}s`} repeatCount="indefinite" path={c.d} />
              </circle>
            </g>
          ))}
        </svg>

        <div className="relative z-10 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_18rem_minmax(0,1fr)] md:gap-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:justify-items-end">
            <span className="col-span-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone md:col-span-1">Founder proof</span>
            {founderSources.map((item, i) => (
              <FlowChip
                key={item.label}
                label={item.label}
                meta={item.meta}
                align="right"
                index={i}
                Icon={item.icon}
                chipRef={(el) => {
                  leftRefs.current[i] = el;
                }}
              />
            ))}
          </div>

          <div className="relative flex flex-col items-center">
            <div className="monad-flow-orbit" aria-hidden />
            <div ref={nodeRef} className="monad-flow-core">
              <div className="monad-flow-core__scan" aria-hidden />
              <div className="monad-flow-core__logo">
                <LogoIcon className="h-8 w-8 text-ink" />
              </div>
              <div className="mt-5 text-center">
                <p className="font-serif text-[26px] leading-none text-ink">Fit engine</p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-stone">proof graph</p>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-2">
              {agentStages.map((stage, i) => (
                <span key={stage} className="monad-flow-stage-pill">
                  <span className="flow-dot h-1.5 w-1.5 rounded-full bg-[#5fcf8e]" style={{ animationDelay: `${i * 0.45}s` }} />
                  {stage}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:justify-items-start">
            <span className="col-span-2 font-mono text-[11px] uppercase tracking-[0.14em] text-stone md:col-span-1">Investor thesis</span>
            {investorCriteria.map((item, i) => (
              <FlowChip
                key={item.label}
                label={item.label}
                meta={item.meta}
                align="left"
                index={i}
                chipRef={(el) => {
                  rightRefs.current[i] = el;
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-6 text-center font-mono text-[13px] tracking-[-0.02em] text-stone">
        Founder evidence becomes a ranked, thesis-fit path to the right side of the table.
      </p>
    </section>
  );
};
