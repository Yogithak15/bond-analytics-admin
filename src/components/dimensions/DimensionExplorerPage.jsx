import { useState, useEffect, useCallback, useMemo } from 'react';
import { getDataSources, getDataSourceDimensionTypes, getAllDimensions } from '../../api/bond_api';

function ChevronIcon({ open, size = 13 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform .18s', transform: open ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function DimensionExplorerPage({ isActive }) {
  const [datasets,        setDatasets]        = useState([]);
  const [dimTypesCache,   setDimTypesCache]   = useState({});  // { [sid]:   dimType[]   }
  const [dimValuesCache,  setDimValuesCache]  = useState({});  // { [dtid]:  dimValue[]  }
  const [loadingDimTypes, setLoadingDimTypes] = useState({});  // { [sid]:   boolean     }
  const [loadingDimVals,  setLoadingDimVals]  = useState({});  // { [dtid]:  boolean     }
  const [expandedDatasets,setExpandedDatasets]= useState(new Set());
  const [expandedDimTypes,setExpandedDimTypes]= useState(new Set());
  const [pageLoading,     setPageLoading]     = useState(false);
  const [pageError,       setPageError]       = useState(null);
  const [hasLoaded,       setHasLoaded]       = useState(false);
  const [search,          setSearch]          = useState('');
  const [dimSearch,       setDimSearch]       = useState(''); // per-expanded dim type value search

  // ── Load all datasets ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || hasLoaded) return;
    setHasLoaded(true);

    if (window.DATASETS?.length) { setDatasets(window.DATASETS); return; }

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

  useEffect(() => {
    if (isActive && !datasets.length && window.DATASETS?.length) setDatasets(window.DATASETS);
  }, [isActive, datasets.length]);

  // ── Load dimension types for a dataset ────────────────────────────────────
  const loadDimTypes = useCallback(async (sid) => {
    if (dimTypesCache[sid]) return;
    setLoadingDimTypes(p => ({ ...p, [sid]: true }));
    try {
      const res = await getDataSourceDimensionTypes(sid);
      const rows = Array.isArray(res) ? res : (res?.items || res?.data || []);
      setDimTypesCache(p => ({ ...p, [sid]: rows }));
    } catch { setDimTypesCache(p => ({ ...p, [sid]: [] })); }
    setLoadingDimTypes(p => ({ ...p, [sid]: false }));
  }, [dimTypesCache]);

  // ── Load dimension values for a dim type ──────────────────────────────────
  const loadDimValues = useCallback(async (dtid) => {
    if (dimValuesCache[dtid]) return;
    setLoadingDimVals(p => ({ ...p, [dtid]: true }));
    try {
      const rows = await getAllDimensions(dtid);
      setDimValuesCache(p => ({ ...p, [dtid]: Array.isArray(rows) ? rows : [] }));
    } catch { setDimValuesCache(p => ({ ...p, [dtid]: [] })); }
    setLoadingDimVals(p => ({ ...p, [dtid]: false }));
  }, [dimValuesCache]);

  // ── Toggle dataset expand ─────────────────────────────────────────────────
  const toggleDataset = useCallback((sid) => {
    setExpandedDatasets(prev => {
      const next = new Set(prev);
      if (next.has(sid)) { next.delete(sid); }
      else               { next.add(sid); loadDimTypes(sid); }
      return next;
    });
  }, [loadDimTypes]);

  // ── Toggle dim type expand ────────────────────────────────────────────────
  const toggleDimType = useCallback((dtid) => {
    setExpandedDimTypes(prev => {
      const next = new Set(prev);
      if (next.has(dtid)) { next.delete(dtid); }
      else                { next.add(dtid); loadDimValues(dtid); }
      return next;
    });
  }, [loadDimValues]);

  const expandAll = useCallback(() => {
    const sids = datasets.map(d => String(d.sourceId ?? d.source_id ?? d.id));
    setExpandedDatasets(new Set(sids));
    sids.forEach(sid => loadDimTypes(sid));
  }, [datasets, loadDimTypes]);

  const collapseAll = useCallback(() => {
    setExpandedDatasets(new Set());
    setExpandedDimTypes(new Set());
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalDimTypes  = useMemo(() => Object.values(dimTypesCache).reduce((s, a) => s + a.length, 0), [dimTypesCache]);
  const totalDimValues = useMemo(() => Object.values(dimValuesCache).reduce((s, a) => s + a.length, 0), [dimValuesCache]);

  // ── Filtered datasets ─────────────────────────────────────────────────────
  const filteredDatasets = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return datasets;
    return datasets.filter(d => {
      const sid = String(d.sourceId ?? d.source_id ?? d.id);
      const title = (d.title || d.name || '').toLowerCase();
      const src   = (d.src   || d.source || '').toLowerCase();
      if (title.includes(q) || src.includes(q)) return true;
      const dtypes = dimTypesCache[sid] || [];
      return dtypes.some(dt => (dt.dimension_type || dt.name || '').toLowerCase().includes(q));
    });
  }, [datasets, search, dimTypesCache]);

  if (!isActive) return null;

  return (
    <div className="page on" id="page-dimensions" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', letterSpacing: '-.3px' }}>Dimension Explorer</div>
            <div style={{ fontSize: 11.5, color: 'var(--tx3)', marginTop: 2 }}>
              {pageLoading
                ? 'Loading datasets…'
                : [
                    `${datasets.length} datasets`,
                    totalDimTypes  ? `${totalDimTypes} dim types`   : null,
                    totalDimValues ? `${totalDimValues} values indexed` : null,
                  ].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={expandAll}   style={btnStyle}>Expand All</button>
            <button onClick={collapseAll} style={btnStyle}>Collapse All</button>
          </div>
        </div>

        {/* ── Filter row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 480 }}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search datasets or dimension types…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 30, paddingRight: 10, height: 34, borderRadius: 8, border: '1px solid var(--bdr)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 12, fontFamily: 'var(--fn)', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          {search && (
            <button onClick={() => setSearch('')} style={{ height: 34, padding: '0 12px', borderRadius: 8, border: '1px solid var(--red)', background: 'var(--red)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--fn)' }}>
              Reset
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--tx3)', whiteSpace: 'nowrap' }}>
            {filteredDatasets.length !== datasets.length
              ? `${filteredDatasets.length} of ${datasets.length}`
              : `${datasets.length}`} datasets
          </span>
        </div>
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 32px' }}>

        {pageLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(7)].map((_, i) => (
              <div key={i} style={{ height: 50, borderRadius: 10, background: 'var(--sf)', border: '1px solid var(--bdr)',
                backgroundImage: 'linear-gradient(90deg,var(--sf2) 25%,var(--sf3) 50%,var(--sf2) 75%)',
                backgroundSize: '200% 100%', animation: `skel-shimmer 1.4s ${i * 0.09}s ease-in-out infinite` }} />
            ))}
          </div>
        )}

        {pageError && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--red)', fontSize: 13 }}>
            Failed to load: {pageError}
          </div>
        )}

        {!pageLoading && !pageError && filteredDatasets.length === 0 && (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--tx3)', fontSize: 13 }}>
            No datasets match your search.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredDatasets.map((d, idx) => {
            const sid        = String(d.sourceId ?? d.source_id ?? d.id);
            const title      = d.title || d.name || `Dataset ${sid}`;
            const src        = d.src || d.source || '';
            const dsOpen     = expandedDatasets.has(sid);
            const dsLoading  = loadingDimTypes[sid];
            const dimTypes   = dimTypesCache[sid];

            return (
              <div key={sid} className="card" style={{ borderRadius: 10, overflow: 'hidden', padding: 0 }}>

                {/* ── Dataset row ── */}
                <div
                  role="button"
                  onClick={() => toggleDataset(sid)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', cursor: 'pointer', userSelect: 'none', transition: 'background .1s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--sf2)'}
                  onMouseOut={e => e.currentTarget.style.background = ''}
                >
                  <ChevronIcon open={dsOpen} />

                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--tx3)', fontFamily: 'var(--mo)', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                    {src && <div style={{ fontSize: 10.5, color: 'var(--tx3)', marginTop: 1 }}>{src}</div>}
                  </div>

                  {/* Dim type count chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {dimTypes ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(109,63,192,.12)', color: '#6d3fc0' }}>
                        {dimTypes.length} dim type{dimTypes.length !== 1 ? 's' : ''}
                      </span>
                    ) : dsLoading ? (
                      <span style={{ fontSize: 10, color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div className="ld-spin ld-spin-sm" /> Loading…
                      </span>
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--tx3)', fontStyle: 'italic' }}>click to load</span>
                    )}
                  </div>

                  {/* Analyze button */}
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

                {/* ── Dimension types ── */}
                {dsOpen && (
                  <div style={{ borderTop: '1px solid var(--bdr)' }}>
                    {dsLoading && (
                      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tx3)', fontSize: 12 }}>
                        <div className="ld-spin ld-spin-sm" /> Loading dimension types…
                      </div>
                    )}

                    {!dsLoading && dimTypes && dimTypes.length === 0 && (
                      <div style={{ padding: '12px 24px', fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>
                        No dimension types configured for this dataset.
                      </div>
                    )}

                    {!dsLoading && dimTypes && dimTypes.map((dt, dti) => {
                      const dtid    = String(dt.dimension_type_id ?? dt.id);
                      const dtName  = dt.dimension_type || dt.name || `Dim Type ${dtid}`;
                      const dtOpen  = expandedDimTypes.has(dtid);
                      const dtLoading = loadingDimVals[dtid];
                      const dimVals   = dimValuesCache[dtid];

                      // Filter dim values by search query
                      const q = search.toLowerCase().trim();
                      const visibleVals = dimVals
                        ? (q
                            ? dimVals.filter(v => (v.dimension_value || v.value || v.name || v.dimension_name || '').toLowerCase().includes(q))
                            : dimVals)
                        : [];

                      return (
                        <div key={dtid} style={{ borderBottom: dti < dimTypes.length - 1 ? '1px solid var(--bdr)' : 'none' }}>

                          {/* Dim type row */}
                          <div
                            role="button"
                            onClick={() => toggleDimType(dtid)}
                            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 16px 9px 36px', cursor: 'pointer', background: 'var(--sf)', transition: 'background .1s' }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--sf2)'}
                            onMouseOut={e => e.currentTarget.style.background = 'var(--sf)'}
                          >
                            <ChevronIcon open={dtOpen} size={12} />

                            {/* Type icon */}
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#6d3fc0" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
                              <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
                            </svg>

                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)', flex: 1 }}>{dtName}</span>

                            <span style={{ fontSize: 9.5, color: 'var(--tx3)', fontFamily: 'var(--mo)', marginRight: 8 }}>
                              ID: {dtid}
                            </span>

                            {/* Value count chip */}
                            {dimVals ? (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(37,87,167,.1)', color: 'var(--blue)' }}>
                                {dimVals.length} value{dimVals.length !== 1 ? 's' : ''}
                              </span>
                            ) : dtLoading ? (
                              <span style={{ fontSize: 10, color: 'var(--tx3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div className="ld-spin ld-spin-sm" /> Loading…
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, color: 'var(--tx3)', fontStyle: 'italic' }}>click to load values</span>
                            )}
                          </div>

                          {/* ── Dimension values ── */}
                          {dtOpen && (
                            <div style={{ borderTop: '1px solid var(--bdr)', background: 'var(--bg)', padding: '10px 16px 12px 52px' }}>
                              {dtLoading && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tx3)', fontSize: 12, padding: '4px 0' }}>
                                  <div className="ld-spin ld-spin-sm" /> Loading values…
                                </div>
                              )}

                              {!dtLoading && dimVals && dimVals.length === 0 && (
                                <div style={{ fontSize: 12, color: 'var(--tx3)', fontStyle: 'italic' }}>No values found.</div>
                              )}

                              {!dtLoading && dimVals && dimVals.length > 0 && (
                                <>
                                  {/* Inline search for values */}
                                  <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ position: 'relative', maxWidth: 320 }}>
                                      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                                        style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }}>
                                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                      </svg>
                                      <input
                                        type="text"
                                        placeholder={`Filter ${dimVals.length} values…`}
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ paddingLeft: 26, paddingRight: 8, height: 28, borderRadius: 6, border: '1px solid var(--bdr)', background: 'var(--sf)', color: 'var(--tx)', fontSize: 11, fontFamily: 'var(--fn)', boxSizing: 'border-box', outline: 'none', width: '100%' }}
                                      />
                                    </div>
                                    <span style={{ fontSize: 10.5, color: 'var(--tx3)' }}>
                                      {visibleVals.length !== dimVals.length
                                        ? `${visibleVals.length} of ${dimVals.length}`
                                        : `${dimVals.length}`} values
                                    </span>
                                  </div>

                                  {/* Values grid */}
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 260, overflowY: 'auto' }}>
                                    {(visibleVals.length ? visibleVals : dimVals).map((v, vi) => {
                                      const vid  = v.dimension_id ?? v.id;
                                      const vname = v.dimension_value || v.value || v.name || v.dimension_name || String(vid);
                                      const hl = search && vname.toLowerCase().includes(search.toLowerCase());
                                      return (
                                        <span
                                          key={vid ?? vi}
                                          title={`ID: ${vid}`}
                                          style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '3px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: hl ? 700 : 400,
                                            border: `1px solid ${hl ? 'rgba(37,87,167,.4)' : 'var(--bdr)'}`,
                                            background: hl ? 'rgba(37,87,167,.12)' : 'var(--sf)',
                                            color: hl ? 'var(--blue)' : 'var(--tx2)',
                                            cursor: 'default',
                                          }}
                                        >
                                          {vname}
                                          <span style={{ fontSize: 9.5, color: 'var(--tx4)', fontFamily: 'var(--mo)' }}>{vid}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

const btnStyle = {
  fontSize: 11, padding: '5px 12px', borderRadius: 7,
  border: '1px solid var(--bdr)', background: 'var(--sf2)',
  color: 'var(--tx2)', cursor: 'pointer', fontFamily: 'var(--fn)', fontWeight: 600,
};
