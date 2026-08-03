import {
  AbsoluteFill,
  Sequence,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  Audio,
} from "remotion";
import voDur from "./vo2-durations.json";
import {
  C,
  clamp,
  fade,
  riseY,
  serif,
  sans,
  mono,
  Logo,
  Canvas,
  Eyebrow,
  Card,
  StepNum,
  Headline,
  Sub,
} from "./SiteExplainer";

// Numbered / labelled left column shared by the feature scenes.
const Head = ({ label, title, sub, accent = C.ink, n, titleSize = 78, width = 700 }: { label: string; title: React.ReactNode; sub: React.ReactNode; accent?: string; n?: string; titleSize?: number; width?: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  return (
    <div style={{ position: "absolute", left: 110, top: 300, width, opacity: p, transform: `translateY(${riseY(f, 2, 30)}px)` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
        {n && <StepNum n={n} color={accent} />}
        <Eyebrow color={accent}>{label}</Eyebrow>
      </div>
      <Headline size={titleSize}>{title}</Headline>
      <Sub style={{ marginTop: 28 }}>{sub}</Sub>
    </div>
  );
};

const MonoLabel = ({ children, color = C.smoke }: { children: React.ReactNode; color?: string }) => (
  <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", color }}>{children}</span>
);

// ── Scene 1 · Intro ──────────────────────────────────────────────────────────
const SceneIntro = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 22);
  const Side = ({ label, title, items, accent, delay }: { label: string; title: string; items: string[]; accent: string; delay: number }) => (
    <Card style={{ flex: 1, padding: "30px 32px", opacity: fade(f, delay, delay + 18), transform: `translateY(${riseY(f, delay, 34)}px)`, borderTop: `6px solid ${accent}` }}>
      <MonoLabel color={accent}>{label}</MonoLabel>
      <div style={{ fontFamily: serif, fontSize: 40, color: C.ink, marginTop: 10 }}>{title}</div>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((it) => (
          <div key={it} style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: sans, fontSize: 20, color: C.graphite }}>
            <div style={{ width: 8, height: 8, background: accent, border: `1px solid ${C.border}` }} />
            {it}
          </div>
        ))}
      </div>
    </Card>
  );
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 110, top: 150, right: 110 }}>
        <div style={{ opacity: fade(f, 6, 24) }}>
          <Eyebrow>A technical tour</Eyebrow>
        </div>
        <Headline size={104} style={{ marginTop: 22, opacity: p, transform: `translateY(${riseY(f, 4, 40)}px)` }}>
          Two sides. Two agents. One fit.
        </Headline>
        <Sub style={{ marginTop: 26, width: 1300, opacity: fade(f, 24, 44) }}>
          Apparent is a two-sided platform with an AI agent working for each side — matched on proof, not warm intros.
        </Sub>
        <div style={{ display: "flex", gap: 30, marginTop: 46 }}>
          <Side label="For founders" title="Get discovered" items={["Verified proof profile", "Matched by thesis", "A founder agent that pitches"]} accent={C.blue} delay={38} />
          <Side label="For investors" title="Source deal flow" items={["Private thesis workspace", "AI sourcing agent, 24/7", "Pipeline + Builder Radar"]} accent={C.green} delay={50} />
        </div>
      </div>
    </Canvas>
  );
};

// ── Scene 2 · Architecture (data flow) ───────────────────────────────────────
const FlowNode = ({ label, title, sub, accent = C.ink, delay }: { label: string; title: string; sub: string; accent?: string; delay: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 16);
  return (
    <Card style={{ width: 340, padding: "22px 24px", opacity: p, transform: `translateY(${riseY(f, delay, 30)}px)`, borderTop: `5px solid ${accent}` }}>
      <MonoLabel color={accent}>{label}</MonoLabel>
      <div style={{ fontFamily: serif, fontSize: 30, color: C.ink, marginTop: 8 }}>{title}</div>
      <div style={{ fontFamily: sans, fontSize: 17, color: C.graphite, marginTop: 8, lineHeight: 1.35 }}>{sub}</div>
    </Card>
  );
};
const Arrow = ({ delay }: { delay: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 12);
  return <div style={{ fontFamily: serif, fontSize: 44, color: C.ink, opacity: p, alignSelf: "center", margin: "0 6px" }}>→</div>;
};

