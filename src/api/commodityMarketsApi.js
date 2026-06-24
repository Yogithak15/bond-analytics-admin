import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Commodity Markets Page — API definitions
//
//  Confirmed source_ids:
//    source_id 21  — MCX iCOMDEX Indices        date_attr_type 3
//    source_id 30  — MCX Commodity Futures       date_attr_type 3
//
//  MCX Futures (source 30):
//    metric_id 117 — futures turnover (₹ Crore)
//    dimension_type_id 50
//    dimension_id 34009 — Agriculture
//    dimension_id 34010 — Bullion
//    dimension_id 34011 — Metals
//    dimension_id 34012 — Energy
//
//  MCX iCOMDEX (source 21):
//    metric_id  99 — composite open value (chart + KPI)
//    metric_id 102 — composite close value (YoY + sub-index rank)
//    dimension_type_id 41
//    dimension_id 33941 — MCX iCOMDEX Composite
//    dimension_id 33942 — MCX BULLDEX
//    dimension_id 33943 — MCX METLDEX
//    dimension_id 33944 — MCX ENRGDEX
// ─────────────────────────────────────────────────────────────────────────────

// ── MCX Commodity Futures Turnover — by group (monthly) ─────────────────────
//   source_id 30 · metric_id 117 · date_attr 3 · dim_type 50
//   dimension_id param selects the commodity group
export const fetchMcxFuturesTurnover = (dimension_id) =>
  analyticsAggregate({
    source_id: 30, date_attribute_type_id: 3,
    metric_id: 117, dimension_type_id: 50, dimension_id,
    granularity: 'month', aggregation: 'sum', limit: 1000,
  });

// ── Commodity Exchanges 2026 Snapshot — turnover + contracts per exchange ─────
//   metric 117 = turnover_rs_crore · metric 166 = number_of_contracts_traded
//   Filter to 2026 periods client-side after fetch
const EXCHANGE_SNAPSHOT_CFGS = [
  { name: 'MCX',   color: '#f59e0b', source_id: 30, dimension_type_id: 50, dimension_id: 34016 },
  { name: 'NCDEX', color: '#10b981', source_id: 39, dimension_type_id: 58, dimension_id: 34180 },
  { name: 'NSE',   color: '#3b82f6', source_id: 41, dimension_type_id: 60, dimension_id: 34201 },
  { name: 'BSE',   color: '#8b5cf6', source_id: 40, dimension_type_id: 59, dimension_id: 34190 },
];
export const fetchExchangeSnapshot = () =>
  Promise.all(
    EXCHANGE_SNAPSHOT_CFGS.flatMap(cfg => [
      analyticsAggregate({ source_id: cfg.source_id, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: cfg.dimension_type_id, dimension_id: cfg.dimension_id, granularity: 'month', aggregation: 'sum', limit: 500 })
        .then(raw => ({ ...cfg, metric: 'turnover',   raw })).catch(() => ({ ...cfg, metric: 'turnover',   raw: [] })),
      analyticsAggregate({ source_id: cfg.source_id, date_attribute_type_id: 3, metric_id: 166, dimension_type_id: cfg.dimension_type_id, dimension_id: cfg.dimension_id, granularity: 'month', aggregation: 'sum', limit: 500 })
        .then(raw => ({ ...cfg, metric: 'contracts',  raw })).catch(() => ({ ...cfg, metric: 'contracts',  raw: [] })),
    ])
  );

// ── Exchange Market Share 2026 — Total Futures turnover per exchange ──────────
//   Filters to year 2026 client-side after fetching latest data
//   MCX   : source 30 · dim_type 50 · dim_id 34016 · metric 117
//   NCDEX : source 39 · dim_type 58 · dim_id 34180 · metric 117
//   NSE   : source 41 · dim_type 60 · dim_id 34201 · metric 117
//   BSE   : source 40 · dim_type 59 · dim_id 34190 · metric 117
const EXCHANGE_SHARE_CFGS = [
  { name: 'MCX',   color: '#f59e0b', source_id: 30, dimension_type_id: 50, dimension_id: 34016 },
  { name: 'NCDEX', color: '#10b981', source_id: 39, dimension_type_id: 58, dimension_id: 34180 },
  { name: 'NSE',   color: '#3b82f6', source_id: 41, dimension_type_id: 60, dimension_id: 34201 },
  { name: 'BSE',   color: '#8b5cf6', source_id: 40, dimension_type_id: 59, dimension_id: 34190 },
];
export const fetchExchangeMarketShare = () =>
  Promise.all(
    EXCHANGE_SHARE_CFGS.map(cfg =>
      analyticsAggregate({
        source_id: cfg.source_id, date_attribute_type_id: 3,
        metric_id: 117, dimension_type_id: cfg.dimension_type_id, dimension_id: cfg.dimension_id,
        granularity: 'month', aggregation: 'sum', limit: 500,
      }).then(raw => ({ ...cfg, raw })).catch(() => ({ ...cfg, raw: [] }))
    )
  );

// ── MCX iCOMDEX Composite — open price (monthly, chart + KPI) ────────────────
//   source_id 21 · metric_id 99 · date_attr 3 · dim_type 41 · dim_id 33941
export const fetchIcomdexCompositeOpen = () =>
  analyticsAggregate({
    source_id: 21, date_attribute_type_id: 3,
    metric_id: 99, dimension_type_id: 41, dimension_id: 33941,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── MCX iCOMDEX Composite — close price (monthly, YoY) ───────────────────────
//   source_id 21 · metric_id 102 · date_attr 3 · dim_type 41 · dim_id 33941
export const fetchIcomdexCompositeClose = () =>
  analyticsAggregate({
    source_id: 21, date_attribute_type_id: 3,
    metric_id: 102, dimension_type_id: 41, dimension_id: 33941,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── MCX BULLDEX — close price (monthly, sub-index rank) ──────────────────────
//   source_id 21 · metric_id 102 · date_attr 3 · dim_type 41 · dim_id 33942
export const fetchIcomdexBulldexClose = () =>
  analyticsAggregate({
    source_id: 21, date_attribute_type_id: 3,
    metric_id: 102, dimension_type_id: 41, dimension_id: 33942,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── MCX ENRGDEX — close price (monthly, sub-index rank) ──────────────────────
//   source_id 21 · metric_id 102 · date_attr 3 · dim_type 41 · dim_id 33944
export const fetchIcomdexEnrgdexClose = () =>
  analyticsAggregate({
    source_id: 21, date_attribute_type_id: 3,
    metric_id: 102, dimension_type_id: 41, dimension_id: 33944,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── MCX METLDEX — close price (monthly, sub-index rank) ──────────────────────
//   source_id 21 · metric_id 102 · date_attr 3 · dim_type 41 · dim_id 33943
export const fetchIcomdexMetldexClose = () =>
  analyticsAggregate({
    source_id: 21, date_attribute_type_id: 3,
    metric_id: 102, dimension_type_id: 41, dimension_id: 33943,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });
