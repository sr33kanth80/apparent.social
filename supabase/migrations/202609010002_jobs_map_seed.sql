-- Jobs Map seed — 57 companies so /jobs is never an empty map.
--
-- The corpus is designed to accrete from searches, but a cold map is a bad
-- first impression on a public page, so this plants a curated starting set
-- (wherewework hand-authors theirs for the same reason).
--
-- Every careers URL here was verified live (2xx, redirects followed) before
-- being committed — no guessed paths. Candidates whose careers page 404'd, or
-- that blocked the checker outright, were dropped rather than shipped broken.
--
-- open_roles is 0: we don't know real counts without an Orthogonal call, and a
-- fabricated number would be worse than none. Pins render at base size and a
-- later enrich fills in true counts. is_hiring is true because each row has a
-- verified careers page.
--
-- last_enriched_at is left NULL so the staleness check treats these as cold:
-- the first search touching one of them upgrades it with live data.
--
-- Idempotent: re-running updates the curated fields and never duplicates.

insert into public.companies
  (canonical_domain, name, website, careers_url, one_liner, city, latitude, longitude, open_roles, is_hiring, source)
select
  v.canonical_domain, v.name, v.website, v.careers_url, v.one_liner, v.city, v.latitude, v.longitude, 0, true, 'seed'
