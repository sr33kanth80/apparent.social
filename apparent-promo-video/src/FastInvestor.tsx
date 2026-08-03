import {
  AbsoluteFill,
  Sequence,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  Audio,
} from "remotion";
import voDur from "./vo3-durations.json";
import { C, clamp, fade, Logo, sans, serif, mono } from "./SiteExplainer";

// snappy motion helpers
const pop = (f: number, s: number) =>
  interpolate(f, [s, s + 7, s + 13], [0.6, 1.07, 1], clamp);
const snap = (f: number, s: number) => fade(f, s, s + 6);
const upIn = (f: number, s: number, d = 40) =>
  interpolate(f, [s, s + 12], [d, 0], clamp);

const CreamBG = ({ children }: { children?: React.ReactNode }) => (
  <AbsoluteFill style={{ background: C.canvas, alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(20,2,6,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(20,2,6,0.035) 1px,transparent 1px)", backgroundSize: "64px 64px" }} />
    {children}
  </AbsoluteFill>
);
const GreenBG = ({ children }: { children?: React.ReactNode }) => (
  <AbsoluteFill style={{ background: C.green, alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "absolute", inset: 0, opacity: 0.09, backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "64px 64px" }} />
    {children}
  </AbsoluteFill>
);

const Lbl = ({ children, color = C.green }: { children: React.ReactNode; color?: string }) => (
  <div style={{ fontFamily: mono, fontSize: 22, letterSpacing: "0.18em", textTransform: "uppercase", color, fontWeight: 500 }}>{children}</div>
);

// ── 1 · Hook ─────────────────────────────────────────────────────────────────
const SHook = () => {
  const f = useCurrentFrame();
  return (
    <CreamBG>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: serif, fontSize: 128, color: C.ink, letterSpacing: "-0.02em", opacity: snap(f, 0), transform: `translateY(${upIn(f, 0, 30)}px)` }}>
          Warm intros?
        </div>
        <div style={{ display: "inline-block", marginTop: 14, transform: `scale(${pop(f, 16)}) rotate(-2deg)`, opacity: snap(f, 16) }}>
          <div style={{ fontFamily: serif, fontSize: 200, lineHeight: 0.9, color: C.white, background: C.ink, border: `2px solid ${C.border}`, boxShadow: `10px 10px 0 0 ${C.green}`, padding: "6px 44px 18px" }}>
            Dead.
          </div>
        </div>
      </div>
    </CreamBG>
  );
};

// ── 2 · Meet ─────────────────────────────────────────────────────────────────
const SMeet = () => {
  const f = useCurrentFrame();
  return (
    <CreamBG>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, transform: `scale(${pop(f, 0)})` }}>
          <Logo size={80} />
          <Img src={staticFile("brand/wordmark.png")} style={{ height: 62 }} />
        </div>
        <div style={{ fontFamily: serif, fontSize: 96, color: C.ink, marginTop: 30, opacity: snap(f, 12), transform: `translateY(${upIn(f, 12, 26)}px)` }}>
          Meet Apparent.
        </div>
        <div style={{ marginTop: 24, display: "inline-block", background: C.green, color: C.white, border: `2px solid ${C.border}`, boxShadow: `5px 5px 0 0 ${C.border}`, padding: "14px 26px", opacity: snap(f, 24), transform: `scale(${pop(f, 24)})` }}>
          <span style={{ fontFamily: mono, fontSize: 24, letterSpacing: "0.14em", textTransform: "uppercase" }}>Your AI sourcing agent</span>
        </div>
      </div>
    </CreamBG>
  );
};

// ── 3 · Thesis ───────────────────────────────────────────────────────────────
const SThesis = () => {
  const f = useCurrentFrame();
  const chips = ["Dev tools", "AI infra", "Pre-seed to Seed", "SF · NYC", "$250K to $1.5M", "Ships in public"];
  return (
    <CreamBG>
      <div style={{ textAlign: "center", width: 1300 }}>
        <Lbl>Step one</Lbl>
        <div style={{ fontFamily: serif, fontSize: 116, color: C.ink, marginTop: 14, opacity: snap(f, 0), transform: `translateY(${upIn(f, 0, 26)}px)` }}>
          Set your thesis.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", marginTop: 44 }}>
          {chips.map((c, i) => {
            const s = 14 + i * 4;
            return (
              <div key={c} style={{ fontFamily: sans, fontSize: 30, fontWeight: 600, color: C.ink, background: C.white, border: `2px solid ${C.border}`, boxShadow: `4px 4px 0 0 ${C.border}`, padding: "14px 26px", opacity: snap(f, s), transform: `scale(${pop(f, s)})` }}>
                {c}
              </div>
            );
          })}
        </div>
      </div>
    </CreamBG>
  );
};

