import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchDerivKpiContracts,
  fetchDerivKpiOptionsNotional,
  fetchDerivKpiFpiShare,
  fetchDerivAnnualNse,
  fetchDerivAnnualBse,
  fetchDerivCurrencyMonthly,
  fetchDerivInstBreakdown,
  fetchDerivSegmentSheet,
  fetchDerivFo4Panel,
  fetchDerivParticipationMix,
} from '../../api/derivativesApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';

function fmtPeriod(p) {
  if (!p) return '';
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m] = p.split('-');
  return `${M[+m - 1]} ${y.slice(2)}`;
}
function fmtCr(raw) {
  const n = +raw;
  if (n >= 1e7)  return (n / 1e7).toFixed(1) + 'Cr';
  if (n >= 1e5)  return (n / 1e5).toFixed(1) + 'L';
  if (n >= 1e3)  return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

/* ── Chart helpers ── */
const isDk = () => document.documentElement.getAttribute('data-theme') === 'dark';
function cc() {
  const d = isDk();
  return {
    text:   d ? '#ffffff' : '#1a1a1a',
    text2:  d ? '#f0f0f0' : '#1a1c18',
    grid:   d ? 'rgba(255,255,255,.13)' : 'rgba(26,28,24,.15)',
    axis:   d ? 'rgba(255,255,255,.10)' : 'rgba(26,28,24,.10)',
    bg:     d ? '#08111f' : '#f7f8f3',
    blue:'#4a90d9', teal:'#0e7490', green:'#2d8a4e',
    red:'#c0392b', amber:'#c47a1e', purple:'#6d3fc0',
    orange:'#e07b39', yellow:'#d4a820',
  };
}
const GRID = (l, r, t, b) => ({ top: t, right: r, bottom: b, left: l, containLabel: false });
const ALB  = c => ({ color: c.text, fontSize: 10 });
const SPL  = c => ({ lineStyle: { color: c.grid, type: 'dashed' } });
const XAX  = (data, c, iv) => ({
  type: 'category', data,
  axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false },
  axisLabel: { ...ALB(c), interval: iv ?? 'auto' },
});
const YAX  = (c, fmt) => ({
  type: 'value',
  axisLabel: { ...ALB(c), formatter: fmt },
  splitLine: SPL(c), axisLine: { show: false },
});
const TT = c => ({
  trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
  textStyle: { color: c.text2, fontSize: 11 },
  axisPointer: { lineStyle: { color: c.grid } },
});
const LINE_AREA = (data, color, smooth = 0.3) => ({
  type: 'line', data, smooth,
  symbol: 'none', lineStyle: { color, width: 1.5 },
  areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: color + '44' }, { offset: 1, color: color + '08' }] } },
});