const SceneArch = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 110, top: 200, opacity: p, transform: `translateY(${riseY(f, 2, 26)}px)` }}>
        <Eyebrow>How it fits together</Eyebrow>
        <Headline size={78} style={{ marginTop: 22 }}>Evidence in. Matches out.</Headline>
      </div>
      <div style={{ position: "absolute", left: 110, top: 460, right: 110, display: "flex", alignItems: "flex-start" }}>
        <FlowNode label="Input" title="Founder proof" sub="GitHub, shipped products, launches, traction." accent={C.blue} delay={24} />
        <Arrow delay={38} />
        <FlowNode label="Enrich" title="Verified profile" sub="Proof + public signals, continuously refreshed." delay={46} />
        <Arrow delay={60} />
        <FlowNode label="Match" title="Thesis matching" sub="Ranked by proof, freshness, and fit." accent={C.green} delay={68} />
        <Arrow delay={82} />
        <FlowNode label="Output" title="Investor pipeline" sub="Pre-vetted deal flow, ready to work." accent={C.green} delay={90} />
      </div>
      <div style={{ position: "absolute", left: 110, top: 730, fontFamily: mono, fontSize: 15, letterSpacing: "0.08em", color: C.smoke, opacity: fade(f, 100, 118) }}>
        ↑ SIGNALS PIPELINE FEEDS THE PROFILE · ORTHOGONAL INFERENCE POWERS THE MATCH
      </div>
    </Canvas>
  );
};

// ── Scene 3 · Founders · verify in one command (terminal) ────────────────────
const Terminal = () => {
  const f = useCurrentFrame();
  const lines: { t: string; d: number; c: string }[] = [
    { t: "$ npx apparent", d: 6, c: C.canvas },
    { t: "✓ GitHub linked — 1,284 commits, 12 repos", d: 20, c: "#5fd39a" },
    { t: "✓ Products imported — AgentKit, Ledgerline", d: 32, c: "#5fd39a" },
    { t: "✓ Traction synced — $24K MRR, +22% MoM", d: 44, c: "#5fd39a" },
    { t: "✓ Launches — Product Hunt #2, HN front page", d: 56, c: "#5fd39a" },
    { t: "→ Proof profile ready at apparent.social/ariakim", d: 70, c: C.pink },
  ];
  const cursorOn = Math.floor(f / 15) % 2 === 0;
  return (
    <Card style={{ width: 820, background: C.ink, padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: `1px solid rgba(247,244,239,0.15)` }}>
        {["#ff6058", "#ffbd2e", "#28ca42"].map((c) => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
        <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: "rgba(247,244,239,0.55)", marginLeft: 10 }}>founder@local: ~/agentkit</span>
      </div>
      <div style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 14, minHeight: 300 }}>
        {lines.map((ln, i) => (
          <div key={i} style={{ fontFamily: mono, fontSize: 19, color: ln.c, opacity: fade(f, ln.d, ln.d + 8) }}>
            {ln.t}
            {i === lines.length - 1 && cursorOn && <span style={{ color: C.canvas }}> ▍</span>}
          </div>
        ))}
      </div>
    </Card>
  );
};

const SceneFVerify = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  return (
    <Canvas>
      <Head n="01" label="For founders · verify" accent={C.blue} title={<>Verified in<br />one command.</>} sub="Run npx apparent — your GitHub history, shipped products, and traction become a proof profile investors can trust." width={640} />
      <div style={{ position: "absolute", left: 980, top: 250, opacity: p, transform: `translateY(${riseY(f, 6, 44)}px)` }}>
        <Terminal />
      </div>
    </Canvas>
  );
};