// ── 4 · Source 24/7 ──────────────────────────────────────────────────────────
const SSource = () => {
  const f = useCurrentFrame();
  const dot = interpolate(Math.sin(f / 4), [-1, 1], [0.4, 1]);
  const rows = [["Aria Kim", "AI agents · Seed"], ["Devansh Rao", "Dev tools · Pre-seed"], ["Mara Ochoa", "AI infra · Seed"]];
  return (
    <CreamBG>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, opacity: snap(f, 0) }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: C.green, opacity: dot }} />
          <Lbl color={C.ink}>Agent sourcing</Lbl>
        </div>
        <div style={{ fontFamily: serif, fontSize: 150, color: C.ink, marginTop: 8, transform: `scale(${pop(f, 4)})` }}>
          24<span style={{ color: C.green }}>/</span>7
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 30 }}>
          {rows.map(([n, m], i) => {
            const s = 20 + i * 5;
            return (
              <div key={n} style={{ background: C.white, border: `2px solid ${C.border}`, boxShadow: `4px 4px 0 0 ${C.border}`, padding: "16px 22px", textAlign: "left", opacity: snap(f, s), transform: `translateY(${upIn(f, s, 30)}px)` }}>
                <div style={{ fontFamily: serif, fontSize: 30, color: C.ink }}>{n}</div>
                <div style={{ fontFamily: mono, fontSize: 14, letterSpacing: "0.06em", color: C.smoke, textTransform: "uppercase", marginTop: 4 }}>{m}</div>
              </div>
            );
          })}
        </div>
      </div>
    </CreamBG>
  );
};

// ── 5 · Ranked (green flash) ─────────────────────────────────────────────────
const SRank = () => {
  const f = useCurrentFrame();
  const words = ["PROOF.", "FRESHNESS.", "FIT."];
  return (
    <GreenBG>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: mono, fontSize: 24, letterSpacing: "0.18em", color: "rgba(255,255,255,0.8)", opacity: snap(f, 0) }}>RANKED BY</div>
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {words.map((w, i) => {
            const s = 6 + i * 9;
            return (
              <div key={w} style={{ fontFamily: serif, fontSize: 130, lineHeight: 0.98, color: C.white, opacity: snap(f, s), transform: `translateX(${interpolate(snap(f, s), [0, 1], [-60, 0])}px) scale(${pop(f, s)})` }}>
                {w}
              </div>
            );
          })}
        </div>
      </div>
    </GreenBG>
  );
};