export default function DerivativesPage({ isActive }) {
  useThemeWatcher();
  const [period,   setPeriod]   = useState('All');
  const [fromYear, setFromYear] = useState('2014');
  const [toYear,   setToYear]   = useState('2026');
  const [exchange, setExchange] = useState('NSE');

  const [derivKpi, setDerivKpi] = useState({
    peakMonth: { value: '—', note: '— contracts' },
    regDrop:   { value: '—', note: 'Oct 2024 → latest F&O decline' },
    optPct:    { value: '—', note: 'Options dominate turnover' },
    fpiShare:  { value: '—', note: 'Latest NSE derivatives share' },
  });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);

    // Peak month + regulation drop: metric 133 (contracts), Total Turnover dim 33998
    const p1 = fetchDerivKpiContracts().catch(() => []);
    // Options % of F&O: metric 135 (notional) for 4 options dims + total
    const p2 = fetchDerivKpiOptionsNotional();

    p1.then(raw => {
      const list = toList(raw);
      if (!list.length) return;

      // Peak month
      let peakVal = 0, peakPeriod = '';
      list.forEach(r => {
        const v = +(r.value ?? r.metric_value ?? 0);
        if (v > peakVal) { peakVal = v; peakPeriod = r.period; }
      });

      // Regulation drop: Oct 2024 vs latest after that
      const oct24 = list.find(r => r.period === '2024-10');
      const afterReg = list.filter(r => r.period > '2024-10');
      const latestAfter = afterReg.length ? afterReg[afterReg.length - 1] : null;
      let dropPct = null, dropNote = '—';
      if (oct24 && latestAfter) {
        const before = +(oct24.value ?? oct24.metric_value ?? 0);
        const after  = +(latestAfter.value ?? latestAfter.metric_value ?? 0);
        dropPct = before > 0 ? Math.round((before - after) / before * 100) : null;
        dropNote = `Oct 24 → ${fmtPeriod(latestAfter.period)} F&O decline`;
      }

      setDerivKpi(prev => ({
        ...prev,
        peakMonth: { value: fmtCr(peakVal), note: `${fmtPeriod(peakPeriod)} — contracts` },
        regDrop:   { value: dropPct != null ? `${dropPct}%` : '—', note: dropNote },
      }));
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));

    p2.then(([ioc, iop, soc, sop, tot]) => {
      const last = arr => {
        const l = toList(arr);
        return l.length ? +(l[l.length - 1].value ?? l[l.length - 1].metric_value ?? 0) : 0;
      };
      const lastPeriod = arr => { const l = toList(arr); return l.length ? l[l.length - 1].period : ''; };
      const optSum = last(ioc) + last(iop) + last(soc) + last(sop);
      const totalFO = last(tot);
      const pct = totalFO > 0 ? Math.round(optSum / totalFO * 100) : null;
      const mon = fmtPeriod(lastPeriod(tot));
      setDerivKpi(prev => ({
        ...prev,
        optPct: { value: pct != null ? `${pct}%` : '—', note: `${mon} — Options % of total F&O` },
      }));
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));

    // FPI Derivatives Share
    fetchDerivKpiFpiShare().then(raw => {
      const list = toList(raw);
      if (!list.length) return;
      const latest = list[list.length - 1];
      const val = +(latest.value ?? latest.metric_value ?? 0);
      const mon = fmtPeriod(latest.period);
      setDerivKpi(prev => ({
        ...prev,
        fpiShare: { value: `${val.toFixed(1)}%`, note: `${mon} — NSE derivatives share` },
      }));
    }).catch(() => {});
  }, []);

  const [annFoData,  setAnnFoData]  = useState({ years: [], nse: [], bse: [] });
  const [currMData,  setCurrMData]  = useState({ months: [], values: [] });
  const [currAnnData,   setCurrAnnData]   = useState({ years: [], values: [] });
  const [instBreakData, setInstBreakData] = useState({ years: [], idxOpt: [], stkOpt: [], idxFut: [], stkFut: [] });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    Promise.all([
      fetchDerivAnnualNse().catch(() => []),
      fetchDerivAnnualBse().catch(() => []),
    ]).then(([nseRaw, bseRaw]) => {
      const nseMap = {}, bseMap = {};
      toList(nseRaw).forEach(r => { nseMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      toList(bseRaw).forEach(r => { bseMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
      const allPeriods = [...new Set([...Object.keys(nseMap), ...Object.keys(bseMap)])].sort();
      setAnnFoData({
        years: allPeriods.map(p => String(p).split('-')[0]),
        nse:   allPeriods.map(p => nseMap[p] ?? null),
        bse:   allPeriods.map(p => bseMap[p] ?? null),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchDerivCurrencyMonthly().catch(() => []).then(raw => {
      const list = toList(raw);
      if (!list.length) return;
      setCurrMData({
        months: list.map(r => fmtPeriod(r.period)),
        values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
      });

      // Group by calendar year
      const byYear = {};
      list.forEach(r => {
        const yr = r.period.split('-')[0];
        byYear[yr] = (byYear[yr] || 0) + +(r.value ?? r.metric_value ?? 0);
      });
      const sortedYears = Object.keys(byYear).sort();
      setCurrAnnData({
        years:  sortedYears,
        values: sortedYears.map(y => +byYear[y].toFixed(0)),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchDerivInstBreakdown()
      .then(raws => {
        // Group each series by calendar year (same pattern as currAnnData)
        const byYear = raws.map(() => ({}));
        raws.forEach((raw, si) => {
          toList(raw).forEach(r => {
            const yr = r.period.split('-')[0];
            byYear[si][yr] = (byYear[si][yr] || 0) + +(r.value ?? r.metric_value ?? 0);
          });
        });
        const allYears = [...new Set(byYear.flatMap(m => Object.keys(m)))].sort();
        const getSum = (yr, ...idx) => idx.reduce((s, i) => s + (byYear[i][yr] ?? 0), 0);
        setInstBreakData({
          years:  allYears,
          idxOpt: allYears.map(y => +(getSum(y, 0, 1) / 100000).toFixed(1)),
          stkOpt: allYears.map(y => +(getSum(y, 2, 3) / 100000).toFixed(1)),
          stkFut: allYears.map(y => +(getSum(y, 4)    / 100000).toFixed(1)),
          idxFut: allYears.map(y => +(getSum(y, 5)    / 100000).toFixed(1)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [sheetData, setSheetData] = useState({ years: [], idxFut: [], idxOpt: [], stkFut: [], stkOpt: [] });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);

    fetchDerivSegmentSheet()
      .then(raws => {
        const byYear = raws.map(() => ({}));
        raws.forEach((raw, si) => {
          toList(raw).forEach(r => {
            const yr = r.period.split('-')[0];
            byYear[si][yr] = (byYear[si][yr] || 0) + +(r.value ?? r.metric_value ?? 0);
          });
        });
        const foundYears = [...new Set(byYear.flatMap(m => Object.keys(m)))].sort();
        const minY = +(foundYears[0] || 2014);
        const maxY = +(foundYears[foundYears.length - 1] || 2026);
        const allYears = [];
        for (let y = minY; y <= maxY; y++) allYears.push(String(y));
        const getSum = (yr, ...idx) => idx.reduce((s, i) => s + (byYear[i][yr] ?? 0), 0);
        setSheetData({
          years:  allYears,
          idxOpt: allYears.map(y => getSum(y, 0, 1)),
          stkOpt: allYears.map(y => getSum(y, 2, 3)),
          stkFut: allYears.map(y => getSum(y, 4)),
          idxFut: allYears.map(y => getSum(y, 5)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [derivMixData, setDerivMixData] = useState({ months: [], fpi: [], mf: [], prop: [], others: [], banks: [] });
  const [loadCount, setLoadCount] = useState(0);
  const TOTAL_LOADS = 7;
  const loading = loadCount < TOTAL_LOADS;

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    // FPI=34163, MF=34164, Pro=34162, Others=34166, Banks=34165
    fetchDerivParticipationMix()
      .then(lists => {
        const toLists = lists.map(toList);
        const base = toLists.reduce((a, b) => a.length >= b.length ? a : b);
        const maps = toLists.map(l => {
          const m = {}; l.forEach(r => { m[r.period] = +(r.value ?? r.metric_value ?? 0); }); return m;
        });
        // Normalize to % share per period so all bars sum to 100%
        const pct = (r, idx) => {
          const total = maps.reduce((s, m) => s + (m[r.period] ?? 0), 0);
          return total > 0 ? +((maps[idx][r.period] ?? 0) / total * 100).toFixed(2) : null;
        };
        setDerivMixData({
          months: base.map(r => fmtPeriod(r.period)),
          fpi:    base.map(r => pct(r, 0)),
          mf:     base.map(r => pct(r, 1)),
          prop:   base.map(r => pct(r, 2)),
          others: base.map(r => pct(r, 3)),
          banks:  base.map(r => pct(r, 4)),
        });
        setLoadCount(c => c + 1);
      }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const [fo4Data, setFo4Data] = useState({
    contracts: { months: [], values: [] },
    optPrem:   { months: [], values: [] },
    stockFut:  { months: [], values: [] },
    idxFut:    { months: [], values: [] },
  });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchDerivFo4Panel()
      .then(([contrRaw, optPremRaw, sfutRaw, ifutRaw]) => {
      const mk = (raw, scale = 1) => {
        const list = toList(raw);
        return {
          months: list.map(r => fmtPeriod(r.period)),
          values: list.map(r => +(+(r.value ?? r.metric_value ?? 0) / scale).toFixed(2)),
        };
      };

      setFo4Data({
        contracts: mk(contrRaw),
        optPrem:   mk(optPremRaw, 100000),  // crore → L Cr
        stockFut:  mk(sfutRaw, 100000),
        idxFut:    mk(ifutRaw, 100000),
      });
      setLoadCount(c => c + 1);
    }).catch(() => setLoadCount(c => c + 1));
  }, []);

  const _fy = { from: parseInt(fromYear) || 2000, to: parseInt(toYear) || 2099 };
  const fyMonth = (months, ...arrs) => {
    const keep = months.map(m => { const yy = parseInt((m || '').split(' ')[1]); const yr = isNaN(yy) ? NaN : (yy <= 30 ? 2000 + yy : 1900 + yy); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [months.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };
  const fyYears = (years, ...arrs) => {
    const keep = years.map(y => { const yr = parseInt(y); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [years.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };

  const r1a = useRef(null);  // Total F&O turnover
  const r1b = useRef(null);  // Options premium
  const r1c = useRef(null);  // Stock futures
  const r1d = useRef(null);  // Index futures
  const r2  = useRef(null);  // Total contracts
  const r3a = useRef(null);  // Annual NSE vs BSE
  const r3b = useRef(null);  // Currency monthly
  const r4  = useRef(null);  // Annual currency
  const r5  = useRef(null);  // Instrument breakdown
  const r6  = useRef(null);  // Dedicated sheet
  const r7  = useRef(null);  // Participant mix

  useChart(r1a, () => {
    const c = cc();
    const [months, values] = fyMonth(fo4Data.contracts.months, fo4Data.contracts.values);
    const iv = Math.floor(months.length / 10) || 1;
    const fmtV = v => v >= 1e7 ? (v/1e7).toFixed(1)+'Cr' : v >= 1e4 ? (v/1e3).toFixed(0)+'K' : v >= 1000 ? Math.round(v/1000)+'K' : String(v);
    return {
      backgroundColor: 'transparent',
      grid: GRID(52, 16, 28, 28),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>${fmtV(p[0].value)}</b> contracts` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => fmtV(v)), min: 0 },
      series: [{ ...LINE_AREA(values, '#4a90d9'), lineStyle: { color: '#4a90d9', width: 1.5 } }],
    };
  });

  useChart(r1b, () => {
    const c = cc();
    const [months, values] = fyMonth(fo4Data.optPrem.months, fo4Data.optPrem.values);
    const iv = Math.floor(months.length / 10) || 1;
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 16, 28, 28),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>₹${(+p[0].value).toFixed(1)} L Cr</b>` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v.toFixed(0)), min: 0 },
      series: [{ ...LINE_AREA(values, '#d4a820'), lineStyle: { color: '#d4a820', width: 1.5 } }],
    };
  });

  useChart(r1c, () => {
    const c = cc();
    const [months, values] = fyMonth(fo4Data.stockFut.months, fo4Data.stockFut.values);
    const iv = Math.floor(months.length / 10) || 1;
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 16, 28, 28),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>₹${(+p[0].value).toFixed(1)} L Cr</b>` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v.toFixed(1)), min: 0 },
      series: [{ ...LINE_AREA(values, '#2d8a4e'), lineStyle: { color: '#2d8a4e', width: 1.5 } }],
    };
  });

  useChart(r1d, () => {
    const c = cc();
    const [months, values] = fyMonth(fo4Data.idxFut.months, fo4Data.idxFut.values);
    const iv = Math.floor(months.length / 10) || 1;
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 16, 28, 28),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>₹${(+p[0].value).toFixed(1)} L Cr</b>` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v.toFixed(1)), min: 0 },
      series: [{ ...LINE_AREA(values, '#6d3fc0'), lineStyle: { color: '#6d3fc0', width: 1.5 } }],
    };
  });

  useChart(r2, () => {
    const c = cc();
    const [months, values] = fyMonth(fo4Data.contracts.months, fo4Data.contracts.values);
    const iv = Math.floor(months.length / 10) || 1;
    const fmtV = v => v >= 1e7 ? (v/1e7).toFixed(1)+'Cr' : v >= 1e4 ? (v/1e3).toFixed(0)+'K' : v >= 1000 ? Math.round(v/1000)+'K' : String(v);
    return {
      backgroundColor: 'transparent',
      grid: GRID(68, 24, 36, 36),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>${fmtV(p[0].value)}</b> contracts` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => fmtV(v)), min: 0 },
      series: [{
        ...LINE_AREA(values, '#6d3fc0'),
        lineStyle: { color: '#6d3fc0', width: 1.5 },
        markLine: {
          silent: true,
          lineStyle: { color: 'rgba(200,190,90,.55)', type: 'dashed', width: 1 },
          label: { show: true, color: '#cec050', fontSize: 9, position: 'insideEndTop', formatter: '{b}' },
          data: [{ xAxis: 'Oct 24', name: 'SEBI F&O Tightening' }],
        },
      }],
    };
  });

  useChart(r3a, () => {
    const c = cc();
    const [years, nse, bse] = fyYears(annFoData.years, annFoData.nse, annFoData.bse);
    const fmtV = v => v == null ? '—' : v >= 1e7 ? (v/1e7).toFixed(1)+'Cr' : v >= 1e4 ? (v/1e3).toFixed(0)+'K' : String(v);
    return {
      backgroundColor: 'transparent',
      grid: GRID(64, 16, 28, 36),
      tooltip: { ...TT(c), trigger: 'axis',
        formatter: p => `${p[0].axisValue}<br/>` + p.map(s => `${s.marker}${s.seriesName}: <b>${fmtV(s.value)}</b>`).join('<br/>') },
      legend: { bottom: 4, textStyle: { color: c.text, fontSize: 9 }, itemWidth: 10, itemHeight: 8 },
      xAxis: XAX(years, c, 0),
      yAxis: { ...YAX(c, v => fmtV(v)), min: 0 },
      series: [
        { name: 'NSE', type: 'bar', data: nse, barMaxWidth: 14, itemStyle: { color: '#6d3fc0' } },
        { name: 'BSE', type: 'bar', data: bse, barMaxWidth: 14, itemStyle: { color: '#0e7490' } },
      ],
    };
  });

  useChart(r3b, () => {
    const c = cc();
    const [months, values] = fyMonth(currMData.months, currMData.values);
    const iv = Math.floor(months.length / 10) || 1;
    const fmtV = v => v >= 1e5 ? (v/1e5).toFixed(1)+'L' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : String(v);
    return {
      backgroundColor: 'transparent',
      grid: GRID(64, 16, 28, 36),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}<br/><b>${fmtV(p[0].value)}</b>` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => fmtV(v)), min: 0 },
      series: [{ ...LINE_AREA(values, '#e07b39'), lineStyle: { color: '#e07b39', width: 1.5 } }],
    };
  });

  useChart(r4, () => {
    const c = cc();
    const [years, values] = fyYears(currAnnData.years, currAnnData.values);
    const fmtV = v => v >= 1e5 ? (v/1e5).toFixed(1)+'L' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : String(v);
    return {
      backgroundColor: 'transparent',
      grid: GRID(64, 24, 28, 32),
      tooltip: { ...TT(c), formatter: p => `${p[0].axisValue}: <b>${fmtV(p[0].value)}</b>` },
      xAxis: XAX(years, c, 0),
      yAxis: { ...YAX(c, v => fmtV(v)), min: 0 },
      series: [{ type: 'bar', data: values, barMaxWidth: 28, itemStyle: { color: '#e07b39' } }],
    };
  });

  useChart(r5, () => {
    const c = cc();
    const [years, idxOpt, stkOpt, idxFut, stkFut] = fyYears(instBreakData.years, instBreakData.idxOpt, instBreakData.stkOpt, instBreakData.idxFut, instBreakData.stkFut);
    const fmtY = v => v === 0 ? '0L' : Math.round(v).toLocaleString() + 'L';
    const fmtTT = v => v >= 1e5 ? (v/1e5).toFixed(1)+' L Cr' : v >= 1000 ? (v/1000).toFixed(1)+'K L Cr' : v.toFixed(1)+' L Cr';
    const area = (name, data, col) => ({
      name, type: 'line', data, smooth: 0.25,
      symbol: 'none',
      lineStyle: { color: col, width: 1 },
      itemStyle: { color: col },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: col + 'bb' }, { offset: 1, color: col + '11' }] } },
    });
    return {
      backgroundColor: 'transparent',
      grid: GRID(72, 24, 36, 42),
      tooltip: { ...TT(c), trigger: 'axis',
        formatter: p => `${p[0].axisValue}<br/>` + p.map(s => `${s.marker}${s.seriesName}: <b>₹${fmtTT(+s.value)}</b>`).join('<br/>') },
      legend: { bottom: 4, textStyle: { color: c.text, fontSize: 9 }, itemWidth: 12, itemHeight: 8 },
      xAxis: XAX(years, c, 0),
      yAxis: { ...YAX(c, v => fmtY(v)), min: 0 },
      series: [
        area('Stock Futures', stkFut, '#d4a820'),
        area('Index Futures', idxFut, '#0e7490'),
        area('Stock Options', stkOpt, '#e07b39'),
        area('Index Options', idxOpt, '#6d3fc0'),
      ],
    };
  });

  useChart(r6, () => {
    const c = cc();
    const [years, idxFut, idxOpt, stkFut, stkOpt] = fyYears(sheetData.years, sheetData.idxFut, sheetData.idxOpt, sheetData.stkFut, sheetData.stkOpt);
    const fmtV = v => v >= 1e9 ? (v/1e9).toFixed(1)+'B' : v >= 1e7 ? (v/1e7).toFixed(1)+'Cr' : v >= 1e6 ? (v/1e6).toFixed(1)+'M' : v >= 1e3 ? (v/1e3).toFixed(0)+'K' : String(Math.round(v));
    const bar = (name, data, col) => ({
      name, type: 'bar', data, barMaxWidth: 22,
      itemStyle: { color: col }, stack: 'sh',
    });
    return {
      backgroundColor: 'transparent',
      grid: GRID(48, 24, 36, 36),
      tooltip: { ...TT(c), trigger: 'axis',
        formatter: p => `${p[0].axisValue}<br/>` + p.map(s => `${s.marker}${s.seriesName}: <b>${fmtV(+s.value)}</b>`).join('<br/>') },
      legend: { bottom: 4, textStyle: { color: c.text, fontSize: 9 }, itemWidth: 10, itemHeight: 8 },
      xAxis: XAX(years, c, 0),
      yAxis: { ...YAX(c, v => fmtV(v)), min: 0 },
      series: [
        bar('Index Futures',  idxFut, '#4a90d9'),
        bar('Index Options',  idxOpt, '#8b5cf6'),
        bar('Stock Futures',  stkFut, '#2d8a4e'),
        bar('Stock Options',  stkOpt, '#e07b39'),
      ],
    };
  });

  useChart(r7, () => {
    const c = cc();
    const [months, fpi, mf, prop, others, banks] = fyMonth(derivMixData.months, derivMixData.fpi, derivMixData.mf, derivMixData.prop, derivMixData.others, derivMixData.banks);
    const iv = Math.floor(months.length / 10) || 1;
    const area = (name, data, col) => ({
      name, type: 'line', data, stack: 'tot', smooth: 0.2,
      symbol: 'none', lineStyle: { color: col, width: 0.8 },
      itemStyle: { color: col },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: col + 'cc' }, { offset: 1, color: col + '44' }] } },
    });
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 24, 36, 42),
      tooltip: { ...TT(c), trigger: 'axis',
        formatter: p => `${p[0].axisValue}<br/>` + p.map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(1)}%</b>`).join('<br/>') },
      legend: { bottom: 4, textStyle: { color: c.text, fontSize: 9 }, itemWidth: 12, itemHeight: 8 },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v + '%'), min: 0, max: 100 },
      series: [
        area('FPI',          fpi,    '#4a90d9'),
        area('Mutual Funds', mf,     '#2d8a4e'),
        area('Proprietary',  prop,   '#e07b39'),
        area('Others',       others, '#6d3fc0'),
        area('Banks',        banks,  '#8a9bb0'),
      ],
    };
  });

  return (
    <div
      id="page-deriv"
      style={{ display: isActive ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
    >
      <div
        className="derv-scroll"
        style={{ flex: '1 1 0', minHeight: 0, height: 0, overflowY: 'scroll',
                 display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 20px 40px' }}
      >
        {/* Header */}
        <div>
          <div className="derv-title">Derivatives Markets</div>
          <div className="derv-sub">Equity F&amp;O (notional) + Currency derivatives — NSE, BSE &amp; MSEI</div>
        </div>

        {/* Filters */}
        <div className="derv-filters">
          <div className="derv-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`derv-btn${period === p ? ' on' : ''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="derv-range">
            <span className="derv-lbl">From</span>
            <select className="derv-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="derv-lbl">To</span>
            <select className="derv-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
          {/* <div className="derv-btn-group">
            {['NSE','BSE','Both'].map(e => (
              <button key={e} className={`derv-btn${exchange === e ? ' on' : ''}`} onClick={() => setExchange(e)}>{e}</button>
            ))}
          </div> */}
        </div>

        {/* KPI Cards */}
        <div className="derv-kpis">
          <div className="derv-kpi">
            <div className="derv-kpi-lbl">NSE F&amp;O PEAK MONTH</div>
            <div className="derv-kpi-val">{derivKpi.peakMonth.value}</div>
            <div className="derv-kpi-note">{derivKpi.peakMonth.note}</div>
          </div>
          <div className="derv-kpi">
            <div className="derv-kpi-lbl">POST-REGULATION DROP</div>
            <div className="derv-kpi-val">{derivKpi.regDrop.value}</div>
            <div className="derv-kpi-note">{derivKpi.regDrop.note}</div>
          </div>
          <div className="derv-kpi">
            <div className="derv-kpi-lbl">OPTIONS % OF F&amp;O</div>
            <div className="derv-kpi-val">{derivKpi.optPct.value}</div>
            <div className="derv-kpi-note">{derivKpi.optPct.note}</div>
          </div>
          <div className="derv-kpi">
            <div className="derv-kpi-lbl">FPI DERIVATIVES SHARE</div>
            <div className="derv-kpi-val">{derivKpi.fpiShare.value}</div>
            <div className="derv-kpi-note">{derivKpi.fpiShare.note}</div>
          </div>
        </div>

        {/* Section 1: Monthly F&O Growth 2×2 */}
        <div className="derv-card">
          <div className="derv-card-hd">
            <div className="derv-card-hd-left">
              <span className="derv-card-title">Monthly F&amp;O Growth Is Still an Options Story</span>
              <span className="derv-badge derv-badge-green">NSE</span>
            </div>
           
          </div>
          <div className="derv-card-sub">NSE equity-derivatives activity from CY20 onward · each panel has its own y-axis</div>
          <div className="derv-2x2">
            <div>
              <div className="derv-mini-hd">
                <span className="derv-mini-title">Total F&amp;O turnover</span>
                <span className="derv-mini-val">—</span>
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r1a.current, 'Total F&O turnover')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              {loading ? <div className="chart-loader" style={{height: 200}} /> : <div ref={r1a} style={{ height: 200 }} />}
            </div>
            <div>
              <div className="derv-mini-hd">
                <span className="derv-mini-title">Options premium turnover</span>
                <span className="derv-mini-val">—</span>
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r1b.current, 'Options premium turnover')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              {loading ? <div className="chart-loader" style={{height: 200}} /> : <div ref={r1b} style={{ height: 200 }} />}
            </div>
            <div>
              <div className="derv-mini-hd">
                <span className="derv-mini-title">Stock futures turnover</span>
                <span className="derv-mini-val">—</span>
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r1c.current, 'Stock futures turnover')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              {loading ? <div className="chart-loader" style={{height: 200}} /> : <div ref={r1c} style={{ height: 200 }} />}
            </div>
            <div>
              <div className="derv-mini-hd">
                <span className="derv-mini-title">Index futures turnover</span>
                <span className="derv-mini-val">—</span>
                <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r1d.current, 'Index futures turnover')}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              {loading ? <div className="chart-loader" style={{height: 200}} /> : <div ref={r1d} style={{ height: 200 }} />}
            </div>
          </div>
          <div className="derv-footnote">
            Total, stock futures, and index futures use normalized SEBI equity-derivatives turnover. Options premium uses the official
            market-snapshot premium series where available; earlier periods are left blank rather than substituting notional option turnover.
          </div>
        </div>

        {/* Section 2: Total Contracts */}
        <div className="derv-card">
          <div className="derv-card-hd">
            <div className="derv-card-hd-left">
              <span className="derv-card-title">NSE Equity F&amp;O Total Contracts</span>
              <span className="derv-badge derv-badge-red">SEBI </span>
            </div>
            
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r2.current, 'NSE Equity F&O Total Contracts')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="derv-card-sub">Million contracts · SEBI tightening Oct 2024 marked</div>
          {loading ? <div className="chart-loader" style={{height: 280}} /> : <div ref={r2} style={{ height: 280 }} />}
        </div>

        {/* Section 3: Annual NSE vs BSE + Currency Monthly */}
        <div className="derv-row2">
          <div className="derv-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div className="derv-card-title">F&amp;O Annual Total: NSE vs BSE</div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r3a.current, 'F&O Annual Total: NSE vs BSE')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="derv-card-sub">Million contracts · BSE gaining share</div>
            {loading ? <div className="chart-loader" style={{height: 240}} /> : <div ref={r3a} style={{ height: 240 }} />}
          </div>
          <div className="derv-card">
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div className="derv-card-title">NSE Currency Derivatives Turnover</div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r3b.current, 'NSE Currency Derivatives Turnover')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="derv-card-sub">₹ Thousand Crore · peaked 2022, dropped 2024-25</div>
            {loading ? <div className="chart-loader" style={{height: 240}} /> : <div ref={r3b} style={{ height: 240 }} />}
          </div>
        </div>

        {/* Section 4: Annual Currency Volume */}
        <div className="derv-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div className="derv-card-title">Annual Currency Derivatives Volume (NSE)</div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r4.current, 'Annual Currency Derivatives Volume (NSE)')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="derv-card-sub">₹ Thousand Crore · peaked FY 2022, new margin rules caused contraction</div>
          {loading ? <div className="chart-loader" style={{height: 240}} /> : <div ref={r4} style={{ height: 240 }} />}
        </div>

        {/* Section 5: Instrument Breakdown */}
        <div className="derv-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div className="derv-card-title">F&amp;O Instrument Breakdown (NSE)</div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r5.current, 'F&O Instrument Breakdown (NSE)')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="derv-card-sub">₹ Lakh Crore — Index Options dominate 95%+ of notional turnover</div>
          {loading ? <div className="chart-loader" style={{height: 300}} /> : <div ref={r5} style={{ height: 300 }} />}
        </div>

        {/* Section 6: Dedicated Sheet */}
        <div className="derv-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div className="derv-card-title">NSE Dedicated Instrument Sheet</div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r6.current, 'NSE Dedicated Instrument Sheet')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="derv-card-sub">Instrument-level contracts from markets.instrument_derivatives · useful as a source-sheet coverage cross-check</div>
          {loading ? <div className="chart-loader" style={{height: 280}} /> : <div ref={r6} style={{ height: 280 }} />}
        </div>

        {/* Section 7: Participant Mix */}
        <div className="derv-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
            <div className="derv-card-title">NSE Derivatives Participant Mix</div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(r7.current, 'NSE Derivatives Participant Mix')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="derv-card-sub">% of turnover by participant category</div>
          {loading ? <div className="chart-loader" style={{height: 300}} /> : <div ref={r7} style={{ height: 300 }} />}
        </div>
      </div>

      <style>{`
        .derv-scroll::-webkit-scrollbar{width:6px}
        .derv-scroll::-webkit-scrollbar-track{background:transparent}
        .derv-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        .derv-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .derv-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}

        .derv-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .derv-btn-group{display:flex;gap:4px}
        .derv-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .derv-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .derv-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .derv-range{display:flex;align-items:center;gap:6px}
        .derv-lbl{font-size:11px;color:var(--tx3,#888)}
        .derv-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        .derv-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .derv-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:14px 16px}
        .derv-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px}
        .derv-kpi-val{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);
          letter-spacing:-.5px;line-height:1}
        .derv-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px}
        .derv-kpi-bar-wrap{height:4px;background:var(--bdr2,rgba(255,255,255,.1));
          border-radius:2px;margin:12px 0 8px;position:relative}
        .derv-kpi-bar{height:100%;background:var(--green,#2d8a4e);border-radius:2px;
          position:absolute;top:0;left:0}

        .derv-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .derv-card-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
        .derv-card-hd-left{display:flex;align-items:center;gap:8px}
        .derv-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .derv-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:10px}

        .derv-badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:600;letter-spacing:.4px}
        .derv-badge-green{background:rgba(45,138,78,.18);color:#4aaa6a;border:1px solid rgba(45,138,78,.3)}
        .derv-badge-red{background:rgba(200,60,40,.18);color:#e06050;border:1px solid rgba(200,60,40,.3)}

        .derv-icon{width:14px;height:14px;color:var(--tx3,#888);opacity:.6;cursor:pointer;flex-shrink:0}
        .derv-icon:hover{opacity:1}

        .derv-2x2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .derv-mini-hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
        .derv-mini-title{font-size:11px;font-weight:500;color:var(--tx2,#ccc)}
        .derv-mini-val{font-size:10px;color:var(--tx3,#888)}
        .derv-footnote{font-size:10px;color:var(--tx4,#666);margin-top:10px;line-height:1.6}

        .derv-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        @media(max-width:640px){
          .derv-2x2{grid-template-columns:1fr}
          .derv-row2{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}
