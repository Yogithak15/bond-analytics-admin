import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchMpKpiNseMcap, fetchMpKpiBseMcap, fetchMpKpiNseTurnover, fetchMpKpiBseTurnover,
  fetchMpKpiAdRatio, fetchMpKpiNiftyVol, fetchMpKpiNseTop10, fetchMpKpiNseTraded, fetchMpKpiMfCashShare,
  fetchMpMiniMcap, fetchMpMiniTradedQty, fetchMpMiniFyFlows,
  fetchMpNseTurnover, fetchMpAvgTurnover, fetchMpPeakMcap,
  fetchMpMemberConc, fetchMpTradingFreq, fetchMpSecConc,
  fetchMpBreadth, fetchMpVolatility, fetchMpParticipantMix,
} from '../../api/marketPulseApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';


/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function cc() {
  const d = isDark();
  return {
    text:   d ? '#ffffff' : '#1a1a1a',
    text2:  d ? '#f0f0f0' : '#1a1c18',
    grid:   d ? 'rgba(255,255,255,.13)' : 'rgba(26,28,24,.15)',
    axis:   d ? 'rgba(255,255,255,.10)' : 'rgba(26,28,24,.10)',
    bg:     d ? '#08111f' : '#f7f8f3',
    blue:   '#2557a7',
    teal:   '#0e7490',
    green:  '#2d8a4e',
    red:    '#c0392b',
    amber:  '#c47a1e',
    purple: '#6d3fc0',
    orange: '#e07b39',
    cyan:   '#06b6d4',
    lblue:  '#5b9bd5',
  };
}

function calcMA(data, n) {
  return data.map((_, i) =>
    i < n - 1 ? null : +(data.slice(i - n + 1, i + 1).reduce((s, v) => s + +v, 0) / n).toFixed(0)
  );
}

const GRID  = (l = 52, r = 12, t = 28, b = 32) => ({ top: t, right: r, bottom: b, left: l, containLabel: false });
const ALB   = c => ({ color: c.text, fontSize: 10 });
const SPL   = c => ({ lineStyle: { color: c.grid, type: 'dashed' } });
const XAX   = (data, c, interval) => ({
  type: 'category', data,
  axisLine: { lineStyle: { color: c.axis } },
  axisTick: { show: false },
  axisLabel: { ...ALB(c), interval: interval ?? 'auto' },
});
const YAX   = (c, fmt, min) => ({
  type: 'value',
  min,
  axisLabel: { ...ALB(c), formatter: fmt },
  splitLine: SPL(c),
  axisLine: { show: false },
});

const TT = (c) => ({
  trigger: 'axis',
  backgroundColor: c.bg,
  borderColor: c.grid,
  textStyle: { color: c.text2, fontSize: 11 },
  axisPointer: { lineStyle: { color: c.grid } },
});

function lineSeries(data, color, opts = {}) {
  return {
    type: 'line', data, smooth: opts.smooth ?? true, symbol: 'none',
    color,
    lineStyle: { color, width: opts.width ?? 2 },
    itemStyle: { color },
    areaStyle: opts.area
      ? { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '44' }, { offset: 1, color: color + '00' }] } }
      : undefined,
    name: opts.name,
    ...opts.extra,
  };
}

/* ─────────────────────────────────────────────────────────────
   KPI FORMATTERS
───────────────────────────────────────────────────────────── */
const MON_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtPeriod(period) {
  if (!period) return '';
  const [y, m] = period.split('-');
  return `${MON_ABBR[+m - 1]} ${y.slice(2)}`;
}
function fmtLakhCr(raw) {
  const lc = +raw / 100000;
  return `₹${lc.toFixed(1)}L Cr`;
}
function fmtPct(raw)   { return `${(+raw).toFixed(1)}%`; }
function fmtRatio(raw) { return `${(+raw).toFixed(2)}`; }
function fmtCount(raw) {
  const n = +raw;
  return n >= 1000 ? `${(n / 1000).toFixed(0)}K` : `${Math.round(n)}`;
}
function fmtFyPeriod(p) {
  if (!p) return '';
  if (p.includes('-')) { const parts = p.split('-'); return 'FY' + parts[parts.length - 1].slice(-2); }
  return 'FY' + String(p).slice(-2);
}

