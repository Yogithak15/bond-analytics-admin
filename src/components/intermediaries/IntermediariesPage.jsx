import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import { fetchAifRegistered, fetchFpiRegistered, fetchIntermediaryTrends, fetchDematGrowth, fetchClearingFundsPayin, INTERMEDIARY_DIMS } from '../../api/intermediariesApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';

/* ── Series config for custom toggle (labels/colors only, no data) ── */
const SERIES_ORDER = ['AIF','FPI','PM','RA','MF'];
const SERIES_CFG = {
  AIF: { label:'AIF', color:'#8b5cf6' },
  FPI: { label:'FPI', color:'#4a90d9' },
  PM:  { label:'PM',  color:'#26c99a' },
  RA:  { label:'RA',  color:'#f0a040' },
  MF:  { label:'MF',  color:'#e05060' },
};

/* ── Bottom snapshot ── */
const SNAP = [
  { n:'—',  label:'Alternative Investment Funds', color:'#8b5cf6' },
  { n:'—',  label:'Foreign Portfolio Investors',  color:'#4a90d9' },
  { n:'—',  label:'Portfolio Managers',           color:'#26c99a' },
  { n:'—',  label:'Research Analysts',            color:'#f0a040' },
  { n:'—',  label:'Mutual Funds',                 color:'#e05060' },
  { n:'—',  label:'InvITs',                       color:'#f0a040' },
  { n:'—',  label:'REITs',                        color:'#26c99a' },
];

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
  type:'category', data,
  axisLine:{lineStyle:{color:c.axis}}, axisTick:{show:false},
  axisLabel:{...ALB(c), interval:iv??'auto'},
});
const YAX  = (c,fmt) => ({
  type:'value',
  axisLabel:{...ALB(c), formatter:fmt},
  splitLine:SPL(c), axisLine:{show:false},
});
const TT = c => ({
  trigger:'axis', backgroundColor:c.bg, borderColor:c.grid,
  textStyle:{color:c.text2, fontSize:11},
  axisPointer:{lineStyle:{color:c.grid}},
});

