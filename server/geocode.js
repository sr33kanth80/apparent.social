// Live geocoding through Orthogonal's catalog.
//
// This replaces a hand-written table of ~400 city coordinates. That table was
// the only authored data in the feature and it capped the map twice: companies
// in any city nobody had typed simply never appeared.
//
// Two directions are needed:
//   forward  - a job row names a city, the map needs coordinates for the pin
//   reverse  - exploring the map gives coordinates, the hiring endpoints filter
//              by city NAME
//
// Endpoint choice is discovered from the catalog rather than pinned to a
// provider, the same way hiring endpoints are, so this keeps working if the
// catalog changes underneath us.

import { createOrthogonalSession, orthogonalData, OrthogonalError } from './agent/orthogonal.js';

const clean = (value, max = 200) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const FORWARD_TERMS = ['geocod', 'coordinate', 'latitude', 'location'];
const REVERSE_TERMS = ['reverse', 'coordinate', 'latitude', 'geocod'];

/**
 * Chosen endpoints are cached for the life of the process. The catalog's prices
 * and shapes do not change between requests, and /v1/search plus /v1/details are
 * unpaid, so this only avoids latency — not billing.
 */
const endpointCache = { forward: null, reverse: null };

/**
 * Resolved places are memoised process-wide. This is a billing guard, not a
 * corpus: the same city resolves to the same point forever, so paying twice for
 * "Boston" is pure waste. Bounded so a long-lived instance cannot grow without
 * limit.
 */
const placeCache = new Map();
const PLACE_CACHE_MAX = 5000;

const rememberPlace = (key, value) => {
  if (placeCache.size >= PLACE_CACHE_MAX) placeCache.clear();
  placeCache.set(key, value);
  return value;
};

/** Test seam, mirroring the Orthogonal wrapper's own. */
export const clearGeocodeCaches = () => {
  endpointCache.forward = null;
  endpointCache.reverse = null;
  placeCache.clear();
};

const extractItems = (payload) => {
  const data = orthogonalData(payload);
  const candidates = [data, data?.results, data?.data, data?.items, data?.features, data?.places];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
  }
  return data && typeof data === 'object' ? [data] : [];
};