// ── Scene 4 · Founders · agent reaches out ───────────────────────────────────
const MatchRow = ({ name, thesis, fit, delay }: { name: string; thesis: string; fit: string; delay: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 14);
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", opacity: p, transform: `translateX(${interpolate(p, [0, 1], [22, 0])}px)` }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.paper, border: `1px solid ${C.border}` }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: serif, fontSize: 24, color: C.ink }}>{name}</div>
        <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.06em", color: C.smoke, marginTop: 3, textTransform: "uppercase" }}>{thesis}</div>
      </div>
      <div style={{ fontFamily: serif, fontSize: 30, color: C.blue }}>{fit}</div>
    </Card>
  );
};

const SceneFAgent = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  const dot = interpolate(Math.sin(f / 6), [-1, 1], [0.4, 1]);
  return (
    <Canvas>
      <Head n="02" label="For founders · matched" accent={C.blue} title={<>Your agent<br />pitches for you.</>} sub="Matched by thesis, stage, and category — then your AI founder agent opens personalized intros to investors who fit. Never spam." width={660} />
      <div style={{ position: "absolute", left: 940, top: 232, width: 880, opacity: p }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, opacity: fade(f, 10, 24) }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: C.blue, opacity: dot }} />
          <MonoLabel color={C.ink}>Founder agent · finding investors</MonoLabel>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MatchRow name="Northstar Ventures" thesis="AI infra · Seed · leads" fit="94%" delay={24} />
          <MatchRow name="Amino Capital" thesis="Dev tools · backs technical PMF" fit="90%" delay={36} />
          <MatchRow name="1517 Fund" thesis="Pre-seed · ex-founders" fit="86%" delay={48} />
        </div>
        <div style={{ marginTop: 20, opacity: fade(f, 66, 84), transform: `translateY(${riseY(f, 66, 24)}px)` }}>
          <Card style={{ padding: "20px 24px", borderLeft: `6px solid ${C.blue}` }}>
            <MonoLabel color={C.blue}>Drafted intro ✓</MonoLabel>
            <div style={{ fontFamily: sans, fontSize: 20, color: C.ink, marginTop: 8, lineHeight: 1.4 }}>
              “Hi Northstar — AgentKit just crossed $24K MRR with 4.2K GitHub stars. Given your AI-infra thesis, thought it was worth a look…”
            </div>
          </Card>
        </div>
      </div>
    </Canvas>
  );
};

// ── Scene 5 · Investors · thesis workspace ───────────────────────────────────
const CritRow = ({ label, value, delay }: { label: string; value: string; delay: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 14);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: `1px solid ${C.paper}`, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [16, 0])}px)` }}>
      <MonoLabel>{label}</MonoLabel>
      <span style={{ fontFamily: sans, fontSize: 23, fontWeight: 600, color: C.ink }}>{value}</span>
    </div>
  );
};

const SceneIThesis = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  return (
    <Canvas>
      <Head n="03" label="For investors · thesis" accent={C.green} title={<>Screen against<br />your thesis.</>} sub="Sectors, stages, geographies, check size — plus the must-have signals you need, and the reasons you pass." width={680} />
      <div style={{ position: "absolute", left: 1010, top: 236, width: 800, opacity: p, transform: `translateY(${riseY(f, 6, 50)}px)` }}>
        <Card style={{ padding: "36px 42px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <MonoLabel color={C.green}>Investment thesis</MonoLabel>
            <MonoLabel>Editable</MonoLabel>
          </div>
          <CritRow label="Sectors" value="Dev tools · AI infra" delay={26} />
          <CritRow label="Stage" value="Pre-seed → Seed" delay={38} />
          <CritRow label="Geography" value="SF · NYC · Remote" delay={50} />
          <CritRow label="Check size" value="$250K – $1.5M" delay={62} />
          <div style={{ marginTop: 22, display: "flex", gap: 10, flexWrap: "wrap", opacity: fade(f, 74, 90) }}>
            <span style={{ fontFamily: mono, fontSize: 13, color: C.white, background: C.green, border: `1px solid ${C.border}`, padding: "7px 13px" }}>MUST-HAVE · SHIPS IN PUBLIC</span>
            <span style={{ fontFamily: mono, fontSize: 13, color: C.white, background: C.green, border: `1px solid ${C.border}`, padding: "7px 13px" }}>MUST-HAVE · REVENUE</span>
            <span style={{ fontFamily: mono, fontSize: 13, color: C.ink, border: `1px solid ${C.border}`, padding: "7px 13px" }}>PASS · PRE-PRODUCT</span>
          </div>
        </Card>
      </div>
    </Canvas>
  );
};

// ── Scene 6 · Investors · pre-vetted deal flow (daily digest) ────────────────
const DealRow = ({ name, meta, mrr, fit, delay }: { name: string; meta: string; mrr: string; fit: string; delay: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 14);
  return (
    <Card style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 22px", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [22, 0])}px)` }}>
      <div style={{ width: 50, height: 50, borderRadius: "50%", background: C.paper, border: `1px solid ${C.border}`, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: serif, fontSize: 25, color: C.ink }}>{name}</span>
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", color: C.green, border: `1px solid ${C.green}`, padding: "2px 8px" }}>✓ VERIFIED</span>
        </div>
        <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.05em", color: C.smoke, marginTop: 5, textTransform: "uppercase" }}>{meta}</div>
      </div>
      <div style={{ textAlign: "right", paddingRight: 18, borderRight: `1px solid ${C.paper}`, marginRight: 4 }}>
        <MonoLabel>MRR</MonoLabel>
        <div style={{ fontFamily: serif, fontSize: 26, color: C.ink }}>{mrr}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <MonoLabel>Fit</MonoLabel>
        <div style={{ fontFamily: serif, fontSize: 34, color: C.green }}>{fit}</div>
      </div>
    </Card>
  );
};

