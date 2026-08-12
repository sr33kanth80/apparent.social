import { InfiniteSlider } from '@/components/ui/infinite-slider';

type InvestorLogo = {
  name: string;
  domain: string;
  src: string;
};

// Precomputed from the private VC seed at build time. The landing page only
// needs these 42 public names/domains; shipping the full multi-megabyte contact
// dataset here exposed unrelated fields and slowed every first visit.
const investors: InvestorLogo[] = [
  ['500 Startups', '500.co'], ['New Enterprise Associates', 'nea.com'], ['Accel', 'accel.com'],
  ['Sequoia Capital', 'sequoiacap.com'], ['SV Angel', 'svangel.com'], ['Kleiner Perkins', 'kleinerperkins.com'],
  ['Bessemer Venture Partners', 'bvp.com'], ['Andreessen Horowitz', 'a16z.com'], ['Lightspeed Venture Partners', 'lsvp.com'],
  ['Right Side Capital Management', 'rightsidecapital.com'], ['Index Ventures', 'indexventures.com'], ['GV', 'gv.com'],
  ['General Catalyst', 'generalcatalyst.com'], ['Venrock', 'venrock.com'], ['Greylock', 'greylock.com'],
  ['Threshold', 'threshold.vc'], ['Insight Partners', 'insightpartners.com'], ['Khosla Ventures', 'khoslaventures.com'],
  ['Tiger Global Management', 'tigerglobal.com'], ['Alumni Ventures', 'av.vc'], ['First Round Capital', 'firstround.com'],
  ['Battery Ventures', 'battery.com'], ['Norwest Venture Partners', 'nvp.com'], ['Menlo Ventures', 'menlovc.com'],
  ['GGV Capital', 'ggvc.com'], ['OrbiMed', 'orbimed.com'], ['Summit Partners', 'summitpartners.com'],
  ['Redpoint', 'redpoint.com'], ['Founders Fund', 'foundersfund.com'], ['Benchmark', 'benchmark.com'],
  ['Canaan Partners', 'canaan.com'], ['Mayfield Fund', 'mayfield.com'], ['Polaris Partners', 'polarispartners.com'],
  ['Foundation Capital', 'foundationcapital.com'], ['Atlas Venture', 'atlasventure.com'], ['CRV', 'crv.com'],
  ['Greycroft', 'greycroft.com'], ['Matrix Partners', 'matrixpartners.com'], ['Global Founders Capital', 'globalfounderscapital.com'],
  ['U.S. Venture Partners', 'usvp.com'], ['Lerer Hippeau', 'lererhippeau.com'], ['Felicis Ventures', 'felicis.com'],
].map(([name, domain]) => ({ name, domain, src: `https://www.google.com/s2/favicons?domain=${domain}&sz=256` }));

export function LogoCloud({ className = '' }: { className?: string }) {
  return (
    <section className={`alden-logo-cloud ${className}`} aria-label="VC firms mapped in the heat map" data-reveal>
      <div className="alden-logo-cloud__mask">
        <InfiniteSlider gap={14} reverse speed={56} speedOnHover={24}>
          {investors.map((investor) => (
            <img
              alt={`${investor.name} logo`}
              className="alden-logo-cloud__logo"
              height={56}
              key={`${investor.domain}-${investor.name}`}
              loading="lazy"
              src={investor.src}
              title={investor.name}
              width={56}
            />
          ))}
        </InfiniteSlider>
      </div>
    </section>
  );
}
