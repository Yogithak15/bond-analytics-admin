import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Wealth Management Page — API definitions
//
//  Confirmed source_ids:
//    source_id 23  — SEBI Portfolio Managers data   date_attr_type 3
//
//  metric_id 111 — number of PM clients
//  metric_id 112 — PM AUM (₹ Crore)
//  dimension_type_id 44
//    dimension_id 33961 — Discretionary PM AUM / client count
//    dimension_id 33965 — Grand Total AUM (incl. EPFO/PF)
// ─────────────────────────────────────────────────────────────────────────────

// ── PM Grand Total AUM ───────────────────────────────────────────────────────
//   source_id 46 · metric_id 109 · date_attr 3 · dim_type 66 · dim_id 34425
//   dimension_name: "Grand Total" — consolidated global AUM under portfolio managers
export const fetchPmTotalAum = () =>
  analyticsAggregate({
    source_id: 46, date_attribute_type_id: 3,
    metric_id: 178, dimension_type_id: 66, dimension_id: 34425,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── PM Discretionary AUM ─────────────────────────────────────────────────────
//   source_id 46 · metric_id 109 · date_attr 3 · dim_type 66 · dim_id 34417
export const fetchPmDiscretionaryAum = () =>
  analyticsAggregate({
    source_id: 46, date_attribute_type_id: 3,
    metric_id: 178, dimension_type_id: 66, dimension_id: 34417,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── AUM by Asset Class — one call per class, dims summed by API ──────────────
//   source_id 46 · metric_id 178 · dim_type 66 · 12 parallel calls
const ASSET_CLASS_GROUPS = [
  { name: 'Plain Debt Listed',       color: '#10b981', dims: [34381, 34382, 34383, 34384] },
  { name: 'EPFO/PF',                 color: '#f59e0b', dims: [34421, 34422, 34808, 34809] },
  { name: 'Non EPFO/PF',             color: '#f59e0b', dims: [34423, 34424, 34810, 34811] },
  { name: 'Listed Equity',           color: '#3b82f6', dims: [34375, 34376, 34377, 34378] },
  { name: 'Mutual Funds',            color: '#8b5cf6', dims: [34409, 34410, 34411, 34412] },
  { name: 'Plain Debt Unlisted',     color: '#06b6d4', dims: [34385, 34386, 34387, 34388] },
  { name: 'Others',                  color: '#94a3b8', dims: [34413, 34414, 34415, 34416] },
  { name: 'Structured Debt Listed',  color: '#f97316', dims: [34389, 34390, 34391, 34392] },
  { name: 'Unlisted Equity',         color: '#6366f1', dims: [34378, 34379, 34380, 34812] },
  { name: 'Derivatives- Equity',     color: '#ec4899', dims: [34397, 34398, 34399, 34400] },
  { name: 'Structured Debt Unlisted',color: '#84cc16', dims: [34393, 34394, 34395, 34396] },
  { name: 'Derivatives- Others',     color: '#ef4444', dims: [34405, 34406, 34407, 34408] },
];
export const fetchPmsAssetClassAum = () =>
  Promise.all(
    ASSET_CLASS_GROUPS.map(g =>
      analyticsAggregate({
        source_id: 46, date_attribute_type_id: 3,
        metric_id: 178, dimension_type_id: 66,
        dimension_id: g.dims,
        granularity: 'month', aggregation: 'sum', limit: 2,
      }).then(raw => ({ ...g, raw })).catch(() => ({ ...g, raw: [] }))
    )
  );

// ── Custodian AUC — FPI vs FDI trend (dual series) ───────────────────────────
//   source_id 20 · metric_id 98 · dim_type 40
//   dim 33925 — FPIs · dim 33927 — FDI
export const fetchCustAucTrend = () =>
  Promise.all([
    analyticsAggregate({ source_id: 20, date_attribute_type_id: 3, metric_id: 98, dimension_type_id: 40, dimension_id: 33925, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 20, date_attribute_type_id: 3, metric_id: 98, dimension_type_id: 40, dimension_id: 33927, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Foreign VC Sectoral Allocation — latest value per sector ─────────────────
//   source_id 26 · metric_id 131 · dim_type 46 · one call per sector
//   "Total" (33991) excluded — it's the aggregate row
const VC_SECTOR_DIMS = [
  { id: 33983, name: 'Information Technology' },
  { id: 33984, name: 'Telecommunications' },
  { id: 33985, name: 'Pharmaceuticals' },
  { id: 33986, name: 'Biotechnology' },
  { id: 33987, name: 'Media/Entertainment' },
  { id: 33988, name: 'Services Sector' },
  { id: 33989, name: 'Industrial Products' },
  { id: 33990, name: 'Others' },
];
export const fetchVcSectorAlloc = () =>
  Promise.all(
    VC_SECTOR_DIMS.map(d =>
      analyticsAggregate({
        source_id: 26, date_attribute_type_id: 3,
        metric_id: 131, dimension_type_id: 46, dimension_id: d.id,
        granularity: 'month', aggregation: 'sum', limit: 24,
      }).then(raw => ({ ...d, raw })).catch(() => ({ ...d, raw: [] }))
    )
  );

// ── PMS Service Mix — latest AUM per service type ────────────────────────────
//   source_id 46 · metric_id 178 · dim_type 66
//   34417 Discretionary · 34418 Non-Discretionary · 34420 Advisory
const SVC_MIX_DIMS = [
  { id: 34417, name: 'Discretionary',     color: '#10b981' },
  { id: 34418, name: 'Non-discretionary', color: '#3b82f6' },
  { id: 34420, name: 'Advisory',          color: '#f97316' },
];
export const fetchPmsSvcMix = () =>
  Promise.all(
    SVC_MIX_DIMS.map(d =>
      analyticsAggregate({
        source_id: 46, date_attribute_type_id: 3,
        metric_id: 178, dimension_type_id: 66, dimension_id: d.id,
        granularity: 'month', aggregation: 'sum', limit: 2,
      }).then(raw => ({ ...d, raw })).catch(() => ({ ...d, raw: [] }))
    )
  );

// ── PMS Summary Cross-Check — Total AUM trend (full series) ──────────────────
//   source_id 46 · metric_id 178 · dim_id 34425 · "Grand Total" AUM
export const fetchPmsTotalAumTrend = () =>
  analyticsAggregate({
    source_id: 46, date_attribute_type_id: 3,
    metric_id: 178, dimension_type_id: 66, dimension_id: 34425,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── PMS Summary Cross-Check — Total Clients trend (sum of 4 dims) ─────────────
//   source_id 46 · metric_id 178 · dims 34370+34371+34372+34373
export const fetchPmsTotalClientsTrend = async () => {
  const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
  const results = await Promise.all(
    [34370, 34371, 34372, 34373].map(dim_id =>
      analyticsAggregate({
        source_id: 46, date_attribute_type_id: 3,
        metric_id: 178, dimension_type_id: 66, dimension_id: dim_id,
        granularity: 'month', aggregation: 'sum', limit: 500,
      }).catch(() => [])
    )
  );
  const byPeriod = {};
  results.forEach(raw => {
    toList(raw).forEach(r => {
      const p = r.period ?? '';
      byPeriod[p] = (byPeriod[p] ?? 0) + +(r.value ?? r.metric_value ?? 0);
    });
  });
  return Object.keys(byPeriod).sort().map(period => ({ period, value: byPeriod[period] }));
};

// ── PM Number of Clients — sum of all 4 client-type dims ─────────────────────
//   source_id 46 · metric_id 178 · dim_type 66
//   34370 Discretionary · 34371 Non-Discretionary · 34372 Co-Investment · 34373 Advisory
//   Makes 4 parallel calls and sums per period → returns [{period, value}]
export const fetchPmClientCount = async () => {
  const CLIENT_DIMS = [34370, 34371, 34372, 34373];
  const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
  const results = await Promise.all(
    CLIENT_DIMS.map(dim_id =>
      analyticsAggregate({
        source_id: 46, date_attribute_type_id: 3,
        metric_id: 178, dimension_type_id: 66, dimension_id: dim_id,
        granularity: 'month', aggregation: 'sum', limit: 500,
      }).catch(() => [])
    )
  );
  // Aggregate all dims: sum values per period
  const byPeriod = {};
  results.forEach(raw => {
    toList(raw).forEach(r => {
      const p = r.period ?? '';
      byPeriod[p] = (byPeriod[p] ?? 0) + +(r.value ?? r.metric_value ?? 0);
    });
  });
  return Object.keys(byPeriod).sort().map(period => ({ period, value: byPeriod[period] }));
};