const SceneISource = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  return (
    <Canvas>
      <Head n="04" label="For investors · sourcing" accent={C.green} title={<>Pre-vetted deal<br />flow, daily.</>} sub="An AI sourcing agent screens founders 24/7 — ranked by proof, freshness, and fit, with revenue surfaced upfront." width={640} />
      <div style={{ position: "absolute", left: 900, top: 244, width: 920, opacity: p }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, opacity: fade(f, 10, 24) }}>
          <MonoLabel color={C.ink}>Today&apos;s digest · 6 new</MonoLabel>
          <MonoLabel>ranked by fit</MonoLabel>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <DealRow name="Aria Kim" meta="AI agents · Seed · SF" mrr="$24K" fit="92%" delay={24} />
          <DealRow name="Devansh Rao" meta="Dev tools · Pre-seed · NYC" mrr="$9K" fit="88%" delay={38} />
          <DealRow name="Mara Ochoa" meta="AI infra · Seed · Remote" mrr="$31K" fit="84%" delay={52} />
        </div>
      </div>
    </Canvas>
  );
};

// ── Scene 7 · Investors · map, brief, work (radar + deep dive + pipeline) ─────
const DENSITY = (() => {
  const rand = (i: number, s: number) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
  const dots: { x: number; y: number; r: number; h: number }[] = [];
  const cl = [{ cx: 0.35, cy: 0.55, n: 34, sp: 0.16 }, { cx: 0.68, cy: 0.42, n: 26, sp: 0.13 }];
  let idx = 0;
  for (const c of cl) for (let i = 0; i < c.n; i++) { const a = rand(idx, 1) * 6.28; const d = rand(idx, 2) ** 1.5 * c.sp; dots.push({ x: c.cx + Math.cos(a) * d * 1.4, y: c.cy + Math.sin(a) * d, r: 4 + rand(idx, 3) * 7, h: 1 - d / c.sp }); idx++; }
  for (let i = 0; i < 24; i++) { dots.push({ x: rand(idx, 4), y: rand(idx, 5), r: 3, h: 0.15 }); idx++; }
  return dots;
})();

const Panel = ({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 16);
  return (
    <Card style={{ flex: 1, height: 470, padding: 0, opacity: p, transform: `translateY(${riseY(f, delay, 30)}px)`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, background: C.white }}>
        <MonoLabel color={C.ink}>{title}</MonoLabel>
      </div>
      <div style={{ flex: 1, position: "relative" }}>{children}</div>
    </Card>
  );
};

