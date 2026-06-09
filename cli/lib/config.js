'use strict';

// Where the CLI uploads the approved build payload. Override with
// APPARENT_BASE_URL when testing against a preview/local deployment.
// NOTE: must point at the live Apparent deployment that serves /api/cli-ingest.
module.exports = {
  BASE_URL: (process.env.APPARENT_BASE_URL || 'https://apparent.social').replace(/\/$/, ''),
};
