
// const BASE_URL = "https://bondanalytics-api.bondbulls.in";

const BASE_URL = "https://bondanalytics-api.bondbulls.in"

const header = {
  accept: "application/json",
};

// get data sources with pagination
export const getDataSources = async (skip = 0, limit = 20) => {
  try {
    const response = await fetch(
      `${BASE_URL}/data-sources/?skip=${skip}&limit=${limit}`,
      {
        method: "GET",
        headers: header,
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching data sources:", error);
    return [];
  }
};

// get url linked to source
export const getDataSourceUrls = async (sourceId) => {
  const response = await fetch(
    `${BASE_URL}/data-source-urls/by-source/${sourceId}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
    }
  );
  return await response.json();
};

// get dimension type linked to source
export const getDataSourceDimensionTypes = async (sourceId) => {
  const response = await fetch(
    `${BASE_URL}/sources/${sourceId}/dimension-types`,
    {
      method: "GET",
      headers: { accept: "application/json" },
    }
  );
  return await response.json();
};

/**
 * Fetch a single page of dimensions for a given dimension_type_id.
 * Use getAllDimensions() when you need the complete list.
 */
export const getDimensions = async (dimension_type_id,is_active = true, skip = 0, limit = 100) => {
  const response = await fetch(
    `${BASE_URL}/dimensions/?dimension_type_id=${dimension_type_id}&skip=${skip}&limit=${limit}&is_active=${is_active}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
    }
  );
  return await response.json();
};

/**
 * Fetch ALL dimensions for a dimension_type_id by auto-paginating until
 * the API returns fewer rows than the page size (exhaustion strategy).
 *
 * @param {number} dimension_type_id
 * @param {number} [pageSize=200]  - rows per internal request
 * @returns {Promise<Array>}
 */


export const getAllDimensions = async (dimension_type_id, pageSize = 200) => {
  const all = [];
  let skip = 0;

  while (true) {
    let page;
    try {
      page = await getDimensions(dimension_type_id, true, skip, pageSize);
    } catch {
      break;
    }

    if (!Array.isArray(page) || page.length === 0) break;

    all.push(...page);

    // Fewer rows than requested => we've exhausted the dataset
    if (page.length < pageSize) break;

    skip += pageSize;
  }

  return all;
};

export const getDataSourceMetrics = async (sourceId) => {
  const response = await fetch(
    `${BASE_URL}/data_source_metrics/source/${sourceId}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
    }
  );
  return await response.json();
};

// get date attributes linked to source
export const getDataSourceDates = async (sourceId) => {
  const response = await fetch(
    `${BASE_URL}/data-source-date-attribute-types/source/${sourceId}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
    }
  );
  return await response.json();
};

// get details of a single date attribute type
export const getDateAttributeTypes = async (date_attribute_type_id) => {
  const response = await fetch(
    `${BASE_URL}/date-attribute-types/${date_attribute_type_id}`,
    {
      method: "GET",
      headers: { accept: "application/json" },
    }
  );
  return await response.json();
};

// Fetch the available date range (first & last period) for a source
export const getDataSourceDateRange = async ({ source_id, date_attribute_type_id, metric_id, granularity = 'financial_year' }) => {
  const qp = new URLSearchParams({ source_id, date_attribute_type_id, granularity, aggregation: 'sum', skip: 0, limit: 500 });
  if (metric_id != null) qp.set('metric_id', metric_id);
  const response = await fetch(`${BASE_URL}/analytics/aggregate?${qp.toString()}`, { method: 'GET', headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Date range API error: ${response.status}`);
  const rows = await response.json();
  const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
  if (!list.length) return { start: null, end: null };
  return { start: list[0]?.period, end: list[list.length - 1]?.period };
};

// After — dimension_id is now an array of integers
export const analyticsAggregate = async ({
  source_id,
  date_attribute_type_id,
  aggregation = "sum",
  granularity = "month",
  metric_id,
  dimension_id,          // now: number[] | undefined
  dimension_type_id,
  start_date,
  end_date,
  skip = 0,
  limit = 100,
}) => {
  const qp = new URLSearchParams({
    source_id,
    date_attribute_type_id,
    aggregation,
    granularity,
    skip,
    limit,
  });

  if (metric_id         != null) qp.set("metric_id",         metric_id);
  if (dimension_type_id != null) qp.set("dimension_type_id", dimension_type_id);
  if (start_date)                qp.set("start_date",         start_date);
  if (end_date)                  qp.set("end_date",           end_date);

  // Append one ?dimension_id=N per selected ID
  if (Array.isArray(dimension_id)) {
    dimension_id.forEach((id) => qp.append("dimension_id", id));
  } else if (dimension_id != null) {
    qp.append("dimension_id", dimension_id);
  }

  const response = await fetch(
    `${BASE_URL}/analytics/aggregate?${qp.toString()}`,
    { method: "GET", headers: { accept: "application/json" } }
  );

  if (!response.ok) throw new Error(`Analytics API error: ${response.status}`);
  return await response.json();
};

// get market composition (G-Secs / SDLs / Corp Bonds)
export const getMarketComposition = async (fy = '2025-26') => {
  const response = await fetch(
    `https://bondanalytics-api.bondbulls.in/analytics/market-composition?financial_year=${encodeURIComponent(fy)}`,
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`Market composition API error: ${response.status}`);
  return await response.json();
};

// get Corp Bond outstanding by issuer type
export const getCorpBondOutstandingByIssuer = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/corp-bond/outstanding-by-issuer',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`Corp bond outstanding by issuer API error: ${response.status}`);
  return await response.json();
};

