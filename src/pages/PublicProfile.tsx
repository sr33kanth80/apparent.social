import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, Globe2, Link as LinkIcon, MapPin, Rocket } from 'lucide-react';
import { LogoIcon } from '@/components/LogoIcon';
import { GitHubIcon } from '@/components/GitHubIcon';
import { productLaunches } from '@/pages/Home';
import type { PublicFounderProfile } from '@/lib/apparent-types';
import { loadPublicFounderProfile } from '@/lib/dashboard-service';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const fallbackProfile = (profileId: string): PublicFounderProfile | null => {
  const launch = productLaunches.find((item) => item.founderProfilePath === `/profile/${profileId}`);
  if (!launch) return null;

  return {
    userId: profileId,
    profileName: launch.founder,
    headline: `${launch.founder} launched ${launch.name}.`,
    bio: launch.description,
    profilePhotoUrl: '',
    currentBuild: launch.name,
    category: launch.category,
    stage: launch.stage,
    github: '',
    traction: launch.momentum,
    lookingFor: launch.investors.join(', '),
    location: launch.location,
    press: launch.website,
    website: launch.website,
    linkedin: '',
    xProfile: '',
    pastProducts: '',
    launches: [
      {
        id: launch.id,
        ownerId: profileId,
        slug: launch.id,
        name: launch.name,
        tagline: launch.tagline,
        intro: launch.description,
        category: launch.category,
        stage: launch.stage,
        location: launch.location,
        launchUrl: launch.website,
        proofUrl: launch.website,
        metrics: launch.momentum,
        founderSignals: launch.proof,
        updatedAt: new Date().toISOString(),
      },
    ],
  };
};

export const PublicProfile = () => {
  const { profileId = '' } = useParams();
  const [profile, setProfile] = useState<PublicFounderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    loadPublicFounderProfile(profileId).then((loadedProfile) => {
      if (!isMounted) return;
      setProfile(loadedProfile ?? fallbackProfile(profileId));
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] px-5 py-20 text-black sm:px-8">
        <p className="text-sm font-semibold text-[#42520d]">Loading public profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#fbfaf7] px-5 py-20 text-black sm:px-8">
        <section className="mx-auto max-w-[92rem]">
          <LogoIcon className="mb-10 h-8 w-8 text-black" />
          <h1 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Profile not found.
          </h1>
          <Link to="/" className="mt-10 inline-flex rounded-full bg-[#dcefc7] px-6 py-3 text-sm font-semibold text-black">
            Back to launches
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <div className="mb-10 flex items-center gap-4">
          {profile.profilePhotoUrl ? (
            <img src={profile.profilePhotoUrl} alt="" className="h-16 w-16 rounded-[22px] object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#dcefc7] text-lg font-semibold">
              {profile.profileName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[#42520d]">Apparent profile</p>
            <p className="mt-1 text-sm text-black/50">{profile.location || 'Location not provided'}</p>
          </div>
        </div>
        <h1
          className="max-w-[86rem] text-[3.45rem] font-normal leading-[0.88] tracking-[-0.055em] sm:text-[7rem] md:text-[8.5rem] lg:text-[10rem]"
          style={serifDisplay}
        >
          {profile.profileName || 'Apparent builder'}
        </h1>
        <p className="mt-10 max-w-3xl text-lg leading-8 text-black/65 md:text-xl">
          {profile.bio || profile.headline || profile.currentBuild || 'This Apparent user has not added a public bio yet.'}
        </p>
      </section>

      <section className="mx-auto grid max-w-[92rem] gap-8 border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-12 text-sm font-semibold text-[#42520d]">Founder context</p>
          <h2 className="max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Work, proof, and what they are building.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ['Current build', profile.currentBuild || 'Not provided', Rocket],
            ['Category', profile.category || 'Not provided', Globe2],
            ['Stage', profile.stage || 'Not provided', MapPin],
            ['Traction', profile.traction || 'Not provided', GitHubIcon],
          ].map(([label, value, Icon]) => (
            <article key={String(label)} className="rounded-[24px] bg-white/70 p-5">
              <Icon className="mb-5 h-4 w-4 text-[#42520d]" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{String(label)}</p>
              <p className="mt-3 text-sm leading-6 text-black/65">{String(value)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <p className="mb-12 text-sm font-semibold text-[#42520d]">Launches</p>
        <div className="grid gap-5 md:grid-cols-2">
          {profile.launches.map((launch) => (
            <Link key={launch.id} to={`/projects/${launch.slug || launch.id}`} className="rounded-[28px] bg-white/70 p-6 transition-all hover:-translate-y-0.5 hover:bg-white">
              <p className="text-2xl font-normal tracking-[-0.025em]" style={serifDisplay}>
                {launch.name}
              </p>
              <p className="mt-3 text-sm leading-6 text-black/60">{launch.tagline || launch.intro}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[launch.category, launch.stage, launch.location].filter(Boolean).map((item) => (
                  <span key={item} className="rounded-full bg-[#dcefc7] px-3 py-1.5 text-xs font-semibold text-black">
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          ))}
          {profile.launches.length === 0 && (
            <div className="rounded-[28px] bg-white/70 p-6 text-sm leading-7 text-black/60">
              No public launches yet.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="flex flex-wrap gap-3">
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" className="rounded-full bg-[#42520d] px-5 py-3 text-sm font-semibold text-white">
              Website <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
            </a>
          )}
          {profile.github && (
            <a href={profile.github} target="_blank" rel="noreferrer" className="rounded-full bg-[#dcefc7] px-5 py-3 text-sm font-semibold text-black">
              GitHub
            </a>
          )}
          {profile.linkedin && (
            <a href={profile.linkedin} target="_blank" rel="noreferrer" className="rounded-full bg-[#dcefc7] px-5 py-3 text-sm font-semibold text-black">
              <LinkIcon className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
              LinkedIn
            </a>
          )}
        </div>
      </section>
    </main>
  );
};