export default function IntermediariesPage({ isActive }) {
  useThemeWatcher();
  const [period,      setPeriod]      = useState('All');
  const [fromYear,    setFromYear]    = useState('2014');
  const [toYear,      setToYear]      = useState('2026');
  const [activeSeries, setActiveSeries] = useState(new Set(['PM','RA']));
  const [aifData, setAifData] = useState({ months: [], values: [] });
  const [fpiData,        setFpiData]        = useState({ months: [], values: [] });
  const [customTrends,   setCustomTrends]   = useState({});
  const [dematData,      setDematData]      = useState({ months: [], cdsl: [], nsdl: [] });
  const [clearingData,   setClearingData]   = useState({ years: [], nsccl: [], iccl: [] });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchAifRegistered()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        setAifData({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchFpiRegistered()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        setFpiData({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtP = p => { const [y,m] = (p??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    fetchIntermediaryTrends()
      .then(results => {
        const map = {};
        results.forEach(({ key, color, raw }) => {
          const list = toList(raw);
          map[key] = { color, months: list.map(r => fmtP(r.period)), values: list.map(r => +(r.value ?? r.metric_value ?? 0)) };
        });
        setCustomTrends(map);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtP = p => { const [y,m] = (p??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    fetchDematGrowth()
      .then(([cdslRaw, nsdlRaw]) => {
        const cdslList = toList(cdslRaw);
        const nsdlList = toList(nsdlRaw);
        const nsdlMap  = {};
        nsdlList.forEach(r => { nsdlMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        if (!cdslList.length) return;
        setDematData({
          months: cdslList.map(r => fmtP(r.period)),
          // metric is in lakh → ÷100 to convert to Crore
          cdsl: cdslList.map(r => +((+(r.value ?? r.metric_value ?? 0)) / 100).toFixed(2)),
          nsdl: cdslList.map(r => +((nsdlMap[r.period] ?? 0) / 100).toFixed(2)),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchClearingFundsPayin()
      .then(([nssRaw, iccRaw]) => {
        const nssList = toList(nssRaw);
        const iccList = toList(iccRaw);
        if (!nssList.length && !iccList.length) return;
        const iccMap = {};
        iccList.forEach(r => { iccMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        // use NSCCL as the period spine (larger dataset)
        const base = nssList.length >= iccList.length ? nssList : iccList;
        const nssMap = {};
        nssList.forEach(r => { nssMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        const periods = [...new Set([...nssList, ...iccList].map(r => r.period))].sort();
        setClearingData({
          years: periods.map(p => p.split('-')[0]),       // "2024-25" → "2024"
          nsccl: periods.map(p => nssMap[p] ?? 0),
          iccl:  periods.map(p => iccMap[p] ?? 0),
        });
      }).catch(() => {});
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

  const rAif      = useRef(null);
  const rFpi      = useRef(null);
  const rCustom   = useRef(null);
  const rDemat    = useRef(null);
  const rClear    = useRef(null);
  const rDepShare = useRef(null);

  function toggleSeries(key) {
    setActiveSeries(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  /* AIF Explosive Growth — registered AIF count over time */
  useChart(rAif, () => {
    const [months, values] = fyMonth(aifData.months, aifData.values);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxV = Math.max(...values);
    const step = maxV <= 500 ? 100 : maxV <= 1000 ? 250 : maxV <= 2000 ? 500 : 1000;
    const yMax = Math.ceil(maxV / step) * step;
    const latest = values[values.length - 1];
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Registered AIFs: <b>${Math.round(p[0].value).toLocaleString('en-IN')}</b>`,
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v.toLocaleString('en-IN') },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      graphic: latest ? [{
        type: 'text', right: 16, top: 12,
        style: { text: `${latest.toLocaleString('en-IN')} registered`, fill: '#8b5cf6', fontSize: 11, fontWeight: 700 },
      }] : [],
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'none',
        lineStyle: { color: '#8b5cf6', width: 2.5 },
        itemStyle: { color: '#8b5cf6' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#8b5cf666' }, { offset: 1, color: '#8b5cf608' }] } },
      }],
    };
  });

  /* FPI Registered Count */
  useChart(rFpi, () => {
    const [months, values] = fyMonth(fpiData.months, fpiData.values);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxV = Math.max(...values);
    const step = maxV <= 5000 ? 1000 : maxV <= 10000 ? 2000 : maxV <= 20000 ? 5000 : 10000;
    const yMax = Math.ceil(maxV / step) * step;
    const latest = values[values.length - 1];
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}Registered FPIs: <b>${Math.round(p[0].value).toLocaleString('en-IN')}</b>`,
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      graphic: latest ? [{
        type: 'text', right: 16, top: 12,
        style: { text: `${latest.toLocaleString('en-IN')} registered`, fill: '#4a90d9', fontSize: 11, fontWeight: 700 },
      }] : [],
      series: [{
        type: 'line', data: values, smooth: true, symbol: 'none',
        lineStyle: { color: '#4a90d9', width: 2.5 },
        itemStyle: { color: '#4a90d9' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#4a90d966' }, { offset: 1, color: '#4a90d908' }] } },
      }],
    };
  });

  /* Custom Toggle Multi-line */
  /* ── Intermediary Trends Custom — toggled multi-line chart ── */
  useChart(rCustom, () => {
    const active = INTERMEDIARY_DIMS.filter(d => activeSeries.has(d.key) && customTrends[d.key]?.months?.length);
    if (!active.length) return null;
    const c = cc();
    // filter each series by fromYear/toYear
    const filteredTrends = {};
    active.forEach(d => {
      const [fm, fv] = fyMonth(customTrends[d.key].months, customTrends[d.key].values);
      filteredTrends[d.key] = { color: d.color, months: fm, values: fv };
    });
    // use longest filtered series as x-axis spine
    const spine = active.reduce((a, b) => (filteredTrends[b.key].months.length > filteredTrends[a.key].months.length ? b : a));
    const months = filteredTrends[spine.key].months;
    const iv = Math.max(1, Math.floor(months.length / 10));
    const allVals = active.flatMap(d => filteredTrends[d.key].values);
    const maxV = Math.max(...allVals.filter(Boolean));
    const step = maxV <= 500 ? 100 : maxV <= 2000 ? 400 : maxV <= 5000 ? 1000 : maxV <= 20000 ? 5000 : 10000;
    const yMax = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${Math.round(s.value).toLocaleString('en-IN')}</b>`).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: active.map(d => ({ name: d.key, itemStyle: { color: d.color } })),
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v) },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: active.map(d => {
        const seriesMonths = filteredTrends[d.key].months;
        const seriesVals   = filteredTrends[d.key].values;
        const monthMap = Object.fromEntries(seriesMonths.map((m, i) => [m, seriesVals[i]]));
        return {
          name: d.key, type: 'line', smooth: false, symbol: 'circle', symbolSize: 3,
          connectNulls: false,
          data: months.map(m => monthMap[m] ?? null),
          lineStyle: { color: d.color, width: 2 },
          itemStyle: { color: d.color },
        };
      }),
    };
  });

  /* Demat Account Growth — CDSL vs NSDL stacked area chart */
  useChart(rDemat, () => {
    const [months, cdsl, nsdl] = fyMonth(dematData.months, dematData.cdsl, dematData.nsdl);
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxStack = Math.max(...cdsl.map((v, i) => v + (nsdl[i] ?? 0)));
    const step = maxStack <= 12 ? 6 : maxStack <= 24 ? 6 : maxStack <= 36 ? 6 : 10;
    const yMax = Math.ceil(maxStack / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(1)}Cr</b>`).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: ['CDSL', 'NSDL'],
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `${v}Cr` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [
        { name: 'CDSL', type: 'line', data: cdsl, smooth: true, symbol: 'none',
          stack: 'demat',
          lineStyle: { color: '#3b82f6', width: 2 }, itemStyle: { color: '#3b82f6' },
          areaStyle: { color: '#3b82f666' } },
        { name: 'NSDL', type: 'line', data: nsdl, smooth: true, symbol: 'none',
          stack: 'demat',
          lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' },
          areaStyle: { color: '#10b981cc' } },
      ],
    };
  });

  /* Clearing House Funds Pay-in — NSCCL + ICCL stacked bar */
  useChart(rClear, () => {
    const [years, nsccl, iccl] = fyYears(clearingData.years, clearingData.nsccl, clearingData.iccl);
    if (!years.length) return null;
    const c = cc();
    const maxStack = Math.max(...nsccl.map((v, i) => v + (iccl[i] ?? 0)));
    const mag = Math.pow(10, Math.floor(Math.log10(maxStack)));
    const step = Math.ceil(maxStack / (mag * 4)) * mag;
    const yMax = Math.ceil(maxStack / step) * step;
    const fmtV = v => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e5 ? `${(v/1e5).toFixed(1)}L` : v.toLocaleString('en-IN');
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value > 0).map(s => `${s.marker}${s.seriesName}: <b>₹${fmtV(s.value)} Cr</b>`).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 14, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: ['NSCCL', 'ICCL'],
      },
      xAxis: {
        type: 'category', data: years,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9 },
      },
      yAxis: {
        type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => v.toLocaleString('en-IN') },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [
        { name: 'NSCCL', type: 'bar', stack: 'ch', data: nsccl, barMaxWidth: 80,
          itemStyle: { color: '#3b82f6' } },
        { name: 'ICCL',  type: 'bar', stack: 'ch', data: iccl,  barMaxWidth: 80,
          itemStyle: { color: '#06b6d4' } },
      ],
    };
  });

  /* Depository Market Share — 100% stacked area (CDSL % vs NSDL %) */
  useChart(rDepShare, () => {
    const [months, cdsl, nsdl] = fyMonth(dematData.months, dematData.cdsl, dematData.nsdl);
    if (!months.length) return null;
    const c = cc();
    // show a label roughly every 3 months so all data is visible with readable labels
    const iv = Math.max(1, Math.floor(months.length / 40));
    // calculate % share per period
    const cdslPct = cdsl.map((v, i) => {
      const total = v + (nsdl[i] ?? 0);
      return total > 0 ? +((v / total) * 100).toFixed(2) : 0;
    });
    const nsdlPct = nsdl.map((v, i) => {
      const total = v + (cdsl[i] ?? 0);
      return total > 0 ? +((v / total) * 100).toFixed(2) : 0;
    });
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` +
          p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(1)}%</b>`).join('<br/>'),
      },
      legend: {
        bottom: 4, itemWidth: 16, itemHeight: 8,
        textStyle: { color: c.text, fontSize: 10 },
        data: ['CDSL %', 'NSDL %'],
      },
      xAxis: {
        type: 'category', data: months, boundaryGap: false,
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 9, interval: iv },
      },
      yAxis: {
        type: 'value', min: 0, max: 120, interval: 30,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `${v}%` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      series: [
        { name: 'CDSL %', type: 'line', data: cdslPct, smooth: true, symbol: 'none',
          stack: 'share',
          lineStyle: { color: '#3b82f6', width: 1.5 }, itemStyle: { color: '#3b82f6' },
          areaStyle: { color: '#3b82f6bb' } },
        { name: 'NSDL %', type: 'line', data: nsdlPct, smooth: true, symbol: 'none',
          stack: 'share',
          lineStyle: { color: '#10b981', width: 1.5 }, itemStyle: { color: '#10b981' },
          areaStyle: { color: '#10b981bb' } },
      ],
    };
  });

  return (
    <div
      id="page-im"
      style={{display:isActive?'flex':'none',flexDirection:'column',height:'100%',overflow:'hidden'}}
    >
      <div
        className="im-scroll"
        style={{flex:'1 1 0',minHeight:0,height:0,overflowY:'scroll',
                display:'flex',flexDirection:'column',gap:14,padding:'18px 20px 40px'}}
      >
        {/* Header */}
        <div>
          <div className="im-title">Market Intermediaries</div>
          <div className="im-sub">SEBI-registered entities driving India's capital markets ecosystem</div>
        </div>

        {/* Filters */}
        <div className="im-filters">
          <div className="im-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`im-btn${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="im-range">
            <span className="im-lbl">From</span>
            <select className="im-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="im-lbl">To</span>
            <select className="im-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* 6 KPI cards — values from customTrends (latest month each) */}
        {(() => {
          const fmtKpi = v => v == null ? '—' : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(Math.round(v));
          const latest = key => { const d = customTrends[key]; return d?.values?.length ? d.values[d.values.length-1] : null; };
          const KPI_CFG = [
            { key:'AIF',   lbl:'ALT. INVESTMENT FUNDS',   note:'15× growth since 2015',  color:'var(--tx)' },
            { key:'FPI',   lbl:'FOREIGN PORTFOLIO INV.',  note:'Registered with SEBI',    color:'var(--tx)' },
            { key:'PM',    lbl:'PORTFOLIO MANAGERS',      note:'Wealth managers',          color:'var(--tx)' },
            { key:'RA',    lbl:'RESEARCH ANALYSTS',       note:'5.7× since 2016',          color:'var(--tx)' },
            { key:'MF',    lbl:'MUTUAL FUNDS',            note:'Including inactive',        color:'var(--tx)' },
            { key:'INVIT', lbl:'INVITS',                  note:'Infrastructure trusts',     color:'var(--tx)' },
          ];
          return (
            <div className="im-kpis">
              {KPI_CFG.map(k => (
                <div key={k.key} className="im-kpi">
                  <div className="im-kpi-lbl">{k.lbl}</div>
                  <div className="im-kpi-num" style={{ color: k.color }}>{fmtKpi(latest(k.key))}</div>
                  <div className="im-kpi-note">{k.note}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* AIF chart — full width */}
        <div className="im-card">
          <div className="im-card-hd">
            <span className="im-card-title">Alternative Investment Funds — Explosive Growth</span>
            <span className="im-badge-growth">15× growth</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rAif.current, 'Alternative Investment Funds — Explosive Growth')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="im-card-sub">Registered AIFs · source: SEBI · {aifData.values.length ? `${aifData.values[0].toLocaleString('en-IN')} (${aifData.months[0]}) → ${aifData.values[aifData.values.length-1].toLocaleString('en-IN')} (${aifData.months[aifData.months.length-1]})` : 'Loading…'}</div>
          <div ref={rAif} style={{height:260}} />
        </div>

        {/* FPI | Custom Toggle — side by side */}
        <div className="im-row2">
          <div className="im-card">
            <div className="im-card-hd">
              <span className="im-card-title">Foreign Portfolio Investors (FPI)</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rFpi.current, 'Foreign Portfolio Investors (FPI)')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="im-card-sub">Registered entities count · steady growth with re-registration in 2014</div>
            <div ref={rFpi} style={{height:280}} />
          </div>
          <div className="im-card">
            <div className="im-card-hd">
              <span className="im-card-title">Intermediary Trends — Custom</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rCustom.current, 'Intermediary Trends — Custom')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="im-card-sub">Toggle entities below to compare growth</div>
            <div className="im-toggle-row">
              {SERIES_ORDER.map(k => (
                <button
                  key={k}
                  className={`im-toggle-btn${activeSeries.has(k) ? ' on' : ''}`}
                  style={activeSeries.has(k)
                    ? { background: SERIES_CFG[k].color, borderColor: SERIES_CFG[k].color, color:'#fff' }
                    : { borderColor:'rgba(255,255,255,.2)', color:'var(--tx3,#888)', background:'transparent' }}
                  onClick={() => toggleSeries(k)}
                >{k}</button>
              ))}
            </div>
            <div ref={rCustom} style={{height:244}} />
          </div>
        </div>

        {/* Demat Account Growth — full width */}
        <div className="im-card">
          <div className="im-card-hd">
            <span className="im-card-title">Demat Account Growth — CDSL vs NSDL</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rDemat.current, 'Demat Account Growth — CDSL vs NSDL')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="im-card-sub">Total demat accounts by depository · stacked</div>
          <div ref={rDemat} style={{height:280}} />
        </div>

        {/* Clearing House — full width */}
        <div className="im-card">
          <div className="im-card-hd">
            <span className="im-card-title">Clearing House Funds Pay-in</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rClear.current, 'Clearing House Funds Pay-in')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="im-card-sub">Annual funds pay-in (₹ crore) by clearing corporation</div>
          <div ref={rClear} style={{height:280}} />
        </div>

        {/* Depository Market Share — full width */}
        <div className="im-card">
          <div className="im-card-hd">
            <span className="im-card-title">Depository Market Share</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rDepShare.current, 'Depository Market Share')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="im-card-sub">CDSL overtook NSDL in ~2020</div>
          <div ref={rDepShare} style={{height:280}} />
        </div>

        {/* Current Registered Entities Snapshot */}
        <div className="im-snap-wrap">
          <div className="im-snap-title">Current Registered Entities Snapshot</div>
          <div className="im-snap-grid">
            {(() => {
              const fmtN = v => v == null ? '—' : v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(Math.round(v));
              const SNAP_CFG = [
                { key:'AIF',   label:'Alternative Investment Funds', color:'#8b5cf6' },
                { key:'FPI',   label:'Foreign Portfolio Investors',  color:'#4a90d9' },
                { key:'PM',    label:'Portfolio Managers',           color:'#26c99a' },
                { key:'RA',    label:'Research Analysts',            color:'#f0a040' },
                { key:'MF',    label:'Mutual Funds',                 color:'#e05060' },
                { key:'INVIT', label:'InvITs',                       color:'#06b6d4' },
                { key:'REIT',  label:'REITs',                        color:'#26c99a' },
              ];
              return SNAP_CFG.map(s => {
                const d = customTrends[s.key];
                const val = d?.values?.length ? d.values[d.values.length - 1] : null;
                return (
                  <div key={s.label} className="im-snap-card">
                    <div className="im-snap-num" style={{color: s.color}}>{fmtN(val)}</div>
                    <div className="im-snap-lbl">{s.label}</div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

      </div>

      <style>{`
        .im-scroll::-webkit-scrollbar{width:6px}
        .im-scroll::-webkit-scrollbar-track{background:transparent}
        .im-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        .im-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .im-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}

        .im-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .im-btn-group{display:flex;gap:4px}
        .im-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .im-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .im-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .im-range{display:flex;align-items:center;gap:6px}
        .im-lbl{font-size:11px;color:var(--tx3,#888)}
        .im-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        .im-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
        .im-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:14px 16px}
        .im-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;line-height:1.3}
        .im-kpi-num{font-size:20px;font-weight:700;color:var(--tx2,#e0e0e0);
          letter-spacing:-.5px;line-height:1}
        .im-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px;line-height:1.4}

        .im-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .im-card-hd{display:flex;align-items:center;gap:10px;margin-bottom:4px}
        .im-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .im-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:14px}
        .im-badge-growth{padding:2px 8px;border-radius:3px;font-size:10px;font-weight:600;
          background:rgba(45,138,78,.2);color:#2d8a4e;border:1px solid rgba(45,138,78,.4)}

        .im-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}

        .im-toggle-row{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}
        .im-toggle-btn{padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;
          cursor:pointer;border:1.5px solid;transition:all .15s}

        .im-snap-wrap{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .im-snap-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0);margin-bottom:14px}
        .im-snap-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px}
        .im-snap-card{text-align:center;padding:14px 8px;
          background:var(--sf2,rgba(255,255,255,.04));border-radius:6px}
        .im-snap-num{font-size:20px;font-weight:700;letter-spacing:-.5px;line-height:1;margin-bottom:6px}
        .im-snap-lbl{font-size:10px;color:var(--tx3,#888);line-height:1.35}
      `}</style>
    </div>
  );
}
