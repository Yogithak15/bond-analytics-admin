import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import {
  fetchKpiNseMcap,
  fetchKpiBseMcap,
  fetchKpiFpiNetFlowYtd,
  fetchKpiQipYtd,
  fetchKpiRegisteredAifs,
  fetchKpiRegisteredFpis,
  fetchKpiDematAccounts,
  fetchOthersCashShare,
  fetchParticipantShare,
  fetchNseMcap,
  fetchNseTurnoverMonthly,
  fetchFpiFlowsMonthly,
  fetchFpiFlowsAnnual,
  fetchAdvanceDecline,
  fetchIndiaVix,
  fetchNiftyPE,
} from '../../api/overviewApi';
import { useChart } from '../../hooks/useChart';
import { openChartPreview } from '../../lib/chartPreview';

const KPI_CARDS = [
  { label: 'NSE MARKET CAP',       sub: 'National Stock Exchange'     },
  { label: 'BSE MARKET CAP',       sub: 'Bombay Stock Exchange'       },
  { label: 'FPI NET FLOW YTD',     sub: 'Calendar year to date'       },
  { label: 'QIP RAISED YTD',       sub: 'Qualified Inst. Placement'   },
  { label: 'REGISTERED AIFS',      sub: 'Alternative Investment Funds' },
  { label: 'REGISTERED FPIS',      sub: 'Foreign Portfolio Investors'  },
  { label: 'TOTAL DEMAT ACCOUNTS', sub: 'CDSL + NSDL combined'        },
];


const METRICS = [
  { label: 'INDIA VIX',         value: '—', sub: 'Latest value'                    },
  { label: 'NIFTY P/E',         value: '—', sub: 'Valuation multiple'              },
  { label: 'OTHERS CASH SHARE', value: '—', sub: 'NSE cash participant category'   },
];

const DIM_META = {
  33908: { name: 'Proprietary',  color: '#3b82f6' },
  33909: { name: 'FPIs',         color: '#6366f1' },
  33910: { name: 'Mutual Funds', color: '#8b5cf6' },
  33911: { name: 'Banks',        color: '#06b6d4' },
  33912: { name: 'Others',       color: '#0ea5e9' },
};

/* ── Helpers ── */
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function periodToLabel(p) { const [y,m] = p.split('-'); return `${MON[+m-1]} ${y.slice(2)}`; }
function periodToYear(p)  { return p.split('-')[0]; }
function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
function cc() {
  const d = isDark();
  return {
    text: d ? '#ffffff' : '#1a1a1a',
    grid: d ? 'rgba(255,255,255,.13)' : 'rgba(26,28,24,.15)',
    axis: d ? 'rgba(255,255,255,.10)' : 'rgba(26,28,24,.10)',
    bg:   d ? '#08111f' : '#f7f8f3',
    blue: '#3b82f6', green: '#2d8a4e', red: '#c0392b',
  };
}
const GRID = (l = 8) => ({ top: 28, right: 12, bottom: 32, left: l, containLabel: true });
const ALB  = c => ({ color: c.text, fontSize: 10 });
const SPL  = c => ({ lineStyle: { color: c.grid, type: 'dashed' } });
const XAX  = (data, c, interval) => ({ type: 'category', data, axisLine: { lineStyle: { color: c.axis } }, axisTick: { show: false }, axisLabel: { ...ALB(c), interval: interval ?? 'auto' }, splitLine: SPL(c) });
const YAX  = (c, fmt) => ({ type: 'value', axisLabel: { ...ALB(c), formatter: fmt }, splitLine: SPL(c), axisLine: { show: false } });