/* ═════════════════════════════════════════════════════════════
   COMPONENT
═════════════════════════════════════════════════════════════ */
export default function MarketPulsePage({ isActive }) {
  useThemeWatcher();
  const [period,       setPeriod]       = useState('All');
  const [exchange,     setExchange]     = useState('Both');
  const [fromYear,     setFromYear]     = useState('2014');
  const [toYear,       setToYear]       = useState('2026');
  const [nseTurnType,  setNseTurnType]  = useState('area'); // 'area' | 'line' | 'bar'
  const [nseTurnMA,    setNseTurnMA]    = useState('Off');  // 'Off' | '3M' | '6M' | '12M'
  const [nseTurnLock,  setNseTurnLock]  = useState(false);

  const [kpi, setKpi] = useState({
    nseMcap:  { value: '—', sub: '' },
    bseMcap:  { value: '—', sub: '' },
    nseTurn:  { value: '—', sub: 'Latest month' },
    bseTurn:  { value: '—', sub: 'Latest month' },
    adRatio:  { value: '—', sub: 'Advance/Decline' },
    niftyVol: { value: '—', sub: 'Annualized' },
    mfCash:   { value: '—', sub: 'NSE cash participant category' },
    nseTop10: { value: '—', sub: 'Cash turnover concentration' },
    nseTrade: { value: '—', sub: '' },
  });

  useEffect(() => {
    const getLatest = rows => {
      const list = Array.isArray(rows) ? rows : (rows?.data || rows?.items || []);
      return list[list.length - 1] ?? null;
    };
    Promise.all([
      fetchMpKpiNseMcap().catch(() => []),
      fetchMpKpiBseMcap().catch(() => []),
      fetchMpKpiNseTurnover().catch(() => []),
      fetchMpKpiBseTurnover().catch(() => []),
      fetchMpKpiAdRatio().catch(() => []),
      fetchMpKpiNiftyVol().catch(() => []),
      fetchMpKpiNseTop10().catch(() => []),
      fetchMpKpiNseTraded().catch(() => []),
      fetchMpKpiMfCashShare().catch(() => []),
    ]).then(([nseMcapR, bseMcapR, nseTurnR, bseTurnR, adR, niftyVolR, top10R, tradeR, mfCashR]) => {
      const v = (r, fmt) => { const l = getLatest(r); return l ? fmt(l.value ?? l.metric_value ?? 0) : '—'; };
      const s = (r, pfx = '') => { const l = getLatest(r); return l ? pfx + fmtPeriod(l.period) : ''; };
      setKpi(prev => ({
        ...prev,
        nseMcap:  { value: v(nseMcapR,  fmtLakhCr), sub: s(nseMcapR,  'as of ') },
        bseMcap:  { value: v(bseMcapR,  fmtLakhCr), sub: s(bseMcapR,  'as of ') },
        nseTurn:  { value: v(nseTurnR,  fmtLakhCr), sub: s(nseTurnR)             },
        bseTurn:  { value: v(bseTurnR,  fmtLakhCr), sub: s(bseTurnR)             },
        adRatio:  { value: v(adR,       fmtRatio),  sub: s(adR)                  },
        niftyVol: { value: v(niftyVolR, fmtPct),    sub: 'Annualized'            },
        nseTop10: { value: v(top10R,    fmtPct),     sub: s(top10R)              },
        nseTrade: { value: v(tradeR,    fmtCount),  sub: s(tradeR)               },
        mfCash:   { value: v(mfCashR,   fmtPct),    sub: 'NSE cash participant category' },
      }));
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [miniData, setMiniData] = useState({
    mcap:   { months: [], nse: [], bse: [] },
    qty:    { months: [], values: [] },
    fyFlow: { labels: [], flows: [] },
  });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    Promise.all([
      fetchMpMiniMcap().catch(() => [[], []]),
      fetchMpMiniTradedQty().catch(() => [[], []]),
      fetchMpMiniFyFlows().catch(() => [[], []]),
    ]).then(([[nseRaw, bseRaw], [qtyNseRaw, qtyBseRaw], [purchRaw, salesRaw]]) => {
      const nseList    = toList(nseRaw);
      const bseList    = toList(bseRaw);
      const qtyNseList = toList(qtyNseRaw);
      const qtyBseList = toList(qtyBseRaw);
      const purchList  = toList(purchRaw);
      const salesList  = toList(salesRaw);

      // Align NSE+BSE mcap by period
      const nseMap = {}, bseMap = {};
      nseList.forEach(r => { nseMap[r.period] = +(r.value ?? r.metric_value ?? 0) / 100000; });
      bseList.forEach(r => { bseMap[r.period] = +(r.value ?? r.metric_value ?? 0) / 100000; });
      const allPeriods = [...new Set([...nseList.map(r => r.period), ...bseList.map(r => r.period)])].sort();

      // Merge NSE + BSE traded quantity by period
      const qtyNseMap = {}, qtyBseMap = {};
      qtyNseList.forEach(r => { qtyNseMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      qtyBseList.forEach(r => { qtyBseMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      const allQtyPeriods = [...new Set([...qtyNseList.map(r => r.period), ...qtyBseList.map(r => r.period)])].sort();

      // FY flows: net = gross_purchase - gross_sales
      const salesMap = {};
      salesList.forEach(r => { salesMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      const fyLabels = purchList.map(r => fmtFyPeriod(r.period));
      const fyFlows  = purchList.map(r => +(r.value ?? r.metric_value ?? 0) - (salesMap[r.period] ?? 0));

      setMiniData({
        mcap: {
          months:   allPeriods.map(fmtPeriod),
          nse:      allPeriods.map(p => nseMap[p] ?? null),
          bse:      allPeriods.map(p => bseMap[p] ?? null),
          combined: allPeriods.map(p => +((nseMap[p] ?? 0) + (bseMap[p] ?? 0)).toFixed(1)),
        },
        qty: {
          months: allQtyPeriods.map(fmtPeriod),
          values: allQtyPeriods.map(p => (qtyNseMap[p] ?? 0) + (qtyBseMap[p] ?? 0)),
        },
        fyFlow: { labels: fyLabels, flows: fyFlows },
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [turnData, setTurnData] = useState({ months: [], values: [] });

  useEffect(() => {
    fetchMpNseTurnover()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        setTurnData({
          months: list.map(r => fmtPeriod(r.period)),
          values: list.map(r => +((+(r.value ?? r.metric_value ?? 0)) / 100000).toFixed(2)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [avgTurnData, setAvgTurnData] = useState({ years: [], nse: [], bse: [] });

  useEffect(() => {
    function annualAvg(list) {
      const byYear = {};
      list.forEach(r => {
        const yr = r.period.split('-')[0];
        const val = +(r.value ?? r.metric_value ?? 0) / 100000;
        if (!byYear[yr]) byYear[yr] = [];
        byYear[yr].push(val);
      });
      const years = Object.keys(byYear).sort();
      return { years, avgs: years.map(y => +(byYear[y].reduce((a,b)=>a+b,0) / byYear[y].length).toFixed(2)) };
    }
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMpAvgTurnover()
      .then(([nseRaw, bseRaw]) => {
      const nse = annualAvg(toList(nseRaw));
      const bse = annualAvg(toList(bseRaw));
      const years = [...new Set([...nse.years, ...bse.years])].sort();
      const nseMap = Object.fromEntries(nse.years.map((y,i) => [y, nse.avgs[i]]));
      const bseMap = Object.fromEntries(bse.years.map((y,i) => [y, bse.avgs[i]]));
        setAvgTurnData({ years, nse: years.map(y => nseMap[y] ?? null), bse: years.map(y => bseMap[y] ?? null) });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [peakMcapData, setPeakMcapData] = useState({ years: [], peaks: [] });

  useEffect(() => {
    fetchMpPeakMcap()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        const byYear = {};
        list.forEach(r => {
          const yr = r.period.split('-')[0];
          const val = +(r.value ?? r.metric_value ?? 0) / 100000;
          if (byYear[yr] === undefined || val > byYear[yr]) byYear[yr] = val;
        });
        const years = Object.keys(byYear).sort();
        setPeakMcapData({ years, peaks: years.map(y => +byYear[y].toFixed(1)) });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [memberConcData, setMemberConcData] = useState({ months: [], top5: [], top10: [], top25: [] });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMpMemberConc()
      .then(([r5, r10, r25]) => {
      const l5 = toList(r5), l10 = toList(r10), l25 = toList(r25);
      const map10 = {}, map25 = {};
      l10.forEach(r => { map10[r.period] = +(r.value ?? r.metric_value ?? 0); });
      l25.forEach(r => { map25[r.period] = +(r.value ?? r.metric_value ?? 0); });
      setMemberConcData({
        months: l5.map(r => fmtPeriod(r.period)),
        top5:   l5.map(r => +(r.value ?? r.metric_value ?? 0)),
        top10:  l5.map(r => map10[r.period] ?? null),
        top25:  l5.map(r => map25[r.period] ?? null),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [tradFreqData, setTradFreqData] = useState({ months: [], listed: [], traded: [], ratio: [] });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMpTradingFreq()
      .then(([listedRaw, tradedRaw, ratioRaw]) => {
      const l67 = toList(listedRaw);
      const map68 = {}, map161 = {};
      toList(tradedRaw).forEach(r => { map68[r.period]  = +(r.value ?? r.metric_value ?? 0); });
      toList(ratioRaw).forEach(r  => { map161[r.period] = +(r.value ?? r.metric_value ?? 0); });
      setTradFreqData({
        months: l67.map(r => fmtPeriod(r.period)),
        listed: l67.map(r => +(r.value ?? r.metric_value ?? 0)),
        traded: l67.map(r => map68[r.period]  ?? null),
        ratio:  l67.map(r => map161[r.period] ?? null),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [secConcData, setSecConcData] = useState({ months: [], top5: [], top25: [], top100: [] });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMpSecConc()
      .then(([r5, r25, r100]) => {
      const l5 = toList(r5);
      const map25 = {}, map100 = {};
      toList(r25).forEach(r  => { map25[r.period]  = +(r.value ?? r.metric_value ?? 0); });
      toList(r100).forEach(r => { map100[r.period] = +(r.value ?? r.metric_value ?? 0); });
      setSecConcData({
        months: l5.map(r => fmtPeriod(r.period)),
        top5:   l5.map(r => +(r.value ?? r.metric_value ?? 0)),
        top25:  l5.map(r => map25[r.period]  ?? null),
        top100: l5.map(r => map100[r.period] ?? null),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [breadthData, setBreadthData] = useState({ months: [], advances: [], declines: [] });
  const [volData,     setVolData]     = useState({ months: [], sensex: [], nifty: [] });
  const [partMixData, setPartMixData] = useState({ months: [], fpi: [], mf: [], prop: [], others: [], banks: [] });
  const [loadCount, setLoadCount] = useState(0);
  const TOTAL_LOADS = 11;
  const loading = loadCount < TOTAL_LOADS;

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMpBreadth()
      .then(([advRaw, decRaw]) => {
      const advList = toList(advRaw);
      const decMap  = {};
      toList(decRaw).forEach(r => { decMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      setBreadthData({
        months:   advList.map(r => fmtPeriod(r.period)),
        advances: advList.map(r => +(r.value ?? r.metric_value ?? 0)),
        declines: advList.map(r => decMap[r.period] ?? null),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMpVolatility()
      .then(([sensexRaw, niftyRaw]) => {
      const sensexList = toList(sensexRaw);
      const niftyMap   = {};
      toList(niftyRaw).forEach(r => { niftyMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      setVolData({
        months: sensexList.map(r => fmtPeriod(r.period)),
        sensex: sensexList.map(r => +(r.value ?? r.metric_value ?? 0)),
        nifty:  sensexList.map(r => niftyMap[r.period] ?? null),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchMpParticipantMix()
      .then(([fpiRaw, mfRaw, propRaw, othersRaw, banksRaw]) => {
        const fpiList = toList(fpiRaw);
        const buildMap = raw => { const m = {}; toList(raw).forEach(r => { m[r.period] = +(r.value ?? r.metric_value ?? 0); }); return m; };
        const mfMap     = buildMap(mfRaw);
        const propMap   = buildMap(propRaw);
        const othersMap = buildMap(othersRaw);
        const banksMap  = buildMap(banksRaw);
        setPartMixData({
          months: fpiList.map(r => fmtPeriod(r.period)),
          fpi:    fpiList.map(r => +(r.value ?? r.metric_value ?? 0)),
          mf:     fpiList.map(r => mfMap[r.period]     ?? null),
          prop:   fpiList.map(r => propMap[r.period]   ?? null),
          others: fpiList.map(r => othersMap[r.period] ?? null),
          banks:  fpiList.map(r => banksMap[r.period]  ?? null),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  /* ── Filter helpers — always filter by fromYear/toYear ── */
  const fByMon = (months, ...arrs) => {
    const from = +fromYear, to = +toYear;
    const fi = months.reduce((acc, m, i) => { const yr = 2000 + +m.slice(-2); if (yr >= from && yr <= to) acc.push(i); return acc; }, []);
    return [fi.map(i => months[i]), ...arrs.map(a => fi.map(i => a[i]))];
  };
  const fByYr = (years, ...arrs) => {
    const from = +fromYear, to = +toYear;
    const fi = years.reduce((acc, y, i) => { if (+y >= from && +y <= to) acc.push(i); return acc; }, []);
    return [fi.map(i => years[i]), ...arrs.map(a => fi.map(i => a[i]))];
  };
  const fByFy = (labels, ...arrs) => {
    const from = +fromYear, to = +toYear;
    const fi = labels.reduce((acc, l, i) => { const yr = 2000 + +(l.replace('FY', '')); if (yr >= from && yr <= to) acc.push(i); return acc; }, []);
    return [fi.map(i => labels[i]), ...arrs.map(a => fi.map(i => a[i]))];
  };

  /* chart refs */
  const miniMcapRef     = useRef(null);
  const miniQtyRef      = useRef(null);
  const miniFyFlowRef   = useRef(null);
  const largeMcapRef    = useRef(null);
  const nseTurnRef      = useRef(null);
  const avgTurnRef      = useRef(null);
  const peakMcapRef     = useRef(null);
  const memberConcRef   = useRef(null);
  const tradFreqRef     = useRef(null);
  const secConcRef      = useRef(null);
  const breadthRef      = useRef(null);
  const volRef          = useRef(null);
  const partMixRef      = useRef(null);

  /* ── Mini chart 1: Market Capitalisation (live NSE + BSE, filtered) ── */
  useChart(miniMcapRef, () => {
    const c = cc();
    const [fM, fComb] = fByMon(miniData.mcap.months, miniData.mcap.combined);
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 8, 22, 26),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/>NSE+BSE: <b>₹${(+p[0].value).toFixed(1)}L Cr</b>` },
      xAxis: XAX(fM, c, Math.max(1, Math.floor(fM.length / 5))),
      yAxis: { ...YAX(c, v => v + 'L'), min: 0 },
      series: [lineSeries(fComb, c.teal, { name: 'NSE+BSE', area: true })],
    };
  });

  /* ── Mini chart 2: Traded Quantity (live NSE+BSE, filtered) ── */
  useChart(miniQtyRef, () => {
    const c = cc();
    const [fM, fV] = fByMon(miniData.qty.months, miniData.qty.values);
    const maxVal = fV.length ? Math.max(...fV) : 1;
    const divisor = maxVal >= 100000 ? 100000 : maxVal >= 1000 ? 1000 : 1;
    const unit    = maxVal >= 100000 ? 'L' : maxVal >= 1000 ? 'K' : '';
    return {
      backgroundColor: 'transparent',
      grid: GRID(52, 8, 22, 26),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/>NSE+BSE: <b>${(+p[0].value / divisor).toFixed(1)}${unit}</b> Lakh shares` },
      xAxis: XAX(fM, c, Math.max(1, Math.floor(fM.length / 5))),
      yAxis: { ...YAX(c, v => (v / divisor).toFixed(0) + unit), min: 0 },
      series: [lineSeries(fV, c.amber, { name: 'Traded Qty', area: true })],
    };
  });

  /* ── Mini chart 3: FY Net Equity Flows (live, filtered) ── */
  useChart(miniFyFlowRef, () => {
    const c = cc();
    const [labels, flows] = fByFy(miniData.fyFlow.labels, miniData.fyFlow.flows);
    const maxAbs = flows.length ? Math.max(...flows.map(Math.abs)) : 1;
    const divisor = maxAbs >= 100000 ? 100000 : maxAbs >= 1000 ? 1000 : 1;
    const unit    = maxAbs >= 100000 ? 'L Cr' : maxAbs >= 1000 ? 'K Cr' : 'Cr';
    return {
      backgroundColor: 'transparent',
      grid: GRID(52, 8, 22, 26),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>₹${(+p[0].value / divisor).toFixed(1)} ${unit}</b>` },
      xAxis: XAX(labels, c),
      yAxis: {
        type: 'value',
        axisLabel: { ...ALB(c), formatter: v => (v / divisor).toFixed(0) + unit },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'line',
        data: flows,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: c.red, width: 2 },
        itemStyle: { color: c.red },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: c.grid, type: 'dashed', width: 1 },
          data: [{ yAxis: 0 }],
        },
      }],
    };
  });

  /* ── Large chart: NSE + BSE Market Capitalisation (live, filtered) ── */
  useChart(largeMcapRef, () => {
    const c = cc();
    const { months, nse, bse } = miniData.mcap;
    const from = +fromYear, to = +toYear;
    const fi = months.reduce((acc, m, i) => { const yr = 2000 + +m.slice(-2); if (yr >= from && yr <= to) acc.push(i); return acc; }, []);
    const fM = fi.map(i => months[i]);
    const fN = fi.map(i => nse[i]);
    const fB = fi.map(i => bse[i]);
    return {
      backgroundColor: 'transparent',
      grid: GRID(52, 16, 44, 36),
      legend: {
        data: [
          { name: 'NSE Market Cap', textStyle: { color: c.blue, fontSize: 10 } },
          { name: 'BSE Market Cap', textStyle: { color: c.teal, fontSize: 10 } },
        ],
        top: 4, right: 16,
        itemWidth: 12, itemHeight: 12,
      },
      tooltip: {
        ...TT(c),
        formatter: p => `${p[0].axisValue}<br/>` +
          p.map(s => `${s.marker}${s.seriesName}: <b>₹${(+s.value).toFixed(1)}L Cr</b>`).join('<br/>'),
      },
      xAxis: XAX(fM, c, Math.max(1, Math.floor(fM.length / 10))),
      yAxis: { ...YAX(c, v => v.toFixed(0) + 'L'), min: 0 },
      series: [
        { ...lineSeries(fN, c.blue, { name: 'NSE Market Cap', smooth: true, width: 1.5 }), name: 'NSE Market Cap' },
        { ...lineSeries(fB, c.teal, { name: 'BSE Market Cap', smooth: true, width: 1.5 }), name: 'BSE Market Cap' },
      ],
    };
  });

  /* ── NSE Monthly Turnover (interactive: chart type + MA, live data, filtered) ── */
  useChart(nseTurnRef, () => {
    const c = cc();
    const { months, values } = turnData;
    const from = +fromYear, to = +toYear;
    const fi = months.reduce((acc, m, i) => { const yr = 2000 + +m.slice(-2); if (yr >= from && yr <= to) acc.push(i); return acc; }, []);
    const fM = fi.map(i => months[i]);
    const fV = fi.map(i => values[i]);
    const maPeriods = { '3M': 3, '6M': 6, '12M': 12 };
    const maWindow  = maPeriods[nseTurnMA];
    const maData    = maWindow ? calcMA(fV, maWindow) : null;
    const mainSeries = nseTurnType === 'bar'
      ? { type: 'bar', name: 'Turnover', data: fV, barMaxWidth: 4,
          itemStyle: { color: c.green + 'bb', borderRadius: [1, 1, 0, 0] } }
      : { ...lineSeries(fV, c.green, { area: nseTurnType === 'area', smooth: false, width: 1.5 }), name: 'Turnover' };
    return {
      backgroundColor: 'transparent',
      grid: GRID(54, 12, 28, 32),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/>` +
        p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>₹${s.value} L Cr</b>`).join('<br/>') },
      xAxis: XAX(fM, c, Math.max(1, Math.floor(fM.length / 8))),
      yAxis: { ...YAX(c, v => v + 'L'), min: 0 },
      series: [
        mainSeries,
        ...(maData ? [{ type: 'line', name: `MA ${nseTurnMA}`, data: maData, smooth: true,
            symbol: 'none', lineStyle: { color: c.amber, width: 1.5, type: 'dashed' },
            itemStyle: { color: c.amber } }] : []),
      ],
    };
  });

  /* ── Avg Monthly Turnover NSE vs BSE (annual avg, live, filtered) ── */
  useChart(avgTurnRef, () => {
    const c = cc();
    const [fYears, fNse, fBse] = fByYr(avgTurnData.years, avgTurnData.nse, avgTurnData.bse);
    return {
      backgroundColor: 'transparent',
      grid: GRID(54, 12, 28, 32),
      legend: { data: ['NSE', 'BSE'], top: 4, right: 8, textStyle: { color: c.text, fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/>` +
        p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>₹${s.value} L Cr/month</b>`).join('<br/>') },
      xAxis: XAX(fYears, c),
      yAxis: { ...YAX(c, v => v + 'L'), min: 0 },
      series: [
        { type: 'bar', name: 'NSE', data: fNse, barMaxWidth: 42, itemStyle: { color: c.blue,  borderRadius: [2,2,0,0] } },
        { type: 'bar', name: 'BSE', data: fBse, barMaxWidth: 42, itemStyle: { color: c.teal, borderRadius: [2,2,0,0] } },
      ],
    };
  });

  /* ── NSE Peak Market Cap by Year (bar, live, filtered) ── */
  useChart(peakMcapRef, () => {
    const c = cc();
    const [fYears, fPeaks] = fByYr(peakMcapData.years, peakMcapData.peaks);
    return {
      backgroundColor: 'transparent',
      grid: GRID(52, 12, 28, 32),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/>Peak Market Cap: <b>₹${(+p[0].value).toFixed(1)}L Cr</b>` },
      xAxis: XAX(fYears, c),
      yAxis: { ...YAX(c, v => v + 'L'), min: 0 },
      series: [{
        type: 'bar', barMaxWidth: 55,
        data: fPeaks.map((v, i) => ({
          value: v,
          itemStyle: { color: i < fPeaks.length - 1 ? c.purple + 'cc' : c.purple, borderRadius: [2, 2, 0, 0] },
        })),
      }],
    };
  });

  /* ── NSE Member Concentration (3 lines, live, filtered) ── */
  useChart(memberConcRef, () => {
    const c = cc();
    const [fM, fT5, fT10, fT25] = fByMon(memberConcData.months, memberConcData.top5, memberConcData.top10, memberConcData.top25);
    return {
      backgroundColor: 'transparent',
      grid: GRID(46, 12, 28, 32),
      legend: {
        data: ['Top 5', 'Top 10', 'Top 25'],
        top: 4, right: 8,
        textStyle: { color: c.text, fontSize: 10 },
        itemWidth: 10, itemHeight: 10,
      },
      tooltip: {
        ...TT(c),
        formatter: p => `${p[0].axisValue}<br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(1)}%</b>`).join('<br/>'),
      },
      xAxis: XAX(fM, c, Math.max(1, Math.floor(fM.length / 8))),
      yAxis: { ...YAX(c, v => v + '%'), min: 0 },
      series: [
        { ...lineSeries(fT5,  c.blue,   { smooth: true }), name: 'Top 5',  itemStyle: { color: c.blue   } },
        { ...lineSeries(fT10, c.lblue,  { smooth: true }), name: 'Top 10', itemStyle: { color: c.lblue  } },
        { ...lineSeries(fT25, c.orange, { smooth: true }), name: 'Top 25', itemStyle: { color: c.orange } },
      ],
    };
  });

  /* ── NSE Trading Frequency (combo: bar + line, live, filtered) ── */
  useChart(tradFreqRef, () => {
    const c = cc();
    const [fM, fListed, fTraded, fRatio] = fByMon(tradFreqData.months, tradFreqData.listed, tradFreqData.traded, tradFreqData.ratio);
    return {
      backgroundColor: 'transparent',
      grid: GRID(54, 50, 28, 32),
      legend: {
        data: ['Listed Cos', 'Traded Securities', 'Reported Traded/List Ratio'],
        top: 4, right: 4,
        textStyle: { color: c.text, fontSize: 9.5 },
        itemWidth: 10, itemHeight: 10,
      },
      tooltip: {
        ...TT(c),
        formatter: p => `${p[0].axisValue}<br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${s.value}</b>`).join('<br/>'),
      },
      xAxis: XAX(fM, c, Math.max(1, Math.floor(fM.length / 10))),
      yAxis: [
        { ...YAX(c, v => v, 0), name: 'Count', nameTextStyle: { color: c.text, fontSize: 9 } },
        { type: 'value', min: 0, axisLabel: { ...ALB(c), formatter: v => v.toFixed(2) }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { type: 'bar', name: 'Listed Cos',           data: fListed, yAxisIndex: 0, barMaxWidth: 6, itemStyle: { color: c.green + 'cc', borderRadius: [1, 1, 0, 0] } },
        { type: 'bar', name: 'Traded Securities',    data: fTraded, yAxisIndex: 0, barMaxWidth: 6, itemStyle: { color: c.teal  + 'cc', borderRadius: [1, 1, 0, 0] } },
        { type: 'line', name: 'Reported Traded/List Ratio', data: fRatio, yAxisIndex: 1, smooth: true, symbol: 'circle', symbolSize: 3, lineStyle: { color: c.orange, width: 1.5 }, itemStyle: { color: c.orange } },
      ],
    };
  });

  /* ── NSE Security-Level Turnover Concentration (live, filtered) ── */
  useChart(secConcRef, () => {
    const c = cc();
    const [fM, fT5, fT25, fT100] = fByMon(secConcData.months, secConcData.top5, secConcData.top25, secConcData.top100);
    return {
      backgroundColor: 'transparent',
      grid: GRID(46, 12, 32, 32),
      legend: {
        data: ['Top 5 Securities', 'Top 25 Securities', 'Top 100 Securities'],
        top: 4, right: 8,
        textStyle: { color: c.text, fontSize: 10 },
        itemWidth: 10, itemHeight: 10,
      },
      tooltip: {
        ...TT(c),
        formatter: p => `${p[0].axisValue}<br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(1)}%</b>`).join('<br/>'),
      },
      xAxis: XAX(fM, c, Math.max(1, Math.floor(fM.length / 8))),
      yAxis: { ...YAX(c, v => v + '%'), min: 0 },
      series: [
        { ...lineSeries(fT5,   c.cyan,   { smooth: true, area: true, width: 1.5 }), name: 'Top 5 Securities',   itemStyle: { color: c.cyan   } },
        { ...lineSeries(fT25,  c.lblue,  { smooth: true, area: true, width: 1.5 }), name: 'Top 25 Securities',  itemStyle: { color: c.lblue  } },
        { ...lineSeries(fT100, c.purple, { smooth: true, area: true, width: 1.5 }), name: 'Top 100 Securities', itemStyle: { color: c.purple } },
      ],
    };
  });

  /* ── NSE Market Breadth (stacked bar, filtered) ── */
  useChart(breadthRef, () => {
    const c = cc();
    const [fM, fAdv, fDec] = fByMon(breadthData.months, breadthData.advances, breadthData.declines);
    return {
      backgroundColor: 'transparent',
      grid: GRID(48, 12, 28, 32),
      legend: {
        data: ['Advances', 'Declines'],
        top: 4, right: 8,
        textStyle: { color: c.text, fontSize: 10 },
        itemWidth: 10, itemHeight: 10,
      },
      tooltip: {
        ...TT(c), trigger: 'axis',
        formatter: p => `${p[0].axisValue}<br/>` +
          p.map(s => `${s.marker}${s.seriesName}: <b>${s.value}</b>`).join('<br/>'),
      },
      xAxis: XAX(fM, c, Math.floor(fM.length / 10) || 1),
      yAxis: { ...YAX(c, v => v), min: 0 },
      series: [
        { type: 'bar', name: 'Advances', data: fAdv, stack: 'breadth', barMaxWidth: 6, itemStyle: { color: c.green + 'cc' } },
        { type: 'bar', name: 'Declines', data: fDec, stack: 'breadth', barMaxWidth: 6, itemStyle: { color: c.red   + 'cc' } },
      ],
    };
  });

  /* ── Index Volatility (filtered) ── */
  useChart(volRef, () => {
    const c = cc();
    const [fM, fSensex, fNifty] = fByMon(volData.months, volData.sensex, volData.nifty);
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 12, 28, 32),
      legend: {
        data: ['Sensex', 'Nifty'],
        top: 4, right: 8,
        textStyle: { color: c.text, fontSize: 10 },
        itemWidth: 10, itemHeight: 10,
      },
      tooltip: {
        ...TT(c),
        formatter: p => `${p[0].axisValue}<br/>` +
          p.map(s => `${s.marker}${s.seriesName}: <b>${s.value}%</b>`).join('<br/>'),
      },
      xAxis: XAX(fM, c, Math.floor(fM.length / 8) || 1),
      yAxis: { ...YAX(c, v => v + '%'), min: 0 },
      series: [
        { ...lineSeries(fSensex, c.teal,  { smooth: false, width: 1.5 }), name: 'Sensex', itemStyle: { color: c.teal  } },
        { ...lineSeries(fNifty,  c.green, { smooth: false, width: 1.5 }), name: 'Nifty',  itemStyle: { color: c.green } },
      ],
    };
  });

  /* ── NSE Cash Market Participant Mix (stacked area, filtered) ── */
  useChart(partMixRef, () => {
    const c = cc();
    const [fM, fFpi, fMf, fProp, fOthers, fBanks] = fByMon(partMixData.months, partMixData.fpi, partMixData.mf, partMixData.prop, partMixData.others, partMixData.banks);
    const mkSeries = (name, data, color) => ({
      type: 'line', name, data, smooth: true, symbol: 'none',
      stack: 'partmix',
      lineStyle:  { color, width: 1 },
      areaStyle:  { color: color + 'cc' },
      itemStyle:  { color },
    });
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 12, 28, 36),
      legend: {
        data: ['FPI', 'Mutual Funds', 'Proprietary', 'Others', 'Banks'],
        bottom: 0, left: 'center',
        textStyle: { color: c.text, fontSize: 9.5 },
        itemWidth: 10, itemHeight: 10,
      },
      tooltip: {
        ...TT(c), trigger: 'axis',
        formatter: p => `${p[0].axisValue}<br/>` +
          p.map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(1)}%</b>`).join('<br/>'),
      },
      xAxis: XAX(fM, c, Math.floor(fM.length / 8) || 1),
      yAxis: { ...YAX(c, v => v + '%'), min: 0, max: 120 },
      series: [
        mkSeries('FPI',          fFpi,    c.blue),
        mkSeries('Mutual Funds', fMf,     c.teal),
        mkSeries('Proprietary',  fProp,   c.orange),
        mkSeries('Others',       fOthers, c.purple),
        mkSeries('Banks',        fBanks,  '#8a9bb0'),
      ],
    };
  });

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  const kpiRow1 = [
    { label: 'NSE MARKET CAP',       value: kpi.nseMcap.value,  sub: kpi.nseMcap.sub,  color: 'var(--teal)'  },
    { label: 'BSE MARKET CAP',       value: kpi.bseMcap.value,  sub: kpi.bseMcap.sub,  color: 'var(--blue)'  },
    { label: 'NSE MONTHLY TURNOVER', value: kpi.nseTurn.value,  sub: kpi.nseTurn.sub,  color: 'var(--green)' },
    { label: 'BSE MONTHLY TURNOVER', value: kpi.bseTurn.value,  sub: kpi.bseTurn.sub,  color: 'var(--amber)' },
  ];
  const kpiRow2 = [
    { label: 'A/D RATIO (NSE)',        value: kpi.adRatio.value,  sub: kpi.adRatio.sub  },
    { label: 'NIFTY VOLATILITY',       value: kpi.niftyVol.value, sub: kpi.niftyVol.sub },
    { label: 'MUTUAL FUND CASH SHARE', value: kpi.mfCash.value,   sub: kpi.mfCash.sub   },
    { label: 'NSE TOP 10 MEMBERS',     value: kpi.nseTop10.value, sub: kpi.nseTop10.sub },
    { label: 'NSE TRADED SECURITIES',  value: kpi.nseTrade.value, sub: kpi.nseTrade.sub },
  ];

  const periodOpts   = ['1Y', '3Y', '5Y', 'All'];
  const exchangeOpts = ['NSE', 'BSE', 'Both'];
  const fromYears    = ['2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026'];
  const toYears      = ['2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026'];

  return (
    <div className={`page${isActive ? ' on' : ''}`} id="page-mp" style={{display: isActive ? 'flex' : 'none', flexDirection:'column', height:'100%', overflow:'hidden'}}>
      <div className="mp-scroll" style={{flex:'1 1 0', minHeight:0, height:0, overflowY:'scroll', display:'flex', flexDirection:'column', gap:14, padding:'18px 20px 40px'}}>

        {/* ── SECTION 1 — Header ── */}
        <div className="mp-hdr">
          <div className="mp-hdr-left">
            <h1 className="mp-title">Market Pulse</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="mp-sub">NSE &amp; BSE equity cash market — turnover, market cap &amp; listed companies</span>
              {/* <span className="mp-badge mp-badge-filter" style={{ flexShrink: 0 }}>{period === 'All' ? 'All years' : `Showing: ${fromYear}–${toYear}`}</span> */}
            </div>
          </div>
        </div>

        {/* ── Filter row ── */}
        <div className="mp-filter-row">
          <div className="mp-pill-grp">
            {periodOpts.map(p => (
              <button
                key={p}
                className={`mp-pill${period === p ? ' on' : ''}`}
                onClick={() => {
                  const yr = new Date().getFullYear();
                  setPeriod(p);
                  if (p === '1Y')  { setFromYear(String(yr - 1)); setToYear(String(yr)); }
                  else if (p === '3Y')  { setFromYear(String(yr - 3)); setToYear(String(yr)); }
                  else if (p === '5Y')  { setFromYear(String(yr - 5)); setToYear(String(yr)); }
                  else if (p === 'All') { setFromYear('2014');          setToYear(String(yr)); }
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <span className="mp-filter-lbl">From</span>
          <select className="mp-sel" value={fromYear} onChange={e => { setFromYear(e.target.value); setPeriod(''); }}>
            {fromYears.map(y => <option key={y}>{y}</option>)}
          </select>
          <span className="mp-filter-lbl">To</span>
          <select className="mp-sel" value={toYear} onChange={e => { setToYear(e.target.value); setPeriod(''); }}>
            {toYears.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>

        {/* ── SECTION 2 — KPI strip (all cards in one row) ── */}
        <div className="mp-kpi-strip mp-kpi-strip-all">
          {[...kpiRow1, ...kpiRow2].map(k => (
            <div key={k.label} className="mp-kpi-card">
              <span className="mp-kpi-label">{k.label}</span>
              <span className="mp-kpi-val">{k.value}</span>
              <span className="mp-kpi-sub">{k.sub}</span>
            </div>
          ))}
        </div>

        {/* ── SECTION 4 — "Cash Market Signals Are Mixed" mini charts ── */}
        <div className="mp-card mp-signals-card">
          <div className="mp-card-hdr">
            <div className="mp-card-hdr-left">
              
              <span className="mp-card-title">Cash Market Signals Are Mixed</span>
              <span className="mp-badge mp-badge-both">NSE+BSE</span>
            </div>
            <span className="mp-card-sub">Market cap, traded quantity, and verified FY equity-flow proxies</span>
          </div>
          <div className="mp-mini-grid">
            <div className="mp-mini-item">
              <div className="mp-mini-label">Market capitalisation
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(miniMcapRef.current, 'Market capitalisation')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              <div className="mp-mini-sub">NSE+BSE · ₹ lakh crore</div>
              {loading ? <div className="chart-loader" style={{minHeight: 160}} /> : <div ref={miniMcapRef} className="mp-chart-canvas mp-chart-mini" />}
            </div>
            <div className="mp-mini-item">
              <div className="mp-mini-label">Traded quantity
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(miniQtyRef.current, 'Traded quantity')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              <div className="mp-mini-sub">NSE+BSE · lakh shares</div>
              {loading ? <div className="chart-loader" style={{minHeight: 160}} /> : <div ref={miniQtyRef} className="mp-chart-canvas mp-chart-mini" />}
            </div>
            <div className="mp-mini-item">
              <div className="mp-mini-label">FY net equity flows
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(miniFyFlowRef.current, 'FY net equity flows')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              <div className="mp-mini-sub">₹ crore</div>
              {loading ? <div className="chart-loader" style={{minHeight: 160}} /> : <div ref={miniFyFlowRef} className="mp-chart-canvas mp-chart-mini" />}
            </div>
          </div>
        </div>

        {/* ── SECTION 5 — Large NSE+BSE Market Capitalisation chart ── */}
        <div className="mp-card">
          <div className="mp-card-hdr">
            <div className="mp-card-hdr-left">
              <span className="mp-card-title">NSE + BSE Market Capitalisation</span>
              {/* <span className="mp-badge mp-badge-filter">{period === 'All' ? 'All years' : `Filtered: ${fromYear}–${toYear}`}</span> */}
            </div>
            <span className="mp-card-sub">₹ Lakh Crore · {period === 'All' ? 'full history' : `${fromYear}–${toYear}`}</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(largeMcapRef.current, 'NSE + BSE Market Capitalisation')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          {loading ? <div className="chart-loader" style={{minHeight: 280}} /> : <div ref={largeMcapRef} className="mp-chart-canvas mp-chart-large" />}
        </div>

        {/* ── SECTION 6 — Two charts side by side ── */}
        <div className="mp-row2">
          {/* NSE Monthly Turnover — with chart-type / MA / camera / lock controls */}
          <div className="mp-card">
            <div className="mp-card-hdr mp-card-hdr-ctrl">
              <div className="mp-card-hdr-left" style={{ flexDirection:'column', alignItems:'flex-start', gap:2 }}>
                <span className="mp-card-title">NSE Monthly Turnover</span>
                <span className="mp-card-sub" style={{ whiteSpace:'normal' }}>₹ Lakh Crore · full history</span>
              </div>
              
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(nseTurnRef.current, 'NSE Monthly Turnover')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={nseTurnRef} className="mp-chart-canvas mp-chart-normal" />}
          </div>

          {/* Avg Monthly Turnover — annual avg */}
          <div className="mp-card">
            <div className="mp-card-hdr">
              <div className="mp-card-hdr-left">
                <span className="mp-card-title">Avg Monthly Turnover: NSE vs BSE</span>
                <span className="mp-badge mp-badge-blue">annual avg</span>
              </div>
              <span className="mp-card-sub">₹ Lakh Crore per month</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(avgTurnRef.current, 'Avg Monthly Turnover: NSE vs BSE')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={avgTurnRef} className="mp-chart-canvas mp-chart-normal" />}
          </div>
        </div>

        {/* ── SECTION 7 — NSE Peak Market Cap by Year ── */}
        <div className="mp-card">
          <div className="mp-card-hdr">
            <span className="mp-card-title">NSE Peak Market Cap by Year</span>
            <span className="mp-card-sub">₹ Lakh Crore · 2015—2026</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(peakMcapRef.current, 'NSE Peak Market Cap by Year')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={peakMcapRef} className="mp-chart-canvas mp-chart-normal" />}
        </div>

        {/* ── SECTION 8 — Member Concentration + Trading Frequency ── */}
        <div className="mp-row2">
          <div className="mp-card">
            <div className="mp-card-hdr">
              <span className="mp-card-title">NSE Member Concentration</span>
              <span className="mp-card-sub">% cash turnover · Top 5 / 10 / 25 members</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(memberConcRef.current, 'NSE Member Concentration')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={memberConcRef} className="mp-chart-canvas mp-chart-normal" />}
          </div>
          <div className="mp-card">
            <div className="mp-card-hdr">
              <span className="mp-card-title">NSE Trading Frequency</span>
              <span className="mp-card-sub">Listed Companies vs Traded Securities · ratio overlay</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(tradFreqRef.current, 'NSE Trading Frequency')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={tradFreqRef} className="mp-chart-canvas mp-chart-normal" />}
          </div>
        </div>

        {/* ── SECTION 9 — Security-Level Turnover Concentration ── */}
        <div className="mp-card">
          <div className="mp-card-hdr">
            <span className="mp-card-title">NSE Security-Level Turnover Concentration</span>
            <span className="mp-card-sub">% of total turnover · Top 5 / 25 / 100 securities</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(secConcRef.current, 'NSE Security-Level Turnover Concentration')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={secConcRef} className="mp-chart-canvas mp-chart-normal" />}
        </div>

        {/* ── SECTION 10 — NSE Market Breadth ── */}
        <div className="mp-card">
          <div className="mp-card-hdr">
            <span className="mp-card-title">NSE Market Breadth</span>
            <span className="mp-card-sub">Advances vs Declines · Jan 14 — Mar 26</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(breadthRef.current, 'NSE Market Breadth')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={breadthRef} className="mp-chart-canvas mp-chart-normal" />}
        </div>

        {/* ── SECTION 11 — Index Volatility + Participant Mix ── */}
        <div className="mp-row2">
          <div className="mp-card">
            <div className="mp-card-hdr">
              <span className="mp-card-title">Index Volatility</span>
              <span className="mp-card-sub">Annualized % · Sensex &amp; Nifty</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(volRef.current, 'Index Volatility')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={volRef} className="mp-chart-canvas mp-chart-normal" />}
          </div>
          <div className="mp-card">
            <div className="mp-card-hdr">
              <span className="mp-card-title">NSE Cash Market Participant Mix</span>
              <span className="mp-card-sub">Stacked area · FPI, Mutual Funds, Prop, Others, Banks</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(partMixRef.current, 'NSE Cash Market Participant Mix')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {loading ? <div className="chart-loader" style={{minHeight: 220}} /> : <div ref={partMixRef} className="mp-chart-canvas mp-chart-normal" />}
          </div>
        </div>

      </div>

      {/* ── Scoped styles ── */}
      <style>{`
        /* ─── Scroll container ─── */
        .mp-scroll {
          flex: 1 1 0;          /* flex-basis:0 + min-height:0 forces bounded height */
          min-height: 0;
          overflow-y: scroll;
          padding: 18px 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .mp-scroll > * { flex-shrink: 0; }
        .mp-scroll::-webkit-scrollbar { width: 6px; }
        .mp-scroll::-webkit-scrollbar-track { background: transparent; }
        .mp-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,.35); border-radius: 3px; }
        .mp-scroll::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,.6); }

        /* ─── Header ─── */
        .mp-hdr {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          padding-bottom: 4px;
        }
        .mp-hdr-left { display: flex; flex-direction: column; gap: 3px; }
        .mp-title {
          font-size: 20px; font-weight: 800; color: var(--tx);
          letter-spacing: -.5px; line-height: 1;
        }
        .mp-sub { font-size: 11.5px; color: var(--tx3); }

        /* ─── Filter row ─── */
        .mp-filter-row {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          // padding: 8px 20px;
        }
        .mp-filter-lbl { font-size: 11.5px; color: var(--tx3); }
        .mp-pill-grp {
          display: flex;
          background: var(--sf2);
          border: 1px solid var(--bdr2);
          border-radius: 8px;
          overflow: hidden;
        }
        .mp-pill {
          padding: 5px 11px; font-size: 11.5px; font-weight: 500;
          color: var(--tx3); background: none; border: none;
          border-right: 1px solid var(--bdr);
          cursor: pointer; transition: all .12s; font-family: var(--fn);
          user-select: none;
        }
        .mp-pill:last-child { border-right: none; }
        .mp-pill:hover { color: var(--tx); background: var(--sf3); }
        .mp-pill.on {
          background: var(--acc); color: #fff; font-weight: 600;
        }
        [data-theme="dark"] .mp-pill.on {
          background: var(--sf3); color: var(--tx);
        }
        .mp-sel {
          padding: 5px 24px 5px 9px; font-size: 11.5px;
          border: 1px solid var(--bdr2); border-radius: 7px;
          background: var(--sf2); color: var(--tx);
          font-family: var(--fn); outline: none; cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239a9d92' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 7px center;
          transition: background .2s;
        }
        .mp-sel:focus { border-color: var(--green); }

        /* ─── KPI strip ─── */
        .mp-kpi-strip {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          gap: 10px;
        }
        .mp-kpi-card {
          background: var(--sf);
          border: 1px solid var(--bdr);
          border-radius: 12px;
          padding: 13px 15px 12px;
          box-shadow: var(--shxs);
          display: flex; flex-direction: column; gap: 3px;
          position: relative; overflow: hidden;
          cursor: default;
          transition: box-shadow .13s, transform .13s;
        }
        .mp-kpi-card:hover { box-shadow: var(--shmd); transform: translateY(-1px); }
        .mp-kpi-accent {
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px; border-radius: 12px 12px 0 0;
        }
        .mp-kpi-label {
          font-size: 9px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .09em; color: var(--tx3); margin-top: 4px;
        }
        .mp-kpi-val {
          font-size: 20px; font-weight: 800; font-family: var(--mo);
          color: var(--tx); letter-spacing: -.4px; line-height: 1.15;
        }
        .mp-kpi-sub {
          font-size: 10px; color: var(--tx3);
        }

        /* ─── Generic card ─── */
        .mp-card {
          background: var(--sf);
          border: 1px solid var(--bdr);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: var(--shxs);
          transition: background .2s;
        }
        .mp-card-hdr {
          padding: 12px 16px 10px;
          border-bottom: 1px solid var(--bdr);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mp-card-hdr-left {
          display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;
        }
        .mp-card-title {
          font-size: 13px; font-weight: 700; color: var(--tx);
        }
        .mp-card-sub {
          font-size: 10.5px; color: var(--tx3);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex-shrink: 0;
        }

        /* ─── Badges ─── */
        .mp-badge {
          display: inline-block; font-size: 10px; font-family: var(--mo);
          font-weight: 700; padding: 2px 7px; border-radius: 5px;
          letter-spacing: .03em; flex-shrink: 0;
        }
        .mp-badge-both {
          background: var(--teal-s); color: var(--teal);
          border: 1px solid rgba(14,116,144,.2);
        }
        [data-theme="dark"] .mp-badge-both {
          background: rgba(14,116,144,.15); color: var(--teal);
        }
        .mp-badge-months {
          background: var(--blue-s); color: var(--blue);
          border: 1px solid rgba(37,87,167,.2);
        }
        [data-theme="dark"] .mp-badge-months {
          background: rgba(37,87,167,.15); color: var(--blue);
        }
        .mp-badge-filter {
          background: rgba(109,63,192,.1); color: #6d3fc0;
          border: 1px solid rgba(109,63,192,.25);
        }
        [data-theme="dark"] .mp-badge-filter {
          background: rgba(109,63,192,.18); color: #a78bfa;
          border: 1px solid rgba(109,63,192,.35);
        }

        /* ─── Signals card ─── */
        .mp-signals-card .mp-card-hdr {
          flex-direction: column; align-items: flex-start; gap: 4px;
        }
        .mp-signals-card .mp-card-hdr-left { flex-direction: row; }
        .mp-signals-card .mp-card-sub { flex-shrink: 1; white-space: normal; }
        .mp-mini-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
        }
        .mp-mini-item {
          padding: 10px 14px 12px;
          border-right: 1px solid var(--bdr);
        }
        .mp-mini-item:last-child { border-right: none; }
        .mp-mini-label {
          font-size: 12px; font-weight: 600; color: var(--tx);
          margin-bottom: 2px;
        }
        .mp-mini-sub {
          font-size: 10px; color: var(--tx3); margin-bottom: 6px;
        }

        /* ─── Chart header with controls ─── */
        .mp-card-hdr-ctrl { align-items: flex-start; gap: 8px; }
        .mp-chart-ctrlbar { display: flex; align-items: center; gap: 5px; flex-shrink: 0; padding-top: 2px; }
        .mp-ctrl-grp {
          display: flex;
          border: 1px solid var(--bdr2);
          border-radius: 7px;
          overflow: hidden;
        }
        .mp-ctrl-btn {
          width: 28px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          background: var(--sf2); border: none; border-right: 1px solid var(--bdr);
          cursor: pointer; color: var(--tx3); padding: 0;
          transition: background .12s, color .12s;
        }
        .mp-ctrl-btn:last-child { border-right: none; }
        .mp-ctrl-btn:hover { background: var(--sf3); color: var(--tx); }
        .mp-ctrl-btn.on  { background: var(--sf3); color: var(--tx); }
        .mp-ctrl-btn svg { width: 12px; height: 12px; }
        .mp-ma-sel {
          height: 26px; padding: 0 18px 0 7px; font-size: 10.5px;
          border: 1px solid var(--bdr2); border-radius: 7px;
          background: var(--sf2); color: var(--tx2);
          font-family: var(--fn); outline: none; cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%239a9d92' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 5px center;
        }
        .mp-ctrl-solo {
          width: 28px; height: 26px;
          display: flex; align-items: center; justify-content: center;
          background: var(--sf2); border: 1px solid var(--bdr2); border-radius: 7px;
          cursor: pointer; color: var(--tx3); padding: 0;
          transition: background .12s, color .12s;
        }
        .mp-ctrl-solo:hover { background: var(--sf3); color: var(--tx); }
        .mp-ctrl-solo.on   { background: var(--sf3); color: var(--tx); }
        .mp-ctrl-solo svg  { width: 12px; height: 12px; }

        /* ─── View toggle badge ─── */
        .mp-badge-view {
          cursor: pointer; border: none; font-family: var(--fn);
          font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 5px;
          letter-spacing: .03em; flex-shrink: 0; transition: opacity .12s;
        }
        .mp-badge-view:hover { opacity: .75; }
        .mp-badge-blue {
          background: var(--blue-s); color: var(--blue);
          border: 1px solid rgba(37,87,167,.2) !important;
        }
        [data-theme="dark"] .mp-badge-blue {
          background: rgba(37,87,167,.18); color: var(--blue);
        }
        .mp-badge-teal {
          background: var(--teal-s); color: var(--teal);
          border: 1px solid rgba(14,116,144,.2) !important;
        }
        [data-theme="dark"] .mp-badge-teal {
          background: rgba(14,116,144,.18); color: var(--teal);
        }

        /* ─── Two-column row ─── */
        .mp-row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        /* ─── Chart canvases ─── */
        .mp-chart-canvas {
          width: 100%;
          display: block;
        }
        .mp-chart-mini   { height: 160px; }
        .mp-chart-normal { height: 240px; }
        .mp-chart-large  { height: 300px; }

        /* ─── Responsive ─── */
        @media (max-width: 1024px) {
          .mp-kpi-strip { grid-template-columns: repeat(2, 1fr); }
          .mp-kpi-strip-5 { grid-template-columns: repeat(3, 1fr); }
          .mp-mini-grid { grid-template-columns: 1fr; }
          .mp-mini-item { border-right: none; border-bottom: 1px solid var(--bdr); }
          .mp-mini-item:last-child { border-bottom: none; }
          .mp-row2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .mp-scroll { padding: 12px 12px 60px; gap: 10px; }
          .mp-hdr { flex-direction: column; }
          .mp-filter-row { gap: 4px; }
          .mp-kpi-strip { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .mp-kpi-strip-5 { grid-template-columns: repeat(2, 1fr); }
          .mp-kpi-val { font-size: 17px; }
          .mp-chart-mini   { height: 130px; }
          .mp-chart-normal { height: 200px; }
          .mp-chart-large  { height: 240px; }
        }
      `}</style>
    </div>
  );
}
