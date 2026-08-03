import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  Brand,
  FounderCard,
  PaperBackground,
  ScreenshotFrame,
  clamp,
  colors,
  ease,
  fade,
  outro,
  sans,
  serif,
} from "./Composition";

// A step badge used across the "how it works" scenes.
const StepTag = ({ n, label }: { n: string; label: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 12,
        background: colors.olive,
        color: "white",
        fontFamily: sans,
        fontWeight: 900,
        fontSize: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {n}
    </div>
    <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 18, letterSpacing: 2, textTransform: "uppercase", color: colors.olive }}>
      {label}
    </div>
  </div>
);

const rise = (frame: number, start: number, distance = 40) =>
  interpolate(frame, [start, start + 22], [distance, 0], { ...clamp, easing: ease });

// ── Scene 1 · Hook ──────────────────────────────────────────────
const SceneHook = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 26);
  const strike = interpolate(frame, [40, 72], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <PaperBackground wave={10} />
      <div style={{ position: "absolute", left: 84, top: 84, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 120, top: 300, width: 1400, opacity: p }}>
        <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 20, letterSpacing: 2, color: colors.olive, marginBottom: 30, textTransform: "uppercase" }}>
          How Apparent works
        </div>
        <div style={{ fontFamily: serif, fontSize: 112, lineHeight: 0.98, color: colors.ink }}>
          Sourcing still runs on{" "}
          <span style={{ position: "relative", display: "inline-block" }}>
            warm intros
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "56%",
                height: 8,
                background: "#c0453a",
                borderRadius: 4,
                transform: `scaleX(${strike})`,
                transformOrigin: "left",
              }}
            />
          </span>
          .
        </div>
        <div style={{ marginTop: 40, fontFamily: sans, fontSize: 32, lineHeight: 1.45, color: colors.muted, width: 1120 }}>
          The best builders stay invisible until someone you know knows them. Apparent replaces the network with proof.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 2 · What it is ────────────────────────────────────────