from (values
  ('adyen.com', 'Adyen', 'https://adyen.com', 'https://adyen.com/careers', 'Global payments platform.', 'Amsterdam', 52.3676, 4.9041),
  ('airbnb.com', 'Airbnb', 'https://airbnb.com', 'https://airbnb.com/careers', 'Marketplace for stays and experiences.', 'San Francisco', 37.7749, -122.4194),
  ('alan.com', 'Alan', 'https://alan.com', 'https://alan.com/careers', 'Health insurance and care.', 'Paris', 48.8566, 2.3522),
  ('amazon.jobs', 'Amazon', 'https://amazon.jobs', 'https://amazon.jobs', 'Commerce, cloud, and devices.', 'Seattle', 47.6062, -122.3321),
  ('anthropic.com', 'Anthropic', 'https://anthropic.com', 'https://anthropic.com/careers', 'AI safety and research company.', 'San Francisco', 37.7749, -122.4194),
  ('asana.com', 'Asana', 'https://asana.com', 'https://asana.com/jobs', 'Work management for teams.', 'San Francisco', 37.7749, -122.4194),
  ('atlassian.com', 'Atlassian', 'https://atlassian.com', 'https://atlassian.com/company/careers', 'Team collaboration and dev tools.', 'Sydney', -33.8688, 151.2093),
  ('booking.com', 'Booking.com', 'https://booking.com', 'https://booking.com/careers', 'Travel booking marketplace.', 'Amsterdam', 52.3676, 4.9041),
  ('cloudflare.com', 'Cloudflare', 'https://cloudflare.com', 'https://cloudflare.com/careers', 'Connectivity cloud and edge network.', 'San Francisco', 37.7749, -122.4194),
  ('databricks.com', 'Databricks', 'https://databricks.com', 'https://databricks.com/company/careers', 'Data and AI lakehouse platform.', 'San Francisco', 37.7749, -122.4194),
  ('datadoghq.com', 'Datadog', 'https://datadoghq.com', 'https://datadoghq.com/careers', 'Cloud monitoring and observability.', 'New York', 40.7128, -74.006),
  ('deepmind.google', 'DeepMind', 'https://deepmind.google', 'https://deepmind.google/careers', 'AI research lab.', 'London', 51.5072, -0.1276),
  ('deliveroo.co.uk', 'Deliveroo', 'https://deliveroo.co.uk', 'https://deliveroo.co.uk/careers', 'Food delivery marketplace.', 'London', 51.5072, -0.1276),
  ('digitalocean.com', 'DigitalOcean', 'https://digitalocean.com', 'https://digitalocean.com/careers', 'Cloud infrastructure for developers.', 'New York', 40.7128, -74.006),
  ('figma.com', 'Figma', 'https://figma.com', 'https://figma.com/careers', 'Collaborative interface design.', 'San Francisco', 37.7749, -122.4194),
  ('freshworks.com', 'Freshworks', 'https://freshworks.com', 'https://freshworks.com/careers', 'Customer and employee software.', 'Chennai', 13.0827, 80.2707),
  ('grab.com', 'Grab', 'https://grab.com', 'https://grab.com/careers', 'Superapp for Southeast Asia.', 'Singapore', 1.3521, 103.8198),
  ('hubspot.com', 'HubSpot', 'https://hubspot.com', 'https://hubspot.com/careers', 'CRM and marketing software.', 'Boston', 42.3601, -71.0589),
  ('improbable.io', 'Improbable', 'https://improbable.io', 'https://improbable.io/careers', 'Virtual worlds and simulation.', 'London', 51.5072, -0.1276),
  ('instacart.com', 'Instacart', 'https://instacart.com', 'https://instacart.com/careers', 'Grocery delivery and pickup marketplace.', 'San Francisco', 37.7749, -122.4194),
  ('intercom.com', 'Intercom', 'https://intercom.com', 'https://intercom.com/careers', 'Customer messaging platform.', 'Dublin', 53.3498, -6.2603),
  ('klarna.com', 'Klarna', 'https://klarna.com', 'https://klarna.com/careers', 'Payments and shopping service.', 'Stockholm', 59.3293, 18.0686),
  ('klaviyo.com', 'Klaviyo', 'https://klaviyo.com', 'https://klaviyo.com/careers', 'Marketing automation for commerce.', 'Boston', 42.3601, -71.0589),
  ('miro.com', 'Miro', 'https://miro.com', 'https://miro.com/careers', 'Visual collaboration whiteboard.', 'Amsterdam', 52.3676, 4.9041),
  ('monday.com', 'Monday.com', 'https://monday.com', 'https://monday.com/careers', 'Work operating system.', 'Tel Aviv', 32.0853, 34.7818),
  ('mongodb.com', 'MongoDB', 'https://mongodb.com', 'https://mongodb.com/careers', 'Developer data platform.', 'New York', 40.7128, -74.006),
  ('monzo.com', 'Monzo', 'https://monzo.com', 'https://monzo.com/careers', 'Digital bank built for phones.', 'London', 51.5072, -0.1276),
  ('n26.com', 'N26', 'https://n26.com', 'https://n26.com/careers', 'Mobile banking across Europe.', 'Berlin', 52.52, 13.405),
  ('notion.so', 'Notion', 'https://notion.so', 'https://notion.so/careers', 'Connected workspace for docs and projects.', 'San Francisco', 37.7749, -122.4194),
  ('hioscar.com', 'Oscar Health', 'https://hioscar.com', 'https://hioscar.com/careers', 'Technology-driven health insurance.', 'New York', 40.7128, -74.006),
  ('plaid.com', 'Plaid', 'https://plaid.com', 'https://plaid.com/careers', 'Financial data network for fintech apps.', 'San Francisco', 37.7749, -122.4194),
  ('ramp.com', 'Ramp', 'https://ramp.com', 'https://ramp.com/careers', 'Corporate cards and spend management.', 'New York', 40.7128, -74.006),
  ('rappi.com', 'Rappi', 'https://rappi.com', 'https://rappi.com/careers', 'On-demand delivery in Latin America.', 'Bogota', 4.711, -74.0721),
  ('razorpay.com', 'Razorpay', 'https://razorpay.com', 'https://razorpay.com/careers', 'Payments and banking for businesses.', 'Bengaluru', 12.9716, 77.5946),
  ('remitly.com', 'Remitly', 'https://remitly.com', 'https://remitly.com/careers', 'International money transfer.', 'Seattle', 47.6062, -122.3321),
  ('retool.com', 'Retool', 'https://retool.com', 'https://retool.com/careers', 'Internal tools, built fast.', 'San Francisco', 37.7749, -122.4194),
  ('scale.com', 'Scale AI', 'https://scale.com', 'https://scale.com/careers', 'Data engine for AI models.', 'San Francisco', 37.7749, -122.4194),
  ('sea.com', 'Sea Group', 'https://sea.com', 'https://sea.com/careers', 'Digital entertainment and commerce.', 'Singapore', 1.3521, 103.8198),
  ('sentry.io', 'Sentry', 'https://sentry.io', 'https://sentry.io/careers', 'Application monitoring and error tracking.', 'San Francisco', 37.7749, -122.4194),
  ('shopify.com', 'Shopify', 'https://shopify.com', 'https://shopify.com/careers', 'Commerce platform for merchants.', 'Toronto', 43.6532, -79.3832),
  ('soundcloud.com', 'SoundCloud', 'https://soundcloud.com', 'https://soundcloud.com/careers', 'Audio platform for creators.', 'Berlin', 52.52, 13.405),
  ('spotify.com', 'Spotify', 'https://spotify.com', 'https://spotify.com/careers', 'Audio streaming platform.', 'Stockholm', 59.3293, 18.0686),
  ('squarespace.com', 'Squarespace', 'https://squarespace.com', 'https://squarespace.com/careers', 'Websites and commerce for creators.', 'New York', 40.7128, -74.006),
  ('stripe.com', 'Stripe', 'https://stripe.com', 'https://stripe.com/jobs', 'Payments infrastructure for the internet.', 'San Francisco', 37.7749, -122.4194),
  ('swiggy.com', 'Swiggy', 'https://swiggy.com', 'https://swiggy.com/careers', 'Food and grocery delivery.', 'Bengaluru', 12.9716, 77.5946),
  ('typeform.com', 'Typeform', 'https://typeform.com', 'https://typeform.com/careers', 'Conversational forms and surveys.', 'Barcelona', 41.3851, 2.1734),
  ('unity.com', 'Unity', 'https://unity.com', 'https://unity.com/careers', 'Real-time 3D development platform.', 'Copenhagen', 55.6761, 12.5683),
  ('vercel.com', 'Vercel', 'https://vercel.com', 'https://vercel.com/careers', 'Frontend cloud and deployment platform.', 'San Francisco', 37.7749, -122.4194),
  ('wayfair.com', 'Wayfair', 'https://wayfair.com', 'https://wayfair.com/careers', 'Online home goods retailer.', 'Boston', 42.3601, -71.0589),
  ('wealthsimple.com', 'Wealthsimple', 'https://wealthsimple.com', 'https://wealthsimple.com/careers', 'Investing and money apps.', 'Toronto', 43.6532, -79.3832),
  ('wise.com', 'Wise', 'https://wise.com', 'https://wise.com/careers', 'International money transfers.', 'London', 51.5072, -0.1276),
  ('wix.com', 'Wix', 'https://wix.com', 'https://wix.com/jobs', 'Website building platform.', 'Tel Aviv', 32.0853, 34.7818),
  ('zalando.com', 'Zalando', 'https://zalando.com', 'https://zalando.com/careers', 'European fashion e-commerce.', 'Berlin', 52.52, 13.405),
  ('zendesk.com', 'Zendesk', 'https://zendesk.com', 'https://zendesk.com/careers', 'Customer service software.', 'Copenhagen', 55.6761, 12.5683),
  ('zerodha.com', 'Zerodha', 'https://zerodha.com', 'https://zerodha.com/careers', 'Retail stockbroking platform.', 'Bengaluru', 12.9716, 77.5946),
  ('zillow.com', 'Zillow', 'https://zillow.com', 'https://zillow.com/careers', 'Real estate marketplace.', 'Seattle', 47.6062, -122.3321),
  ('zoho.com', 'Zoho', 'https://zoho.com', 'https://zoho.com/careers', 'Business software suite.', 'Chennai', 13.0827, 80.2707)
) as v (canonical_domain, name, website, careers_url, one_liner, city, latitude, longitude)
on conflict (canonical_domain) do update set
  name = excluded.name,
  website = excluded.website,
  careers_url = excluded.careers_url,
  one_liner = excluded.one_liner,
  city = excluded.city,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_hiring = true;