/** Pull a number out of whichever spelling a provider used. */
const pickNumber = (item, keys) => {
  for (const key of keys) {
    const value = Number(item?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
};

/**
 * Coordinates arrive either as named fields or as a GeoJSON [lng, lat] pair —
 * note the order, which is the opposite of how they are usually written.
 */
const readCoordinates = (raw) => {
  const item = raw?.attributes && typeof raw.attributes === 'object' ? { ...raw, ...raw.attributes } : raw;

  const lat = pickNumber(item, ['latitude', 'lat', 'y']);
  const lng = pickNumber(item, ['longitude', 'lng', 'lon', 'long', 'x']);
  if (lat != null && lng != null) return { latitude: lat, longitude: lng };

  const pair = item?.geometry?.coordinates ?? item?.coordinates ?? item?.center;
  if (Array.isArray(pair) && pair.length >= 2) {
    const first = Number(pair[0]);
    const second = Number(pair[1]);
    if (Number.isFinite(first) && Number.isFinite(second)) {
      return { latitude: second, longitude: first };
    }
  }
  return null;
};

const readPlaceName = (raw) => {
  const item = raw?.attributes && typeof raw.attributes === 'object' ? { ...raw, ...raw.attributes } : raw;
  const nested = item?.address ?? item?.components ?? item?.properties ?? {};
  return clean(
    item?.city ??
      nested?.city ??
      item?.locality ??
      nested?.locality ??
      item?.town ??
      nested?.town ??
      item?.municipality ??
      nested?.municipality ??
      item?.name ??
      nested?.county ??
      item?.region ??
      nested?.state,
    120,
  );
};

// Exclusions are matched against the PATH only. Matching descriptions instead
// threw away every good candidate: a geocoder was dropped for the word
// "person", a maps endpoint for "phone", and a /geo/cities endpoint for
// "people" -- all words that appear harmlessly in geo endpoint prose.
const NON_GEO_PATH_TERMS = ['email', 'phone', 'linkedin', 'dns', 'whois'];

// A usable endpoint has to be geographic in the first place.
const GEO_PATH_TERMS = ['geocod', 'geo', 'map', 'place', 'cities', 'city', 'location', 'address'];

const LAT_KEYS = ['lat', 'latitude'];
const LNG_KEYS = ['lon', 'lng', 'long', 'longitude'];

/**
 * Score how well an endpoint matches the direction we need.
 *
 * Parameters are trusted over prose: a reverse geocoder must accept a latitude
 * and a longitude, and nothing that fails that test can do the job regardless
 * of how well its description reads.
 */
const scoreEndpoint = (haystack, path, terms, wantReverse, declaredParams) => {
  const lowerPath = path.toLowerCase();
  if (NON_GEO_PATH_TERMS.some((term) => lowerPath.includes(term))) return -1;
  if (!GEO_PATH_TERMS.some((term) => lowerPath.includes(term))) return -1;

  const declared = Array.isArray(declaredParams) ? declaredParams : [];
  if (wantReverse) {
    const takesLat = LAT_KEYS.some((k) => declared.includes(k));
    const takesLng = LNG_KEYS.some((k) => declared.includes(k));
    if (!takesLat || !takesLng) return -1;
  }

  return terms.reduce((n, term) => (haystack.includes(term) ? n + 1 : n), 0);
};

const discoverEndpoint = async (session, wantReverse, budgetCents) => {
  const prompt = wantReverse
    ? 'reverse geocode latitude and longitude coordinates into a city name'
    : 'geocode a city or place name into latitude and longitude coordinates';

  const found = await session.search(prompt, 6);
  const terms = wantReverse ? REVERSE_TERMS : FORWARD_TERMS;
  const priced = [];
  const seenEndpoints = [];

  for (const entry of extractItems(found).slice(0, 3)) {
    const api = clean(entry?.slug ?? entry?.api ?? entry?.provider, 80).toLowerCase();
    const endpoints = Array.isArray(entry?.endpoints) ? entry.endpoints : [entry];
    for (const endpoint of endpoints.slice(0, 2)) {
      const path = clean(endpoint?.path ?? endpoint?.endpoint, 200);
      // Templated paths need an id a lookup does not have.
      if (!api || !path.startsWith('/') || path.includes('{')) continue;

      const haystack = `${path} ${clean(endpoint?.description, 300)}`.toLowerCase();
      seenEndpoints.push({ api, path });

      try {
        const details = await session.details({ api, path });
        const info = details?.endpoint ?? details?.data?.endpoint ?? {};
        const priceUsd = Number(info?.price);
        const dynamic = info?.hasDynamicPricing === true || !Number.isFinite(priceUsd) || priceUsd < 0;
        if (dynamic) continue; // the wrapper refuses unbounded pricing anyway

        const priceCents = Math.round(priceUsd * 100);
        if (priceCents > budgetCents) continue;

        const params = (() => {
          const raw = info?.parameters ?? info?.params ?? info?.queryParams ?? info?.schema;
          if (Array.isArray(raw)) return raw.map((x) => clean(x?.name ?? x, 40));
          if (raw && typeof raw === 'object') return Object.keys(raw);
          return [];
        })();

        const score = scoreEndpoint(haystack, path, terms, wantReverse, params);
        if (score < 0) continue;

        priced.push({
          api,
          path,
          method: (clean(endpoint?.method, 10) || 'GET').toUpperCase(),
          params,
          priceCents,
          score,
          description: clean(endpoint?.description, 160),
        });
      } catch {
        // Not priceable; simply not a candidate.
      }
    }
  }

  priced.sort((a, b) => b.score - a.score || a.priceCents - b.priceCents);
  lastCandidates[wantReverse ? 'reverse' : 'forward'] = { scored: priced.slice(0, 10), seen: seenEndpoints.slice(0, 20) };
  return priced[0] || null;
};

/** Diagnostics: what discovery actually had to choose between. */
const lastCandidates = { forward: [], reverse: [] };
export const geocodeCandidates = () => lastCandidates;

/** Diagnostics: keys of the last reverse payload, to find the place-name field. */
export const lastReverseShape = () => lastShape;
let lastShape = null;
export const recordReverseShape = (items) => {
  lastShape = items.slice(0, 2).map((raw) => {
    const item = raw?.attributes && typeof raw.attributes === 'object' ? { ...raw, ...raw.attributes } : raw;
    return Object.keys(item || {}).slice(0, 25);
  });
};

/** Map our intent onto whatever parameter names the endpoint declares. */
const buildParams = (endpoint, { place, latitude, longitude }) => {
  const declared = Array.isArray(endpoint.params) ? endpoint.params : [];
  const has = (name) => declared.includes(name);
  const params = {};

  if (place) {
    const key = ['q', 'query', 'address', 'city', 'location', 'place', 'text', 'search', 'name'].find(has);
    params[key || 'q'] = place;
  }
  if (latitude != null && longitude != null) {
    const latKey = ['lat', 'latitude'].find(has) || 'lat';
    const lngKey = ['lon', 'lng', 'long', 'longitude'].find(has) || 'lon';
    params[latKey] = latitude;
    params[lngKey] = longitude;
  }
  if (has('limit')) params.limit = 1;
  if (has('format')) params.format = 'json';
  return params;
};

const runEndpoint = async (session, endpoint, params) => {
  const isGet = endpoint.method !== 'POST' && endpoint.method !== 'PUT' && endpoint.method !== 'PATCH';
  // Query parameters must be strings; a numeric value is rejected outright.
  const asQuery = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]));
  return session.run({
    api: endpoint.api,
    path: endpoint.path,
    body: isGet ? {} : params,
    query: isGet ? asQuery : {},
  });
};