const SceneWhat = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 24);
  return (
    <AbsoluteFill>
      <PaperBackground wave={-14} />
      <div style={{ position: "absolute", left: 84, top: 84, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 120, top: 268, width: 1680, opacity: p, transform: `translateY(${rise(frame, 6)}px)` }}>
        <div style={{ fontFamily: serif, fontSize: 118, lineHeight: 0.98, color: colors.ink }}>
          An AI sourcing agent for investors.
        </div>
        <div style={{ marginTop: 44, fontFamily: sans, fontSize: 34, lineHeight: 1.45, color: colors.muted, width: 1240 }}>
          You define a thesis. Your agent works around the clock, ranking{" "}
          <span style={{ color: colors.olive, fontWeight: 800 }}>verified founders</span> by proof, freshness, and fit — surfaced fresh every day.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 52 }}>
          {["Verified proof, not pitches", "No warm intro required", "Fresh daily"].map((t) => (
            <div key={t} style={{ borderRadius: 999, background: colors.founder, color: colors.olive, padding: "16px 26px", fontFamily: sans, fontWeight: 800, fontSize: 20 }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 3 · Step 1 · Thesis workspace ─────────────────────────
const ThesisRow = ({ label, value, delay }: { label: string; value: string; delay: number }) => {
  const frame = useCurrentFrame();
  const p = fade(frame, delay, delay + 16);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0", borderBottom: "1px solid rgba(17,17,17,0.08)", opacity: p, transform: `translateX(${interpolate(p, [0, 1], [18, 0])}px)` }}>
      <span style={{ fontFamily: sans, fontSize: 15, letterSpacing: 2, fontWeight: 800, color: colors.muted, textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontFamily: sans, fontSize: 24, fontWeight: 800, color: colors.ink }}>{value}</span>
    </div>
  );
};

const SceneThesis = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  const saved = fade(frame, 96, 112);
  return (
    <AbsoluteFill>
      <PaperBackground wave={20} />
      <div style={{ position: "absolute", left: 92, top: 92, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 110, top: 300, width: 720, opacity: p }}>
        <StepTag n="1" label="Build your thesis" />
        <div style={{ fontFamily: serif, fontSize: 88, lineHeight: 0.98, color: colors.ink }}>
          Turn your taste into criteria.
        </div>
        <div style={{ marginTop: 34, fontFamily: sans, fontSize: 27, lineHeight: 1.45, color: colors.muted }}>
          Sectors, stages, geographies, check size, and the founder signals you back — captured once, sourced against forever.
        </div>
      </div>
      {/* Thesis workspace card */}
      <div style={{ position: "absolute", left: 1010, top: 236, width: 760, opacity: p, transform: `translateY(${rise(frame, 4, 60)}px)` }}>
        <div style={{ background: colors.offWhite, borderRadius: 30, border: "1px solid rgba(17,17,17,0.1)", boxShadow: "0 34px 90px rgba(17,17,17,0.14)", padding: "40px 44px", fontFamily: sans }}>
          <div style={{ fontFamily: sans, fontSize: 14, letterSpacing: 3, fontWeight: 800, color: colors.olive, textTransform: "uppercase" }}>Thesis workspace</div>
          <div style={{ marginTop: 18 }}>
            <ThesisRow label="Sectors" value="Dev tools · AI infra" delay={24} />
            <ThesisRow label="Stage" value="Pre-seed → Seed" delay={38} />
            <ThesisRow label="Geographies" value="SF · NYC · Remote" delay={52} />
            <ThesisRow label="Check size" value="$250K – $1.5M" delay={66} />
            <ThesisRow label="Signal you back" value="Ships in public" delay={80} />
          </div>
          <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 14, opacity: saved }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: colors.accent, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900 }}>✓</div>
            <span style={{ fontSize: 19, color: colors.ink, fontWeight: 700 }}>Saved. Your agent sources against this continuously.</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 4 · Step 2 · Agent-sourced inbox ──────────────────────
const InboxRow = ({ name, meta, score, proof, delay }: { name: string; meta: string; score: string; proof: string; delay: number }) => {
  const frame = useCurrentFrame();
  const p = fade(frame, delay, delay + 16);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, background: colors.dark, borderRadius: 20, padding: "22px 26px", opacity: p, transform: `translateY(${interpolate(p, [0, 1], [26, 0])}px)`, boxShadow: "0 22px 60px rgba(17,17,17,0.18)" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#c79a6f", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: sans, fontSize: 24, fontWeight: 800, color: "white" }}>{name}</span>
          <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 800, color: colors.greenText, border: "1px solid rgba(188,217,154,0.4)", borderRadius: 999, padding: "3px 10px" }}>✓ VERIFIED</span>
        </div>
        <div style={{ fontFamily: sans, fontSize: 15, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{meta}</div>
        <div style={{ fontFamily: sans, fontSize: 15, color: "rgba(255,255,255,0.72)", marginTop: 8 }}>{proof}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: sans, fontSize: 11, letterSpacing: 2, fontWeight: 800, color: "rgba(255,255,255,0.4)" }}>FIT</div>
        <div style={{ fontFamily: sans, fontSize: 30, fontWeight: 900, color: colors.greenText }}>{score}</div>
      </div>
    </div>
  );
};

