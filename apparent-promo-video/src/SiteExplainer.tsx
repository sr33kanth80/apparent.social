import {
  AbsoluteFill,
  Sequence,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  Easing,
  Audio,
} from "remotion";
import { loadFont as loadSerif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadSans } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import voDur from "./vo-durations.json";

export const serif = loadSerif().fontFamily;
export const sans = loadSans().fontFamily;
export const mono = loadMono().fontFamily;

// ── Design tokens — lifted from src/apparent-theme.css (.ed-page) ────────────
export const C = {
  canvas: "#f7f4ef",
  paper: "#eae5de",
  white: "#ffffff",
  ink: "#28292a",
  border: "#140206",
  graphite: "#5b5751",
  smoke: "#8a827a",
  pink: "#ffb4c5",
  blue: "#1d9bf0",
  green: "#16a34a",
};
export const HARD = `6px 6px 0 0 ${C.border}`;
export const HARD_SM = `3px 3px 0 0 ${C.border}`;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

export const fade = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: ease });
export const riseY = (f: number, start: number, dist = 34, dur = 20) =>
  interpolate(f, [start, start + dur], [dist, 0], { ...clamp, easing: ease });

// ── Apparent logomark (from src/components/LogoIcon.tsx) ─────────────────────
export const Logo = ({ size = 40, color = C.ink }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 256 256" width={size} height={size} fill={color}>
    <path d="M 128.005 191.173 C 128.448 156.208 156.93 128 192 128 L 192 64 L 128 64 C 128 99.346 99.346 128 64 128 L 64 192 L 128 192 Z M 192 256 L 64 256 C 28.654 256 0 227.346 0 192 L 0 64 L 64 64 L 64 0 L 192 0 C 227.346 0 256 28.654 256 64 L 256 192 L 192 192 Z" />
  </svg>
);

// Faint editorial grid on the warm paper canvas.
export const Canvas = ({ children }: { children?: React.ReactNode }) => (
  <AbsoluteFill style={{ background: C.canvas }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(20,2,6,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(20,2,6,0.035) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }}
    />
    {children}
  </AbsoluteFill>
);

export const Eyebrow = ({ children, color = C.graphite }: { children: React.ReactNode; color?: string }) => (
  <div style={{ fontFamily: mono, fontSize: 20, letterSpacing: "0.16em", textTransform: "uppercase", color, fontWeight: 500 }}>
    {children}
  </div>
);

export const BrandRow = () => (
  <div style={{ position: "absolute", top: 56, left: 110, right: 110, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <Logo size={38} />
      <Img src={staticFile("brand/wordmark.png")} style={{ height: 30 }} />
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 40, fontFamily: sans, fontSize: 19, color: C.ink, fontWeight: 500 }}>
      <span>For investors</span>
      <span>For founders</span>
      <span>Thesis</span>
      <span>Heat Map</span>
      <div style={{ background: C.blue, color: C.white, border: `1px solid ${C.border}`, boxShadow: HARD_SM, padding: "12px 22px", fontWeight: 600 }}>
        Get Started
      </div>
    </div>
  </div>
);

// Sharp, hard-bordered surface with offset shadow — the site's signature card.
export const Card = ({
  children,
  style,
  bg = C.white,
}: {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  bg?: string;
}) => (
  <div style={{ background: bg, border: `1px solid ${C.border}`, boxShadow: HARD, ...style }}>{children}</div>
);

export const Chip = ({ children, bg = C.white, color = C.ink }: { children: React.ReactNode; bg?: string; color?: string }) => (
  <div style={{ background: bg, color, border: `1px solid ${C.border}`, boxShadow: HARD_SM, padding: "12px 20px", fontFamily: sans, fontSize: 19, fontWeight: 500 }}>
    {children}
  </div>
);

export const StepNum = ({ n, color = C.ink }: { n: string; color?: string }) => (
  <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 66, height: 66, border: `1px solid ${C.border}`, boxShadow: HARD_SM, background: C.white, fontFamily: serif, fontSize: 34, color }}>
    {n}
  </div>
);

export const Headline = ({ children, size = 96, style }: { children: React.ReactNode; size?: number; style?: React.CSSProperties }) => (
  <div style={{ fontFamily: serif, fontSize: size, lineHeight: 1.02, color: C.ink, letterSpacing: "-0.02em", ...style }}>{children}</div>
);

