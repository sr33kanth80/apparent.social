/**
 * What kind of job a posting is.
 *
 * Providers do carry a `job_function`, but it is sparse and inconsistent —
 * plenty of rows have none, and those that do disagree about spelling. The
 * title, by contrast, is always present, so it is matched first and the
 * declared function is only a fallback.
 *
 * ponytail: keyword matching, not a model. It misfiles the occasional
 * "Sales Engineer"; the upgrade is a real classifier, and only worth it if
 * someone complains about a category being wrong rather than missing.
 */

export type JobCategory =
  | 'engineering'
  | 'data'
  | 'product'
  | 'design'
  | 'sales'
  | 'marketing'
  | 'operations'
  | 'finance'
  | 'people'
  | 'support'
  | 'other';

export const CATEGORY_LABELS: { value: JobCategory | ''; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'data', label: 'Data & AI' },
  { value: 'product', label: 'Product' },
  { value: 'design', label: 'Design' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'people', label: 'People & HR' },
  { value: 'support', label: 'Support' },
];

/**
 * Ordered: the first match wins, so the more specific category is listed
 * first. "Data engineer" is data, not engineering; "product designer" is
 * design, not product; "sales engineer" sells.
 */
const RULES: { category: JobCategory; terms: string[] }[] = [
  {
    category: 'data',
    terms: [
      'data scientist', 'data science', 'data engineer', 'data analyst', 'analytics engineer',
      'machine learning', ' ml ', 'ml engineer', 'ai engineer', 'ai researcher', 'research scientist',
      'bioinformatic', 'statistician', 'data platform', 'business intelligence', 'bi developer',
    ],
  },
  {
    category: 'design',
    terms: [
      'designer', 'design lead', 'design manager', 'ux ', 'ui ', 'user experience',
      'user research', 'creative director', 'illustrator', 'art director', 'brand design',
    ],
  },
  {
    category: 'sales',
    terms: [
      'sales', 'account executive', 'account manager', 'business development', ' bdr', ' sdr',
      'partnerships', 'revenue', 'customer success', 'solutions consultant', 'solutions engineer',
      'pre-sales', 'presales', 'enterprise account',
    ],
  },
  {
    category: 'marketing',
    terms: [
      'marketing', 'growth', 'seo', 'content strategist', 'copywriter', 'brand manager',
      'communications', 'social media', 'demand generation', 'public relations',
    ],
  },
  {
    category: 'product',
    terms: ['product manager', 'product owner', 'product lead', 'product director', 'head of product', 'technical program manager', 'program manager'],
  },
  {
    category: 'engineering',
    terms: [
      'engineer', 'developer', 'programmer', 'architect', 'devops', 'sre', 'site reliability',
      'security', 'qa ', 'quality assurance', 'technical lead', 'tech lead', 'cto', 'software',
      'full stack', 'fullstack', 'frontend', 'front-end', 'backend', 'back-end', 'mobile ',
      'ios ', 'android ', 'platform engineer', 'infrastructure',
    ],
  },
  {
    category: 'finance',
    terms: ['accountant', 'accounting', 'finance', 'financial', 'controller', 'treasury', 'auditor', 'payroll', 'fp&a', 'bookkeep'],
  },
  {
    category: 'people',
    terms: ['recruiter', 'recruiting', 'talent', 'human resources', ' hr ', 'people ops', 'people partner', 'chief of staff'],
  },
  {
    category: 'support',
    terms: ['support', 'help desk', 'helpdesk', 'service desk', 'technical support', 'customer service', 'customer care'],
  },
  {
    category: 'operations',
    terms: [
      'operations', 'operator', 'logistics', 'supply chain', 'warehouse', 'driver', 'dispatcher',
      'facilities', 'project manager', 'coordinator', 'administrator', 'office manager',
      'procurement', 'legal', 'counsel', 'compliance', 'nurse', 'technician', 'manufacturing',
    ],
  },
];

/**
 * Padded so word-boundary-ish terms (" hr ", "qa ") cannot match inside a
 * longer word — "chair" must not be an HR role.
 */
const haystack = (value: string) => ` ${value.toLowerCase().replace(/[/,()|]/g, ' ')} `;

export const categorize = (title: string, jobFunction = ''): JobCategory => {
  const text = haystack(title);
  for (const rule of RULES) {
    if (rule.terms.some((term) => text.includes(term))) return rule.category;
  }

  // Nothing in the title: fall back to whatever the provider declared.
  const declared = haystack(jobFunction);
  if (declared.trim()) {
    for (const rule of RULES) {
      if (rule.terms.some((term) => declared.includes(term))) return rule.category;
    }
  }
  return 'other';
};