const SceneInbox = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  return (
    <AbsoluteFill style={{ background: colors.paper }}>
      <PaperBackground wave={-6} />
      <div style={{ position: "absolute", left: 92, top: 92, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 110, top: 300, width: 660, opacity: p }}>
        <StepTag n="2" label="Let your agent source" />
        <div style={{ fontFamily: serif, fontSize: 84, lineHeight: 0.98, color: colors.ink }}>
          Verified founders, ranked by fit.
        </div>
        <div style={{ marginTop: 32, fontFamily: sans, fontSize: 26, lineHeight: 1.45, color: colors.muted }}>
          Your AI agent works 24/7 and fills a clean inbox — every founder carries source links, proof, and a relevance score.
        </div>
      </div>
      <div style={{ position: "absolute", left: 828, top: 214, width: 990, display: "flex", flexDirection: "column", gap: 18, opacity: p }}>
        <InboxRow name="Aria Kim" meta="AI agents · Seed · San Francisco" proof="AgentKit — 4.2K GitHub stars · $24K MRR, +22% MoM" score="92%" delay={24} />
        <InboxRow name="Devansh Rao" meta="Dev tools · Pre-seed · NYC" proof="Local-first sync engine — 1.1K commits last quarter" score="88%" delay={40} />
        <InboxRow name="Mara Ochoa" meta="AI infra · Seed · Remote" proof="Eval harness for LLMs — launched on Product Hunt #2" score="84%" delay={56} />
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 5 · Step 3 · Builder Radar ────────────────────────────
const SceneRadar = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  const scale = interpolate(frame, [0, 150], [1.05, 1], clamp);
  const ping = interpolate(frame % 60, [0, 60], [0.4, 1.6], clamp);
  const pingOpacity = interpolate(frame % 60, [0, 60], [0.5, 0], clamp);
  return (
    <AbsoluteFill style={{ background: "#e8e5dc" }}>
      <ScreenshotFrame src="assets/home-heatmap.jpeg" x={0} y={0} width={1920} height={1080} scale={scale} opacity={p} />
      {/* live ping over the map */}
      <div style={{ position: "absolute", left: 1300, top: 430, opacity: p }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: colors.accent, boxShadow: "0 0 0 6px rgba(2,160,112,0.25)" }} />
        <div style={{ position: "absolute", left: 13, top: 13, width: 26, height: 26, marginLeft: -13, marginTop: -13, borderRadius: "50%", border: `3px solid ${colors.accent}`, transform: `scale(${ping})`, opacity: pingOpacity }} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 84,
          width: 760,
          borderRadius: 30,
          background: "rgba(251,250,247,0.94)",
          padding: "40px 46px",
          boxShadow: "0 30px 90px rgba(17,17,17,0.18)",
          opacity: p,
        }}
      >
        <StepTag n="3" label="Map builder density" />
        <div style={{ fontFamily: serif, fontSize: 62, lineHeight: 1, color: colors.ink }}>Builder Radar.</div>
        <div style={{ marginTop: 20, fontFamily: sans, fontSize: 25, lineHeight: 1.45, color: colors.muted }}>
          Drop a place and see the Apparent builders working around your focus — active projects, nearby, in real time.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 6 · Step 4 · Deal-flow Kanban ─────────────────────────
