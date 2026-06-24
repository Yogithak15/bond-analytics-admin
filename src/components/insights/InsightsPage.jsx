import { useEffect, useRef, useState } from 'react';
import { useThemeWatcher } from '../../hooks/useThemeWatcher';
import { useChart } from '../../hooks/useChart';
import { fetchInsightsNseMcap, fetchInsightsDematAccounts, fetchInsightsMfAum, fetchInsightsDebtMarket, fetchInsightsFpiNet, fetchInsights10YGsec, fetchInsightsPmsAum, fetchInsightsDematTrend, fetchCapFormEngine, fetchInsightsSovFunding, fetchInsightsSgsArchive, fetchInsightsStateDebt, fetchInsightsRiskData, fetchInsightsMacroTransmission, fetchInsightsMarketPlumbing, fetchInsightsDerivConc } from '../../api/insightsApi';
import { openChartPreview } from '../../lib/chartPreview';

/* Chart helpers */
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

export default function InsightsPage({ isActive }) {
  useThemeWatcher();
  const [period,   setPeriod]   = useState('All');
  const [fromYear, setFromYear] = useState('2014');
  const [toYear,   setToYear]   = useState('2026');

  const [nseMcapKpi,   setNseMcapKpi]   = useState(null);
  const [dematKpi,     setDematKpi]     = useState(null);
  const [mfAumKpi,     setMfAumKpi]     = useState(null);
  const [debtStockKpi, setDebtStockKpi] = useState(null);
  const [fpiNetKpi,    setFpiNetKpi]    = useState(null);
  const [gsecYieldKpi, setGsecYieldKpi] = useState(null);
  const [pmsAumKpi,    setPmsAumKpi]    = useState(null);
  // raw values in L Cr for balance sheet bars
  const [nseMcapRaw,   setNseMcapRaw]   = useState(0);
  const [capFormData,  setCapFormData]  = useState({ years: [], pp: [], qip: [], ipo: [], ofs: [] });
  const [mfAumRaw,     setMfAumRaw]     = useState(0);
  const [debtStockRaw, setDebtStockRaw] = useState(0);
  const [gsecStockRaw, setGsecStockRaw] = useState(0);
  const [sgsStockRaw,  setSgsStockRaw]  = useState(0);
  const [corpStockRaw, setCorpStockRaw] = useState(0);
  const [sovFundData,  setSovFundData]  = useState({ years: [], gsec: [], sdl: [], pp: [], gsecYield: [], sdlYield: [] });
  const [sgsArchiveData, setSgsArchiveData] = useState({ years: [], stock: [], top5: [] });
  const [stateDebtData,  setStateDebtData]  = useState([]);
  const [riskData,       setRiskData]       = useState({ months: [], vix: [], ad: [], fpi: [] });
  const [macroTransData,  setMacroTransData]  = useState({ months: [], repo: [], usdInr: [], mcap: [], fpi: [] });
  const [plumbingData,    setPlumbingData]    = useState({ months: [], top10m: [], top25s: [], ratio: [] });
  const [derivConcData,   setDerivConcData]   = useState({ years: [], turnover: [], optShare: [] });
  // trend series for flywheel chart
  const [dematTrend,   setDematTrend]   = useState({ months: [], values: [] });
  const [mfAumTrend,   setMfAumTrend]   = useState({ months: [], values: [] });
  const [pmsAumTrend,  setPmsAumTrend]  = useState({ months: [], values: [] });

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchInsightsNseMcap()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        // API returns ₹ Crore — divide by 1L to get Lakh Crore
        const lCr = val / 1e5;
        const display = lCr >= 1 ? `₹${lCr.toFixed(0)}L Cr` : `₹${val.toFixed(0)} Cr`;
        setNseMcapKpi({ value: display, note: period || 'Equity market cap' });
        setNseMcapRaw(lCr);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchInsightsDematAccounts()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        const display = val >= 1e7 ? `${(val/1e7).toFixed(2)}Cr` : val >= 1e5 ? `${(val/1e5).toFixed(1)}L` : val >= 1000 ? `${(val/1000).toFixed(1)}K` : String(Math.round(val));
        setDematKpi({ value: display, note: period || 'Active demat holders' });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchInsightsMfAum()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        const lCr = val / 1e5;
        const display = lCr >= 1 ? `₹${lCr.toFixed(0)}L Cr` : `₹${val.toFixed(0)} Cr`;
        setMfAumKpi({ value: display, note: period || 'AMFI total AUM' });
        setMfAumRaw(lCr);
        setMfAumTrend({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +((+(r.value ?? r.metric_value ?? 0)) / 1e5).toFixed(2)),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchInsightsDebtMarket()
      .then(([gsecRes, sgsRes, corpRes]) => {
        const val = r => r?.length ? +(r[0].value ?? r[0].metric_value ?? 0) : 0;
        const g = val(gsecRes), s = val(sgsRes), co = val(corpRes);
        const total = g + s + co;
        if (!total) return;
        const inLCr = total / 100000;
        const display = inLCr >= 1 ? `₹${inLCr.toFixed(2)} L Cr` : `₹${(total/1000).toFixed(2)} K Cr`;
        setDebtStockKpi({ value: display, note: 'G-Sec + SGS + Corp Bond' });
        setDebtStockRaw(inLCr);
        setGsecStockRaw(g / 100000);
        setSgsStockRaw(s  / 100000);
        setCorpStockRaw(co / 100000);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchInsightsFpiNet()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        const sign = val >= 0 ? '+' : '';
        // description: recent data in ₹ '000 crore; display in ₹K Cr
        const display = Math.abs(val) >= 1000
          ? `${sign}₹${(val/1000).toFixed(1)}K Cr`
          : `${sign}₹${val.toFixed(1)} Cr`;
        setFpiNetKpi({ value: display, note: period || 'Latest month net flow' });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchInsights10YGsec()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        setGsecYieldKpi({ value: `${val.toFixed(2)}%`, note: period || '10Y G-Sec yield' });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchInsightsSovFunding()
      .then(([gsecRaw, sdlRaw, ppRaw, gYRaw, sYRaw]) => {
        const toMap = (raw, div) => {
          const m = {};
          toList(raw).forEach(r => { m[r.period] = (m[r.period] ?? 0) + +(r.value ?? r.metric_value ?? 0); });
          if (div) Object.keys(m).forEach(k => { m[k] = m[k] / div; });
          return m;
        };
        const gMap = toMap(gsecRaw, 1e5);   // Cr → L Cr
        const sMap = toMap(sdlRaw,  1e5);
        const pMap = toMap(ppRaw,   1e5);
        const gYMap = toMap(gYRaw);          // already %
        const sYMap = toMap(sYRaw);
        const years = [...new Set([...Object.keys(gMap), ...Object.keys(sMap), ...Object.keys(pMap)])].sort();
        if (!years.length) return;
        setSovFundData({
          years:     years.map(fy => fy.split('-')[0]),
          gsec:      years.map(fy => +(gMap[fy] ?? 0).toFixed(2)),
          sdl:       years.map(fy => +(sMap[fy] ?? 0).toFixed(2)),
          pp:        years.map(fy => +(pMap[fy] ?? 0).toFixed(2)),
          gsecYield: years.map(fy => gYMap[fy] != null ? +gYMap[fy].toFixed(2) : null),
          sdlYield:  years.map(fy => sYMap[fy] != null ? +sYMap[fy].toFixed(2) : null),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchInsightsSgsArchive()
      .then(([sgsRaw, top5Res]) => {
        const list = toList(sgsRaw);
        if (!list.length) return;
        const top5Pct = top5Res?.share ?? null;
        // build annual series — stock in L Cr, top5 as flat line (latest only)
        setSgsArchiveData({
          years: list.map(r => (r.period ?? '').split('-')[0]),
          stock: list.map(r => +((+(r.value ?? r.metric_value ?? 0)) / 1e5).toFixed(2)),
          top5:  top5Pct != null ? list.map(() => top5Pct) : [],
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchInsightsStateDebt()
      .then(raw => {
        const list = Array.isArray(raw) ? raw : (raw?.data || []);
        if (!list.length) return;
        const sorted = [...list]
          .sort((a, b) => (b.total_outstanding ?? 0) - (a.total_outstanding ?? 0))
          .slice(0, 10)
          .map(r => ({
            state: r.state_name ?? r.state ?? r.name ?? '—',
            val:   +((r.total_outstanding ?? 0) / 1e5).toFixed(2), // Cr → L Cr
          }));
        if (sorted.length) setStateDebtData(sorted);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtP = p => { const [y,m]=(p??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    fetchInsightsRiskData()
      .then(([vixRaw, adRaw, fpiRaw]) => {
        const vList = toList(vixRaw), aList = toList(adRaw), fList = toList(fpiRaw);
        const adMap = {}, fpiMap = {};
        aList.forEach(r => { adMap[r.period]  = +(r.value ?? r.metric_value ?? 0); });
        fList.forEach(r => { fpiMap[r.period] = +(r.value ?? r.metric_value ?? 0) / 1000; }); // Cr → K Cr
        if (!vList.length) return;
        setRiskData({
          months: vList.map(r => fmtP(r.period)),
          vix:    vList.map(r => +(r.value ?? r.metric_value ?? 0)),
          ad:     vList.map(r => adMap[r.period]  ?? null),
          fpi:    vList.map(r => fpiMap[r.period] ?? null),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtP = p => { const [y,m]=(p??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    fetchInsightsMacroTransmission()
      .then(([repoRaw, usdRaw, mcapRaw, fpiRaw]) => {
        const rList = toList(repoRaw), uList = toList(usdRaw),
              mList = toList(mcapRaw), fList = toList(fpiRaw);
        const idx = (list, base) => list.map(v => base > 0 ? +((v/base)*100).toFixed(2) : 0);
        // use mcap as spine (widest coverage)
        const spine = mList.length >= rList.length ? mList : rList;
        const rMap={}, uMap={}, mMap={}, fMap={};
        rList.forEach(r => { rMap[r.period]=+(r.value??r.metric_value??0); });
        uList.forEach(r => { uMap[r.period]=+(r.value??r.metric_value??0); });
        mList.forEach(r => { mMap[r.period]=+(r.value??r.metric_value??0); });
        fList.forEach(r => { fMap[r.period]=(+(r.value??r.metric_value??0))/1000; }); // K Cr
        const periods = spine.map(r => r.period);
        const rBase = rMap[periods[0]] || 1;
        const uBase = uMap[periods[0]] || 1;
        const mBase = mMap[periods[0]] || 1;
        if (!periods.length) return;
        setMacroTransData({
          months: periods.map(fmtP),
          repo:   periods.map(p => rMap[p] != null ? +((rMap[p]/rBase)*100).toFixed(1) : null),
          usdInr: periods.map(p => uMap[p] != null ? +((uMap[p]/uBase)*100).toFixed(1) : null),
          mcap:   periods.map(p => mMap[p] != null ? +((mMap[p]/mBase)*100).toFixed(1) : null),
          fpi:    periods.map(p => fMap[p] ?? null),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtP = p => { const [y,m]=(p??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; };
    fetchInsightsMarketPlumbing()
      .then(([m10Raw, s25Raw, ratioRaw]) => {
        const m10List = toList(m10Raw);
        const s25Map = {}, ratMap = {};
        toList(s25Raw).forEach(r   => { s25Map[r.period]  = +(r.value ?? r.metric_value ?? 0); });
        toList(ratioRaw).forEach(r => { ratMap[r.period]  = +(r.value ?? r.metric_value ?? 0); });
        if (!m10List.length) return;
        setPlumbingData({
          months: m10List.map(r => fmtP(r.period)),
          top10m: m10List.map(r => +(r.value ?? r.metric_value ?? 0)),
          top25s: m10List.map(r => s25Map[r.period] ?? null),
          ratio:  m10List.map(r => ratMap[r.period]  ?? null),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchInsightsDerivConc()
      .then(([totalRaw, idxCallsRaw, idxPutsRaw, stkCallsRaw, stkPutsRaw]) => {
        // period is an integer year (2014, 2015, ...) — convert directly to string
        const getYr = r => r.period != null ? String(r.period) : '';

        const foMap = {};
        toList(totalRaw).forEach(r => {
          const yr = getYr(r);
          if (yr) foMap[yr] = (foMap[yr] ?? 0) + +(r.value ?? r.metric_value ?? 0);
        });
        const optMap = {};
        [idxCallsRaw, idxPutsRaw, stkCallsRaw, stkPutsRaw].forEach(raw => {
          toList(raw).forEach(r => {
            const yr = getYr(r);
            if (yr) optMap[yr] = (optMap[yr] ?? 0) + +(r.value ?? r.metric_value ?? 0);
          });
        });
        const years = Object.keys(foMap).sort();
        if (!years.length) return;
        setDerivConcData({
          years,
          turnover: years.map(yr => foMap[yr] ?? 0),
          optShare: years.map(yr => {
            const fo  = foMap[yr]  ?? 0;
            const opt = optMap[yr] ?? 0;
            return fo > 0 ? +((opt / fo) * 100).toFixed(1) : null;
          }),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    fetchCapFormEngine()
      .then(([ppRaw, qipRaw, ipoRaw, ofsFinRaw, ofsNonRaw]) => {
        const toMap = raw => {
          const m = {};
          toList(raw).forEach(r => { m[r.period] = (m[r.period] ?? 0) + +(r.value ?? r.metric_value ?? 0); });
          return m;
        };
        const ppMap = toMap(ppRaw);
        const qipMap = toMap(qipRaw);
        const ipoMap = toMap(ipoRaw);
        const ofsMap = {};
        [...toList(ofsFinRaw), ...toList(ofsNonRaw)].forEach(r => { ofsMap[r.period] = (ofsMap[r.period] ?? 0) + +(r.value ?? r.metric_value ?? 0); });
        const years = [...new Set([...Object.keys(ppMap), ...Object.keys(qipMap), ...Object.keys(ipoMap), ...Object.keys(ofsMap)])].sort();
        if (!years.length) return;
        const toLC = (map, fy) => +((map[fy] ?? 0) / 1e5).toFixed(2); // Cr → L Cr
        setCapFormData({
          years: years.map(fy => fy.split('-')[0]),
          pp:  years.map(fy => toLC(ppMap,  fy)),
          qip: years.map(fy => toLC(qipMap, fy)),
          ipo: years.map(fy => toLC(ipoMap, fy)),
          ofs: years.map(fy => toLC(ofsMap, fy)),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchInsightsPmsAum()
      .then(raw => {
        const list = toList(raw);
        if (!list.length) return;
        const latest = list[list.length - 1];
        const val = +(latest.value ?? latest.metric_value ?? 0);
        const [y, m] = (latest.period ?? '').split('-');
        const period = m && y ? `${M[+m-1]} ${y}` : '';
        // source 46 metric 178 returns ₹ crore → /1e5 = L Cr
        const lCr = val / 1e5;
        const display = lCr >= 1 ? `₹${lCr.toFixed(0)}L Cr` : `₹${val.toFixed(0)} Cr`;
        setPmsAumKpi({ value: display, note: period || 'Portfolio Managers', rawLCr: lCr });
        setPmsAumTrend({
          months: list.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          values: list.map(r => +((+(r.value ?? r.metric_value ?? 0)) / 1e5).toFixed(2)),
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const toList = r => Array.isArray(r) ? r : (r?.data || r?.items || []);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    fetchInsightsDematTrend()
      .then(([cdslRaw, nsdlRaw]) => {
        const cdslList = toList(cdslRaw);
        const nsdlList = toList(nsdlRaw);
        const nsdlMap = {};
        nsdlList.forEach(r => { nsdlMap[r.period] = +(r.value ?? r.metric_value ?? 0); });
        if (!cdslList.length) return;
        setDematTrend({
          months: cdslList.map(r => { const [y,m] = (r.period??'').split('-'); return `${M[+m-1]} ${y.slice(2)}`; }),
          // metric 147 = investor_accounts_lakh → sum CDSL+NSDL → /100 = Crore
          values: cdslList.map(r => +(((+(r.value ?? r.metric_value ?? 0)) + (nsdlMap[r.period] ?? 0)) / 100).toFixed(2)),
        });
      }).catch(() => {});
  }, []);

  const rBal       = useRef(null);
  const rCapForm   = useRef(null);
  const rSovFund   = useRef(null);
  const rDebtSplit = useRef(null);
  const rSgsArch   = useRef(null);
  const rStateDebt = useRef(null);
  const rRisk       = useRef(null);
  const rMacroTrans = useRef(null);
  const rPlumbing   = useRef(null);
  const rDerivConc  = useRef(null);
  const rNseMcap = useRef(null);
  const rDemat   = useRef(null);
  const rMfAum   = useRef(null);
  const rFpi     = useRef(null);
  const rYield   = useRef(null);
  const rHh      = useRef(null);
  const rSdlBar  = useRef(null);

  /* ── Strategic Balance Sheet — horizontal bar chart ── */
  useChart(rBal, () => {
    const bars = [
      { name: 'NSE Equity MCap', val: nseMcapRaw,             color: '#06b6d4' },
      { name: 'Debt Stock',      val: debtStockRaw,            color: '#3b82f6' },
      { name: 'MF AUM',          val: mfAumRaw,                color: '#10b981' },
      { name: 'PMS AUM',         val: pmsAumKpi?.rawLCr ?? 0,  color: '#8b5cf6' },
    ].filter(b => b.val > 0).sort((a, b) => a.val - b.val); // ascending → largest at top in horizontal chart
    if (!bars.length) return null;
    const c = cc();
    const maxV = Math.max(...bars.map(b => b.val));
    const step = maxV <= 150 ? 50 : maxV <= 300 ? 100 : maxV <= 600 ? 150 : 200;
    const xMax = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 60, bottom: 28, left: 16, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}₹${(+p[0].value).toFixed(0)}L Cr`,
      },
      xAxis: {
        type: 'value', min: 0, max: xMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } },
        axisLine: { show: false },
      },
      yAxis: {
        type: 'category', data: bars.map(b => b.name),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: c.text, fontSize: 10 },
      },
      series: [{
        type: 'bar', data: bars.map(b => ({ value: b.val, itemStyle: { color: b.color, borderRadius: [0,4,4,0] } })),
        barMaxWidth: 40,
        label: { show: true, position: 'right', formatter: p => `₹${(+p.value).toFixed(0)}L`, color: c.text, fontSize: 9 },
      }],
    };
  });
  /* ── Capital Formation Engine — stacked bar + line overlay ── */
  useChart(rCapForm, () => {
    const { years, pp, qip, ipo, ofs } = capFormData;
    if (!years.length) return null;
    const c = cc();
    const totals = years.map((_, i) => (pp[i]||0) + (qip[i]||0) + (ipo[i]||0) + (ofs[i]||0));
    const maxV = Math.max(...totals);
    const step = maxV <= 3 ? 1 : maxV <= 6 ? 3 : maxV <= 12 ? 3 : 4;
    const yMax = Math.ceil(maxV / step) * step;
    const latestTotal = totals[totals.length - 1] ?? 0;
    const fmtV = v => v >= 1 ? `₹${v.toFixed(1)}L Cr` : v > 0 ? `₹${(v*1e5/1000).toFixed(0)}K Cr` : '₹0 Cr';
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => {
          const yr = p[0].axisValue;
          const lines = p.filter(s => s.value != null && s.value > 0)
            .map(s => `${s.marker}${s.seriesName}: <b>${fmtV(+s.value)}</b>`);
          return `<b>${yr}</b><br/>` + lines.join('<br/>');
        },
      },
      legend: { bottom: 4, itemWidth: 12, itemHeight: 8, textStyle: { color: c.text, fontSize: 10 },
        data: ['SEBI Private Placement','QIP','IPO','OFS','Total Visible Capital Formation'] },
      xAxis: { type: 'category', data: years, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9 } },
      yAxis: { type: 'value', min: 0, max: yMax, interval: step,
        axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L Cr` },
        splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
      series: [
        { name: 'SEBI Private Placement', type: 'bar', stack: 'cf', data: pp,  barMaxWidth: 40, itemStyle: { color: '#3b82f6' } },
        { name: 'QIP',                    type: 'bar', stack: 'cf', data: qip, barMaxWidth: 40, itemStyle: { color: '#8b5cf6' } },
        { name: 'IPO',                    type: 'bar', stack: 'cf', data: ipo, barMaxWidth: 40, itemStyle: { color: '#10b981' } },
        { name: 'OFS',                    type: 'bar', stack: 'cf', data: ofs, barMaxWidth: 40, itemStyle: { color: '#f59e0b' } },
        { name: 'Total Visible Capital Formation', type: 'line', data: totals, smooth: true,
          symbol: 'circle', symbolSize: 5,
          lineStyle: { color: '#f97316', width: 2 }, itemStyle: { color: '#f97316' } },
      ],
    };
  });

  /* ── Sovereign / State / Credit Funding Conditions — bars + dual-axis lines ── */
  useChart(rSovFund, () => {
    const { years, gsec, sdl, pp, gsecYield, sdlYield } = sovFundData;
    if (!years.length) return null;
    const c = cc();
    const maxBar = Math.max(...[...gsec, ...sdl, ...pp]);
    const bStep = maxBar <= 4 ? 4 : maxBar <= 8 ? 4 : maxBar <= 12 ? 4 : 4;
    const bMax  = Math.ceil(maxBar / bStep) * bStep;
    const maxY  = Math.max(...[...gsecYield, ...sdlYield].filter(v => v != null));
    const yStep = maxY <= 8 ? 3 : 4;
    const yMax  = Math.ceil(maxY / yStep) * yStep;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s => s.value != null).map(s => `${s.marker}${s.seriesName}: <b>${s.seriesIndex < 3 ? '₹'+s.value+'L Cr' : s.value+'%'}</b>`).join('<br/>') },
      legend: { bottom: 4, itemWidth: 12, itemHeight: 8, textStyle: { color: c.text, fontSize: 9 }, data: ['G-Sec Auctions','SDL Auctions','EBP Credit Issuance','G-Sec Auction Yield','SDL Auction Yield'] },
      xAxis: { type: 'category', data: years, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9 } },
      yAxis: [
        { type: 'value', min: 0, max: bMax, interval: bStep, axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L Cr` }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
        { type: 'value', min: 0, max: yMax, interval: yStep, axisLabel: { color: '#06b6d4', fontSize: 9, formatter: v => `${v}%` }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'G-Sec Auctions',      type: 'bar',  yAxisIndex: 0, data: gsec,       barMaxWidth: 18, itemStyle: { color: '#3b82f6' } },
        { name: 'SDL Auctions',        type: 'bar',  yAxisIndex: 0, data: sdl,        barMaxWidth: 18, itemStyle: { color: '#f97316' } },
        { name: 'EBP Credit Issuance', type: 'bar',  yAxisIndex: 0, data: pp,         barMaxWidth: 18, itemStyle: { color: '#8b5cf6' } },
        { name: 'G-Sec Auction Yield', type: 'line', yAxisIndex: 1, data: gsecYield,  smooth: true, symbol: 'none', connectNulls: true, lineStyle: { color: '#06b6d4', width: 2 }, itemStyle: { color: '#06b6d4' } },
        { name: 'SDL Auction Yield',   type: 'line', yAxisIndex: 1, data: sdlYield,   smooth: true, symbol: 'none', connectNulls: true, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
      ],
    };
  });

  /* ── Debt Market Stock Split — 3-bar vertical chart ── */
  useChart(rDebtSplit, () => {
    if (!gsecStockRaw && !sgsStockRaw && !corpStockRaw) return null;
    const c = cc();
    const bars = [
      { name: 'G-Sec',       val: gsecStockRaw, color: '#3b82f6' },
      { name: 'SDL/SGS',     val: sgsStockRaw,  color: '#f97316' },
      { name: 'Corp Bonds',  val: corpStockRaw, color: '#8b5cf6' },
    ];
    const maxV = Math.max(...bars.map(b => b.val));
    const step = maxV <= 50 ? 35 : maxV <= 100 ? 35 : maxV <= 140 ? 35 : 50;
    const yMax = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 36, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}₹${(+p[0].value).toFixed(0)}L Cr` },
      xAxis: { type: 'category', data: bars.map(b => b.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 10 } },
      yAxis: { type: 'value', min: 0, max: yMax, interval: step, axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L Cr` }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
      series: [{
        type: 'bar', data: bars.map(b => ({ value: b.val, itemStyle: { color: b.color } })),
        barMaxWidth: 80,
        label: { show: true, position: 'top', formatter: p => `₹${(+p.value).toFixed(0)}L`, color: c.text, fontSize: 9 },
      }],
    };
  });

  /* ── State Debt Stock Archive and Concentration ── */
  useChart(rSgsArch, () => {
    const { years, stock, top5 } = sgsArchiveData;
    if (!years.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(years.length / 10));
    const maxS = Math.max(...stock);
    const sStep = maxS <= 40 ? 20 : maxS <= 80 ? 20 : 20;
    const sMax  = Math.ceil(maxS / sStep) * sStep;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s => s.value != null).map(s =>
          `${s.marker}${s.seriesName}: <b>${s.seriesIndex === 0 ? '₹'+s.value+'L' : s.value+'%'}</b>`).join('<br/>') },
      legend: { bottom: 4, itemWidth: 14, itemHeight: 8, textStyle: { color: c.text, fontSize: 9 }, data: ['Annual SGS Stock','Top 5 State Share'] },
      xAxis: { type: 'category', data: years, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9, interval: iv } },
      yAxis: [
        { type: 'value', min: 0, max: sMax, interval: sStep, axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L` }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
        { type: 'value', min: 0, max: 75, interval: 15, axisLabel: { color: '#06b6d4', fontSize: 9, formatter: v => `${v}%` }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'Annual SGS Stock', type: 'line', yAxisIndex: 0, data: stock, smooth: true, symbol: 'circle', symbolSize: 4,
          lineStyle: { color: '#f97316', width: 2 }, itemStyle: { color: '#f97316' },
          areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops:[{offset:0,color:'#f9731644'},{offset:1,color:'#f9731608'}] } } },
        { name: 'Top 5 State Share', type: 'line', yAxisIndex: 1, data: top5, smooth: false, symbol: 'none',
          lineStyle: { color: '#06b6d4', width: 2 }, itemStyle: { color: '#06b6d4' } },
      ],
    };
  });

  /* ── Largest 5-Year State Debt Additions — horizontal bar ── */
  useChart(rStateDebt, () => {
    if (!stateDebtData.length) return null;
    const c = cc();
    const sorted = [...stateDebtData].sort((a, b) => a.val - b.val); // ascending → largest at top
    const maxV = Math.max(...sorted.map(d => d.val));
    const step = maxV <= 1 ? 0.5 : maxV <= 2 ? 1 : maxV <= 4 ? 1 : 2;
    const xMax = Math.ceil(maxV / step) * step;
    return {
      backgroundColor: 'transparent',
      grid: { top: 8, right: 16, bottom: 32, left: 16, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>${p[0].marker}₹${(+p[0].value).toFixed(2)}L Cr` },
      xAxis: { type: 'value', min: 0, max: xMax, interval: step, axisLabel: { color: c.text, fontSize: 9, formatter: v => `₹${v}L Cr` }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
      yAxis: { type: 'category', data: sorted.map(d => d.state), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9, width: 120, overflow: 'truncate' } },
      series: [{ type: 'bar', data: sorted.map(d => d.val), barMaxWidth: 20, itemStyle: { color: '#f97316', borderRadius: [0,3,3,0] } }],
    };
  });

  /* ── Market Risk and External Vulnerability ── */
  useChart(rRisk, () => {
    const { months, vix, ad, fpi } = riskData;
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const maxVix = Math.max(...vix.filter(v => v != null));
    const maxFpi = Math.max(...fpi.filter(v => v != null).map(Math.abs));
    const vStep = maxVix <= 24 ? 6 : 8; const vMax = Math.ceil(maxVix / vStep) * vStep;
    const fStep = maxFpi <= 65 ? 65 : Math.ceil(maxFpi / 65) * 65; const fMax = Math.ceil(maxFpi / fStep) * fStep;
    const vixMean = vix.filter(Boolean).reduce((s,v)=>s+v,0)/vix.filter(Boolean).length;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s=>s.value!=null).map(s=>`${s.marker}${s.seriesName}: <b>${s.seriesIndex===2?s.value+'K Cr':s.value}</b>`).join('<br/>') },
      legend: { bottom: 4, itemWidth: 12, itemHeight: 8, textStyle: { color: c.text, fontSize: 9 }, data: ['VIX Range High','A/D Ratio','FPI Net (K Cr)'] },
      xAxis: { type: 'category', data: months, boundaryGap: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9, interval: iv } },
      yAxis: [
        { type: 'value', min: 0, max: vMax, interval: vStep, axisLabel: { color: c.text, fontSize: 9 }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
        { type: 'value', min: -fMax, max: fMax, interval: fStep, axisLabel: { color: '#94a3b8', fontSize: 9, formatter: v => `${v}K` }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'VIX Range High', type: 'line', yAxisIndex: 0, data: vix, smooth: true, symbol: 'none', lineStyle: { color: '#e05060', width: 2 }, itemStyle: { color: '#e05060' },
          markLine: { silent: true, symbol: 'none', data: [{ yAxis: Math.round(vixMean), lineStyle: { color: '#e0506066', type: 'dashed', width: 1 } }] } },
        { name: 'A/D Ratio', type: 'line', yAxisIndex: 0, data: ad, smooth: true, symbol: 'none', connectNulls: false, lineStyle: { color: '#10b981', width: 1.5 }, itemStyle: { color: '#10b981' } },
        { name: 'FPI Net (K Cr)', type: 'bar', yAxisIndex: 1, data: fpi, barMaxWidth: 6,
          itemStyle: { color: params => params.value >= 0 ? '#10b98199' : '#e0506099', borderRadius: params => params.value >= 0 ? [2,2,0,0] : [0,0,2,2] } },
      ],
    };
  });

  /* ── Macro-Market Transmission Map ── */
  useChart(rMacroTrans, () => {
    const { months, repo, usdInr, mcap, fpi } = macroTransData;
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    const allIdx = [...repo, ...usdInr, ...mcap].filter(v => v != null);
    const maxIdx = Math.max(...allIdx);
    const maxFpi = Math.max(...fpi.filter(v => v != null).map(Math.abs));
    const iStep = maxIdx <= 300 ? 150 : maxIdx <= 600 ? 150 : 200; const iMax = Math.ceil(maxIdx / iStep) * iStep;
    const fStep = maxFpi <= 65 ? 65 : Math.ceil(maxFpi/65)*65; const fMax = Math.ceil(maxFpi/fStep)*fStep;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s=>s.value!=null).map(s=>`${s.marker}${s.seriesName}: <b>${s.seriesIndex===3?s.value+'K Cr':s.value}</b>`).join('<br/>') },
      legend: { bottom: 4, itemWidth: 12, itemHeight: 8, textStyle: { color: c.text, fontSize: 9 }, data: ['Repo Rate Index','USD/INR Index','NSE MCap Index','FPI Net (K Cr)'] },
      xAxis: { type: 'category', data: months, boundaryGap: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9, interval: iv } },
      yAxis: [
        { type: 'value', min: 0, max: iMax, interval: iStep, axisLabel: { color: c.text, fontSize: 9 }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false },
          markLine: { silent: true, symbol: 'none', data: [{ yAxis: 100, lineStyle: { color: '#ffffff22', type: 'dashed', width: 1 } }] } },
        { type: 'value', min: -fMax, max: fMax, interval: fStep, axisLabel: { color: '#8b5cf6', fontSize: 9, formatter: v => `${v}K` }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'Repo Rate Index', type: 'line', yAxisIndex: 0, data: repo,   smooth: false, symbol: 'none', connectNulls: false, lineStyle: { color: '#e05060', width: 2 }, itemStyle: { color: '#e05060' } },
        { name: 'USD/INR Index',   type: 'line', yAxisIndex: 0, data: usdInr, smooth: true,  symbol: 'none', connectNulls: false, lineStyle: { color: '#f59e0b', width: 2 }, itemStyle: { color: '#f59e0b' } },
        { name: 'NSE MCap Index',  type: 'line', yAxisIndex: 0, data: mcap,   smooth: true,  symbol: 'none', connectNulls: false, lineStyle: { color: '#06b6d4', width: 2 }, itemStyle: { color: '#06b6d4' } },
        { name: 'FPI Net (K Cr)',  type: 'bar',  yAxisIndex: 1, data: fpi, barMaxWidth: 5,
          itemStyle: { color: params => params.value >= 0 ? '#8b5cf699' : '#8b5cf699', borderRadius: params => params.value >= 0 ? [2,2,0,0] : [0,0,2,2] } },
      ],
    };
  });

  /* ── Market Plumbing and Concentration Risk ── */
  useChart(rPlumbing, () => {
    const { months, top10m, top25s, ratio } = plumbingData;
    if (!months.length) return null;
    const c = cc();
    const iv = Math.max(1, Math.floor(months.length / 10));
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 16, bottom: 40, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s=>s.value!=null).map(s=>`${s.marker}${s.seriesName}: <b>${(+s.value).toFixed(1)}%</b>`).join('<br/>') },
      legend: { bottom: 4, itemWidth: 12, itemHeight: 8, textStyle: { color: c.text, fontSize: 9 }, data: ['Top 10 Members','Top 25 Securities','Reported Traded/List Ratio'] },
      xAxis: { type: 'category', data: months, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9, interval: iv } },
      yAxis: { type: 'value', min: 0, axisLabel: { color: c.text, fontSize: 9, formatter: v => `${v}%` }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
      series: [
        { name: 'Top 10 Members',          type: 'line', data: top10m, smooth: true, symbol: 'none', connectNulls: false, lineStyle: { color: '#06b6d4', width: 1.5 }, itemStyle: { color: '#06b6d4' } },
        { name: 'Top 25 Securities',       type: 'line', data: top25s, smooth: true, symbol: 'none', connectNulls: false, lineStyle: { color: '#f59e0b', width: 1.5 }, itemStyle: { color: '#f59e0b' } },
        { name: 'Reported Traded/List Ratio', type: 'line', data: ratio, smooth: true, symbol: 'none', connectNulls: false, lineStyle: { color: '#8b5cf6', width: 1.5 }, itemStyle: { color: '#8b5cf6' } },
      ],
    };
  });

  /* ── Derivatives Concentration Monitor ── */
  useChart(rDerivConc, () => {
    const { years, turnover, optShare } = derivConcData;
    if (!years.length) return null;
    const c = cc();
    // Apply fromYear/toYear filter
    const idxs = years.reduce((acc, yr, i) => { if (yr >= fromYear && yr <= toYear) acc.push(i); return acc; }, []);
    const yrs = idxs.map(i => years[i]);
    const torn = idxs.map(i => turnover[i]);
    const opts = idxs.map(i => optShare[i]);
    if (!yrs.length) return null;
    const maxT = Math.max(...torn.filter(v => v > 0));
    // Format: values are raw Crore — convert to L Cr for display
    const fmtT = v => v >= 1e5 ? `₹${(v/1e5).toFixed(1)} L Cr` : `₹${(v/1000).toFixed(0)}K Cr`;
    const fmtAxis = v => v >= 1e5 ? `₹${(v/1e5).toFixed(0)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: c.bg, borderColor: c.grid, textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s=>s.value!=null).map(s=>`${s.marker}${s.seriesName}: <b>${s.seriesIndex===0 ? fmtT(+s.value) : (+s.value).toFixed(1)+'%'}</b>`).join('<br/>') },
      legend: { bottom: 4, itemWidth: 12, itemHeight: 8, textStyle: { color: c.text, fontSize: 9 }, data: ['F&O Turnover','Options Share'] },
      xAxis: { type: 'category', data: yrs, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9 } },
      yAxis: [
        { type: 'value', min: 0, axisLabel: { color: c.text, fontSize: 9, formatter: fmtAxis }, splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
        { type: 'value', min: 0, max: 100, interval: 25, axisLabel: { color: '#f59e0b', fontSize: 9, formatter: v => `${v}%` }, splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'F&O Turnover',  type: 'bar',  yAxisIndex: 0, data: torn, barMaxWidth: 30, itemStyle: { color: '#8b5cf699' } },
        { name: 'Options Share', type: 'line', yAxisIndex: 1, data: opts, smooth: true, symbol: 'circle', symbolSize: 4, connectNulls: false, lineStyle: { color: '#f59e0b', width: 2.5 }, itemStyle: { color: '#f59e0b' } },
      ],
    };
  });

  useChart(rNseMcap, () => null);
  useChart(rDemat,   () => null);
  useChart(rMfAum,   () => null);
  useChart(rFpi,     () => null);
  useChart(rYield,   () => null);
  /* ── Household Financialization Flywheel — dual-axis multi-line ── */
  useChart(rHh, () => {
    const hasDemat = dematTrend.months.length > 0;
    const hasMf    = mfAumTrend.months.length > 0;
    const hasPms   = pmsAumTrend.months.length > 0;
    if (!hasDemat && !hasMf && !hasPms) return null;
    const c = cc();
    // use MF AUM (longest) as spine
    const spine = hasMf ? mfAumTrend : hasPms ? pmsAumTrend : dematTrend;
    const months = spine.months;
    const iv = Math.max(1, Math.floor(months.length / 10));
    const mfMap  = Object.fromEntries((mfAumTrend.months  || []).map((m,i) => [m, mfAumTrend.values[i]]));
    const pmsMap = Object.fromEntries((pmsAumTrend.months || []).map((m,i) => [m, pmsAumTrend.values[i]]));
    const demMap = Object.fromEntries((dematTrend.months  || []).map((m,i) => [m, dematTrend.values[i]]));
    const demVals = months.map(m => demMap[m] ?? null);
    const mfVals  = months.map(m => mfMap[m]  ?? null);
    const pmsVals = months.map(m => pmsMap[m] ?? null);
    const maxDem = Math.max(...demVals.filter(v => v != null));
    const maxRight = Math.max(...[...mfVals, ...pmsVals].filter(v => v != null));
    const demStep = maxDem <= 12 ? 6 : maxDem <= 24 ? 6 : 10;
    const rgtStep = maxRight <= 50 ? 25 : maxRight <= 100 ? 25 : 50;
    return {
      backgroundColor: 'transparent',
      grid: { top: 16, right: 56, bottom: 40, left: 8, containLabel: true },
      tooltip: {
        trigger: 'axis', backgroundColor: c.bg, borderColor: c.grid,
        textStyle: { color: c.text2, fontSize: 11 },
        formatter: p => `<b>${p[0].axisValue}</b><br/>` + p.filter(s => s.value != null).map(s => {
          const isDemat = s.seriesName === 'Demat Accounts';
          return `${s.marker}${s.seriesName}: <b>${isDemat ? (+s.value).toFixed(1)+'Cr' : '₹'+(+s.value).toFixed(0)+'L'}</b>`;
        }).join('<br/>'),
      },
      legend: { bottom: 4, itemWidth: 14, itemHeight: 8, textStyle: { color: c.text, fontSize: 10 }, data: ['Demat Accounts','MF AUM','PMS AUM'] },
      xAxis: { type: 'category', data: months, boundaryGap: false, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: c.text, fontSize: 9, interval: iv } },
      yAxis: [
        { type: 'value', min: 0, max: Math.ceil(maxDem/demStep)*demStep, interval: demStep,
          axisLabel: { color: c.text, fontSize: 9, formatter: v => `${v}Cr` },
          splitLine: { lineStyle: { color: c.grid, type: 'dashed' } }, axisLine: { show: false } },
        { type: 'value', min: 0, max: Math.ceil(maxRight/rgtStep)*rgtStep, interval: rgtStep,
          axisLabel: { color: '#10b981', fontSize: 9, formatter: v => `₹${v}L` },
          splitLine: { show: false }, axisLine: { show: false } },
      ],
      series: [
        { name: 'Demat Accounts', type: 'line', yAxisIndex: 0, data: demVals, smooth: true, symbol: 'none', connectNulls: false, lineStyle: { color: '#10b981', width: 2 }, itemStyle: { color: '#10b981' } },
        { name: 'MF AUM',         type: 'line', yAxisIndex: 1, data: mfVals,  smooth: true, symbol: 'none', connectNulls: false, lineStyle: { color: '#06b6d4', width: 2 }, itemStyle: { color: '#06b6d4' } },
        { name: 'PMS AUM',        type: 'line', yAxisIndex: 1, data: pmsVals, smooth: true, symbol: 'none', connectNulls: false, lineStyle: { color: '#8b5cf6', width: 2 }, itemStyle: { color: '#8b5cf6' } },
      ],
    };
  });
  useChart(rSdlBar,  () => null);

  return (
    <div
      id="page-insights"
      style={{display:isActive?'flex':'none',flexDirection:'column',height:'100%',overflow:'hidden'}}
    >
      <div
        className="ins-scroll"
        style={{flex:'1 1 0',minHeight:0,height:0,overflowY:'scroll',
                display:'flex',flexDirection:'column',gap:14,padding:'18px 20px 40px'}}
      >
        {/* ── Header ── */}
        <div className="ins-header-wrap">
          <div className="ins-header-left">
            <div className="ins-label">INSTITUTIONAL ECONOMIC INTELLIGENCE BRIEFING</div>
            <div className="ins-title">India Capital Markets Command Center</div>
            <div className="ins-sub">Real-time synthesis of equity, debt, FPI, derivatives and macro intelligence</div>
          </div>
          {/* <div className="ins-mode-box">
            <div className="ins-mode-lbl">CURRENT MARKET MODE</div>
            <div className="ins-mode-val">Defensive</div>
            <div className="ins-mode-note">Risk-off · FPI selling · Elevated Vol</div>
          </div> */}
        </div>

        {/* ── Filters ── */}
        <div className="ins-filters">
          <div className="ins-btn-group">
            {['1Y','3Y','5Y','All'].map(p => (
              <button key={p} className={`ins-btn${period===p?' on':''}`} onClick={() => setPeriod(p)}>{p}</button>
            ))}
          </div>
          <div className="ins-range">
            <span className="ins-lbl">From</span>
            <select className="ins-sel" value={fromYear} onChange={e => setFromYear(e.target.value)}>
              {['2014','2015','2016','2017','2018','2019','2020'].map(y => <option key={y}>{y}</option>)}
            </select>
            <span className="ins-lbl">To</span>
            <select className="ins-sel" value={toYear} onChange={e => setToYear(e.target.value)}>
              {['2024','2025','2026'].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* ── 6 KPI cards ── */}
        <div className="ins-kpis">
          {[
            { lbl: 'NSE MARKET CAP',    val: nseMcapKpi?.value,    note: nseMcapKpi?.note,    loading: !nseMcapKpi },
            { lbl: 'DEMAT ACCOUNTS',    val: dematKpi?.value,      note: dematKpi?.note,      loading: !dematKpi },
            { lbl: 'MUTUAL FUND AUM',   val: mfAumKpi?.value,      note: mfAumKpi?.note,      loading: !mfAumKpi },
            { lbl: 'DEBT MARKET STOCK', val: debtStockKpi?.value,  note: debtStockKpi?.note,  loading: !debtStockKpi },
            { lbl: 'LATEST FPI NET',    val: fpiNetKpi?.value,     note: fpiNetKpi?.note,     loading: !fpiNetKpi },
            { lbl: '10Y G-SEC YIELD',   val: gsecYieldKpi?.value,  note: gsecYieldKpi?.note,  loading: !gsecYieldKpi },
          ].map(k => (
            <div key={k.lbl} className="ins-kpi">
              <div className="ins-kpi-lbl">{k.lbl}</div>
              <div className="ins-kpi-num">
                {k.loading ? <span className="kpi-skel" /> : k.val}
              </div>
              <div className="ins-kpi-note">
                {k.loading ? <span className="kpi-skel-sub" /> : k.note}
              </div>
            </div>
          ))}
        </div>

      

        {/* ── Balance Sheet + Flywheel side by side ── */}
        <div className="ins-row2">
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Strategic Balance Sheet of Indian Capital Markets</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rBal.current, 'Strategic Balance Sheet of Indian Capital Markets')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">₹ Lakh Crore · latest available official/public datasets</div>
            <div ref={rBal} style={{height:280}} />
          </div>
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Household Financialization Flywheel</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rHh.current, 'Household Financialization Flywheel')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">Demat accounts, MF AUM, and PMS AUM</div>
            <div ref={rHh} style={{height:280}} />
          </div>
        </div>

        {/* ── Capital Formation Engine — full width ── */}
        <div className="ins-card">
          <div className="ins-card-hd">
            <span className="ins-card-title">Capital Formation Engine</span>
            <span className="ins-badge ins-badge-blue">Annual</span>
            <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rCapForm.current, 'Capital Formation Engine')}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="ins-card-sub">Visible channels across equity issuance, private placements, OFS, and credit issuance · ₹ Lakh Crore</div>
          <div ref={rCapForm} style={{height:300}} />
        </div>

        {/* ── Sovereign Funding + Debt Stock Split — side by side ── */}
        <div className="ins-row2">
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Sovereign, State, and Credit Funding Conditions</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rSovFund.current, 'Sovereign, State, and Credit Funding Conditions')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">Auction supply and corporate debt-market activity</div>
            <div ref={rSovFund} style={{height:300}} />
          </div>
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Debt Market Stock Split</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rDebtSplit.current, 'Debt Market Stock Split')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">Current stock: sovereign, state, and corporate bond markets</div>
            <div ref={rDebtSplit} style={{height:300}} />
          </div>
        </div>

        {/* ── SGS Archive + State Debt Additions — side by side ── */}
        <div className="ins-row2">
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">State Debt Stock Archive and Concentration</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rSgsArch.current, 'State Debt Stock Archive and Concentration')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">RBI State Finances annual SGS market loans through Mar 2025</div>
            <div ref={rSgsArch} style={{height:300}} />
          </div>
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Largest 5-Year State Debt Additions</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rStateDebt.current, 'Largest 5-Year State Debt Additions')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">Latest annual SGS archive versus prior available five-year baseline</div>
            <div ref={rStateDebt} style={{height:300}} />
          </div>
        </div>

        {/* ── Market Risk + Macro Transmission — side by side ── */}
        <div className="ins-row2">
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Market Risk and External Vulnerability</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rRisk.current, 'Market Risk and External Vulnerability')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">VIX range high, market breadth, and FPI net flows</div>
            <div ref={rRisk} style={{height:300}} />
          </div>
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Macro-Market Transmission Map</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rMacroTrans.current, 'Macro-Market Transmission Map')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">Indexed to first available observation = 100, with FPI net flows as bars</div>
            <div ref={rMacroTrans} style={{height:300}} />
          </div>
        </div>

        {/* ── Market Plumbing + Derivatives Concentration — side by side ── */}
        <div className="ins-row2">
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Market Plumbing and Concentration Risk</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rPlumbing.current, 'Market Plumbing and Concentration Risk')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">NSE broker/member and security-level concentration</div>
            <div ref={rPlumbing} style={{height:300}} />
          </div>
          <div className="ins-card">
            <div className="ins-card-hd">
              <span className="ins-card-title">Derivatives Concentration Monitor</span>
              <button className="chart-expand-btn" title="View larger" onClick={() => openChartPreview(rDerivConc.current, 'Derivatives Concentration Monitor')}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
            </div>
            <div className="ins-card-sub">NSE F&amp;O turnover scale and options share</div>
            <div ref={rDerivConc} style={{height:300}} />
          </div>
        </div>


      </div>

      <style>{`
        .ins-scroll::-webkit-scrollbar{width:6px}
        .ins-scroll::-webkit-scrollbar-track{background:transparent}
        .ins-scroll::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:3px}

        /* Header */
        .ins-header-wrap{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
        .ins-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
          color:var(--tx3,#888);margin-bottom:4px}
        .ins-title{font-size:22px;font-weight:700;color:var(--tx2,#e0e0e0);letter-spacing:-.3px}
        .ins-sub{font-size:12px;color:var(--tx3,#888);margin-top:3px}
        .ins-mode-box{flex-shrink:0;background:rgba(224,80,96,.10);border:1px solid rgba(224,80,96,.30);
          border-radius:8px;padding:10px 16px;text-align:right}
        .ins-mode-lbl{font-size:9px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
          color:rgba(224,80,96,.8);margin-bottom:3px}
        .ins-mode-val{font-size:18px;font-weight:700;color:#e05060;line-height:1}
        .ins-mode-note{font-size:10px;color:rgba(224,80,96,.65);margin-top:3px}

        /* Filters */
        .ins-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;
          padding:8px 0;border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .ins-btn-group{display:flex;gap:4px}
        .ins-btn{padding:3px 11px;border-radius:4px;font-size:11px;font-weight:500;cursor:pointer;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:transparent;color:var(--tx2,#ccc);transition:all .15s}
        .ins-btn.on{background:var(--green,#2d8a4e);border-color:var(--green,#2d8a4e);color:#fff}
        .ins-btn:hover:not(.on){background:var(--sf2,rgba(255,255,255,.06))}
        .ins-range{display:flex;align-items:center;gap:6px}
        .ins-lbl{font-size:11px;color:var(--tx3,#888)}
        .ins-sel{padding:3px 7px;border-radius:4px;font-size:11px;
          border:1px solid var(--bdr2,rgba(255,255,255,.12));
          background:var(--sf,#1c1c1c);color:var(--tx2,#ccc);cursor:pointer}

        /* KPI cards */
        .ins-kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}
        @media(max-width:640px){.ins-kpis{grid-template-columns:repeat(2,1fr)!important;gap:8px!important}}
        .ins-kpi{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:14px 16px}
        .ins-kpi-lbl{font-size:10px;font-weight:600;color:var(--tx3,#888);
          letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;line-height:1.3}
        .ins-kpi-num{font-size:24px;font-weight:700;color:var(--tx2,#e0e0e0);
          letter-spacing:-.5px;line-height:1}
        .ins-kpi-unit{font-size:13px;font-weight:500;margin-left:2px;color:var(--tx3,#888)}
        .ins-kpi-grn{color:#26c99a}
        .ins-kpi-red{color:#e05060}
        .ins-kpi-note{font-size:10px;color:var(--tx3,#888);margin-top:5px;line-height:1.4}

        /* Intelligence cards */
        .ins-intel-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .ins-intel-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px}
        .ins-intel-cat{display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;
          font-size:10px;font-weight:700;letter-spacing:.8px;border:1px solid;width:fit-content}
        .ins-intel-title{font-size:13px;font-weight:700;color:var(--tx2,#e0e0e0);line-height:1.3}
        .ins-intel-body{font-size:11px;color:var(--tx3,#888);line-height:1.6}
        .ins-intel-focus{font-size:11px;color:var(--tx2,#e0e0e0);line-height:1.5;
          border-top:1px solid var(--bdr,rgba(255,255,255,.06));padding-top:8px}
        .ins-intel-focus-lbl{font-weight:700;color:var(--green,#2d8a4e)}

        /* Cards */
        .ins-card{background:var(--sf,#1c1c1c);border:1px solid var(--bdr,rgba(255,255,255,.06));
          border-radius:8px;padding:16px}
        .ins-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap}
        .ins-card-title{font-size:13px;font-weight:600;color:var(--tx2,#e0e0e0)}
        .ins-card-sub{font-size:11px;color:var(--tx3,#888);margin-bottom:14px}
        .ins-row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        @media(max-width:640px){.ins-row2{grid-template-columns:1fr!important;gap:10px!important}}

        /* Badges */
        .ins-badge{padding:2px 8px;border-radius:3px;font-size:10px;font-weight:600}
        .ins-badge-blue{background:rgba(74,144,217,.15);color:#7ab8f5;border:1px solid rgba(74,144,217,.3)}
        .ins-badge-grn{background:rgba(38,201,154,.12);color:#26c99a;border:1px solid rgba(38,201,154,.3)}
        .ins-badge-pur{background:rgba(139,92,246,.15);color:#a78bfa;border:1px solid rgba(139,92,246,.3)}
        .ins-badge-amber{background:rgba(240,160,64,.15);color:#f0a040;border:1px solid rgba(240,160,64,.3)}

        /* Table */
        .ins-tbl-wrap{overflow-x:auto}
        .ins-tbl{width:100%;border-collapse:collapse;font-size:12px}
        .ins-tbl th{padding:8px 12px;text-align:left;font-size:10px;font-weight:600;
          letter-spacing:.4px;text-transform:uppercase;color:var(--tx3,#888);
          border-bottom:1px solid var(--bdr,rgba(255,255,255,.06))}
        .ins-tbl td{padding:9px 12px;border-bottom:1px solid var(--bdr,rgba(255,255,255,.04));
          color:var(--tx2,#e0e0e0)}
        .ins-tbl tr:last-child td{border-bottom:none}
        .ins-tbl tr:hover td{background:var(--sf2,rgba(255,255,255,.03))}
        .ins-tbl-num{text-align:right;font-variant-numeric:tabular-nums}

        /* Ratings */
        .ins-rating{padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700}
        .ins-rating-aap{background:rgba(38,201,154,.15);color:#26c99a}
        .ins-rating-aa{background:rgba(74,144,217,.15);color:#7ab8f5}
        .ins-rating-ap{background:rgba(240,160,64,.15);color:#f0a040}
        .ins-rating-a{background:rgba(224,80,96,.15);color:#e05060}

        /* Status */
        .ins-status{padding:1px 7px;border-radius:3px;font-size:10px;font-weight:600}
        .ins-status-active{background:rgba(38,201,154,.15);color:#26c99a}
        .ins-status-watch{background:rgba(240,160,64,.15);color:#f0a040}
        .ins-status-caution{background:rgba(224,80,96,.15);color:#e05060}
      `}</style>
    </div>
  );
}
