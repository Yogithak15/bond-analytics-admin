import {
  analyticsAggregate,
  getMarketComposition,
  getGsecMaturityProfile,
  getStripsMaturityProfile,
  getSdlMaturityProfile,
  getStateOutstandingShare,
  getNcdPublicIssuesTrend,
  getPrivatePlacementTrend,
  getCorpBondTradingTrend,
  getCorpBondOutstandingByIssuer,
} from './bond_api';

// ─────────────────────────────────────────────────────────────────────────────
//  Dashboard Page — API definitions
//
//  Confirmed source_ids:
//    source_id  1  — NCD Public Issues            date_attr_type 2
//    source_id  2  — Private Placements           date_attr_type 3
//    source_id  3  — Corp Bond Trades (SEBI)      date_attr_type 3
//    source_id  4  — Corp Bond Outstanding (SEBI legacy) date_attr_type 3
//    source_id  5  — Corp Bond Outstanding (TRACKS) date_attr_type 3
//    source_id  6  — SGB Outstanding              date_attr_type 6
//    source_id  7  — SDL / SGS Outstanding        date_attr_type 5
//    source_id  8  — G-Sec Outstanding            date_attr_type 5
//    source_id  9  — STRIPS Outstanding           date_attr_type 5
//    source_id 11  — RBI Policy Rates             date_attr_type 9
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
//  DEDICATED ENDPOINT WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════

// ── Market Composition (G-Sec + SDL + Corp totals) ───────────────────────────
//   /analytics/market-composition  → { segments, grand_total_cr }
export const fetchDashMarketComposition = (financialYear) =>
  getMarketComposition(financialYear);

// ── NCD Public Issues Yearly Trend ──────────────────────────────────────────
//   /analytics/ncd-public-issues-trend  → { data: [{period, amount_cr, issue_count}], latest }
export const fetchDashNcdTrend = () => getNcdPublicIssuesTrend();

// ── Private Placement Yearly Trend ──────────────────────────────────────────
//   /analytics/private-placement-trend  → { data: [{period, amount_cr, issue_count}], latest }
export const fetchDashPrivatePlacementTrend = () => getPrivatePlacementTrend();

// ── Corp Bond Trading Trend ──────────────────────────────────────────────────
//   /analytics/corp-bond-trading-trend  → { data: [{period, amount_cr, trade_count}], latest }
export const fetchDashCorpBondTradingTrend = () => getCorpBondTradingTrend();

// ── Corp Bond Outstanding by Issuer ─────────────────────────────────────────
//   /analytics/corp-bond-outstanding-by-issuer  → { breakdown, financial_year }
export const fetchDashCorpBondOsByIssuer = () => getCorpBondOutstandingByIssuer();

// ── G-Sec Maturity Profile ───────────────────────────────────────────────────
//   /analytics/gsec/maturity-profile  → { buckets, stats }
export const fetchDashGsecMaturityProfile = () => getGsecMaturityProfile();

// ── STRIPS Maturity Profile ──────────────────────────────────────────────────
//   /analytics/gsec/strips/maturity-profile  → { buckets, stats }
export const fetchDashStripsMaturityProfile = () => getStripsMaturityProfile();

// ── SDL Maturity Profile ─────────────────────────────────────────────────────
//   /analytics/sdl/maturity-profile  → { buckets, stats }
export const fetchDashSdlMaturityProfile = () => getSdlMaturityProfile();

// ── State Outstanding Share ──────────────────────────────────────────────────
//   /analytics/state-outstanding-share  → [{ state, total_outstanding, share_percent }]
export const fetchDashStateOutstandingShare = () => getStateOutstandingShare();


// ═══════════════════════════════════════════════════════════════════════════
//  analyticsAggregate WRAPPERS
// ═══════════════════════════════════════════════════════════════════════════

// ── NCD IPO Annual Trend ─────────────────────────────────────────────────────
//   source_id 1 · metric_id 2 · date_attr 2 · granularity FY
export const fetchDashNcdIpoAnnual = () =>
  analyticsAggregate({
    source_id: 1, date_attribute_type_id: 2,
    granularity: 'financial_year', metric_id: 2, limit: 100,
  });

