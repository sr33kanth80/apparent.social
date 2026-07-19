const DEFAULT_BASE_URL = 'https://api.orthogonal.com';

const positiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const nonNegativeInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelay = (response, attempt, baseDelayMs) => {
  const retryAfter = response?.headers?.get?.('retry-after');
  const retryAfterSeconds = retryAfter == null || String(retryAfter).trim() === ''
    ? Number.NaN
    : Number(retryAfter);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(retryAfterSeconds * 1000, 5_000);
  }
  const retryAfterDate = Date.parse(String(retryAfter ?? ''));
  if (Number.isFinite(retryAfterDate)) {
    return Math.min(Math.max(retryAfterDate - Date.now(), 0), 5_000);
  }
  return Math.min(baseDelayMs * (2 ** attempt), 5_000);
};

const compactText = (value, max = 500) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export class OrthogonalError extends Error {
  constructor(message, { status = 500, code = 'orthogonal_error', retryable = false, details } = {}) {
    super(message);
    this.name = 'OrthogonalError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
  }
}

export const createOrthogonalSession = ({
  apiKey = process.env.ORTHOGONAL_API_KEY,
  baseUrl = process.env.ORTHOGONAL_BASE_URL || DEFAULT_BASE_URL,
  fetchImpl = globalThis.fetch,
  maxCalls = positiveInt(process.env.ORTHOGONAL_AGENT_MAX_CALLS, 20),
  maxSpendCents = positiveInt(process.env.ORTHOGONAL_AGENT_MAX_SPEND_CENTS, 100),
  dynamicPriceEstimateCents = positiveInt(process.env.ORTHOGONAL_DYNAMIC_PRICE_ESTIMATE_CENTS, 10),
  dynamicPricingEndpoints = [],
  timeoutMs = positiveInt(process.env.ORTHOGONAL_TIMEOUT_MS, 90_000),
  maxRetries = nonNegativeInt(process.env.ORTHOGONAL_MAX_RETRIES, 1),
  retryBaseDelayMs = positiveInt(process.env.ORTHOGONAL_RETRY_BASE_DELAY_MS, 300),
  allowedApis = [],
} = {}) => {
  if (!apiKey) {
    throw new OrthogonalError('ORTHOGONAL_API_KEY is not configured.', {
      status: 503,
      code: 'orthogonal_not_configured',
    });
  }
  if (typeof fetchImpl !== 'function') {
    throw new TypeError('A fetch implementation is required.');
  }

  const allowed = new Set(allowedApis.map((value) => String(value).trim().toLowerCase()).filter(Boolean));
  const dynamicPricingAllowed = new Set(dynamicPricingEndpoints.map(({ api, path }) => {
    const normalizedApi = String(api ?? '').trim().toLowerCase();
    const normalizedPath = String(path ?? '').trim();
    return normalizedApi && normalizedPath.startsWith('/') ? `${normalizedApi}:${normalizedPath}` : '';
  }).filter(Boolean));
  let callCount = 0;
  let spentCents = 0;
  const detailsCache = new Map();
  const runCache = new Map();
  const discoveredEndpoints = new Set();

  const request = async (path, body, { paid = false, estimatedCostCents = 0 } = {}) => {
    const idempotencyKey = globalThis.crypto?.randomUUID?.() || `orth_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      if (callCount >= maxCalls) {
        throw new OrthogonalError(`Orthogonal call limit reached (${maxCalls}).`, {
          status: 429,
          code: 'orthogonal_call_limit',
        });
      }
      if (paid && spentCents + estimatedCostCents > maxSpendCents) {
        throw new OrthogonalError(`Orthogonal request budget would be exceeded (${maxSpendCents} cents).`, {
          status: 402,
          code: 'orthogonal_budget_reached',
        });
      }

      callCount += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(`${String(baseUrl).replace(/\/$/, '')}${path}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (error) {
        const timedOut = error?.name === 'AbortError';
        if (attempt < maxRetries) {
          await wait(retryDelay(null, attempt, retryBaseDelayMs));
          continue;
        }
        throw new OrthogonalError(timedOut ? 'Orthogonal request timed out.' : 'Orthogonal request failed.', {
          status: timedOut ? 504 : 502,
          code: timedOut ? 'orthogonal_timeout' : 'orthogonal_network_error',
          retryable: true,
          details: { message: compactText(error?.message), attempts: attempt + 1 },
        });
      } finally {
        clearTimeout(timer);
      }

      const rawPayload = await response.text().catch(() => '');
      let payload;
      try {
        payload = rawPayload ? JSON.parse(rawPayload) : {};
      } catch {
        payload = { error: compactText(rawPayload) };
      }

      const status = response.status || 502;
      const retryable = status === 408 || status === 429 || status >= 500;
      if ((!response.ok || payload?.success === false) && retryable && attempt < maxRetries) {
        await wait(retryDelay(response, attempt, retryBaseDelayMs));
        continue;
      }

      const reportedPrice = payload?.priceCents ?? payload?.usage?.priceCents;
      const parsedReportedPrice = Number(reportedPrice);
      const priceCents = reportedPrice == null || !Number.isFinite(parsedReportedPrice)
        ? estimatedCostCents
        : Math.max(parsedReportedPrice, 0);
      if (paid && priceCents > 0) spentCents += priceCents;

      if (!response.ok || payload?.success === false) {
        throw new OrthogonalError(compactText(payload?.error || payload?.message || `Orthogonal returned ${status}.`), {
          status,
          code: status === 402 ? 'orthogonal_insufficient_credits' : status === 429 ? 'orthogonal_rate_limited' : 'orthogonal_upstream_error',
          retryable,
          details: { requestId: payload?.requestId, priceCents, attempts: attempt + 1 },
        });
      }

      return payload;
    }

    throw new OrthogonalError('Orthogonal request failed.', {
      status: 502,
      code: 'orthogonal_upstream_error',
      retryable: true,
    });
  };

  const normalizeEndpoint = (api, path) => {
    const normalized = String(api ?? '').trim().toLowerCase();
    if (!normalized) throw new OrthogonalError('Orthogonal API slug is required.', { status: 400, code: 'invalid_api' });
    const normalizedPath = String(path ?? '').trim();
    if (!normalizedPath.startsWith('/')) {
      throw new OrthogonalError('Orthogonal endpoint path must start with /.', { status: 400, code: 'invalid_path' });
    }
    return { api: normalized, path: normalizedPath, key: `${normalized}:${normalizedPath}` };
  };

  const assertAllowed = (api, path) => {
    const endpoint = normalizeEndpoint(api, path);
    if (allowed.size > 0 && !allowed.has(endpoint.api) && !discoveredEndpoints.has(endpoint.key)) {
      throw new OrthogonalError(`Orthogonal endpoint '${endpoint.api}${endpoint.path}' is not allowlisted or catalog-discovered.`, {
        status: 403,
        code: 'orthogonal_api_not_allowed',
      });
    }
    return endpoint;
  };

  const rememberDiscoveredEndpoints = (payload) => {
    const data = payload?.data ?? payload;
    const results = Array.isArray(data) ? data : data?.results ?? data?.apis ?? data?.endpoints ?? [];
    for (const item of Array.isArray(results) ? results.slice(0, 30) : []) {
      const api = String(item?.slug ?? item?.api ?? item?.provider ?? '').trim().toLowerCase();
      const endpoints = Array.isArray(item?.endpoints) ? item.endpoints : [item];
      for (const endpoint of endpoints.slice(0, 30)) {
        const path = String(endpoint?.path ?? endpoint?.endpoint ?? '').trim();
        if (api && path.startsWith('/')) discoveredEndpoints.add(`${api}:${path}`);
      }
    }
  };

  return {
    async search(prompt, limit = 8) {
      const result = await request('/v1/search', { prompt: compactText(prompt, 1000), limit: Math.min(Math.max(Number(limit) || 8, 1), 20) });
      rememberDiscoveredEndpoints(result);
      return result;
    },

    async details({ api, path }) {
      const endpoint = assertAllowed(api, path);
      const detailsKey = endpoint.key;
      let details = detailsCache.get(detailsKey);
      if (!details) {
        details = await request('/v1/details', { api: endpoint.api, path: endpoint.path });
        detailsCache.set(detailsKey, details);
      }
      return details;
    },

    isDiscovered({ api, path }) {
      try {
        return discoveredEndpoints.has(normalizeEndpoint(api, path).key);
      } catch {
        return false;
      }
    },

    async run({ api, path, body = {}, query = {} }) {
      const endpoint = assertAllowed(api, path);
      const normalizedApi = endpoint.api;
      const normalizedPath = endpoint.path;
      const runKey = JSON.stringify({ api: normalizedApi, path: normalizedPath, body, query });
      if (runCache.has(runKey)) return runCache.get(runKey);

      const detailsKey = endpoint.key;
      let details = detailsCache.get(detailsKey);
      if (!details) {
        details = await request('/v1/details', { api: normalizedApi, path: normalizedPath });
        detailsCache.set(detailsKey, details);
      }
      const endpointDetails = details?.endpoint ?? details?.data?.endpoint;
      const priceUsd = Number(endpointDetails?.price);
      const usesDynamicPricing = endpointDetails?.hasDynamicPricing === true || !Number.isFinite(priceUsd) || priceUsd < 0;
      const dynamicPricingKey = `${normalizedApi}:${normalizedPath}`;
      if (usesDynamicPricing && !dynamicPricingAllowed.has(dynamicPricingKey)) {
        throw new OrthogonalError(`Orthogonal endpoint '${normalizedApi}${normalizedPath}' does not publish a fixed price, so Apparent will not execute it automatically.`, {
          status: 402,
          code: 'orthogonal_unbounded_price',
        });
      }
      // Usage-priced inference cannot publish an exact pre-call price. Reserve a
      // conservative amount against the session budget, then replace it with the
      // authoritative priceCents Orthogonal includes in the run response.
      const estimatedCostCents = usesDynamicPricing ? dynamicPriceEstimateCents : priceUsd * 100;
      const result = await request(
        '/v1/run',
        { api: normalizedApi, path: normalizedPath, body, query },
        { paid: true, estimatedCostCents },
      );
      runCache.set(runKey, result);
      return result;
    },

    usage() {
      return { callCount, spentCents, maxCalls, maxSpendCents };
    },
  };
};

export const orthogonalData = (response) => {
  let value = response?.data ?? response;
  // Some gateway providers preserve their own `{ data: ... }` envelope.
  if (value && !value.choices && value.data?.choices) value = value.data;
  return value;
};