export default function OverviewPage({ isActive }) {
  useThemeWatcher();
  const [period,   setPeriod]   = useState('All');
  const [fromYear, setFromYear] = useState('2014');
  const [toYear,   setToYear]   = useState('2026');

  const mcapRef     = useRef(null);
  const fpiFlowRef  = useRef(null);
  const turnoverRef = useRef(null);
  const annFpiRef   = useRef(null);
  const donutRef    = useRef(null);
  const adRef       = useRef(null);

  const [mcapMonths,  setMcapMonths]  = useState([]);
  const [mcapData,    setMcapData]    = useState([]);
  const [mcapLoading, setMcapLoading] = useState(true);

  const [fpiMonths,   setFpiMonths]   = useState([]);
  const [fpiData,     setFpiData]     = useState([]);
  const [fpiLoading,  setFpiLoading]  = useState(true);

  const [turnYears,   setTurnYears]   = useState([]);
  const [turnData,    setTurnData]    = useState([]);
  const [turnLoading, setTurnLoading] = useState(true);

  const [annFpiYears,   setAnnFpiYears]   = useState([]);
  const [annFpiData,    setAnnFpiData]    = useState([]);
  const [annFpiLoading, setAnnFpiLoading] = useState(true);

  const [adMonths,   setAdMonths]   = useState([]);
  const [adData,     setAdData]     = useState([]);
  const [adLoading,  setAdLoading]  = useState(true);

  const [kpiNseMcap,        setKpiNseMcap]        = useState(null);
  const [kpiNseMcapLoading, setKpiNseMcapLoading] = useState(true);

  const [kpiBseMcap,        setKpiBseMcap]        = useState(null);
  const [kpiBseMcapLoading, setKpiBseMcapLoading] = useState(true);

  const [kpiFpiYtd,        setKpiFpiYtd]        = useState(null);
  const [kpiFpiYtdLoading, setKpiFpiYtdLoading] = useState(true);

  const [kpiQip,        setKpiQip]        = useState(null);
  const [kpiQipFy,      setKpiQipFy]      = useState('');
  const [kpiQipLoading, setKpiQipLoading] = useState(true);

  const [kpiAifs,        setKpiAifs]        = useState(null);
  const [kpiAifsLoading, setKpiAifsLoading] = useState(true);

  const [kpiFpis,        setKpiFpis]        = useState(null);
  const [kpiFpisLoading, setKpiFpisLoading] = useState(true);

  const [kpiDemat,        setKpiDemat]        = useState(null);
  const [kpiDematLoading, setKpiDematLoading] = useState(true);

  const [othersCashShare,        setOthersCashShare]        = useState(null);
  const [othersCashShareLoading, setOthersCashShareLoading] = useState(true);

  const [indiaVix,        setIndiaVix]        = useState(null);
  const [indiaVixLoading, setIndiaVixLoading] = useState(true);
  const [niftyPE,         setNiftyPE]         = useState(null);
  const [niftyPELoading,  setNiftyPELoading]  = useState(true);

  const [donutData,    setDonutData]    = useState([]);
  const [donutLoading, setDonutLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const endDate   = now.toISOString().slice(0, 7) + '-01';
    const startDate = new Date(now.getFullYear(), now.getMonth() - 23, 1).toISOString().slice(0, 7) + '-01';
    fetchNseMcap({ startDate, endDate })
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        setMcapMonths(list.map(r => periodToLabel(r.period)));
        setMcapData(list.map(r => +(r.value ?? r.metric_value ?? 0) / 100000));
      }).catch(() => {}).finally(() => setMcapLoading(false));
  }, []);

  useEffect(() => {
    fetchNseTurnoverMonthly()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        const byYear = {};
        list.forEach(r => {
          const yr = r.period.split('-')[0];
          byYear[yr] = (byYear[yr] || 0) + +(r.value ?? r.metric_value ?? 0);
        });
        const years = Object.keys(byYear).sort();
        setTurnYears(years);
        setTurnData(years.map(y => byYear[y] / 100000));
      }).catch(() => {}).finally(() => setTurnLoading(false));
  }, []);

  useEffect(() => {
    fetchFpiFlowsAnnual()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        const byYear = {};
        list.forEach(r => {
          const yr = r.period.split('-')[0];
          byYear[yr] = (byYear[yr] || 0) + +(r.value ?? r.metric_value ?? 0);
        });
        const years = Object.keys(byYear).sort();
        setAnnFpiYears(years);
        setAnnFpiData(years.map(y => byYear[y] / 1000));
      }).catch(() => {}).finally(() => setAnnFpiLoading(false));
  }, []);

  useEffect(() => {
    const now = new Date();
    const endDate   = now.toISOString().slice(0, 7) + '-01';
    const startDate = new Date(now.getFullYear(), now.getMonth() - 23, 1).toISOString().slice(0, 7) + '-01';
    fetchFpiFlowsMonthly({ startDate, endDate })
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        setFpiMonths(list.map(r => periodToLabel(r.period)));
        setFpiData(list.map(r => +(r.value ?? r.metric_value ?? 0) / 1000));
      }).catch(() => {}).finally(() => setFpiLoading(false));
  }, []);

  useEffect(() => {
    const now = new Date();
    const fyEnd   = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = fyEnd - 1;
    setKpiQipFy(`FY${fyStart}-${String(fyEnd).slice(2)}`);
    fetchKpiQipYtd()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          const val = +(list[0].value ?? list[0].metric_value ?? 0) / 1000;
          setKpiQip(`₹${val.toFixed(1)}K Cr`);
        }
      }).catch(() => {}).finally(() => setKpiQipLoading(false));
  }, []);

  useEffect(() => {
    const DIMS = [33908, 33909, 33910, 33911, 33912];
    fetchParticipantShare()
      .then(results => {
        const data = results.map((rows, i) => {
          const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
          const val  = list.length > 0 ? +(list[list.length - 1].value ?? list[list.length - 1].metric_value ?? 0) : 0;
          return { name: DIM_META[DIMS[i]].name, value: val, color: DIM_META[DIMS[i]].color };
        }).filter(d => d.value > 0);
        setDonutData(data);
      }).catch(() => {}).finally(() => setDonutLoading(false));
  }, []);

  useEffect(() => {
    fetchOthersCashShare()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          const val = +(list[list.length - 1].value ?? list[list.length - 1].metric_value ?? 0);
          setOthersCashShare(`${val.toFixed(1)}%`);
        }
      }).catch(() => {}).finally(() => setOthersCashShareLoading(false));
    fetchIndiaVix()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          // Sort descending by reporting date so index 0 is the latest month
          const sorted = [...list].sort((a, b) =>
            (b['Reporting Date'] ?? b.snapshot_date ?? '').localeCompare(a['Reporting Date'] ?? a.snapshot_date ?? '')
          );
          const latest = sorted[0];
          setIndiaVix(latest.metric_text ?? String(+(latest.metric_value ?? 0)));
        }
      }).catch(() => {}).finally(() => setIndiaVixLoading(false));
    fetchNiftyPE()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          const sorted = [...list].sort((a, b) =>
            (b['Reporting Date'] ?? b.snapshot_date ?? '').localeCompare(a['Reporting Date'] ?? a.snapshot_date ?? '')
          );
          const latest = sorted[0];
          setNiftyPE(latest.metric_text ?? String(+(latest.metric_value ?? 0)));
        }
      }).catch(() => {}).finally(() => setNiftyPELoading(false));
  }, []);

  useEffect(() => {
    fetchKpiDematAccounts()
      .then(([cdslRows, nsdlRows]) => {
        const pick = rows => {
          const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
          return list.length > 0 ? +(list[list.length - 1].value ?? list[list.length - 1].metric_value ?? 0) : 0;
        };
        const totalLakh = pick(cdslRows) + pick(nsdlRows);
        const crore = totalLakh / 100;
        setKpiDemat(`${crore.toFixed(1)} Cr`);
      }).catch(() => {}).finally(() => setKpiDematLoading(false));
  }, []);

  useEffect(() => {
    fetchKpiRegisteredFpis()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          const latest = list[list.length - 1];
          const val = +(latest.value ?? latest.metric_value ?? 0);
          setKpiFpis(val >= 1000 ? `${(val / 1000).toFixed(1)}K` : String(Math.round(val)));
        }
      }).catch(() => {}).finally(() => setKpiFpisLoading(false));
  }, []);

  useEffect(() => {
    fetchKpiRegisteredAifs()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          const latest = list[list.length - 1];
          const val = +(latest.value ?? latest.metric_value ?? 0);
          setKpiAifs(val >= 1000 ? `${(val / 1000).toFixed(1)}K` : String(Math.round(val)));
        }
      }).catch(() => {}).finally(() => setKpiAifsLoading(false));
  }, []);

  useEffect(() => {
    fetchKpiNseMcap()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          const latest = list[list.length - 1];
          const val = +(latest.value ?? latest.metric_value ?? 0) / 100000;
          setKpiNseMcap(`₹${val.toFixed(1)}L Cr`);
        }
      }).catch(() => {}).finally(() => setKpiNseMcapLoading(false));
  }, []);

  useEffect(() => {
    fetchKpiBseMcap()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          const latest = list[list.length - 1];
          const val = +(latest.value ?? latest.metric_value ?? 0) / 100000;
          setKpiBseMcap(`₹${val.toFixed(1)}L Cr`);
        }
      }).catch(() => {}).finally(() => setKpiBseMcapLoading(false));
  }, []);

  useEffect(() => {
    fetchKpiFpiNetFlowYtd()
      .then(rows => {
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || []);
        if (list.length > 0) {
          const total = list.reduce((s, r) => s + +(r.value ?? r.metric_value ?? 0), 0);
          const kCr = total / 1000;
          const sign = kCr >= 0 ? '+' : '';
          setKpiFpiYtd(`${sign}₹${kCr.toFixed(1)}K Cr`);
        }
      }).catch(() => {}).finally(() => setKpiFpiYtdLoading(false));
  }, []);

  useEffect(() => {
    const now = new Date();
    const endDate   = now.toISOString().slice(0, 7) + '-01';
    const startDate = new Date(now.getFullYear(), now.getMonth() - 23, 1).toISOString().slice(0, 7) + '-01';
    fetchAdvanceDecline({ startDate, endDate })
      .then(rows => {
        console.log('[A/D] raw response:', rows);
        const list = Array.isArray(rows) ? rows : (rows.data || rows.items || rows.results || []);
        console.log('[A/D] list length:', list.length, 'sample:', list[0]);
        setAdMonths(list.map(r => periodToLabel(r.period)));
        setAdData(list.map(r => +(r.value ?? r.metric_value ?? 0)));
      }).catch(err => console.error('[A/D] fetch error:', err)).finally(() => setAdLoading(false));
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

  useChart(mcapRef, () => {
    const c = cc();
    const [months, data] = fyMonth(mcapMonths, mcapData);
    return {
      backgroundColor: 'transparent',
      grid: GRID(12),
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/>Market Cap: <b>₹${(+p[0].value).toFixed(2)}L Cr</b>`,
      },
      xAxis: XAX(months, c, 2),
      yAxis: { ...YAX(c, v => v.toFixed(0) + 'L'), min: v => Math.floor(v.min * 0.96) },
      series: [{
        type: 'line', data, smooth: true, symbol: 'none',
        lineStyle: { color: c.blue, width: 2 },
        areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:c.blue+'44'},{offset:1,color:c.blue+'00'}] } },
      }],
    };
  });

  useChart(fpiFlowRef, () => {
    const c = cc();
    const [fpiMonthsF, fpiDataF] = fyMonth(fpiMonths, fpiData);
    return {
      backgroundColor: 'transparent', grid: GRID(10),
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/><b>${p[0].value >= 0 ? '+' : ''}${(+p[0].value).toFixed(1)}K</b> Thousand Cr`,
      },
      xAxis: XAX(fpiMonthsF, c, 3),
      yAxis: {
        type: 'value',
        axisLabel: { ...ALB(c), formatter: v => v + 'K' },
        splitLine: SPL(c),
        axisLine: { show: false },
      },
      series: [{
        type: 'bar',
        barCategoryGap: '20%',
        barMaxWidth: 18,
        data: fpiDataF.map(v => ({
          value: v,
          itemStyle: { color: v >= 0 ? c.green : c.red },
        })),
      }],
    };
  });

  useChart(turnoverRef, () => {
    const c = cc();
    const [years, data] = fyYears(turnYears, turnData);
    return {
      backgroundColor: 'transparent', grid: GRID(12),
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/><b>₹${(+p[0].value).toFixed(2)}L Cr</b>`,
      },
      xAxis: XAX(years, c),
      yAxis: { ...YAX(c, v => v.toFixed(0) + 'L'), min: 0 },
      series: [{ type: 'bar', barMaxWidth: 26, data: data.map((v,i) => ({ value: v, itemStyle: { color: i < data.length-1 ? c.blue+'bb' : c.blue, borderRadius:[2,2,0,0] } })) }],
    };
  });

  useChart(annFpiRef, () => {
    const c = cc();
    const [years, data] = fyYears(annFpiYears, annFpiData);
    return {
      backgroundColor: 'transparent', grid: GRID(10),
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/><b>${(+p[0].value).toFixed(1)}K</b> Thousand Cr`,
      },
      xAxis: XAX(years, c),
      yAxis: YAX(c, v => v + 'K'),
      series: [{ type: 'bar', barMaxWidth: 20, data: data.map(v => ({ value: v, itemStyle: { color: v>=0?c.green:c.red, borderRadius: v>=0?[2,2,0,0]:[0,0,2,2] } })) }],
    };
  });

  useChart(donutRef, () => {
    const c = cc();
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text, fontSize: 11 }, formatter: '{b}: {d}%' },
      legend: { orient: 'vertical', right: 8, top: 'center', textStyle: { color: c.text, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
      series: [{ type: 'pie', radius: ['46%','70%'], center: ['36%','50%'],
        data: donutData.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } })),
        label: { show: false }, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,.3)' } } }],
    };
  });

  useChart(adRef, () => {
    const c = cc();
    const [months, data] = fyMonth(adMonths, adData);
    return {
      backgroundColor: 'transparent', grid: GRID(5),
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text, fontSize: 11 },
        formatter: p => `${p[0].axisValue}<br/>A/D Ratio: <b>${(+p[0].value).toFixed(2)}</b>`,
      },
      xAxis: XAX(months, c, 3),
      yAxis: {
        type: 'value',
        axisLabel: { ...ALB(c), formatter: v => v.toFixed(1) },
        splitLine: SPL(c),
        axisLine: { show: false },
      },
      series: [{
        type: 'line', data, smooth: false, symbol: 'none',
        lineStyle: { color: c.green, width: 2 },
        areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:c.green+'33'},{offset:1,color:c.green+'00'}] } },
        markLine: { silent: true, symbol: 'none', data: [{ yAxis: 1.0 }], lineStyle: { color: '#c47a1e', type: 'dashed', width: 1.5 } },
      }],
    };
  });

  return (
    <div className={`page${isActive ? ' on' : ''}`} id="page-overview">
      <div className="ov-scroll">

        {/* Header */}
        <div className="ov-hdr">
          <div>
            <h1 className="ov-title">Indian Capital Markets</h1>
            {/* <span className="ov-sub">Sep 2014 – Mar 2026 · 132 months</span> */}
          </div>
          <span className="ov-updated">Last updated: Apr 2026</span>
        </div>

        {/* Filters */}
        {/* <div className="ov-filters">
          <div className="ov-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`ov-btn${period===p?' on':''}`} onClick={() => {
                const yr = new Date().getFullYear();
                setPeriod(p);
                if (p === '1Y') { setFromYear(String(yr-1)); setToYear(String(yr)); }
                else if (p === '3Y') { setFromYear(String(yr-3)); setToYear(String(yr)); }
                else if (p === '5Y') { setFromYear(String(yr-5)); setToYear(String(yr)); }
                else { setFromYear('2014'); setToYear(String(yr)); }
              }}>{p}</button>
            ))}
          </div>
          <div className="ov-range">
            <span className="ov-lbl">From</span>
            <select className="ov-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="ov-lbl">To</span>
            <select className="ov-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div> */}

        {/* KPI strip */}
        <div className="ov-kpi-strip">
          {KPI_CARDS.map(k => {
            let displayValue = '—';
            let displaySub   = k.sub;
            if (k.label === 'NSE MARKET CAP') {
              displayValue = kpiNseMcapLoading ? '…' : (kpiNseMcap ?? '—');
            } else if (k.label === 'BSE MARKET CAP') {
              displayValue = kpiBseMcapLoading ? '…' : (kpiBseMcap ?? '—');
            } else if (k.label === 'FPI NET FLOW YTD') {
              displayValue = kpiFpiYtdLoading ? '…' : (kpiFpiYtd ?? '—');
            } else if (k.label === 'QIP RAISED YTD') {
              displayValue = kpiQipLoading ? '…' : (kpiQip ?? '—');
              displaySub   = kpiQipFy || k.sub;
            } else if (k.label === 'REGISTERED AIFS') {
              displayValue = kpiAifsLoading ? '…' : (kpiAifs ?? '—');
            } else if (k.label === 'REGISTERED FPIS') {
              displayValue = kpiFpisLoading ? '…' : (kpiFpis ?? '—');
            } else if (k.label === 'TOTAL DEMAT ACCOUNTS') {
              displayValue = kpiDematLoading ? '…' : (kpiDemat ?? '—');
            }
            return (
              <div key={k.label} className="ov-kpi-card">
                <span className="ov-kpi-label">{k.label}</span>
                <span className="ov-kpi-val">{displayValue}</span>
                <span className="ov-kpi-sub">{displaySub}</span>
              </div>
            );
          })}
        </div>

        {/* Row 1 — NSE Mcap + FPI Net Flows */}
        <div className="ov-row2">
          <div className="ov-chart-card">
            <div className="ov-chart-hdr">
              <span className="ov-chart-title">NSE Market Capitalisation</span>
              <span className="ov-chart-sub">₹ Lakh Crore · last 24 months</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(mcapRef.current, 'NSE Market Capitalisation')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {mcapLoading
              ? <div className="chart-loader" style={{height:220}} />
              : <div ref={mcapRef} className="ov-chart-canvas" />
            }
          </div>
          <div className="ov-chart-card">
            <div className="ov-chart-hdr">
              <span className="ov-chart-title">FPI Net Flows</span>
              <span className="ov-chart-sub">₹ Thousand Crore · last 24 months</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(fpiFlowRef.current, 'FPI Net Flows')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {fpiLoading
              ? <div className="chart-loader" style={{height:220}} />
              : <div ref={fpiFlowRef} className="ov-chart-canvas" />
            }
          </div>
        </div>

        {/* Row 2 — Annual Turnover + Annual FPI */}
        <div className="ov-row2">
          <div className="ov-chart-card">
            <div className="ov-chart-hdr">
              <span className="ov-chart-title">Annual NSE Equity Turnover</span>
              <span className="ov-chart-badge">2015 — 2026</span>
              <span className="ov-chart-sub">₹ Lakh Crore · calendar year</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(turnoverRef.current, 'Annual NSE Equity Turnover')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {turnLoading
              ? <div className="chart-loader" style={{height:220}} />
              : <div ref={turnoverRef} className="ov-chart-canvas" />
            }
          </div>
          <div className="ov-chart-card">
            <div className="ov-chart-hdr">
              <span className="ov-chart-title">Annual FPI Net Flows</span>
              <span className="ov-chart-badge">2014 — 2026</span>
              <span className="ov-chart-sub">₹ Thousand Crore · positive = inflow</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(annFpiRef.current, 'Annual FPI Net Flows')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {annFpiLoading
              ? <div className="chart-loader" style={{height:220}} />
              : <div ref={annFpiRef} className="ov-chart-canvas" />
            }
          </div>
        </div>

        {/* Metric cards */}
        <div className="ov-metric-row">
          {METRICS.map(m => {
            let displayValue = m.value;
            if (m.label === 'INDIA VIX') {
              displayValue = indiaVixLoading ? '…' : (indiaVix ?? '—');
            } else if (m.label === 'NIFTY P/E') {
              displayValue = niftyPELoading ? '…' : (niftyPE ?? '—');
            } else if (m.label === 'OTHERS CASH SHARE') {
              displayValue = othersCashShareLoading ? '…' : (othersCashShare ?? '—');
            }
            return (
              <div key={m.label} className="ov-metric-card">
                <span className="ov-metric-lbl">{m.label}</span>
                <span className="ov-metric-val">{displayValue}</span>
                <span className="ov-metric-sub">{m.sub}</span>
              </div>
            );
          })}
        </div>

        {/* Row 3 — Donut + A/D Ratio */}
        <div className="ov-row2">
          <div className="ov-chart-card">
            <div className="ov-chart-hdr">
              <span className="ov-chart-title">NSE Cash Market Participant Share</span>
              <span className="ov-chart-sub">Latest month</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(donutRef.current, 'NSE Cash Market Participant Share')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {donutLoading
              ? <div className="chart-loader" style={{height:220}} />
              : <div ref={donutRef} className="ov-chart-canvas" />
            }
          </div>
          <div className="ov-chart-card">
            <div className="ov-chart-hdr">
              <span className="ov-chart-title">Market Breadth — A/D Ratio</span>
              <span className="ov-chart-sub">NSE Advance/Decline ratio</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(adRef.current, 'Market Breadth — A/D Ratio')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            {adLoading
              ? <div className="chart-loader" style={{height:220}} />
              : <div ref={adRef} className="ov-chart-canvas" />
            }
          </div>
        </div>

      </div>
    </div>
  );
}
