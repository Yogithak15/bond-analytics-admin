import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchFpiMonthlyNetFlows,
  fetchFpiCumulativeFlow,
  fetchFpiAnnualFlows,
  fetchFpiAuc,
  fetchFpiCashShare,
} from '../../api/fpiTrackerApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';

function fmtPeriod(period) {
  if (!period) return '';
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m] = period.split('-');
  return `${M[+m - 1]} ${y.slice(2)}`;
}

/* Moving-average helper */
function calcMA(data, n) {
  return data.map((_, i) =>
    i < n - 1 ? null : +(data.slice(i-n+1, i+1).reduce((s, v) => s + +v, 0) / n).toFixed(1)
  );
}

/* ═══════════════════════════════════════════════════════
   CHART HELPERS
═══════════════════════════════════════════════════════ */
const isDk = () => document.documentElement.getAttribute('data-theme') === 'dark';
function cc() {
  const d = isDk();
  return {
    text: d?'#ffffff':'#1a1a1a', text2: d?'#f0f0f0':'#1a1c18',
    grid: d?'rgba(255,255,255,.13)':'rgba(26,28,24,.15)',
    axis: d?'rgba(255,255,255,.10)':'rgba(26,28,24,.10)',
    bg:   d?'#08111f':'#f7f8f3',
    blue:'#2557a7', teal:'#0e7490', green:'#2d8a4e',
    red:'#c0392b',  amber:'#c47a1e', purple:'#6d3fc0',
    orange:'#e07b39', coral:'#e05060',
  };
}
const GRID = (l,r,t,b) => ({top:t, right:r, bottom:b, left:l, containLabel:false});
const ALB  = c => ({color:c.text, fontSize:10});
const SPL  = c => ({lineStyle:{color:c.grid, type:'dashed'}});
const XAX  = (data,c,iv) => ({
  type:'category', data,
  axisLine:{show:false}, axisTick:{show:false},
  axisLabel:{...ALB(c), interval:iv??'auto'},
});
const YAX  = (c,fmt) => ({
  type:'value',
  axisLabel:{...ALB(c), formatter:fmt},
  splitLine:SPL(c), axisLine:{show:false},
});
const niceMax = (v, step) => Math.ceil(v / step) * step;
const TT   = c => ({
  trigger:'axis', backgroundColor:c.bg, borderColor:c.grid,
  textStyle:{color:c.text2, fontSize:11},
  axisPointer:{lineStyle:{color:c.grid}},
});

