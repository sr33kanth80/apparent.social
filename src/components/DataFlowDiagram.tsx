import {
  ArrowUpRight,
  BadgeCheck,
  BellRing,
  Bot,
  Check,
  GitBranch,
  GraduationCap,
  Layout,
  LayoutDashboard,
  Map,
  MapPin,
  MessageSquareText,
  MessagesSquare,
  Radar,
  Rocket,
  Search,
  Send,
  Settings,
  Sparkles,
  UserCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LogoIcon } from './LogoIcon';

// Mirrors the real founder sidebar (src/components/ui/sidebar.tsx) so the
// landing-page hero depicts the actual dashboard navigation, not a generic mock.
type NavItem = { label: string; icon: LucideIcon; badge?: string; active?: boolean };
const navGroups: NavItem[][] = [
  [
    { label: 'Overview', icon: LayoutDashboard, active: true },
    { label: 'Your Profile', icon: UserCircle },
    { label: 'Products', icon: Rocket },
    { label: 'Investor Matches', icon: Search, badge: 'AI' },
    { label: 'VC heatmap', icon: Map, badge: 'VC' },
    { label: 'Cold Outreach', icon: Send, badge: 'New' },
    { label: 'Messages', icon: MessagesSquare },
  ],
  [{ label: 'Fundraise Tracker', icon: Layout }],
  [
    { label: 'How to Use Apparent?', icon: GraduationCap },
    { label: 'Feedback', icon: MessageSquareText },
  ],
];

const proofSignals = [
  { label: 'GitHub verified', value: '218 commits', icon: GitBranch },
  { label: 'Products shipped', value: '3 launches', icon: Sparkles },
  { label: 'Founder location', value: 'Seattle', icon: MapPin },
];

const investorMatches = [
  { name: 'Northstar Ventures', thesis: 'AI workflow tools', fit: '96%' },
  { name: 'Pioneer Fund', thesis: 'Developer infrastructure', fit: '91%' },
  { name: 'Gradient Capital', thesis: 'Seed, technical teams', fit: '87%' },
];

const badgeClass =
  'rounded bg-gradient-to-r from-[#ff7a52] via-[#7e9bf0] to-[#37d28b] px-1.5 py-px text-[9px] font-semibold text-ink';