export const Sub = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ fontFamily: sans, fontSize: 29, lineHeight: 1.45, color: C.graphite, letterSpacing: "-0.01em", ...style }}>{children}</div>
);

// ── Scene 1 · Hook ───────────────────────────────────────────────────────────
const SceneHook = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 22);
  const strike = interpolate(f, [46, 82], [0, 1], clamp);
  return (
    <Canvas>
      <div style={{ opacity: p }}>
        <BrandRow />
      </div>
      <div style={{ position: "absolute", left: 110, top: 322, width: 1500 }}>
        <div style={{ opacity: fade(f, 8, 26) }}>
          <Eyebrow>How Apparent works</Eyebrow>
        </div>
        <Headline size={112} style={{ marginTop: 30, opacity: p, transform: `translateY(${riseY(f, 6, 40)}px)` }}>
          Venture capital still<br />runs on{" "}
          <span style={{ position: "relative", display: "inline-block", color: C.ink }}>
            warm intros
            <div style={{ position: "absolute", left: -4, right: -4, top: "52%", height: 10, background: C.pink, border: `1px solid ${C.border}`, transform: `scaleX(${strike})`, transformOrigin: "left" }} />
          </span>.
        </Headline>
        <Sub style={{ marginTop: 42, width: 1120, opacity: fade(f, 30, 52) }}>
          The best founders stay invisible — until someone you know knows them.
        </Sub>
      </div>
    </Canvas>
  );
};

// ── Scene 2 · What it is ─────────────────────────────────────────────────────
const SceneWhat = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 22);
  return (
    <Canvas>
      <div style={{ opacity: p }}>
        <BrandRow />
      </div>
      <div style={{ position: "absolute", left: 110, top: 268, width: 1700 }}>
        <div style={{ opacity: fade(f, 6, 24) }}>
          <Eyebrow color={C.green}>An AI sourcing agent</Eyebrow>
        </div>
        <Headline size={124} style={{ marginTop: 26, opacity: p, transform: `translateY(${riseY(f, 4, 40)}px)` }}>
          Where traction meets<br />conviction.
        </Headline>
        <Sub style={{ marginTop: 40, width: 1240, opacity: fade(f, 26, 46) }}>
          Apparent connects investors with founders who&apos;ve actually shipped — ranked by proof, stage, and freshness.
        </Sub>
        <div style={{ display: "flex", gap: 16, marginTop: 46 }}>
          {[
            ["1,800+ investors", 34],
            ["Verified proof, not pitches", 44],
            ["No warm intro required", 54],
          ].map(([t, d]) => (
            <div key={t as string} style={{ opacity: fade(f, d as number, (d as number) + 18) }}>
              <Chip>{t}</Chip>
            </div>
          ))}
        </div>
      </div>
    </Canvas>
  );
};

