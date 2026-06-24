import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getDataSourceMetrics,
  getDataSourceDimensionTypes,
  getDataSourceDates,
  getDateAttributeTypes,
  getAllDimensions,
  analyticsAggregate,
  getDataSourceDateRange,
  getDataSourceUrls,
} from '../../api/bond_api';

// ── helpers ────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
}

function periodToStartDate(period) {
  if (!period) return null;
  const s = String(period).trim();
  const qm = s.match(/^(\d{4})-Q(\d)$/i);
  if (qm) {
    const startMonths = ['01','04','07','10'];
    const q = parseInt(qm[2]) - 1;
    return `${qm[1]}-${startMonths[q]}-01`;
  }
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const n = parseInt(m[2]);
    if (n > 12) return `${m[1]}-04-01`;
    return `${m[1]}-${m[2]}-01`;
  }
  return null;
}

function periodToEndDate(period) {
  if (!period) return null;
  const s = String(period).trim();
  const qm = s.match(/^(\d{4})-Q(\d)$/i);
  if (qm) {
    const endMonths = ['03','06','09','12'];
    const endDays   = ['31','30','30','31'];
    const q = parseInt(qm[2]) - 1;
    return `${qm[1]}-${endMonths[q]}-${endDays[q]}`;
  }
  if (/^\d{4}$/.test(s)) return `${s}-12-31`;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const n = parseInt(m[2]);
    if (n > 12) {
      const endYear = parseInt(m[1]) + 1;
      return `${endYear}-03-31`;
    }
    const lastDay = new Date(parseInt(m[1]), n, 0).getDate();
    return `${m[1]}-${m[2]}-${String(lastDay).padStart(2,'0')}`;
  }
  return null;
}

function fmt(v, unit) {
  if (unit === '%') return v.toFixed(2) + '%';
  if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Number(v).toLocaleString('en-IN');
}

const GRANULARITIES = [
  { label: 'Financial Year', value: 'financial_year' },
  { label: 'Yearly',         value: 'year'           },
  { label: 'Quarterly',      value: 'quarter'        },
  { label: 'Monthly',        value: 'month'          },
  { label: 'Weekly',         value: 'week'           },
  { label: 'Daily',          value: 'day'            },
];

const AGGREGATIONS = ['sum', 'avg', 'max', 'min', 'stddev'];

const CHART_COLORS = {
  line: { border: '#2557a7', bg: 'rgba(37,87,167,.08)' },
  area: { border: '#2557a7', bg: 'rgba(37,87,167,.18)' },
  bar:  { border: 'rgba(37,87,167,.85)', bg: 'rgba(37,87,167,.85)' },
  pie:  { border: '#fff',    bg: ['#2557a7','#2d8a4e','#c47a1e','#c0392b','#6d3fc0','#0e7490','#8b4513'] },
};

const KPI_ACCENT = ['#2557a7', '#2d8a4e', '#c47a1e', '#6d3fc0'];

function extractPeriodFromS3Url(url) {
  if (!url) return null;
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\/(\d{4}[^/]*)\//);
    return m ? m[1] : null;
  } catch {}
  return null;
}

