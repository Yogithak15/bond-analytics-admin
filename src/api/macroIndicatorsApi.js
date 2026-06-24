import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Macro Indicators Page — API definitions
//
//  source_id 33 · dim_type 53 · metric_id 160 (indicator_value)
//  dimension_id 34089 — Money Market Call Rates (Repo Rate proxy)
// ─────────────────────────────────────────────────────────────────────────────

// ── REPO RATE ─────────────────────────────────────────────────────────────────
//   source_id 48 · metric_id 180 · dim_id 34509
export const fetchMacroRepoRate = () =>
  analyticsAggregate({
    source_id: 48, date_attribute_type_id: 3,
    metric_id: 180, dimension_type_id: 67, dimension_id: 34509,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Key Macro Indicators — all 7 toggle metrics in parallel ──────────────────
//   source_id 33 · metric_id 160 · dim_type 53
export const KEY_MACRO_DIMS = [
  { key: 'Repo Rate',      source_id: 48, metric_id: 180, dimension_type_id: 67, dimension_id: 34509, color: '#e05060' },
  { key: 'CPI Inflation',  dimension_id: 34088, color: '#e05060' },
  { key: 'WPI Inflation',  dimension_id: 34117, color: '#d4a820' },
  { key: 'Forex Reserves', dimension_id: 34095, color: '#26c99a' },
  { key: 'USD/INR',        dimension_id: 34093, color: '#f0a040' },
  { key: 'M3 Money Supply',dimension_id: 34103, color: '#4a90d9' },
  { key: 'FPI Net Equity', dimension_id: 34146, color: '#8b5cf6' },
  { key: 'NSE MCap',       dimension_id: 34130, color: '#4a90d9' },
];
export const fetchKeyMacroMetrics = () =>
  Promise.all(
    KEY_MACRO_DIMS.map(d =>
      analyticsAggregate({
        source_id:          d.source_id          ?? 33,
        metric_id:          d.metric_id          ?? 160,
        dimension_type_id:  d.dimension_type_id  ?? 53,
        date_attribute_type_id: 3,
        dimension_id: d.dimension_id,
        granularity: 'month', aggregation: 'sum', limit: 500,
      }).then(raw => ({ ...d, raw })).catch(() => ({ ...d, raw: [] }))
    )
  );

// ── Inflation CPI & WPI ───────────────────────────────────────────────────────
//   source_id 33 · metric_id 160 · dim_type 53
//   dim 34088 — CPI · dim 34117 — WPI
export const fetchMacroInflation = () =>
  Promise.all([
    analyticsAggregate({ source_id: 33, date_attribute_type_id: 3, metric_id: 160, dimension_type_id: 53, dimension_id: 34088, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 33, date_attribute_type_id: 3, metric_id: 160, dimension_type_id: 53, dimension_id: 34117, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── TRADE BALANCE — Net Trade Balance ────────────────────────────────────────
//   source_id 33 · metric_id 160 · dim_type 53 · dim_id 34094
//   USD Bn (newer data) or USD million (older); negative = deficit
export const fetchMacroTradeBalance = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34094,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── MCAP / GDP — Market Cap to GDP Ratio ──────────────────────────────────────
//   source_id 33 · metric_id 160 · dim_type 53 · dim_id 34118
export const fetchMacroMcapGdp = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34118,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── MFG PMI — Manufacturing Purchasing Managers Index ────────────────────────
//   source_id 33 · metric_id 160 · dim_type 53 · dim_id 34111
export const fetchMacroMfgPmi = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34111,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── USD / INR — INR vs USD Spot Rate ─────────────────────────────────────────
//   source_id 33 · metric_id 160 · dim_type 53 · dim_id 34093
export const fetchMacroUsdInr = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34093,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── FOREX RESERVES — Foreign Exchange Reserves ────────────────────────────────
//   source_id 33 · metric_id 160 · dim_type 53 · dim_id 34095
export const fetchMacroForexReserves = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34095,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });
