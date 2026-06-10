-- ─────────────────────────────────────────────────────────────────────────────
-- Real founder profile + product launch for Sreekanth Katavil (swiftapplyai)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_user_id   uuid;
  v_launch_id uuid;
begin
  -- Resolve user
  select id into v_user_id
  from public.profiles
  where lower(email) = 'swiftapplyai@gmail.com'
  limit 1;

  if v_user_id is null then
    raise exception 'User swiftapplyai@gmail.com not found — run after auth signup';
  end if;

  -- 1. Upgrade role to founder, set display name
  update public.profiles
  set
    role         = 'founder'::public.apparent_role,
    display_name = 'Sreekanth Katavil'
  where id = v_user_id;

  -- 2. Upsert founder_profiles row
  insert into public.founder_profiles (
    user_id,
    profile_name,
    headline,
    bio,
    profile_photo_url,
    current_build,
    category,
    stage,
    github,
    traction,
    looking_for,
    location,
    press,
    website,
    linkedin,
    x_profile,
    past_products,
    public_profile_enabled
  ) values (
    v_user_id,
    'Sreekanth Katavil',
    'Founder & CEO at Apparent · Previously SwiftApply AI, Aria, TrueScreen HQ',
    'I build products that close the gap between talented founders and the right investors. Most recently: Apparent — a founder discovery platform for thesis-fit VC matching. Before that, SwiftApply AI, a browser extension for intelligent job applications that grew to 10K downloads, 720 paying users, and $11.2K MRR before LinkedIn shut it down. Also built Aria, an AI agent orchestration layer, and TrueScreen HQ, an anti-cheat platform for technical recruiting. Sold my first company — a gaming startup called Esp for all — for £170,000 while still in college. MS in Computational Fluid Dynamics.',
    'https://ui-avatars.com/api/?name=Sreekanth+Katavil&background=42520d&color=fff&size=256&bold=true',
    'Apparent',
    'Platform / VC Infra',
    'Live',
    '',
    '$11.2K MRR with SwiftApply AI · 10K downloads · 720 paying users · Zero ad spend · Sold gaming company for £170K in college',
    'Pre-seed angels and funds focused on VC tools, AI workflow, or founder–investor market networks',
    'Austin, TX',
    'https://truescreenhq.com',
    'https://apparent.social',
    '',
    '',
    'SwiftApply AI — AI-powered job application browser extension. 10K downloads, 720 paying users, $11.2K MRR with zero ad spend. Shut down by LinkedIn. | Aria — AI agent orchestration platform. | TrueScreen HQ — Recruiter anti-cheat platform for technical hiring (truescreenhq.com). | Esp for all — Gaming company sold for £170,000 in college.',
    true
  )
  on conflict (user_id) do update set
    profile_name           = excluded.profile_name,
    headline               = excluded.headline,
    bio                    = excluded.bio,
    profile_photo_url      = excluded.profile_photo_url,
    current_build          = excluded.current_build,
    category               = excluded.category,
    stage                  = excluded.stage,
    traction               = excluded.traction,
    looking_for            = excluded.looking_for,
    location               = excluded.location,
    press                  = excluded.press,
    website                = excluded.website,
    linkedin               = excluded.linkedin,
    x_profile              = excluded.x_profile,
    past_products          = excluded.past_products,
    public_profile_enabled = excluded.public_profile_enabled;

  -- 3. Generate launch UUID
  v_launch_id := gen_random_uuid();

  -- 4. Insert product_launches for "Apparent"
  --    If the slug 'apparent' is already taken, fall back to 'apparent-social'.
  begin
    insert into public.product_launches (
      id,
      owner_id,
      slug,
      name,
      tagline,
      intro,
      category,
      stage,
      location,
      launch_url,
      proof_url,
      logo_url,
      metrics,
      founder_signals,
      team_summary,
      tech_stack,
      funding_status,
      looking_for,
      public_profile_enabled
    ) values (
      v_launch_id,
      v_user_id,
      'apparent',
      'Apparent',
      'Where founders get discovered by thesis-fit investors',
      'Apparent is a founder discovery platform that connects pre-seed and seed founders with thesis-fit investors. Founders build a rich public profile with proof signals, launch context, and team credentials. Investors get a curated, signal-ranked feed of builders that actually match their thesis — with built-in outreach and deal-flow tracking.',
      'Platform / VC Infra',
      'Live',
      'Austin, TX',
      'https://apparent.social',
      '',
      'https://www.google.com/s2/favicons?domain=apparent.social&sz=128',
      'Live product · Founder discovery + investor thesis matching',
      array[
        'Built solo from zero to live product',
        'Real founder profiles with proof signals and launch context',
        'Investor deal-flow feed ranked by thesis fit',
        'Built-in outreach drafting and deal-stage tracking',
        'Founder previously hit $11.2K MRR with SwiftApply AI (10K downloads, 720 paying users)'
      ],
      'Solo founder. Sreekanth Katavil is the Founder & CEO.',
      'React, TypeScript, Supabase, Tailwind CSS, Vercel',
      'Bootstrapped · Pre-seed',
      'Pre-seed angels and funds focused on VC tools, AI-powered deal flow, or founder-investor market networks',
      true
    );
  exception
    when unique_violation then
      -- slug 'apparent' already taken — use a slug derived from the UUID
      insert into public.product_launches (
        id,
        owner_id,
        slug,
        name,
        tagline,
        intro,
        category,
        stage,
        location,
        launch_url,
        proof_url,
        logo_url,
        metrics,
        founder_signals,
        team_summary,
        tech_stack,
        funding_status,
        looking_for,
        public_profile_enabled
      ) values (
        v_launch_id,
        v_user_id,
        'apparent-' || left(replace(v_launch_id::text, '-', ''), 8),
        'Apparent',
        'Where founders get discovered by thesis-fit investors',
        'Apparent is a founder discovery platform that connects pre-seed and seed founders with thesis-fit investors. Founders build a rich public profile with proof signals, launch context, and team credentials. Investors get a curated, signal-ranked feed of builders that actually match their thesis — with built-in outreach and deal-flow tracking.',
        'Platform / VC Infra',
        'Live',
        'Austin, TX',
        'https://apparent.social',
        '',
        'https://www.google.com/s2/favicons?domain=apparent.social&sz=128',
        'Live product · Founder discovery + investor thesis matching',
        array[
          'Built solo from zero to live product',
          'Real founder profiles with proof signals and launch context',
          'Investor deal-flow feed ranked by thesis fit',
          'Built-in outreach drafting and deal-stage tracking',
          'Founder previously hit $11.2K MRR with SwiftApply AI (10K downloads, 720 paying users)'
        ],
        'Solo founder. Sreekanth Katavil is the Founder & CEO.',
        'React, TypeScript, Supabase, Tailwind CSS, Vercel',
        'Bootstrapped · Pre-seed',
        'Pre-seed angels and funds focused on VC tools, AI-powered deal flow, or founder-investor market networks',
        true
      );
  end;

  -- 5. Insert launch_team_members for Sreekanth
  insert into public.launch_team_members (
    launch_id,
    owner_id,
    apparent_user_id,
    name,
    role,
    bio,
    location,
    avatar_url,
    profile_url,
    sort_order
  ) values (
    v_launch_id,
    v_user_id,
    v_user_id,
    'Sreekanth Katavil',
    'Founder & CEO',
    'Serial builder. MS in Computational Fluid Dynamics. Hit $11.2K MRR with SwiftApply AI (10K downloads, 720 paying users, zero ad spend). Sold first company for £170K in college. Building Apparent to fix how founders get discovered.',
    'Austin, TX',
    'https://ui-avatars.com/api/?name=Sreekanth+Katavil&background=42520d&color=fff&size=256&bold=true',
    '/profile/swiftapplyai',
    0
  );

  raise notice 'Done. user_id=%, launch_id=%', v_user_id, v_launch_id;
end $$;