/* ═══════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════ */
export default function FpiTrackerPage({ isActive }) {
  useThemeWatcher();
  const [period,     setPeriod]     = useState('All');
  const [fromYear,   setFromYear]   = useState('2014');
  const [toYear,     setToYear]     = useState('2026');
  const [showFilter, setShowFilter] = useState('all');   // 'all'|'inflows'|'outflows'
  const [cumMA,      setCumMA]      = useState('Off');   // 'Off'|'3M'|'6M'|'12M'
  const [monthLock,  setMonthLock]  = useState(false);
  const [cumLock,    setCumLock]    = useState(false);

  const [fpiKpi, setFpiKpi] = useState({
    cumFlow:    { value: '—', sub: 'Filtered range cumulative', neg: false },
    aucVal:     { value: '—', sub: 'Total assets under custody', neg: false },
    latestFlow: { value: '—', sub: '—', neg: false },
    cashShare:  { value: '—', sub: 'FPI % in NSE cash turnover', neg: false },
  });
  const [fpiFlowData, setFpiFlowData] = useState({ months: [], values: [], cumValues: [] });
  const [fpiCumData,    setFpiCumData]    = useState({ months: [], values: [] });
  const [fpiAnnualData, setFpiAnnualData] = useState({ years: [], values: [] });
  const [fpiAucData,    setFpiAucData]    = useState({ months: [], values: [] });
  const [fpiShareData,  setFpiShareData]  = useState({ months: [], values: [] });
  const [loadCount, setLoadCount] = useState(0);
  const TOTAL_LOADS = 5;
  const loading = loadCount < TOTAL_LOADS;

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchFpiMonthlyNetFlows().catch(() => []).then(raw => {
      setLoadCount(c => c + 1);
      const list = toList(raw);
      if (!list.length) return;

      const months  = list.map(r => fmtPeriod(r.period));
      const values  = list.map(r => +(+(r.value ?? r.metric_value ?? 0) / 1000).toFixed(1)); // crore → K Cr

      let s = 0;
      const cumValues = values.map(v => { s += v; return +s.toFixed(1); });

      setFpiFlowData({ months, values, cumValues });

      const cumLC   = +(s / 100).toFixed(1);                   // K Cr → L Cr
      const lastVal = values[values.length - 1] ?? 0;
      const lastMon = months[months.length - 1] ?? '—';

      setFpiKpi(prev => ({
        ...prev,
        cumFlow:    { value: `₹${Math.abs(cumLC).toFixed(1)}L Cr`, sub: 'Filtered range cumulative', neg: cumLC < 0 },
        latestFlow: { value: `${lastVal >= 0 ? '+' : '-'}₹${Math.abs(lastVal).toFixed(1)}K Cr`, sub: lastMon, neg: lastVal < 0 },
      }));
    });
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchFpiCumulativeFlow().catch(() => []).then(raw => {
      setLoadCount(c => c + 1);
      const list = toList(raw);
      if (!list.length) return;
      setFpiCumData({
        months: list.map(r => fmtPeriod(r.period)),
        values: list.map(r => +(r.value ?? r.metric_value ?? 0)),
      });
    });
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchFpiAnnualFlows().catch(() => []).then(raw => {
      setLoadCount(c => c + 1);
      const list = toList(raw);
      if (!list.length) return;
      setFpiAnnualData({
        years:  list.map(r => String(r.period).split('-')[0]),
        values: list.map(r => +(+(r.value ?? r.metric_value ?? 0) / 1000).toFixed(1)),  // crore → K Cr
      });
    });
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchFpiAuc().catch(() => []).then(raw => {
      setLoadCount(c => c + 1);
      const list = toList(raw);
      if (!list.length) return;
      const months = list.map(r => fmtPeriod(r.period));
      const values = list.map(r => +(+(r.value ?? r.metric_value ?? 0) / 100000).toFixed(2)); // crore → L Cr
      setFpiAucData({ months, values });
      const latest = values[values.length - 1] ?? 0;
      const latestMon = months[months.length - 1] ?? '—';
      setFpiKpi(prev => ({
        ...prev,
        aucVal: { value: `₹${latest.toFixed(1)}L Cr`, sub: latestMon, neg: false },
      }));
    });
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchFpiCashShare().catch(() => []).then(raw => {
      setLoadCount(c => c + 1);
      const list = toList(raw);
      if (!list.length) return;
      const months = list.map(r => fmtPeriod(r.period));
      const values = list.map(r => +(+(r.value ?? r.metric_value ?? 0)).toFixed(2));
      setFpiShareData({ months, values });
      const latest = values[values.length - 1] ?? 0;
      setFpiKpi(prev => ({
        ...prev,
        cashShare: { value: `${latest.toFixed(1)}%`, sub: 'FPI % in NSE cash turnover', neg: false },
      }));
    });
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

  const monthlyRef = useRef(null);
  const cumRef     = useRef(null);
  const annualRef  = useRef(null);
  const aucRef     = useRef(null);
  const shareRef   = useRef(null);

  /* ── Monthly FPI Net Flows ── */
  useChart(monthlyRef, () => {
    const c = cc();
    const [months, fValues] = fyMonth(fpiFlowData.months, fpiFlowData.values);
    const data = fValues.map(v => {
      if (showFilter === 'inflows'  && v < 0) return 0;
      if (showFilter === 'outflows' && v > 0) return 0;
      return v;
    });
    const maxAbs = Math.max(10, ...fValues.map(Math.abs));
    const yBound = niceMax(maxAbs * 1.2, 50);
    const yStep  = yBound <= 150 ? 50 : yBound <= 300 ? 100 : 200;
    const iv = Math.floor(months.length / 12) || 1;
    return {
      backgroundColor: 'transparent',
      grid: GRID(48, 24, 48, 32),
      tooltip: {
        ...TT(c),
        formatter: p => `${p[0].axisValue}<br/>${p[0].value >= 0 ? '▲' : '▼'} <b>₹${Math.abs(p[0].value)}K Cr</b> ${p[0].value >= 0 ? 'Inflow' : 'Outflow'}`,
      },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v+'K'), min: -yBound, max: yBound, interval: yStep },
      series: [{
        type: 'bar', barMaxWidth: 7,
        data: data.map(v => ({
          value: v,
          itemStyle: {
            color: v >= 0 ? c.green+'cc' : c.red+'cc',
            borderRadius: v >= 0 ? [1,1,0,0] : [0,0,1,1],
          },
        })),
        markLine: {
          silent: true,
          symbol: ['none', 'arrow'],
          symbolSize: [5, 6],
          data: [
            { xAxis:'Jan 20', lineStyle:{color:c.coral, type:'dashed', width:1.2, opacity:.85},
              label:{formatter:'COVID↑', color:c.coral, fontSize:9, position:'insideEndTop', distance:[0,-16]} },
            { xAxis:'May 22', lineStyle:{color:c.amber, type:'dashed', width:1.2, opacity:.85},
              label:{formatter:'Hike↑',  color:c.amber, fontSize:9, position:'insideEndTop', distance:[0,-16]} },
            { xAxis:'Jun 23', lineStyle:{color:c.green, type:'dashed', width:1.2, opacity:.85},
              label:{formatter:'6.5%↑',  color:c.green, fontSize:9, position:'insideEndTop', distance:[0,-16]} },
            { xAxis:'Nov 24', lineStyle:{color:c.blue,  type:'dashed', width:1.2, opacity:.85},
              label:{formatter:'SEBI F&O↑',color:c.blue,fontSize:9, position:'insideEndTop', distance:[0,-16]} },
          ],
        },
      }],
    };
  });

  /* ── Cumulative FPI Net Flow ── */
  useChart(cumRef, () => {
    const c = cc();
    const [months, values] = fyMonth(fpiCumData.months, fpiCumData.values);
    const maPeriods = {'3M':3, '6M':6, '12M':12};
    const maW    = maPeriods[cumMA];
    const maData = maW ? calcMA(values, maW) : null;
    return {
      backgroundColor: 'transparent',
      grid: GRID(52, 16, 32, 32),
      tooltip: { ...TT(c), formatter: p =>
        `${p[0].axisValue}<br/>`+p.filter(s=>s.value!=null).map(s=>`${s.marker}${s.seriesName}: <b>$${s.value.toLocaleString()} mn</b>`).join('<br/>') },
      xAxis: XAX(months, c, Math.floor(months.length / 10) || 1),
      yAxis: { ...YAX(c, v => '$'+v), min: 0 },
      series: [
        {
          type:'line', name:'Cumulative', data:values, smooth:false, symbol:'none',
          lineStyle:{color:c.blue, width:1.5},
          areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,
            colorStops:[{offset:0,color:c.blue+'44'},{offset:1,color:c.blue+'00'}]}},
        },
        ...(maData ? [{
          type:'line', name:`MA ${cumMA}`, data:maData, smooth:true, symbol:'none',
          lineStyle:{color:c.amber, width:1.5, type:'dashed'},
          itemStyle:{color:c.amber},
        }] : []),
      ],
    };
  });

  /* ── Annual FPI Performance ── */
  useChart(annualRef, () => {
    const c = cc();
    const [years, values] = fyYears(fpiAnnualData.years, fpiAnnualData.values);
    const maxAbs  = Math.max(10, ...values.map(Math.abs));
    const yBound  = niceMax(maxAbs * 1.2, 50);
    const yStep   = yBound <= 150 ? 50 : yBound <= 300 ? 100 : 200;
    return {
      backgroundColor: 'transparent',
      grid: GRID(48, 12, 32, 28),
      tooltip: { ...TT(c), formatter: p =>
        `${p[0].axisValue}: <b>${p[0].value >= 0 ? '+' : ''}₹${p[0].value}K Cr</b>` },
      xAxis: XAX(years, c),
      yAxis: { ...YAX(c, v => v+'K'), min: -yBound, max: yBound, interval: yStep },
      series: [{
        type:'bar', barMaxWidth: 32,
        data: values.map(v => ({
          value: v,
          itemStyle: { color: v >= 0 ? c.green : c.red, borderRadius: v >= 0 ? [2,2,0,0] : [0,0,2,2] },
        })),
      }],
    };
  });

  /* ── FPI Assets Under Custody ── */
  useChart(aucRef, () => {
    const c = cc();
    const [months, values] = fyMonth(fpiAucData.months, fpiAucData.values);
    const iv = Math.floor(months.length / 8) || 1;
    return {
      backgroundColor: 'transparent',
      grid: GRID(48, 16, 32, 44),
      legend: {
        data:['FPI AUC'], bottom:4, icon:'line',
        textStyle:{color:c.text, fontSize:10},
        formatter: () => '→  FPI AUC',
      },
      tooltip: { ...TT(c), formatter: p =>
        `${p[0].axisValue}<br/>${p[0].marker}FPI AUC: <b>₹${p[0].value}L Cr</b>` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => '₹'+v+'L'), min: 0 },
      series: [{
        type:'line', name:'FPI AUC', data:values, smooth:true, symbol:'circle', symbolSize:0,
        lineStyle:{color:c.blue, width:2},
        areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,
          colorStops:[{offset:0,color:c.blue+'55'},{offset:1,color:c.blue+'08'}]}},
      }],
    };
  });

  /* ── FPI Share in Cash Turnover ── */
  useChart(shareRef, () => {
    const c = cc();
    const [months, values] = fyMonth(fpiShareData.months, fpiShareData.values);
    const iv = Math.floor(months.length / 8) || 1;
    const maxVal = Math.max(10, ...values);
    return {
      backgroundColor: 'transparent',
      grid: GRID(44, 12, 28, 32),
      tooltip: { ...TT(c), formatter: p =>
        `${p[0].axisValue}<br/>${p[0].marker}Cash Share: <b>${(+p[0].value).toFixed(1)}%</b>` },
      xAxis: XAX(months, c, iv),
      yAxis: { ...YAX(c, v => v+'%'), min: 0, max: niceMax(maxVal * 1.1, 5), interval: 5 },
      series: [{
        type:'line', data:values, smooth:false, symbol:'none',
        lineStyle:{color:c.blue, width:1.5},
      }],
    };
  });

  const top10Rows = (() => {
    const { months, values } = fpiFlowData;
    if (!months.length) return [];
    const entries = months.map((m, i) => ({ month: m, val: values[i] }));
    entries.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
    const top = entries.slice(0, 10);
    const maxAbs = Math.abs(top[0]?.val ?? 1);
    return top.map(r => {
      const isInflow = r.val >= 0;
      const absVal   = Math.abs(r.val);
      return {
        month: r.month,
        flow:  `${isInflow ? '+' : '-'}₹${absVal.toFixed(1)}K Cr`,
        type:  isInflow ? 'INFLOW' : 'OUTFLOW',
        pct:   Math.round((absVal / maxAbs) * 100),
      };
    });
  })();

  const periodOpts = ['1Y','3Y','5Y','All'];
  const fromYears  = ['2014','2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026'];
  const toYears    = ['2015','2016','2017','2018','2019','2020','2021','2022','2023','2024','2025','2026'];

  /* SVG icons */
  const CamIcon = () => (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:12,height:12}}>
      <path d="M5 2.5h4l1 1.5h2a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5h2z"/>
      <circle cx="7" cy="7.5" r="1.8"/>
    </svg>
  );
  const LockIcon = ({ locked }) => (
    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" style={{width:12,height:12}}>
      <rect x="2.5" y="6" width="9" height="6.5" rx="1"/>
      <path d={locked ? 'M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6' : 'M4.5 6V4.5a2.5 2.5 0 0 1 5 0'}/>
    </svg>
  );

  return (
    <div
      className={`page${isActive ? ' on' : ''}`} id="page-fpi"
      style={{display:isActive?'flex':'none', flexDirection:'column', height:'100%', overflow:'hidden'}}
    >
      <div
        className="fpi-scroll"
        style={{flex:'1 1 0', minHeight:0, height:0, overflowY:'scroll', display:'flex', flexDirection:'column', gap:0}}
      >

        {/* ── Header ── */}
        <div className="fpi-hdr">
          <h1 className="fpi-title">FPI Tracker</h1>
          <span className="fpi-sub">Foreign Portfolio Investment flows — 11 years of sentiment data</span>
        </div>

        {/* ── Filter row ── */}
        <div className="fpi-filter-row">
          <div className="fpi-pill-grp">
            {periodOpts.map(p => (
              <button key={p} className={`fpi-pill${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <span className="fpi-lbl">From</span>
          <select className="fpi-sel" value={fromYear} onChange={e=>setFromYear(e.target.value)}>
            {fromYears.map(y=><option key={y}>{y}</option>)}
          </select>
          <span className="fpi-lbl">To</span>
          <select className="fpi-sel" value={toYear} onChange={e=>setToYear(e.target.value)}>
            {toYears.map(y=><option key={y}>{y}</option>)}
          </select>
        </div>

        {/* ── KPI Cards ── */}
        <div className="fpi-kpi-row">
          <div className="fpi-kpi-card">
            <span className="fpi-kpi-label">CUMULATIVE NET FLOW</span>
            <span className={`fpi-kpi-val${fpiKpi.cumFlow.neg ? ' fpi-val-red' : ''}`}>{fpiKpi.cumFlow.value}</span>
            <span className="fpi-kpi-sub">{fpiKpi.cumFlow.sub}</span>
          </div>
          <div className="fpi-kpi-card">
            <span className="fpi-kpi-label">FPI AUC</span>
            <span className="fpi-kpi-val">{fpiKpi.aucVal.value}</span>
            <span className="fpi-kpi-sub">{fpiKpi.aucVal.sub}</span>
          </div>
          <div className={`fpi-kpi-card${fpiKpi.latestFlow.neg ? ' fpi-kpi-neg' : ''}`}>
            <span className="fpi-kpi-label">LATEST MONTHLY FLOW</span>
            <span className={`fpi-kpi-val${fpiKpi.latestFlow.neg ? ' fpi-val-red' : ''}`}>{fpiKpi.latestFlow.value}</span>
            <span className="fpi-kpi-sub">{fpiKpi.latestFlow.sub}</span>
          </div>
          <div className="fpi-kpi-card">
            <span className="fpi-kpi-label">FPI CASH SHARE</span>
            <span className="fpi-kpi-val">{fpiKpi.cashShare.value}</span>
            <span className="fpi-kpi-sub">{fpiKpi.cashShare.sub}</span>
          </div>
        </div>

        {/* ── Show filter ── */}
        <div className="fpi-show-row">
          <span className="fpi-lbl">Show:</span>
          {[['all','All Months'],['inflows','Inflows Only'],['outflows','Outflows Only']].map(([id,lbl])=>(
            <button key={id} className={`fpi-show-btn${showFilter===id?' on':''}`} onClick={()=>setShowFilter(id)}>{lbl}</button>
          ))}
        </div>

        {/* ── Monthly FPI Net Flows (full width, tall) ── */}
        <div className="fpi-card">
          <div className="fpi-card-hdr">
            <div className="fpi-card-hdr-left">
              <span className="fpi-card-title">Monthly FPI Net Flows</span>
              <span className="fpi-badge fpi-badge-months">148 months</span>
            </div>
            <div className="fpi-ctrl-bar">
              <span className="fpi-card-sub">₹ Thousand Crore · green = inflow, red = outflow</span>
            </div>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(monthlyRef.current, 'Monthly FPI Net Flows')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          {loading ? <div className="chart-loader" style={{height:320}} /> : <div ref={monthlyRef} className="fpi-chart fpi-chart-tall" />}
        </div>

        {/* ── Cumulative + Annual side by side ── */}
        <div className="fpi-row2">
          {/* Cumulative */}
          <div className="fpi-card">
            <div className="fpi-card-hdr">
              <div className="fpi-card-hdr-left">
                <span className="fpi-card-title">Cumulative FPI Net Flow</span>
              </div>
             
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(cumRef.current, 'Cumulative FPI Net Flow')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="fpi-card-subt">$ Million USD — cumulative net investment</div>
            {loading ? <div className="chart-loader" style={{height:260}} /> : <div ref={cumRef} className="fpi-chart fpi-chart-normal" />}
          </div>

          {/* Annual */}
          <div className="fpi-card">
            <div className="fpi-card-hdr">
              <div className="fpi-card-hdr-left">
                <span className="fpi-card-title">Annual FPI Performance</span>
                <span className="fpi-badge fpi-badge-annual">annual</span>
              </div>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(annualRef.current, 'Annual FPI Performance')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="fpi-card-subt">₹ Thousand Crore · calendar year totals</div>
            {loading ? <div className="chart-loader" style={{height:260}} /> : <div ref={annualRef} className="fpi-chart fpi-chart-normal" />}
          </div>
        </div>

        {/* ── Top 10 Most Impactful FPI Months ── */}
        <div className="fpi-card">
          <div className="fpi-card-hdr">
            <span className="fpi-card-title">Top 10 Most Impactful FPI Months</span>
          </div>
          <div className="fpi-card-subt fpi-card-subt-pad">By absolute value — largest single-month moves</div>
          <table className="fpi-table">
            <colgroup>
              <col className="col-month" />
              <col className="col-flow" />
              <col className="col-type" />
              <col className="col-scale" />
            </colgroup>
            <thead>
              <tr>
                <th>Month</th>
                <th>Net Flow</th>
                <th>Type</th>
                <th>Scale</th>
              </tr>
            </thead>
            <tbody>
              {top10Rows.map(row => (
                <tr key={row.month}>
                  <td className="fpi-td-month">{row.month}</td>
                  <td className="fpi-td-flow">{row.flow}</td>
                  <td>
                    <span className={`fpi-type-badge ${row.type==='INFLOW'?'fpi-badge-in':'fpi-badge-out'}`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="fpi-td-scale">
                    <div className="fpi-scale-track">
                      <div
                        className={`fpi-scale-fill ${row.type==='INFLOW'?'fpi-fill-green':'fpi-fill-red'}`}
                        style={{width: row.pct+'%'}}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── FPI Assets Under Custody ── */}
        <div className="fpi-card">
          <div className="fpi-card-hdr">
            <span className="fpi-card-title">FPI Assets Under Custody</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(aucRef.current, 'FPI Assets Under Custody')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="fpi-card-subt fpi-card-subt-pad">₹ Lakh Crore — total FPI AUC</div>
          {loading ? <div className="chart-loader" style={{height:260}} /> : <div ref={aucRef} className="fpi-chart fpi-chart-normal" />}
        </div>

        {/* ── FPI Share in Cash Turnover ── */}
        <div className="fpi-card">
          <div className="fpi-card-hdr">
            <span className="fpi-card-title">FPI Share in Cash Turnover</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(shareRef.current, 'FPI Share in Cash Turnover')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="fpi-card-subt fpi-card-subt-pad">% of NSE cash turnover</div>
          {loading ? <div className="chart-loader" style={{height:260}} /> : <div ref={shareRef} className="fpi-chart fpi-chart-normal" />}
        </div>

      </div>{/* end fpi-scroll */}

      {/* ── Scoped styles ── */}
      <style>{`
        .fpi-scroll::-webkit-scrollbar { width: 6px; }
        .fpi-scroll::-webkit-scrollbar-track { background: transparent; }
        .fpi-scroll::-webkit-scrollbar-thumb { background: rgba(128,128,128,.35); border-radius: 3px; }
        .fpi-scroll::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,.6); }

        /* ── Header ── */
        .fpi-hdr {
          padding: 16px 20px 10px;
          // border-bottom: 1px solid var(--bdr);
          flex-shrink: 0;
        }
        .fpi-title { font-size: 22px; font-weight: 800; color: var(--tx); letter-spacing: -.5px; line-height: 1; }
        .fpi-sub   { font-size: 11.5px; color: var(--tx3); display: block; margin-top: 4px; }

        /* ── Filter row ── */
        .fpi-filter-row {
          display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
          padding: 8px 20px; 
          // border-bottom: 1px solid var(--bdr); 
          flex-shrink: 0;
        }
        .fpi-lbl { font-size: 11.5px; color: var(--tx3); }
        .fpi-pill-grp {
          display: flex; background: var(--sf2);
          border: 1px solid var(--bdr2); border-radius: 8px; overflow: hidden;
        }
        .fpi-pill {
          padding: 5px 11px; font-size: 11.5px; font-weight: 500;
          color: var(--tx3); background: none; border: none;
          border-right: 1px solid var(--bdr); cursor: pointer;
          transition: all .12s; font-family: var(--fn); user-select: none;
        }
        .fpi-pill:last-child { border-right: none; }
        .fpi-pill:hover { color: var(--tx); background: var(--sf3); }
        .fpi-pill.on { background: var(--acc); color: #fff; font-weight: 600; }
        [data-theme="dark"] .fpi-pill.on { background: var(--sf3); color: var(--tx); }
        .fpi-sel {
          padding: 5px 22px 5px 9px; font-size: 11.5px;
          border: 1px solid var(--bdr2); border-radius: 7px;
          background: var(--sf2); color: var(--tx);
          font-family: var(--fn); outline: none; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239a9d92' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 7px center;
        }

        /* ── KPI Cards ── */
        .fpi-kpi-row {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 10px; padding: 12px 16px;
          // border-bottom: 1px solid var(--bdr); 
          flex-shrink: 0;
        }
        .fpi-kpi-card {
          padding: 16px 18px;
          border: 1px solid var(--bdr2); border-radius: 10px;
          background: var(--sf);
          display: flex; flex-direction: column; gap: 4px;
        }
        // .fpi-kpi-neg { border-left: 3px solid var(--red); }
        .fpi-kpi-label {
          font-size: 9.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .09em; color: var(--tx3);
        }
        .fpi-kpi-val {
          font-size: 20px; font-weight: 800; font-family: var(--mo);
          color: var(--tx); letter-spacing: -.5px; line-height: 1.1;
        }
        // .fpi-val-red { color: var(--red) !important; }
        .fpi-kpi-sub { font-size: 10.5px; color: var(--tx3); }

        /* ── Show filter ── */
        .fpi-show-row {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 20px; 
          // border-bottom: 1px solid var(--bdr);
           flex-shrink: 0;
        }
        .fpi-show-btn {
          padding: 5px 14px; font-size: 12px; font-weight: 500;
          background: var(--sf2); border: 1px solid var(--bdr2);
          border-radius: 7px; color: var(--tx2); cursor: pointer;
          font-family: var(--fn); transition: all .12s;
        }
        .fpi-show-btn:hover { background: var(--sf3); color: var(--tx); }
        .fpi-show-btn.on { background: var(--teal); color: #fff; border-color: var(--teal); font-weight: 600; }

        /* ── Cards ── */
        .fpi-card {
          margin: 12px 16px 0;
          background: var(--sf); border: 1px solid var(--bdr);
          border-radius: 14px; overflow: hidden; box-shadow: var(--shxs);
          flex-shrink: 0;
        }
        .fpi-card:last-child { margin-bottom: 40px; }
        .fpi-card-hdr {
          padding: 12px 16px 10px; border-bottom: 1px solid var(--bdr);
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; flex-wrap: wrap;
        }
        .fpi-card-hdr-left { display: flex; align-items: center; gap: 8px; flex: 1; }
        .fpi-card-title { font-size: 13px; font-weight: 700; color: var(--tx); }
        .fpi-card-sub { font-size: 10.5px; color: var(--tx3); white-space: nowrap; flex-shrink: 1; overflow: hidden; text-overflow: ellipsis; }
        .fpi-card-subt { font-size: 10.5px; color: var(--tx3); display: block; padding: 6px 16px 0; }
        .fpi-card-subt-pad { padding-bottom: 4px; }

        /* ── Badges ── */
        .fpi-badge {
          display: inline-block; font-size: 10px; font-family: var(--mo);
          font-weight: 700; padding: 2px 7px; border-radius: 5px; flex-shrink: 0;
        }
        .fpi-badge-months { background: var(--teal-s); color: var(--teal); border: 1px solid rgba(14,116,144,.2); }
        [data-theme="dark"] .fpi-badge-months { background: rgba(14,116,144,.15); color: var(--teal); }
        .fpi-badge-annual  { background: var(--green-s); color: var(--green); border: 1px solid rgba(45,138,78,.2); }
        [data-theme="dark"] .fpi-badge-annual { background: rgba(45,138,78,.15); color: var(--green); }

        /* ── Control bar ── */
        .fpi-ctrl-bar { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
        .fpi-icon-btn {
          width: 26px; height: 24px; display: flex; align-items: center; justify-content: center;
          background: var(--sf2); border: 1px solid var(--bdr2); border-radius: 6px;
          cursor: pointer; color: var(--tx3); padding: 0; transition: all .12s;
        }
        .fpi-icon-btn:hover { background: var(--sf3); color: var(--tx); }
        .fpi-icon-btn.on    { background: var(--sf3); color: var(--tx); }
        .fpi-ma-sel {
          height: 24px; padding: 0 16px 0 7px; font-size: 10.5px;
          border: 1px solid var(--bdr2); border-radius: 6px;
          background: var(--sf2); color: var(--tx2);
          font-family: var(--fn); outline: none; cursor: pointer; appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%239a9d92' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 5px center;
        }

        /* ── Two-column layout ── */
        .fpi-row2 {
          margin: 12px 16px 0;
          display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
          flex-shrink: 0;
        }
        .fpi-row2 .fpi-card { margin: 0; }

        /* ── Chart heights ── */
        .fpi-chart { width: 100%; display: block; }
        .fpi-chart-tall   { height: 320px; }
        .fpi-chart-normal { height: 260px; }

        /* ── Top 10 Table ── */
        .fpi-table {
          width: 100%; border-collapse: collapse;
          font-size: 12.5px; margin-top: 4px; table-layout: fixed;
        }
        .fpi-table colgroup .col-month  { width: 12%; }
        .fpi-table colgroup .col-flow   { width: 18%; }
        .fpi-table colgroup .col-type   { width: 14%; }
        .fpi-table colgroup .col-scale  { width: 56%; }
        .fpi-table thead tr { border-bottom: 1px solid var(--bdr2); }
        .fpi-table th {
          padding: 8px 20px; text-align: left;
          font-size: 10.5px; font-weight: 700; text-transform: uppercase;
          letter-spacing: .07em; color: var(--tx3);
        }
        .fpi-table tbody tr {
          border-bottom: 1px solid var(--bdr);
          transition: background .1s;
        }
        .fpi-table tbody tr:last-child { border-bottom: none; }
        .fpi-table tbody tr:hover { background: var(--sf2); }
        .fpi-table td { padding: 10px 20px; vertical-align: middle; }
        .fpi-td-month { font-weight: 600; color: var(--tx); font-size: 13px; white-space: nowrap; }
        .fpi-td-flow  { font-family: var(--mo); font-weight: 700; color: var(--tx); font-size: 13px; white-space: nowrap; }
        .fpi-type-badge {
          display: inline-block; font-size: 9.5px; font-weight: 800;
          padding: 2px 10px; border-radius: 4px; letter-spacing: .08em;
        }
        .fpi-badge-in  { background: rgba(45,138,78,.15); color: var(--green); border: 1px solid rgba(45,138,78,.25); }
        .fpi-badge-out { background: rgba(192,57,43,.15);  color: var(--red);   border: 1px solid rgba(192,57,43,.25); }
        .fpi-td-scale { padding-right: 24px; }
        .fpi-scale-track {
          height: 8px; background: var(--sf2);
          border-radius: 4px; overflow: hidden; width: 100%;
        }
        .fpi-scale-fill {
          height: 100%; border-radius: 4px; transition: width .3s;
        }
        .fpi-fill-green { background: var(--green); }
        .fpi-fill-red   { background: var(--red); }

        /* ── Responsive ── */
        @media (max-width: 1000px) {
          .fpi-kpi-row  { grid-template-columns: repeat(2, 1fr); }
          .fpi-row2     { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .fpi-kpi-row  { grid-template-columns: 1fr 1fr; }
          .fpi-kpi-val  { font-size: 20px; }
          .fpi-chart-tall   { height: 240px; }
          .fpi-chart-normal { height: 200px; }
          .fpi-card { margin: 10px 10px 0; }
          .fpi-row2 { margin: 10px 10px 0; }
        }
      `}</style>
    </div>
  );
}
