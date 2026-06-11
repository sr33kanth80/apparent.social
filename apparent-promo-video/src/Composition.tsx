import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const colors = {
  ink: "#111111",
  offWhite: "#fbfaf7",
  paper: "#f4f1eb",
  olive: "#42520d",
  founder: "#dcefc7",
  accent: "#02a070",
  dark: "#1c1c1a",
  muted: "#6b665f",
  greenText: "#bcd99a",
};

const serif = "Georgia, 'Times New Roman', serif";
const sans = "Inter, Arial, sans-serif";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const fade = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], { ...clamp, easing: ease });

const outro = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [1, 0], { ...clamp, easing: Easing.ease });

const PaperBackground = ({ wave = 0 }: { wave?: number }) => (
  <AbsoluteFill style={{ background: colors.offWhite }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(17,17,17,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.035) 1px, transparent 1px)",
        backgroundSize: "42px 42px",
      }}
    />
    <svg
      viewBox="0 0 1920 1080"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <path
        d={`M0 ${840 - wave} C250 ${760 - wave} 468 ${910 - wave} 736 ${
          780 - wave
        } C1018 ${646 - wave} 1192 ${616 - wave} 1458 ${
          720 - wave
        } C1640 ${792 - wave} 1748 ${822 - wave} 1920 ${742 - wave} L1920 1080 L0 1080 Z`}
        fill={colors.founder}
        opacity="0.68"
      />
    </svg>
  </AbsoluteFill>
);

