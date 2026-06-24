import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Mutual Funds Page — API definitions
//
//  Confirmed source_ids:
//    source_id 22  — AMFI Mutual Fund statistics   date_attr_type 3
//    source_id 47  — AMFI MF AUM by scheme type    date_attr_type 3
//
//  source 22  metric_id 109:
//    dimension_type_id 43
//    dimension_id 33960 — Assets at End of Period (total AUM)
//    dimension_id 33965 — Grand Total AUM (incl. EPFO)  [used in WealthMgmt too]
//    dimension_id 33953 — Gross Mobilisation — Total
//    dimension_id 33952 — Gross Mobilisation — Public Sector
//    dimension_id 33951 — Gross Mobilisation — Private Sector
//    dimension_id 33958 — Net Inflow/Outflow — Public Sector
//    dimension_id 33957 — Net Inflow/Outflow — Private Sector
//    dimension_id 33959 — Net Inflow/Outflow — Total
//    dimension_id 33955 — Redemption/Repurchase — Public Sector
//    dimension_id 33954 — Redemption/Repurchase — Private Sector
//    dimension_id 33956 — Redemption/Repurchase — Total
//
//  source 47:
//    metric_id 172 — net inflow/outflow by scheme type
//    metric_id 173 — AUM by scheme type
//    dimension_type_id 64
//    dimension_id 34482 — Total (net inflow)
//    dimension_id 34454 — Equity-type schemes AUM
//    dimension_id 34442 — Debt-type schemes AUM
// ─────────────────────────────────────────────────────────────────────────────