const SceneIWork = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  const stages = ["Screening", "First meeting", "Diligence", "Partner review"];
  const active = Math.min(3, Math.floor(interpolate(f, [70, 130], [0, 4], clamp)));
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 110, top: 170, opacity: p, transform: `translateY(${riseY(f, 2, 26)}px)` }}>
        <Eyebrow color={C.green}>For investors · work the pipeline</Eyebrow>
        <Headline size={72} style={{ marginTop: 20 }}>Map it. Brief it. Work it.</Headline>
      </div>
      <div style={{ position: "absolute", left: 110, top: 400, right: 110, display: "flex", gap: 34 }}>
        <Panel title="Builder Radar" delay={26}>
          <div style={{ position: "absolute", inset: 0, background: "#f0ece5", backgroundImage: "linear-gradient(rgba(20,2,6,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(20,2,6,0.05) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
          {DENSITY.map((d, i) => (
            <div key={i} style={{ position: "absolute", left: `${8 + d.x * 84}%`, top: `${12 + d.y * 72}%`, width: d.r * 2, height: d.r * 2, marginLeft: -d.r, marginTop: -d.r, borderRadius: "50%", background: d.h > 0.55 ? C.pink : d.h > 0.3 ? "#ff9db4" : "#c9c2b6", border: d.h > 0.3 ? `1px solid ${C.border}` : "none", opacity: fade(f, 30 + (i % 20), 30 + (i % 20) + 12) * (0.5 + d.h * 0.5) }} />
          ))}
          <div style={{ position: "absolute", left: 16, bottom: 14, fontFamily: serif, fontSize: 24, color: C.ink }}>3,438<span style={{ fontFamily: mono, fontSize: 12, color: C.smoke, marginLeft: 8 }}>SIGNALS</span></div>
        </Panel>
        <Panel title="Deep dive" delay={40}>
          <div style={{ padding: "20px 22px" }}>
            <div style={{ fontFamily: serif, fontSize: 26, color: C.ink }}>AgentKit — brief</div>
            {[["WHAT CHANGED", "Shipped v2, +22% MoM revenue"], ["WHAT'S WORKING", "4.2K stars, 40 paying teams"], ["DILIGENCE NEXT", "Retention, infra margins"]].map(([l, v], i) => (
              <div key={l} style={{ marginTop: 16, opacity: fade(f, 52 + i * 8, 52 + i * 8 + 12) }}>
                <MonoLabel color={C.green}>{l}</MonoLabel>
                <div style={{ fontFamily: sans, fontSize: 18, color: C.graphite, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Pipeline" delay={54}>
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {stages.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `1px solid ${C.border}`, background: i === active ? C.green : C.white, opacity: fade(f, 60 + i * 8, 60 + i * 8 + 12) }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: i <= active ? (i === active ? C.white : C.green) : C.paper, border: `1px solid ${C.border}` }} />
                <span style={{ fontFamily: sans, fontSize: 19, fontWeight: 600, color: i === active ? C.white : C.ink }}>{s}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </Canvas>
  );
};

// ── Scene 8 · Under the hood (stack) ─────────────────────────────────────────
const StackCol = ({ layer, items, accent, delay }: { layer: string; items: string[]; accent: string; delay: number }) => {
  const f = useCurrentFrame();
  const p = fade(f, delay, delay + 16);
  return (
    <Card style={{ flex: 1, padding: "28px 30px", opacity: p, transform: `translateY(${riseY(f, delay, 30)}px)`, borderTop: `6px solid ${accent}` }}>
      <MonoLabel color={accent}>{layer}</MonoLabel>
      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 13 }}>
        {items.map((it, i) => (
          <div key={it} style={{ fontFamily: sans, fontSize: 21, color: C.ink, opacity: fade(f, delay + 6 + i * 4, delay + 6 + i * 4 + 12), display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 7, height: 7, background: accent, border: `1px solid ${C.border}` }} />
            {it}
          </div>
        ))}
      </div>
    </Card>
  );
};

const SceneStack = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 20);
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 110, top: 160, opacity: p, transform: `translateY(${riseY(f, 2, 26)}px)` }}>
        <Eyebrow>Under the hood</Eyebrow>
        <Headline size={78} style={{ marginTop: 20 }}>Built end to end.</Headline>
      </div>
      <div style={{ position: "absolute", left: 110, top: 410, right: 110, display: "flex", gap: 30 }}>
        <StackCol layer="Frontend" accent={C.blue} items={["React 19 + TypeScript", "Vite · Tailwind", "Radix UI · React Router"]} delay={26} />
        <StackCol layer="Backend" accent={C.ink} items={["Supabase Postgres", "Edge Functions", "Kinde identity + roles", "Vercel serverless"]} delay={40} />
        <StackCol layer="Intelligence" accent={C.green} items={["Orthogonal inference", "Founder + investor agents", "Signals ingestion pipeline", "Builder Radar (maplibre)"]} delay={54} />
      </div>
      <div style={{ position: "absolute", left: 110, bottom: 70, fontFamily: mono, fontSize: 15, letterSpacing: "0.08em", color: C.smoke, opacity: fade(f, 80, 100) }}>
        ONE CODEBASE · TWO AI AGENTS · BUDGETED, TOOL-CALLING INFERENCE ON EVERY REQUEST
      </div>
    </Canvas>
  );
};

