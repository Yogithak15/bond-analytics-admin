import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import { fetchMacroRepoRate, fetchMacroForexReserves, fetchMacroUsdInr, fetchMacroMfgPmi, fetchMacroTradeBalance, fetchMacroMcapGdp, fetchMacroInflation, fetchKeyMacroMetrics, KEY_MACRO_DIMS } from '../../api/macroIndicatorsApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';

/* Key Macro toggle config — labels/colors only, no data */
const KEY_METRICS = ['Repo Rate','CPI Inflation','WPI Inflation','Forex Reserves','USD/INR','M3 Money Supply','FPI Net Equity'];
const KEY_CFG = {
  'Repo Rate':       { color:'#e05060' },
  'CPI Inflation':   { color:'#e05060' },
  'WPI Inflation':   { color:'#d4a820' },
  'Forex Reserves':  { color:'#26c99a' },
  'USD/INR':         { color:'#f0a040' },
  'M3 Money Supply': { color:'#4a90d9' },
  'FPI Net Equity':  { color:'#8b5cf6' },
};

/* Macro Overlay toggle config — labels/colors only, no data */
const OVL_ORDER = ['Repo Rate','USD/INR','NSE MCap','FPI Net'];
const OVL_CFG = {
  'Repo Rate': { color:'#e05060' },
  'USD/INR':   { color:'#f0a040' },
  'NSE MCap':  { color:'#4a90d9' },
  'FPI Net':   { color:'#8b5cf6' },
};

/* ── Axis helpers ── */
// Avoids JS float issues (e.g. 9 * 0.1 = 0.9000000000000001)
const snapStep = (rawStep) => {
  const mag  = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep) || 1)));
  const step = Math.ceil(rawStep / mag) * mag;
  return parseFloat(step.toPrecision(6));
};
const fmtTick = v => {
  const n = parseFloat(v);
  if (Math.abs(n) >= 1e5) return `${(n/1e5).toFixed(0)}L`;
  if (Math.abs(n) >= 1000) return `${(n/1000).toFixed(0)}K`;
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
};

/* ── Chart helpers ── */
const isDk = () => document.documentElement.getAttribute('data-theme') === 'dark';
function cc() {
  const d = isDk();
  return {
    text:  d ? '#ffffff' : '#1a1a1a',
    text2: d ? '#f0f0f0' : '#1a1c18',
    grid:  d ? 'rgba(255,255,255,.13)' : 'rgba(26,28,24,.15)',
    axis:  d ? 'rgba(255,255,255,.10)' : 'rgba(26,28,24,.10)',
    bg:    d ? '#08111f' : '#f7f8f3',
  };
}
const GRID = (l,r,t,b) => ({top:t,right:r,bottom:b,left:l,containLabel:false});
const ALB  = c => ({color:c.text,fontSize:10});
const SPL  = c => ({lineStyle:{color:c.grid,type:'dashed'}});
const XAX  = (data,c,iv) => ({
  type:'category',data,
  axisLine:{lineStyle:{color:c.axis}},axisTick:{show:false},
  axisLabel:{...ALB(c),interval:iv??'auto'},
});
const YAX  = (c,fmt) => ({
  type:'value',
  axisLabel:{...ALB(c),formatter:fmt},
  splitLine:SPL(c),axisLine:{show:false},
});
const TT = c => ({
  trigger:'axis',backgroundColor:c.bg,borderColor:c.grid,
  textStyle:{color:c.text2,fontSize:11},
  axisPointer:{lineStyle:{color:c.grid}},
});

