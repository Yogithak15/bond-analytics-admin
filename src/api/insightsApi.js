import { analyticsAggregate } from './bond_api';
import { fetchDmKpiGsecOs, fetchDmKpiSgsOs, fetchDmKpiCorpBondOs, fetchDmSgsTrend, fetchDmSgsTop5Share, fetchDmStateOutstandingShare } from './debtMarketApi';

// ─────────────────────────────────────────────────────────────────────────────
//  Insights Page — API definitions
//  source_id 33 · metric_id 160 · dim_type 53
// ─────────────────────────────────────────────────────────────────────────────

// ── NSE Market Cap — full series (latest for KPI, full for chart) ─────────────
//   dimension_id 34130 · ₹ crore
export const fetchInsightsNseMcap = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34130,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── 10Y G-Sec Yield — latest month ───────────────────────────────────────────
//   dimension_id 34092 · "10 Year GSec Rate" · yield in %
export const fetchInsights10YGsec = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34092,
    granularity: 'month', aggregation: 'sum', limit: 1,
  });

// ── Latest FPI Net Investment ─────────────────────────────────────────────────
//   dimension_id 34146 · "FPI Net Investment" · ₹ '000 crore (recent) or ₹ crore (older)
export const fetchInsightsFpiNet = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34146,
    granularity: 'month', aggregation: 'sum', limit: 1,
  });

