import { useEffect, useState } from 'react';

import { InfiniteSlider } from '@/components/ui/infinite-slider';
import type { VCContact } from '@/lib/apparent-types';

type InvestorLogo = {
  name: string;
  stage: string;
  location: string;
  score: number;
  domain: string;
  src: string;
};

const isInvestorLogo = (investor: InvestorLogo | null): investor is InvestorLogo => investor !== null;

const logoUrlFromWebsite = (website: string) => {
  const trimmed = website.trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const domain = new URL(withProtocol).hostname.replace(/^www\./, '');
    return {
      domain,
      src: `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    };
  } catch {
    return '';
  }
};

const buildLogoCloudInvestors = (contacts: VCContact[]) =>
  contacts
    .filter((contact) => contact.latitude !== null && contact.longitude !== null)
    .filter((contact) => /venture|vc/i.test(contact.fundType))
    .map((contact) => {
      const logo = logoUrlFromWebsite(contact.website);
      if (!logo) return null;

      return {
        name: contact.investorName,
        stage: contact.fundStage,
        location: contact.normalizedCity || contact.location,
        score: contact.numberOfInvestments * 2 + contact.numberOfExits * 6,
        ...logo,
      };
    })
    .filter(isInvestorLogo)
    .sort((a, b) => b.score - a.score)
    .filter((investor, index, investors) => investors.findIndex((item) => item.domain === investor.domain) === index)
    .slice(0, 42);

export function LogoCloud() {
  const [investors, setInvestors] = useState<InvestorLogo[]>([]);

  useEffect(() => {
    let isMounted = true;

    import('@/data/vc-contact-seed').then(({ vcContactSeed }) => {
      if (isMounted) {
        setInvestors(buildLogoCloudInvestors(vcContactSeed as VCContact[]));
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="alden-logo-cloud" aria-label="VC firms mapped in the heat map" data-reveal>
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