// ── AMFI Aggregate — generic helper ─────────────────────────────────────────
//   source_id 22 · metric_id 109 · date_attr 3 · dim_type 43 · monthly
const _amfi22 = (dimension_id) =>
  analyticsAggregate({
    source_id: 22, date_attribute_type_id: 3,
    metric_id: 109, dimension_type_id: 43, dimension_id,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── SIP Contribution — monthly amount ────────────────────────────────────────
//   source_id 55 · metric_id 194 (sip_contribution_rs_cr) · dim_type 78 · dim_id 34807
export const fetchMfSipContribution = () =>
  analyticsAggregate({
    source_id: 55, date_attribute_type_id: 12,
    metric_id: 194, dimension_type_id: 78, dimension_id: 34807,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── AUM Trend — Assets at End of Period ─────────────────────────────────────
//   dimension_id 33960 — total AUM (₹ Crore)
export const fetchMfAumTrend = () => _amfi22(33960);

// ── Gross Mobilisation — Total ───────────────────────────────────────────────
//   dimension_id 33953
export const fetchMfGrossMobTotal = () => _amfi22(33953);

// ── Gross Mobilisation — Public Sector ──────────────────────────────────────
//   dimension_id 33952
export const fetchMfGrossMobPublic = () => _amfi22(33952);

// ── Gross Mobilisation — Private Sector ─────────────────────────────────────
//   dimension_id 33951
export const fetchMfGrossMobPrivate = () => _amfi22(33951);

// ── Net Inflow/Outflow — Total ────────────────────────────────────────────────
//   source_id 47 · metric_id 172 · dim_type 64 · dim_id 34482
export const fetchMfNetInflowTotal = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 172, dimension_type_id: 64, dimension_id: 34482,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Equity Scheme AUM ────────────────────────────────────────────────────────
//   source_id 47 · metric_id 173 · dim_type 64 · dim_id 34454
export const fetchMfEquityAum = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 173, dimension_type_id: 64, dimension_id: 34454,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Equity Scheme Net Flows (inflow / outflow) ────────────────────────────────
//   source_id 47 · metric_id 172 · dim_id 34454 · Growth/Equity Oriented Schemes
export const fetchMfEquityFlows = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 172, dimension_id: 34454,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Hybrid Scheme Net Flows (inflow / outflow) ────────────────────────────────
//   source_id 47 · metric_id 172 · dim_id 34461 · Hybrid Schemes
export const fetchMfHybridFlows = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 172, dimension_id: 34461,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Index Funds Net Flows (inflow / outflow) ──────────────────────────────────
//   source_id 47 · metric_id 172 · dim_id 34465 · Index Funds
export const fetchMfIndexFlows = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 172, dimension_id: 34465,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── ETFs ex-Gold Net Flows (inflow / outflow) ─────────────────────────────────
//   source_id 47 · metric_id 172 · dim_id 34467 · Other ETFs
export const fetchMfEtfExGoldFlows = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 172, dimension_id: 34467,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Gold ETF Net Flows (inflow / outflow) ─────────────────────────────────────
//   source_id 47 · metric_id 172 · dim_id 34466 · GOLD ETF
export const fetchMfGoldEtfFlows = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 172, dimension_id: 34466,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Top 10 Scheme Types by AUM — latest month per scheme dim ─────────────────
//   source_id 47 · metric_id 173 · one call per dim, limit 1
//   Each result sorted desc by AUM; top 10 shown in horizontal bar chart
const TOP10_SCHEME_DIMS = [
  { id: 34467, name: 'Other ETFs' },
  { id: 34427, name: 'Liquid Fund' },
  { id: 34451, name: 'Sectoral/Thematic Funds' },
  { id: 34453, name: 'Flexi Cap Fund' },
  { id: 34446, name: 'Mid Cap Fund' },
  { id: 34444, name: 'Large Cap Fund' },
  { id: 34447, name: 'Small Cap Fund' },
  { id: 34445, name: 'Large & Mid Cap Fund' },
  { id: 34465, name: 'Index Funds' },
];
export const fetchMfTop10SchemeAum = () =>
  Promise.all(
    TOP10_SCHEME_DIMS.map(d =>
      analyticsAggregate({
        source_id: 47, date_attribute_type_id: 3,
        metric_id: 173, dimension_id: d.id,
        granularity: 'month', aggregation: 'sum', limit: 1,
      }).then(raw => ({ ...d, raw }))
    )
  );

// ── Net Inflows by Scheme Type — individual scheme dims (no totals/subtotals) ─
//   source_id 47 · metric_id 172 · single call with all dim_ids · limit: latest month
//   Excludes aggregate dims: 34442,34454,34461,34464,34469,34470,34475,34478,
//                            34479,34480,34481,34482,34484,34485,34486,34487,34488,34500
export const NET_INFLOW_DIMS = [
  { id: 34427, name: 'Liquid Fund' },
  { id: 34430, name: 'Money Market Fund' },
  { id: 34428, name: 'Ultra Short Duration Fund' },
  { id: 34426, name: 'Overnight Fund' },
  { id: 34467, name: 'Other ETFs' },
  { id: 34459, name: 'Arbitrage Fund' },
  { id: 34429, name: 'Low Duration Fund' },
  { id: 34453, name: 'Flexi Cap Fund' },
  { id: 34431, name: 'Short Duration Fund' },
  { id: 34447, name: 'Small Cap Fund' },
  { id: 34436, name: 'Corporate Bond Fund' },
  { id: 34446, name: 'Mid Cap Fund' },
];
// One call per dimension so each response is {period, value} for that specific scheme
export const fetchMfNetInflowsByScheme = () =>
  Promise.all(
    NET_INFLOW_DIMS.map(d =>
      analyticsAggregate({
        source_id: 47, date_attribute_type_id: 3,
        metric_id: 172, dimension_id: d.id,
        granularity: 'month', aggregation: 'sum', limit: 2,
      }).then(raw => ({ ...d, raw })).catch(() => ({ ...d, raw: [] }))
    )
  );

// ── Legacy MF Summary Archive — all rows for 4 legacy scheme-type dims ────────
//   source_id 47 · metric_id 173 · four parallel calls (full history)
//   dim 34470 — Total A Open-ended · 34478 — Total B Close-ended
//   dim 34481 — Total C Interval   · 34500 — Total (A+B+C+D+E)
const LEGACY_DIMS = [
  { id: 34470, name: 'Open-ended'  },
  { id: 34478, name: 'Close-ended' },
  { id: 34481, name: 'Interval'    },
  { id: 34500, name: 'Total'       },
];
export const fetchMfLegacyArchive = () =>
  Promise.all(
    LEGACY_DIMS.map(d =>
      analyticsAggregate({
        source_id: 47, date_attribute_type_id: 3,
        metric_id: 173, dimension_id: d.id,
        granularity: 'financial_year', aggregation: 'sum', limit: 100,
      }).then(raw => ({ ...d, raw }))
    )
  );

// ── MF AUM Composition — monthly Equity / Debt / Hybrid AUM trend ────────────
//   source_id 47 · metric_id 173 · three parallel calls
//   dim_id 34454 — Equity · 34442 — Debt · 34461 — Hybrid
export const fetchMfAumComposition = () =>
  Promise.all([
    analyticsAggregate({ source_id: 47, date_attribute_type_id: 3, metric_id: 173, dimension_id: 34454, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 47, date_attribute_type_id: 3, metric_id: 173, dimension_id: 34442, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 47, date_attribute_type_id: 3, metric_id: 173, dimension_id: 34461, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── AUM by Scheme Category — latest month per segment (for donut chart) ───────
//   source_id 47 · metric_id 173 · one call per dimension, limit 1 = latest month
//   dim_id 34454 — Equity  · 34461 — Hybrid  · 34442 — Debt
//   dim_id 34464 — Solution · 34469 — Other
const AUM_CATEGORY_DIMS = [
  { id: 34454, name: 'Equity',   color: '#6366f1' },
  { id: 34461, name: 'Hybrid',   color: '#f97316' },
  { id: 34442, name: 'Debt',     color: '#10b981' },
  { id: 34464, name: 'Solution', color: '#a855f7' },
  { id: 34469, name: 'Other',    color: '#38bdf8' },
];
export const fetchMfAumByCategory = () =>
  Promise.all(
    AUM_CATEGORY_DIMS.map(d =>
      analyticsAggregate({
        source_id: 47, date_attribute_type_id: 3,
        metric_id: 173, dimension_id: d.id,
        granularity: 'month', aggregation: 'sum', limit: 1,
      }).then(raw => ({ ...d, raw }))
    )
  );

// ── Debt Scheme AUM ──────────────────────────────────────────────────────────
//   source_id 47 · metric_id 173 · dim_type 64 · dim_id 34442
export const fetchMfDebtAum = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 173, dimension_type_id: 64, dimension_id: 34442,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Latest Month Table — all 10 metrics ──────────────────────────────────────
//   source_id 22 · metric_id 109 · dim_type 43 · monthly
//   dimension_id param selects the metric row
export const fetchMfMetricById = (dimension_id) => _amfi22(dimension_id);