const KanbanColumn = ({ title, cards, delay, highlight = false }: { title: string; cards: string[]; delay: number; highlight?: boolean }) => {
  const frame = useCurrentFrame();
  const p = fade(frame, delay, delay + 16);
  return (
    <div style={{ width: 300, opacity: p, transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)` }}>
      <div style={{ fontFamily: sans, fontSize: 15, letterSpacing: 2, fontWeight: 800, color: colors.muted, textTransform: "uppercase", marginBottom: 16 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {cards.map((c, i) => (
          <div
            key={c}
            style={{
              background: highlight && i === 0 ? colors.olive : colors.offWhite,
              color: highlight && i === 0 ? "white" : colors.ink,
              border: "1px solid rgba(17,17,17,0.1)",
              borderRadius: 16,
              padding: "18px 20px",
              boxShadow: "0 14px 36px rgba(17,17,17,0.08)",
              fontFamily: sans,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800 }}>{c}</div>
            <div style={{ marginTop: 8, height: 5, width: 90, borderRadius: 999, background: highlight && i === 0 ? "rgba(255,255,255,0.4)" : "rgba(17,17,17,0.12)" }} />
          </div>
        ))}
      </div>
    </div>
  );
};

const SceneKanban = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  return (
    <AbsoluteFill>
      <PaperBackground wave={12} />
      <div style={{ position: "absolute", left: 92, top: 92, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 110, top: 210, width: 1400, opacity: p }}>
        <StepTag n="4" label="Move through deal flow" />
        <div style={{ fontFamily: serif, fontSize: 82, lineHeight: 0.98, color: colors.ink }}>
          Save it, let the agent draft outreach, move it forward.
        </div>
      </div>
      <div style={{ position: "absolute", left: 110, top: 470, display: "flex", gap: 28 }}>
        <KanbanColumn title="Sourcing" cards={["Aria Kim", "Mara Ochoa"]} delay={26} highlight />
        <KanbanColumn title="Meeting" cards={["Devansh Rao"]} delay={40} />
        <KanbanColumn title="Diligence" cards={["Lena Park"]} delay={54} />
        <KanbanColumn title="Partner review" cards={["Yusuf Adeyemi"]} delay={68} />
      </div>
      <div style={{ position: "absolute", left: 110, bottom: 70, fontFamily: sans, fontSize: 24, color: colors.muted, opacity: fade(frame, 78, 96) }}>
        Draft outreach → the agent writes fit-based intros in your voice.
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 7 · Two sides, one fit (founder side) ─────────────────
const SceneFounderSide = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  const cardY = interpolate(frame, [0, 36], [70, 0], { ...clamp, easing: ease });
  return (
    <AbsoluteFill>
      <PaperBackground wave={-18} />
      <div style={{ position: "absolute", left: 92, top: 92, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 110, top: 290, width: 700, opacity: p }}>
        <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 18, letterSpacing: 2, color: colors.olive, marginBottom: 24, textTransform: "uppercase" }}>
          Two sides, one fit
        </div>
        <div style={{ fontFamily: serif, fontSize: 92, lineHeight: 0.96, color: colors.ink }}>
          Founders make their strongest signal visible.
        </div>
        <div style={{ marginTop: 36, fontFamily: sans, fontSize: 27, lineHeight: 1.45, color: colors.muted }}>
          Verified builds, launches, and traction in one quiet profile — matched to investors by thesis, stage, sector, and geography.
        </div>
      </div>
      <div style={{ position: "absolute", left: 1000, top: 190 + cardY, opacity: p }}>
        <FounderCard scale={0.94} />
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 8 · Close ─────────────────────────────────────────────
const SceneClose = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 28);
  const logoScale = interpolate(frame, [0, 34], [0.82, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill>
      <PaperBackground wave={-8} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: p }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ transform: `scale(${logoScale})` }}>
            <Brand />
          </div>
          <div style={{ marginTop: 34, fontFamily: serif, fontSize: 108, lineHeight: 0.98, color: colors.ink }}>
            Source from proof, not noise.
          </div>
          <div style={{ marginTop: 34, fontFamily: sans, fontSize: 30, color: colors.muted }}>
            Founders get seen. Investors find fit. Capital finds proof.
          </div>
          <div style={{ margin: "52px auto 0", width: "fit-content", borderRadius: 999, background: colors.olive, color: "white", padding: "20px 40px", fontFamily: sans, fontSize: 22, fontWeight: 900 }}>
            apparent.social
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Scene schedule (frames @ 30fps).
const SCENES = [
  { c: SceneHook, len: 150 },
  { c: SceneWhat, len: 150 },
  { c: SceneThesis, len: 180 },
  { c: SceneInbox, len: 180 },
  { c: SceneRadar, len: 165 },
  { c: SceneKanban, len: 180 },
  { c: SceneFounderSide, len: 165 },
  { c: SceneClose, len: 150 },
];

export const EXPLAINER_DURATION = SCENES.reduce((a, s) => a + s.len, 0);

export const ApparentExplainer = () => {
  const frame = useCurrentFrame();
  let start = 0;
  const scenes = SCENES.map((s, i) => {
    const from = start;
    start += s.len;
    const isLast = i === SCENES.length - 1;
    const op = isLast
      ? fade(frame, from, from + 12)
      : fade(frame, from, from + 12) * outro(frame, from + s.len - 12, from + s.len);
    return { ...s, from, op };
  });

  return (
    <AbsoluteFill style={{ background: colors.offWhite }}>
      {scenes.map((s, i) => {
        const Comp = s.c;
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.len}>
            <div style={{ opacity: s.op }}>
              <Comp />
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