export default function MacroIndicatorsPage({ isActive }) {
  useThemeWatcher();
  const [period,    setPeriod]    = useState('All');
  const [fromYear,  setFromYear]  = useState('2014');
  const [toYear,    setToYear]    = useState('2026');
  const [keyMetric, setKeyMetric] = useState('Repo Rate');
  const [ovlActive, setOvlActive] = useState(new Set(['Repo Rate','NSE MCap']));
  const [repoRateKpi,    setRepoRateKpi]    = useState({ value: '—', note: 'RBI benchmark rate' });
  const [repoRateData,   setRepoRateData]   = useState({ months: [], values: [] });
  const [forexKpi,       setForexKpi]       = useState({ value: '—', note: '—' });
  const [forexData,      setForexData]      = useState({ months: [], values: [] });
  const [usdInrKpi,      setUsdInrKpi]      = useState({ value: '—', note: 'Exchange rate' });
  const [usdInrData,     setUsdInrData]     = useState({ months: [], values: [] });
  const [inflData,       setInflData]       = useState({ months: [], cpi: [], wpi: [] });
  const [mfgPmiKpi,      setMfgPmiKpi]      = useState({ value: '—', note: 'Expansion' });
  const [mfgPmiData,     setMfgPmiData]     = useState({ months: [], values: [] });
  const [tradeBalKpi,    setTradeBalKpi]    = useState({ value: '—', note: 'Trade deficit' });
  const [tradeBalData,   setTradeBalData]   = useState({ months: [], values: [] });
  const [mcapGdpKpi,     setMcapGdpKpi]     = useState({ value: '—', note: 'Market cap / GDP' });
  const [mcapGdpData,    setMcapGdpData]    = useState({ months: [], values: [] });
  const [keyMacroData,   setKeyMacroData]   = useState({});

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchMacroRepoRate()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        // full series for chart
        setRepoRateData({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        // latest value for KPI card
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        setRepoRateKpi({ value: `${val.toFixed(2)}%`, note: period ? `Call rate · ${period}` : 'RBI benchmark rate' });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchMacroForexReserves()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        // full series for chart
        setForexData({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        // latest value for KPI card
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        const display = val >= 1000 ? `$${(val/1000).toFixed(1)}T` : val >= 1 ? `$${val.toFixed(1)}Bn` : `$${Math.round(val*1000)}Mn`;
        setForexKpi({ value: display, note: period || '—' });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchMacroUsdInr()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        setUsdInrData({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        setUsdInrKpi({ value: `₹${val.toFixed(2)}`, note: period ? `Spot rate · ${period}` : 'Exchange rate' });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtP = p => { const [y,m] = (p??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    fetchMacroInflation()
      .then(([cpiRaw, wpiRaw]) => {
        const cpiList = toList(cpiRaw).filter(r => (r.period ?? '') >= '2020-09');
        const wpiList = toList(wpiRaw);
        const wpiMap  = {};
        wpiList.forEach(r => { wpiMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        if (!cpiList.length) return;
        setInflData({
          months: cpiList.map(r => fmtP(r.period)),
          cpi:    cpiList.map(r => { const v = +(r.value ?? r.metric_value ?? 0); return v > 100 ? null : v; }),
          wpi:    cpiList.map(r => { const v = wpiMap[r.period] ?? null; return v != null && v > 100 ? null : v; }),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchMacroMfgPmi()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        setMfgPmiData({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        const note = val > 50 ? `Expansion · ${period}` : val > 0 ? `Contraction · ${period}` : period;
        setMfgPmiKpi({ value: val.toFixed(1), note });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchMacroTradeBalance()
      .then(raw => {
        const list = toList(raw).filter(r => (r.period ?? '') >= '2025-04');
        if (!list.length) return;
        setTradeBalData({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        const display = val >= 1 || val <= -1 ? `$${val.toFixed(1)}Bn` : `$${Math.round(val*1000)}Mn`;
        setTradeBalKpi({ value: display, note: period || 'Trade balance' });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchMacroMcapGdp()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        setMcapGdpData({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        setMcapGdpKpi({ value: `${val.toFixed(1)}%`, note: period || 'Market cap / GDP' });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtP = p => { const [y,m] = (p??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    fetchKeyMacroMetrics()
      .then(results => {
        const map = {};
        const isCpiWpi = k => k === 'CPI Inflation' || k === 'WPI Inflation';
        results.forEach(({ key, color, raw }) => {
          const list = toList(raw);
          map[key] = {
            color,
            months: list.map(r => fmtP(r.period)),
            values: list.map(r => {
              const v = +(r.value ?? r.metric_value ?? 0);
              return isCpiWpi(key) && v > 100 ? null : v;
            }),
          };
        });
        setKeyMacroData(map);
      }).catch(() => {});
  }, []);

  const _fy = { from: parseInt(fromYear) || 2000, to: parseInt(toYear) || 2099 };
  const fyMonth = (months, ...arrs) => {
    const keep = months.map(m => { const yy = parseInt((m || '').split(' ')[1]); const yr = isNaN(yy) ? NaN : (yy <= 30 ? 2000 + yy : 1900 + yy); return isNaN(yr) || (yr >= _fy.from && yr <= _fy.to); });
    return [months.filter((_, i) => keep[i]), ...arrs.map(a => a?.filter((_, i) => keep[i]) ?? a)];
  };

  const rRepo     = useRef(null);
  const rForex    = useRef(null);
  const rUsdinr   = useRef(null);
  const rInfl     = useRef(null);
  const rMcap     = useRef(null);
  const rPmi      = useRef(null);
  const rTrade    = useRef(null);
  const rKeyMacro = useRef(null);
  const rOverlay  = useRef(null);

  function toggleOvl(k) {
    setOvlActive(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  /* RBI Repo Rate */
  /* ── RBI Repo Rate (Call Rate) — line chart ── */
  useChart(rRepo, () => {
    const [months, values] = fyMonth(repoRateData.months, repoRateData.values);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxV = Math.max(...values);
    const step = maxV <= 5 ? 1 : maxV <= 10 ? 2 : 5;
    const yMax = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Call Rate: <b>${(+p[0].value).toFixed(2)}%</b>`,
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `${v}%` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'line', data: values, smooth: false, symbol: 'none',
        lineStyle: { color: '#e05060', width: 2 },
        itemStyle: { color: '#e05060' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#e0506055' }, { offset: 1, color: '#e0506008' }] } },
      }],
    };
  });

  /* Forex Reserves */
  /* ── Forex Reserves — line chart (USD Bn) ── */
  useChart(rForex, () => {
    const [months, values] = fyMonth(forexData.months, forexData.values);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxV = Math.max(...values);
    const step = maxV <= 100 ? 25 : maxV <= 500 ? 100 : maxV <= 1000 ? 200 : 500;
    const yMax = Math.ceil(maxV / step) * step;
    const fmtV = v => v >= 1000 ? `$${(v/1000).toFixed(1)}T` : `$${v.toFixed(0)}Bn`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Forex Reserves: <b>${fmtV(+p[0].value)}</b>`,
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtV(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'none',
        lineStyle: { color: '#26c99a', width: 2 },
        itemStyle: { color: '#26c99a' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#26c99a55' }, { offset: 1, color: '#26c99a08' }] } },
      }],
    };
  });

  /* USD/INR */
  /* ── USD / INR Exchange Rate — line chart ── */
  useChart(rUsdinr, () => {
    const [months, values] = fyMonth(usdInrData.months, usdInrData.values);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const pad  = (maxV - minV) * 0.1 || 2;
    const step = (maxV - minV) <= 10 ? 2 : (maxV - minV) <= 30 ? 5 : 10;
    const yMin = Math.floor((minV - pad) / step) * step;
    const yMax = Math.ceil((maxV + pad) / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}USD/INR: <b>₹${(+p[0].value).toFixed(2)}</b>`,
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: yMin, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'none',
        lineStyle: { color: '#f0a040', width: 2 },
        itemStyle: { color: '#f0a040' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#f0a04055' }, { offset: 1, color: '#f0a04008' }] } },
      }],
    };
  });

  /* CPI & WPI Inflation */
  /* ── Inflation: CPI & WPI — dual line chart ── */
  useChart(rInfl, () => {
    const [months, cpi, wpi] = fyMonth(inflData.months, inflData.cpi, inflData.wpi);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const allV = [...cpi, ...wpi.filter(v => v != null)];
    const minV = Math.min(...allV);
    const maxV = Math.max(...allV);
    const range = maxV - minV || 1;
    // aim for ~5 ticks; round step up to a "nice" number
    const step = snapStep(range / 5);
    const yMin = Math.floor(minV / step) * step;
    const yMax = Math.ceil(maxV  / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(2)}%</b>`).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: ['CPI Inflation', 'WPI Inflation'],
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: yMin, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `${fmtTick(v)}%` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [
        { name: 'CPI Inflation', type: 'line', data: cpi, smooth: true,
          symbol: 'circle', symbolSize: 3, connectNulls: false,
          lineStyle: { color: '#e05060', width: 2 }, itemStyle: { color: '#e05060' } },
        { name: 'WPI Inflation', type: 'line', data: wpi, smooth: true,
          symbol: 'circle', symbolSize: 3, connectNulls: false,
          lineStyle: { color: '#d4a820', width: 2 }, itemStyle: { color: '#d4a820' } },
      ],
    };
  });

  /* Market Cap / GDP Ratio */
  /* ── Market Cap / GDP Ratio — line chart ── */
  useChart(rMcap, () => {
    const [months, values] = fyMonth(mcapGdpData.months, mcapGdpData.values);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxV = Math.max(...values);
    const step = snapStep(maxV / 5);
    const yMax = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}MCap/GDP: <b>${(+p[0].value).toFixed(1)}%</b>`,
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `${fmtTick(v)}%` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'none',
        lineStyle: { color: '#4a90d9', width: 2 },
        itemStyle: { color: '#4a90d9' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#4a90d955' }, { offset: 1, color: '#4a90d908' }] } },
      }],
    };
  });

  /* Manufacturing PMI */
  /* ── Manufacturing PMI — bar chart (green >50 expansion, red <50 contraction) ── */
  useChart(rPmi, () => {
    const [months, values] = fyMonth(mfgPmiData.months, mfgPmiData.values);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const minV = Math.min(45, Math.min(...values));
    const maxV = Math.max(60, Math.max(...values));
    const step = snapStep((maxV - minV) / 5);
    const yMin = Math.floor(minV / step) * step;
    const yMax = Math.ceil(maxV  / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => {
          const v = +p[0].value;
          return `<b>${p[0].axisValue}</b><br/>${p[0].marker}Mfg PMI: <b>${v.toFixed(1)}</b> · ${v >= 50 ? 'Expansion' : 'Contraction'}`;
        },
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: yMin, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtTick(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'none',
        lineStyle: { color: '#26c99a', width: 2 },
        itemStyle: { color: params => params.value >= 50 ? '#26c99a' : '#e05060' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#26c99a44' }, { offset: 1, color: '#26c99a08' }] } },
        markLine: {
          silent: true, symbol: 'none',
          data: [{ yAxis: 50, lineStyle: { color: '#94a3b8', type: 'dashed', width: 1 },
            label: { formatter: '50 — expansion threshold', color: '#94a3b8', fontSize: 9, position: 'insideEndTop' } }],
        },
      }],
    };
  });

  /* Trade Balance */
  /* ── Trade Balance — bar chart (mostly negative = deficit) ── */
  useChart(rTrade, () => {
    const [months, values] = fyMonth(tradeBalData.months, tradeBalData.values);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const step = snapStep((maxV - minV) / 5 || 1);
    const yMin = Math.floor(minV / step) * step;
    const yMax = Math.ceil(Math.max(maxV, 0) / step) * step;
    const fmtV = v => `$${v.toFixed(1)}Bn`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Trade Balance: <b>${fmtV(+p[0].value)}</b>`,
      },
      xAxis: {
        type: 'category', data: months,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: yMin, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtTick(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'bar', data: values, barWidth: '60%',
        itemStyle: {
          color: params => params.value >= 0 ? '#26c99a' : '#e05060',
          borderRadius: params => params.value >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3],
        },
      }],
    };
  });

  /* Key Macro Indicators — single-metric toggle */
  /* ── Key Macro Indicators — toggled single line chart ── */
  useChart(rKeyMacro, () => {
    const series = keyMacroData[keyMetric];
    if (!series?.months?.length) return null;
    const [months, values] = fyMonth(series.months, series.values);
    const { color } = series;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;
    const step = snapStep(range / 4);
    const yMin = Math.floor(minV / step) * step;
    const yMax = Math.ceil(maxV / step) * step;
    const fmtTip  = v => v >= 1e5 ? `${(v/1e5).toFixed(2)}L` : v >= 1000 ? `${(v/1000).toFixed(2)}K` : `${(+v).toFixed(2)}`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}${keyMetric}: <b>${fmtTip(p[0].value)}</b>`,
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: yMin, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtTick(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [{
        type: 'line', data: values, smooth: false, symbol: 'none',
        lineStyle: { color, width: 2 },
        itemStyle: { color },
      }],
    };
  });

  /* Macro Overlay Chart — dual-axis multi-toggle */
  useChart(rOverlay, () => {
    // map OVL_ORDER keys to keyMacroData keys
    const KEY_MAP = { 'Repo Rate':'Repo Rate', 'USD/INR':'USD/INR', 'NSE MCap':'NSE MCap', 'FPI Net':'FPI Net Equity' };
    // large-value metrics go on right y-axis
    const RIGHT_AXIS = new Set(['NSE MCap']);
    const active = OVL_ORDER.filter(k => ovlActive.has(k) && keyMacroData[KEY_MAP[k]]?.months?.length);
    if (!active.length) return null;
    const c = cc();
    // filter each series by fromYear/toYear
    const filteredData = {};
    active.forEach(k => {
      const d = keyMacroData[KEY_MAP[k]];
      const [fm, fv] = fyMonth(d.months, d.values);
      filteredData[k] = { months: fm, values: fv, color: d.color };
    });
    // use the longest filtered series as x-axis spine
    const spine = active.reduce((a, b) =>
      (filteredData[b]?.months?.length ?? 0) > (filteredData[a]?.months?.length ?? 0) ? b : a
    );
    const months = filteredData[spine].months;
    const iv = Math.max(1, Math.floor(months.length / 10));

    // build y-axis bounds for left (%) and right (large values)
    const leftVals  = active.filter(k => !RIGHT_AXIS.has(k)).flatMap(k => filteredData[k].values);
    const rightVals = active.filter(k =>  RIGHT_AXIS.has(k)).flatMap(k => filteredData[k].values);
    const axisConfig = (vals, side) => {
      if (!vals.length) return { min: 0, max: 10, interval: 2 };
      const mn = Math.min(...vals), mx = Math.max(...vals);
      const range = mx - mn || 1;
      const step = snapStep(range / 4);
      return { min: Math.max(0, Math.floor(mn / step) * step), max: Math.ceil(mx / step) * step, interval: step };
    };
    const leftAx  = axisConfig(leftVals);
    const rightAx = axisConfig(rightVals);
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: rightVals.length ? 56 : 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${fmtTick(s.value)}</b>`).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: active.map(k => ({ name: k, itemStyle: { color: OVL_CFG[k].color } })),
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: [
        { type: 'value', ...leftAx,
          axisLabel: { color: c.text, fontSize: 9, formatter: v => fmtTick(v) },
          splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
          axisLine: { show: false } },
        { type: 'value', ...rightAx, show: rightVals.length > 0,
          axisLabel: { color: '#4a90d9', fontSize: 9, formatter: v => fmtTick(v) },
          splitLine: { show: false },
          axisLine: { show: false } },
      ],
      series: active.map(k => {
        const d = filteredData[k];
        const monthMap = Object.fromEntries(d.months.map((m, i) => [m, d.values[i]]));
        const isRight = RIGHT_AXIS.has(k);
        return {
          name: k, type: 'line', yAxisIndex: isRight ? 1 : 0,
          data: months.map(m => monthMap[m] ?? null),
          smooth: isRight, symbol: 'circle', symbolSize: 3, connectNulls: false,
          lineStyle: { color: OVL_CFG[k].color, width: 2 },
          itemStyle: { color: OVL_CFG[k].color },
          step: !isRight ? 'end' : false,
        };
      }),
    };
  });

  return (
    <div
      id="page-macro"
      style={{display:isActive?'flex':'none',flexDirection:'column',height:'100%',overflow:'hidden'}}
    >
      <div
        className="mac-scroll"
        style={{flex:'1 1 0',minHeight:0,height:0,overflowY:'scroll',
                display:'flex',flexDirection:'column',gap:14,padding:'18px 20px 40px'}}
      >
        {/* Header */}
        <div>
          <div className="mac-title">Macro Indicators</div>
          <div className="mac-sub">Repo rate, forex reserves, USD/INR, inflation — macro context for market analysis</div>
        </div>

        {/* Filters */}
        <div className="mac-filters">
          <div className="mac-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`mac-btn${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="mac-range">
            <span className="mac-lbl">From</span>
            <select className="mac-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="mac-lbl">To</span>
            <select className="mac-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* 7 KPI cards */}
        <div className="mac-kpis">
          <div className="mac-kpi">
            <div className="mac-kpi-lbl">REPO RATE</div>
            <div className="mac-kpi-num">{repoRateKpi.value}</div>
            <div className="mac-kpi-note">{repoRateKpi.note}</div>
          </div>
          <div className="mac-kpi">
            <div className="mac-kpi-lbl">FOREX RESERVES</div>
            <div className="mac-kpi-num">{forexKpi.value}</div>
            <div className="mac-kpi-note">{forexKpi.note}</div>
          </div>
          <div className="mac-kpi">
            <div className="mac-kpi-lbl">USD / INR</div>
            <div className="mac-kpi-num">{usdInrKpi.value}</div>
            <div className="mac-kpi-note">{usdInrKpi.note}</div>
          </div>
          <div className="mac-kpi">
            <div className="mac-kpi-lbl">MFG PMI</div>
            <div className="mac-kpi-num">{mfgPmiKpi.value}</div>
            <div className="mac-kpi-note">{mfgPmiKpi.note}</div>
          </div>
          <div className="mac-kpi">
            <div className="mac-kpi-lbl">TRADE BALANCE</div>
            <div className={`mac-kpi-num${tradeBalKpi.value !== '—' && tradeBalKpi.value.startsWith('$-') ? ' mac-kpi-neg' : ''}`}>{tradeBalKpi.value}</div>
            <div className="mac-kpi-note">{tradeBalKpi.note}</div>
          </div>
          <div className="mac-kpi">
            <div className="mac-kpi-lbl">MCAP/GDP</div>
            <div className="mac-kpi-num">{mcapGdpKpi.value}</div>
            <div className="mac-kpi-note">{mcapGdpKpi.note}</div>
          </div>
          {/* <div className="mac-kpi">
            <div className="mac-kpi-lbl">RATE CYCLE PEAK</div>
            <div className="mac-kpi-num">—</div>
            <div className="mac-kpi-note">Nov 14 → Jan 15</div>
          </div> */}
        </div>

        {/* RBI Repo Rate — full width */}
        <div className="mac-card">
          <div className="mac-card-hd">
            <span className="mac-card-title">RBI Repo Rate</span>
            <span className="mac-badge-rate">Rate cycle</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rRepo.current, 'RBI Repo Rate')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mac-card-sub">% · benchmark rate across the selected range</div>
          <div ref={rRepo} style={{height:260}} />
        </div>

        {/* Forex Reserves | USD/INR side by side */}
        <div className="mac-row2">
          <div className="mac-card">
            <div className="mac-card-hd">
              <span className="mac-card-title">Forex Reserves</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rForex.current, 'Forex Reserves')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="mac-card-sub">USD Billion · reserve accumulation over time</div>
            <div ref={rForex} style={{height:260}} />
          </div>
          <div className="mac-card">
            <div className="mac-card-hd">
              <span className="mac-card-title">USD / INR Exchange Rate</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rUsdinr.current, 'USD / INR Exchange Rate')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="mac-card-sub">₹ per USD · rupee depreciation trend</div>
            <div ref={rUsdinr} style={{height:260}} />
          </div>
        </div>

        {/* CPI & WPI Inflation — full width */}
        <div className="mac-card">
          <div className="mac-card-hd">
            <span className="mac-card-title">Inflation: CPI &amp; WPI</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rInfl.current, 'Inflation: CPI & WPI')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mac-card-sub">Year-on-Year rate (%) · key driver of RBI rate decisions</div>
          <div ref={rInfl} style={{height:260}} />
        </div>

        {/* Market Cap / GDP — full width */}
        <div className="mac-card">
          <div className="mac-card-hd">
            <span className="mac-card-title">Market Cap / GDP Ratio</span>
            <span className="mac-badge-val">Valuation</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rMcap.current, 'Market Cap / GDP Ratio')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mac-card-sub">Buffett Indicator — above 100% = potentially overvalued</div>
          <div ref={rMcap} style={{height:260}} />
        </div>

        {/* Manufacturing PMI | Trade Balance side by side */}
        <div className="mac-row2">
          <div className="mac-card">
            <div className="mac-card-hd">
              <span className="mac-card-title">Manufacturing PMI</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rPmi.current, 'Manufacturing PMI')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="mac-card-sub">Above 50 = expansion</div>
            <div ref={rPmi} style={{height:260}} />
          </div>
          <div className="mac-card">
            <div className="mac-card-hd">
              <span className="mac-card-title">Trade Balance</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rTrade.current, 'Trade Balance')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="mac-card-sub">USD Billion</div>
            <div ref={rTrade} style={{height:260}} />
          </div>
        </div>

        {/* Key Macro Indicators toggle — full width */}
        <div className="mac-card">
          <div className="mac-card-hd">
            <span className="mac-card-title">Key Macro Indicators (Structured Data)</span>
            <span className="mac-badge-db">macro_indicators</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rKeyMacro.current, 'Key Macro Indicators (Structured Data)')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mac-card-sub">Clean time series from macro_indicators table — toggle between metrics</div>
          <div className="mac-toggle-row">
            {KEY_METRICS.map(k => (
              <button
                key={k}
                className={`mac-toggle-btn${keyMetric===k?' on':''}`}
                style={keyMetric===k
                  ? {background:KEY_CFG[k].color,borderColor:KEY_CFG[k].color,color:'#fff'}
                  : {borderColor:'rgba(255,255,255,.2)',color:'var(--tx3,#888)',background:'transparent'}}
                onClick={() => setKeyMetric(k)}
              >{k}</button>
            ))}
          </div>
          <div ref={rKeyMacro} style={{height:260}} />
        </div>

        {/* Macro Overlay Chart — full width */}
        <div className="mac-card">
          <div className="mac-card-hd">
            <span className="mac-card-title">Macro Overlay Chart</span>
            <span className="mac-badge-link">Macro-Market Link</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rOverlay.current, 'Macro Overlay Chart')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="mac-card-sub">Compare repo rate, market cap, FPI flows, USD/INR</div>
          <div className="mac-toggle-row">
            {OVL_ORDER.map(k => (
              <button
                key={k}
                className={`mac-toggle-btn${ovlActive.has(k)?' on':''}`}
                style={ovlActive.has(k)
                  ? {background:OVL_CFG[k].color,borderColor:OVL_CFG[k].color,color:'#fff'}
                  : {borderColor:'rgba(255,255,255,.2)',color:'var(--tx3,#888)',background:'transparent'}}
                onClick={() => toggleOvl(k)}
              >{k}</button>
            ))}
          </div>
          <div ref={rOverlay} style={{height:280}} />
        </div>

      </div>

      <style>{`
        .mac-scroll::-webkit-scrollbar{width:6px}
        .mac-scroll::-webkit-scrollbar-track{background:transparent}
        .mac-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        .mac-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .mac-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}

        .mac-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .mac-btn-group{display:flex;gap:4px}
        .mac-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .mac-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .mac-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .mac-range{display:flex;align-items:center;gap:6px}
        .mac-lbl{font-size:11px;color:var(--tx3,#888)}
        .mac-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        .mac-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
        .mac-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px 20px}
        .mac-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;line-height:1.3}
        .mac-kpi-num{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);
          letter-spacing:-.5px;line-height:1}
        .mac-kpi-neg{color:#e05060}
        .mac-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px;line-height:1.4}

        .mac-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .mac-card-hd{display:flex;align-items:center;gap:10px;margin-bottom:4px}
        .mac-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .mac-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:14px}

        .mac-badge-rate{padding:2px 8px;border-radius:3px;font-size:10px;font-weight:600;
          background:rgba(74,144,217,.15);color:#7ab8f5;border:1px solid rgba(74,144,217,.3)}
        .mac-badge-val{padding:2px 8px;border-radius:3px;font-size:10px;font-weight:600;
          background:rgba(139,92,246,.15);color:#a78bfa;border:1px solid rgba(139,92,246,.3)}
        .mac-badge-db{padding:2px 8px;border-radius:3px;font-size:10px;font-weight:600;
          background:rgba(38,201,154,.12);color:#26c99a;border:1px solid rgba(38,201,154,.3)}
        .mac-badge-link{padding:2px 8px;border-radius:3px;font-size:10px;font-weight:600;
          background:rgba(240,160,64,.15);color:#f0a040;border:1px solid rgba(240,160,64,.3)}

        .mac-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}

        .mac-toggle-row{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
        .mac-toggle-btn{padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;
          cursor:pointer;border:1.5px solid;transition:all .15s}
      `}</style>
    </div>
  );
}
