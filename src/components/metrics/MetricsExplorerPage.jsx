import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getDataSources, getDataSourceMetrics, getDataSourceDates } from '../../api/bond_api';

const UNIT_LABELS = { amount: 'Amount', '%': 'Percentage', number: 'Count', rate: 'Rate' };

function ChevronIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform .18s', transform: open ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function UnitBadge({ unit, currency }) {
  const colors = {
    amount:  { bg: 'rgba(37,87,167,.12)',  color: 'var(--blue)'   },
    '%':     { bg: 'rgba(45,138,78,.12)',   color: '#2d8a4e'       },
    number:  { bg: 'rgba(109,63,192,.12)', color: '#6d3fc0'       },
    rate:    { bg: 'rgba(196,122,30,.12)', color: '#c47a1e'       },
  };
  const c = colors[unit] || { bg: 'rgba(100,100,100,.1)', color: 'var(--tx3)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: c.bg, color: c.color, letterSpacing: '.03em' }}>
        {UNIT_LABELS[unit] || unit || 'Raw'}
      </span>
      {currency && (
        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, background: 'rgba(37,87,167,.07)', color: 'var(--tx3)', fontFamily: 'var(--mo)' }}>
          {currency}
        </span>
      )}
    </span>
  );
}

export default function MetricsExplorerPage({ isActive }) {
  const [datasets,       setDatasets]       = useState([]);
  const [metricsCache,   setMetricsCache]   = useState({});   // { [sid]: { metrics, dates } }
  const [loadingStates,  setLoadingStates]  = useState({});   // { [sid]: true/false }
  const [pageLoading,    setPageLoading]    = useState(false);
  const [pageError,      setPageError]      = useState(null);
  const [expandedIds,    setExpandedIds]    = useState(new Set());
  const [search,         setSearch]         = useState('');
  const [unitFilter,     setUnitFilter]     = useState('');
  const [currFilter,     setCurrFilter]     = useState('');
  const [hasLoaded,      setHasLoaded]      = useState(false);
  const fetchedRef = useRef(new Set()); // tracks sids already fetched — avoids re-running on cache updates

  // ── Load all datasets ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || hasLoaded) return;
    setHasLoaded(true);

    // Try window.DATASETS first (populated by CatalogPage)
    if (window.DATASETS?.length) {
      setDatasets(window.DATASETS);
      return;
    }

    setPageLoading(true);
    const fetchAll = async () => {
      let skip = 0; const limit = 100; const all = [];
      while (true) {
        const res = await getDataSources(skip, limit);
        const rows = Array.isArray(res) ? res : (res?.items || res?.data || []);
        all.push(...rows);
        if (rows.length < limit) break;
        skip += limit;
      }
      return all;
    };
    fetchAll()
      .then(rows => setDatasets(rows))
      .catch(err  => setPageError(err.message))
      .finally(()  => setPageLoading(false));
  }, [isActive, hasLoaded]);

  // Re-check window.DATASETS when page becomes active (catalog may have loaded it)
  useEffect(() => {
    if (isActive && !datasets.length && window.DATASETS?.length) {
      setDatasets(window.DATASETS);
    }
  }, [isActive, datasets.length]);

  // ── Load metrics for a dataset (safe to call multiple times) ──────────────
  const loadMetrics = useCallback(async (sid) => {
    if (fetchedRef.current.has(sid)) return;
    fetchedRef.current.add(sid);
    setLoadingStates(p => ({ ...p, [sid]: true }));
    try {
      const [mRes, dRes] = await Promise.all([
        getDataSourceMetrics(sid),
        getDataSourceDates(sid),
      ]);
      const metrics = Array.isArray(mRes) ? mRes : (mRes?.items || mRes?.data || []);
      const dates   = Array.isArray(dRes) ? dRes : (dRes?.items || dRes?.data || []);
      setMetricsCache(p => ({ ...p, [sid]: { metrics, dates } }));
    } catch { fetchedRef.current.delete(sid); }
    setLoadingStates(p => ({ ...p, [sid]: false }));
  }, []); // no metricsCache dep — fetchedRef guards against double-fetch

  // ── Eagerly load all metrics in background so filters are populated ────────
  useEffect(() => {
    if (!datasets.length) return;
    datasets.forEach(d => loadMetrics(String(d.sourceId ?? d.source_id ?? d.id)));
  }, [datasets, loadMetrics]);

  const toggleExpand = useCallback((sid) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(sid)) { next.delete(sid); }
      else               { next.add(sid); loadMetrics(sid); }
      return next;
    });
  }, [loadMetrics]);

  const expandAll = useCallback(() => {
    const sids = datasets.map(d => String(d.sourceId ?? d.source_id ?? d.id));
    setExpandedIds(new Set(sids));
    sids.forEach(sid => loadMetrics(sid));
  }, [datasets, loadMetrics]);

  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  // ── Derived filter options ─────────────────────────────────────────────────
  const allUnits = useMemo(() => {
    const s = new Set();
    Object.values(metricsCache).forEach(({ metrics }) =>
      metrics.forEach(m => { if (m.unit) s.add(m.unit); })
    );
    return [...s].sort();
  }, [metricsCache]);

  const allCurrencies = useMemo(() => {
    const s = new Set();
    Object.values(metricsCache).forEach(({ metrics }) =>
      metrics.forEach(m => { if (m.currency) s.add(m.currency); })
    );
    return [...s].sort();
  }, [metricsCache]);

  // ── Filtered datasets ──────────────────────────────────────────────────────
  const filteredDatasets = useMemo(() => {
    const q = search.toLowerCase().trim();
    return datasets.filter(d => {
      const sid = String(d.sourceId ?? d.source_id ?? d.id);
      const title = (d.title || d.name || '').toLowerCase();
      const src   = (d.src   || d.source || '').toLowerCase();
      const cache = metricsCache[sid];

      // Name match
      if (q) {
        const nameMatch = title.includes(q) || src.includes(q);
        const metricMatch = cache?.metrics.some(m =>
          (m.metric_name || m.name || '').toLowerCase().includes(q)
        );
        if (!nameMatch && !metricMatch) return false;
      }

      // Unit filter — only apply if metrics loaded
      if (unitFilter && cache) {
        if (!cache.metrics.some(m => m.unit === unitFilter)) return false;
      }

      // Currency filter — only apply if metrics loaded
      if (currFilter && cache) {
        if (!cache.metrics.some(m => m.currency === currFilter)) return false;
      }

      return true;
    });
  }, [datasets, search, unitFilter, currFilter, metricsCache]);

  // Total counts
  const totalMetrics = useMemo(() =>
    Object.values(metricsCache).reduce((s, c) => s + c.metrics.length, 0),
  [metricsCache]);

  const sel = sel => document.querySelector(sel);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!isActive) return null;

  return (
    <div className="page on" id="page-metrics" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* ── Header ── */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.3px' }}>Metrics Explorer</div>
            <div style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 2 }}>
              {pageLoading
                ? 'Loading datasets…'
                : `${datasets.length} datasets${totalMetrics ? ` · ${totalMetrics} metrics indexed` : ''}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={expandAll}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--bdr)', background: 'var(--sf2)', color: 'var(--tx2)', cursor: 'pointer', fontFamily: 'var(--fn)', fontWeight: 600 }}
            >Expand All</button>
            <button
              onClick={collapseAll}
              style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: '1px solid var(--bdr)', background: 'var(--sf2)', color: 'var(--tx2)', cursor: 'pointer', fontFamily: 'var(--fn)', fontWeight: 600 }}
            >Collapse All</button>
          </div>
        </div>

        {/* ── Filter row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 460 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search datasets or metrics…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 34, borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 12, fontFamily: 'var(--fn)', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>

          {/* Unit filter */}
          <select
            value={unitFilter}
            onChange={e => setUnitFilter(e.target.value)}
            style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 12, fontFamily: 'var(--fn)', cursor: 'pointer' }}
          >
            <option value="">All Units</option>
            {allUnits.map(u => <option key={u} value={u}>{UNIT_LABELS[u] || u}</option>)}
          </select>

          {/* Currency filter */}
          <select
            value={currFilter}
            onChange={e => setCurrFilter(e.target.value)}
            style={{ height: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 12, fontFamily: 'var(--fn)', cursor: 'pointer' }}
          >
            <option value="">All Currencies</option>
            {allCurrencies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {(search || unitFilter || currFilter) && (
            <button
              onClick={() => { setSearch(''); setUnitFilter(''); setCurrFilter(''); }}
              style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--red)', background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fn)', flexShrink: 0 }}
            >Reset</button>
          )}

          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap' }}>
            {filteredDatasets.length !== datasets.length ? `${filteredDatasets.length} of ${datasets.length}` : `${datasets.length}`} datasets
          </span>
        </div>
      </div>

      {/* ── Dataset list ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 32px' }}>
        {pageLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: 52, borderRadius: 10, background: 'var(--sf)', border: '1px solid var(--bdr)',
                backgroundImage: 'linear-gradient(90deg,var(--sf2) 25%,var(--sf3) 50%,var(--sf2) 75%)',
                backgroundSize: '200% 100%', animation: `skel-shimmer 1.4s ${i * 0.1}s ease-in-out infinite` }} />
            ))}
          </div>
        )}

        {pageError && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>
            Failed to load datasets: {pageError}
          </div>
        )}

        {!pageLoading && !pageError && filteredDatasets.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
            No datasets match your search.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredDatasets.map((d, idx) => {
            const sid = String(d.sourceId ?? d.source_id ?? d.id);
            const title = d.title || d.name || `Dataset ${sid}`;
            const src   = d.src || d.source || '';
            const isOpen = expandedIds.has(sid);
            const isLoading = loadingStates[sid];
            const cache = metricsCache[sid];
            const metrics = cache?.metrics || [];
            const dates   = cache?.dates   || [];

            // Apply metric-level search filter
            const visibleMetrics = search
              ? metrics.filter(m =>
                  (m.metric_name || m.name || '').toLowerCase().includes(search.toLowerCase()) ||
                  (d.title || '').toLowerCase().includes(search.toLowerCase())
                )
              : metrics;

            const filteredMetrics = visibleMetrics.filter(m => {
              if (unitFilter && m.unit !== unitFilter) return false;
              if (currFilter && m.currency !== currFilter) return false;
              return true;
            });

            return (
              <div key={sid} className="card" style={{ borderRadius: 10, overflow: 'hidden', padding: 0 }}>
                {/* ── Row header ── */}
                <div
                  role="button"
                  onClick={() => toggleExpand(sid)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', cursor: 'pointer', userSelect: 'none', transition: 'background .1s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--sf2)'}
                  onMouseOut={e => e.currentTarget.style.background = ''}
                >
                  <ChevronIcon open={isOpen} />

                  {/* Dataset index */}
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx3)', fontFamily: 'var(--mo)', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  {/* Title */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                    {src && <div style={{ fontSize: 10.5, color: 'var(--tx3)', marginTop: 1 }}>{src}</div>}
                  </div>

                  {/* Stats chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {cache ? (
                      <>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(37,87,167,.1)', color: 'var(--blue)' }}>
                          {metrics.length} metric{metrics.length !== 1 ? 's' : ''}
                        </span>
                        {dates.length > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 5, background: 'rgba(45,138,78,.1)', color: '#2d8a4e' }}>
                            {dates.length} date attr{dates.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </>
                    ) : isLoading ? (
                      <span style={{ fontSize: 10, color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div className="ld-spin ld-spin-sm" /> Loading…
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--tx3)', fontStyle: 'italic' }}>click to load</span>
                    )}
                  </div>

                  {/* Open in Analytics button */}
                  <button
                    onClick={e => { e.stopPropagation(); window.openDetail?.(sid); }}
                    title="Open in Analytics"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(37,87,167,.25)', background: 'rgba(37,87,167,.07)', color: 'var(--blue)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--fn)', transition: 'all .1s' }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(37,87,167,.18)'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(37,87,167,.07)'; }}
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                      <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                      <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                    </svg>
                    Analyze
                  </button>
                </div>

                {/* ── Expanded metrics table ── */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--bdr)', background: 'var(--sf)' }}>
                    {isLoading && (
                      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tx3)', fontSize: 12 }}>
                        <div className="ld-spin ld-spin-sm" /> Loading metrics…
                      </div>
                    )}

                    {!isLoading && cache && metrics.length === 0 && (
                      <div style={{ padding: '14px 20px', fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
                        No metrics configured for this dataset.
                      </div>
                    )}

                    {!isLoading && cache && metrics.length > 0 && (
                      <>
                        {/* Metrics table */}
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '44px' }} />
                              <col />
                              <col style={{ width: '160px' }} />
                              <col style={{ width: '100px' }} />
                            </colgroup>
                            <thead>
                              <tr style={{ background: 'var(--sf2)' }}>
                                <th style={{ padding: '6px 8px 6px 20px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx3)', borderBottom: '1px solid var(--bdr)' }}>#</th>
                                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx3)', borderBottom: '1px solid var(--bdr)' }}>Metric Name</th>
                                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx3)', borderBottom: '1px solid var(--bdr)' }}>Currency</th>
                                <th style={{ padding: '6px 20px 6px 8px', textAlign: 'right', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--tx3)', borderBottom: '1px solid var(--bdr)' }}>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(filteredMetrics.length ? filteredMetrics : metrics).map((m, mi) => {
                                const mid = m.metric_id ?? m.id;
                                const name = m.metric_name || m.name || `Metric ${mid}`;
                                const isHighlighted = search && name.toLowerCase().includes(search.toLowerCase());
                                return (
                                  <tr key={mid ?? mi} style={{ borderBottom: '1px solid var(--bdr)', transition: 'background .1s' }}
                                    onMouseOver={e => e.currentTarget.style.background = 'var(--sf2)'}
                                    onMouseOut={e => e.currentTarget.style.background = ''}>
                                    <td style={{ padding: '8px 8px 8px 20px', fontSize: 11, color: 'var(--tx3)', fontFamily: 'var(--mo)' }}>{mi + 1}</td>
                                    <td style={{ padding: '8px', fontSize: 12, fontWeight: isHighlighted ? 700 : 500, color: isHighlighted ? 'var(--blue)' : 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {name}
                                    </td>
                                    <td style={{ padding: '8px', fontSize: 11.5, fontWeight: 600, color: m.currency ? 'var(--tx2)' : 'var(--tx4)', fontFamily: 'var(--mo)' }}>
                                      {m.currency || '—'}
                                    </td>
                                    <td style={{ padding: '8px 20px 8px 8px', textAlign: 'right' }}>
                                      <button
                                        onClick={() => window.openDetail?.(sid)}
                                        style={{ fontSize: 10.5, padding: '3px 9px', borderRadius: 5, border: '1px solid var(--bdr)', background: 'var(--sf2)', color: 'var(--tx2)', cursor: 'pointer', fontFamily: 'var(--fn)', fontWeight: 500, transition: 'all .1s' }}
                                        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)'; }}
                                        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--bdr)'; e.currentTarget.style.color = 'var(--tx2)'; }}
                                      >
                                        Open →
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {filteredMetrics.length > 0 && filteredMetrics.length < metrics.length && (
                            <div style={{ padding: '6px 20px', fontSize: 10.5, color: 'var(--tx3)', fontStyle: 'italic' }}>
                              Showing {filteredMetrics.length} of {metrics.length} metrics matching filter
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
