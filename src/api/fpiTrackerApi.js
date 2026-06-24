import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  FPI Tracker Page — API definitions
//
//  Confirmed source_ids:
//    source_id 14  — FPI Flows (SEBI)         date_attr_type 3
//    source_id 16  — NSE Cash Market Turnover  date_attr_type 3
//    source_id 20  — FPI AUC / Custodian data  date_attr_type 3
//
//  dimension_type_id 34 — FPI dimension type (source 14)
//    dimension_id 33894  — Net FPI equity flows / overall
//  dimension_type_id 37 — NSE Cash dimension type (source 16)
//    dimension_id 33909  — FPI % in NSE cash turnover
//  dimension_type_id 40 — FPI AUC dimension type (source 20)
//    dimension_id 33925  — Total FPI assets under custody
// ─────────────────────────────────────────────────────────────────────────────

// ── Monthly FPI Net Flows ────────────────────────────────────────────────────
//   source_id 14 · metric_id 87 · date_attr 3 · dim_type 34 · dim_id 33894
//   granularity month · ₹ Crore
export const fetchFpiMonthlyNetFlows = () =>
  analyticsAggregate({
    source_id: 14, date_attribute_type_id: 3,
    metric_id: 87, dimension_type_id: 34, dimension_id: 33894,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Cumulative FPI Net Flow (USD Million) ────────────────────────────────────
//   source_id 14 · metric_id 89 · date_attr 3 · dim_type 34 · dim_id 33894
//   granularity month · USD million
export const fetchFpiCumulativeFlow = () =>
  analyticsAggregate({
    source_id: 14, date_attribute_type_id: 3,
    metric_id: 89, dimension_type_id: 34, dimension_id: 33894,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Annual FPI Performance ───────────────────────────────────────────────────
//   source_id 14 · metric_id 87 · date_attr 3 · dim_type 34 · dim_id 33894
//   granularity year · ₹ Crore per calendar year
export const fetchFpiAnnualFlows = () =>
  analyticsAggregate({
    source_id: 14, date_attribute_type_id: 3,
    metric_id: 87, dimension_type_id: 34, dimension_id: 33894,
    granularity: 'year', aggregation: 'sum', limit: 50,
  });

// ── FPI Assets Under Custody ─────────────────────────────────────────────────
//   source_id 20 · metric_id 98 · date_attr 3 · dim_type 40 · dim_id 33925
//   granularity month · ₹ Crore
export const fetchFpiAuc = () =>
  analyticsAggregate({
    source_id: 20, date_attribute_type_id: 3,
    metric_id: 98, dimension_type_id: 40, dimension_id: 33925,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── FPI Share in NSE Cash Turnover ───────────────────────────────────────────
//   source_id 16 · metric_id 93 · date_attr 3 · dim_type 37 · dim_id 33909
//   granularity month · % value
export const fetchFpiCashShare = () =>
  analyticsAggregate({
    source_id: 16, date_attribute_type_id: 3,
    metric_id: 93, dimension_type_id: 37, dimension_id: 33909,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });
