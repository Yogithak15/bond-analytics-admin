import { analyticsAggregate } from './bond_api';

// ── Source / dimension reference ──────────────────────────────────────────────
//   source_id 27  — NSE F&O (contracts & notional)   date_attr_type 3
//   source_id 29  — BSE F&O                           date_attr_type 3
//   source_id 36  — Currency Derivatives              date_attr_type 3
//   source_id 37  — FPI Derivatives Share             date_attr_type 3
//
//   NSE dim_type 47  dims: 33992 Idx Fut · 33993 Stk Fut · 33994 Idx Opt
//                         33995 Stk Opt  · 33996 Idx Opt (notl) · 33997 Stk Opt (notl) · 33998 Total
//   BSE dim_type 49  dims: 34008 Total
//   FPI dim_type 55  dims: 34162 DII · 34163 FPI · 34164 Client · 34165 NRI · 34166 Prop

// ── KPIs ──────────────────────────────────────────────────────────────────────

// Peak month + regulation drop: NSE Total contracts monthly
export const fetchDerivKpiContracts = () =>
  analyticsAggregate({
    source_id: 27, date_attribute_type_id: 3,
    metric_id: 133, dimension_type_id: 47, dimension_id: 33998,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// Options % of F&O: notional turnover for 4 option dims + total
export const fetchDerivKpiOptionsNotional = () =>
  Promise.all([
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33994, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33995, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33996, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33997, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33998, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// FPI derivatives share (monthly)
export const fetchDerivKpiFpiShare = () =>
  analyticsAggregate({
    source_id: 37, date_attribute_type_id: 3,
    metric_id: 93, dimension_type_id: 55, dimension_id: 34163,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Annual F&O Turnover (NSE + BSE) ──────────────────────────────────────────

export const fetchDerivAnnualNse = () =>
  analyticsAggregate({
    source_id: 27, date_attribute_type_id: 3,
    metric_id: 133, dimension_type_id: 47, dimension_id: 33998,
    granularity: 'year', aggregation: 'sum', limit: 50,
  });

export const fetchDerivAnnualBse = () =>
  analyticsAggregate({
    source_id: 29, date_attribute_type_id: 3,
    metric_id: 133, dimension_type_id: 49, dimension_id: 34008,
    granularity: 'year', aggregation: 'sum', limit: 50,
  });

// ── Currency Derivatives (monthly + annual) ───────────────────────────────────

export const fetchDerivCurrencyMonthly = () =>
  analyticsAggregate({
    source_id: 36, date_attribute_type_id: 3,
    metric_id: 117, dimension_id: 34169,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Instrument Breakdown (notional, monthly) ──────────────────────────────────

export const fetchDerivInstBreakdown = () =>
  Promise.all([
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33994, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33995, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33996, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33997, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33993, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33992, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Segment Sheet (notional monthly — same dims as instBreakdown) ─────────────

export const fetchDerivSegmentSheet = () =>
  Promise.all([
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33994, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33995, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33996, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33997, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33993, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33992, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── F&O 4-panel chart (contracts + notional breakdown) ───────────────────────

// Returns [contrRaw, optPremRaw, sfutRaw, ifutRaw]
export const fetchDerivFo4Panel = () =>
  Promise.all([
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 133, dimension_type_id: 47, dimension_id: 33998, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 134, dimension_type_id: 47, dimension_id: 33998, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33993, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33992, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── FPI/DII/Client/NRI/Prop participation mix (monthly) ──────────────────────

export const fetchDerivParticipationMix = () =>
  Promise.all([
    analyticsAggregate({ source_id: 37, date_attribute_type_id: 3, metric_id: 93, dimension_type_id: 55, dimension_id: 34163, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 37, date_attribute_type_id: 3, metric_id: 93, dimension_type_id: 55, dimension_id: 34164, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 37, date_attribute_type_id: 3, metric_id: 93, dimension_type_id: 55, dimension_id: 34162, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 37, date_attribute_type_id: 3, metric_id: 93, dimension_type_id: 55, dimension_id: 34166, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 37, date_attribute_type_id: 3, metric_id: 93, dimension_type_id: 55, dimension_id: 34165, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);