const makeSession = (budgetCents) =>
  createOrthogonalSession({
    maxCalls: 40,
    maxSpendCents: budgetCents,
  });

const budget = () => Number.parseInt(process.env.GEOCODE_MAX_SPEND_CENTS || '', 10) || 15;

/**
 * City or place name to coordinates. Returns null when the catalog cannot
 * resolve it, which is treated the same as an unplaceable row: still listed,
 * just not pinned.
 */
export const geocodePlace = async (place, options = {}) => {
  const key = `f:${clean(place, 120).toLowerCase()}`;
  if (!key.slice(2)) return null;
  if (placeCache.has(key)) return placeCache.get(key);

  const budgetCents = options.budgetCents ?? budget();
  const session = options.session ?? makeSession(budgetCents);

  try {
    if (!endpointCache.forward) {
      endpointCache.forward = await discoverEndpoint(session, false, budgetCents);
    }
    if (!endpointCache.forward) return rememberPlace(key, null);

    const result = await runEndpoint(
      session,
      endpointCache.forward,
      buildParams(endpointCache.forward, { place: clean(place, 120) }),
    );
    for (const item of extractItems(result)) {
      const coords = readCoordinates(item);
      if (coords) return rememberPlace(key, coords);
    }
    return rememberPlace(key, null);
  } catch (error) {
    // Budget exhaustion must not be cached as "this place does not exist".
    if (error instanceof OrthogonalError) return null;
    return null;
  }
};

/** Coordinates to a city name, for turning a viewport into a searchable place. */
export const reverseGeocode = async (latitude, longitude, options = {}) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Rounded so nudging the map re-uses the same answer.
  const key = `r:${lat.toFixed(2)},${lng.toFixed(2)}`;
  if (placeCache.has(key)) return placeCache.get(key);

  const budgetCents = options.budgetCents ?? budget();
  const session = options.session ?? makeSession(budgetCents);

  try {
    if (!endpointCache.reverse) {
      endpointCache.reverse = await discoverEndpoint(session, true, budgetCents);
    }

    // The catalog carries no dedicated reverse geocoder: every geo endpoint it
    // offers is forward-only. Map search APIs commonly accept a "lat,lng"
    // string as their query and answer with the place there, so the forward
    // endpoint is reused that way rather than reintroducing a local table.
    let endpoint = endpointCache.reverse;
    let params;
    if (endpoint) {
      params = buildParams(endpoint, { latitude: lat, longitude: lng });
    } else {
      if (!endpointCache.forward) {
        endpointCache.forward = await discoverEndpoint(session, false, budgetCents);
      }
      if (!endpointCache.forward) return rememberPlace(key, null);
      endpoint = endpointCache.forward;
      params = buildParams(endpoint, { place: `${lat},${lng}` });
    }

    const result = await runEndpoint(session, endpoint, params);
    const items = extractItems(result);
    recordReverseShape(items);
    for (const item of items) {
      const name = readPlaceName(item);
      if (name) return rememberPlace(key, { name, latitude: lat, longitude: lng });
    }
    return rememberPlace(key, null);
  } catch (error) {
    if (error instanceof OrthogonalError) return null;
    return null;
  }
};

/** What the catalog picked, for diagnostics. */
export const geocodeEndpointsInUse = () => ({
  forward: endpointCache.forward
    ? { api: endpointCache.forward.api, path: endpointCache.forward.path, priceCents: endpointCache.forward.priceCents }
    : null,
  reverse: endpointCache.reverse
    ? { api: endpointCache.reverse.api, path: endpointCache.reverse.path, priceCents: endpointCache.reverse.priceCents }
    : null,
});
