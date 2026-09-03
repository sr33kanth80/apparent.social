// Jobs Map search endpoint. Thin entry; logic lives in server/jobs-search.js.
//
// Public and unauthenticated (the map is a marketing surface), which is exactly
// why the handler rate-limits per IP, reads cache before spending, and runs
// under its own Orthogonal budget cap.

import jobsSearchHandler from '../server/jobs-search.js';
import { geocodePlace } from '../server/geocode.js';

export default async function handler(req, res) {
  // Geocoding is a live catalog lookup, memoised per place, replacing a
  // hand-written table of ~400 coordinates.
  return jobsSearchHandler(req, res, { geocode: geocodePlace });
}
