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
      src: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    };
  } catch {
    return '';
  }
};

const buildLogoCloudInvestors = (contacts: VCContact[]) =>
  contacts
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
    .filter((investor) => investor.domain !== 'techstars.com' && investor.name !== 'Techstars')
    .filter((investor) => investor.domain !== 'accel.com' && investor.name !== 'Accel')
    .slice(0, 36);

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
    <section className="mx-auto max-w-[78rem] px-5 pb-10 sm:px-8">
      <div className="mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] overflow-hidden py-2">
        <InfiniteSlider gap={42} reverse speed={62} speedOnHover={24}>
          {investors.map((investor) => (
            <img
              alt={`${investor.name} logo`}
              className="h-12 w-12 shrink-0 select-none object-contain"
              height={48}
              key={`${investor.domain}-${investor.name}`}
              loading="lazy"
              src={investor.src}
              title={investor.name}
              width={48}
            />
          ))}
        </InfiniteSlider>
      </div>
    </section>
  );
}
