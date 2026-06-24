import { analyticsAggregate } from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Primary Markets Page — API definitions
//
//  Confirmed source_ids:
//    source_id 19  — QIP (Qualified Institutional Placements) date_attr_type 3
//    source_id 42  — Takeover SAST Offers                    date_attr_type 3
//    source_id 43  — Preferential Allotments                 date_attr_type 3
//    source_id 44  — Corporate Debt Private Placements       date_attr_type 3
//    source_id 38  — OFS (Offer for Sale)                    date_attr_type 3
//
//  QIP (source 19):
//    metric_id  96 — QIP amount raised (₹ Crore)
//    metric_id  95 — QIP issue count
//    dimension_type_id 39 · dimension_id 33924
//
//  SAST (source 42):
//    metric_id 167 — number of takeover offers
//    dimension_id 34211
//
//  Corporate Debt PP (source 44):
//    metric_id 109 — amount (₹ Crore)
//    dimension_id 34223
//
//  Preferential Allotment (source 43):
//    metric_id 109 — amount (₹ Crore)
//    dimension_id 34219
//
//  OFS (source 38):
//    metric_id 175 — financial sector OFS amount
//    metric_id 177 — non-financial sector OFS amount
//    dimension_id 34360
// ─────────────────────────────────────────────────────────────────────────────

// ── QIP Monthly Amount Raised ────────────────────────────────────────────────
//   source_id 19 · metric_id 96 · date_attr 3 · dim_type 39 · dim_id 33924
//   granularity month · ₹ Crore
export const fetchQipMonthlyAmount = () =>
  analyticsAggregate({
    source_id: 19, date_attribute_type_id: 3,
    metric_id: 96, dimension_type_id: 39, dimension_id: 33924,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── QIP Monthly Issue Count ──────────────────────────────────────────────────
//   source_id 19 · metric_id 95 · date_attr 3 · dim_type 39 · dim_id 33924
//   granularity month · count of placements
export const fetchQipMonthlyCount = () =>
  analyticsAggregate({
    source_id: 19, date_attribute_type_id: 3,
    metric_id: 95, dimension_type_id: 39, dimension_id: 33924,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Corporate Debt Private Placements — Monthly Amount ───────────────────────
//   source_id 44 · metric_id 109 · date_attr 3 · dim_id 34223
//   granularity month · ₹ Crore
export const fetchCorpDebtPrivatePlacement = () =>
  analyticsAggregate({
    source_id: 44, date_attribute_type_id: 3,
    metric_id: 109, dimension_id: 34223,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Preferential Allotments — Monthly Amount ─────────────────────────────────
//   source_id 43 · metric_id 109 · date_attr 3 · dim_id 34219
//   granularity month · ₹ Crore
export const fetchPreferentialAllotments = () =>
  analyticsAggregate({
    source_id: 43, date_attribute_type_id: 3,
    metric_id: 109, dimension_id: 34219,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Takeover SAST Offers — Monthly Count ─────────────────────────────────────
//   source_id 42 · metric_id 167 · date_attr 3 · dim_id 34211
//   granularity month · count of offers
export const fetchSastOffers = () =>
  analyticsAggregate({
    source_id: 42, date_attribute_type_id: 3,
    metric_id: 167, dimension_id: 34211,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── OFS Financial Sector — Monthly Amount ────────────────────────────────────
//   source_id 38 · metric_id 175 · date_attr 3 · dim_id 34360
//   granularity month · ₹ Crore
export const fetchOfsFinancial = () =>
  analyticsAggregate({
    source_id: 38, date_attribute_type_id: 3,
    metric_id: 175, dimension_id: 34360,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── OFS Non-Financial Sector — Monthly Amount ────────────────────────────────
//   source_id 38 · metric_id 177 · date_attr 3 · dim_id 34360
//   granularity month · ₹ Crore
export const fetchOfsNonFinancial = () =>
  analyticsAggregate({
    source_id: 38, date_attribute_type_id: 3,
    metric_id: 177, dimension_id: 34360,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── NCD Public Issues — Annual (Financial Year) ──────────────────────────────
//   source_id 1 · metric_id 2 · date_attr_type 2 · financial_year granularity
//   ₹ Crore · used for Capital Raising Thermometer
export const fetchNcdPublicIssues = () =>
  analyticsAggregate({
    source_id: 1, date_attribute_type_id: 2,
    metric_id: 2,
    granularity: 'financial_year', aggregation: 'sum', limit: 100,
  });