// ── component ──────────────────────────────────────────────────────────────
export default function DatasetDetailPage({ isActive }) {
  const [sourceId,       setSourceId]       = useState(() => {
    if (window._pendingDetailSourceId) {
      const id = String(window._pendingDetailSourceId);
      delete window._pendingDetailSourceId;
      return id;
    }
    return null;
  });
  // bumped on every openDetail call — forces re-fetch even when sourceId is unchanged
  const [requestId,      setRequestId]      = useState(0);
  const [datasetInfo,    setDatasetInfo]     = useState(null);

  // metadata
  const [metrics,        setMetrics]        = useState([]);
  const [dateAttrTypes,  setDateAttrTypes]  = useState([]);
  const [dimTypes,       setDimTypes]       = useState([]);
  const [dimensions,     setDimensions]     = useState([]);
  const [metaLoading,    setMetaLoading]    = useState(false);
  const [dimsLoading,    setDimsLoading]    = useState(false);

  // controls
  const [metricId,       setMetricId]       = useState(null);
  const [aggregation,    setAggregation]    = useState('sum');
  const [granularity,    setGranularity]    = useState('financial_year');
  const [dateAttrId,     setDateAttrId]     = useState(null);
  const [dimTypeId,      setDimTypeId]      = useState(null);
  const [selectedDims,   setSelectedDims]   = useState([]);
  const [dimSearch,      setDimSearch]      = useState('');
  const [startDate,      setStartDate]      = useState('');
  const [endDate,        setEndDate]        = useState('');
  const [availableStart, setAvailableStart] = useState('');
  const [availableEnd,   setAvailableEnd]   = useState('');
  const [page,           setPage]           = useState(1);
  const PAGE_SIZE = 20;

  // drawer
  const [drawerOpen,     setDrawerOpen]     = useState(true);
  const [hasApplied,     setHasApplied]     = useState(false);

  // results
  const [results,        setResults]        = useState([]);
  const [unit,           setUnit]           = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError,   setAnalyticsError]   = useState(null);

  // source urls
  const [sourceUrls,     setSourceUrls]     = useState([]);
  const [srcExpanded,    setSrcExpanded]    = useState(false);
  const [origExpanded,   setOrigExpanded]   = useState(false);

  // metric availability (keyed by selected dimension)
  const [availableMetricIds, setAvailableMetricIds] = useState(null); // null = no filter
  const [metricProbing,      setMetricProbing]      = useState(false);

  // chart
  const [chartType,      setChartType]      = useState('line');
  const chartRef         = useRef(null);
  const chartInstance    = useRef(null);
  const fetchIdRef       = useRef(0);
  const metricIdRef      = useRef(metricId);

  // ── register React handler ────────────────────────────────────────────
  useEffect(() => {
    window._onOpenDetail = (id) => {
      setSourceId(String(id));
      setRequestId(n => n + 1);
    };
    return () => { delete window._onOpenDetail; };
  }, []);

  // ── load metadata when sourceId changes (or same dataset re-clicked) ────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sourceId) return;

    console.log('[DetailPage] Loading sourceId:', sourceId, 'requestId:', requestId);

    const cached = window.DATASETS?.find(d => String(d.sourceId) === String(sourceId));
    setDatasetInfo(cached || null);

    setMetrics([]);
    setDateAttrTypes([]);
    setDimTypes([]);
    setDimensions([]);
    setSelectedDims([]);
    setDimTypeId(null);
    setDimSearch('');
    setStartDate('');
    setEndDate('');
    setAvailableStart('');
    setAvailableEnd('');
    setResults([]);
    setAnalyticsError(null);
    setHasApplied(false);
    setSourceUrls([]);

    getDataSourceUrls(sourceId)
      .then(res => setSourceUrls(Array.isArray(res) ? res : []))
      .catch(() => {});

    setMetaLoading(true);

    Promise.all([
      getDataSourceMetrics(sourceId),
      getDataSourceDates(sourceId),
      getDataSourceDimensionTypes(sourceId),
    ]).then(async ([metricsRes, datesRes, dimTypesRes]) => {
      console.log('[DetailPage] Metadata response — metrics:', metricsRes, 'dates:', datesRes, 'dimTypes:', dimTypesRes);

      const EXCLUDED_METRICS = { '10': [53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64], '53': [189] };
      const rawMetrics   = Array.isArray(metricsRes)  ? metricsRes  : (metricsRes?.items || metricsRes?.data || []);
      const excluded     = EXCLUDED_METRICS[String(sourceId)] || [];
      const metricsList  = excluded.length
        ? rawMetrics.filter(m => !excluded.includes(Number(m.metric_id ?? m.id)))
        : rawMetrics;
      const datesList    = Array.isArray(datesRes)    ? datesRes    : (datesRes?.items || datesRes?.data || []);
      const dimTypesList = Array.isArray(dimTypesRes) ? dimTypesRes : (dimTypesRes?.items || dimTypesRes?.data || []);

      setMetrics(metricsList);
      setDimTypes(dimTypesList);

      const dateDetails = await Promise.all(
        datesList.map(item => {
          const id = item.date_attribute_type_id || item.id;
          return id ? getDateAttributeTypes(id).catch(() => item) : Promise.resolve(item);
        })
      );
      setDateAttrTypes(dateDetails);

      const firstMetric    = metricsList[0];
      const firstDate      = dateDetails[0];
      const firstDimType   = dimTypesList[0];
      const firstMetricId  = firstMetric?.metric_id ?? firstMetric?.id ?? null;
      const firstDateAttrId = firstDate?.date_attribute_type_id ?? firstDate?.id ?? null;
      setMetricId(firstMetricId);
      setUnit(firstMetric?.unit || '');
      setDateAttrId(firstDateAttrId);
      setDimTypeId(String(firstDimType?.dimension_type_id ?? firstDimType?.id ?? '') || null);

      if (firstMetricId && firstDateAttrId) {
        try {
          const { start, end } = await getDataSourceDateRange({
            source_id: sourceId,
            date_attribute_type_id: firstDateAttrId,
            metric_id: firstMetricId,
          });
          if (start) { setAvailableStart(start); const s = periodToStartDate(start); if (s) setStartDate(s); }
          if (end)   { setAvailableEnd(end);   const e = periodToEndDate(end);   if (e) setEndDate(e);   }
        } catch (_) {}
      }
    }).catch(err => console.error('[DetailPage] Metadata fetch error:', err))
      .finally(() => setMetaLoading(false));
  }, [sourceId, requestId]);

  // ── load dimensions ───────────────────────────────────────────────────
  useEffect(() => {
    if (!dimTypeId) { setDimensions([]); setSelectedDims([]); return; }
    setDimsLoading(true);
    setSelectedDims([]);
    getAllDimensions(dimTypeId)
      .then(res => setDimensions(Array.isArray(res) ? res : []))
      .catch(() => setDimensions([]))
      .finally(() => setDimsLoading(false));
  }, [dimTypeId]);

  // ── keep metricIdRef in sync (used by probe to avoid circular deps) ──
  useEffect(() => { metricIdRef.current = metricId; }, [metricId]);

  // ── update unit ───────────────────────────────────────────────────────
  useEffect(() => {
    const m = metrics.find(m => String(m.metric_id ?? m.id) === String(metricId));
    if (m) setUnit(m.unit || '');
  }, [metricId, metrics]);

  // ── probe metric availability when a dimension is selected ────────────
  useEffect(() => {
    if (!selectedDims.length || !sourceId || !dateAttrId || !dimTypeId || metrics.length === 0) {
      setAvailableMetricIds(null);
      return;
    }
    let cancelled = false;
    setMetricProbing(true);
    Promise.all(
      metrics.map(m => {
        const id = m.metric_id ?? m.id;
        return analyticsAggregate({
          source_id:              sourceId,
          date_attribute_type_id: dateAttrId,
          metric_id:              id,
          dimension_type_id:      dimTypeId,
          dimension_id:           selectedDims,
          granularity,
          aggregation,
          limit: 1,
        }).then(res => {
          const rows = Array.isArray(res) ? res : (res.data || res.items || []);
          return rows.length > 0 ? String(id) : null;
        }).catch(() => null);
      })
    ).then(ids => {
      if (cancelled) return;
      const available = new Set(ids.filter(Boolean));
      setAvailableMetricIds(available);
      // auto-switch if the current metric has no data for this dimension
      if (!available.has(String(metricIdRef.current))) {
        const first = metrics.find(m => available.has(String(m.metric_id ?? m.id)));
        if (first) setMetricId(String(first.metric_id ?? first.id));
      }
    }).finally(() => { if (!cancelled) setMetricProbing(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDims, sourceId, dateAttrId, dimTypeId, metrics, granularity, aggregation]);

  // ── fetch analytics ───────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!sourceId || !metricId || !dateAttrId) return;
    // Stale-call guard: each invocation captures an ID; only the latest call writes state.
    // This prevents the double-load glitch where an earlier call (no date range) resolves
    // after a newer call (with date range) and overwrites the correct results.
    const fetchId = ++fetchIdRef.current;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const res = await analyticsAggregate({
        source_id:              sourceId,
        date_attribute_type_id: dateAttrId,
        aggregation,
        granularity,
        metric_id:              metricId,
        dimension_type_id:      dimTypeId   || undefined,
        dimension_id:           selectedDims.length ? selectedDims : undefined,
        start_date:             startDate   || undefined,
        end_date:               endDate     || undefined,
        limit:                  500,
      });
      if (fetchId !== fetchIdRef.current) return;
      const rows = Array.isArray(res) ? res : (res.data || res.items || []);
      setResults(rows);
      setPage(1);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setAnalyticsError(err.message);
      setResults([]);
    } finally {
      if (fetchId === fetchIdRef.current) setAnalyticsLoading(false);
    }
  }, [sourceId, metricId, aggregation, granularity, dateAttrId, dimTypeId, selectedDims, startDate, endDate]);

  // analytics only run when user explicitly clicks Apply

  // ── KPIs ──────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const values = results.map(r => Number(r.value ?? r.aggregate_value ?? r.metric_value ?? 0));
    if (!values.length) return { total: 0, peak: 0, avg: 0, peakPeriod: '—', points: 0 };
    const total   = values.reduce((a, b) => a + b, 0);
    const peak    = Math.max(...values);
    const peakIdx = values.indexOf(peak);
    return {
      total, peak, avg: total / values.length,
      peakPeriod: results[peakIdx]?.period || '—',
      points: values.length,
    };
  }, [results]);

  // ── chart ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const Chart = window['Chart'];
    if (!chartRef.current || !Chart || !results.length) {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
      return;
    }
    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }

    const labels = results.map(r => r.period || r.label || '');
    const data   = results.map(r => Number(r.value ?? r.aggregate_value ?? r.metric_value ?? 0));
    const c      = CHART_COLORS[chartType] || CHART_COLORS.line;
    const dark   = document.documentElement.getAttribute('data-theme') === 'dark';
    const gc     = dark ? 'rgba(255,255,255,.05)' : 'rgba(26,28,24,.04)';
    const tc2    = dark ? '#686868' : '#9a9d92';

    const dataset = chartType === 'pie'
      ? { data, backgroundColor: c.bg, borderColor: c.border, borderWidth: 2, hoverOffset: 8 }
      : {
          label: metrics.find(m => String(m.metric_id ?? m.id) === String(metricId))?.metric_name
                 || metrics.find(m => String(m.metric_id ?? m.id) === String(metricId))?.name || '',
          data,
          borderColor: c.border, backgroundColor: c.bg,
          borderWidth: chartType === 'bar' ? 0 : 2.5,
          fill: chartType === 'area', tension: 0.42,
          borderRadius: chartType === 'bar' ? 5 : 0,
          pointRadius: chartType === 'line' ? 4 : 0,
          pointBackgroundColor: c.border, pointBorderColor: '#fff', pointBorderWidth: 1.5,
        };

    const opts = {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: chartType === 'pie', labels: { color: dark ? '#909090' : '#5a5d54', font: { size: 11 }, boxWidth: 12, padding: 14 } },
        tooltip: {
          backgroundColor: dark ? '#0d0d0d' : '#1a1c18',
          borderColor: dark ? 'rgba(255,255,255,.12)' : 'rgba(26,28,24,.15)',
          borderWidth: 1, titleColor: '#888', bodyColor: dark ? '#e8e8e8' : '#1a1c18',
          bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
          padding: 10, cornerRadius: 9,
          callbacks: { label: ctx => ` ${fmt(ctx.parsed?.y ?? ctx.parsed, unit)} ${unit}` },
        },
      },
    };
    if (chartType !== 'pie') {
      opts.scales = {
        x: { grid: { color: gc, lineWidth: .5 }, ticks: { color: tc2, font: { size: 11 } }, border: { display: false } },
        y: { grid: { color: gc, lineWidth: .5 }, ticks: { color: tc2, font: { family: "'JetBrains Mono',monospace", size: 10.5 }, callback: v => unit === '%' ? v + '%' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v }, border: { display: false } },
      };
    }
    chartInstance.current = new Chart(chartRef.current, {
      type: chartType === 'area' ? 'line' : chartType,
      data: { labels, datasets: [dataset] },
      options: opts,
    });
  }, [results, chartType, unit, metricId, metrics]);

  // ── derived ───────────────────────────────────────────────────────────
  const metricName = useMemo(() => {
    const m = metrics.find(m => String(m.metric_id ?? m.id) === String(metricId));
    return m?.metric_name || m?.name || '';
  }, [metrics, metricId]);

  const dateAttrName = useMemo(() => {
    const d = dateAttrTypes.find(d => String(d.date_attribute_type_id ?? d.id) === String(dateAttrId));
    return d?.attribute_name || d?.name || d?.date_attribute_type_name || '';
  }, [dateAttrTypes, dateAttrId]);

  const dimTypeName = useMemo(() => {
    const d = dimTypes.find(d => String(d.dimension_type_id ?? d.id) === String(dimTypeId));
    return d?.dimension_type || d?.name || '';
  }, [dimTypes, dimTypeId]);

  const EXCLUDED_DIMS = { '44': [34223], '43': [34219], '42': [34214], '41': [34201, 34208], '40': [34190, 34194], '39': [34180, 34183] };

  const filteredDims = useMemo(() => {
    const excluded = EXCLUDED_DIMS[String(sourceId)] || [];
    const visible = excluded.length
      ? dimensions.filter(d => !excluded.includes(Number(d.dimension_id ?? d.id)))
      : dimensions;
    const q = dimSearch.toLowerCase();
    return q ? visible.filter(d =>
      (d.dimension_value || d.value || d.name || d.dimension_name || '').toLowerCase().includes(q)
    ) : visible;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimensions, dimSearch, sourceId]);

  function toggleDim(id) {
    setSelectedDims(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const chartSubtitle = useMemo(() => {
    const parts = [`${aggregation.toUpperCase()}(${metricName})`];
    if (dimTypeName) parts.push(`Type: ${dimTypeName}`);
    if (startDate && endDate) parts.push(`${fmtDate(startDate)} → ${fmtDate(endDate)}`);
    if (granularity) parts.push(`Periodicity: ${GRANULARITIES.find(g => g.value === granularity)?.label || granularity}`);
    return parts.join(' • ');
  }, [aggregation, metricName, dimTypeName, startDate, endDate, granularity]);

  // active filter summary for the breadcrumb tag
  const filterSummary = useMemo(() => {
    const parts = [];
    if (metricName) parts.push(metricName);
    if (granularity) parts.push(GRANULARITIES.find(g => g.value === granularity)?.label || granularity);
    if (selectedDims.length) parts.push(`${selectedDims.length} dim`);
    return parts.join(' · ');
  }, [metricName, granularity, selectedDims]);

  // ── render ────────────────────────────────────────────────────────────
  if (!sourceId) {
    return <div className={`page${isActive ? ' on' : ''}`} id="page-detail" />;
  }

  return (
    <div className={`page${isActive ? ' on' : ''}`} id="page-detail">
      <div className="det-page-wrap" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>

        {/* Breadcrumb */}
        <div className="breadbar">
          <div className="bc">
            <button
              onClick={() => window['navigate']?.('catalog')}
              title="Back to Dataset Catalog"
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:32, height:32, borderRadius:'50%', background:'var(--blue)', border:'none', cursor:'pointer', color:'#fff', transition:'opacity .15s', flexShrink:0 }}
              onMouseOver={e => { e.currentTarget.style.opacity='0.8'; }}
              onMouseOut={e => { e.currentTarget.style.opacity='1'; }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <span className="bc-a" onClick={() => window['navigate']?.('catalog')} style={{ fontSize:12 }}>Dataset Catalog</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* Chart Builder trigger */}
            <button
              onClick={() => setDrawerOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: drawerOpen ? 'var(--blue-d, #1a3f8f)' : 'var(--blue)',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 14px', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--fn)', whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(37,87,167,.25)', transition: 'all .13s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--blue-d, #1a3f8f)'}
              onMouseOut={e => e.currentTarget.style.background = drawerOpen ? 'var(--blue-d, #1a3f8f)' : 'var(--blue)'}
            >
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              Chart Builder
            </button>
           
          </div>
        </div>

        {/* ── MAIN CONTENT (full width) ── */}
        <div className="det-body-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div className="det-content-pad" style={{ padding: `16px ${drawerOpen ? 316 : 20}px 40px 20px`, display: 'flex', flexDirection: 'column', gap: 14, transition: 'padding-right .22s cubic-bezier(.4,0,.2,1)' }}>

            {/* Title + KPI strip */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.3px' }}>
                  {datasetInfo?.title || '—'}
                </div>
                {datasetInfo?.src && (
                  <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 5, background: 'rgba(37,87,167,.12)', color: 'var(--blue)', border: '1px solid rgba(37,87,167,.2)' }}>
                    {datasetInfo.src}
                  </span>
                )}
               
              </div>

              {/* Source URL links */}
              {sourceUrls.length > 0 && (() => {
                const s3Items   = sourceUrls.filter(item => item.s3_url);
                const origItems = sourceUrls.filter(item => item.url && !(item.note && item.note.includes('Official SEBI Monthly Bulletin')));
                return (
                  <div style={{ marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>

                    {/* Bond Data Sources (s3_url downloads) */}
                    {s3Items.length > 0 && (
                      <div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSrcExpanded(e => !e)}
                          onKeyDown={e => e.key === 'Enter' && setSrcExpanded(v => !v)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            background: 'rgba(37,87,167,.07)', border: '1px solid rgba(37,87,167,.18)',
                            borderRadius: srcExpanded ? '8px 8px 0 0' : 8,
                            padding: '5px 12px', cursor: 'pointer', userSelect: 'none',
                            fontSize: 11.5, color: 'var(--blue)', fontWeight: 600,
                            transition: 'background .12s, border-radius .12s',
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(37,87,167,.13)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(37,87,167,.07)'}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Bond Data Sources
                          <span style={{
                            background: 'rgba(37,87,167,.15)', color: 'var(--blue)',
                            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                          }}>
                            {s3Items.length}
                          </span>
                          <svg
                            viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: 'transform .18s', transform: srcExpanded ? 'rotate(180deg)' : 'none' }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                        {srcExpanded && (
                          <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: 5, padding: '10px 12px',
                            background: 'rgba(37,87,167,.04)',
                            border: '1px solid rgba(37,87,167,.15)', borderTop: 'none',
                            borderRadius: '0 8px 8px 8px',
                            maxHeight: 220, overflowY: 'auto',
                          }}>
                            {s3Items.map((item, i) => {
                              const href   = item.s3_url;
                              const period = extractPeriodFromS3Url(item.s3_url) || item.name || item.label || `File ${i + 1}`;
                              return (
                                <a
                                  key={i}
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={item.note || href}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 11, color: 'var(--blue)', textDecoration: 'none',
                                    padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap',
                                    background: 'rgba(37,87,167,.08)', border: '1px solid rgba(37,87,167,.18)',
                                    fontFamily: 'var(--mo, monospace)', fontWeight: 500,
                                    transition: 'background .1s, border-color .1s',
                                  }}
                                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(37,87,167,.18)'; e.currentTarget.style.borderColor = 'rgba(37,87,167,.35)'; }}
                                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(37,87,167,.08)'; e.currentTarget.style.borderColor = 'rgba(37,87,167,.18)'; }}
                                >
                                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                    <polyline points="7 10 12 15 17 10"/>
                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                  </svg>
                                  {period}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Original Sources (url field — official govt/regulator pages) */}
                    {origItems.length > 0 && (
                      <div>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setOrigExpanded(e => !e)}
                          onKeyDown={e => e.key === 'Enter' && setOrigExpanded(v => !v)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 7,
                            background: 'rgba(22,163,74,.07)', border: '1px solid rgba(22,163,74,.22)',
                            borderRadius: origExpanded ? '8px 8px 0 0' : 8,
                            padding: '5px 12px', cursor: 'pointer', userSelect: 'none',
                            fontSize: 11.5, color: '#16a34a', fontWeight: 600,
                            transition: 'background .12s, border-radius .12s',
                          }}
                          onMouseOver={e => e.currentTarget.style.background = 'rgba(22,163,74,.14)'}
                          onMouseOut={e => e.currentTarget.style.background = 'rgba(22,163,74,.07)'}
                        >
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Original Sources
                          <span style={{
                            background: 'rgba(22,163,74,.14)', color: '#16a34a',
                            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                          }}>
                            {origItems.length}
                          </span>
                          <svg
                            viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
                            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                            style={{ transition: 'transform .18s', transform: origExpanded ? 'rotate(180deg)' : 'none' }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                        {origExpanded && (
                          <div style={{
                            display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px',
                            background: 'rgba(22,163,74,.04)',
                            border: '1px solid rgba(22,163,74,.18)', borderTop: 'none',
                            borderRadius: '0 8px 8px 8px',
                            maxHeight: 220, overflowY: 'auto',
                          }}>
                            {origItems.map((item, i) => (
                              <a
                                key={i}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={item.note || item.url}
                                style={{
                                  display: 'inline-flex', alignItems: 'flex-start', gap: 6,
                                  fontSize: 11, color: '#16a34a', textDecoration: 'none',
                                  padding: '4px 9px', borderRadius: 6,
                                  background: 'rgba(22,163,74,.07)', border: '1px solid rgba(22,163,74,.18)',
                                  fontWeight: 500, wordBreak: 'break-all',
                                  transition: 'background .1s, border-color .1s',
                                }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(22,163,74,.15)'; e.currentTarget.style.borderColor = 'rgba(22,163,74,.35)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(22,163,74,.07)'; e.currentTarget.style.borderColor = 'rgba(22,163,74,.18)'; }}
                              >
                                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/>
                                  <line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                                <span>
                                  {item.note ? <span style={{ display: 'block', fontSize: 10.5, color: '#166534', marginBottom: 1 }}>{item.note}</span> : null}
                                  {item.url}
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })()}

              {/* KPI strip */}
              <div className="det-kpi-strip" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                  { label: 'TOTAL',  value: analyticsLoading ? '—' : fmt(kpis.total, unit), sub: metricName },
                  { label: 'PEAK',   value: analyticsLoading ? '—' : fmt(kpis.peak,  unit), sub: `Highest ${kpis.peakPeriod}` },
                  { label: 'AVG',    value: analyticsLoading ? '—' : fmt(kpis.avg,   unit), sub: `Per ${GRANULARITIES.find(g => g.value === granularity)?.label || granularity}` },
                  { label: 'POINTS', value: analyticsLoading ? '—' : String(kpis.points || 0), sub: `${GRANULARITIES.find(g => g.value === granularity)?.label || granularity} periods` },
                ].map((k, i) => (
                  <div key={k.label} className="card" style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 5 }}>{k.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mo)', color: 'var(--tx)', lineHeight: 1.1 }}>{k.value}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 4 }}>{k.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt to apply filters */}
            {!hasApplied && (
              <div className="card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '48px 24px', textAlign: 'center' }}>
                <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="var(--tx3)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                  <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                  <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                </svg>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx2)' }}>Configure &amp; Apply Filters</div>
                <div style={{ fontSize: 12, color: 'var(--tx3)', maxWidth: 320 }}>
                  Select a metric, granularity, and optionally a dimension from the Chart Builder panel, then click <strong>Apply</strong> to load data.
                </div>
              </div>
            )}

            {/* Chart card */}
            {hasApplied && <div className="card" style={{ flexShrink: 0 }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>Chart</div>
                  <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 700 }}>{chartSubtitle}</div>
                </div>
                {!analyticsLoading && results.length > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx2)', fontFamily: 'var(--mo)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Total: {fmt(kpis.total, unit)} {unit}
                  </span>
                )}
              </div>
              <div style={{ padding: '14px 16px 10px', minHeight: 280, position: 'relative' }}>
                {analyticsLoading && (
                  <div className="ld-overlay">
                    <div className="ld-spin" />
                    <span className="ld-overlay-txt">Building chart…</span>
                  </div>
                )}
                {analyticsError && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--red)', background: 'var(--sf)', zIndex: 2 }}>{analyticsError}</div>
                )}
                {!analyticsLoading && !analyticsError && !metaLoading && metrics.length === 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'var(--sf)', zIndex: 2 }}>
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx2)' }}>No metrics configured</div>
                    <div style={{ fontSize: 11, color: 'var(--tx3)', textAlign: 'center', maxWidth: 280 }}>
                      This dataset (source&nbsp;ID&nbsp;{sourceId}) has no metrics linked in the database.
                      Data may exist but metrics and date attributes must be configured first.
                    </div>
                  </div>
                )}
                <canvas ref={chartRef} height={250} />
              </div>
            </div>}

            {/* Results table */}
            {hasApplied && <div className="results-card">
              <div className="results-head">
                <div className="results-title">Results</div>
                <div className="results-cnt">{results.length} total rows</div>
                <div className="results-pg" style={{ marginLeft: 'auto' }}>Page 1 of 1</div>
              </div>
              <div className="tw" style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', minWidth: 640 }}>
                  <thead><tr>
                    <th style={{ width: 32 }}>#</th>
                    <th>PERIOD</th>
                    <th className="R">VALUE {unit ? `(${unit})` : ''}</th>
                    <th>METRIC</th>
                    <th>DATE ATTRIBUTE</th>
                    <th>DATASET</th>
                  </tr></thead>
                  <tbody>
                    {analyticsLoading ? (
                      <>
                        {[...Array(5)].map((_, i) => (
                          <tr key={i}>
                            {[...Array(6)].map((__, j) => (
                              <td key={j} style={{ padding: '12px 10px' }}>
                                <span style={{ display:'inline-block', height:11, width: j===0?'20px': j===1?'55px':j===2?'60px':j===3?'100px':j===4?'80px':'90px', borderRadius:3, background:'linear-gradient(90deg,var(--sf2) 25%,var(--sf3) 50%,var(--sf2) 75%)', backgroundSize:'200% 100%', animation:`skel-shimmer 1.4s ${i*0.08}s ease-in-out infinite` }} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    ) : analyticsError ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--red)', fontSize: 12 }}>{analyticsError}</td></tr>
                    ) : results.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--tx3)', fontSize: 12 }}>No data</td></tr>
                    ) : results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((row, i) => {
                      const rowNum = (page - 1) * PAGE_SIZE + i + 1;
                      const val = Number(row.value ?? row.aggregate_value ?? row.metric_value ?? 0);
                      return (
                        <tr key={i}>
                          <td className="hh">{rowNum}</td>
                          <td><strong>{row.period || row.period_label || '—'}</strong></td>
                          <td className="nb R" style={{ color: 'var(--blue)', fontWeight: 600 }}>{fmt(val, unit)}</td>
                          <td className="mt">{row.metric_name || metricName || '—'}</td>
                          <td className="mt">{row.date_attribute_type_name || dateAttrName || '—'}</td>
                          <td className="mt">{row.dataset_name || datasetInfo?.title || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="results-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, color: 'var(--tx3)' }}>
                  {results.length === 0 ? '0 rows' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, results.length)} of ${results.length}`}
                </span>
                {results.length > PAGE_SIZE && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--bdr)', background: 'var(--sf2)', color: page === 1 ? 'var(--tx3)' : 'var(--tx)', cursor: page === 1 ? 'default' : 'pointer', fontSize: 12 }}
                    >‹</button>
                    {Array.from({ length: Math.ceil(results.length / PAGE_SIZE) }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === Math.ceil(results.length / PAGE_SIZE) || Math.abs(p - page) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) => p === '…'
                        ? <span key={`e${idx}`} style={{ fontSize: 11, color: 'var(--tx3)', padding: '0 2px' }}>…</span>
                        : <button key={p} onClick={() => setPage(p)} style={{ minWidth: 28, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--bdr)', background: p === page ? 'var(--blue)' : 'var(--sf2)', color: p === page ? '#fff' : 'var(--tx2)', cursor: 'pointer', fontSize: 12, fontWeight: p === page ? 700 : 400 }}>{p}</button>
                      )
                    }
                    <button
                      onClick={() => setPage(p => Math.min(Math.ceil(results.length / PAGE_SIZE), p + 1))}
                      disabled={page === Math.ceil(results.length / PAGE_SIZE)}
                      style={{ padding: '3px 9px', borderRadius: 6, border: '1px solid var(--bdr)', background: 'var(--sf2)', color: page === Math.ceil(results.length / PAGE_SIZE) ? 'var(--tx3)' : 'var(--tx)', cursor: page === Math.ceil(results.length / PAGE_SIZE) ? 'default' : 'pointer', fontSize: 12 }}
                    >›</button>
                  </div>
                )}
              </div>
            </div>}

          </div>

        </div>{/* /main content */}

        {/* Mobile backdrop — closes drawer when tapping outside on small screens */}
        <div className={`det-mob-overlay${drawerOpen ? ' on' : ''}`} onClick={() => setDrawerOpen(false)} />

        {/* ── SLIDE-OUT DRAWER ── */}
          <div className={`det-drawer${drawerOpen ? ' det-drawer-open' : ''}`} style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 300,
            background: 'var(--sf)', borderLeft: '1px solid var(--bdr)',
            display: 'flex', flexDirection: 'column',
            transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform .22s cubic-bezier(.4,0,.2,1)',
            zIndex: 50, boxShadow: drawerOpen ? '-8px 0 32px rgba(0,0,0,.18)' : 'none',
          }}>
            {/* Drag handle — visible only on mobile */}
            <div className="det-drawer-handle" />

            {/* Drawer header */}
            <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                  <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                  <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                </svg>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tx)' }}>Chart Builder</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--bdr)', background: 'var(--sf2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx3)', fontSize: 14, lineHeight: 1 }}
              >✕</button>
            </div>

            {/* Drawer controls */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px' }}>

              {/* ── METRIC ── */}
              {/* <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>Metric</div> */}

              <div className="ctrl-blk" style={{ marginBottom: 10 }}>
                <div className="ctrl-lbl">Metric</div>
                {metaLoading ? <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 0' }}><div className="ld-spin ld-spin-sm" /><span style={{ fontSize:11, color:'var(--tx3)' }}>Loading…</span></div>
                : metrics.length === 0 ? <div style={{ fontSize:11, color:'var(--tx3)', padding:'6px 0' }}>No metrics found for source {sourceId}</div>
                : (
                  <>
                    {/* {metricProbing && (
                      <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--tx3)', marginBottom:5 }}>
                        <div className="ld-spin ld-spin-sm" />
                        Checking availability…
                      </div>
                    )} */}
                    <select className="ctrl-sel" value={metricId ?? ''} onChange={e => setMetricId(e.target.value)}>
                      {(availableMetricIds
                        ? metrics.filter(m => availableMetricIds.has(String(m.metric_id ?? m.id)))
                        : metrics
                      ).map(m => {
                        const id = m.metric_id ?? m.id;
                        return <option key={id} value={id}>{m.metric_name || m.name || String(id)}</option>;
                      })}
                    </select>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                <div className="ctrl-blk" style={{ flex: 1 }}>
                  <div className="ctrl-lbl">Aggregation</div>
                  <select className="ctrl-sel" value={aggregation} onChange={e => setAggregation(e.target.value)}>
                    {AGGREGATIONS.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                  </select>
                </div>
                {unit && (
                  <div style={{ padding: '5px 8px', background: 'var(--sf2)', border: '1px solid var(--bdr)', borderRadius: 6, fontSize: 9.5, color: 'var(--tx3)', whiteSpace: 'nowrap', marginBottom: 1 }}>
                    {unit}
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--bdr)', margin: '14px 0' }} />

              {/* ── TIME ── */}
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>Time</div>

              <div className="ctrl-blk" style={{ marginBottom: 10 }}>
                <div className="ctrl-lbl">Periodicity</div>
                <select className="ctrl-sel" value={granularity} onChange={e => setGranularity(e.target.value)}>
                  {GRANULARITIES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>

              <div className="ctrl-blk">
                <div className="ctrl-lbl">Date Attribute</div>
                {metaLoading ? <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 0' }}><div className="ld-spin ld-spin-sm" /><span style={{ fontSize:11, color:'var(--tx3)' }}>Loading…</span></div> : (
                  <select className="ctrl-sel" value={dateAttrId ?? ''} onChange={e => setDateAttrId(e.target.value)}>
                    {dateAttrTypes.map(d => {
                      const id = d.date_attribute_type_id ?? d.id;
                      return <option key={id} value={id}>{d.attribute_name || d.name || d.date_attribute_type_name || String(id)}</option>;
                    })}
                  </select>
                )}
              </div>

              <div style={{ height: 1, background: 'var(--bdr)', margin: '14px 0' }} />

              {/* ── DIMENSIONS ── (hidden for sources where dim filter is not user-facing) */}
              {!['55', '48'].includes(String(sourceId)) && (
                <>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>Dimensions</div>

                  <div className="ctrl-blk" style={{ marginBottom: dimTypeId ? 10 : 0 }}>
                    <div className="ctrl-lbl">Dimension Type</div>
                    {metaLoading ? <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 0' }}><div className="ld-spin ld-spin-sm" /><span style={{ fontSize:11, color:'var(--tx3)' }}>Loading…</span></div> : (
                      <select className="ctrl-sel" value={dimTypeId ?? ''} onChange={e => setDimTypeId(e.target.value || null)}>
                        <option value="">— None —</option>
                        {dimTypes.map(d => {
                          const id = d.dimension_type_id ?? d.id;
                          return <option key={id} value={id}>{d.dimension_type || d.name || String(id)}</option>;
                        })}
                      </select>
                    )}
                  </div>

                  {dimTypeId && (
                    <div className="ctrl-blk">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div className="ctrl-lbl">Values</div>
                        <div style={{ fontSize: 9, fontFamily: 'var(--mo)' }}>
                          {selectedDims.length > 0
                            ? <span style={{ color: 'var(--blue)', fontWeight: 700 }}>{selectedDims.length} selected</span>
                            : <span style={{ color: 'var(--tx3)' }}>{dimensions.length} total</span>
                          }
                        </div>
                      </div>

                      {selectedDims.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                          {selectedDims.map(id => {
                            const d = dimensions.find(d => (d.dimension_id ?? d.id) === id);
                            const name = d ? (d.dimension_value || d.value || d.name || d.dimension_name || String(id)) : String(id);
                            return (
                              <span key={id} className="det-chip-active">
                                {name.length > 16 ? name.slice(0, 16) + '…' : name}
                                <span className="det-chip-x" onClick={() => toggleDim(id)}>✕</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <input
                        className="ctrl-sel"
                        placeholder={`Search ${dimensions.length} values…`}
                        value={dimSearch}
                        onChange={e => setDimSearch(e.target.value)}
                        style={{ marginBottom: 6 }}
                      />
                      {dimsLoading ? (
                        <div style={{ fontSize: 11, color: 'var(--tx3)', padding: '4px 0' }}>Loading…</div>
                      ) : (
                        <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {filteredDims.map(d => {
                            const id = d.dimension_id ?? d.id;
                            const name = d.dimension_value || d.value || d.name || d.dimension_name || String(id);
                            const checked = selectedDims.includes(id);
                            return (
                              <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: checked ? 'var(--tx)' : 'var(--tx2)', cursor: 'pointer', padding: '3px 5px', borderRadius: 5, background: checked ? 'rgba(37,87,167,.09)' : 'transparent', transition: 'background .1s' }}>
                                <input type="checkbox" checked={checked} onChange={() => toggleDim(id)} style={{ cursor: 'pointer', accentColor: 'var(--blue)', width: 12, height: 12, flexShrink: 0 }} />
                                {name}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              <div style={{ height: 1, background: 'var(--bdr)', margin: '14px 0' }} />

              {/* ── CHART TYPE ── */}
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>Chart Type</div>
              <div className="ct-row" style={{ gap: 4 }}>
                {['line', 'area', 'bar'].map(ct => (
                  <div key={ct} className={`ct-b${chartType === ct ? ' on' : ''}`} style={{ flex: 1, justifyContent: 'center', textAlign: 'center' }} onClick={() => setChartType(ct)}>
                    {ct.charAt(0).toUpperCase() + ct.slice(1)}
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: 'var(--bdr)', margin: '14px 0' }} />

              {/* ── DATE RANGE ── */}
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>Date Range</div>
              <div className="ctrl-blk" style={{ marginBottom: 8 }}>
                <div className="ctrl-lbl">From</div>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="ctrl-sel" style={{ fontFamily: 'var(--mo)', fontSize: 11, color: 'var(--tx)', cursor: 'pointer' }} />
              </div>
              <div className="ctrl-blk">
                <div className="ctrl-lbl">To</div>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="ctrl-sel" style={{ fontFamily: 'var(--mo)', fontSize: 11, color: 'var(--tx)', cursor: 'pointer' }} />
              </div>

            </div>

            {/* Drawer footer */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--bdr)', flexShrink: 0 }}>
              <button
                className="btn"
                style={{ width: '100%', justifyContent: 'center', background: 'var(--blue)', color: '#fff', fontWeight: 600, fontSize: 12, padding: '8px 0' }}
                onClick={() => { setHasApplied(true); fetchAnalytics(); }}
              >
                Apply
              </button>
            </div>

          </div>{/* /drawer */}
      </div>
    </div>
  );
}