export const DataFlowDiagram = () => {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-20">
      <div className="apparent-hero-app relative isolate overflow-hidden rounded-[44px] border border-ink/12">
        <div className="apparent-hero-app__grid" aria-hidden />
        <div className="apparent-hero-app__orb apparent-hero-app__orb--peach" aria-hidden />
        <div className="apparent-hero-app__orb apparent-hero-app__orb--mint" aria-hidden />

        <div className="relative z-10 border-b border-ink/10 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-[#ffb4c5]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#e2c161]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#5fcf8e]" />
              </div>
              <div className="flex items-center gap-2 rounded-full border border-ink/12 bg-parchment/70 px-3 py-1.5">
                <LogoIcon className="h-4 w-4 text-ink" />
                <span className="font-mono text-[11px] font-semibold text-ink">Founder Workspace</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-ink/12 bg-white/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">
              <span className="apparent-hero-live-dot h-1.5 w-1.5 rounded-full bg-[#5fcf8e]" />
              Live matching
            </div>
          </div>
        </div>

        <div className="relative z-10 grid gap-4 p-4 sm:p-5 lg:grid-cols-[14rem_minmax(0,1fr)_20rem] lg:p-6">
          {/* Sidebar — the real founder navigation. */}
          <aside className="hidden flex-col rounded-[24px] border border-ink/10 bg-white/85 p-3 lg:flex">
            <div className="mb-4 flex items-center gap-2 px-1 pt-1">
              <LogoIcon className="h-6 w-6 text-ink" />
              <img src="/apparent-wordmark.png" alt="Apparent" className="h-5 w-auto object-contain" />
            </div>
            <nav className="flex flex-col gap-1">
              {navGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="flex flex-col gap-1">
                  {groupIndex > 0 && <div className="my-1.5 h-px w-full bg-ink/10" />}
                  {group.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`flex h-8 items-center gap-2 rounded-md px-2 font-mono text-[11px] ${
                          item.active ? 'bg-[#cfdaf5] text-ink' : 'text-graphite'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.label}</span>
                        {item.badge && <span className={`ml-auto ${badgeClass}`}>{item.badge}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-1 pt-3">
              <div className="flex h-8 items-center gap-2 rounded-md px-2 font-mono text-[11px] text-graphite">
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span>Settings</span>
              </div>
              <div className="flex h-8 items-center gap-2 rounded-md px-2 font-mono text-[11px] text-graphite">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[9px] font-semibold text-parchment">
                  RP
                </span>
                <span>Account</span>
              </div>
            </div>
          </aside>

          <main className="grid gap-4">
            {/* Founder profile header + strength score. */}
            <section className="apparent-hero-panel relative overflow-hidden rounded-[28px] border border-ink/10 p-5 sm:p-6">
              <div className="apparent-hero-scan" aria-hidden />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ink font-mono text-sm font-semibold text-parchment">
                      RP
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-serif text-[26px] leading-none text-ink">Raj Patel</p>
                        <BadgeCheck className="h-5 w-5 text-[#7e9bf0]" />
                      </div>
                      <p className="mt-1.5 font-mono text-[11px] text-stone">@rajpatel · Founder · Seattle</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#cfdaf5] px-3 py-1 font-mono text-[10px] font-semibold text-ink">
                      <BadgeCheck className="h-3 w-3" />
                      Verified proof
                    </span>
                    <span className="rounded-full border border-ink/12 px-3 py-1 font-mono text-[10px] text-graphite">Seed</span>
                    <span className="rounded-full border border-ink/12 px-3 py-1 font-mono text-[10px] text-graphite">AI devtools</span>
                  </div>
                </div>
                <div className="apparent-hero-score rounded-[24px] border border-ink/12 bg-parchment/78 p-4 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">Profile strength</p>
                  <p className="mt-2 font-serif text-5xl leading-none text-ink">94</p>
                  <p className="mt-1 font-mono text-[10px] text-graphite">ready to match</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              {proofSignals.map((signal, index) => {
                const Icon = signal.icon;
                return (
                  <article
                    key={signal.label}
                    className="apparent-hero-proof-card rounded-[26px] border border-ink/10 bg-white/58 p-4"
                    style={{ animationDelay: `${index * 180}ms` }}
                  >
                    <Icon className="h-4 w-4 text-ink" />
                    <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-stone">{signal.label}</p>
                    <p className="mt-1 font-mono text-[13px] font-semibold text-ink">{signal.value}</p>
                  </article>
                );
              })}
            </section>

            <section className="apparent-hero-agent rounded-[28px] border border-ink/10 bg-parchment/62 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-parchment">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-mono text-[12px] font-semibold text-ink">Founder agent</p>
                    <p className="font-mono text-[11px] text-stone">Finding the right investors now</p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#a7fccd]/42 px-3 py-1.5 font-mono text-[10px] font-semibold text-ink">
                  <Check className="h-3 w-3" />
                  12 warm paths found
                </div>
              </div>
            </section>
          </main>

          <aside className="grid gap-4">
            <section className="apparent-hero-panel rounded-[28px] border border-ink/10 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-[22px] leading-tight text-ink">Investor matches</p>
                    <span className={badgeClass}>AI</span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-stone">Ranked by thesis fit</p>
                </div>
                <Radar className="h-5 w-5 text-ink" />
              </div>
              <div className="grid gap-3">
                {investorMatches.map((match, index) => (
                  <article
                    key={match.name}
                    className="apparent-hero-match-row rounded-[22px] border border-ink/10 bg-white/58 p-3"
                    style={{ animationDelay: `${index * 220}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] font-semibold text-ink">{match.name}</p>
                        <p className="mt-1 truncate font-mono text-[10px] text-stone">{match.thesis}</p>
                      </div>
                      <span className="rounded-full bg-[#cfdaf5] px-2.5 py-1 font-mono text-[11px] font-semibold text-ink">
                        {match.fit}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="apparent-hero-draft rounded-[28px] border border-ink/10 p-4 sm:p-5">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-ink" />
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink">Cold outreach</p>
              </div>
              <p className="mb-3 font-mono text-[10px] text-stone">Agent drafted an intro to Northstar Ventures</p>
              <div className="grid gap-2">
                <span className="apparent-hero-type-line apparent-hero-type-line--wide" />
                <span className="apparent-hero-type-line" />
                <span className="apparent-hero-type-line apparent-hero-type-line--short" />
              </div>
              <button
                type="button"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-4 py-3 font-mono text-[12px] font-semibold text-parchment"
              >
                Send intro <Send className="h-3.5 w-3.5" />
              </button>
            </section>
          </aside>
        </div>

        <div className="relative z-10 border-t border-ink/10 px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-stone">
            <span className="inline-flex items-center gap-2">
              <BellRing className="h-3.5 w-3.5 text-ink" />
              Apparent found a thesis-fit investor who backs devtools at seed.
            </span>
            <span className="inline-flex items-center gap-1 text-ink">
              View match <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
