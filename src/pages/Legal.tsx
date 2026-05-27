const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

type LegalSection = {
  title: string;
  body: string;
};

type LegalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: LegalSection[];
};

const legalContent: Record<'privacy' | 'terms' | 'cookies', LegalContent> = {
  privacy: {
    eyebrow: 'Privacy Policy',
    title: 'How Apparent handles your information.',
    intro:
      'This Privacy Policy explains how Apparent collects, uses, discloses, protects, and retains information when people use our websites, applications, founder profiles, investor workflows, matching, messaging, maps, analytics, and related services.',
    sections: [
      {
        title: 'Information we collect from you',
        body:
          'We collect information you provide directly, including name, email address, account credentials, role, company or fund details, founder and investor profiles, launch details, thesis preferences, saved projects, notes, messages, uploaded materials, location inputs, feedback, support requests, and any other information you choose to submit through Apparent.',
      },
      {
        title: 'Information collected automatically',
        body:
          'We may automatically collect device, browser, IP address, approximate location, session, log, referral, interaction, product usage, diagnostic, cookie, local storage, and similar technical information. We use this information to keep the service secure, remember preferences, understand feature performance, prevent abuse, and improve reliability.',
      },
      {
        title: 'How we use information',
        body:
          'We use information to provide and operate Apparent, create and maintain accounts, personalize founder and investor matching, rank and recommend relevant profiles or launches, support messaging and deal workflows, process requests, send service communications, analyze usage, improve the product, enforce our terms, protect rights and safety, comply with law, and support legitimate business operations.',
      },
      {
        title: 'How information is shared',
        body:
          'Information may be shared with people and workspaces you choose to interact with, including profile details, messages, saved workflow activity, launch information, and collaboration context. We may also share information with service providers, hosting providers, analytics providers, security vendors, professional advisors, payment or communications providers if added, business transaction parties, law enforcement, regulators, or others when required by law or needed to protect Apparent, users, or the public.',
      },
      {
        title: 'No sale of personal information',
        body:
          'Apparent does not sell personal information for money. We also do not knowingly sell or share personal information of anyone under 16. If future advertising or analytics activity is considered a "sale," "sharing," or targeted advertising under applicable privacy law, we will provide required disclosures and opt-out controls.',
      },
      {
        title: 'Legal bases and sensitive data',
        body:
          'Where a legal basis is required, we process information to perform a contract, comply with legal obligations, protect vital interests, pursue legitimate interests, or with consent. Please do not submit sensitive personal information unless it is necessary for your use of Apparent. If you provide sensitive information, you authorize us to process it for the purpose for which it was provided and as otherwise permitted by law.',
      },
      {
        title: 'Retention and security',
        body:
          'We retain information for as long as reasonably necessary to provide the service, maintain records, resolve disputes, enforce agreements, comply with law, prevent fraud or abuse, and support legitimate business needs. We use reasonable administrative, technical, and organizational safeguards, but no internet or storage system can be guaranteed to be completely secure.',
      },
      {
        title: 'Your privacy rights',
        body:
          'Depending on where you live, you may have rights to know, access, correct, delete, restrict, object to, port, or opt out of certain processing of personal information. You may also have the right to appeal a decision or withdraw consent. We will not discriminate against you for exercising privacy rights. To make a request, contact us at privacy@apparent.dev and we may verify your identity before responding.',
      },
      {
        title: 'Children, international use, and updates',
        body:
          'Apparent is not intended for children under 13, and we do not knowingly collect personal information from children under 13. If you use Apparent from outside the United States, your information may be processed in the United States and other countries. We may update this policy from time to time, and material changes will be posted here or communicated as required by law.',
      },
    ],
  },
  terms: {
    eyebrow: 'Terms of Service',
    title: 'The basic rules for using Apparent.',
    intro:
      'These Terms of Service govern access to and use of Apparent. By creating an account, accessing the product, or using any Apparent service, you agree to these terms on behalf of yourself or the organization you represent.',
    sections: [
      {
        title: 'Eligibility and accounts',
        body:
          'You must be legally able to enter into a binding agreement and use Apparent only for lawful business purposes. You are responsible for providing accurate account information, maintaining the confidentiality of your credentials, restricting access to your account, and all activity that occurs under your account.',
      },
      {
        title: 'Permitted use',
        body:
          'Apparent may be used for founder discovery, investor sourcing, profile proof, matching, messaging, meetups, maps, notes, launch tracking, and related workflow. You may not use Apparent to violate law, infringe rights, misrepresent identity or affiliation, harass others, send spam, scrape or harvest data, bypass access controls, interfere with security, reverse engineer the service, upload malware, or use automated systems without our written permission.',
      },
      {
        title: 'User content and permissions',
        body:
          'You retain ownership of content you submit, but you grant Apparent a worldwide, non-exclusive, royalty-free license to host, use, reproduce, display, transmit, modify, and process that content as needed to operate, improve, protect, and provide the service. You represent that you have all rights needed to submit the content and that it is accurate, lawful, and not confidential unless a separate written agreement says otherwise.',
      },
      {
        title: 'No investment advice',
        body:
          'Apparent provides software, discovery, matching, and workflow tools. Apparent does not provide legal, tax, accounting, financial, investment, broker-dealer, placement agent, crowdfunding, securities, or fiduciary advice. Rankings, profiles, proof signals, match scores, notes, and messages are informational only and are not recommendations, offers, solicitations, endorsements, or guarantees of investment outcome.',
      },
      {
        title: 'Third parties and user interactions',
        body:
          'Apparent may display third-party websites, public information, user-submitted information, integrations, maps, analytics, or links. We are not responsible for third-party content, services, availability, accuracy, security, or practices. Users are solely responsible for diligence, decisions, communications, meetings, negotiations, investments, contracts, and disputes with other users or third parties.',
      },
      {
        title: 'Fees, changes, and suspension',
        body:
          'If paid features are offered, fees, billing terms, taxes, renewal terms, and cancellation terms will be disclosed at purchase or in a separate order form. We may modify, suspend, limit, or discontinue any part of Apparent, and we may suspend or terminate access if we believe you violated these terms, created risk, caused harm, or used the service unlawfully.',
      },
      {
        title: 'Disclaimers',
        body:
          'Apparent is provided "as is" and "as available." To the fullest extent permitted by law, we disclaim all warranties, whether express, implied, statutory, or otherwise, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, availability, accuracy, security, and uninterrupted or error-free operation.',
      },
      {
        title: 'Limitation of liability',
        body:
          'To the fullest extent permitted by law, Apparent and its affiliates, officers, employees, agents, suppliers, and licensors will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost revenue, lost data, business interruption, goodwill loss, or investment losses. Our total liability for any claim will not exceed the greater of $100 or the amount you paid to Apparent for the service giving rise to the claim in the 12 months before the claim.',
      },
      {
        title: 'Indemnity and disputes',
        body:
          'You agree to defend, indemnify, and hold Apparent harmless from claims, damages, liabilities, losses, costs, and expenses arising from your content, your use of Apparent, your violation of these terms, or your violation of law or third-party rights. To the fullest extent permitted by law, disputes will be resolved individually, not as a class action, and you waive any right to participate in a class, consolidated, or representative proceeding.',
      },
      {
        title: 'Updates to these terms',
        body:
          'We may update these terms from time to time. The updated version will be posted here with a new effective date. Continued use of Apparent after an update means you accept the updated terms. If you do not agree, you must stop using the service.',
      },
    ],
  },
  cookies: {
    eyebrow: 'Cookie Policy',
    title: 'How Apparent uses cookies and similar technology.',
    intro:
      'This Cookie Policy explains how Apparent uses cookies, local storage, pixels, SDKs, browser identifiers, and similar technologies to operate the product, protect accounts, remember preferences, analyze usage, and improve the service.',
    sections: [
      {
        title: 'What cookies and similar tools do',
        body:
          'Cookies are small files placed on a browser or device. Local storage and similar technologies can store information in your browser. These tools may remember sessions, preferences, security signals, device identifiers, feature state, analytics events, or other information needed for Apparent to work and improve.',
      },
      {
        title: 'Strictly necessary technologies',
        body:
          'We use necessary cookies and storage to keep you signed in, authenticate requests, maintain security, prevent fraud or abuse, route traffic, remember privacy choices, load pages, and provide core product features. These technologies are required for the service and cannot be disabled through Apparent without affecting functionality.',
      },
      {
        title: 'Preference and functional technologies',
        body:
          'We may use cookies or local storage to remember role, dashboard state, filters, selected views, display settings, saved workflows, language or region choices, and similar preferences so Apparent feels consistent when you return.',
      },
      {
        title: 'Analytics and performance',
        body:
          'We may use analytics and performance technologies to understand product usage, diagnose bugs, measure navigation, improve onboarding, evaluate matching and workflow performance, and understand which features are useful. Analytics information may be aggregated or pseudonymized where practical.',
      },
      {
        title: 'Advertising and third-party technologies',
        body:
          'Apparent does not currently rely on third-party behavioral advertising cookies as a core product feature. If we add advertising, retargeting, cross-context tracking, or third-party technologies that require consent or opt-out rights, we will update this policy and provide required controls before using them where required by law.',
      },
      {
        title: 'Consent and opt-out choices',
        body:
          'Where consent is required, non-essential cookies will be used only after you consent. Where opt-out rights apply, we will honor legally required opt-out choices, including applicable browser-based signals when required and technically feasible. You may also manage cookies through your browser settings, but disabling necessary storage may prevent sign-in, security, preferences, or product features from working correctly.',
      },
      {
        title: 'How long cookies last',
        body:
          'Session cookies may expire when you close your browser. Persistent cookies and local storage may remain until they expire, you delete them, or Apparent replaces them. Retention periods vary based on purpose, including authentication, security, preferences, analytics, compliance, and product reliability.',
      },
      {
        title: 'Relationship to the Privacy Policy',
        body:
          'Information collected through cookies and similar technologies may be personal information under privacy laws. For more detail about categories of information collected, purposes, sharing, retention, and privacy rights, review the Apparent Privacy Policy.',
      },
    ],
  },
};