// ── Market Plumbing and Concentration Risk ────────────────────────────────────
//   Top 10 Members:  source 17, metric 105, dim 33949 (member concentration)
//   Top 25 Securities: source 17, metric 106, dim 33946 (security concentration)
//   Traded/List Ratio: source 34, metric 161, dim 34160 (ratio %)
export const fetchInsightsMarketPlumbing = () =>
  Promise.all([
    analyticsAggregate({ source_id: 17, date_attribute_type_id: 3, metric_id: 105, dimension_type_id: 42, dimension_id: 33949, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 17, date_attribute_type_id: 3, metric_id: 106, dimension_type_id: 42, dimension_id: 33946, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 34, date_attribute_type_id: 3, metric_id: 161, dimension_id: 34160, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Derivatives Concentration Monitor ─────────────────────────────────────────
//   F&O Total Turnover (annual):  source 27, metric 117, dim 33998
//   Index Options turnover (annual): source 27, metric 117, dim 33994
//   F&O Total Turnover: source 27, metric 117 (turnover_rs_crore), dim 33998
//   Options (all 4): metric 135 (notional_rs_crore)
//     Index Calls: dim 33994 · Index Puts: dim 33995
//     Stock Calls: dim 33996 · Stock Puts: dim 33997
//   Options Share % = (sum of 4 option notionals / F&O turnover) × 100
export const fetchInsightsDerivConc = () =>
  Promise.all([
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 117, dimension_type_id: 47, dimension_id: 33998, granularity: 'year', aggregation: 'sum', limit: 50 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33994, granularity: 'year', aggregation: 'sum', limit: 50 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33995, granularity: 'year', aggregation: 'sum', limit: 50 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33996, granularity: 'year', aggregation: 'sum', limit: 50 }),
    analyticsAggregate({ source_id: 27, date_attribute_type_id: 3, metric_id: 135, dimension_type_id: 47, dimension_id: 33997, granularity: 'year', aggregation: 'sum', limit: 50 }),
  ]);

// ── Market Risk and External Vulnerability — VIX + A/D + FPI Net ─────────────
//   VIX:     source 33, metric 160, dim 34128 · India VIX range
//   A/D:     source 15, metric 92,  dim 33906 · Advance/Decline ratio
//   FPI Net: source 14, metric 87,  dim 33894 · monthly net flows (₹ Crore)
export const fetchInsightsRiskData = () =>
  Promise.all([
    analyticsAggregate({ source_id: 33, date_attribute_type_id: 3, metric_id: 160, dimension_type_id: 53, dimension_id: 34128, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 15, date_attribute_type_id: 3, metric_id: 92,  dimension_type_id: 36, dimension_id: 33906, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 14, date_attribute_type_id: 3, metric_id: 87,  dimension_type_id: 34, dimension_id: 33894, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Macro-Market Transmission Map — indexed series + FPI Net bars ─────────────
//   Repo Rate: source 33, dim 34089 · USD/INR: source 33, dim 34093
//   NSE MCap:  source 33, dim 34130 · FPI Net: source 14, dim 33894
export const fetchInsightsMacroTransmission = () =>
  Promise.all([
    analyticsAggregate({ source_id: 33, date_attribute_type_id: 3, metric_id: 160, dimension_type_id: 53, dimension_id: 34089, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 33, date_attribute_type_id: 3, metric_id: 160, dimension_type_id: 53, dimension_id: 34093, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 33, date_attribute_type_id: 3, metric_id: 160, dimension_type_id: 53, dimension_id: 34130, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 14, date_attribute_type_id: 3, metric_id: 87,  dimension_type_id: 34, dimension_id: 33894, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── State Debt Stock Archive — SGS annual trend + Top-5 share ────────────────
//   sgsTrend: annual SGS outstanding (source 7, metric 29, FY)
//   top5Share: latest top-5 state concentration from state-outstanding-share endpoint
export const fetchInsightsSgsArchive = () =>
  Promise.all([
    fetchDmSgsTrend(),
    fetchDmSgsTop5Share().catch(() => null),
  ]);

// ── Largest 5-Year State Debt Additions — current state outstanding ───────────
//   Uses state-outstanding-share endpoint; component sorts and takes top 10
export const fetchInsightsStateDebt = () => fetchDmStateOutstandingShare();

// ── Sovereign / State / Credit Funding Conditions — annual series ─────────────
//   G-Sec auctions (source 8, metric 29, annual outstanding as proxy)
//   SDL auctions  (source 7, metric 29, annual)
//   EBP/Corp PP   (source 2, metric 4, annual)
//   G-Sec Yield   (source 33, metric 160, dim 34092, annual avg)
//   SDL Yield     (source 33, metric 160, dim 34091, annual avg — SDL 10Y rate)
export const fetchInsightsSovFunding = () =>
  Promise.all([
    analyticsAggregate({ source_id: 8, date_attribute_type_id: 5, metric_id: 29, dimension_type_id: 14, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 7, date_attribute_type_id: 5, metric_id: 29, dimension_type_id: 11, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 2, date_attribute_type_id: 3, metric_id: 4,  granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 33, date_attribute_type_id: 3, metric_id: 160, dimension_type_id: 53, dimension_id: 34092, granularity: 'financial_year', aggregation: 'avg', limit: 100 }),
    analyticsAggregate({ source_id: 33, date_attribute_type_id: 3, metric_id: 160, dimension_type_id: 53, dimension_id: 34091, granularity: 'financial_year', aggregation: 'avg', limit: 100 }),
  ]);

// ── Capital Formation Engine — 5 series, annual (financial year) ─────────────
//   1. SEBI Private Placements : source 2  · metric 4  · date_attr 3
//   2. QIP raised               : source 19 · metric 96 · date_attr 3 · dim 33924
//   3. NCD Public Issues (IPO)  : source 1  · metric 2  · date_attr 2
//   4. OFS Financial            : source 38 · metric 175 · date_attr 3 · dim 34360
//   5. OFS Non-Financial        : source 38 · metric 177 · date_attr 3 · dim 34360
export const fetchCapFormEngine = () =>
  Promise.all([
    analyticsAggregate({ source_id: 2,  date_attribute_type_id: 3, metric_id: 4,   granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 19, date_attribute_type_id: 3, metric_id: 96,  dimension_type_id: 39, dimension_id: 33924, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 1,  date_attribute_type_id: 2, metric_id: 2,   granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 38, date_attribute_type_id: 3, metric_id: 175, dimension_id: 34360, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
    analyticsAggregate({ source_id: 38, date_attribute_type_id: 3, metric_id: 177, dimension_id: 34360, granularity: 'financial_year', aggregation: 'sum', limit: 100 }),
  ]);

// ── Debt Market Stock — G-Sec + SGS + Corp Bond outstanding (same as Debt Markets tab) ─
export const fetchInsightsDebtMarket = () =>
  Promise.all([
    fetchDmKpiGsecOs().catch(() => []),
    fetchDmKpiSgsOs().catch(() => []),
    fetchDmKpiCorpBondOs().catch(() => []),
  ]);

// ── Mutual Fund AUM — full series ────────────────────────────────────────────
//   source_id 47 · metric_id 173 (net_assets_under_management_rs_cr)
//   dim_type 64 · dim_id 34482 "Grand Total (A+B+C)" · ₹ crore (÷1e5 → L Cr)
export const fetchInsightsMfAum = () =>
  analyticsAggregate({
    source_id: 47, date_attribute_type_id: 3,
    metric_id: 173, dimension_type_id: 64, dimension_id: 34482,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── PMS AUM — full series ─────────────────────────────────────────────────────
//   source_id 46 · metric_id 178 · dim_type 66 · dim_id 34425 · Grand Total
//   returns ₹ crore (÷1e5 → L Cr in component)
export const fetchInsightsPmsAum = () =>
  analyticsAggregate({
    source_id: 46, date_attribute_type_id: 3,
    metric_id: 178, dimension_type_id: 66, dimension_id: 34425,
    granularity: 'month', aggregation: 'sum', limit: 500,
  });

// ── Demat Accounts trend — CDSL + NSDL summed ────────────────────────────────
//   source_id 32 · metric_id 147 (investor_accounts_lakh)
//   dim 34086 CDSL + dim 34085 NSDL — sum → /100 = Crore in component
export const fetchInsightsDematTrend = () =>
  Promise.all([
    analyticsAggregate({ source_id: 32, date_attribute_type_id: 3, metric_id: 147, dimension_type_id: 52, dimension_id: 34086, granularity: 'month', aggregation: 'sum', limit: 500 }),
    analyticsAggregate({ source_id: 32, date_attribute_type_id: 3, metric_id: 147, dimension_type_id: 52, dimension_id: 34085, granularity: 'month', aggregation: 'sum', limit: 500 }),
  ]);

// ── Demat Accounts — latest month ────────────────────────────────────────────
//   dimension_id 34144 · "Number of Demat Accounts"
export const fetchInsightsDematAccounts = () =>
  analyticsAggregate({
    source_id: 33, date_attribute_type_id: 3,
    metric_id: 160, dimension_type_id: 53, dimension_id: 34144,
    granularity: 'month', aggregation: 'sum', limit: 1,
  });
