import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Intermediaries Page — API definitions
//
//  source_id 31 · metric_id 143 · dimension_type_id 51
//  dimension_id 34071 — Alternative Investment Funds (registered count)
// ─────────────────────────────────────────────────────────────────────────────

// ── Alternative Investment Funds — Registered count over time ─────────────────
//   source_id 31 · metric_id 143 · dim_type 51 · dim_id 34071
export const fetchAifRegistered = () =>
  analyticsAggregate({
    source_id: 31, date_attribute_type_id: 3,
    metric_id: 143, dimension_type_id: 51, dimension_id: 34071,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Foreign Portfolio Investors — Registered count over time ──────────────────
//   source_id 31 · metric_id 143 · dim_type 51 · dim_id 34053
export const fetchFpiRegistered = () =>
  analyticsAggregate({
    source_id: 31, date_attribute_type_id: 3,
    metric_id: 143, dimension_type_id: 51, dimension_id: 34053,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Intermediary Trends Custom — all 5 series in parallel ────────────────────
//   source_id 31 · metric_id 143 · dim_type 51
//   AIF 34071 · FPI 34053 · PM 34072 · RA 34075 · MF 34073
export const INTERMEDIARY_DIMS = [
  { key: 'AIF',    name: 'Alternative Investment Funds',       dimension_id: 34071, color: '#8b5cf6' },
  { key: 'FPI',    name: 'Foreign Portfolio Investors',        dimension_id: 34053, color: '#4a90d9' },
  { key: 'PM',     name: 'Portfolio Managers',                 dimension_id: 34072, color: '#26c99a' },
  { key: 'RA',     name: 'Research Analysts',                  dimension_id: 34075, color: '#f0a040' },
  { key: 'MF',     name: 'Mutual Funds',                       dimension_id: 34073, color: '#e05060' },
  { key: 'INVIT', name: 'Infrastructure Investment Trusts', dimension_id: 34076, color: '#06b6d4' },
  { key: 'REIT',  name: 'Real Estate Investment Trusts',    dimension_id: 34077, color: '#26c99a' },
];
// ── Clearing House Funds Pay-in — NSCCL + ICCL annual ────────────────────────
//   NSCCL: source_id 24 · metric_id 126 · dim_type 45 · dim_id 33981
//   ICCL:  source_id 25 · metric_id 126 · dim_type 45 · dim_id 33982
//   granularity financial_year · aggregation sum
export const fetchClearingFundsPayin = () =>
  Promise.all([
    analyticsAggregate({ source_id: 24, date_attribute_type_id: 3, metric_id: 126, dimension_type_id: 45, dimension_id: 33981, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 25, date_attribute_type_id: 3, metric_id: 126, dimension_type_id: 45, dimension_id: 33982, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
  ]);

// ── Demat Account Growth — CDSL vs NSDL ──────────────────────────────────────
//   source_id 32 · metric_id 147 (investor_accounts_lakh) · dim_type 52
//   dim 34086 — CDSL · dim 34085 — NSDL
//   Values in lakh → divide by 100 to get Crore in component
export const fetchDematGrowth = () =>
  Promise.all([
    analyticsAggregate({ source_id: 32, date_attribute_type_id: 3, metric_id: 147, dimension_type_id: 52, dimension_id: 34086, granularity: 'month', aggregation: 'sum', limit: 2000 }),
    analyticsAggregate({ source_id: 32, date_attribute_type_id: 3, metric_id: 147, dimension_type_id: 52, dimension_id: 34085, granularity: 'month', aggregation: 'sum', limit: 2000 }),
  ]);

export const fetchIntermediaryTrends = () =>
  Promise.all(
    INTERMEDIARY_DIMS.map(d =>
      analyticsAggregate({
        source_id: 31, date_attribute_type_id: 3,
        metric_id: 143, dimension_type_id: 51, dimension_id: d.dimension_id,
        granularity: 'month', aggregation: 'sum', limit: 500,
      }).then(raw => ({ ...d, raw })).catch(() => ({ ...d, raw: [] }))
    )
  );