// Reusable step layout: numbered left column + headline/sub.
const StepHead = ({ n, label, title, sub, accent = C.ink, titleSize = 82 }: { n: string; label: string; title: React.ReactNode; sub: React.ReactNode; accent?: string; titleSize?: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  return (
    <div style={{ position: "absolute", left: 110, top: 300, width: 720, opacity: p, transform: `translateY(${riseY(f, 2, 30)}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30 }}>
        <StepNum n={n} color={accent} />
        <Eyebrow color={accent}>{label}</Eyebrow>
      </div>
      <Headline size={titleSize}>{title}</Headline>
      <Sub style={{ marginTop: 30 }}>{sub}</Sub>
    </div>
  );
};

// ── Scene 3 · Step 01 · Thesis workspace ─────────────────────────────────────
const ThesisRow = ({ label, value, delay }: { label: string; value: string; delay: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 15);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0", borderBottom: `1px solid ${C.paper}`, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [16, 0])}px)` }}>
      <span style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.12em", textTransform: "uppercase", color: C.smoke }}>{label}</span>
      <span style={{ fontFamily: sans, fontSize: 24, fontWeight: 600, color: C.ink }}>{value}</span>
    </div>
  );
};

const SceneThesis = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  const saved = fade(f, 118, 134);
  return (
    <Canvas>
      <StepHead n="01" label="Define thesis" title={<>Turn your taste<br />into criteria.</>} sub="Capture the sectors, stages, geographies, and check sizes you back — and the signals you pass on." />
      <div style={{ position: "absolute", left: 1010, top: 250, width: 800, opacity: p, transform: `translateY(${riseY(f, 6, 54)}px)` }}>
        <Card style={{ padding: "40px 46px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.14em", textTransform: "uppercase", color: C.green }}>Thesis workspace</span>
            <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.1em", color: C.smoke }}>PRIVATE</span>
          </div>
          <ThesisRow label="Sectors" value="Dev tools · AI infra" delay={30} />
          <ThesisRow label="Stage" value="Pre-seed → Seed" delay={44} />
          <ThesisRow label="Geographies" value="SF · NYC · Remote" delay={58} />
          <ThesisRow label="Check size" value="$250K – $1.5M" delay={72} />
          <ThesisRow label="Signal you back" value="Ships in public" delay={86} />
          <div style={{ marginTop: 30, opacity: saved, display: "flex", alignItems: "center", gap: 14, background: "#eefaf1", border: `1px solid ${C.border}`, padding: "16px 20px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.green, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800 }}>✓</div>
            <span style={{ fontFamily: sans, fontSize: 19, color: C.ink, fontWeight: 500 }}>Saved. Your agent sources against this continuously.</span>
          </div>
        </Card>
      </div>
    </Canvas>
  );
};

// ── Scene 4 · Step 02 · Agent-sourced inbox ──────────────────────────────────
const FounderRow = ({ name, meta, proof, fit, delay }: { name: string; meta: string; proof: string; fit: string; delay: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 16);
  return (
    <div style={{ opacity: p, transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px)` }}>
      <Card style={{ display: "flex", alignItems: "center", gap: 22, padding: "22px 26px" }}>
        <div style={{ width: 58, height: 58, borderRadius: "50%", background: C.paper, border: `1px solid ${C.border}`, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: serif, fontSize: 27, color: C.ink }}>{name}</span>
            <span style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.08em", color: C.blue, border: `1px solid ${C.blue}`, padding: "3px 9px" }}>✓ VERIFIED</span>
          </div>
          <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: C.smoke, marginTop: 6, textTransform: "uppercase" }}>{meta}</div>
          <div style={{ fontFamily: sans, fontSize: 17, color: C.graphite, marginTop: 8 }}>{proof}</div>
        </div>
        <div style={{ textAlign: "right", paddingLeft: 14, borderLeft: `1px solid ${C.paper}` }}>
          <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.12em", color: C.smoke }}>FIT</div>
          <div style={{ fontFamily: serif, fontSize: 40, color: C.green }}>{fit}</div>
        </div>
      </Card>
    </div>
  );
};

const SceneSourcing = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  const dot = interpolate(Math.sin(f / 6), [-1, 1], [0.35, 1]);
  return (
    <Canvas>
      <StepHead n="02" label="Let your agent source" title={<>Verified founders,<br />ranked by fit.</>} sub="Your AI investor agent works 24/7 — ranking every founder against your thesis by proof, freshness, and fit." accent={C.green} />
      <div style={{ position: "absolute", left: 900, top: 232, width: 920, opacity: p }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, opacity: fade(f, 12, 26) }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.green, opacity: dot }} />
          <span style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.12em", textTransform: "uppercase", color: C.ink }}>AI investor agent · sourcing</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FounderRow name="Aria Kim" meta="AI agents · Seed · San Francisco" proof="AgentKit — 4.2K GitHub stars · $24K MRR, +22% MoM" fit="92%" delay={26} />
          <FounderRow name="Devansh Rao" meta="Dev tools · Pre-seed · NYC" proof="Local-first sync engine — 1.1K commits last quarter" fit="88%" delay={42} />
          <FounderRow name="Mara Ochoa" meta="AI infra · Seed · Remote" proof="Eval harness for LLMs — launched on Product Hunt #2" fit="84%" delay={58} />
        </div>
      </div>
    </Canvas>
  );
};

// ── Scene 5 · Step 03 · Builder Radar (density) ──────────────────────────────
// Deterministic density scatter with two heat clusters (SF / NYC).
const DENSITY_DOTS = (() => {
  const dots: { x: number; y: number; r: number; heat: number }[] = [];
  const rand = (i: number, s: number) => {
    const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const clusters = [
    { cx: 0.3, cy: 0.55, n: 70, spread: 0.13 },
    { cx: 0.68, cy: 0.4, n: 55, spread: 0.11 },
  ];
  let idx = 0;
  for (const cl of clusters) {
    for (let i = 0; i < cl.n; i++) {
      const a = rand(idx, 1) * Math.PI * 2;
      const d = rand(idx, 2) ** 1.6 * cl.spread;
      const x = cl.cx + Math.cos(a) * d * 1.4;
      const y = cl.cy + Math.sin(a) * d;
      const heat = 1 - d / cl.spread;
      dots.push({ x, y, r: 5 + rand(idx, 3) * 9, heat });
      idx++;
    }
  }
  for (let i = 0; i < 60; i++) {
    dots.push({ x: rand(idx, 4), y: rand(idx, 5), r: 3 + rand(idx, 6) * 4, heat: 0.15 });
    idx++;
  }
  return dots;
})();

const SceneDensity = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  const W = 1120;
  const H = 620;
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 110, top: 250, width: 640, opacity: p, transform: `translateY(${riseY(f, 2, 30)}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 30 }}>
          <StepNum n="03" />
          <Eyebrow>Map builder density</Eyebrow>
        </div>
        <Headline size={72}>Read the density before it becomes consensus.</Headline>
        <Sub style={{ marginTop: 30 }}>Builder Radar plots investors and builders by geography, stage, and thesis.</Sub>
      </div>
      <div style={{ position: "absolute", left: 748, top: 210, opacity: p, transform: `translateY(${riseY(f, 6, 44)}px)` }}>
        <Card style={{ width: W, height: H, position: "relative", overflow: "hidden", background: "#f0ece5" }}>
          {/* header bar */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${C.border}`, background: C.white, zIndex: 3 }}>
            <span style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.14em", textTransform: "uppercase", color: C.ink }}>Builder Radar</span>
            <div style={{ display: "flex", gap: 10 }}>
              {["Sector", "Stage", "Thesis"].map((t) => (
                <span key={t} style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.graphite, border: `1px solid ${C.border}`, padding: "5px 11px" }}>{t}</span>
              ))}
            </div>
          </div>
          {/* faint map grid */}
          <div style={{ position: "absolute", inset: "62px 0 0 0", backgroundImage: "linear-gradient(rgba(20,2,6,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,2,6,0.05) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />
          {/* density dots */}
          {DENSITY_DOTS.map((d, i) => {
            const appear = fade(f, 24 + (i % 30), 24 + (i % 30) + 14);
            const pulse = interpolate(Math.sin((f + i * 7) / 12), [-1, 1], [0.7, 1]);
            const col = d.heat > 0.6 ? C.pink : d.heat > 0.3 ? "#ff9db4" : "#c9c2b6";
            return (
              <div key={i} style={{ position: "absolute", left: 40 + d.x * (W - 80), top: 90 + d.y * (H - 150), width: d.r * 2, height: d.r * 2, marginLeft: -d.r, marginTop: -d.r, borderRadius: "50%", background: col, border: d.heat > 0.3 ? `1px solid ${C.border}` : "none", opacity: appear * (0.5 + d.heat * 0.5) * pulse }} />
            );
          })}
          {/* footer stat */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: `1px solid ${C.border}`, background: C.white, zIndex: 3 }}>
            <span style={{ fontFamily: serif, fontSize: 30, color: C.ink }}>3,438<span style={{ fontFamily: mono, fontSize: 14, letterSpacing: "0.12em", color: C.smoke, marginLeft: 10 }}>SIGNALS</span></span>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: mono, fontSize: 12, letterSpacing: "0.1em", color: C.graphite }}>
              <span>LOW</span>
              <div style={{ width: 130, height: 10, border: `1px solid ${C.border}`, background: `linear-gradient(90deg, #c9c2b6, ${C.pink})` }} />
              <span>HIGH</span>
            </div>
          </div>
        </Card>
      </div>
    </Canvas>
  );
};

// ── Scene 6 · Step 04 · Deal-flow board ──────────────────────────────────────
const KCard = ({ title, tag, delay, accent, moveX = 0 }: { title: string; tag?: string; delay: number; accent?: string; moveX?: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 15);
  return (
    <Card style={{ padding: "16px 18px", opacity: p, transform: `translate(${moveX}px, ${interpolate(p, [0, 1], [22, 0])}px)`, borderLeft: accent ? `4px solid ${accent}` : `1px solid ${C.border}` }}>
      <div style={{ fontFamily: serif, fontSize: 22, color: C.ink }}>{title}</div>
      {tag && <div style={{ marginTop: 8, fontFamily: mono, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: C.green }}>{tag}</div>}
      {!tag && <div style={{ marginTop: 10, height: 5, width: 78, background: C.paper, border: `1px solid ${C.border}` }} />}
    </Card>
  );
};

const KColumn = ({ title, count, children }: { title: string; count: string; children?: React.ReactNode }) => (
  <div style={{ width: 300 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontFamily: mono, fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", color: C.ink }}>{title}</span>
      <span style={{ fontFamily: mono, fontSize: 13, color: C.smoke }}>{count}</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
  </div>
);

const ScenePipeline = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  // the "Edge runtime" card slides from Sourced into Meeting
  const slide = interpolate(f, [86, 118], [0, 316], { ...clamp, easing: ease });
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 110, top: 150, width: 1600, opacity: p, transform: `translateY(${riseY(f, 2, 26)}px)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 26 }}>
          <StepNum n="04" />
          <Eyebrow>Move through deal flow</Eyebrow>
          <div style={{ marginLeft: 12, fontFamily: mono, fontSize: 14, letterSpacing: "0.1em", color: C.smoke, border: `1px solid ${C.border}`, padding: "6px 12px" }}>DEAL FLOW · 7 ACTIVE</div>
        </div>
        <Headline size={74}>Save a builder. The agent drafts the outreach.</Headline>
      </div>
      <div style={{ position: "absolute", left: 110, top: 470, display: "flex", gap: 36 }}>
        <KColumn title="Sourced" count="3">
          <KCard title="Sync engine" delay={30} />
          <div style={{ transform: `translateX(${slide}px)`, position: "relative", zIndex: 5 }}>
            <KCard title="Edge runtime" tag="Drafted outreach ✓" delay={40} accent={C.green} />
          </div>
        </KColumn>
        <KColumn title="Meeting" count="2">
          <KCard title="Eval harness" tag="Thu 2:00" delay={52} accent={C.blue} />
        </KColumn>
        <KColumn title="Diligence" count="1">
          <KCard title="Vector store" delay={64} />
        </KColumn>
        <KColumn title="Partner review" count="1">
          <KCard title="Terms review" delay={76} />
        </KColumn>
      </div>
    </Canvas>
  );
};

// ── Scene 7 · Founders ───────────────────────────────────────────────────────
const CommitGraph = () => {
  const f = useCurrentFrame();
  const cells = Array.from({ length: 84 }, (_, i) => {
    const lit = (i * 13 + 7) % 5 < 2;
    const pulse = interpolate(Math.sin((f + i * 5) / 14), [-1, 1], [0.5, 1]);
    return { lit, pulse };
  });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(28, 1fr)", gap: 4 }}>
      {cells.map((c, i) => (
        <div key={i} style={{ width: 12, height: 12, background: c.lit ? C.blue : C.paper, border: `1px solid ${c.lit ? C.border : "transparent"}`, opacity: c.lit ? c.pulse : 1 }} />
      ))}
    </div>
  );
};

const SceneFounders = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 110, top: 300, width: 720, opacity: p, transform: `translateY(${riseY(f, 2, 30)}px)` }}>
        <div style={{ marginBottom: 26 }}>
          <Eyebrow color={C.blue}>For founders</Eyebrow>
        </div>
        <Headline size={86}>Founders get the other half.</Headline>
        <Sub style={{ marginTop: 32 }}>Verified builds, launches, and traction in one quiet profile — matched to investors by thesis, stage, sector, and geography. No warm intro required.</Sub>
      </div>
      <div style={{ position: "absolute", left: 1000, top: 232, width: 800, opacity: p, transform: `translateY(${riseY(f, 6, 50)}px)` }}>
        <Card style={{ padding: "34px 38px" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 26 }}>
            <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", color: C.white, background: C.blue, border: `1px solid ${C.border}`, padding: "6px 12px" }}>FOUNDER ON APPARENT</span>
            <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", color: C.ink, border: `1px solid ${C.border}`, padding: "6px 12px" }}>RAISING SEED · $1.5M</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 66, height: 66, borderRadius: "50%", background: C.paper, border: `1px solid ${C.border}` }} />
            <div>
              <div style={{ fontFamily: serif, fontSize: 32, color: C.ink }}>Aria Kim</div>
              <div style={{ fontFamily: mono, fontSize: 15, color: C.smoke }}>@ariakim · San Francisco</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.12em", color: C.smoke }}>MRR</div>
              <div style={{ fontFamily: serif, fontSize: 32, color: C.ink }}>$24K</div>
              <div style={{ fontFamily: sans, fontSize: 15, color: C.green, fontWeight: 600 }}>+22% MoM</div>
            </div>
          </div>
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: `1px solid ${C.paper}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color: C.ink }}>GitHub verified</span>
              <span style={{ fontFamily: mono, fontSize: 13, color: C.smoke }}>1,284 COMMITS · LAST YEAR</span>
            </div>
            <CommitGraph />
          </div>
          <div style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {[["CURRENT BUILD", "AgentKit v2"], ["TRACTION", "4.2K GitHub stars"], ["CATEGORY", "AI agents"], ["LAUNCH", "Product Hunt #2"]].map(([l, v]) => (
              <div key={l} style={{ borderTop: `1px solid ${C.paper}`, paddingTop: 12 }}>
                <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.1em", color: C.smoke }}>{l}</div>
                <div style={{ fontFamily: sans, fontSize: 19, fontWeight: 600, color: C.ink, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Canvas>
  );
};

// ── Scene 8 · Close (brutalist ink end-cap, like the site footer) ────────────
const SceneClose = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 24);
  const rise = riseY(f, 6, 30);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: p }}>
        <div style={{ textAlign: "center", transform: `translateY(${rise}px)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <Logo size={54} color={C.canvas} />
            <Img src={staticFile("brand/wordmark-white.png")} style={{ height: 44 }} />
          </div>
          <div style={{ fontFamily: serif, fontSize: 104, lineHeight: 1.0, color: C.canvas, letterSpacing: "-0.02em", marginTop: 40 }}>
            Source from proof,<br />not noise.
          </div>
          <div style={{ fontFamily: sans, fontSize: 28, color: "rgba(247,244,239,0.66)", marginTop: 32 }}>
            Founders get seen. Investors find fit. Capital finds proof.
          </div>
          <div style={{ marginTop: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 20, opacity: fade(f, 26, 46) }}>
            <div style={{ background: C.green, color: C.white, border: `1px solid ${C.canvas}`, boxShadow: `4px 4px 0 0 ${C.canvas}`, padding: "18px 36px", fontFamily: sans, fontSize: 22, fontWeight: 600 }}>apparent.social</div>
          </div>
          <div style={{ marginTop: 40, fontFamily: mono, fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(247,244,239,0.4)", opacity: fade(f, 40, 60) }}>
            React · Supabase · Kinde · an AI sourcing agent
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Timeline assembly ────────────────────────────────────────────────────────
const FPS = 30;
const TAIL = 0.7; // seconds of breathing room after each VO clip
const LEAD = 0.25; // VO starts slightly after the scene appears

const SCENE_DEFS = [
  { id: "01-hook", C: SceneHook },
  { id: "02-what", C: SceneWhat },
  { id: "03-thesis", C: SceneThesis },
  { id: "04-sourcing", C: SceneSourcing },
  { id: "05-density", C: SceneDensity },
  { id: "06-pipeline", C: ScenePipeline },
  { id: "07-founders", C: SceneFounders },
  { id: "08-close", C: SceneClose },
] as const;

const SCENES = (() => {
  let from = 0;
  return SCENE_DEFS.map((s) => {
    const len = Math.ceil(((voDur as Record<string, number>)[s.id] + TAIL) * FPS);
    const out = { ...s, from, len };
    from += len;
    return out;
  });
})();

export const SITE_EXPLAINER_DURATION = SCENES.reduce((a, s) => a + s.len, 0);

export const ApparentSiteExplainer = () => {
  const f = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      {/* Music bed across the whole piece (already quiet + faded in the file). */}
      <Audio src={staticFile("music/bed.mp3")} volume={0.9} />

      {SCENES.map((s, i) => {
        const Comp = s.C;
        const isLast = i === SCENES.length - 1;
        const op =
          fade(f, s.from, s.from + 12) *
          (isLast ? 1 : interpolate(f, [s.from + s.len - 12, s.from + s.len], [1, 0], clamp));
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.len}>
            <div style={{ opacity: op }}>
              <Comp />
            </div>
            <Sequence from={Math.round(LEAD * FPS)}>
              <Audio src={staticFile(`vo/${s.id}.mp3`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