const LegalPage = ({ type }: { type: keyof typeof legalContent }) => {
  const content = legalContent[type];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <p className="mb-10 text-sm font-semibold text-[#42520d]">{content.eyebrow}</p>
        <h1
          className="max-w-[82rem] text-[3.1rem] font-normal leading-[0.9] tracking-[-0.055em] sm:text-[6rem] md:text-[7.5rem] lg:text-[8.5rem]"
          style={serifDisplay}
        >
          {content.title}
        </h1>
        <p className="mt-10 max-w-3xl text-lg leading-8 text-black/65 md:text-xl">
          {content.intro}
        </p>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-16 sm:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          {content.sections.map((section) => (
            <article key={section.title} className="rounded-[28px] bg-white/70 p-6 sm:p-8">
              <h2 className="text-2xl font-normal tracking-[-0.025em]" style={serifDisplay}>
                {section.title}
              </h2>
              <p className="mt-5 text-sm leading-7 text-black/60">{section.body}</p>
            </article>
          ))}
        </div>
        <p className="mt-12 max-w-3xl text-sm leading-7 text-black/50">
          Last updated: May 25, 2026. These policies are intended to describe Apparent's current practices and contractual rules. They should be reviewed by qualified counsel for your company structure, jurisdictions, data flows, and launch plan.
        </p>
      </section>
    </main>
  );
};

export const PrivacyPolicy = () => <LegalPage type="privacy" />;
export const TermsOfService = () => <LegalPage type="terms" />;
export const CookiePolicy = () => <LegalPage type="cookies" />;
