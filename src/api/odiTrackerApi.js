import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  ODI / P-Notes Tracker Page — API definitions
//
//  Confirmed source_ids:
//    source_id 28  — ODI / P-Notes data (SEBI)   date_attr_type 3
//
//  dimension_type_id 48 · dimension_id 34000 (aggregate / total)
//
//  metric_id 138 — ODI notional outstanding incl. derivatives (₹ Crore)
//  metric_id 139 — ODI notional outstanding excl. derivatives (₹ Crore)
//  metric_id 140 — FPI AUC (₹ Crore) — from ODI data source
//  metric_id 141 — ODI as % of FPI AUC (ratio / %)
// ─────────────────────────────────────────────────────────────────────────────

// ── ODI Notional Including Derivatives ───────────────────────────────────────
//   source_id 28 · metric_id 138 · date_attr 3 · dim_type 48 · dim_id 34000
//   granularity month · ₹ Crore
export const fetchOdiInclDerivatives = () =>
  analyticsAggregate({
    source_id: 28, date_attribute_type_id: 3,
    metric_id: 138, dimension_type_id: 48, dimension_id: 34000,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── ODI Notional Excluding Derivatives ───────────────────────────────────────
//   source_id 28 · metric_id 139 · date_attr 3 · dim_type 48 · dim_id 34000
//   granularity month · ₹ Crore
export const fetchOdiExclDerivatives = () =>
  analyticsAggregate({
    source_id: 28, date_attribute_type_id: 3,
    metric_id: 139, dimension_type_id: 48, dimension_id: 34000,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── ODI as % of FPI AUC ──────────────────────────────────────────────────────
//   source_id 28 · metric_id 141 · date_attr 3 · dim_type 48 · dim_id 34000
//   granularity month · % value (SEBI regulatory threshold: 10%)
export const fetchOdiPctOfAuc = () =>
  analyticsAggregate({
    source_id: 28, date_attribute_type_id: 3,
    metric_id: 141, dimension_type_id: 48, dimension_id: 34000,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── FPI AUC (from ODI data source) ───────────────────────────────────────────
//   source_id 28 · metric_id 140 · date_attr 3 · dim_type 48 · dim_id 34000
//   granularity month · ₹ Crore total FPI assets under custody
export const fetchOdiSourceFpiAuc = () =>
  analyticsAggregate({
    source_id: 28, date_attribute_type_id: 3,
    metric_id: 140, dimension_type_id: 48, dimension_id: 34000,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });
