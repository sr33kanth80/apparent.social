import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  ChevronRight,
  Globe,
  Link as LinkIcon,
  MapPin,
  Rocket,
  Target,
  Users,
} from 'lucide-react';
import { LogoIcon } from '@/components/LogoIcon';
import { GitHubIcon } from '@/components/GitHubIcon';
import { loadPublicProfile } from '@/lib/dashboard-service';
import type { PublicFounderProfile, PublicInvestorProfile, PublicProfileResult } from '@/lib/apparent-types';

const serif = { fontFamily: 'Georgia, "Times New Roman", serif' };

// ─── tiny helpers ──────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const Avatar = ({ src, name, size = 'lg', bg = '#dcefc7' }: { src?: string; name: string; size?: 'sm' | 'lg'; bg?: string }) => {
  const dim = size === 'lg' ? 'h-20 w-20 text-xl rounded-[22px]' : 'h-11 w-11 text-sm rounded-[14px]';
  return src ? (
    <img src={src} alt={name} className={`${dim} shrink-0 object-cover`} />
  ) : (
    <div
      className={`${dim} flex shrink-0 items-center justify-center font-semibold`}
      style={{ background: bg }}
    >
      {initials(name) || name.slice(0, 2).toUpperCase()}
    </div>
  );
};

const Tag = ({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) => (
  <span
    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${accent ? 'bg-[#42520d] text-white' : 'bg-[#dcefc7] text-black'}`}
  >
    {children}
  </span>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <article className={`rounded-[28px] bg-white/80 p-6 ${className}`}>{children}</article>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-8 text-sm font-semibold uppercase tracking-[0.12em] text-[#42520d]">{children}</p>
);

// ─── top nav ───────────────────────────────────────────────────────────────────

const ProfileNav = ({ role }: { role?: 'founder' | 'investor' }) => (
  <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-[#fbfaf7]/90 px-5 py-3 backdrop-blur-sm sm:px-8">
    <Link to="/" className="flex items-center gap-2">
      <LogoIcon className="h-6 w-6 text-black" />
      <img src="/apparent-wordmark.png" alt="Apparent" className="h-6 w-auto object-contain" />
    </Link>
    <div className="flex items-center gap-3">
      <Link
        to={`/login?role=${role ?? 'founder'}`}
        className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-black hover:text-white"
      >
        Sign in
      </Link>
      <Link
        to="/login"
        className="rounded-full bg-[#42520d] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
      >
        Join Apparent
      </Link>
    </div>
  </header>
);

// ─── founder profile ──────────────────────────────────────────────────────────

const FounderProfilePage = ({ profile }: { profile: PublicFounderProfile }) => {
  const pastProductList = profile.pastProducts
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const links = [
    profile.website && { label: 'Website', href: profile.website, icon: Globe },
    profile.github && { label: 'GitHub', href: profile.github, icon: GitHubIcon },
    profile.linkedin && { label: 'LinkedIn', href: profile.linkedin, icon: LinkIcon },
    profile.xProfile && { label: 'X / Twitter', href: profile.xProfile, icon: ArrowUpRight },
    profile.press && { label: 'More', href: profile.press, icon: BookOpen },
  ].filter(Boolean) as { label: string; href: string; icon: React.ElementType }[];

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <ProfileNav role="founder" />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[92rem] px-5 pb-10 pt-16 sm:px-8 md:pt-20">
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-full bg-[#dcefc7] px-3 py-1 text-xs font-semibold text-[#42520d]">Founder on Apparent</span>
          {profile.location && (
            <span className="flex items-center gap-1 text-xs text-black/50">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </span>
          )}
        </div>

        <h1
          className="max-w-5xl text-[2.8rem] font-normal leading-[0.92] tracking-[-0.045em] sm:text-[5rem] md:text-[7rem] lg:text-[8.5rem]"
          style={serif}
        >
          {profile.profileName || profile.username || 'Apparent Builder'}
        </h1>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Avatar
            src={profile.profilePhotoUrl}
            name={profile.profileName || profile.username}
            bg="#dcefc7"
          />
          <div>
            <p className="text-sm font-semibold text-black/80">@{profile.username}</p>
            {profile.headline && <p className="mt-1 text-sm text-black/55">{profile.headline}</p>}
          </div>
        </div>

        {profile.bio && (
          <p className="mt-8 max-w-3xl text-lg leading-8 text-black/65 md:text-xl">{profile.bio}</p>
        )}

        {links.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {links.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:shadow-md"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* ── Build context cards ── */}
      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <SectionLabel>What they&apos;re building</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Rocket, label: 'Current build', value: profile.currentBuild },
            { icon: Target, label: 'Category', value: profile.category },
            { icon: ChevronRight, label: 'Stage', value: profile.stage },
            { icon: Users, label: 'Traction', value: profile.traction },
          ]
            .filter((item) => item.value)
            .map(({ icon: Icon, label, value }) => (
              <Card key={label}>
                <Icon className="mb-4 h-4 w-4 text-[#42520d]" />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">{label}</p>
                <p className="mt-2 text-sm leading-6 text-black/70">{value}</p>
              </Card>
            ))}
        </div>
      </section>

      {/* ── Product launches ── */}
      {profile.launches.length > 0 && (
        <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Products &amp; launches</SectionLabel>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {profile.launches.map((launch) => (
              <Link
                key={launch.id}
                to={`/projects/${launch.slug || launch.id}`}
                className="group rounded-[28px] bg-white/80 p-6 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  {launch.logoUrl ? (
                    <img src={launch.logoUrl} alt="" className="h-10 w-10 rounded-[12px] object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#dcefc7] text-xs font-bold text-[#42520d]">
                      {launch.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold" style={serif}>{launch.name}</p>
                    <p className="mt-0.5 text-xs text-black/50">{launch.category}</p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-black/30 transition group-hover:text-[#42520d]" />
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-black/60">{launch.tagline || launch.intro}</p>
                {launch.metrics && (
                  <p className="mt-3 text-xs font-medium text-[#42520d]">{launch.metrics}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {[launch.stage, launch.location].filter(Boolean).map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Past products ── */}
      {pastProductList.length > 0 && (
        <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Past products</SectionLabel>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pastProductList.map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-sm text-black/70">
                <Briefcase className="h-3.5 w-3.5 shrink-0 text-[#42520d]" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Looking for ── */}
      {profile.lookingFor && (
        <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Looking to meet</SectionLabel>
          <p className="max-w-2xl text-lg leading-8 text-black/65">{profile.lookingFor}</p>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="rounded-[32px] bg-[#42520d] px-8 py-10 text-white md:flex md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/60">Connect on Apparent</p>
            <h2 className="mt-3 max-w-xl text-3xl font-normal leading-tight tracking-[-0.03em]" style={serif}>
              Interested in {profile.profileName || 'this founder'}?
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-white/70">
              Join Apparent to send a message, follow their launches, and get matched with founders and investors whose work is aligned with yours.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 md:ml-10 md:mt-0 md:shrink-0">
            <Link
              to="/login?role=investor"
              className="rounded-full bg-white px-6 py-3 text-center text-sm font-semibold text-[#42520d] transition hover:bg-[#dcefc7]"
            >
              Join as an investor
            </Link>
            <Link
              to="/login?role=founder"
              className="rounded-full border border-white/30 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Join as a founder
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

// ─── investor profile ─────────────────────────────────────────────────────────

const InvestorProfilePage = ({ profile }: { profile: PublicInvestorProfile }) => {
  const visible = (key: string) => profile.publicFields.includes(key);

  const infoRows = [
    visible('sectors') && profile.sectors && { icon: Target, label: 'Sectors', value: profile.sectors },
    visible('stage') && profile.stage && { icon: ChevronRight, label: 'Stage', value: profile.stage },
    visible('geography') && profile.geography && { icon: MapPin, label: 'Geography', value: profile.geography },
    visible('checkSize') && profile.checkSize && { icon: Briefcase, label: 'Check size', value: profile.checkSize },
  ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];

  const portfolioList = visible('portfolioExamples')
    ? profile.portfolioExamples.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <ProfileNav role="investor" />

      {/* ── Hero ── */}
      <section className="mx-auto max-w-[92rem] px-5 pb-10 pt-16 sm:px-8 md:pt-20">
        <div className="mb-6 flex items-center gap-2">
          <span className="rounded-full bg-[#42520d] px-3 py-1 text-xs font-semibold text-white">Investor on Apparent</span>
        </div>

        <h1
          className="max-w-5xl text-[2.8rem] font-normal leading-[0.92] tracking-[-0.045em] sm:text-[5rem] md:text-[7rem] lg:text-[8.5rem]"
          style={serif}
        >
          {profile.displayName || profile.username}
        </h1>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Avatar name={profile.displayName || profile.username} bg="#42520d" />
          <div>
            <p className="text-sm font-semibold text-black/80">@{profile.username}</p>
            <p className="mt-1 text-sm text-black/50">Investor profile on Apparent</p>
          </div>
        </div>
      </section>

      {/* ── Thesis ── */}
      {visible('thesis') && profile.thesis && (
        <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Investment thesis</SectionLabel>
          <p className="max-w-3xl text-xl leading-9 text-black/70">{profile.thesis}</p>
        </section>
      )}

      {/* ── Info cards ── */}
      {infoRows.length > 0 && (
        <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Investment parameters</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <Card key={label}>
                <Icon className="mb-4 h-4 w-4 text-[#42520d]" />
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/40">{label}</p>
                <p className="mt-2 text-sm leading-6 text-black/70">{value}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Portfolio calibration ── */}
      {portfolioList.length > 0 && (
        <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>Companies that match their taste</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {portfolioList.map((co) => (
              <Tag key={co} accent>{co}</Tag>
            ))}
          </div>
        </section>
      )}

      {/* ── Founder signals ── */}
      {visible('founderSignals') && profile.founderSignals && (
        <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
          <SectionLabel>What they back</SectionLabel>
          <p className="max-w-2xl text-lg leading-8 text-black/65">{profile.founderSignals}</p>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="rounded-[32px] bg-[#dcefc7] px-8 py-10 text-black md:flex md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#42520d]">Connect on Apparent</p>
            <h2 className="mt-3 max-w-xl text-3xl font-normal leading-tight tracking-[-0.03em]" style={serif}>
              Building something this investor would back?
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-black/60">
              Join Apparent to send a message directly, get your profile matched to their thesis, and discover more investors who align with what you are building.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 md:ml-10 md:mt-0 md:shrink-0">
            <Link
              to="/login?role=founder"
              className="rounded-full bg-[#42520d] px-6 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90"
            >
              Join as a founder
            </Link>
            <Link
              to="/login?role=investor"
              className="rounded-full border border-black/20 px-6 py-3 text-center text-sm font-semibold text-black transition hover:bg-black/5"
            >
              Join as an investor
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

// ─── restricted investor gate ─────────────────────────────────────────────────

const InvestorRestrictedPage = ({ username }: { username: string }) => (
  <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
    <ProfileNav role="founder" />
    <section className="mx-auto flex min-h-[70vh] max-w-[92rem] flex-col items-start justify-center px-5 sm:px-8">
      <p className="mb-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#42520d]">Apparent investor</p>
      <h1 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serif}>
        @{username}
      </h1>
      <p className="mt-8 max-w-lg text-lg leading-8 text-black/60">
        This investor profile is only visible to Apparent members. Sign in or create an account to view their full thesis, sectors, and contact details.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          to="/login?role=founder"
          className="rounded-full bg-[#42520d] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Sign in as founder
        </Link>
        <Link
          to="/login?role=investor"
          className="rounded-full border border-black/20 bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#dcefc7]"
        >
          Sign in as investor
        </Link>
      </div>
    </section>
  </main>
);

// ─── root ─────────────────────────────────────────────────────────────────────

export const PublicProfile = () => {
  // Support /@:handle (now routed as /:handle in App.tsx — React Router v7
  // can't parse /@:param) and legacy /profile/:profileId.
  const { handle: rawHandle = '', profileId = '' } = useParams();
  const handle = (rawHandle || profileId).replace(/^@/, '');

  // If the path segment doesn't start with @ it's not a profile route —
  // let it fall through to not_found so other pages aren't shadowed.
  const isProfileRoute = rawHandle.startsWith('@') || Boolean(profileId);

  const [result, setResult] = useState<PublicProfileResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!handle || !isProfileRoute) {
      setResult({ kind: 'not_found' });
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadPublicProfile(handle)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ kind: 'not_found' });
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [handle, isProfileRoute]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf7]">
        <div className="flex flex-col items-center gap-4">
          <LogoIcon className="h-8 w-8 animate-pulse text-[#42520d]" />
          <p className="text-sm text-black/40">Loading profile…</p>
        </div>
      </main>
    );
  }

  if (!result || result.kind === 'not_found') {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
        <ProfileNav />
        <section className="mx-auto flex min-h-[70vh] max-w-[92rem] flex-col items-start justify-center px-5 sm:px-8">
          <LogoIcon className="mb-10 h-8 w-8 text-black" />
          <h1 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serif}>
            Profile not found.
          </h1>
          <p className="mt-6 text-lg text-black/50">@{handle} doesn&apos;t exist on Apparent yet.</p>
          <Link
            to="/"
            className="mt-10 inline-flex rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#c9e6ac]"
          >
            Back to Apparent
          </Link>
        </section>
      </main>
    );
  }

  if (result.kind === 'founder') {
    return <FounderProfilePage profile={result.profile} />;
  }

  // Investor
  if (result.profile.restricted) {
    return <InvestorRestrictedPage username={result.profile.username} />;
  }

  return <InvestorProfilePage profile={result.profile} />;
};