const Brand = ({ light = false }: { light?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
    <Img src={staticFile("assets/logo-founder-green.png")} style={{ width: 42, height: 42 }} />
    <div
      style={{
        fontFamily: serif,
        fontWeight: 700,
        fontSize: 34,
        color: light ? "white" : colors.ink,
      }}
    >
      Apparent
    </div>
  </div>
);

const Header = () => (
  <div
    style={{
      position: "absolute",
      top: 36,
      left: 72,
      right: 72,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      zIndex: 5,
    }}
  >
    <Brand />
    <div style={{ display: "flex", alignItems: "center", gap: 52, fontFamily: sans, fontSize: 18, fontWeight: 700 }}>
      <span>For Founders</span>
      <span>For VCs</span>
      <span>Heat Map</span>
      <span>About Us</span>
    </div>
    <div
      style={{
        borderRadius: 999,
        background: "#8E9C78",
        color: "white",
        fontFamily: sans,
        fontWeight: 800,
        fontSize: 18,
        padding: "18px 30px",
      }}
    >
      Get started ↗
    </div>
  </div>
);

const HeroTiles = () => {
  const frame = useCurrentFrame();
  const tiles = [
    { text: "Find", bg: colors.founder, color: colors.olive, x: 0 },
    { text: "investors", bg: colors.olive, color: "white", x: 170 },
    { text: "who actually", bg: colors.founder, color: colors.olive, x: 420 },
    { text: "fit.", bg: colors.olive, color: "white", x: 820 },
  ];

  return (
    <div style={{ position: "relative", height: 126, marginTop: 8 }}>
      {tiles.map((tile, index) => {
        const p = fade(frame, 18 + index * 7, 38 + index * 7);
        return (
          <div
            key={tile.text}
            style={{
              position: "absolute",
              left: tile.x,
              top: interpolate(p, [0, 1], [28, 0]),
              opacity: p,
              background: tile.bg,
              color: tile.color,
              borderRadius: 14,
              padding: "10px 28px 18px",
              fontFamily: serif,
              fontSize: 76,
              lineHeight: 0.92,
              boxShadow: index % 2 ? "0 18px 42px rgba(66,82,13,0.16)" : "none",
            }}
          >
            {tile.text}
          </div>
        );
      })}
    </div>
  );
};

const FounderCard = ({ scale = 1, x = 0, y = 0 }: { scale?: number; x?: number; y?: number }) => {
  const frame = useCurrentFrame();
  const dots = Array.from({ length: 120 }, (_, i) => {
    const row = i % 6;
    const col = Math.floor(i / 6);
    const lit = (i * 17 + 11) % 7 < 3;
    const pulse = interpolate(Math.sin((frame + i * 3) / 11), [-1, 1], [0.55, 1]);
    return { row, col, lit, pulse };
  });

  return (
    <div
      style={{
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        transformOrigin: "top left",
        width: 690,
        height: 610,
        borderRadius: 36,
        background: colors.dark,
        color: "white",
        padding: 34,
        boxShadow: "0 34px 90px rgba(17,17,17,0.22)",
        fontFamily: sans,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ borderRadius: 999, background: colors.founder, color: colors.olive, padding: "8px 14px", fontSize: 13, fontWeight: 800 }}>
          Founder on Apparent
        </span>
        <span style={{ borderRadius: 999, background: colors.olive, padding: "8px 14px", fontSize: 13, fontWeight: 800 }}>
          Raising Seed - $1.5M
        </span>
        <span style={{ color: "rgba(255,255,255,0.46)", fontSize: 13 }}>San Francisco</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 30 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#d6a29a", position: "relative" }}>
          <div style={{ position: "absolute", left: 18, top: 14, width: 18, height: 18, borderRadius: "50%", background: "rgba(28,28,26,0.22)" }} />
          <div style={{ position: "absolute", left: 12, bottom: 8, width: 36, height: 15, borderRadius: "50% 50% 0 0", background: "rgba(28,28,26,0.22)" }} />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Aria Kim</div>
          <div style={{ color: "rgba(255,255,255,0.48)", fontSize: 16 }}>@ariakim</div>
        </div>
        <div style={{ height: 60, width: 1, background: "rgba(255,255,255,0.1)", marginLeft: 16 }} />
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontWeight: 800 }}>MRR</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 13 }}>
            <span style={{ color: colors.greenText, fontSize: 30, fontWeight: 800 }}>$24K</span>
            <span style={{ color: "#58d39a", fontSize: 16, fontWeight: 800 }}>+22% MoM</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, color: "rgba(255,255,255,0.72)", fontSize: 17 }}>
        Building AgentKit, open-source agents teams actually ship to production.
      </div>

      <div style={{ marginTop: 32, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontWeight: 800 }}>
          1,284 COMMITS - LAST YEAR
        </div>
        <div style={{ marginTop: 12, background: "rgba(255,255,255,0.04)", borderRadius: 13, padding: 14, height: 94 }}>
          <div style={{ position: "relative", height: 66 }}>
            {dots.map((dot, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: dot.col * 23,
                  top: dot.row * 11,
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: dot.lit ? (i % 5 === 0 ? "#58d39a" : i % 3 === 0 ? "#37a04a" : "#2e6b2e") : "rgba(255,255,255,0.06)",
                  opacity: dot.lit ? dot.pulse : 1,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 24 }}>
        {[
          ["CURRENT BUILD", "AgentKit v2"],
          ["CATEGORY", "AI agents"],
          ["STAGE", "Seed"],
          ["TRACTION", "4.2K GitHub stars"],
        ].map(([label, value]) => (
          <div key={label}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontWeight: 800 }}>{label}</div>
            <div style={{ marginTop: 8, fontSize: 17, fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ height: 90, borderRadius: 18, background: colors.olive, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "45px 0 0", background: colors.accent, opacity: 0.38, borderRadius: "50% 50% 0 0" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", width: 40, height: 40, marginLeft: -20, marginTop: -20, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -6, marginTop: -10, width: 0, height: 0, borderTop: "10px solid transparent", borderBottom: "10px solid transparent", borderLeft: `16px solid ${colors.dark}` }} />
          <div style={{ position: "absolute", left: 15, bottom: 12, fontSize: 12, fontWeight: 800 }}>Seed pitch</div>
        </div>
        <div style={{ height: 90, borderRadius: 18, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", padding: 18 }}>
          <div style={{ width: 145, height: 5, borderRadius: 999, background: "rgba(255,255,255,0.32)" }} />
          <div style={{ marginTop: 18, width: 210, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.13)" }} />
          <div style={{ marginTop: 16, color: "rgba(255,255,255,0.48)", fontSize: 12 }}>Deck - 12 slides</div>
        </div>
      </div>
    </div>
  );
};

const SwipeDeck = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 72, 110], [0, 0, 520], clamp);
  const rot = interpolate(frame, [72, 110], [0, 12], clamp);
  const badge = fade(frame, 65, 82);
  return (
    <div style={{ position: "relative", width: 650, height: 520 }}>
      <div style={{ position: "absolute", inset: 0, transform: "translate(28px, 28px) scale(0.94)", opacity: 0.62 }}>
        <MiniBuilderCard name="Ledgerline" score="88%" meta="Fintech infra - Pre-seed - New York" />
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateX(${x}px) rotate(${rot}deg)` }}>
        <MiniBuilderCard name="AgentKit" score="92%" meta="AI agents - Seed - San Francisco" expanded />
      </div>
      <div
        style={{
          position: "absolute",
          top: 36,
          right: 40,
          opacity: badge,
          transform: `rotate(10deg) scale(${interpolate(badge, [0, 1], [0.88, 1])})`,
          border: "6px solid #42c463",
          color: "#42c463",
          borderRadius: 14,
          fontFamily: sans,
          fontSize: 46,
          fontWeight: 900,
          padding: "6px 18px",
        }}
      >
        LIKE
      </div>
    </div>
  );
};

const MiniBuilderCard = ({
  name,
  score,
  meta,
  expanded = false,
}: {
  name: string;
  score: string;
  meta: string;
  expanded?: boolean;
}) => (
  <div
    style={{
      width: 650,
      minHeight: expanded ? 490 : 150,
      borderRadius: 30,
      background: colors.dark,
      color: "white",
      padding: 28,
      boxShadow: "0 30px 80px rgba(17,17,17,0.24)",
      fontFamily: sans,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 58, height: 58, borderRadius: "50%", background: name === "AgentKit" ? "#d6a29a" : "#b98a61" }} />
      <div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>{name}</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.48)" }}>{meta}</div>
      </div>
      <div style={{ marginLeft: "auto", background: colors.founder, color: colors.ink, borderRadius: 999, padding: "9px 16px", fontSize: 17, fontWeight: 900 }}>
        {score}
      </div>
    </div>
    {expanded && (
      <>
        <div style={{ marginTop: 28, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Aria Kim</div>
              <div style={{ color: "rgba(255,255,255,0.5)" }}>@ariakim</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontWeight: 800 }}>MRR</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>$24K · +22% MoM</div>
            </div>
          </div>
          <div style={{ marginTop: 22, fontSize: 18, color: "rgba(255,255,255,0.72)" }}>
            AgentKit - open-source agents teams actually ship to production.
          </div>
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {[
              ["CURRENT BUILD", "AgentKit v2"],
              ["STAGE", "Seed"],
              ["TRACTION", "4.2K GitHub stars"],
              ["RAISING", "$1.5M seed"],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.35)", fontWeight: 800 }}>{label}</div>
                <div style={{ marginTop: 8, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 30, display: "flex", gap: 12 }}>
            {["GitHub", "Pitch - 2:14", "Deck - 12 slides"].map((pill) => (
              <div key={pill} style={{ borderRadius: 999, background: "rgba(255,255,255,0.08)", padding: "10px 15px", fontSize: 14, fontWeight: 800 }}>
                {pill}
              </div>
            ))}
          </div>
        </div>
      </>
    )}
  </div>
);

const ScreenshotFrame = ({
  src,
  x,
  y,
  width,
  height,
  scale = 1,
  opacity = 1,
}: {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  opacity?: number;
}) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      borderRadius: 34,
      overflow: "hidden",
      border: "1px solid rgba(17,17,17,0.1)",
      boxShadow: "0 34px 110px rgba(17,17,17,0.2)",
      transform: `scale(${scale})`,
      opacity,
      background: colors.paper,
    }}
  >
    <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </div>
);

const SceneIntro = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 28);
  return (
    <AbsoluteFill>
      <PaperBackground wave={0} />
      <Header />
      <div style={{ position: "absolute", left: 168, top: 238, width: 1200, opacity: p }}>
        <div style={{ fontFamily: sans, fontWeight: 800, fontSize: 18, color: colors.olive, marginBottom: 28 }}>
          Built in 48 hours to test Claude Opus 4.8
        </div>
        <HeroTiles />
        <div style={{ marginTop: 44, fontFamily: sans, fontSize: 30, lineHeight: 1.45, color: colors.ink, opacity: 0.72, width: 910 }}>
          Apparent matches founders and investors by thesis, stage, sector, and signal.
          Less noise on both sides. Better conversations.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneProblem = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 22);
  const imageScale = interpolate(frame, [0, 120], [1.04, 1], clamp);
  return (
    <AbsoluteFill>
      <PaperBackground wave={24} />
      <div style={{ position: "absolute", left: 84, top: 84, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 92, top: 210, width: 780, opacity: p }}>
        <div style={{ fontFamily: serif, fontSize: 96, lineHeight: 0.96, color: colors.ink }}>
          Warm intros are a bad database for ambition.
        </div>
        <div style={{ marginTop: 42, fontFamily: sans, fontSize: 29, lineHeight: 1.5, color: colors.muted }}>
          Great builders should become visible by what they ship.
          Investors should find them by thesis, proof, and timing.
        </div>
      </div>
      <ScreenshotFrame src="assets/about-page.jpeg" x={950} y={128} width={790} height={760} scale={imageScale} opacity={p} />
    </AbsoluteFill>
  );
};

const SceneFounder = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  const cardY = interpolate(frame, [0, 36], [70, 0], { ...clamp, easing: ease });
  return (
    <AbsoluteFill>
      <PaperBackground wave={-18} />
      <div style={{ position: "absolute", left: 92, top: 92, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 110, top: 224, width: 650, opacity: p }}>
        <div style={{ fontFamily: serif, fontSize: 92, lineHeight: 0.96, color: colors.ink }}>
          Show what investors need to see.
        </div>
        <div style={{ marginTop: 38, fontFamily: sans, fontSize: 28, lineHeight: 1.45, color: colors.muted }}>
          Products, GitHub, traction, launches, demos, and capital goals in one focused profile.
        </div>
      </div>
      <div style={{ position: "absolute", left: 940, top: 164 + cardY, opacity: p }}>
        <FounderCard scale={0.92} />
      </div>
    </AbsoluteFill>
  );
};

const SceneInvestor = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  return (
    <AbsoluteFill>
      <PaperBackground wave={16} />
      <div style={{ position: "absolute", left: 92, top: 86, opacity: p }}>
        <Brand />
      </div>
      <div style={{ position: "absolute", left: 94, top: 210, width: 790, opacity: p }}>
        <div style={{ fontFamily: serif, fontSize: 104, lineHeight: 0.92, color: colors.ink }}>
          Tinder for venture capital.
        </div>
        <div style={{ marginTop: 38, fontFamily: sans, fontSize: 29, lineHeight: 1.45, color: colors.muted }}>
          VCs swipe through startups ranked by fit. Left to pass, right to save, up to request a call.
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 42, fontFamily: sans, fontWeight: 900 }}>
          {["← pass", "→ like", "↑ call"].map((item) => (
            <div key={item} style={{ borderRadius: 999, background: item.includes("call") ? "#3aa0ff" : colors.founder, color: item.includes("call") ? "white" : colors.ink, padding: "14px 22px", fontSize: 18 }}>
              {item}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 1020, top: 252, opacity: p }}>
        <SwipeDeck />
      </div>
    </AbsoluteFill>
  );
};

const SceneHeatMap = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 20);
  const scale = interpolate(frame, [0, 150], [1.03, 1], clamp);
  return (
    <AbsoluteFill style={{ background: "#e8e5dc" }}>
      <ScreenshotFrame src="assets/heatmap-filters.jpeg" x={0} y={0} width={1920} height={1080} scale={scale} opacity={p} />
      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 88,
          width: 700,
          borderRadius: 30,
          background: "rgba(251,250,247,0.92)",
          padding: "38px 44px",
          boxShadow: "0 30px 90px rgba(17,17,17,0.18)",
          opacity: p,
        }}
      >
        <div style={{ fontFamily: serif, fontSize: 58, lineHeight: 1, color: colors.ink }}>The map was missing.</div>
        <div style={{ marginTop: 20, fontFamily: sans, fontSize: 24, lineHeight: 1.45, color: colors.muted }}>
          VC density, contactable firms, active investors, sector heat, and profile matching.
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneClose = () => {
  const frame = useCurrentFrame();
  const p = fade(frame, 0, 28);
  const logoScale = interpolate(frame, [0, 34], [0.82, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill>
      <PaperBackground wave={-8} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: p }}>
        <div style={{ textAlign: "center" }}>
          <Img
            src={staticFile("assets/logo-founder-green.png")}
            style={{ width: 160, height: 160, transform: `scale(${logoScale})` }}
          />
          <div style={{ marginTop: 28, fontFamily: serif, fontSize: 94, lineHeight: 0.98, color: colors.ink }}>
            Proof before network.
          </div>
          <div style={{ marginTop: 34, fontFamily: sans, fontSize: 28, color: colors.muted }}>
            Founders get seen. Investors find fit. Capital finds proof.
          </div>
          <div style={{ margin: "48px auto 0", width: "fit-content", borderRadius: 999, background: colors.olive, color: "white", padding: "18px 34px", fontFamily: sans, fontSize: 20, fontWeight: 900 }}>
            apparent.social
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ApparentPromo = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sceneOpacity = (start: number, length: number) =>
    fade(frame, start, start + 12) * outro(frame, start + length - 12, start + length);

  return (
    <AbsoluteFill style={{ background: colors.offWhite }}>
      <Sequence durationInFrames={5 * fps}>
        <div style={{ opacity: sceneOpacity(0, 5 * fps) }}>
          <SceneIntro />
        </div>
      </Sequence>
      <Sequence from={5 * fps} durationInFrames={5 * fps}>
        <div style={{ opacity: sceneOpacity(5 * fps, 5 * fps) }}>
          <SceneProblem />
        </div>
      </Sequence>
      <Sequence from={10 * fps} durationInFrames={5 * fps}>
        <div style={{ opacity: sceneOpacity(10 * fps, 5 * fps) }}>
          <SceneFounder />
        </div>
      </Sequence>
      <Sequence from={15 * fps} durationInFrames={5 * fps}>
        <div style={{ opacity: sceneOpacity(15 * fps, 5 * fps) }}>
          <SceneInvestor />
        </div>
      </Sequence>
      <Sequence from={20 * fps} durationInFrames={5 * fps}>
        <div style={{ opacity: sceneOpacity(20 * fps, 5 * fps) }}>
          <SceneHeatMap />
        </div>
      </Sequence>
      <Sequence from={25 * fps} durationInFrames={durationInFrames - 25 * fps}>
        <SceneClose />
      </Sequence>
    </AbsoluteFill>
  );
};