// get Corp Bond trading trend
export const getCorpBondTradingTrend = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/corp-bond/trading-trend',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`Corp bond trading trend API error: ${response.status}`);
  return await response.json();
};

// get Private Placement yearly trend
export const getPrivatePlacementTrend = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/private-placement/yearly-trend',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`Private placement trend API error: ${response.status}`);
  return await response.json();
};

// get G-Sec maturity profile by residual bucket
export const getGsecMaturityProfile = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/gsec/maturity-profile',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`G-Sec maturity API error: ${response.status}`);
  return await response.json();
};

// get SDL archive QA signals (parser quality diagnostics)
export const getSdlQaSignals = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/sdl-archive/qa-signals',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`SDL QA signals API error: ${response.status}`);
  return await response.json();
};

// get SDL instrument family composition snapshot
export const getSdlInstrumentComposition = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/sdl-archive/instrument-composition',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`SDL instrument composition API error: ${response.status}`);
  return await response.json();
};

// get SDL weighted coupon trend (outstanding-weighted printed coupon per year)
export const getSdlWeightedCouponTrend = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/sdl-archive/weighted-coupon-trend',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`SDL weighted coupon trend API error: ${response.status}`);
  return await response.json();
};

// get SDL coupon stack distribution (bar + share line per coupon bucket)
export const getSdlCouponStack = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/sdl-archive/coupon-stack',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`SDL coupon stack API error: ${response.status}`);
  return await response.json();
};

// get SDL annual archive trend (outstanding + top5 share + YoY growth per year)
export const getSdlAnnualArchive = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/sdl-archive/annual-trend',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`SDL annual archive API error: ${response.status}`);
  return await response.json();
};

// get SDL maturity profile by residual bucket
export const getSdlMaturityProfile = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/sdl/maturity-profile',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`SDL maturity API error: ${response.status}`);
  return await response.json();
};

// get G-Sec STRIPS maturity profile by residual bucket
export const getStripsMaturityProfile = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/gsec/strips/maturity-profile',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`STRIPS maturity API error: ${response.status}`);
  return await response.json();
};

// get NCD public issues yearly trend
export const getNcdPublicIssuesTrend = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/ncd/public-issues-trend',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`NCD public issues trend API error: ${response.status}`);
  return await response.json();
};

// get Corp Bond legacy issuer split (Financial vs Non-Financial, quarterly)
export const getCorpBondLegacyIssuerSplit = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/corp-bond/legacy-issuer-split',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`Corp bond legacy issuer split API error: ${response.status}`);
  return await response.json();
};

// get Corp Bond current issuer split (multi-category, monthly from Apr 2024)
export const getCorpBondCurrentIssuerSplit = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/corp-bond/current-issuer-split',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`Corp bond current issuer split API error: ${response.status}`);
  return await response.json();
};

// get state-wise SDL outstanding share
export const getStateOutstandingShare = async () => {
  const response = await fetch(
    'https://bondanalytics-api.bondbulls.in/analytics/state-outstanding-share',
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`State outstanding API error: ${response.status}`);
  return await response.json();
};

// get raw analytics rows — includes metric_text for records where metric_value is null
export const getAnalyticsData = async ({ source_id, dimension_id, metric_id, skip = 0, limit = 100 }) => {
  const qp = new URLSearchParams();
  if (source_id   != null) qp.set('source_id',   source_id);
  if (dimension_id != null) qp.set('dimension_id', dimension_id);
  if (metric_id   != null) qp.set('metric_id',   metric_id);
  qp.set('skip', skip);
  qp.set('limit', limit);
  const response = await fetch(
    `${BASE_URL}/analytics_data/?${qp.toString()}`,
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`Analytics data API error: ${response.status}`);
  return await response.json();
};

// get snapshot data — latest values per dimension
export const getSnapshotData = async ({ source_id, date_attribute_type_id, dimension_type_id, metric_id }) => {
  const qp = new URLSearchParams();
  if (source_id            != null) qp.set('source_id',             source_id);
  if (date_attribute_type_id != null) qp.set('date_attribute_type_id', date_attribute_type_id);
  if (dimension_type_id    != null) qp.set('dimension_type_id',     dimension_type_id);
  if (metric_id            != null) qp.set('metric_id',             metric_id);
  const response = await fetch(
    `${BASE_URL}/analytics/snapshot-data?${qp.toString()}`,
    { method: 'GET', headers: { accept: 'application/json' } }
  );
  if (!response.ok) throw new Error(`Snapshot API error: ${response.status}`);
  return await response.json();
};