// ── 6 · Proof / revenue upfront ──────────────────────────────────────────────
const SProof = () => {
  const f = useCurrentFrame();
  const mrr = Math.round(interpolate(f, [16, 40], [0, 24], clamp));
  const growth = Math.round(interpolate(f, [24, 44], [0, 22], clamp));
  return (
    <CreamBG>
      <div style={{ textAlign: "center" }}>
        <Lbl>Real revenue. Verified.</Lbl>
        <div style={{ marginTop: 22, display: "inline-block", background: C.white, border: `2px solid ${C.border}`, boxShadow: `8px 8px 0 0 ${C.green}`, padding: "34px 48px", transform: `scale(${pop(f, 2)})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: C.paper, border: `2px solid ${C.border}` }} />
            <div style={{ fontFamily: serif, fontSize: 44, color: C.ink }}>Aria Kim</div>
            <div style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.08em", color: C.green, border: `2px solid ${C.green}`, padding: "5px 12px" }}>✓ VERIFIED</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22, justifyContent: "center", marginTop: 24 }}>
            <span style={{ fontFamily: serif, fontSize: 96, color: C.ink }}>${mrr}K</span>
            <span style={{ fontFamily: mono, fontSize: 20, color: C.smoke }}>MRR</span>
            <span style={{ fontFamily: sans, fontSize: 34, fontWeight: 700, color: C.green }}>+{growth}% MoM</span>
          </div>
        </div>
      </div>
    </CreamBG>
  );
};

// ── 7 · Builder Radar ────────────────────────────────────────────────────────
const DOTS = (() => {
  const rand = (i: number, s: number) => { const v = Math.sin(i * 12.9898 + s * 78.233) * 43758.5453; return v - Math.floor(v); };
  const d: { x: number; y: number; r: number; h: number }[] = [];
  const cl = [{ cx: 0.36, cy: 0.55, n: 32, sp: 0.16 }, { cx: 0.66, cy: 0.42, n: 24, sp: 0.13 }];
  let i = 0;
  for (const c of cl) for (let k = 0; k < c.n; k++) { const a = rand(i, 1) * 6.28; const dd = rand(i, 2) ** 1.5 * c.sp; d.push({ x: c.cx + Math.cos(a) * dd * 1.4, y: c.cy + Math.sin(a) * dd, r: 5 + rand(i, 3) * 8, h: 1 - dd / c.sp }); i++; }
  return d;
})();
const SRadar = () => {
  const f = useCurrentFrame();
  return (
    <CreamBG>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: serif, fontSize: 92, color: C.ink, opacity: snap(f, 0), transform: `translateY(${upIn(f, 0, 24)}px)` }}>
          Where builders cluster.
        </div>
        <div style={{ marginTop: 26, width: 1180, height: 470, position: "relative", background: "#f0ece5", border: `2px solid ${C.border}`, boxShadow: `8px 8px 0 0 ${C.border}`, overflow: "hidden", transform: `scale(${pop(f, 6)})` }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(20,2,6,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(20,2,6,0.05) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
          {DOTS.map((dt, i) => (
            <div key={i} style={{ position: "absolute", left: `${8 + dt.x * 84}%`, top: `${10 + dt.y * 76}%`, width: dt.r * 2, height: dt.r * 2, marginLeft: -dt.r, marginTop: -dt.r, borderRadius: "50%", background: dt.h > 0.55 ? C.pink : dt.h > 0.3 ? "#ff9db4" : "#c9c2b6", border: dt.h > 0.3 ? `1px solid ${C.border}` : "none", opacity: snap(f, 12 + (i % 16)) * (0.5 + dt.h * 0.5) }} />
          ))}
          <div style={{ position: "absolute", left: 18, top: 16, fontFamily: mono, fontSize: 15, letterSpacing: "0.12em", color: C.ink }}>BUILDER RADAR</div>
          <div style={{ position: "absolute", left: 18, bottom: 16, fontFamily: serif, fontSize: 30, color: C.ink }}>3,438<span style={{ fontFamily: mono, fontSize: 14, color: C.smoke, marginLeft: 8 }}>SIGNALS</span></div>
        </div>
      </div>
    </CreamBG>
  );
};

// ── 8 · Pipeline / actions ───────────────────────────────────────────────────
const SPipe = () => {
  const f = useCurrentFrame();
  const acts = ["Save it.", "Draft the intro.", "Move fast."];
  return (
    <CreamBG>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
        {acts.map((a, i) => {
          const s = i * 12;
          return (
            <div key={a} style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div style={{ fontFamily: serif, fontSize: 78, color: i === 2 ? C.green : C.ink, background: C.white, border: `2px solid ${C.border}`, boxShadow: `6px 6px 0 0 ${i === 2 ? C.green : C.border}`, padding: "18px 34px", opacity: snap(f, s), transform: `scale(${pop(f, s)})` }}>
                {a}
              </div>
              {i < 2 && <div style={{ fontFamily: serif, fontSize: 64, color: C.ink, opacity: snap(f, s + 8) }}>→</div>}
            </div>
          );
        })}
      </div>
    </CreamBG>
  );
};

// ── 9 · Close ────────────────────────────────────────────────────────────────
const SClose = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.06, backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "64px 64px" }} />
      <div style={{ textAlign: "center", transform: `scale(${pop(f, 0)})` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <Logo size={52} color={C.canvas} />
          <Img src={staticFile("brand/wordmark-white.png")} style={{ height: 42 }} />
        </div>
        <div style={{ fontFamily: serif, fontSize: 104, lineHeight: 1.0, color: C.canvas, letterSpacing: "-0.02em", marginTop: 34 }}>
          Source from proof,<br />not noise.
        </div>
        <div style={{ marginTop: 40, display: "inline-block", background: C.green, color: C.white, border: `2px solid ${C.canvas}`, boxShadow: `5px 5px 0 0 ${C.canvas}`, padding: "18px 38px", fontFamily: sans, fontSize: 24, fontWeight: 600, opacity: snap(f, 20), transform: `scale(${pop(f, 20)})` }}>
          apparent.social
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Timeline (snappy: short tails, fast cuts) ────────────────────────────────
const FPS = 30;
const TAIL = 0.45;
const LEAD = 0.12;
const DEFS = [
  { id: "01-hook", C: SHook },
  { id: "02-meet", C: SMeet },
  { id: "03-thesis", C: SThesis },
  { id: "04-source", C: SSource },
  { id: "05-rank", C: SRank },
  { id: "06-proof", C: SProof },
  { id: "07-radar", C: SRadar },
  { id: "08-pipe", C: SPipe },
  { id: "09-close", C: SClose },
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

export const FAST_INVESTOR_DURATION = SCENES.reduce((a, s) => a + s.len, 0);

export const ApparentFastInvestor = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <Audio src={staticFile("music/beat.mp3")} volume={0.5} />
      {SCENES.map((s, i) => {
        const Comp = s.C;
        const isLast = i === SCENES.length - 1;
        const op =
          fade(f, s.from, s.from + 5) *
          (isLast ? 1 : interpolate(f, [s.from + s.len - 5, s.from + s.len], [1, 0], clamp));
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.len}>
            <div style={{ opacity: op }}>
              <Comp />
            </div>
            <Sequence from={Math.round(LEAD * FPS)}>
              <Audio src={staticFile(`vo3/${s.id}.mp3`)} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
