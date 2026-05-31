/**
 * Curated showcase launches used by the public project-detail fallback
 * (src/pages/ProjectDetail.tsx) when a /projects/:id URL doesn't resolve to a
 * real Apparent launch. These are well-known companies shown as illustrative
 * examples — not rendered on the marketing homepage.
 */

export type ShowcaseLaunch = {
  id: string;
  name: string;
  founder: string;
  tagline: string;
  description: string;
  category: string;
  location: string;
  stage: string;
  launched: string;
  fit: number;
  saves: number;
  comments: number;
  momentum: string;
  website: string;
  logoUrl?: string;
  bannerUrl?: string;
  demoVideoUrl?: string;
  pitchVideoUrl?: string;
  pitchDeckUrl?: string;
  pitchBookNote?: string;
  pitchVisibility?: 'public' | 'investors';
  founderSignals?: string[];
  projectPath: string;
  founderProfilePath: string;
  proof: string[];
  investors: string[];
};

export const productLaunches: ShowcaseLaunch[] = [
  {
    id: 'cursor',
    name: 'Cursor',
    founder: 'Michael Truell',
    tagline: 'AI-native coding workspace for software teams.',
    description:
      'Cursor turns codebases, prompts, and engineering workflows into one daily AI development surface for individual builders and teams.',
    category: 'AI devtools',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'Today',
    fit: 96,
    saves: 428,
    comments: 38,
    momentum: 'Developer workflow pull',
    website: 'https://www.cursor.com/',
    projectPath: '/projects/cursor',
    founderProfilePath: '/profile/michael-truell',
    proof: ['Fast adoption among engineers', 'High-frequency workflow', 'Clear technical wedge'],
    investors: ['AI infra', 'Developer tools', 'Product-led growth'],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    founder: 'Aravind Srinivas',
    tagline: 'Answer engine for search, research, and knowledge work.',
    description:
      'Perplexity makes research feel conversational while keeping citations, context, and follow-up exploration close to the answer.',
    category: 'AI search',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'Today',
    fit: 91,
    saves: 391,
    comments: 44,
    momentum: 'Consumer research habit',
    website: 'https://www.perplexity.ai/',
    projectPath: '/projects/perplexity',
    founderProfilePath: '/profile/aravind-srinivas',
    proof: ['Consumer frequency', 'Research workflow wedge', 'Strong brand pull'],
    investors: ['Consumer AI', 'Search', 'Knowledge workflows'],
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    founder: 'Arthur Mensch',
    tagline: 'Frontier AI lab building open and commercial models.',
    description:
      'Mistral is building model infrastructure from Europe with an open-weight strategy and commercial deployment path.',
    category: 'AI models',
    location: 'Paris',
    stage: 'Growth',
    launched: 'Yesterday',
    fit: 88,
    saves: 312,
    comments: 29,
    momentum: 'European AI infrastructure',
    website: 'https://mistral.ai/',
    projectPath: '/projects/mistral',
    founderProfilePath: '/profile/arthur-mensch',
    proof: ['Open-weight strategy', 'Model ecosystem', 'Infrastructure demand'],
    investors: ['AI models', 'Infrastructure', 'Europe'],
  },
  {
    id: 'harvey',
    name: 'Harvey',
    founder: 'Winston Weinberg',
    tagline: 'AI workflows for legal and professional services.',
    description:
      'Harvey brings AI into high-context legal work where accuracy, privacy, and institutional knowledge matter.',
    category: 'AI legal',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'Yesterday',
    fit: 87,
    saves: 286,
    comments: 21,
    momentum: 'Enterprise legal adoption',
    website: 'https://www.harvey.ai/',
    projectPath: '/projects/harvey',
    founderProfilePath: '/profile/winston-weinberg',
    proof: ['Vertical AI wedge', 'Enterprise pull', 'High-value workflow'],
    investors: ['Vertical AI', 'Enterprise', 'Legal tech'],
  },
  {
    id: 'ramp',
    name: 'Ramp',
    founder: 'Eric Glyman',
    tagline: 'Finance automation for cards, spend, procurement, and accounting.',
    description:
      'Ramp gives finance teams one operating surface for spend control, automation, procurement, payments, and accounting context.',
    category: 'Fintech',
    location: 'New York',
    stage: 'Growth',
    launched: 'This week',
    fit: 84,
    saves: 241,
    comments: 17,
    momentum: 'Finance ops expansion',
    website: 'https://ramp.com/',
    projectPath: '/projects/ramp',
    founderProfilePath: '/profile/eric-glyman',
    proof: ['Large operational surface', 'Clear buyer pain', 'Workflow automation'],
    investors: ['Fintech', 'B2B SaaS', 'Finance ops'],
  },
  {
    id: 'lovable',
    name: 'Lovable',
    founder: 'Anton Osika',
    tagline: 'AI app builder for turning prompts into shipped products.',
    description:
      'Lovable helps builders create, revise, and ship full-stack app prototypes from natural language prompts.',
    category: 'AI app builder',
    location: 'Stockholm',
    stage: 'Seed',
    launched: 'This week',
    fit: 82,
    saves: 219,
    comments: 25,
    momentum: 'Prototype velocity',
    website: 'https://lovable.dev/',
    projectPath: '/projects/lovable',
    founderProfilePath: '/profile/anton-osika',
    proof: ['Builder workflow', 'Fast product loops', 'Community pull'],
    investors: ['AI apps', 'Prosumer', 'Developer workflows'],
  },
  {
    id: 'neon',
    name: 'Neon',
    founder: 'Nikita Shamgunov',
    tagline: 'Serverless Postgres for modern product teams.',
    description:
      'Neon separates storage and compute so teams can branch databases, scale workloads, and ship Postgres-backed products faster.',
    category: 'Data infra',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'This week',
    fit: 81,
    saves: 203,
    comments: 18,
    momentum: 'Database branching pull',
    website: 'https://neon.tech/',
    projectPath: '/projects/neon',
    founderProfilePath: '/profile/nikita-shamgunov',
    proof: ['Serverless Postgres adoption', 'Developer workflow fit', 'Clear infra wedge'],
    investors: ['Data', 'Infrastructure', 'Developer tools'],
  },
  {
    id: 'modal',
    name: 'Modal',
    founder: 'Erik Bernhardsson',
    tagline: 'Cloud compute for AI, data, and batch workloads.',
    description:
      'Modal gives teams a fast way to run Python jobs, GPUs, scheduled tasks, and inference workloads without managing infrastructure.',
    category: 'AI infra',
    location: 'New York',
    stage: 'Seed',
    launched: 'This week',
    fit: 80,
    saves: 197,
    comments: 16,
    momentum: 'GPU workflow demand',
    website: 'https://modal.com/',
    projectPath: '/projects/modal',
    founderProfilePath: '/profile/erik-bernhardsson',
    proof: ['AI workload pull', 'Developer-first platform', 'Usage-driven infrastructure'],
    investors: ['AI infra', 'Cloud', 'Developer tools'],
  },
  {
    id: 'linear',
    name: 'Linear',
    founder: 'Karri Saarinen',
    tagline: 'Issue tracking and product planning for high-velocity teams.',
    description:
      'Linear turns product planning, engineering execution, and team rituals into one fast operating surface.',
    category: 'Productivity',
    location: 'San Francisco',
    stage: 'Growth',
    launched: 'This month',
    fit: 78,
    saves: 184,
    comments: 22,
    momentum: 'Product team operating system',
    website: 'https://linear.app/',
    projectPath: '/projects/linear',
    founderProfilePath: '/profile/karri-saarinen',
    proof: ['High-frequency workflow', 'Strong product taste', 'Team expansion signal'],
    investors: ['Productivity', 'SaaS', 'Workflow'],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    founder: 'Mati Staniszewski',
    tagline: 'AI audio generation for voices, agents, and media workflows.',
    description:
      'ElevenLabs gives creators and teams voice generation, dubbing, and audio AI tools for production-grade workflows.',
    category: 'AI audio',
    location: 'London',
    stage: 'Growth',
    launched: 'This month',
    fit: 77,
    saves: 176,
    comments: 20,
    momentum: 'Audio AI adoption',
    website: 'https://elevenlabs.io/',
    projectPath: '/projects/elevenlabs',
    founderProfilePath: '/profile/mati-staniszewski',
    proof: ['Creator workflow pull', 'Enterprise media usage', 'Clear AI application layer'],
    investors: ['AI audio', 'Creator tools', 'Media'],
  },
];