// ── Scene 9 · Close ──────────────────────────────────────────────────────────
const SceneClose = () => {
  const f = useCurrentFrame();
  const p = fade(f, 0, 24);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: p }}>
        <div style={{ textAlign: "center", transform: `translateY(${riseY(f, 6, 30)}px)` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <Logo size={54} color={C.canvas} />
            <Img src={staticFile("brand/wordmark-white.png")} style={{ height: 44 }} />
          </div>
          <div style={{ fontFamily: serif, fontSize: 108, lineHeight: 1.0, color: C.canvas, letterSpacing: "-0.02em", marginTop: 40 }}>
            Two sides. One fit.
          </div>
          <div style={{ fontFamily: sans, fontSize: 27, color: "rgba(247,244,239,0.66)", marginTop: 30 }}>
            Founders get discovered. Investors source from proof.
          </div>
          <div style={{ marginTop: 46, display: "flex", justifyContent: "center", opacity: fade(f, 24, 44) }}>
            <div style={{ background: C.green, color: C.white, border: `1px solid ${C.canvas}`, boxShadow: `4px 4px 0 0 ${C.canvas}`, padding: "18px 36px", fontFamily: sans, fontSize: 22, fontWeight: 600 }}>apparent.social</div>
          </div>
          <div style={{ marginTop: 40, fontFamily: mono, fontSize: 14, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(247,244,239,0.4)", opacity: fade(f, 38, 58) }}>
            React · Supabase · Kinde · Orthogonal inference
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Timeline ─────────────────────────────────────────────────────────────────
const FPS = 30;
const TAIL = 0.7;
const LEAD = 0.25;

const DEFS = [
  { id: "01-intro", C: SceneIntro },
  { id: "02-arch", C: SceneArch },
  { id: "03-fverify", C: SceneFVerify },
  { id: "04-fagent", C: SceneFAgent },
  { id: "05-ithesis", C: SceneIThesis },
  { id: "06-isource", C: SceneISource },
  { id: "07-iradar", C: SceneIWork },
  { id: "08-stack", C: SceneStack },
  { id: "09-close", C: SceneClose },
] as const;

const SCENES = (() => {
  let from = 0;
  return DEFS.map((s) => {
    const len = Math.ceil(((voDur as Record<string, number>)[s.id] + TAIL) * FPS);
    const out = { ...s, from, len };
    from += len;
    return out;
  });
})();

export const FEATURE_TOUR_DURATION = SCENES.reduce((a, s) => a + s.len, 0);

export const ApparentFeatureTour = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <Audio src={staticFile("music/bed-long.mp3")} volume={0.9} />
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
              <Audio src={staticFile(`vo2/${s.id}.mp3`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