// ── Private Placements Annual Trend ─────────────────────────────────────────
//   source_id 2 · metric_id 4 · date_attr 3 · granularity FY
export const fetchDashPrivatePlacementAnnual = () =>
  analyticsAggregate({
    source_id: 2, date_attribute_type_id: 3,
    granularity: 'financial_year', metric_id: 4, limit: 100,
  });

// ── Corp Bond Outstanding KPI Card (latest month) ────────────────────────────
//   source_id 5 · metric_id 22 · date_attr 3 · dim_type 5 · granularity month
export const fetchDashCorpOsCard = () =>
  analyticsAggregate({
    source_id: 5, dimension_type_id: 5,
    metric_id: 22, date_attribute_type_id: 3,
    aggregation: 'sum', granularity: 'month',
  });

// ── Corp Bond Outstanding Quarterly (SEBI legacy source 4) ───────────────────
//   source_id 4 · metric_id 21 · date_attr 3 · dim_type 4 · granularity quarter
export const fetchDashCorpOsLegacy = () =>
  analyticsAggregate({
    source_id: 4, dimension_type_id: 4,
    metric_id: 21, date_attribute_type_id: 3,
    granularity: 'quarter', limit: 100,
  });

// ── Corp Bond Outstanding Quarterly (TRACKS source 5) ────────────────────────
//   source_id 5 · metric_id 22 · date_attr 3 · dim_type 5 · granularity quarter
export const fetchDashCorpOsQuarterly = () =>
  analyticsAggregate({
    source_id: 5, dimension_type_id: 5,
    metric_id: 22, date_attribute_type_id: 3,
    aggregation: 'sum', granularity: 'quarter', limit: 100,
  });

// ── Corp Bond Trades Quarterly (SEBI) ────────────────────────────────────────
//   source_id 3 · metric_id 6 · date_attr 3 · dim_type 3 · granularity quarter
export const fetchDashCorpTradesQuarterly = () =>
  analyticsAggregate({
    source_id: 3, dimension_type_id: 3,
    metric_id: 6, date_attribute_type_id: 3,
    granularity: 'quarter', limit: 100,
  });

// ── SDL Outstanding Yearly Trend ─────────────────────────────────────────────
//   source_id 7 · metric_id 29 · date_attr 5 · dim_type 11 · granularity FY
export const fetchDashSdlTrend = () =>
  analyticsAggregate({
    source_id: 7,
    date_attribute_type_id: 5,
    dimension_type_id: 11,
    metric_id: 29,
    granularity: 'financial_year',
    limit: 100,
  });

// ── STRIPS Outstanding Yearly Trend ──────────────────────────────────────────
//   source_id 9 · metric_id 29 · date_attr 5 · dim_type 15 · granularity FY
export const fetchDashStripsTrend = () =>
  analyticsAggregate({
    source_id: 9,
    dimension_type_id: 15,
    date_attribute_type_id: 5,
    metric_id: 29,
    granularity: 'financial_year',
    limit: 100,
  });

// ── G-Sec Outstanding Yearly Trend ───────────────────────────────────────────
//   source_id 8 · metric_id 29 · date_attr 5 · dim_type 14 · granularity FY
export const fetchDashGsecTrend = () =>
  analyticsAggregate({
    source_id: 8,
    dimension_type_id: 14,
    date_attribute_type_id: 5,
    metric_id: 29,
    granularity: 'financial_year',
    limit: 100,
  });

// ── SGB Outstanding Yearly Trend ─────────────────────────────────────────────
//   source_id 6 · metric_id 28 · date_attr 6 · dim_type 10 · granularity FY
export const fetchDashSgbTrend = () =>
  analyticsAggregate({
    source_id: 6,
    metric_id: 28,
    date_attribute_type_id: 6,
    dimension_type_id: 10,
    granularity: 'financial_year',
    limit: 100,
  });

// ── RBI Policy Rates — all 7 metrics monthly ─────────────────────────────────
//   source_id 11 · date_attr 9 · granularity month
//   metric_ids:
//     46 — Repo Rate
//     47 — SDF Rate
//     48 — MSF Rate
//     49 — Bank Rate
//     50 — Reverse Repo
//     51 — CRR
//     52 — SLR
export const fetchDashRbiPolicyRate = (metric_id) =>
  analyticsAggregate({
    source_id: 11,
    date_attribute_type_id: 9,
    metric_id,
    granularity: 'month',
    aggregation: 'sum',
    limit: 100,
  });
